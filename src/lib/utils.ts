import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Генерує 6-значний номер заявки/замовлення (на клієнті, щоб одразу показати користувачу)
export function generateRequestNumber() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
