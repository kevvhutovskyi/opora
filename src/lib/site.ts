// Глобальні SEO-константи сайту.
// NEXT_PUBLIC_SITE_URL треба виставити в продакшн-середовищі (Cloudflare),
// інакше абсолютні URL у метаданих, sitemap та OG будуть вказувати на fallback.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://opora.com.ua"
).replace(/\/$/, "");

export const SITE_NAME = "OPORA";

export const SITE_DESCRIPTION =
  "Мінімалістичні крісла та меблі OPORA — лаконічний дизайн, що стає акцентом вашого інтер'єру.";

export const DEFAULT_OG_IMAGE = "/og-default.jpg";

// Контактні дані магазину (адреса, телефон, месенджери, графік роботи).
// Винесено в одне місце — використовується у шапці, футері та плаваючій кнопці.
export const STORE = {
  addressLine: "вул. Щирецька, 36",
  city: "Львів",
  hours: "Щодня з 10:00 до 19:00",
  email: "opora.furniture@gmail.com",
  // Телефон у двох форматах: для відображення та для tel:/месенджерів
  phoneDisplay: "+380 67 010 39 66",
  phoneRaw: "380670103966",
} as const;
