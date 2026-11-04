import { z } from 'zod';
import { uuidSchema } from './primitives.schema';

export const apiErrorSchema = z.object({
  status: z.number().int(),
  code: z.string(),
  message: z.string(),
  details: z.array(z.object({ field: z.string(), reasons: z.array(z.string()) })).optional(),
});

export const apiErrorResponseSchema = apiErrorSchema.omit({ status: true }).extend({
  statusCode: apiErrorSchema.shape.status,
  path: z.string(),
  requestId: uuidSchema,
  traceId: z.string().optional(),
});
