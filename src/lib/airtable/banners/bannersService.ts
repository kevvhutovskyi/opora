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

/** Зображення категорій — повертає map { назваКатегорії: url }. */
export async function getCategoryImages(): Promise<Record<string, string>> {
  try {
    const records = await airtableBase(TABLES.banners)
      .select({
        filterByFormula: `{${FIELDS.banner.type}} = '${BANNER_TYPES.category}'`,
      })
      .all();

    return Object.fromEntries(
      records
        .map((record) => [
          String(record.get(FIELDS.banner.name) || ""),
          String(record.get(FIELDS.banner.image) || ""),
        ])
        .filter(([name, url]) => name && url)
    );
  } catch (error) {
    console.error("getCategoryImages error:", error);
    return {};
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
