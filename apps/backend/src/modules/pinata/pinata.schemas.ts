import { z } from 'zod';

export const PinataFieldSchema = z.object({
  name: z.string().min(1).optional(),
  keyvalues: z.string().optional(),
});
