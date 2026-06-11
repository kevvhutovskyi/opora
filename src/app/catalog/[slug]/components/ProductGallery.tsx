// Галерея зображень: слайдер по одному фото на мобільних, сітка квадратів 2 в ряд на десктопі
"use client";

import { UIEvent, useRef, useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  images: string[];
  onImageClick: (index: number) => void;
}

export default function ProductGallery({ images, onImageClick }: ProductGalleryProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el || !el.offsetWidth) return;
    setActiveSlide(Math.round(el.scrollLeft / el.offsetWidth));
  };

  return (
    <>
      {/* МОБІЛЬНИЙ: слайдер по одному фото з крапками */}
      <div className="relative lg:hidden">
        <div
          ref={sliderRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none"
        >
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => onImageClick(idx)}
              className="w-full shrink-0 snap-center aspect-square bg-opora-softBeige overflow-hidden relative cursor-pointer"
            >
              <Image
                src={img}
                alt={`Фото товару ${idx + 1}`}
                fill
                sizes="100vw"
                priority={idx === 0}
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 pointer-events-none">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'w-5 bg-opora-brown' : 'w-2 bg-opora-brown/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ДЕСКТОП: сітка квадратів 2 в ряд */}
      <div className="hidden lg:grid grid-cols-2 gap-4">
        {images.map((img, idx) => (
          <div
            key={idx}
            onClick={() => onImageClick(idx)}
            className="aspect-square bg-opora-softBeige overflow-hidden relative cursor-pointer group"
          >
            <Image
              src={img}
              alt={`Фото товару ${idx + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={idx === 0}
              className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    </>
  );
}
