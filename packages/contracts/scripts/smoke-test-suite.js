const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// 按当前网络加载整套合约的部署记录。
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
  // 为烟雾测试创建一个临时买家钱包，并连接到当前网络提供者。
  const buyer = hre.ethers.Wallet.createRandom().connect(provider);
  const publishPrice = hre.ethers.parseEther("0.001");
  const fundingAmount = hre.ethers.parseEther("0.003");

  console.log(`Running smoke test on ${hre.network.name}`);
  console.log(`Creator: ${creatorAddress}`);
  console.log(`Buyer:   ${buyer.address}`);

  const PlatformHub = await hre.ethers.getContractFactory("PlatformHub");
  const platformHub = PlatformHub.attach(deployment.contracts.platformHub).connect(creator);

  const RoyaltySplitter = await hre.ethers.getContractFactory("RoyaltySplitter");

  // 先给测试买家转入足够的原生代币，用于后续购买访问权限。
  const fundBuyerTx = await creator.sendTransaction({
    to: buyer.address,
    value: fundingAmount,
  });
  await fundBuyerTx.wait();

  const tokenUri = `ipfs://freeflow-smoke-${Date.now()}`;
  // 用 staticCall 预演发布结果，提前拿到 tokenId 和 splitter 地址，便于后续断言。
  const [predictedTokenId, predictedSplitter] = await platformHub.publishTrack.staticCall(
    tokenUri,
    1000,
    true,
    publishPrice,
    true,
    [creatorAddress],
    [100]
  );

  // 实际发布作品，创建 NFT 和收益分账配置。
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

  // 购买前先检查买家尚未拥有访问权限。
  const hasAccessBefore = await platformHub.hasAccess(buyer.address, predictedTokenId);
  const buyerHub = platformHub.connect(buyer);
  const buyTx = await buyerHub.buyAccess(predictedTokenId, {
    value: publishPrice,
  });
  await buyTx.wait();

  // 购买后应获得访问权限，同时创作者收益进入对应的分账合约。
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

// 统一捕获异常，便于命令行或 CI 识别失败。
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
