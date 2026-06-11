import { cache } from "react";
import { FieldSet, Record as AirtableRecord } from "airtable";
import { GeneralProduct, ProductDetails } from "./types";
import { airtableBase } from "..";
import {
  tableProducts,
  tableVariants,
  tableOptions,
  tableProductSpecs,
  tableSpecs,
} from "../tables";
import { CATEGORY_TABLES, FIELDS, TABLES } from "../schema";
import { fetchRecordsByIds, indexById, parseImageUrls } from "../helpers";

type ProductType = 'Chair' | 'Table' | 'Nightstand';

const getAdditionalProductsFields = (productType: ProductType, record: AirtableRecord<FieldSet>) => {
  switch (productType) {
    case 'Chair':
      return {
        legsColorName: record.get(FIELDS.product.legsColorName) as string || "",
        legsColorHex: record.get(FIELDS.product.legsColorHex) as string || "",
        sitColorName: record.get(FIELDS.product.seatColorName) as string || "",
        sitColorHex: record.get(FIELDS.product.seatColorHex) as string || "",
      };
    case 'Table':
    case 'Nightstand':
    default:
      return {};
  }
};

export async function getProducts(type: ProductType): Promise<GeneralProduct[]> {
  const records = await airtableBase(CATEGORY_TABLES[type]).select().all();

  return records.map((record) => ({
    id: record.id,
    description: String(record.get(FIELDS.product.description) || ""),
    manufacturer: String(record.get(FIELDS.product.manufacturer) || ""),
    model: String(record.get(FIELDS.product.model) || ""),
    inStock: Boolean(record.get(FIELDS.product.inStock) || false),
    price: Number(record.get(FIELDS.product.price) || 0),
    discountPercentage: Number(record.get(FIELDS.product.discountPercent) || 0) * 100,
    discountPrice: Number(record.get(FIELDS.product.discountPrice) || 0),
    discountedPrice: Number(record.get(FIELDS.product.discountedPrice) || 0),
    ...getAdditionalProductsFields(type, record),
  }) as GeneralProduct);
}

export async function getTopProducts(): Promise<ProductDetails[]> {
  const topRecords = await airtableBase(TABLES.topProducts).select().all();

  const productIds = topRecords
    .map((record) => (record.get(FIELDS.topProduct.products) as string[])?.[0])
    .filter(Boolean) as string[];

  return getMultipleProductsWithVariations(productIds);
}

/**
 * Дістає кілька товарів з їхніми варіаціями та опціями (для головної / списків).
 * Повертає легку форму ProductDetails (id, назва, ціна, варіації з кольорами).
 */
export async function getMultipleProductsWithVariations(productIds: string[]): Promise<ProductDetails[]> {
  const productsData = await fetchRecordsByIds(tableProducts, productIds);
  if (productsData.length === 0) return [];

  const variationIds = productsData.flatMap((p) => (p.get(FIELDS.product.variants) as string[]) || []);
  const variationsById = indexById(await fetchRecordsByIds(tableVariants, variationIds));

  const optionIds = [...variationsById.values()].flatMap((v) => (v.get(FIELDS.variant.options) as string[]) || []);
  const optionsById = indexById(await fetchRecordsByIds(tableOptions, optionIds));

  return productsData.map((product) => {
    const pVarIds = (product.get(FIELDS.product.variants) as string[]) || [];

    const variations = pVarIds
      .map((id) => variationsById.get(id))
      .filter(Boolean)
      .map((variation) => {
        const linkedOptions = ((variation!.get(FIELDS.variant.options) as string[]) || [])
          .map((id) => optionsById.get(id))
          .filter(Boolean);

        return {
          id: variation!.id,
          colorName:
            linkedOptions.map((o) => String(o!.get(FIELDS.option.name) || "")).join(" / ") || "Unknown",
          allHexes: linkedOptions.map((o) => ({
            hex: String(o!.get(FIELDS.option.value) || ""),
            name: String(o!.get(FIELDS.option.name) || ""),
          })),
          images: parseImageUrls(variation!.get(FIELDS.variant.photos)),
          price: String(variation!.get(FIELDS.variant.price) || ""),
        };
      });

    return {
      id: product.id,
      name: String(product.get(FIELDS.product.model) || "Без назви"),
      href: `/catalog/${product.id}`,
      price: Number(product.get(FIELDS.product.minPrice) || 0),
      variations,
    };
  });
}

// Повна форма товару для сторінки деталей (/catalog/[slug]).
export interface ProductDetailOption {
  name: string;
  value: string;
}

export interface ProductDetailVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  inStock: boolean;
  images: string[];
  options: ProductDetailOption[];
}

export interface ProductDetail {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  catalog: string;
  description: string;
  assemblyVideoUrl: string;
  assemblyPdfUrl: string;
  minPrice: number;
  specifications: Array<{ name: string; value: string }>;
  variants: ProductDetailVariant[];
}

/**
 * Дістає один товар з варіаціями, опціями та характеристиками.
 * Server-only (читає Airtable напряму). Повертає null, якщо товар не знайдено.
 * Використовується і SSR-сторінкою товару, і роутом /api/products/[id].
 */
export const getProductById = cache(async (productId: string): Promise<ProductDetail | null> => {
  const productRecord = await tableProducts.find(productId).catch(() => null);
  if (!productRecord) return null;

  const variantIds = (productRecord.get(FIELDS.product.variants) as string[]) || [];
  const variantsRecords = await fetchRecordsByIds(tableVariants, variantIds);

  const optionIds = variantsRecords.flatMap((v) => (v.get(FIELDS.variant.options) as string[]) || []);
  const optionsById = indexById(await fetchRecordsByIds(tableOptions, optionIds));

  const variants: ProductDetailVariant[] = variantsRecords.map((v) => ({
    id: v.id,
    name: v.get(FIELDS.variant.name) as string,
    sku: v.get(FIELDS.variant.sku) as string,
    price: (v.get(FIELDS.variant.price) as number) || 0,
    inStock: v.get(FIELDS.variant.inStock) as boolean,
    images: parseImageUrls(v.get(FIELDS.variant.photos)),
    options: ((v.get(FIELDS.variant.options) as string[]) || [])
      .map((id) => optionsById.get(id))
      .filter(Boolean)
      .map((o) => ({
        name: o!.get(FIELDS.option.name) as string,
        value: o!.get(FIELDS.option.value) as string,
      })),
  }));

  return {
    id: productRecord.id,
    name: productRecord.get(FIELDS.product.name) as string,
    model: productRecord.get(FIELDS.product.model) as string,
    manufacturer: productRecord.get(FIELDS.product.manufacturer) as string,
    catalog: productRecord.get(FIELDS.product.catalog) as string,
    description: productRecord.get(FIELDS.product.description) as string,
    assemblyVideoUrl: productRecord.get(FIELDS.product.assemblyVideo) as string,
    assemblyPdfUrl: productRecord.get(FIELDS.product.assemblyPdf) as string,
    minPrice: (productRecord.get(FIELDS.product.minPrice) as number) || 0,
    specifications: await getProductSpecifications(productRecord),
    variants,
  };
});

/** Join через "Товари/Характеристики" → "Характеристики", повертає [{ name, value }]. */
async function getProductSpecifications(
  productRecord: AirtableRecord<FieldSet>
): Promise<Array<{ name: string; value: string }>> {
  const productSpecIds = (productRecord.get(FIELDS.product.specs) as string[]) || [];
  if (productSpecIds.length === 0) return [];

  const specsRecords = await fetchRecordsByIds(tableProductSpecs, productSpecIds);

  const charIds = specsRecords.flatMap((spec) => (spec.get(FIELDS.productSpec.spec) as string[]) || []);
  const charsById = indexById(await fetchRecordsByIds(tableSpecs, charIds));

  return specsRecords.map((spec) => {
    const charId = (spec.get(FIELDS.productSpec.spec) as string[])?.[0];
    const charRecord = charId ? charsById.get(charId) : undefined;
    return {
      name: charRecord ? String(charRecord.get(FIELDS.spec.name) || "Невідомо") : "Невідомо",
      value: String(spec.get(FIELDS.productSpec.value) || ""),
    };
  });
}
