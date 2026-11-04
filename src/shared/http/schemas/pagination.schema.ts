import { z } from 'zod';

const pageSchema = z.number().int().min(1).max(2147483647);
const limitSchema = z.number().int().min(1).max(100);
const countSchema = z.number().int().min(0);

export const paginationSchema = z.strictObject({
  page: z.string().pipe(z.coerce.number<string>().pipe(pageSchema)).default(1),
  limit: z.string().pipe(z.coerce.number<string>().pipe(limitSchema)).default(20),
});

export const paginationMetaSchema = z.object({
  page: pageSchema, limit: limitSchema, total: countSchema, totalPages: countSchema,
});
