export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

export const MAX_PAGE_SIZE = 100;

export function offsetOf({ page, pageSize }: PageRequest): number {
  return (page - 1) * pageSize;
}

export function toPage<T>(items: T[], total: number, request: PageRequest): Page<T> {
  return { items, total, page: request.page, pageSize: request.pageSize };
}
