const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

// 未显式传入环境变量时，使用默认的初始消息。
const DEFAULT_MESSAGE = "Hello from FreeFlow on Sepolia";

// 根据网络名称生成 HelloWorld 的部署记录输出路径。
function resolveOutputPath(networkName) {
  return path.join(__dirname, "..", "deployments", `helloworld.${networkName}.json`);
}

async function main() {
  // 优先读取环境变量，便于在不同环境下复用部署脚本。
  const initialMessage = process.env.HELLO_MESSAGE || DEFAULT_MESSAGE;
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying HelloWorld...");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Initial message: ${initialMessage}`);

  const HelloWorld = await hre.ethers.getContractFactory("HelloWorld");
  const helloWorld = await HelloWorld.deploy(initialMessage);
  const deploymentTx = helloWorld.deploymentTransaction();

  // 等待部署交易确认，后续再读取部署区块和链上状态。
  console.log(`Transaction hash: ${deploymentTx.hash}`);
  const receipt = await deploymentTx.wait();
  await helloWorld.waitForDeployment();

  const address = await helloWorld.getAddress();
  const block = await hre.ethers.provider.getBlock(receipt.blockNumber);
  const storedMessage = await helloWorld.message();
  const outputPath = resolveOutputPath(hre.network.name);

  // 将部署结果落盘，供后续调用脚本按网络读取。
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        network: hre.network.name,
        contractName: "HelloWorld",
        address,
        deployer: deployer.address,
        transactionHash: deploymentTx.hash,
        blockNumber: receipt.blockNumber,
        deployedAt: block ? new Date(Number(block.timestamp) * 1000).toISOString() : null,
        initialMessage: storedMessage
      },
      null,
      2
    )
  );

  console.log(`HelloWorld deployed to: ${address}`);
  console.log(`Deployment record saved to: ${outputPath}`);
}

// 统一捕获异常，方便脚本在自动化环境中失败退出。
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
