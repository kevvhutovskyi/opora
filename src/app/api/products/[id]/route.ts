import { NextRequest, NextResponse } from 'next/server';
import { 
  tableProducts, 
  tableVariants, 
  tableOptions, 
  tableProductSpecs,
  tableSpecs
} from '@/lib/airtable/tables';

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    const productId = params.id;

    // 1. Отримуємо основний товар
    const productRecord = await tableProducts.find(productId);
    if (!productRecord) {
      return NextResponse.json({ error: 'Product is not found' }, { status: 404 });
    }

    // --- ВАРІАЦІЇ ТА ОПЦІЇ ---
    const variantIds = (productRecord.get('Варіації Товарів') as string[]) || [];

    const variantsRecords = variantIds.length > 0 
      ? await tableVariants.select({
          filterByFormula: `OR(${variantIds.map(id => `RECORD_ID()='${id}'`).join(',')})`
        }).all()
      : [];
    
    const optionIds = new Set<string>();
    variantsRecords.forEach(v => {
      const opts = (v.get('Опції') as string[]) || [];
      opts.forEach(id => optionIds.add(id));
    });

    const optionsRecords = optionIds.size > 0 
      ? await tableOptions.select({
          filterByFormula: `OR(${Array.from(optionIds).map(id => `RECORD_ID()='${id}'`).join(',')})`
        }).all() 
      : [];

    const optionsMap = new Map(optionsRecords.map(opt => [
      opt.id, 
      { name: opt.get('Назва') as string, value: opt.get('Значення') as string }
    ]));

    // --- ХАРАКТЕРИСТИКИ ---
    // 1. Беремо ID з поля "Товари/Характеристики" основного товару
    const productSpecIds = (productRecord.get('Товари/Характеристики') as string[]) || [];

    let specifications: Array<{ name: string; value: string }> = [];

    if (productSpecIds.length > 0) {
      // 2. Отримуємо записи з таблиці-зв'язки (Товари/Характеристики)
      const specsRecords = await tableProductSpecs.select({
        filterByFormula: `OR(${productSpecIds.map(id => `RECORD_ID()='${id}'`).join(',')})`
      }).all();

      // 3. Збираємо унікальні ID самих Характеристик (з поля "Характеристика")
      const charIds = new Set<string>();
      specsRecords.forEach(spec => {
        const charLinkedId = (spec.get('Характеристика') as string[]) || [];
        if (charLinkedId.length > 0) {
          charIds.add(charLinkedId[0]);
        }
      });

      // 4. Отримуємо назви характеристик з таблиці "Характеристики"
      let charsMap = new Map<string, string>();
      if (charIds.size > 0) {
        // Тобі потрібен доступ до таблиці Характеристики. 
        // Якщо її немає в exports, додай її в '@/lib/airtable/tables'
        const charsRecords = await tableSpecs.select({
          filterByFormula: `OR(${Array.from(charIds).map(id => `RECORD_ID()='${id}'`).join(',')})`
        }).all();
        
        charsRecords.forEach(rec => {
          charsMap.set(rec.id, rec.get('Значення') as string); // На скріншоті 3 назва зберігається в колонці "Значення"
        });
      }

      // 5. Формуємо фінальний масив { name, value }
      specifications = specsRecords.map(spec => {
        const charLinkedId = (spec.get('Характеристика') as string[])?.[0];
        const specName = charLinkedId ? charsMap.get(charLinkedId) : "Невідомо";
        
        return {
          name: specName || "Невідомо", // e.g. "Довжина"
          value: String(spec.get('Значення') || "") // e.g. "67"
        };
      });
    }

    // --- ФОРМУВАННЯ ВІДПОВІДІ ---
    const formattedVariants = variantsRecords.map(v => {
      const vOptionIds = (v.get('Опції') as string[]) || [];
      const photosRichText = (v.get('Фото (URLs)') as string) || '';
      
      return {
        id: v.id,
        name: v.get('Назва') as string,
        sku: v.get('Артикул') as string,
        price: (v.get('Ціна') as number) || 0,
        inStock: v.get('Наявність') as boolean,
        images: photosRichText.split('\n').filter(url => url.trim() !== ''),
        options: vOptionIds.map(id => optionsMap.get(id)).filter(Boolean)
      };
    });

    const fullProductDetails = {
      id: productRecord.id,
      name: productRecord.get('Name') as string,
      model: productRecord.get('Модель') as string,
      manufacturer: productRecord.get('Виробник') as string,
      catalog: productRecord.get('Каталог') as string,
      description: productRecord.get('Опис') as string, 
      assemblyVideoUrl: productRecord.get('Відео Збірки') as string,
      assemblyPdfUrl: productRecord.get("PDF Збірки") as string,
      minPrice: (productRecord.get('Мінімальна Ціна') as number) || 0, 
      specifications, // Додано коректні специфікації
      variants: formattedVariants,
    };

    return NextResponse.json(fullProductDetails);

  } catch (error) {
    console.error('API Product Details Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}