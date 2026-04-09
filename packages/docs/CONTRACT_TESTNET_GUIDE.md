# FreeFlow 合约测试网部署与调用指南

## 1. 是否适合继续用 Node 技术栈做外围服务器

合适。对这个项目来说，Node/TypeScript 做外围服务器是顺手且实用的选择：

- 桌面端和 Web 端都已经在用 TypeScript，后端继续用同一套语言能减少上下文切换。
- 你已经在前端依赖里用了 `ethers`，后端同样可以直接复用链交互逻辑、ABI 和类型定义。
- 评论、分享、搜索、通知、内容审核、SIWE 登录会话，这些都更适合放在中心化服务里，而不是硬塞上链。

建议职责边界保持清晰：

- 链上：版权登记、授权关系、收益分账、可审计事件。
- 后端：SIWE、评论、社交、搜索、索引、缓存、审核。
- 应用端：播放、本地资源管理、钱包连接、发起签名和交易。

## 2. 当前仓库里的合约入口

当前部署脚本会依次部署三个合约：

- `MusicAsset`
- `RoyaltySplitterFactory`
- `PlatformHub`

对应文件：

- `packages/contracts/scripts/deploy.js`
- `packages/contracts/contracts/MusicAsset.sol`
- `packages/contracts/contracts/RoyaltySplitter.sol`
- `packages/contracts/contracts/PlatformHub.sol`

## 3. 用根目录 `.env` 里的私钥直接部署到测试网

`packages/contracts/hardhat.config.cjs` 已支持直接读取仓库根目录 `.env`，并兼容以下私钥变量名：

- `PRIVATE_KEY`
- `POLYGON_PRIVATE_KEY`

你至少需要补一个测试网 RPC 地址。示例：

```env
POLYGON_PRIVATE_KEY=你的测试钱包私钥
SEPOLIA_RPC_URL=你的 Sepolia RPC URL
AMOY_RPC_URL=你的 Polygon Amoy RPC URL
```

说明：

- 如果你只部署到 `sepolia`，只需要 `SEPOLIA_RPC_URL`。
- 如果你只部署到 `amoy`，只需要 `AMOY_RPC_URL`。
- 私钥钱包里需要有对应测试网 gas。
- 不要把真实主网私钥放进仓库；测试网也建议使用专门的钱包。

## 4. 编译与部署命令

在仓库根目录执行。

编译：

```powershell
pnpm --filter @freeflow/contracts exec hardhat compile
```

部署到 Sepolia：

```powershell
pnpm --filter @freeflow/contracts exec hardhat run scripts/deploy.js --network sepolia
```

部署到 Polygon Amoy：

```powershell
pnpm --filter @freeflow/contracts exec hardhat run scripts/deploy.js --network amoy
```

成功后终端会输出类似结果：

```text
MusicAsset deployed to: 0x...
RoyaltySplitterFactory deployed to: 0x...
PlatformHub deployed to: 0x...
```

把这些地址保存下来，后续应用调用会用到。

## 5. 在应用中调用合约

最简单的做法是先把“合约地址 + ABI”整理成应用侧配置。

ABI 编译后在这些位置：

- `packages/contracts/artifacts/contracts/MusicAsset.sol/MusicAsset.json`
- `packages/contracts/artifacts/contracts/PlatformHub.sol/PlatformHub.json`
- `packages/contracts/artifacts/contracts/RoyaltySplitter.sol/RoyaltySplitterFactory.json`

建议先在应用里建立一个配置文件，例如：

```ts
// apps/web/src/contracts/config.ts
export const CONTRACTS = {
  musicAsset: "0xYourMusicAssetAddress",
  platformHub: "0xYourPlatformHubAddress",
  royaltySplitterFactory: "0xYourRoyaltySplitterFactoryAddress"
};
```

### 5.1 前端或桌面端通过用户钱包发交易

适合 `mintTrack`、`setPremium`、`buyAccess`、`tipTrack` 这类需要用户签名的调用。

```ts
import { BrowserProvider, Contract, parseEther } from "ethers";
import PlatformHubArtifact from "./abis/PlatformHub.json";

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const platformHub = new Contract(
  CONTRACTS.platformHub,
  PlatformHubArtifact.abi,
  signer
);

await platformHub.buyAccess(1n, {
  value: parseEther("0.01")
});
```

### 5.2 后端服务使用私钥钱包代发或做链上写入

适合管理员动作、索引服务补写、平台侧任务。

```ts
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import MusicAssetArtifact from "./abis/MusicAsset.json";

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new Wallet(process.env.POLYGON_PRIVATE_KEY!, provider);

const musicAsset = new Contract(
  process.env.MUSIC_ASSET_ADDRESS!,
  MusicAssetArtifact.abi,
  wallet
);

const tx = await musicAsset.mintTrack(
  "0xArtistAddress",
  "ipfs://your-metadata-uri",
  "0xRoyaltyReceiver",
  500
);

await tx.wait();
```

`500` 表示 5% 版税，ERC-2981 的分母是 `10000`。

### 5.3 只读调用

只读场景不需要私钥，可以直接走 `JsonRpcProvider`。

```ts
import { Contract, JsonRpcProvider } from "ethers";
import PlatformHubArtifact from "./abis/PlatformHub.json";

const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const platformHub = new Contract(
  process.env.PLATFORM_HUB_ADDRESS!,
  PlatformHubArtifact.abi,
  provider
);

const hasAccess = await platformHub.checkAccess(
  "0xUserAddress",
  1n
);
```

## 6. 推荐的下一步

如果你后面要让桌面端、Web 端、后端都长期复用这些合约，最好新增一个共享包，例如：

- `packages/sdk`：封装合约地址、ABI、链 ID、读写方法。
- `packages/shared-types`：统一链上和后端共用的 TypeScript 类型。

这样就不需要每个应用自己复制 ABI 和地址配置。
