// src/services/catalog.ts
import { FieldSet, Records } from "airtable";
import { tableOptions, tableProducts, tableVariants } from "../tables";
import { FilterParams, ProductType } from "./types";
import { VariationImage } from "../products";

export interface CatalogProductDetails {
  id: string;
  name: string;
  price: number;
  href: string;
  variations: VariationImage[];
  createdAt?: string; 
  allOptionNames: string[]; 
}

const getTableName = (productType: ProductType) => {
  // ... (keep your existing getTableName switch statement)
  switch (productType) {
    case 'Chair': return 'Стільці';
    case 'Table': return 'Столи';
    case 'Nightstand': return 'Тумбочки';
    case 'All': return 'Всі';
    default: return 'Всі';
  }
};

// 1. UPDATE: Change FilterParams to accept arrays of strings
export interface FilterParamsWithArrays {
  type: ProductType;
  sort?: string;
  seatColors?: string[]; 
  legColors?: string[];  
  tableColors?: string[];
}

export async function getFilteredCatalog(params: FilterParamsWithArrays): Promise<CatalogProductDetails[]> {
  const { type, sort = 'default', seatColors = [], legColors = [], tableColors = [] } = params;

  // 1. Fetch base products by category
  // FIX: Use curly braces {Каталог} for Cyrillic field names
  const selectParams: Record<string, any> = {};
  if (type && type !== 'All') {
    selectParams.filterByFormula = `{Каталог}='${getTableName(type)}'`;
  }
  
  // Pass selectParams object safely (if it's empty, it fetches all)
  const productsData = await tableProducts.select(selectParams).all();

  if (productsData.length === 0) return [];

  // 2. Gather Variation IDs
  const allVariationIds = [...new Set(productsData.flatMap(p => (p.get("Варіації Товарів") as string[]) || []))];

  // 3. Fetch Variations
  let variationsData: any[] = [];
  if (allVariationIds.length > 0) {
    const chunkSize = 50; 
    for (let i = 0; i < allVariationIds.length; i += chunkSize) {
      const chunk = allVariationIds.slice(i, i + chunkSize);
      
      // FIX: Safely construct OR statement. Airtable prefers single conditions without OR()
      const chunkConditions = chunk.map(id => `RECORD_ID()='${id}'`);
      const varFormula = chunkConditions.length === 1 
        ? chunkConditions[0] 
        : `OR(${chunkConditions.join(',')})`;
        
      const chunkData = await tableVariants.select({ filterByFormula: varFormula }).all();
      variationsData.push(...chunkData);
    }
  }

  // 4. Gather Option IDs
  const allOptionIds = [...new Set(variationsData.flatMap(v => (v.get("Опції") as string[]) || []))];

  // 5. Fetch Options
  let optionsData: Records<FieldSet> = [];
  if (allOptionIds.length > 0) {
    // FIX: Safely construct OR statement here as well
    const optConditions = allOptionIds.map(id => `RECORD_ID()='${id}'`);
    const optFormula = optConditions.length === 1 
      ? optConditions[0] 
      : `OR(${optConditions.join(',')})`;
      
    optionsData = await tableOptions.select({ filterByFormula: optFormula }).all();
  }

  // 6. Map and build the complete ProductDetails array, AND filter out empties
  let catalog: CatalogProductDetails[] = productsData.map(product => {
    const pVarIds = (product.get("Варіації Товарів") as string[]) || [];
    const productVariations = variationsData.filter(v => pVarIds.includes(v.id));

    const aggregatedOptionNames: string[] = [];

    const parsedVariations = productVariations.map(variation => {
      const optIds = (variation.get("Опції") as string[]) || [];
      const linkedOptions = optIds.map(id => optionsData.find(o => o.id === id)).filter(Boolean);

      linkedOptions.forEach(o => {
        const name = String(o?.get("Назва") || "");
        if (name && !aggregatedOptionNames.includes(name)) {
          aggregatedOptionNames.push(name);
        }
      });

      const rawUrls = String(variation.get("Фото (URLs)") || "");
      const images = rawUrls.split(/[\n,]+/).map(url => url.trim()).filter(Boolean);

      return {
        id: variation.id,
        allHexes: linkedOptions.map(o => ({
          hex: `#${String(o?.get("Значення")).replace('#', '')}`, 
          name: String(o?.get('Назва')) || "",
        })),
        images,
      };
    });

    return {
      id: product.id,
      name: String(product.get("Модель") || "Без назви"),
      href: `/catalog/${product.id}`,
      price: Number(product.get("Мінімальна Ціна") || 0),
      createdAt: String(product.get("Created Time") || ""),
      variations: parsedVariations,
      allOptionNames: aggregatedOptionNames, 
    };
  }).filter(product => product.variations && product.variations.length > 0); 

  // 7. Apply Filters (In-Memory) using arrays and .some()
  if (seatColors.length > 0 || legColors.length > 0 || tableColors.length > 0) {
    catalog = catalog.filter(product => {
      const matchesSeat = seatColors.length > 0 ? seatColors.some(c => product.allOptionNames.includes(c)) : true;
      const matchesLeg = legColors.length > 0 ? legColors.some(c => product.allOptionNames.includes(c)) : true;
      const matchesTable = tableColors.length > 0 ? tableColors.some(c => product.allOptionNames.includes(c)) : true;
      
      return matchesSeat && matchesLeg && matchesTable;
    });
  }

  // 8. Apply Sorting
  switch (sort) {
    case 'price_asc': catalog.sort((a, b) => a.price - b.price); break;
    case 'price_desc': catalog.sort((a, b) => b.price - a.price); break;
    case 'newest': catalog.sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())); break;
    default: break;
  }

  // 9. Clean up internal fields
  return catalog.map(({ createdAt, allOptionNames, ...rest }) => rest);
}

export async function getFilterOptions() {
  const optionsData = await tableOptions.select().all();
  
  // 1. UPDATE: Use Maps to deduplicate options by their label
  const seatMap = new Map<string, string>();
  const legMap = new Map<string, string>();
  const tableMap = new Map<string, string>();

  optionsData.forEach(record => {
    const rawName = String(record.get("Назва") || "").trim();
    let rawHex = String(record.get("Значення") || "").trim();
    if (rawHex && !rawHex.startsWith('#') && rawHex !== 'Так') {
      rawHex = `#${rawHex}`;
    }

    if (!rawName) return;

    if (rawName.toLowerCase().includes("сидіння")) {
      seatMap.set(rawName, rawHex);
    } 
    else if (rawName.toLowerCase().includes("ніжки")) {
      legMap.set(rawName, rawHex);
    }
    else if (rawName.toLowerCase().includes("стола")) {
      tableMap.set(rawName, rawHex);
    }
  });

  // Convert Maps back to the array format the component expects
  return { 
    seatColors: Array.from(seatMap, ([label, hex]) => ({ label, hex })), 
    legColors: Array.from(legMap, ([label, hex]) => ({ label, hex })), 
    tableColors: Array.from(tableMap, ([label, hex]) => ({ label, hex })) 
  };
}