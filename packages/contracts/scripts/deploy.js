const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // 1. Deploy MusicAsset
  const MusicAsset = await hre.ethers.getContractFactory("MusicAsset");
  const musicAsset = await MusicAsset.deploy();
  await musicAsset.waitForDeployment();
  const musicAssetAddress = await musicAsset.getAddress();
  console.log(`MusicAsset deployed to: ${musicAssetAddress}`);

  // 2. Deploy RoyaltySplitterFactory
  const RoyaltySplitterFactory = await hre.ethers.getContractFactory("RoyaltySplitterFactory");
  const factory = await RoyaltySplitterFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`RoyaltySplitterFactory deployed to: ${factoryAddress}`);

  // 3. Deploy PlatformHub
  const PlatformHub = await hre.ethers.getContractFactory("PlatformHub");
  const platformHub = await PlatformHub.deploy(musicAssetAddress);
  await platformHub.waitForDeployment();
  const hubAddress = await platformHub.getAddress();
  console.log(`PlatformHub deployed to: ${hubAddress}`);

  console.log("Deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
