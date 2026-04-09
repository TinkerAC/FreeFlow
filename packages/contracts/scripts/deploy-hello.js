const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const DEFAULT_MESSAGE = "Hello from FreeFlow on Sepolia";

function resolveOutputPath(networkName) {
  return path.join(__dirname, "..", "deployments", `helloworld.${networkName}.json`);
}

async function main() {
  const initialMessage = process.env.HELLO_MESSAGE || DEFAULT_MESSAGE;
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying HelloWorld...");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Initial message: ${initialMessage}`);

  const HelloWorld = await hre.ethers.getContractFactory("HelloWorld");
  const helloWorld = await HelloWorld.deploy(initialMessage);
  const deploymentTx = helloWorld.deploymentTransaction();

  console.log(`Transaction hash: ${deploymentTx.hash}`);
  const receipt = await deploymentTx.wait();
  await helloWorld.waitForDeployment();

  const address = await helloWorld.getAddress();
  const block = await hre.ethers.provider.getBlock(receipt.blockNumber);
  const storedMessage = await helloWorld.message();
  const outputPath = resolveOutputPath(hre.network.name);

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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
