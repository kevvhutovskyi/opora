import { Product } from "./product";

export type ChairProduct = Product & {
    legsColorName: string;
    legsColorHex: string;
    sitColorName: string;
    sitColorHex: string;
};