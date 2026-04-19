# FreeFlow 项目调研报告

## 1. 调研结论

FreeFlow 当前已经不适合按“多平台音乐聚合播放器”作为毕业设计主线来写。代码中仍保留了网易云、QQ、Bilibili、YouTube Music、Hifini 等历史内容提供者，但当前项目最有论文价值、最成体系的部分已经转向：

**面向链上音乐发行、检索、购买、播放与互动的 Web2.5 桌面音乐系统。**

系统由四个部分组成：

1. Electron + React 桌面端：负责用户界面、播放控制、创作者工作台、链上音乐详情、购买、评论、链上音乐库和本地缓存。
2. Web2.5 后端：负责 SIWE 登录、Pinata 上传代理、创作者发行草稿、链上资源索引、购买记录、评论和用户资料。
3. Solidity 合约：负责音乐资源发布、ERC-1155 访问凭证、购买访问权、收益分账和平台费用。
4. IPFS/Pinata 存储：保存音频、封面和 metadata JSON，并通过 CID 和网关地址被链上资源索引引用。

论文建议定位为**纯系统开发型毕业设计**，算法只作为“链上音乐资源检索与排序模块”的增强点来写，服务于系统功能完整性，而不是把整篇论文写成算法研究型。

## 2. 调研范围

本次主要阅读了以下目录和文件：

| 范围 | 代表文件 | 结论 |
| --- | --- | --- |
| 桌面端主进程 | `apps/desktop/src/main/main.ts`、`AudioProxyServer.ts`、`TrackService.ts`、`SearchService.ts` | 已有完整 Electron 主进程、DI、IPC、本地库、音频代理和播放缓存能力 |
| 桌面端渲染进程 | `windows/MusicWorkshop`、`FreeFlowTrackDetailView`、`CommentView`、`ProfileGuide` | 已完成创作者工作台、链上详情页、评论页、Profile/SIWE 引导等核心界面 |
| 后端服务 | `apps/backend/src/modules/*`、`apps/backend/prisma/schema.prisma` | Express + Prisma 模块化后端，覆盖认证、上传、发行、检索、购买、评论和用户资料 |
| 合约 | `packages/contracts/contracts/*.sol`、`packages/contracts/test/platformHub.js` | 已实现 MusicAccess1155、PlatformHub、RoyaltySplitter，并有核心合约测试 |
| 项目文档 | `SEARCH_RECOMMENDATION_DESIGN.md`、`packages/docs/*` | 已有链上检索排序算法设计、合约 Sepolia 部署和创作者工作台设计说明 |
| 范文 | `papers/examples/myexample-md/*.md` | 可参考系统开发型论文组织方式，算法作为模块单独成节即可 |

## 3. 系统总体定位

FreeFlow 当前实现的是一个桌面端 Web2.5 音乐系统，核心目标是解决链上音乐资源的发行和消费闭环：

1. 创作者在桌面端编辑音乐信息，上传音频、封面和 metadata 到 IPFS/Pinata。
2. 创作者通过钱包签名调用合约发布作品，生成链上 tokenId、分账合约和访问规则。
3. 后端保存发行状态、CID、合约地址、tokenId、交易哈希等索引数据。
4. 用户在桌面端搜索链上音乐资源，查看链上详情。
5. 付费作品通过合约购买访问权，公开作品可直接播放。
6. 用户可将已购买或公开作品加入“链上音乐库”，进行播放、评论和下载。

因此，系统名称在论文中可以表述为：

- 基于区块链与 IPFS 的链上音乐发行与播放系统
- 融合链上资源检索排序的 Web2.5 音乐系统
- 面向创作者的链上音乐资源管理与播放系统

## 4. 技术架构

### 4.1 桌面端架构

桌面端采用 Electron + React + TypeScript。

主进程负责：

- 应用启动、Profile 引导和主窗口管理。
- InversifyJS 依赖注入。
- SQLite/Sequelize 本地数据库。
- IPC 接口注册。
- 音频代理服务器。
- 本地曲库、链上音乐库、下载和缓存管理。

渲染进程负责：

- 主播放界面。
- 搜索结果页。
- FreeFlow 链上音乐详情页。
- Creators Workshop 创作者工作台。
- Profile/SIWE 登录引导。
- 评论、歌词、设置、主题、迷你播放器等界面。

桌面端的关键实现包括：

| 模块 | 代码位置 | 作用 |
| --- | --- | --- |
| 应用启动 | `apps/desktop/src/main/main.ts` | 初始化 Profile、数据库、代理服务器、IPC、窗口和托盘 |
| DI 容器 | `apps/desktop/src/main/di/di-container.ts` | 管理服务、仓库、Provider、窗口和日志依赖 |
| 音频代理 | `apps/desktop/src/main/core/AudioProxyServer.ts` | 提供 `/proxy`，支持 Range、上游直链、缓存、边播边缓存 |
| FreeFlow Provider | `apps/desktop/src/main/contentProvider/FreeFlow/FreeFlowProvider.ts` | 调用后端资源检索和解析接口，把链上资源映射为 TrackEntity |
| 链上音乐库 | `apps/desktop/src/renderer/core/freeflow/chainLibrary.ts` | 将链上资源转为本地 TrackEntity，并维护链上音乐库视图 |
| 链上详情页 | `FreeFlowTrackDetailView.tsx` | 查询链上访问状态、购买访问权、加入链上音乐库、播放 |
| 创作者工作台 | `apps/desktop/src/renderer/windows/MusicWorkshop` | 管理草稿、上传素材、生成 metadata、发布上链、查询访问权 |
| 下载模块 | `downloadHandlers.ts`、`IpfsDownloadService.ts` | 根据 CID 和 gateway 下载链上音频到本地 |

### 4.2 Web2.5 后端架构

后端采用 Express + TypeScript + Prisma + PostgreSQL，入口和路由分层比较清晰：

- `app.ts` 只负责中间件、路由和错误处理。
- `http/routes/index.ts` 统一挂载业务路由。
- `modules/*` 按业务模块划分 service、repository、routes、schemas、mapper。
- `security/session` 负责认证会话注入和访问控制。
- `infra/database/prisma.ts` 负责 Prisma 客户端。

后端模块如下：

| 模块 | API 前缀 | 主要功能 |
| --- | --- | --- |
| auth | `/api/v1/auth` | SIWE nonce、签名验证、会话查询、退出登录 |
| users | `/api/v1/users` | 当前用户资料、头像上传 |
| pinata | `/api/v1/storage/pinata` | 上传配置查询、服务端代理上传文件到 Pinata |
| releases | `/api/v1/releases` | 创作者作品草稿、阶段状态、metadata、链上信息持久化 |
| resources | `/api/v1/resources` | 已发布链上音乐资源检索、resourceKey 解析 |
| purchases | `/api/v1/purchases` | 购买交易记录 upsert |
| comments | `/api/v1/comments` | 评论列表和评论发布 |
| system | `/api/v1/system` | 健康检查等系统接口 |

### 4.3 合约架构

当前合约由三个核心合约组成：

| 合约 | 作用 |
| --- | --- |
| `MusicAccess1155` | 每个 tokenId 表示一首已发布作品，购买者持有不可转让的 ERC-1155 访问凭证 |
| `PlatformHub` | 统一发布作品、保存销售配置、处理购买、判断访问权、收取平台费 |
| `RoyaltySplitter` / `RoyaltySplitterFactory` | 为每首作品创建固定份额分账合约，创作者和协作者可按份额提取收益 |

核心链上流程：

1. `PlatformHub.publishTrack(...)` 创建分账合约。
2. `PlatformHub.publishTrack(...)` 调用 `MusicAccess1155.createTrack(...)` 创建作品 tokenId。
3. `PlatformHub` 保存价格、是否付费、是否激活销售。
4. 用户调用 `buyAccess(tokenId)` 支付价格。
5. 合约铸造 ERC-1155 访问凭证给购买者。
6. 创作者收益进入 splitter，平台费留在 hub。
7. `hasAccess(account, tokenId)` 判断用户是否可访问作品。

合约测试覆盖了付费作品发布和购买、公开作品访问、访问凭证不可转让、非创作者不能修改销售配置等核心逻辑。

注意：部分旧文档仍使用 `MusicAsset` 名称，但当前代码中的实际合约名是 `MusicAccess1155`。论文中建议统一以当前代码为准。

## 5. 已完成的核心功能

### 5.1 Profile 与 SIWE 登录

系统已实现基于钱包身份的 Profile 引导和 SIWE 登录：

- 桌面端 Profile 引导窗口连接钱包。
- 后端生成 nonce，并绑定请求地址和链 ID。
- 用户签名 SIWE message。
- 后端恢复签名地址，校验 nonce、domain、uri、chainId、issuedAt 等字段。
- 验证通过后创建 User、WalletIdentity 和 AuthSession。
- 桌面端保存会话 token，并在 Web2.5 API 请求中携带 Authorization。

这部分可以写成论文中的“用户身份认证模块”。

### 5.2 创作者工作台

Creators Workshop 是当前项目最重要的系统功能之一，已经具备完整工作流：

| 阶段 | 功能 |
| --- | --- |
| 项目管理 | 登录后创建、选择、删除发行项目，查看草稿、素材、metadata、链上状态 |
| 信息编辑 | 编辑标题、歌手、专辑、流派、描述、访问模式、试听秒数、价格、收益分账 |
| 元数据读取 | 读取本地音频 metadata，校验标题、歌手、专辑、歌词、封面等字段 |
| 素材上传 | 将音频和封面经后端上传到 Pinata，并记录 StorageObject |
| Metadata 构建 | 构建包含音频、封面、访问模式、链上合约、歌词和来源信息的 JSON |
| Metadata 上传 | 将 metadata JSON 上传到 Pinata，得到 metadata CID |
| 链上发布 | 调用 `PlatformHub.publishTrack(...)`，解析 `TrackPublished` 事件并回写 tokenId、splitter、交易哈希 |
| 访问查询 | 查询价格、是否开放、购买状态、ERC-1155 balance 和收益预览 |

这部分在论文中可以作为“链上音乐发布模块”详细展开，是系统实现章节的重点。

### 5.3 链上资源检索与排序

后端已实现 `/api/v1/resources/search` 和 `/api/v1/resources/resolve`。

检索对象不是外部平台歌曲，而是已经发布成功的 `CreatorRelease`。资源必须满足：

- `status = PUBLISHED`
- `chainId` 非空
- `musicAssetAddress` 非空
- `tokenId` 非空

资源标识格式：

```text
chain:<chainId>:<musicAccess1155Address>:<tokenId>
```

排序算法为 `chain_resource_rank_v1`，特点是：

- 支持标题、艺术家、专辑、流派、描述等文本字段。
- 支持 resourceKey、Token ID、合约地址、发布交易哈希、IPFS CID 等链上身份字段。
- 支持 Unicode 归一化、大小写归一、compact 文本、分词匹配。
- 支持 Levenshtein 模糊相似度。
- 支持新鲜度和热度信号。
- 返回 reasons 和 features，便于答辩展示可解释排序。

该模块可以作为论文中“算法内容”的主要落点，但写作时应强调它是系统中的检索排序模块，而不是独立算法研究。

### 5.4 链上音乐详情、购买与播放

桌面端已实现链上音乐详情页，支持：

- 根据 resourceKey 解析资源详情。
- 读取链上 sale config。
- 查询 `hasAccess` 和 ERC-1155 balance。
- 判断公开访问、已购买、创作者访问、需要购买等状态。
- 调用 `buyAccess(tokenId)` 购买访问权。
- 将购买交易回写后端 `purchases`。
- 购买后加入链上音乐库。
- 公开作品可直接加入链上音乐库。
- 可播放已拥有访问权的作品。

这部分可以写成“链上音乐消费模块”。

### 5.5 音频播放、代理与缓存

桌面端主进程内置 Express 音频代理服务器，提供 `/proxy` 接口，支持：

- 本地文件优先播放。
- 磁盘缓存命中时直接返回。
- 支持 HTTP Range，满足拖动进度条和分段播放。
- 非 Range 请求时边播边缓存。
- 上游直链缓存，避免反复请求 provider。
- 上游 403 时重新获取直链并重试。
- FreeFlow 链上资源通过 FreeFlowProvider 获取 IPFS gateway 音频地址。

该模块可以作为“播放器核心模块”或“音频代理与缓存模块”写入论文。

### 5.6 链上音乐库与下载

链上音乐库负责管理用户已经购买或公开可访问的链上资源：

- `TrackService.upsertChainLibraryTrack` 只接受 FreeFlow 资源。
- 未加入本地库的资源不能直接下载。
- 下载模块从 metadata、audioUrl 或 audioCid 中解析 CID。
- 使用 Pinata gateway 下载音频文件。
- 下载状态包括 `downloading`、`downloaded`、`failed`。
- 下载后将本地相对路径绑定到 TrackEntity。

### 5.7 评论与购买记录

评论模块：

- 后端按 releaseId 拉取评论。
- 登录用户可发表评论。
- 评论包含用户展示名、头像、钱包地址等作者信息。
- 桌面端 CommentView 已实现评论列表、刷新、发布、登录提示。

购买记录模块：

- 用户购买链上访问权后，桌面端把交易哈希、金额、链 ID、钱包地址、购买时间写入后端。
- 后端按 `releaseId + walletAddress + chainId` 和 `chainId + txHash` 做唯一约束，避免重复记录。

## 6. 数据模型

后端 Prisma schema 已形成较完整的数据模型：

| 数据表 | 作用 |
| --- | --- |
| `users` | 系统用户资料 |
| `wallet_identities` | 钱包地址和链 ID 绑定 |
| `siwe_nonces` | SIWE nonce、防重放 |
| `auth_sessions` | 登录会话 |
| `storage_objects` | IPFS/Pinata 文件对象，记录 CID、大小、MIME |
| `storage_uploads` | 文件上传行为，关联上传者和 Pinata ID |
| `creator_releases` | 创作者发行项目，是链上音乐资源索引核心表 |
| `purchases` | 购买交易投影 |
| `comments` | 评论数据 |

其中 `creator_releases` 是论文中最重要的数据表，保存了：

- 基本音乐信息：标题、歌手、专辑、流派、描述。
- 发布流程状态：DRAFT、ASSETS_PENDING、ASSETS_UPLOADED、METADATA_UPLOADED、PUBLISHING、PUBLISHED、FAILED、CANCELLED。
- 访问模式：open / purchase。
- IPFS 资源引用：audioStorageObjectId、coverStorageObjectId、metadataStorageObjectId。
- 链上信息：chainId、chainName、explorerUrl、musicAssetAddress、platformHubAddress、splitterAddress、publishTxHash、publishBlockNumber、tokenId。
- 扩展信息：metadataDocument、revenueSplits、statusMessage、latestError、publishedAt。

本地桌面端则通过 SQLite 保存 Track、Playlist、Session、HifiniThreadCache 等数据，其中 FreeFlow 资源被转为 `TrackEntity`，并通过 `freeflow` 字段保存链上索引信息。

## 7. 核心业务流程

### 7.1 创作者发布流程

```text
连接钱包 / SIWE 登录
  -> 创建发行草稿
  -> 编辑音乐信息和访问模式
  -> 选择音频和封面
  -> 读取并校验音频 metadata
  -> 上传音频和封面到 Pinata
  -> 构建 metadata JSON
  -> 上传 metadata 到 Pinata
  -> 调用 PlatformHub.publishTrack
  -> 解析 TrackPublished 事件
  -> 回写 tokenId、splitter、txHash、blockNumber
  -> 状态变为 PUBLISHED
```

### 7.2 用户检索与购买流程

```text
输入关键词
  -> 后端召回已发布 CreatorRelease
  -> chain_resource_rank_v1 排序
  -> 桌面端展示链上搜索结果
  -> 打开 FreeFlow 详情页
  -> 查询合约销售配置和访问状态
  -> 若公开作品，直接加入链上音乐库
  -> 若付费作品，调用 buyAccess
  -> 后端记录 purchase
  -> 加入链上音乐库
  -> 播放或下载
```

### 7.3 播放流程

```text
用户点击播放
  -> PlayerController 加入播放队列
  -> audio 元素请求本地 /proxy
  -> AudioProxyServer 查找本地文件
  -> 查找磁盘缓存
  -> 请求 FreeFlowProvider 获取 audioUrl
  -> 从 IPFS gateway 拉流
  -> 支持 Range / 边播边缓存
```

## 8. 项目规模

按当前代码统计，核心代码规模约为：

| 范围 | 规模 |
| --- | ---: |
| 桌面端、后端、合约核心代码文件数 | 约 358 个 |
| TypeScript / TSX / Solidity / JS 核心代码行数 | 约 31,500 行 |
| Creators Workshop 相关 TS/TSX | 约 2,730 行 |
| 后端业务模块 TS | 约 3,112 行 |
| Solidity 合约 | 约 566 行 |
| 后端核心数据表 | 9 张 |
| 后端业务模块 | 8 个 |
| 合约核心测试用例 | 4 个 |

这个规模足够支撑一篇系统开发型本科毕业论文。论文不需要夸大为大型平台，应强调“桌面端 + 后端 + 合约 + IPFS”的完整闭环和工程实现难度。

## 9. 当前不足与论文处理方式

| 问题 | 当前状态 | 论文处理建议 |
| --- | --- | --- |
| 旧多平台代码仍存在 | 代码仍保留多个 Provider | 论文中表述为历史遗留/可扩展内容，不作为核心贡献 |
| 音频资源未真正加密 | IPFS gateway URL 可被知道 CID 的人访问 | 在“系统安全与展望”中说明后续可加入加密音频、签名 URL、授权网关 |
| 排序算法还缺真实大规模数据 | 当前更偏工程检索排序 | 自建小规模测试集，做 Precision@10、MRR、响应时间即可 |
| 合约文档部分命名过时 | 文档中仍有 MusicAsset 字样 | 论文按当前代码统一为 MusicAccess1155 |
| 端到端自动化测试不足 | 合约有测试，桌面端/后端多为工程实现 | 论文补充功能测试表、API 测试表、核心流程截图和性能测试 |
| 链上访问和后端索引一致性 | 后端是链上结果投影，不是真相来源 | 论文中说明链上为权威状态，后端为索引和业务状态缓存 |

## 10. 论文中的系统创新点

建议将创新点写得克制、工程化：

1. 设计并实现了桌面端、Web2.5 后端、智能合约和 IPFS 存储协同的链上音乐发行播放系统。
2. 设计了面向创作者的音乐发布工作台，实现素材上传、metadata 生成、链上发布、收益分账和状态回写的一体化流程。
3. 设计了基于 ERC-1155 不可转让访问凭证的音乐访问控制方案，使购买行为和播放权限能够被链上验证。
4. 设计并实现了链上音乐资源检索与排序算法，支持文本字段和链上身份字段的统一检索，并返回可解释排序结果。
5. 设计了面向桌面播放场景的音频代理与缓存机制，支持 IPFS gateway 音频资源的 Range 播放、边播边缓存和本地下载。

## 11. 推荐论文主线

论文主线建议是：

```text
绪论
  -> 关键技术
  -> 需求分析
  -> 总体架构与数据库/合约设计
  -> 核心模块实现
  -> 链上资源检索与排序模块
  -> 系统测试与效果分析
  -> 总结与展望
```

其中“链上资源检索与排序模块”承担算法内容，但篇幅不宜超过系统实现和系统设计。这样既符合 FreeFlow 当前项目实际，也能应对导师和答辩老师对算法内容的要求。
