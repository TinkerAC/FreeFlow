const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// 将整套合约的部署结果写入 deployments 目录，便于后续测试和调用。
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

  // 先部署 ERC-1155 访问凭证合约，平台中枢后续会依赖它创建歌曲 token 和铸造购买凭证。
  const MusicAccess1155 = await hre.ethers.getContractFactory("MusicAccess1155");
  const musicAccess = await MusicAccess1155.deploy(deployerAddress);
  await musicAccess.waitForDeployment();

  // 分账工厂用于为每个作品创建独立的收益拆分合约。
  const RoyaltySplitterFactory = await hre.ethers.getContractFactory("RoyaltySplitterFactory");
  const royaltySplitterFactory = await RoyaltySplitterFactory.deploy();
  await royaltySplitterFactory.waitForDeployment();

  // 平台中枢负责作品发布、收费访问和平台费用管理。
  const PlatformHub = await hre.ethers.getContractFactory("PlatformHub");
  const platformHub = await PlatformHub.deploy(
    await musicAccess.getAddress(),
    await royaltySplitterFactory.getAddress(),
    deployerAddress,
    500
  );
  await platformHub.waitForDeployment();

  // 授予平台中枢铸造权限，使其能够在 publishTrack 和 buyAccess 中创建访问凭证。
  const minterRole = await musicAccess.MINTER_ROLE();
  const grantRoleTx = await musicAccess.grantRole(minterRole, await platformHub.getAddress());
  await grantRoleTx.wait();

  // 汇总部署产物和关键交易哈希，方便前端或脚本复用。
  const deployment = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployerAddress,
    contracts: {
      musicAccess1155: await musicAccess.getAddress(),
      musicAsset: await musicAccess.getAddress(),
      royaltySplitterFactory: await royaltySplitterFactory.getAddress(),
      platformHub: await platformHub.getAddress(),
    },
    transactions: {
      musicAccess1155: musicAccess.deploymentTransaction().hash,
      musicAsset: musicAccess.deploymentTransaction().hash,
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

// 统一处理脚本异常。
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
