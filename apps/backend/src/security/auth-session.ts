/**
 * 当前系统对“已认证会话”的最小公开视图。
 * 这里刻意只暴露路由和中间件真正需要的字段，避免数据库模型直接泄漏到 HTTP 层。
 */
export type AuthSession = {
  userId: string;
  walletIdentityId: string;
  address: string;
  chainId: number;
  domain: string;
  uri: string;
  sessionId: string;
  issuedAt: string;
  verifiedAt: string;
  expiresAt: string;
};
