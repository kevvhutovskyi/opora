// Централізована схема Airtable для адмін-панелі: назви таблиць та колонок
// в одному місці (аналог schema.ts у Next.js-застосунку).

export const TABLES = {
  products: 'Товари',
  variants: 'Варіації Товарів',
  options: 'Опції',
  specs: 'Характеристики',
  productSpecs: 'Товари/Характеристики',
  popularProducts: 'Найпопулярніші Товари',
  requests: 'Запити',
  banners: 'Банери',
} as const;

export const FIELDS = {
  product: {
    model: 'Модель',
    description: 'Опис',
    assemblyVideo: 'Відео Збірки',
  },
  variant: {
    sku: 'Артикул',
    price: 'Ціна',
    inStock: 'Наявність',
    product: 'Товар',
    options: 'Опції',
    photos: 'Фото (URLs)',
  },
  option: {
    name: 'Назва',
    value: 'Значення',
  },
  spec: {
    name: 'Назва',
    filterable: 'Фільтрується',
  },
  productSpec: {
    product: 'Товар',
    spec: 'Характеристика',
    value: 'Значення',
  },
  popular: {
    products: 'Товари',
  },
  request: {
    number: 'Номер',
    name: "Ім'я",
    phone: 'Номер телефону',
    order: 'Замовлення',
    warmed: 'Прогрет',
  },
  banner: {
    name: 'Назва',
    type: 'Тип',
    image: 'Зображення',
    order: 'Порядок',
    active: 'Активний',
  },
} as const;

// Значення поля «Тип» у таблиці «Банери» (single select).
export const BANNER_TYPES = {
  slider: 'Слайдер',
  catalog: 'Каталог',
  category: 'Категорія',
} as const;

// Фіксований список категорій — назви мають точно збігатись з полем «Назва» у таблиці «Банери».
export const CATEGORY_ITEMS = ['Стільці', 'Столи', 'Лампи'] as const;

// Базовий URL Next.js API (R2-завантаження медіа).
export const API_BASE_URL = 'http://localhost:3000';

// Палітра для уніфікованого CRM-вигляду.
export const UI = {
  appBg: '#F4F5F7',
  cardBg: '#FFFFFF',
  border: '#E5E8EC',
  borderStrong: '#D6DAE0',
  rowBg: '#FAFBFC',
  text: '#1F2733',
  textMuted: '#6B7280',
  primary: '#2D7FF9',
  successBg: '#E7F5EC',
  successText: '#1A7F45',
  dangerBg: '#FDEBEC',
  dangerText: '#C0392B',
  warnBg: '#FEF3E2',
  warnText: '#B7791F',
  shadow: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)',
} as const;
