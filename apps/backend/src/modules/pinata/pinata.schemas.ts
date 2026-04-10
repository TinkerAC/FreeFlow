import { z } from 'zod';

/**
 * Pinata 上传接口允许的表单字段。
 */
export const PinataFieldSchema = z.object({
  name: z.string().min(1).optional(),
  keyvalues: z.string().optional(),
});
