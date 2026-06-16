"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CatalogProductDetails, VariationImage, MOCK_PRODUCT_IMAGES } from '@/lib';
import { toHue } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics/umami';

export default function ProductCard({
  product,
  selectedColors = [],
}: {
  product: CatalogProductDetails;
  selectedColors?: string[];
}) {
  // Чи відповідає варіація хоча б одному з обраних у фільтрі кольорів
  const matchesFilter = (variation: VariationImage) =>
    selectedColors.length > 0 &&
    (variation.allHexes ?? []).some((h) => selectedColors.includes(h.name));

  // Свотч може бути одинарним або розділеним навпіл (оббивка + ніжки).
  // Сортуємо за основним кольором (перший hex), розділені — з другим кольором як tiebreaker.
  // Якщо застосовано фільтр кольору — варіації, що йому відповідають, виносимо вперед,
  // щоб обрані кольори були видні одразу на картці.
  const variations = useMemo(() => {
    const sorted = [...(product.variations || [])].sort((a, b) => {
      const ah = a.allHexes ?? [], bh = b.allHexes ?? [];
      return (
        toHue(ah[0]?.hex) - toHue(bh[0]?.hex) ||
        toHue(ah[1]?.hex) - toHue(bh[1]?.hex)
      );
    });
    if (selectedColors.length === 0) return sorted;
    return sorted.sort((a, b) => Number(matchesFilter(b)) - Number(matchesFilter(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.variations, selectedColors]);

  // State to track which color variation the user is currently looking at —
  // за замовчуванням показуємо першу варіацію, що відповідає фільтру (якщо є)
  const [activeVariation, setActiveVariation] = useState<VariationImage | undefined>(
    variations.find(matchesFilter) ?? variations[0]
  );

  // Коли змінюється фільтр (а товар лишається у списку) — переключаємо активну
  // варіацію на ту, що відповідає обраним кольорам.
  useEffect(() => {
    if (selectedColors.length === 0) return;
    const matched = variations.find(matchesFilter);
    if (matched) setActiveVariation(matched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColors]);

  // Safely extract the images for the *currently active* variation.
  // Якщо фото немає взагалі — показуємо тимчасові мок-зображення.
  // Картки показують стиснені версії (легші, напряму з R2); fallback на оригінали/моки.
  const cardImages = activeVariation?.imagesCompressed ?? activeVariation?.images;
  const primaryImage = cardImages?.[0] || MOCK_PRODUCT_IMAGES[0];
  const secondaryImage = cardImages?.[1] || MOCK_PRODUCT_IMAGES[1] || primaryImage;

  // Pick 4 variations evenly spaced across the hue-sorted array — maximally diverse palette
  const swatchesToShow = useMemo(() => {
    return [2, 3, 7, 10].map(i => variations[i]).filter(Boolean);
  }, [variations]);

  // Helper to render single or split-color circles
  const getSwatchStyle = (variation: any) => {
    const hexes = variation.allHexes;
    if (hexes.length === 2) {
      // Changing 50% to 49.5% and 50.5% fixes the jagged pixelated line!
      return { background: `linear-gradient(135deg, ${hexes[0].hex} 49.5%, ${hexes[1].hex} 50.5%)` };
    }
    return { backgroundColor: hexes?.[0]?.hex || '#CCCCCC' };
  };

  return (
    <div className="shrink-0 w-full group">
      
      {/* Product Link Area (Image + Text) */}
      <Link
        href={product.href}
        className="block w-full"
        onClick={() => trackEvent("Клік по товару", { name: product.name, href: product.href })}
      >
        {/* Image Container with Hover Crossfade */}
        <div className="relative aspect-square w-full overflow-hidden mb-4 bg-opora-softBeige rounded-sm shadow-sm transition-shadow duration-300 group-hover:shadow-md">
          
          {/* Primary Image */}
          <Image
            src={primaryImage}
            alt={`${product.name} primary view`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="absolute inset-0 object-cover w-full h-full transition-opacity duration-500 ease-in-out group-hover:opacity-0"
          />

          {/* Secondary Image (Revealed on hover) */}
          <Image
            src={secondaryImage}
            alt={`${product.name} alternate view`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="absolute inset-0 object-cover w-full h-full transition-opacity duration-500 ease-in-out opacity-0 group-hover:opacity-100"
          />
        </div>
      </Link>

      {/* Interactive Controls & Info Area */}
      <div className="flex flex-col">
        
        {/* Color Palette (Interactive) */}
        {variations.length > 0 && (
          <div
            className="flex items-center gap-3 mb-3 h-6"
            onClick={(e) => e.preventDefault()}
          >
            {swatchesToShow.map((variation) => {
              const isActive = activeVariation?.id === variation.id;
              const isMatch = matchesFilter(variation);
              return (
                <button
                  key={variation.id}
                  onMouseEnter={() => setActiveVariation(variation)}
                  onClick={() => {
                    setActiveVariation(variation);
                    trackEvent("Вибір кольору", {
                      product: product.name,
                      color: variation.allHexes.map((h: { name: string }) => h.name).join(" / "),
                    });
                  }}
                  className={`rounded-full transition-all duration-300 focus:outline-none ${
                    isActive
                      ? 'scale-110 ring-1 ring-opora-brown ring-offset-2'
                      : isMatch
                        ? 'ring-1 ring-opora-brown/50 ring-offset-2 hover:scale-110'
                        : 'hover:scale-110'
                  }`}
                  aria-label={`Переглянути колір: ${variation.allHexes.map((h: any) => h.name).join(' / ')}`}
                >
                  <span
                    className="block w-6 h-6 rounded-full overflow-hidden shadow-sm border border-opora-softBeige"
                    style={getSwatchStyle(variation)}
                  />
                </button>
              );
            })}
            {variations.length > 4 && (
              <span className="text-sm text-opora-brown/60 font-light ml-1">
                +{variations.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Product Text Details */}
        <Link
          href={product.href}
          className="block"
          onClick={() => trackEvent("Клік по товару", { name: product.name, href: product.href })}
        >
          <h3 className="text-xl md:text-2xl font-medium text-opora-brown mb-1">
            {product.name}
          </h3>
          <p className="text-lg md:text-xl font-light text-opora-brown/80">
            {product.price > 0 ? `${product.price.toLocaleString('uk-UA')} ₴` : 'Ціну уточнюйте'}
          </p>
        </Link>
      </div>
    </div>
  );
}