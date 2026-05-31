import { NextRequest, NextResponse } from 'next/server';
import { tableProducts, tableVariants, tableOptions } from '@/lib/airtable';

interface ProductOption {
  name: string;
  value: string;
}

interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  inStock: boolean;
  images: string[];
  options: ProductOption[];
}

interface ShortProductData {
  id: string;
  model: string;
  manufacturer: string;
  minPrice: number;
  variants: ProductVariant[];
}

// /api/products?category=Крісла&seatColor=Бежевий,Сірий&legColor=Оливковий&page=1&sort=asc

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') === 'desc' ? 'desc' : 'asc';

    // --- 1. ПАРСИНГ ФІЛЬТРІВ ТА ГЕНЕРАЦІЯ ФОРМУЛИ ---
    const conditions: string[] = [];

    // Фільтр: Категорія (Каталог)
    const category = searchParams.get('category');
    if (category && category !== 'Всі') {
      // Обгортаємо значення в подвійні лапки
      conditions.push(`{Каталог} = "${category}"`);
    }

    // Фільтр: Колір сидіння (може бути кілька: "Бежевий,Сірий")
    const seatColors = searchParams.get('seatColor')?.split(',').filter(Boolean) || [];
    if (seatColors.length > 0) {
      // Якщо обрано кілька кольорів, товар має збігатися ХОЧА Б З ОДНИМ (OR)
      const seatConditions = seatColors.map(color => 
        `FIND("Колір сидіння: ${color}", {Фільтр Опцій}) > 0`
      );
      conditions.push(`OR(${seatConditions.join(', ')})`);
    }

    // Фільтр: Колір ніжок
    const legColors = searchParams.get('legColor')?.split(',').filter(Boolean) || [];
    if (legColors.length > 0) {
      const legConditions = legColors.map(color => 
        `FIND("Колір ніжок: ${color}", {Фільтр Опцій}) > 0`
      );
      conditions.push(`OR(${legConditions.join(', ')})`);
    }

    // Об'єднуємо всі умови через AND
    const filterFormula = conditions.length > 0 ? `AND(${conditions.join(', ')})` : '';

    // --- 2. ОТРИМАННЯ ДАНИХ З AIRTABLE ---
    
    // Рахуємо загальну кількість ВІДФІЛЬТРОВАНИХ товарів для пагінації
    const countQueryOptions: any = { fields: [] };
    if (filterFormula) {
      countQueryOptions.filterByFormula = filterFormula;
    }
    const allProducts = await tableProducts.select(countQueryOptions).all();
    const totalRecords = allProducts.length;

    // Робимо основний запит з фільтром та сортуванням
    const fetchQueryOptions: any = {
      sort: [{ field: 'Мінімальна Ціна', direction: sort }],
      maxRecords: page * limit 
    };
    if (filterFormula) {
      fetchQueryOptions.filterByFormula = filterFormula;
    }

    const productsRecords = await tableProducts.select(fetchQueryOptions).all();

    // Беремо лише записи для поточної сторінки
    const startIndex = (page - 1) * limit;
    const pageProductsRecords = productsRecords.slice(startIndex);

    // Якщо товарів немає, одразу повертаємо порожній масив (уникаємо зайвих запитів)
    if (pageProductsRecords.length === 0) {
      return NextResponse.json({
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 }
      });
    }

    // --- 3. ЗБІР ВАРІАЦІЙ ТА ОПЦІЙ ДЛЯ ПАГІНОВАНИХ ТОВАРІВ ---
    const targetVariantIds = new Set<string>();
    pageProductsRecords.forEach(p => {
      const ids = (p.get('Варіації Товарів') as string[]) || [];
      ids.forEach(id => targetVariantIds.add(id));
    });

    const variantsRecords = targetVariantIds.size > 0 
      ? await tableVariants.select({
          filterByFormula: `OR(${Array.from(targetVariantIds).map(id => `RECORD_ID()='${id}'`).join(',')})`
        }).all()
      : [];

    const targetOptionIds = new Set<string>();
    variantsRecords.forEach(v => {
      const ids = (v.get('Опції') as string[]) || [];
      ids.forEach(id => targetOptionIds.add(id));
    });

    const optionsRecords = targetOptionIds.size > 0
      ? await tableOptions.select({
          filterByFormula: `OR(${Array.from(targetOptionIds).map(id => `RECORD_ID()='${id}'`).join(',')})`
        }).all()
      : [];

    // --- 4. МАПІНГ ДАНИХ ---
    const optionsMap = new Map<string, ProductOption>(optionsRecords.map(opt => [
      opt.id, 
      { name: opt.get('Назва') as string, value: opt.get('Значення') as string }
    ]));

    const variantsMap = new Map<string, ProductVariant>(variantsRecords.map(v => {
      const optionIds = (v.get('Опції') as string[]) || [];
      const photosRichText = (v.get('Фото (URLs)') as string) || '';
      const images = photosRichText.split('\n').filter(url => url.trim() !== '');

      return [v.id, {
        id: v.id,
        sku: v.get('Артикул') as string,
        price: (v.get('Ціна') as number) || 0,
        inStock: v.get('Наявність') as boolean,
        images: images,
        options: optionIds.map(id => optionsMap.get(id)!).filter(Boolean)
      }];
    }));

    // --- 5. ФОРМУВАННЯ ФІНАЛЬНОГО JSON ---
    const result: ShortProductData[] = pageProductsRecords.map(p => {
      const variantIds = (p.get('Варіації Товарів') as string[]) || [];
      const productVariants = variantIds.map(id => variantsMap.get(id)!).filter(Boolean);

      return {
        id: p.id,
        model: p.get('Модель') as string,
        manufacturer: p.get('Виробник') as string,
        minPrice: (p.get('Мінімальна Ціна') as number) || 0,
        variants: productVariants,
      };
    });

    return NextResponse.json({
      data: result,
      meta: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit)
      }
    });

  } catch (error) {
    console.error('API Products Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}