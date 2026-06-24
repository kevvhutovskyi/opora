import { CartItem } from "@/store/cartStore";
import { Product } from "../../products";

type Order = {
  products: Product[];
}

export type ClientRequest = {
  name: string;
  email?: string;
  phoneNumber?: string;
  orderNumber?: string; // Номер заявки, згенерований на клієнті
  orders: CartItem[];
  // Спосіб доставки, обраний у формі
  deliveryMethod?: 'novaposhta' | 'auto' | 'private';
  // Доставка «Нова Пошта» (опційно) — зберігається в заявці
  deliveryCity?: string;
  deliveryWarehouse?: string;
}