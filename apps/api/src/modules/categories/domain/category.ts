export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
}

export interface CategoryWithCount extends Category {
  productCount: number;
}

export const MAX_CATEGORY_DEPTH = 2;
