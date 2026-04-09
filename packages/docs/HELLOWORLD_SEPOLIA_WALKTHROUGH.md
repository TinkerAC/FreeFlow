# HelloWorld Sepolia 实战记录

## 1. 目标

这份文档演示一个最小闭环：

1. 编写一个最简单的 `HelloWorld` 智能合约
2. 使用仓库根目录 `.env` 里的测试私钥部署到 `Sepolia`
3. 调用合约的只读方法
4. 发送一笔写交易修改链上状态
5. 解释整个过程中每一步为什么会这样工作

本文档对应的代码已经放在当前仓库：

- `packages/contracts/contracts/HelloWorld.sol`
- `packages/contracts/scripts/deploy-hello.js`
- `packages/contracts/scripts/call-hello.js`

## 2. 用到的代码

### 2.1 合约

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract HelloWorld {
    string private _message;
    address public immutable owner;

    event MessageUpdated(string oldMessage, string newMessage, address indexed updater);

    constructor(string memory initialMessage) {
        owner = msg.sender;
        _message = initialMessage;
    }

    function message() external view returns (string memory) {
        return _message;
    }

    function setMessage(string calldata newMessage) external {
        string memory oldMessage = _message;
        _message = newMessage;
        emit MessageUpdated(oldMessage, newMessage, msg.sender);
    }
}
```

它只做两件事：

- 部署时把初始字符串写进链上存储
- 之后允许任何地址调用 `setMessage` 更新它

### 2.2 部署脚本

```js
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

  const HelloWorld = await hre.ethers.getContractFactory("HelloWorld");
  const helloWorld = await HelloWorld.deploy(initialMessage);
  const deploymentTx = helloWorld.deploymentTransaction();

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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

它做了三件事：

- 用当前钱包发送创建合约交易
- 等交易上链
- 把部署结果写到 `packages/contracts/deployments/helloworld.sepolia.json`

### 2.3 调用脚本

```js
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const DEFAULT_NEW_MESSAGE = "Hello again from FreeFlow";

function resolveDeploymentPath(networkName) {
  return path.join(__dirname, "..", "deployments", `helloworld.${networkName}.json`);
}

async function main() {
  const deploymentPath = resolveDeploymentPath(hre.network.name);
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const [signer] = await hre.ethers.getSigners();
  const helloWorld = await hre.ethers.getContractAt("HelloWorld", deployment.address, signer);

  const beforeMessage = await helloWorld.message();
  const newMessage = process.env.HELLO_NEW_MESSAGE || DEFAULT_NEW_MESSAGE;
  const tx = await helloWorld.setMessage(newMessage);

  await tx.wait();

  const afterMessage = await helloWorld.message();
  console.log({ beforeMessage, afterMessage });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

它先读链上旧值，再发一笔写交易，再读一次新值。

## 3. 环境准备

当前仓库的 Hardhat 配置会直接读取根目录 `.env`，并优先使用：

- `PRIVATE_KEY`
- `POLYGON_PRIVATE_KEY`

这意味着你当前根目录里这个测试私钥可以直接用于 Sepolia。

当前配置还会对 `Sepolia` 使用默认公共 RPC：

```txt
https://ethereum-sepolia-rpc.publicnode.com
```

所以即使 `.env` 里没有 `SEPOLIA_RPC_URL`，也可以直接尝试部署。

## 4. 实际使用的命令

编译：

```powershell
pnpm --filter @freeflow/contracts exec hardhat compile
```

部署：

```powershell
pnpm --filter @freeflow/contracts run hello:deploy:sepolia
```

调用：

```powershell
pnpm --filter @freeflow/contracts run hello:call:sepolia
```

## 5. 工作原理

### 5.1 为什么只靠私钥就能部署

因为私钥能导出一个 EOA 钱包地址。Hardhat 在连接到 `Sepolia` RPC 后，会用这个私钥：

- 对交易做签名
- 广播到 `Sepolia` 网络
- 等待矿工或验证者把交易打包进区块

部署合约本质上也是一笔交易，只是它的 `to` 为空，`data` 里放的是：

- 合约字节码
- 构造函数参数

链执行完成后，会生成一个新的合约地址。

### 5.2 `compile` 到底做了什么

`hardhat compile` 会：

- 读取 Solidity 源码
- 解析 import
- 调用 Solidity 编译器
- 生成 ABI 和 bytecode

ABI 的作用是告诉前端或脚本：

- 这个合约有哪些函数
- 每个函数收什么参数
- 返回什么类型
- 有哪些事件

bytecode 的作用是：

- 部署时作为合约程序本体发到链上

### 5.3 部署脚本为什么能直接拿到 signer

因为 Hardhat 网络配置里已经放入了 `accounts: [PRIVATE_KEY]`。  
所以在脚本里执行：

```js
const [deployer] = await hre.ethers.getSigners();
```

拿到的就是由你的测试私钥生成的钱包对象。

### 5.4 为什么读 `message()` 不花 gas，而 `setMessage()` 要花 gas

因为：

- `message()` 是 `view`，只是本地节点模拟执行，不改链上状态
- `setMessage()` 会修改存储，必须发交易上链，因此要花 gas

所以一次完整调用通常分成两类：

- 读调用：直接从 RPC 查询结果
- 写调用：签名交易，等待链确认

### 5.5 为什么调用脚本里要 `await tx.wait()`

`helloWorld.setMessage(...)` 返回的是“交易已广播”，不是“状态已确认”。  
只有 `await tx.wait()` 之后，才能基本确认：

- 交易已经被打包
- 链上状态已经更新
- 再读 `message()` 时能拿到新值

## 6. 本次执行结果

这次实际执行已经完成，结果如下：

- 网络：`Sepolia`
- 部署钱包：`0xC1b7D433c9175a8E5D8e399Ab4762B95e0035114`
- 合约地址：`0x55e93687a34636237762aF4B25E30E539eA66341`
- 部署交易哈希：`0xd2d6c11b93d2cb88b1e095fd803cb591432e3632e312df35b3c523070dd9376e`
- 部署所在区块：`10621825`
- 调用交易哈希：`0xed5a48591c3c3d3bb1f43525b97fe530cf757224ab7eea7e1fbd8724e95a5b67`
- 调用所在区块：`10621827`
- 初始消息：`Hello from FreeFlow on Sepolia`
- 更新后消息：`Hello again from FreeFlow`

部署记录文件：

- `packages/contracts/deployments/helloworld.sepolia.json`

本次运行过的命令：

```powershell
pnpm --filter @freeflow/contracts exec hardhat compile
pnpm --filter @freeflow/contracts run hello:deploy:sepolia
pnpm --filter @freeflow/contracts run hello:call:sepolia
```

部署阶段的重要输出：

```text
Deploying HelloWorld...
Network: sepolia
Deployer: 0xC1b7D433c9175a8E5D8e399Ab4762B95e0035114
Initial message: Hello from FreeFlow on Sepolia
Transaction hash: 0xd2d6c11b93d2cb88b1e095fd803cb591432e3632e312df35b3c523070dd9376e
HelloWorld deployed to: 0x55e93687a34636237762aF4B25E30E539eA66341
```

调用阶段的重要输出：

```text
Network: sepolia
Contract: 0x55e93687a34636237762aF4B25E30E539eA66341
Signer: 0xC1b7D433c9175a8E5D8e399Ab4762B95e0035114
Message before tx: Hello from FreeFlow on Sepolia
Updating message to: Hello again from FreeFlow
Transaction hash: 0xed5a48591c3c3d3bb1f43525b97fe530cf757224ab7eea7e1fbd8724e95a5b67
Block number: 10621827
Message after tx: Hello again from FreeFlow
```

## 7. 你接下来最该理解的三个点

- 智能合约部署，本质上就是一笔“创建合约”的交易。
- ABI 决定了应用如何和合约对话，bytecode 决定了链上跑什么程序。
- 读调用和写调用是完全不同的两类链交互，前者像查询，后者像提交事务。
