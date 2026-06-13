import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Генерує 6-значний номер заявки/замовлення (на клієнті, щоб одразу показати користувачу)
export function generateRequestNumber() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Нормалізує телефонний ввід: завжди починається з "+380", далі лише цифри
// (максимум 9 цифр після коду країни), згруповані пробілами як "+380 66 666 66 66".
// Префікс "+380" незмінний — спроба його стерти просто залишає "+380"
// (без помилкового "+38038"). Цей самий формат (з пробілами) йде у заявку,
// тож зберігається в Airtable і надсилається в Telegram у читабельному вигляді.
export function formatUaPhone(raw: string): string {
  const allDigits = raw.replace(/\D/g, "");

  // Абонентські цифри — це все, що йде ПІСЛЯ коду країни "380".
  // Якщо повного "380" немає (користувач редагував усередині префікса) —
  // абонентських цифр немає, лишаємо чистий "+380".
  let subscriber = "";
  const withCode = allDigits.match(/^380(\d*)$/);
  if (withCode) {
    subscriber = withCode[1];
  } else if (/^0\d+$/.test(allDigits)) {
    // Локальний формат "0XXXXXXXXX" (напр. зі вставки) — прибираємо провідний 0
    subscriber = allDigits.replace(/^0+/, "");
  }

  subscriber = subscriber.slice(0, 9);

  // Групуємо абонентські цифри: XX XXX XX XX
  const groups = [
    subscriber.slice(0, 2),
    subscriber.slice(2, 5),
    subscriber.slice(5, 7),
    subscriber.slice(7, 9),
  ].filter(Boolean);

  return groups.length ? `+380 ${groups.join(" ")}` : "+380";
}

// Кут відтінку (hue, 0–360) кольору — для впорядкування свотчів за веселкою.
// Сірі/чорні/білі (та некоректні значення) йдуть у кінець (361).
export function toHue(hex?: string): number {
  const n = parseInt((hex || "").replace("#", ""), 16);
  if (Number.isNaN(n)) return 361;
  const r = (n >> 16) / 255, g = ((n >> 8) & 0xff) / 255, b = (n & 0xff) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  if (d === 0) return 361;
  if (max === r) return (((g - b) / d + 6) % 6) * 60;
  if (max === g) return ((b - r) / d + 2) * 60;
  return ((r - g) / d + 4) * 60;
}
