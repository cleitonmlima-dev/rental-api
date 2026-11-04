import type { z } from 'zod';
import type { paginationSchema } from '../schemas/pagination.schema';

export type PaginationDto = z.output<typeof paginationSchema>;
