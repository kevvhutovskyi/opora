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
  banners: "Банери",
  optionFilters: "Фільтри Опцій",
} as const;

// Значення поля «Тип» у таблиці «Банери» (single select).
export const BANNER_TYPES = {
  slider: "Слайдер",
  catalog: "Каталог",
  category: "Категорія",
} as const;

// Окремі таблиці товарів за категорією (використовує getProducts).
export const CATEGORY_TABLES = {
  Chair: "Стільці",
  Table: "Столи",
  Nightstand: "Табуретки",
  All: "Всі",
} as const;

export const FIELDS = {
  product: {
    name: "Name",
    model: "Модель",
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
    // Стиснені версії фото (WebP), генеруються при завантаженні. Використовуються на сторінці
    // товару; оригінали (photos) — лише в повноекранній галереї. Паралельний масив до photos.
    photosCompressed: "Фото стиснені (URLs)",
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
    filterable: "Фільтрується",
  },
  optionFilter: {
    name: "Назва",
    categories: "Категорії",
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
    // Доставка «Нова Пошта» — створіть ці колонки (тип "Single line text") у таблиці "Запити"
    deliveryCity: "Місто",
    deliveryWarehouse: "Відділення",
  },
  banner: {
    name: "Назва",
    type: "Тип",
    image: "Зображення",
    order: "Порядок",
    active: "Активний",
  },
} as const;
