COMMENT ON TYPE "CreatorReleaseStatus" IS '发行工作流状态。';
COMMENT ON TYPE "ReleaseAccessModel" IS '发行访问模式：open 免费访问，purchase 购买访问。';
COMMENT ON TYPE "StorageNetwork" IS 'Pinata 文件网络可见性。';
COMMENT ON TYPE "PurchaseStatus" IS '购买交易确认状态。';

COMMENT ON TABLE "users" IS '应用用户。';
COMMENT ON TABLE "wallet_identities" IS '已验证钱包身份。';
COMMENT ON TABLE "siwe_nonces" IS 'SIWE 一次性 nonce（仅存哈希）。';
COMMENT ON TABLE "auth_sessions" IS 'SIWE 验签成功后的服务端会话。';
COMMENT ON TABLE "storage_objects" IS 'IPFS 内容对象（CID 级）。';
COMMENT ON TABLE "storage_uploads" IS '第三方存储服务上的一次上传行为。';
COMMENT ON TABLE "creator_releases" IS '创作者发行草稿与发布流程记录。';
COMMENT ON TABLE "purchases" IS '发行购买交易投影记录，真实拥有状态以链上 ERC-1155 balance 为准。';
COMMENT ON TABLE "comments" IS '直接挂载到 CreatorRelease 的单层评论。';

COMMENT ON COLUMN "creator_releases"."musicAssetAddress" IS 'MusicAccess1155 合约地址。';
COMMENT ON COLUMN "creator_releases"."revenueSplits" IS '创作者侧收益分账配置。';
COMMENT ON TABLE "royalty_claims" IS '分账合约收益领取记录，由客户端链上交易确认后回写。';
COMMENT ON COLUMN "royalty_claims"."splitterAddress" IS 'RoyaltySplitter 分账合约地址。';
COMMENT ON COLUMN "royalty_claims"."amountWei" IS '本次领取的原生代币数量，单位 wei。';
COMMENT ON COLUMN "comments"."releaseId" IS '被评论的发行 ID。';
