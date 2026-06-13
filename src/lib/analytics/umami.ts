// Тонка обгортка над браузерним трекером Umami.
// Скрипт підключається в layout.tsx; тут — типи + безпечний виклик подій.

type UmamiEventData = Record<string, string | number | boolean | undefined>;

interface Umami {
  track: {
    (eventName: string, eventData?: UmamiEventData): void;
    (event: UmamiEventData): void;
  };
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

/**
 * Надсилає кастомну подію в Umami.
 * No-op під час SSR, у dev без підключеного скрипта або до його завантаження —
 * ніколи не кидає виняток.
 */
export function trackEvent(name: string, data?: UmamiEventData): void {
  if (typeof window === "undefined" || !window.umami) return;
  try {
    window.umami.track(name, data);
  } catch {
    // Трекінг не повинен ламати UI — мовчки ігноруємо помилки.
  }
}
