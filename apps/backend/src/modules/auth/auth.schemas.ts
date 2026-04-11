import { z } from 'zod';

/**
 * 认证模块请求体验证规则。
 * 路由进入 service 之前校验输入，减少业务层防御性代码。
 */
export const IssueNonceSchema = z.object({
  address: z.string().optional(),
  chainId: z.number().int().positive().optional(),
});

export const VerifySiweSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});
