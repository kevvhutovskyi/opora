import { tableOptions, tableProducts, tableVariants } from "../tables";
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
  // Назви всіх опцій товару (для фільтрації за кольором). Внутрішнє поле —
  // не для відображення, тому необов'язкове для споживачів типу.
  allOptionNames?: string[];
}

export interface FilterParamsWithArrays {
  type: ProductType;
  sort?: string;
  seatColors?: string[];
  legColors?: string[];
  tableColors?: string[];
}

export async function getFilteredCatalog(
  params: FilterParamsWithArrays
): Promise<CatalogProductDetails[]> {
  const { type, sort = "default", seatColors = [], legColors = [], tableColors = [] } = params;

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

  // 4. Фільтрація за кольорами (in-memory): товар підходить, якщо містить
  //    хоча б одну з обраних опцій у кожній заданій групі
  const colorFilters = [seatColors, legColors, tableColors].filter((c) => c.length > 0);
  if (colorFilters.length > 0) {
    catalog = catalog.filter((product) =>
      colorFilters.every((colors) =>
        colors.some((c) => product.allOptionNames.includes(c))
      )
    );
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

  // 6. Прибираємо службове поле createdAt
  return catalog.map(({ createdAt, ...rest }) => rest);
}

export async function getFilterOptions() {
  const optionsData = await tableOptions.select().all();

  // Дедуплікуємо опції за назвою в межах кожної групи (сидіння / ніжки / стіл)
  const seatMap = new Map<string, string>();
  const legMap = new Map<string, string>();
  const tableMap = new Map<string, string>();

  optionsData.forEach((record) => {
    const name = String(record.get(FIELDS.option.name) || "").trim();
    if (!name) return;
    const hex = String(record.get(FIELDS.option.value) || "").trim();
    const lower = name.toLowerCase();

    // Назва опції має вигляд "Колір оббивки: Бежевий" / "Колір ніжок: Чорний" / "Колір стола: ..."
    if (lower.includes("оббивки") || lower.includes("сидіння")) seatMap.set(name, hex);
    else if (lower.includes("ніжок") || lower.includes("ніжки")) legMap.set(name, hex);
    else if (lower.includes("стол")) tableMap.set(name, hex);
  });

  const toOptions = (map: Map<string, string>) =>
    Array.from(map, ([label, hex]) => ({ label, hex }));

  return {
    seatColors: toOptions(seatMap),
    legColors: toOptions(legMap),
    tableColors: toOptions(tableMap),
  };
}
