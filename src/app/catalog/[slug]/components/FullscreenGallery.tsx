// Повноекранна галерея (модалка зі свайпом та мініатюрами)
"use client";

import { RefObject, UIEvent, WheelEvent } from "react";

interface FullscreenGalleryProps {
  images: string[];
  isOpen: boolean;
  activeSlide: number;
  sliderRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onWheel: (e: WheelEvent<HTMLDivElement>) => void;
  onThumbClick: (index: number) => void;
}

export default function FullscreenGallery({
  images,
  isOpen,
  activeSlide,
  sliderRef,
  onClose,
  onScroll,
  onWheel,
  onThumbClick,
}: FullscreenGalleryProps) {
  return (
    <div
      className={`fixed inset-0 z-[100] bg-white flex flex-col h-[100dvh] transition-all duration-500 ease-in-out transform ${
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-8 pointer-events-none"
      }`}
    >
      {/* Кнопка закриття */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
        <button
          onClick={onClose}
          className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Закрити галерею"
        >
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L13 13M1 13L13 1" stroke="#333333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Головне зображення зі свайпом */}
      <div
        ref={sliderRef}
        onScroll={onScroll}
        onWheel={onWheel}
        className="flex-1 overflow-x-auto flex snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pt-16 md:pt-0"
      >
        {images.map((img, idx) => (
          <div key={idx} className="w-full shrink-0 snap-center h-full flex items-center justify-center p-4 md:p-12">
            <img src={img} alt={`Gallery image ${idx + 1}`} className="max-w-full max-h-full object-contain" />
          </div>
        ))}
      </div>

      {/* Ряд мініатюр */}
      <div className="h-24 md:h-32 shrink-0 flex items-center justify-center gap-2 md:gap-4 px-4 overflow-x-auto pb-4 md:pb-8">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => onThumbClick(idx)}
            className={`w-16 h-16 md:w-20 md:h-20 shrink-0 border-2 transition-all overflow-hidden ${
              activeSlide === idx ? 'border-opora-brown scale-105' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
