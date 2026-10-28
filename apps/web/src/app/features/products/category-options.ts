import type { Category } from '../../shared/models/models';

export interface CategoryOption {
  id: number;
  label: string;
  depth: number;
}

/** Flattens a category list into roots followed by their children, for indented <select> options. */
export function buildCategoryOptions(categories: Category[]): CategoryOption[] {
  const roots = categories
    .filter((category) => category.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'));
  const childrenOf = (parentId: number) =>
    categories
      .filter((category) => category.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'));

  const options: CategoryOption[] = [];
  for (const root of roots) {
    options.push({ id: root.id, label: root.name, depth: 0 });
    for (const child of childrenOf(root.id)) {
      options.push({ id: child.id, label: child.name, depth: 1 });
    }
  }
  return options;
}
