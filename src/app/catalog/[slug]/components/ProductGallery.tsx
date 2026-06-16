// Галерея зображень: слайдер по одному фото на мобільних, сітка квадратів 2 в ряд на десктопі
"use client";

import { UIEvent, useRef, useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  images: string[];
  onImageClick: (index: number) => void;
}

// Одне фото з кросфейдом при зміні варіації.
// Поки нове фото вантажиться — лишається видимим попереднє (на одну позицію),
// а нове плавно проявляється зверху. Так немає «миготіння» беж-скелетона при зміні кольору.
// Скелетон показуємо лише на найпершому завантаженні, коли під низом ще нічого немає.
interface GalleryImageProps {
  src: string;
  alt: string;
  priority: boolean;
  sizes: string;
  className: string;
  onClick: () => void;
  wrapperClassName: string;
}

function GalleryImage({ src, alt, priority, sizes, className, onClick, wrapperClassName }: GalleryImageProps) {
  // Останнє фото, яке повністю завантажилось (показуємо під низом під час переходу).
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const isCurrentLoaded = loadedSrc === src;
  const hasPrevious = loadedSrc !== null;

  return (
    <div onClick={onClick} className={wrapperClassName}>
      {/* Скелетон — лише на найпершому завантаженні (немає попереднього фото під низом) */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 bg-opora-softBeige transition-opacity duration-300 ${
          hasPrevious ? "opacity-0 animate-none" : "opacity-100 animate-pulse"
        }`}
      />

      {/* Попереднє фото лишається видимим під новим, поки нове не завантажиться */}
      {loadedSrc && !isCurrentLoaded && (
        <Image
          src={loadedSrc}
          alt={alt}
          fill
          sizes={sizes}
          className={`${className} z-10`}
        />
      )}

      {/* Цільове фото: проявляється зверху по завантаженні (миттєво, якщо вже в кеші) */}
      <Image
        key={src}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        // Якщо фото вже в кеші — img.complete === true одразу при монтуванні.
        ref={(node) => {
          if (node?.complete) setLoadedSrc(src);
        }}
        onLoad={() => setLoadedSrc(src)}
        className={`${className} z-20 transition-opacity duration-300 ${
          isCurrentLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
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
            // key за позицією (idx), а не src — компонент лишається змонтованим при зміні
            // варіації, тож кросфейд між старим і новим фото працює без миготіння.
            <GalleryImage
              key={`m-${idx}`}
              src={img}
              alt={`Фото товару ${idx + 1}`}
              sizes="100vw"
              priority={idx === 0}
              onClick={() => onImageClick(idx)}
              wrapperClassName="w-full shrink-0 snap-center aspect-square bg-opora-softBeige overflow-hidden relative cursor-pointer"
              className="object-cover object-center"
            />
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
          <GalleryImage
            key={`d-${idx}`}
            src={img}
            alt={`Фото товару ${idx + 1}`}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={idx === 0}
            onClick={() => onImageClick(idx)}
            wrapperClassName="aspect-square bg-opora-softBeige overflow-hidden relative cursor-pointer group"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ))}
      </div>
    </>
  );
}
