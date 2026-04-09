const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const DEFAULT_NEW_MESSAGE = "Hello again from FreeFlow";

function resolveDeploymentPath(networkName) {
  return path.join(__dirname, "..", "deployments", `helloworld.${networkName}.json`);
}

async function main() {
  const deploymentPath = resolveDeploymentPath(hre.network.name);

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const [signer] = await hre.ethers.getSigners();
  const helloWorld = await hre.ethers.getContractAt("HelloWorld", deployment.address, signer);
  const beforeMessage = await helloWorld.message();
  const newMessage = process.env.HELLO_NEW_MESSAGE || DEFAULT_NEW_MESSAGE;

  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract: ${deployment.address}`);
  console.log(`Signer: ${signer.address}`);
  console.log(`Message before tx: ${beforeMessage}`);
  console.log(`Updating message to: ${newMessage}`);

  const tx = await helloWorld.setMessage(newMessage);
  console.log(`Transaction hash: ${tx.hash}`);
  const receipt = await tx.wait();
  const afterMessage = await helloWorld.message();

  console.log(`Block number: ${receipt.blockNumber}`);
  console.log(`Message after tx: ${afterMessage}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
