# FreeFlow 链上音乐资源检索与排序算法设计

本文档对应当前 FreeFlow 的链上音乐版本：桌面端通过 `/api/v1/resources/search`
检索后端索引的已发布 `CreatorRelease`，资源本体由链上标识、IPFS CID、Pinata
网关地址和发布元数据共同描述。

## 目标

链上音乐检索要解决的问题不是“多平台聚合”，而是：

1. 用户输入歌曲名、艺术家、专辑、流派时，能找到相关链上音乐资源。
2. 用户输入 `resourceKey`、合约地址、Token ID、交易哈希或 IPFS CID 时，能直接定位链上资产。
3. 当关键词有大小写、全角半角、空格或轻微拼写差异时，仍能给出可解释的排序结果。
4. 排序结果能说明为什么排在前面，方便调试和答辩展示。

当前实现的算法名：

```text
chain_resource_rank_v1
```

对应代码：

- `apps/backend/src/modules/resources/resource.repository.ts`
- `apps/backend/src/modules/resources/resource.ranking.ts`
- `apps/backend/src/modules/resources/resource.service.ts`

## 需要采集的数据

### 已经可直接使用的数据

这些字段已经存在于当前链上发布和后端索引流程中：

| 数据 | 来源 | 用途 |
| --- | --- | --- |
| `title` | 创作者发布元数据 | 标题匹配、相似度计算 |
| `artistName` | 创作者发布元数据 | 艺术家匹配、用户偏好扩展 |
| `albumName` | 创作者发布元数据 | 专辑匹配 |
| `genreLabel` | 创作者发布元数据 | 流派匹配、推荐扩展 |
| `description` | 创作者发布元数据 | 长文本辅助召回 |
| `chainId` | 链上发布流程 | 链网络识别 |
| `musicAssetAddress` | 链上发布流程 | MusicAccess1155 合约定位 |
| `platformHubAddress` | 链上发布流程 | 平台合约定位 |
| `tokenId` | 链上铸造结果 | Token 精确定位 |
| `publishTxHash` | 链上交易结果 | 发布交易定位 |
| `audioCid` / `coverCid` / `metadataCid` | IPFS/Pinata 上传 | 内容寻址匹配 |
| `publishedAt` / `updatedAt` | 后端状态流转 | 新鲜度排序 |
| `comments` 数量 | 评论模块 | 热度信号 |
| `purchases` 数量 | 购买模块 | 购买热度信号 |

### 建议继续采集的数据

这些数据不是第一版算法必须项，但可以支撑论文中的“可演进推荐/排序系统”：

| 事件 | 字段 | 用途 |
| --- | --- | --- |
| `search_submitted` | query, normalizedQuery, user/session, timestamp | 查询热度、常见意图分析 |
| `search_result_clicked` | query, resourceKey, rank, score, timestamp | 点击率排序、MRR/nDCG 评估 |
| `track_play_started` | resourceKey, user/session, timestamp | 播放兴趣信号 |
| `track_play_completed` | resourceKey, playedSeconds, duration | 强正反馈 |
| `track_skipped` | resourceKey, playedSeconds | 弱负反馈 |
| `track_added_to_library` | resourceKey, playlistId | 收藏偏好 |
| `track_downloaded` | resourceKey, audioCid, gateway | 离线意图和 CID 热度 |
| `purchase_confirmed` | resourceKey, wallet, chainId, txHash | 付费热度和创作者偏好 |
| `comment_created` | resourceKey, user, timestamp | 互动热度 |
| `gateway_request_finished` | cid, gateway, latency, status | IPFS 网关选择优化 |

隐私原则：

- 钱包地址只用于所有权、购买和会话校验；排序优先使用聚合计数。
- 原始行为日志可以短期保存，长期保留按天聚合后的统计。
- 桌面端本地播放行为默认只保存在本地，除非用户明确同步。

## 检索流程

### 1. 查询归一化

输入 query 会先做统一处理：

```text
normalize(query):
  1. Unicode NFKC 归一化，兼容全角/半角字符
  2. 转小写
  3. 去除首尾空格，合并连续空格
  4. 按非字母数字字符分词
  5. 生成 compact query，用于忽略空格和符号的比较
```

同时识别特殊链上意图：

```text
address     = 0x 开头的 40 位 EVM 地址
cid         = bafy... / bafk... / Qm... IPFS CID
tokenId     = 纯数字输入
resourceKey = chain:<chainId>:<contractAddress>:<tokenId>
```

### 2. 候选召回

后端只检索已发布的链上音乐：

```text
status = PUBLISHED
chainId != null
musicAssetAddress != null
tokenId != null
```

候选来源包括：

1. 标题、艺术家、专辑、流派、描述的 `contains` 召回。
2. Token ID、合约地址、平台合约地址、发布交易哈希召回。
3. 音频 CID、封面 CID、元数据 CID 召回。
4. 完整 `resourceKey` 解析后的精确召回。
5. 当 SQL 召回不足以覆盖拼写差异时，额外取一小批最近发布资源作为模糊匹配候选。

当前候选上限：

```text
candidateLimit = min(500, max(80, limit * 8))
recentFallback = min(200, candidateLimit)
```

### 3. 特征评分

每个候选资源都会计算一组特征分：

```text
score =
  identity_score +
  text_match_score +
  fuzzy_similarity_score +
  freshness_score +
  popularity_score
```

身份类特征：

| 特征 | 分数 |
| --- | ---: |
| `resourceKey` 精确匹配 | 100 |
| Token ID 精确匹配 | 80 |
| 音乐合约地址精确匹配 | 70 |
| IPFS CID 精确匹配 | 65 |
| 平台合约地址精确匹配 | 55 |
| 发布交易哈希匹配 | 45 |
| `resourceKey` 包含关键词 | 45 |
| IPFS CID 包含关键词 | 30 |
| Token ID 前缀匹配 | 25 |

文本类特征：

| 字段 | 精确 | 前缀 | 包含 | 分词命中 |
| --- | ---: | ---: | ---: | ---: |
| 标题 | 45 | 30 | 20 | 14 |
| 艺术家 | 34 | 24 | 16 | 12 |
| 专辑 | 24 | 16 | 10 | 8 |
| 流派 | 20 | 14 | 8 | 6 |
| 描述 | 10 | 8 | 6 | 4 |

模糊相似度：

```text
similarity = 1 - levenshtein(queryCompact, fieldCompact) / maxLength
```

当相似度超过阈值时加入评分：

```text
threshold = query length <= 4 ? 0.78 : 0.68
fuzzy_similarity_score = 16 * similarity
```

新鲜度分：

```text
freshness = 0.5 ^ (ageDays / 45)
freshness_score = 8 * freshness
```

热度分：

```text
weightedPopularity = commentCount + purchaseCount * 3
popularity = min(1, ln(1 + weightedPopularity) / ln(31))
popularity_score = 7 * popularity
```

购买比评论权重大，因为购买代表更强的链上确认行为。

### 4. 过滤与排序

如果 query 非空，只保留至少命中一个查询相关特征的资源，避免纯粹因为“最近发布”而返回无关结果。

排序规则：

```text
1. score 降序
2. publishedAt / updatedAt 降序
```

返回结果会包含可解释排序信息：

```json
{
  "resourceKey": "chain:11155111:0x...:1",
  "title": "Track Title",
  "rank": {
    "algorithm": "chain_resource_rank_v1",
    "score": 58.372,
    "reasons": ["标题精确匹配", "最近发布优先"],
    "features": {
      "text.title.exact": 45,
      "quality.freshness": 7.8,
      "quality.popularity": 5.572
    }
  }
}
```

## 算法复杂度

设候选数量为 `N`，平均文本长度为 `L`：

- SQL 候选召回依赖数据库索引和 `contains` 查询。
- 评分阶段遍历候选，复杂度约为 `O(N * L^2)`，其中 `L^2` 来自 Levenshtein；当前实现会把相似度比较文本截断到 96 个字符，避免长描述拖慢搜索。
- 由于候选上限被限制在 500，实际运行成本可控。
- 排序复杂度为 `O(N log N)`。

后续如果资源量扩大，可以把模糊相似度放到 PostgreSQL full-text search、trigram
index 或 pgvector 中。

## 评估指标

离线评估：

- `MRR`：目标资源首次出现位置。
- `nDCG@10`：前 10 个结果的相关性质量。
- `Precision@10`：前 10 个结果相关比例。
- `Zero Result Rate`：无结果查询比例。

在线评估：

- 搜索后播放率。
- 搜索结果点击率。
- 搜索后购买率。
- 搜索后评论率。
- 平均首个有效结果排名。

## 后续扩展

1. 加 `search_events` 和 `search_result_clicked` 表，用点击反馈微调权重。
2. 为 `CreatorRelease` 增加 PostgreSQL full-text index，提高标题/描述召回。
3. 对歌词、描述、标题生成 embedding，用 pgvector 做语义检索。
4. 加创作者偏好分：用户购买或评论过某创作者作品时，提高同创作者资源排序。
5. 加多样性重排：搜索结果页避免同一创作者或同一流派连续占满列表。
