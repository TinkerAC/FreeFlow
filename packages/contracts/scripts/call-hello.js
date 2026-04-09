const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

// 未通过环境变量覆盖时，默认写入到 HelloWorld 的新消息内容。
const DEFAULT_NEW_MESSAGE = "Hello again from FreeFlow";

// 根据网络名称定位对应的部署记录文件。
function resolveDeploymentPath(networkName) {
  return path.join(__dirname, "..", "deployments", `helloworld.${networkName}.json`);
}

async function main() {
  // 先读取当前网络的部署记录，拿到已部署的合约地址。
  const deploymentPath = resolveDeploymentPath(hre.network.name);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const [signer] = await hre.ethers.getSigners();
  const helloWorld = await hre.ethers.getContractAt("HelloWorld", deployment.address, signer);
  const beforeMessage = await helloWorld.message();
  // 支持通过环境变量传入新的消息值，便于脚本复用。
  const newMessage = process.env.HELLO_NEW_MESSAGE || DEFAULT_NEW_MESSAGE;

  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract: ${deployment.address}`);
  console.log(`Signer: ${signer.address}`);
  console.log(`Message before tx: ${beforeMessage}`);
  console.log(`Updating message to: ${newMessage}`);

  // 发送交易更新链上消息，并等待区块确认。
  const tx = await helloWorld.setMessage(newMessage);
  console.log(`Transaction hash: ${tx.hash}`);
  const receipt = await tx.wait();
  const afterMessage = await helloWorld.message();

  console.log(`Block number: ${receipt.blockNumber}`);
  console.log(`Message after tx: ${afterMessage}`);
}

// 统一捕获异常，保证脚本在 CI 或命令行中返回非零退出码。
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
