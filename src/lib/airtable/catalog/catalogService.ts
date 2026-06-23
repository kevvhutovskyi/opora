import { unstable_cache } from "next/cache";
import { FieldSet, Records } from "airtable";
import { tableOptionFilters, tableOptions, tableProducts, tableProductSpecs, tableSpecs, tableVariants } from "../tables";
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
  optionFilters?: Record<string, string[]>; // groupName → selected full option names
  specFilters?: Record<string, string[]>; // specName → selected values
}

export interface SpecFilterGroup {
  specName: string;
  values: string[];
}

export interface FilterOption {
  label: string; // full option name (matches allOptionNames), e.g. "Колір сидіння: Чорний"
  hex?: string;
  categories: ProductType[]; // категорії товарів, що використовують цю опцію
}

export interface OptionFilterGroup {
  groupName: string;
  categories: ProductType[]; // адмін-обмеження групи; empty = усі категорії
  values: FilterOption[];
}

type ProductRecords = Records<FieldSet>;

// Варіації → опції (опції залежать від варіацій, тож ланцюжок послідовний)
async function loadVariationsAndOptions(productsData: ProductRecords) {
  const variationIds = productsData.flatMap((p) => (p.get(FIELDS.product.variants) as string[]) || []);
  const variationsById = indexById(await fetchRecordsByIds(tableVariants, variationIds));

  const optionIds = [...variationsById.values()].flatMap(
    (v) => (v.get(FIELDS.variant.options) as string[]) || []
  );
  const optionsById = indexById(await fetchRecordsByIds(tableOptions, optionIds));

  return { variationsById, optionsById };
}

// productId → (specName → value)
async function buildProductSpecMap(productsData: ProductRecords) {
  const allProdSpecIds = productsData.flatMap((p) => (p.get(FIELDS.product.specs) as string[]) || []);
  const prodSpecById = indexById(await fetchRecordsByIds(tableProductSpecs, allProdSpecIds));

  const specIds = [...prodSpecById.values()].flatMap(
    (ps) => (ps.get(FIELDS.productSpec.spec) as string[]) || []
  );
  const specsById = indexById(await fetchRecordsByIds(tableSpecs, specIds));

  const productSpecMap = new Map<string, Map<string, string>>();
  for (const product of productsData) {
    const specValueMap = new Map<string, string>();
    for (const psId of (product.get(FIELDS.product.specs) as string[]) || []) {
      const ps = prodSpecById.get(psId);
      const specId = ps && ((ps.get(FIELDS.productSpec.spec) as string[]) || [])[0];
      const spec = specId && specsById.get(specId);
      if (!ps || !spec) continue;
      const name = String(spec.get(FIELDS.spec.name) || "");
      if (name) specValueMap.set(name, String(ps.get(FIELDS.productSpec.value) || ""));
    }
    productSpecMap.set(product.id, specValueMap);
  }
  return productSpecMap;
}

async function fetchFilteredCatalog(
  params: FilterParamsWithArrays
): Promise<CatalogProductDetails[]> {
  const {
    type,
    sort = "default",
    optionFilters = {},
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

  // 2. Варіації/опції та (за потреби) характеристики — незалежні гілки, тягнемо паралельно
  const hasSpecFilters = Object.values(specFilters).some((v) => v.length > 0);
  const [{ variationsById, optionsById }, productSpecMap] = await Promise.all([
    loadVariationsAndOptions(productsData),
    hasSpecFilters ? buildProductSpecMap(productsData) : Promise.resolve(null),
  ]);

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

          const imgs = parseImageUrls(variation!.get(FIELDS.variant.photos));
          const compressed = parseImageUrls(variation!.get(FIELDS.variant.photosCompressed));
          return {
            id: variation!.id,
            allHexes,
            images: imgs,
            imagesCompressed: imgs.map((orig, i) => compressed[i] || orig),
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

  // 4. Фільтрація за опціями/кольорами (in-memory) — AND між групами, OR всередині групи
  const optionFilterGroups = Object.values(optionFilters).filter((vals) => vals.length > 0);
  if (optionFilterGroups.length > 0) {
    catalog = catalog.filter((product) =>
      optionFilterGroups.every((names) =>
        names.some((name) => product.allOptionNames.includes(name))
      )
    );
  }

  // 4b. Фільтрація за характеристиками
  if (hasSpecFilters) {
    catalog = catalog.filter((product) => {
      const specValueMap = productSpecMap?.get(product.id);
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

// Стільці/Столи/Табуретки → Chair/Table/Nightstand (для зіставлення з activeType на storefront)
const CATALOG_TO_TYPE: Record<string, ProductType> = Object.fromEntries(
  Object.entries(CATEGORY_TABLES)
    .filter(([type]) => type !== "All")
    .map(([type, label]) => [label, type as ProductType])
);

async function fetchFilterOptions() {
  // Групи опцій-фільтрів налаштовуються в адмінці (таблиця «Фільтри Опцій»).
  // Кожен рядок = увімкнена група; «Категорії» — необов'язкове обмеження групи.
  const [configRows, productsData] = await Promise.all([
    tableOptionFilters.select().all(),
    tableProducts.select().all(),
  ]);

  // groupName → адмін-обмеження категорій (порожньо = всі)
  const groupCategories = new Map<string, ProductType[]>();
  for (const row of configRows) {
    const groupName = String(row.get(FIELDS.optionFilter.name) || "").trim();
    if (!groupName) continue;
    // «Категорії» — текст через кому (напр. "Стільці, Столи"); порожньо = всі категорії.
    const cats = String(row.get(FIELDS.optionFilter.categories) || "")
      .split(",")
      .map((label) => CATALOG_TO_TYPE[label.trim()])
      .filter(Boolean);
    groupCategories.set(groupName, cats);
  }

  // Повна назва опції → { hex, категорії товарів, що її реально використовують }.
  // Категорії визначаємо з товарів: опція належить категорії, якщо її має товар цієї категорії.
  const { variationsById, optionsById } = await loadVariationsAndOptions(productsData);
  const optionInfo = new Map<string, { hex: string; cats: Set<ProductType> }>();
  for (const product of productsData) {
    const cat = CATALOG_TO_TYPE[String(product.get(FIELDS.product.catalog) || "").trim()];
    if (!cat) continue;
    for (const vId of (product.get(FIELDS.product.variants) as string[]) || []) {
      const variant = variationsById.get(vId);
      if (!variant) continue;
      for (const oId of (variant.get(FIELDS.variant.options) as string[]) || []) {
        const opt = optionsById.get(oId);
        if (!opt) continue;
        const name = String(opt.get(FIELDS.option.name) || "").trim();
        if (!name || !name.includes(":")) continue;
        let info = optionInfo.get(name);
        if (!info) {
          info = { hex: String(opt.get(FIELDS.option.value) || "").trim(), cats: new Set() };
          optionInfo.set(name, info);
        }
        info.cats.add(cat);
      }
    }
  }

  // Групуємо значення за префіксом назви до ":" (лише для увімкнених груп).
  const valuesByGroup = new Map<string, FilterOption[]>();
  for (const [name, info] of optionInfo) {
    const groupName = name.split(":")[0].trim();
    if (!groupCategories.has(groupName)) continue;
    if (!valuesByGroup.has(groupName)) valuesByGroup.set(groupName, []);
    valuesByGroup.get(groupName)!.push({ label: name, hex: info.hex, categories: [...info.cats] });
  }

  const optionFilters: OptionFilterGroup[] = [...groupCategories]
    .map(([groupName, categories]) => ({
      groupName,
      categories,
      values: (valuesByGroup.get(groupName) || []).sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .filter((g) => g.values.length > 0);

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
    optionFilters,
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
