import crypto from 'node:crypto';

/**
 * 生成面向客户端暴露的不透明令牌。
 * 业务代码只关心“令牌可唯一标识会话/nonce”，不关心底层随机源实现。
 */
export function createOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * 为每个请求生成稳定且便于排查日志的追踪 ID。
 */
export function createRequestId() {
  return crypto.randomUUID();
}

/**
 * 敏感令牌统一做哈希后再入库，避免数据库直接暴露原始凭证。
 */
export function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
