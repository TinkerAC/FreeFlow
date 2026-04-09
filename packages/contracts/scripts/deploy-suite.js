const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function writeDeployment(networkName, payload) {
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const filePath = path.join(deploymentsDir, `${networkName}-suite.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));

  return filePath;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const deployerAddress = await deployer.getAddress();

  console.log(`Deploying FreeFlow suite to ${hre.network.name} (chainId=${network.chainId})`);
  console.log(`Deployer: ${deployerAddress}`);

  const MusicAsset = await hre.ethers.getContractFactory("MusicAsset");
  const musicAsset = await MusicAsset.deploy("FreeFlow Music Release", "FFM", deployerAddress);
  await musicAsset.waitForDeployment();

  const RoyaltySplitterFactory = await hre.ethers.getContractFactory("RoyaltySplitterFactory");
  const royaltySplitterFactory = await RoyaltySplitterFactory.deploy();
  await royaltySplitterFactory.waitForDeployment();

  const PlatformHub = await hre.ethers.getContractFactory("PlatformHub");
  const platformHub = await PlatformHub.deploy(
    await musicAsset.getAddress(),
    await royaltySplitterFactory.getAddress(),
    deployerAddress,
    500
  );
  await platformHub.waitForDeployment();

  const minterRole = await musicAsset.MINTER_ROLE();
  const grantRoleTx = await musicAsset.grantRole(minterRole, await platformHub.getAddress());
  await grantRoleTx.wait();

  const deployment = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      musicAsset: await musicAsset.getAddress(),
      royaltySplitterFactory: await royaltySplitterFactory.getAddress(),
      platformHub: await platformHub.getAddress(),
    },
    transactions: {
      musicAsset: musicAsset.deploymentTransaction().hash,
      royaltySplitterFactory: royaltySplitterFactory.deploymentTransaction().hash,
      platformHub: platformHub.deploymentTransaction().hash,
      grantMinterRole: grantRoleTx.hash,
    },
    platformFeeBps: 500,
    treasury: deployerAddress,
  };

  const outputPath = await writeDeployment(hre.network.name, deployment);

  console.log("\nDeployment complete:");
  console.log(JSON.stringify(deployment, null, 2));
  console.log(`\nSaved deployment file: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
