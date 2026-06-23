"use client";

import { useEffect, useRef, useState } from "react";
import ProductCard from "../ui/ProductCard";
import { SliderArrowLeftIcon, SliderArrowRightIcon } from "../ui/Icons";
import { CatalogProductDetails } from "@/lib";

const STORAGE_KEY = "opora-recently-viewed";
const MAX_ITEMS = 12;

type RecentlyViewedProps = {
  // Поточний товар (на сторінці товару) — записуємо його в історію, але в самій секції не показуємо.
  // Без цього пропа (напр. на головній) секція лише показує історію й нічого не записує.
  current?: CatalogProductDetails;
};

export default function RecentlyViewed({ current }: RecentlyViewedProps) {
  const [items, setItems] = useState<CatalogProductDetails[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Зберігаємо лише публічні дані товару (id, назва, ціна, фото) — без жодних персональних даних.
  useEffect(() => {
    let stored: CatalogProductDetails[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      stored = [];
    }

    const withoutCurrent = current ? stored.filter((p) => p.id !== current.id) : stored;

    // Показуємо раніше переглянуті товари (без поточного)
    setItems(withoutCurrent);

    // Якщо є поточний товар — додаємо його на початок списку, дедуп за id, обмежуємо кількість
    if (current) {
      const updated = [current, ...withoutCurrent].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ігноруємо помилки запису (приватний режим / переповнене сховище)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const scroll = (direction: "left" | "right") => {
    scrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  if (items.length === 0) return null;

  return (
    <section className="py-6 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* Шапка секції */}
        <div className="flex justify-between items-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-medium text-opora-brown">
            Ви раніше переглядали
          </h2>

          {items.length > 1 && (
            <div className="flex space-x-2">
              <button
                onClick={() => scroll("left")}
                aria-label="Попередні товари"
                className="p-2 hover:opacity-70 transition-opacity text-opora-brown"
              >
                <SliderArrowLeftIcon className="w-6 h-6" />
              </button>
              <button
                onClick={() => scroll("right")}
                aria-label="Наступні товари"
                className="p-2 hover:opacity-70 transition-opacity text-opora-brown"
              >
                <SliderArrowRightIcon className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>

        {/* Контейнер з картками */}
        <div
          ref={scrollContainerRef}
          className="flex pl-4 pr-4 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-pl-4 hide-scrollbar pb-4 pt-2"
        >
          {items.map((product, index) => (
            <div
              key={product.id}
              className="shrink-0 w-65 md:w-75 lg:w-[320px] snap-start"
            >
              <ProductCard product={product} initialIndex={index} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
