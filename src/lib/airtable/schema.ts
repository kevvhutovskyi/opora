// Централізована схема Airtable: назви таблиць та колонок в одному місці.
// Решта коду посилається на ці константи замість "магічних" кириличних рядків.

export const TABLES = {
  products: "Товари",
  variants: "Варіації Товарів",
  options: "Опції",
  productSpecs: "Товари/Характеристики",
  specs: "Характеристики",
  requests: "Запити",
  topProducts: "Найпопулярніші Товари",
  comments: "Коментарі",
} as const;

// Окремі таблиці товарів за категорією (використовує getProducts).
export const CATEGORY_TABLES = {
  Chair: "Стільці",
  Table: "Столи",
  Nightstand: "Тумбочки",
  All: "Всі",
} as const;

export const FIELDS = {
  product: {
    name: "Name",
    model: "Модель",
    manufacturer: "Виробник",
    catalog: "Каталог",
    description: "Опис",
    minPrice: "Мінімальна Ціна",
    variants: "Варіації Товарів",
    specs: "Товари/Характеристики",
    assemblyVideo: "Відео Збірки",
    assemblyPdf: "PDF Збірки",
    createdTime: "Created Time",
    // Поля на таблицях категорій (Стільці/Столи/Тумбочки) — для getProducts
    inStock: "Наявність",
    price: "Ціна",
    discountPercent: "Знижка (Відсоток)",
    discountPrice: "Знижка (Ціна)",
    discountedPrice: "Ціна після знижки",
    legsColorName: "Колір ніжок (Назва)",
    legsColorHex: "Колір ніжок (HEX)",
    seatColorName: "Колір сидіння (Назва)",
    seatColorHex: "Колір сидіння (HEX)",
  },
  variant: {
    name: "Назва",
    sku: "Артикул",
    price: "Ціна",
    inStock: "Наявність",
    photos: "Фото (URLs)",
    options: "Опції",
  },
  option: {
    name: "Назва",
    value: "Значення",
  },
  productSpec: {
    spec: "Характеристика",
    value: "Значення",
  },
  spec: {
    name: "Назва",
  },
  topProduct: {
    products: "Товари",
  },
  comment: {
    product: "Товар",
    authorName: "Ім'я Прізвище",
    rating: "Рейтинг",
    text: "Текст",
    createdAt: "Створено",
  },
  request: {
    name: "Ім'я",
    phoneNumber: "Номер телефону",
    orderNumber: "Номер замовлення",
    orders: "Замовлення",
  },
} as const;
