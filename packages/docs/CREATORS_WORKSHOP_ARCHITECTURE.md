# Creators Workshop 架构与发布流程

## 1. 目标

`Creators Workshop` 是一个独立于主播放界面的创作者工作台，服务歌手或版权方的发布流程：

1. 准备音频、封面和作品文案
2. 通过 Pinata 把素材和 metadata 上传到 IPFS
3. 创建版税分账合约
4. 铸造 Music NFT
5. 在 `PlatformHub` 上设置购买门槛
6. 为后续用户购买和获取资源留下标准化入口

当前实现对应代码：

- `apps/desktop/src/renderer/windows/CreatorsWorkshop/CreatorsWorkshop.tsx`
- `apps/desktop/src/renderer/windows/CreatorsWorkshop/CreatorsWorkshop.module.css`
- `apps/desktop/src/renderer/core/web3/bootstrap.ts`
- `apps/desktop/src/main/core/ipc/handlers/musicWorkshopHandlers.ts`

## 2. UI 流程

窗口被重构成四个阶段：

### 2.1 作品准备

- 选择音频文件
- 选择封面图
- 自动读取本地音频 metadata
- 填写标题、歌手、专辑、流派、描述
- 选择访问模式：
  - `open`：公开可访问
  - `purchase`：购买后完整获取

### 2.2 Pinata / IPFS

- 配置 Pinata JWT 或 signed upload URL
- 上传封面和音频
- 生成并上传 metadata JSON
- 得到：
  - `audioCid`
  - `coverCid`
  - `metadataCid`
  - `metadataUri`

### 2.3 铸造与分账

- 配置：
  - `MusicAsset`
  - `RoyaltySplitterFactory`
  - `PlatformHub`
- 设置收益分账地址和份额
- 先创建 splitter
- 再用 `metadataUri` 调用 `mintTrack`
- 如果是付费作品，再调用 `PlatformHub.setPremium`

### 2.4 购买与取回

这部分在窗口中不是“直接上传代码”，而是明确后续发行架构，避免你未来在资源分发上走弯路。

## 3. 建议的内容存储设计

### 3.1 适合公开放到 IPFS 的内容

- 封面图
- metadata JSON
- 作品简介
- 试听片段
- 作品属性和版权声明摘要

### 3.2 不建议直接公开放出的内容

如果作品是付费获取，完整音频不应裸露为“谁拿到 CID 就能听”。

更合理的设计是：

1. 先把完整音频加密
2. 将加密后的文件上传到 IPFS
3. metadata 中记录：
   - 加密音频 CID
   - 加密算法
   - 试听片段 CID
   - 解锁方式
4. 后端在验证用户购买成功后，返回：
   - Pinata signed gateway URL
   - 或者解密密钥 / 解密票据

这样即使有人知道完整音频的 CID，也只能拿到密文。

## 4. 链上与后端职责分工

### 4.1 链上负责

- tokenURI
- NFT 所有权
- ERC-2981 版税
- 分账合约地址
- 是否为 premium 作品
- 购买权限状态

### 4.2 后端负责

- SIWE 登录
- 购买事件索引
- 用户权限缓存
- 发放 Pinata signed URL
- 发放解密密钥
- 评论、分享、关注、通知

这也是为什么创作者发布流程里要把“资源访问”设计成链上与中心化外围平台配合，而不是全都放到智能合约里。

## 5. Pinata 集成方式

当前窗口实现了两种接法：

### 5.1 开发期：直接 JWT 上传

适合本地测试或你自己的桌面端发行工具。

需要填写：

- `services.pinata.jwt`
- `services.pinata.gateway`
- `services.pinata.apiBaseUrl`

默认使用：

- `https://uploads.pinata.cloud/v3/files`

### 5.2 生产期：Signed Upload URL

更推荐。

原因是你不应把长期有效的 Pinata JWT 暴露给公开客户端。

更稳妥的流程：

1. 客户端请求你自己的后端
2. 后端生成一次性上传 URL
3. 客户端把文件直接上传给 Pinata

窗口里已经预留了：

- `services.pinata.useSignedUploads`
- `services.pinata.signedUploadUrl`

## 6. 当前 metadata 结构

当前生成的 metadata JSON 大致包含：

- `name`
- `description`
- `image`
- `attributes`
- `properties.media.audio`
- `properties.media.cover`
- `properties.commerce`
- `properties.provenance`

这样做的好处是：

- NFT marketplace 可以正常显示基础信息
- 你的应用还能读到更丰富的业务字段
- 后续迁移到后端索引服务时结构也比较稳定

## 7. 购买后如何让用户获取资源

推荐流程：

1. 用户在前端调用 `PlatformHub.buyAccess(tokenId)`
2. 后端监听或查询链上，确认 `hasAccess(user, tokenId) === true`
3. 后端签发：
   - Pinata signed gateway URL
   - 或者解密密钥
4. 客户端使用签名 URL 下载，或拿密钥解密后播放

如果作品是完全公开的：

- 直接通过公开网关播放即可

如果作品是付费内容：

- 必须用“加密音频 + 后端授权”的方式

## 8. 配置占位符

当前实现允许先用占位符填充配置：

- `Pinata JWT`
- `Gateway`
- `MusicAsset`
- `RoyaltySplitterFactory`
- `PlatformHub`

因此你可以先把 UI 和链路跑通，再逐步接入真实密钥和真实合约地址。

## 9. 关联的用户可见改动

这次改动还做了以下收敛：

- 主界面的旧 `Web3View` 被改成迁移提示页
- 顶部栏新增打开 `Creators Workshop` 的按钮
- 菜单里的 `Music Workshop` 改名为 `Creators Workshop`
- 独立工作台窗口标题改为 `Creators Workshop`

## 10. 推荐的下一步

如果你准备继续把这个功能做完整，优先级建议如下：

1. 增加“试听片段生成”能力
2. 增加“完整音频加密上传”能力
3. 后端实现 signed upload URL
4. 后端实现购买后授权下载
5. 新增 `packages/sdk`，统一封装 metadata、Pinata 请求、链上调用

## 11. Pinata 官方文档参考

建议直接对照官方文档继续深化：

- Uploading files: `https://docs.pinata.cloud/files/uploading-files`
- Upload a file endpoint: `https://docs.pinata.cloud/api-reference/endpoint/upload-a-file`

当前窗口的上传请求组织方式，就是按这类官方流程构建的。
