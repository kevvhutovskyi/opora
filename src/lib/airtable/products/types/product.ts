import { ChairProduct } from "./chair";
import { NightstandProduct } from "./nightstand";
import { TableProduct } from "./table";

export type Product = {
  id: string;
  model: string;
  manufacturer: string;
  description: string;
  price: number;
  discountedPrice: number;
  discountPercentage: number;
  discountPrice: number;
  inStock: boolean;
}

export type GeneralProduct = Product & Partial<ChairProduct & TableProduct & NightstandProduct>;