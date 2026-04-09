const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadDeployment(networkName) {
  const filePath = path.resolve(__dirname, `../deployments/${networkName}-suite.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment file not found: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function main() {
  const deployment = loadDeployment(hre.network.name);
  const [creator] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;
  const creatorAddress = await creator.getAddress();
  const buyer = hre.ethers.Wallet.createRandom().connect(provider);
  const publishPrice = hre.ethers.parseEther("0.001");
  const fundingAmount = hre.ethers.parseEther("0.003");

  console.log(`Running smoke test on ${hre.network.name}`);
  console.log(`Creator: ${creatorAddress}`);
  console.log(`Buyer:   ${buyer.address}`);

  const PlatformHub = await hre.ethers.getContractFactory("PlatformHub");
  const platformHub = PlatformHub.attach(deployment.contracts.platformHub).connect(creator);

  const RoyaltySplitter = await hre.ethers.getContractFactory("RoyaltySplitter");

  const fundBuyerTx = await creator.sendTransaction({
    to: buyer.address,
    value: fundingAmount,
  });
  await fundBuyerTx.wait();

  const tokenUri = `ipfs://freeflow-smoke-${Date.now()}`;
  const [predictedTokenId, predictedSplitter] = await platformHub.publishTrack.staticCall(
    tokenUri,
    1000,
    true,
    publishPrice,
    true,
    [creatorAddress],
    [100]
  );

  const publishTx = await platformHub.publishTrack(
    tokenUri,
    1000,
    true,
    publishPrice,
    true,
    [creatorAddress],
    [100]
  );
  await publishTx.wait();

  const hasAccessBefore = await platformHub.hasAccess(buyer.address, predictedTokenId);
  const buyerHub = platformHub.connect(buyer);
  const buyTx = await buyerHub.buyAccess(predictedTokenId, {
    value: publishPrice,
  });
  await buyTx.wait();

  const hasAccessAfter = await platformHub.hasAccess(buyer.address, predictedTokenId);
  const splitter = RoyaltySplitter.attach(predictedSplitter).connect(creator);
  const releasable = await splitter.releasable(creatorAddress);
  const releaseTx = await splitter.release(creatorAddress);
  await releaseTx.wait();

  console.log("\nSmoke test summary:");
  console.log(JSON.stringify({
    fundBuyerTx: fundBuyerTx.hash,
    publishTx: publishTx.hash,
    buyTx: buyTx.hash,
    releaseTx: releaseTx.hash,
    tokenId: predictedTokenId.toString(),
    splitter: predictedSplitter,
    hasAccessBefore,
    hasAccessAfter,
    releasable: releasable.toString(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
