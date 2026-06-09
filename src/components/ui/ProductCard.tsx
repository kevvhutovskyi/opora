"use client";

import { useState } from 'react';
import Link from 'next/link';
import { CatalogProductDetails, VariationImage } from '@/lib';
import { toHue } from '@/lib/utils';

export default function ProductCard({ product }: { product: CatalogProductDetails }) {
  // Свотч може бути одинарним або розділеним навпіл (оббивка + ніжки).
  // Сортуємо за основним кольором (перший hex), розділені — з другим кольором як tiebreaker.
  const variations = [...(product.variations || [])].sort((a, b) => {
    const ah = a.allHexes ?? [], bh = b.allHexes ?? [];
    return (
      toHue(ah[0]?.hex) - toHue(bh[0]?.hex) ||
      toHue(ah[1]?.hex) - toHue(bh[1]?.hex)
    );
  });

  // State to track which color variation the user is currently looking at
  const [activeVariation, setActiveVariation] = useState<VariationImage | undefined>(variations[0]);

  // Safely extract the images for the *currently active* variation
  const primaryImage = activeVariation?.images?.[0] || '/placeholder.png';
  const secondaryImage = activeVariation?.images?.[1] || primaryImage; 

  // Max swatches to display
  const swatchesToShow = variations.slice(0, 4);
  const remainingSwatches = variations.length > 4 ? variations.length - 4 : 0;

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
    <div className="flex-shrink-0 w-full group">
      
      {/* Product Link Area (Image + Text) */}
      <Link 
        href={product.href}
        className="block w-full"
      >
        {/* Image Container with Hover Crossfade */}
        <div className="relative aspect-square w-full overflow-hidden mb-4 bg-opora-softBeige rounded-sm shadow-sm transition-shadow duration-300 group-hover:shadow-md">
          
          {/* Primary Image */}
          <img 
            src={primaryImage} 
            alt={`${product.name} primary view`}
            className="absolute inset-0 object-cover w-full h-full transition-opacity duration-500 ease-in-out group-hover:opacity-0"
          />

          {/* Secondary Image (Revealed on hover) */}
          <img 
            src={secondaryImage} 
            alt={`${product.name} alternate view`}
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
            onClick={(e) => e.preventDefault()} // Prevent link triggering if placed inside a Link
          >
            {swatchesToShow.map((variation) => {
              const isActive = activeVariation?.id === variation.id;
              
              return (
                <button
                  key={variation.id} 
                  onMouseEnter={() => setActiveVariation(variation)}
                  onClick={() => setActiveVariation(variation)}
                  className={`rounded-full transition-all duration-300 focus:outline-none ${
                    isActive 
                      ? 'scale-110 ring-1 ring-opora-brown ring-offset-2' 
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
    
            {remainingSwatches > 0 && (
              <span className="text-sm text-opora-brown/60 font-light ml-1">
                +{remainingSwatches}
              </span>
            )}
          </div>
        )}

        {/* Product Text Details */}
        <Link href={product.href} className="block">
          <h3 className="text-xl md:text-2xl font-medium text-opora-brown uppercase mb-1">
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