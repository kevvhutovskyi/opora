// Категорія = українська назва з поля «Каталог» (напр. "Стільці", "Столи").
// "Всі" — службове значення «без фільтра за категорією». Динамічна, тож просто string.
export type ProductType = string;

export type SortOption = 'default' | 'price_asc' | 'price_desc' | 'newest';

export interface FilterParams {
  type: ProductType;
  seatColor?: string;
  legColor?: string;
  tableColor?: string;
  sort?: SortOption;
}
