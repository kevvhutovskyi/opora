import { unstable_cache } from "next/cache";
import { tableOptions, tableProducts, tableProductSpecs, tableSpecs, tableVariants } from "../tables";
import { fetchRecordsByIds, indexById, parseImageUrls } from "../helpers";
import { CATEGORY_TABLES, FIELDS } from "../schema";
import { ProductType } from "./types";
import { VariationImage } from "../products";

export interface CatalogProductDetails {
  id: string;
  name: string;
  price: number;
  href: string;
  variations: VariationImage[];
  allOptionNames?: string[];
}

export interface FilterParamsWithArrays {
  type: ProductType;
  sort?: string;
  seatColors?: string[];
  legColors?: string[];
  tableColors?: string[];
  specFilters?: Record<string, string[]>; // specName → selected values
}

export interface SpecFilterGroup {
  specName: string;
  values: string[];
}

async function fetchFilteredCatalog(
  params: FilterParamsWithArrays
): Promise<CatalogProductDetails[]> {
  const {
    type,
    sort = "default",
    seatColors = [],
    legColors = [],
    tableColors = [],
    specFilters = {},
  } = params;

  // 1. Базова вибірка товарів за категорією
  const productsData = await tableProducts
    .select(
      type && type !== "All"
        ? { filterByFormula: `{${FIELDS.product.catalog}}='${CATEGORY_TABLES[type]}'` }
        : {}
    )
    .all();

  if (productsData.length === 0) return [];

  // 2. Підтягуємо всі варіації та опції одним проходом, індексуємо за id
  const variationIds = productsData.flatMap((p) => (p.get(FIELDS.product.variants) as string[]) || []);
  const variationsById = indexById(await fetchRecordsByIds(tableVariants, variationIds));

  const optionIds = [...variationsById.values()].flatMap(
    (v) => (v.get(FIELDS.variant.options) as string[]) || []
  );
  const optionsById = indexById(await fetchRecordsByIds(tableOptions, optionIds));

  // 2b. Якщо є фільтри за характеристиками — підвантажуємо ProductSpecs + Specs
  const hasSpecFilters = Object.keys(specFilters).some((k) => specFilters[k].length > 0);
  let productSpecMap = new Map<string, Map<string, string>>(); // productId → (specName → value)

  if (hasSpecFilters) {
    const allProdSpecIds = productsData.flatMap(
      (p) => (p.get(FIELDS.product.specs) as string[]) || []
    );
    const prodSpecRecords = await fetchRecordsByIds(tableProductSpecs, allProdSpecIds);

    const specIds = prodSpecRecords.flatMap(
      (ps) => (ps.get(FIELDS.productSpec.spec) as string[]) || []
    );
    const specsById = indexById(await fetchRecordsByIds(tableSpecs, specIds));

    // Build map: productId → (specName → value)
    // ProductSpec has a linked "Товар" field pointing back to the product.
    // We use product.specs array to know which prodSpecRecords belong to each product.
    const prodSpecById = indexById(prodSpecRecords);

    for (const product of productsData) {
      const prodSpecIds = (product.get(FIELDS.product.specs) as string[]) || [];
      const specValueMap = new Map<string, string>();

      for (const psId of prodSpecIds) {
        const ps = prodSpecById.get(psId);
        if (!ps) continue;
        const specId = ((ps.get(FIELDS.productSpec.spec) as string[]) || [])[0];
        if (!specId) continue;
        const spec = specsById.get(specId);
        if (!spec) continue;
        const name = String(spec.get(FIELDS.spec.name) || "");
        const value = String(ps.get(FIELDS.productSpec.value) || "");
        if (name) specValueMap.set(name, value);
      }

      productSpecMap.set(product.id, specValueMap);
    }
  }

  // 3. Збираємо повні товари; пропускаємо ті, що без варіацій
  let catalog = productsData
    .map((product) => {
      const productVariationIds = (product.get(FIELDS.product.variants) as string[]) || [];
      const allOptionNames = new Set<string>();

      const variations: VariationImage[] = productVariationIds
        .map((id) => variationsById.get(id))
        .filter(Boolean)
        .map((variation) => {
          const linkedOptions = ((variation!.get(FIELDS.variant.options) as string[]) || [])
            .map((id) => optionsById.get(id))
            .filter(Boolean);

          const allHexes = linkedOptions.map((o) => {
            const name = String(o!.get(FIELDS.option.name) || "");
            if (name) allOptionNames.add(name);
            return { hex: String(o!.get(FIELDS.option.value) || ""), name };
          });

          return {
            id: variation!.id,
            allHexes,
            images: parseImageUrls(variation!.get(FIELDS.variant.photos)),
          };
        });

      return {
        id: product.id,
        name: String(product.get(FIELDS.product.model) || "Без назви"),
        href: `/catalog/${product.id}`,
        price: Number(product.get(FIELDS.product.minPrice) || 0),
        createdAt: String(product.get(FIELDS.product.createdTime) || ""),
        variations,
        allOptionNames: [...allOptionNames],
      };
    })
    .filter((product) => product.variations.length > 0);

  // 4. Фільтрація за кольорами (in-memory)
  const colorFilters = [seatColors, legColors, tableColors].filter((c) => c.length > 0);
  if (colorFilters.length > 0) {
    catalog = catalog.filter((product) =>
      colorFilters.every((colors) =>
        colors.some((c) => product.allOptionNames.includes(c))
      )
    );
  }

  // 4b. Фільтрація за характеристиками
  if (hasSpecFilters) {
    catalog = catalog.filter((product) => {
      const specValueMap = productSpecMap.get(product.id);
      return Object.entries(specFilters).every(([specName, selectedValues]) => {
        if (selectedValues.length === 0) return true;
        const productValue = specValueMap?.get(specName);
        return productValue !== undefined && selectedValues.includes(productValue);
      });
    });
  }

  // 5. Сортування
  switch (sort) {
    case "price_asc":
      catalog.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      catalog.sort((a, b) => b.price - a.price);
      break;
    case "newest":
      catalog.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      break;
  }

  // 6. Прибираємо службові поля
  return catalog.map(({ createdAt, ...rest }) => rest);
}

async function fetchFilterOptions() {
  // Кольорові опції — як і раніше
  const optionsData = await tableOptions.select().all();

  const seatMap = new Map<string, string>();
  const legMap = new Map<string, string>();
  const tableMap = new Map<string, string>();

  optionsData.forEach((record) => {
    const name = String(record.get(FIELDS.option.name) || "").trim();
    if (!name) return;
    const hex = String(record.get(FIELDS.option.value) || "").trim();
    const lower = name.toLowerCase();

    if (lower.includes("оббивки") || lower.includes("сидіння")) seatMap.set(name, hex);
    else if (lower.includes("ніжок") || lower.includes("ніжки")) legMap.set(name, hex);
    else if (lower.includes("стол")) tableMap.set(name, hex);
  });

  const toOptions = (map: Map<string, string>) =>
    Array.from(map, ([label, hex]) => ({ label, hex }));

  // Характеристики-фільтри — тільки ті, де Фільтрується = true
  const filterableSpecs = await tableSpecs
    .select({ filterByFormula: `{${FIELDS.spec.filterable}}=1` })
    .all();

  let specFilters: SpecFilterGroup[] = [];

  if (filterableSpecs.length > 0) {
    // Для кожної такої характеристики — збираємо унікальні значення з усіх продуктів
    const filterableSpecIds = new Set(filterableSpecs.map((s) => s.id));

    const allProdSpecs = await tableProductSpecs.select().all();

    // Group by spec id → collect values
    const specValuesMap = new Map<string, Set<string>>();
    for (const ps of allProdSpecs) {
      const specId = ((ps.get(FIELDS.productSpec.spec) as string[]) || [])[0];
      if (!specId || !filterableSpecIds.has(specId)) continue;
      const value = String(ps.get(FIELDS.productSpec.value) || "").trim();
      if (!value) continue;
      if (!specValuesMap.has(specId)) specValuesMap.set(specId, new Set());
      specValuesMap.get(specId)!.add(value);
    }

    specFilters = filterableSpecs
      .map((spec) => ({
        specName: String(spec.get(FIELDS.spec.name) || ""),
        values: [...(specValuesMap.get(spec.id) || [])].sort(),
      }))
      .filter((g) => g.specName && g.values.length > 0);
  }

  return {
    seatColors: toOptions(seatMap),
    legColors: toOptions(legMap),
    tableColors: toOptions(tableMap),
    specFilters,
  };
}

export const getFilteredCatalog = unstable_cache(
  fetchFilteredCatalog,
  ["catalog-filtered"],
  { revalidate: 3600, tags: ["catalog"] }
);

export const getFilterOptions = unstable_cache(
  fetchFilterOptions,
  ["catalog-filter-options"],
  { revalidate: 3600, tags: ["catalog"] }
);
