export * from './chair';
export * from './nightstand';
export * from './table';
export * from './product';

export interface VariationImage {
  id: string;
  allHexes: { hex: string, name: string }[];
  images: string[];           // оригінали
  imagesCompressed?: string[]; // стиснені (для карток); fallback на images, якщо немає
}

export interface Specification {
  name: string;
  value: string;
}

export interface ProductDetails {
  id: string;
  name: string;
  price: number;
  href: string;
  variations: VariationImage[];
  pdfLink?: string;
}