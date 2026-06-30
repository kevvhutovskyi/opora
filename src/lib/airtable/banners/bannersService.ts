import { airtableBase } from "..";
import { BANNER_TYPES, FIELDS, TABLES } from "../schema";

// Зображення банерів керуються через адмін-панель (Airtable) і зберігаються в Cloudflare R2.
// Якщо таблиця «Банери» ще не створена або порожня — повертаємо порожні дані,
// а компоненти показують мок-зображення (fallback). Тому всі запити в try/catch.

/** Активні слайди головного слайдера, відсортовані за полем «Порядок». */
export async function getSliderImages(): Promise<string[]> {
  try {
    const records = await airtableBase(TABLES.banners)
      .select({
        filterByFormula: `AND({${FIELDS.banner.type}} = '${BANNER_TYPES.slider}', {${FIELDS.banner.active}})`,
        sort: [{ field: FIELDS.banner.order, direction: "asc" }],
      })
      .all();

    return records
      .map((record) => String(record.get(FIELDS.banner.image) || ""))
      .filter(Boolean);
  } catch (error) {
    console.error("getSliderImages error:", error);
    return [];
  }
}

export interface CategoryBanner {
  title: string;
  image: string;
  colSpan: number; // 1–4, ширина плитки в сітці на головній
}

/** Категорійні плитки головної — активні записи типу «Категорія», відсортовані за «Порядок». */
export async function getCategories(): Promise<CategoryBanner[]> {
  try {
    const records = await airtableBase(TABLES.banners)
      .select({
        filterByFormula: `AND({${FIELDS.banner.type}} = '${BANNER_TYPES.category}', {${FIELDS.banner.active}})`,
        sort: [{ field: FIELDS.banner.order, direction: "asc" }],
      })
      .all();

    return records
      .map((record) => ({
        title: String(record.get(FIELDS.banner.name) || ""),
        image: String(record.get(FIELDS.banner.image) || ""),
        colSpan: Math.min(4, Math.max(1, Number(record.get(FIELDS.banner.colSpan)) || 1)),
      }))
      .filter((c) => c.title);
  } catch (error) {
    console.error("getCategories error:", error);
    return [];
  }
}

/** Зображення банера каталогу (один запис типу «Каталог»). */
export async function getCatalogHeroImage(): Promise<string | null> {
  try {
    const records = await airtableBase(TABLES.banners)
      .select({
        filterByFormula: `{${FIELDS.banner.type}} = '${BANNER_TYPES.catalog}'`,
        maxRecords: 1,
      })
      .all();

    const url = records[0]?.get(FIELDS.banner.image);
    return url ? String(url) : null;
  } catch (error) {
    console.error("getCatalogHeroImage error:", error);
    return null;
  }
}
