import { CartItem } from "@/store/cartStore";
import { Product } from "../../products";

type Order = {
  products: Product[];
}

export type ClientRequest = {
  name: string;
  email?: string;
  phoneNumber?: string;
  orders: CartItem[];
}