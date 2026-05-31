export type ProductType = 'Chair' | 'Table' | 'Nightstand' | 'All';

export type SortOption = 'default' | 'price_asc' | 'price_desc' | 'newest';

export interface FilterParams {
  type: ProductType;
  seatColor?: string;
  legColor?: string;
  tableColor?: string;
  sort?: SortOption;
}
