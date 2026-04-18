const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

describe("PlatformHub", function () {
  async function deployFixture() {
    const [owner, creator, collaborator, buyer] = await ethers.getSigners();

    const MusicAccess1155 = await ethers.getContractFactory("MusicAccess1155");
    const musicAccess = await MusicAccess1155.deploy(owner.address);
    await musicAccess.waitForDeployment();

    const RoyaltySplitterFactory = await ethers.getContractFactory("RoyaltySplitterFactory");
    const royaltySplitterFactory = await RoyaltySplitterFactory.deploy();
    await royaltySplitterFactory.waitForDeployment();

    const PlatformHub = await ethers.getContractFactory("PlatformHub");
    const platformHub = await PlatformHub.deploy(
      await musicAccess.getAddress(),
      await royaltySplitterFactory.getAddress(),
      owner.address,
      500
    );
    await platformHub.waitForDeployment();

    const minterRole = await musicAccess.MINTER_ROLE();
    await (await musicAccess.grantRole(minterRole, await platformHub.getAddress())).wait();

    return { owner, creator, collaborator, buyer, musicAccess, platformHub };
  }

  it("publishes a paid track and mints buyer access after payment", async function () {
    const { creator, collaborator, buyer, musicAccess, platformHub } = await deployFixture();
    const price = ethers.parseEther("0.1");
    const publishArgs = [
      "ipfs://track-1",
      true,
      price,
      true,
      [creator.address, collaborator.address],
      [80, 20],
    ];

    const [tokenId, splitterAddress] = await platformHub.connect(creator).publishTrack.staticCall(...publishArgs);
    await (await platformHub.connect(creator).publishTrack(...publishArgs)).wait();

    assert.equal(await musicAccess.creatorOf(tokenId), creator.address);
    assert.equal(await musicAccess.uri(tokenId), "ipfs://track-1");
    assert.equal(await musicAccess.balanceOf(buyer.address, tokenId), 0n);
    assert.equal(await platformHub.hasAccess(buyer.address, tokenId), false);

    await (await platformHub.connect(buyer).buyAccess(tokenId, { value: price })).wait();
    assert.equal(await musicAccess.balanceOf(buyer.address, tokenId), 1n);
    assert.equal(await platformHub.hasAccess(buyer.address, tokenId), true);

    const preview = await platformHub.paymentPreview(tokenId);
    const RoyaltySplitter = await ethers.getContractFactory("RoyaltySplitter");
    const splitter = RoyaltySplitter.attach(splitterAddress);

    assert.equal(await splitter.releasable(creator.address), (preview[2] * 80n) / 100n);
    assert.equal(await splitter.releasable(collaborator.address), (preview[2] * 20n) / 100n);
  });

  it("treats open releases as directly accessible", async function () {
    const { creator, buyer, platformHub } = await deployFixture();
    const publishArgs = [
      "ipfs://track-open",
      false,
      0,
      true,
      [creator.address],
      [100],
    ];

    const [tokenId] = await platformHub.connect(creator).publishTrack.staticCall(...publishArgs);
    await (await platformHub.connect(creator).publishTrack(...publishArgs)).wait();

    assert.equal(await platformHub.hasAccess(buyer.address, tokenId), true);
  });

  it("blocks normal ERC-1155 transfers between users", async function () {
    const { creator, buyer, collaborator, musicAccess, platformHub } = await deployFixture();
    const price = ethers.parseEther("0.03");
    const publishArgs = [
      "ipfs://track-non-transferable",
      true,
      price,
      true,
      [creator.address],
      [100],
    ];

    const [tokenId] = await platformHub.connect(creator).publishTrack.staticCall(...publishArgs);
    await (await platformHub.connect(creator).publishTrack(...publishArgs)).wait();
    await (await platformHub.connect(buyer).buyAccess(tokenId, { value: price })).wait();

    await assert.rejects(
      musicAccess.connect(buyer).safeTransferFrom(buyer.address, collaborator.address, tokenId, 1, "0x"),
      /NonTransferableAccessToken/
    );
  });

  it("allows only the creator to update sale configuration", async function () {
    const { creator, buyer, platformHub } = await deployFixture();
    const price = ethers.parseEther("0.02");
    const publishArgs = [
      "ipfs://track-editable",
      true,
      price,
      true,
      [creator.address],
      [100],
    ];

    const [tokenId] = await platformHub.connect(creator).publishTrack.staticCall(...publishArgs);
    await (await platformHub.connect(creator).publishTrack(...publishArgs)).wait();

    await assert.rejects(
      platformHub.connect(buyer).updateTrackSale(tokenId, true, true, price),
      /Unauthorized/
    );

    await (await platformHub.connect(creator).updateTrackSale(tokenId, true, false, price)).wait();
    const sale = await platformHub.getTrackSaleConfig(tokenId);
    assert.equal(sale[4], false);
  });
});
