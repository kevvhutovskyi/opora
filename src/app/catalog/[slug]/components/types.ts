// Спільні типи для сторінки товару

export interface Option {
  name: string;
  value: string; // Hex колір (наприклад, 'FF0000')
}

export interface Variant {
  id: string;
  name: string;
  sku: string;
  price: number;
  inStock: boolean;
  images: string[];           // оригінали — для повноекранної галереї
  imagesCompressed: string[]; // стиснені — для сторінки
  options: Option[];
}

export interface Specification {
  name: string;
  value: string;
}

export interface Product {
  id: string;
  model: string;
  name: string;
  manufacturer: string;
  catalog: string;
  description: string;
  assemblyVideoUrl: string;
  assemblyPdfUrl: string;
  minPrice: number;
  specifications: Specification[];
  variants: Variant[];
}

export const hexColor = (value: string) => (value.startsWith('#') ? value : `#${value}`);
