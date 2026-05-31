import { FieldSet, Record as AirtableRecord, Records } from "airtable";
import { GeneralProduct, ProductDetails } from "./types";
import { airtableBase } from "..";

type ProductType = 'Chair' | 'Table' | 'Nightstand';

const getTableName = (productType: ProductType) => {
  switch (productType) {
    case 'Chair':
      return 'Стільці';
    case 'Table':
      return 'Столи';
    case 'Nightstand':
      return 'Тумбочки';
    default:
      throw new Error(`Unknown product type: ${productType}`);
  }
};

const getAdditionalProductsFields = (productType: ProductType, record: AirtableRecord<FieldSet>) => {
  switch (productType) {
    case 'Chair':
      return {
        legsColorName: record.get("Колір ніжок (Назва)") as string || "",
        legsColorHex: record.get("Колір ніжок (HEX)") as string || "",
        sitColorName: record.get("Колір сидіння (Назва)") as string || "",
        sitColorHex: record.get("Колір сидіння (HEX)") as string || "",
      };
    case 'Table':
      return {};
    case 'Nightstand':
      return {};
    default:
      return {};
  }
};

export async function getProducts(type: ProductType): Promise<GeneralProduct[]> {
  const records = await airtableBase(getTableName(type)).select().all();

  return records.map((record) => {
    return {
      id: record.id,

      description: String(record.get("Опис") || ""),
      manufacturer: String(record.get("Виробник") || ""),
      model: String(record.get("Модель") || ""),
      inStock: Boolean(record.get("Наявність") || false),

      price: Number(record.get("Ціна") || 0),
      discountPercentage: Number(record.get("Знижка (Відсоток)") || 0) * 100,
      discountPrice:  Number(record.get("Знижка (Ціна)") || 0),
      discountedPrice: Number(record.get("Ціна після знижки") || 0),

      ...getAdditionalProductsFields(type, record),
    } as GeneralProduct;
  });
}

export async function getTopProducts(): Promise<ProductDetails[]> {
  // 1. Отримуємо записи з таблиці-зв'язки
  const topRecords = await airtableBase("Найпопулярніші Товари").select().all();
  
  // 2. Витягуємо масив ID товарів
  const productIds = topRecords.map(record => {
    const linkedProducts = record.get("Товари") as string[];
    return linkedProducts ? linkedProducts[0] : null;
  }).filter(Boolean) as string[];

  // 3. Передаємо ID в нашу нову bulk-функцію
  return getMultipleProductsWithVariations(productIds);
}

// TODO: update for details /[slug]
export async function getProductWithColorVariations(productId: string): Promise<ProductDetails | null> {
  // 1. Отримуємо основний товар
  const productRecord = await airtableBase("Товари").find(productId);
  if (!productRecord) return null;

  const variationIds = (productRecord.get("Варіації Товарів") as string[]) || [];

  // 2. Отримуємо варіації цього товару
  const variationsData = await airtableBase("Варіації Товарів").select({
    filterByFormula: `OR(${variationIds.map(id => `RECORD_ID()='${id}'`).join(',')})`
  }).all();

  // 3. Збираємо унікальні опції (кольори), щоб дістати їхні Hex-коди
  // Це потребує ще одного запиту до таблиці "Опції"
  const optionIds = variationsData.flatMap(v => v.get("Опції") as string[] || []);
  const optionsData = await airtableBase("Опції").select({
    filterByFormula: `OR(${optionIds.map(id => `RECORD_ID()='${id}'`).join(',')})`
  }).all();

  // 4. Формуємо фінальний масив для фронтенду
  const variations = variationsData.map(variation => {
    // Беремо перший ліпший ID опції для цієї варіації (припускаючи, що 1 варіація = 1 колір)
    const optId = (variation.get("Опції") as string[])?.[0];
    const optionRecord = optionsData.find(o => o.id === optId);

    // Парсимо URL-и (якщо це текст, розділений комою)
    const rawUrls = String(variation.get("Фото (URLs)") || "");
    const images = rawUrls.split(',').map(url => url.trim()).filter(Boolean);

    return {
      colorName: optionRecord ? String(optionRecord.get("Назва")) : "Unknown",
      colorHex: optionRecord ? `#${String(optionRecord.get("Значення"))}` : "#CCCCCC",
      images: images,
    };
  });

  return {
    id: productRecord.id,
    name: String(productRecord.get("Модель")),
    href: String(productRecord.get("Відео (URL)")),
    price: Number(productRecord.get("Мінімальна Ціна")),
    pdfLink: String(productRecord.get('PDF Збірки')),
    variations,
  };
}
  
export async function getMultipleProductsWithVariations(productIds: string[]): Promise<ProductDetails[]> {
  if (!productIds || productIds.length === 0) return [];

  // 1. Отримуємо всі потрібні товари одним запитом
  const productsFormula = `OR(${productIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
  const productsData = await airtableBase("Товари").select({ filterByFormula: productsFormula }).all();

  // 2. Збираємо всі ID варіацій з усіх знайдених товарів (робимо плоский масив і прибираємо дублікати)
  const allVariationIds = [...new Set(productsData.flatMap(p => (p.get("Варіації Товарів") as string[]) || []))];

  // 3. Отримуємо всі варіації одним запитом
  let variationsData: Records<FieldSet> = [];
  if (allVariationIds.length > 0) {
    const varFormula = `OR(${allVariationIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    variationsData = await airtableBase("Варіації Товарів").select({ filterByFormula: varFormula }).all();
  }

  // 4. Збираємо всі ID опцій (кольорів) з усіх варіацій
  const allOptionIds = [...new Set(variationsData.flatMap(v => (v.get("Опції") as string[]) || []))];

  // 5. Отримуємо всі опції одним запитом
  let optionsData: Records<FieldSet> = [];
  if (allOptionIds.length > 0) {
    const optFormula = `OR(${allOptionIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    optionsData = await airtableBase("Опції").select({ filterByFormula: optFormula }).all();
  }

  // 6. Склеюємо всі дані в масив об'єктів ProductDetails
  return productsData.map(product => {
    const pVarIds = (product.get("Варіації Товарів") as string[]) || [];
    const productVariations = variationsData.filter(v => pVarIds.includes(v.id));

    // We map each row in Airtable to exactly ONE variation object
    const variations = productVariations.map(variation => {
      
      // Get the array of option IDs (e.g., [Black_ID, Red_ID])
      const optIds = (variation.get("Опції") as string[]) || [];
      
      // Find the actual option records for these IDs
      const linkedOptions = optIds.map(id => optionsData.find(o => o.id === id)).filter(Boolean);

      // Combine the names based on their order in Airtable (e.g., "Чорний / Червоний")
      const combinedName = linkedOptions
        .map(o => String(o?.get("Назва") || ""))
        .join(" / ") || "Unknown";

      // Parse the images (handles both commas and newlines)
      const rawUrls = String(variation.get("Фото (URLs)") || "");
      const images = rawUrls.split(/[\n,]+/).map(url => url.trim()).filter(Boolean);

      return {
        id: variation.id,
        colorName: combinedName, // "Чорний / Червоний"
        
        // Bonus: Sending all hexes to the frontend just in case you ever 
        // want to create a split-color circle (half black / half red) later!
        allHexes: linkedOptions.map(o => ({
          hex: `#${String(o?.get("Значення"))}`,
          name: String(o?.get('Назва')) || "",
        })), 
        
        images,
        price: String(variation.get("Ціна")) || "",
      };
    });

    return {
      id: product.id,
      name: String(product.get("Модель") || "Без назви"),
      href: `/catalog/${product.id}`,
      price: Number(product.get("Мінімальна Ціна") || 0),
      variations,
    };
  });
}
