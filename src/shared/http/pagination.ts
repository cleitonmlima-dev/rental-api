import type { PaginationDto } from './dtos/pagination.dto';

export function paginate<T>(data: T[], total: number, query: PaginationDto) {
  return { data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
