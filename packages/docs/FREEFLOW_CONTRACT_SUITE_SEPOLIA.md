# FreeFlow Contract Suite on Sepolia

## 1. 目标

这套合约替换了之前仅用于占位的 `mintTrack + setPremium` 方案，改成一套可真实测试的音乐发行流程：

- 创作者上传音频、封面、metadata JSON 到 IPFS
- 创作者通过一次 `publishTrack(...)` 完成
  - 分账合约部署
  - 音乐 NFT 铸造
  - 访问价格和销售状态写入链上
- 用户通过 `buyAccess(tokenId)` 购买访问权
- 后端通过 `hasAccess(user, tokenId)` 判断是否放行完整资源

这套设计更接近真实产品，而不是演示性质的占位逻辑。

## 2. 合约职责

### `MusicAsset`

文件：`packages/contracts/contracts/MusicAsset.sol`

职责：

- 发行音乐 NFT
- 保存 `tokenURI`
- 保存 `creatorOf(tokenId)`
- 按 ERC-2981 返回版税接收方和版税比例
- 使用 `AccessControl`
  - 只有持有 `MINTER_ROLE` 的地址可以铸造
  - 当前真实部署里，`PlatformHub` 被授予了 `MINTER_ROLE`

这样做的目的，是避免前端直接绕过平台逻辑随意铸造。

### `RoyaltySplitter` / `RoyaltySplitterFactory`

文件：`packages/contracts/contracts/RoyaltySplitter.sol`

职责：

- 为每首作品生成一个固定分账合约
- 接收购买收入和打赏
- 合作方按份额主动 `release(account)` 提现

为什么用 pull payment：

- 收款逻辑更稳
- 不需要每次购买时给多个地址分别转账
- 合作作者可以自行提取自己的部分

### `PlatformHub`

文件：`packages/contracts/contracts/PlatformHub.sol`

职责：

- `publishTrack(...)`
  - 调用 `RoyaltySplitterFactory.createSplitter(...)`
  - 调用 `MusicAsset.mintTrack(...)`
  - 保存价格、是否需要购买、是否激活销售
- `buyAccess(tokenId)`
  - 校验价格
  - 写入 `hasAccess`
  - 把创作者收益转入 splitter
  - 平台费留在 Hub，由 treasury 提取
- `updateTrackSale(...)`
  - 创作者修改售价和销售状态
- `grantAccess(...)`
  - 创作者赠送访问权
- `tipTrack(...)`
  - 用户直接打赏到 splitter

## 3. 为什么这样拆分

这是比较稳妥的职责边界：

- 链上：
  - tokenURI
  - 版税接收地址
  - 分账地址
  - 购买价格
  - 授权状态
- IPFS：
  - metadata JSON
  - 封面
  - 音频正文或加密音频正文
- 后端：
  - SIWE 登录
  - 读取链上授权
  - 返回 Pinata signed URL 或解密材料

不把完整音频写链上，是因为成本高且没有必要。

## 4. 发布和购买的工作原理

### 创作者发布

桌面端 `Creators Workshop` 先上传：

1. 音频
2. 封面
3. metadata JSON

然后调用：

```solidity
publishTrack(
  string tokenURI_,
  uint96 royaltyBps,
  bool requiresPurchase,
  uint256 price,
  bool saleActive,
  address[] payees,
  uint256[] shares
)
```

合约内部流程是：

1. `PlatformHub` 创建 `RoyaltySplitter`
2. `PlatformHub` 调用 `MusicAsset.mintTrack(...)`
3. `PlatformHub` 保存销售配置
4. 链上发出 `TrackPublished`

所以前端只需要发 1 笔交易。

### 用户购买

用户调用：

```solidity
buyAccess(uint256 tokenId)
```

链上会：

1. 检查作品是否需要购买
2. 检查是否已激活销售
3. 检查 `msg.value == price`
4. 写入 `hasAccess[tokenId][buyer] = true`
5. 把创作者收益转入 splitter
6. 平台费保留在 `PlatformHub`

### 收益提取

分账合约中的合作方调用：

```solidity
release(address payable account)
```

各自提取自己的份额。

## 5. 本地验证结果

### 编译

```powershell
pnpm --filter @freeflow/contracts exec hardhat compile
```

结果：成功。

### 测试

```powershell
pnpm --filter @freeflow/contracts exec hardhat test
```

结果：3 个用例全部通过。

覆盖的核心逻辑：

- 付费作品发布后可购买并写入访问权
- 公开作品默认可访问
- 只有创作者可以修改销售配置

## 6. Sepolia 真实部署

部署时间：`2026-04-09T10:56:27.521Z`

部署钱包：

```text
0xC1b7D433c9175a8E5D8e399Ab4762B95e0035114
```

合约地址：

```text
MusicAsset              0x91B67981Ea0c735E91a008045b718B961658c3Ce
RoyaltySplitterFactory  0x1219d9dd26268309F58579013Ca2d14463727cc5
PlatformHub             0x50F5476B007cC2500F975F63B192cFd457058A8A
```

部署交易：

```text
MusicAsset deploy       0xc674c5996dcdde45256942fd53aa3203a0fa646c8dda926055931f0d689c6ea5
Factory deploy          0x83bd3dc499a162d5a5ebaf5437afbace7c72211633127fad6d220fd1304ecc07
PlatformHub deploy      0x2731855a937bd0c18fc5bdc95de435953b7970c72d36d65dbb452c1eb3da5160
Grant MINTER_ROLE       0xc6fd1e2a1b789621a269a90191e16f7cb6df540da7f45dbf6343f715f73a822c
```

平台费：

```text
500 BPS = 5%
```

本地部署记录文件：

`packages/contracts/deployments/sepolia-suite.json`

这个目录已在 `.gitignore` 中忽略，不会污染版本库。

## 7. Sepolia 烟雾测试

执行命令：

```powershell
pnpm --filter @freeflow/contracts run smoke:sepolia
```

真实链上结果：

```text
临时买家地址         0xF2aBc0C4D94B6C65569A4C89ad33469993f2Fff7
fundBuyerTx         0xffe3294342e7dbf976672c05ea21b0130ebada7729cdd2b470bbfaa3904eb5cb
publishTx           0xb389501b0c78e3514705c8dfb8c15cbffcd52471f26813954d6c837c4a2240e4
buyTx               0xe5b7107c3555ed4a635de757e09ebf5cdf95af987e94a1680744fbfa6b2f3231
releaseTx           0xff5ca4c4f7377c07027907f24c7c8422fac00b9e33cb675f2f4c418ab17ebb91
tokenId             1
splitter            0xa7E6B7359328CbF36ED83Be095DE0c5b7d0a3599
hasAccessBefore     false
hasAccessAfter      true
releasable          950000000000000 wei
```

这说明以下流程已经真实打通：

1. 创作者发布作品
2. 临时买家地址购买访问权
3. 合约写入访问状态
4. 收入进入 splitter
5. 创作者从 splitter 提现

## 8. 桌面端接入点

### 默认地址

文件：`apps/desktop/src/shared/web3/freeflowContracts.ts`

这里已经写入了这次 Sepolia 的真实地址，桌面端会默认使用它们。

### 设置模型

文件：`apps/desktop/src/shared/settings/schema.ts`

这里定义了：

- `chainId`
- `chainName`
- `rpcUrl`
- `explorerUrl`
- `musicAssetAddress`
- `royaltySplitterFactoryAddress`
- `platformHubAddress`
- `defaultRoyaltyBps`
- `platformFeeBps`

### 钱包链配置

文件：`apps/desktop/src/renderer/core/web3/bootstrap.ts`

这里统一用了 Sepolia 的链信息。

### 创作者窗口

文件：`apps/desktop/src/renderer/windows/MusicWorkshop/MusicWorkshop.tsx`

当前已经真实接入：

- `publishTrack(...)`
- `getTrackSaleConfig(tokenId)`
- `paymentPreview(tokenId)`
- `hasAccess(account, tokenId)`
- `buyAccess(tokenId)`

也就是说现在桌面端不再是占位调用，而是直接对接这套 Sepolia 合约。

## 9. 你现在可以怎么测试

### 创作者侧

1. 打开 `Creators Workshop`
2. 上传音频、封面、metadata
3. 确认合约地址已自动填入
4. 点击“通过 PlatformHub 发布作品”

### 购买侧

1. 切换到“购买与取回”
2. 填入 Token ID
3. 点击“查询链上授权”
4. 点击“购买访问权”
5. 再次查询确认 `hasAccess = true`

## 10. 当前仍未做的事

### 已做

- 逻辑验证：Hardhat tests
- 测试网验证：Sepolia smoke test
- 程序接入：桌面端真实调用

### 未做

- Etherscan/Sourcify 源码验证

原因：

- 当前 `.env` 中没有 Etherscan API key
- 所以这次没有执行 block explorer 的源码验证步骤

如果你后面提供 `ETHERSCAN_API_KEY`，可以继续加上自动验证脚本。
