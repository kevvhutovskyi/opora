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

export function trackEvent(name: string, data?: UmamiEventData): void {
  if (typeof window === "undefined" || !window.umami) return;
  try {
    window.umami.track(name, data);
  } catch {
    // Трекінг не повинен ламати UI — мовчки ігноруємо помилки.
  }
}
