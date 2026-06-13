// Права колонка: компактний блок покупки (назва, ціна, опис, вибір кольору, кнопка)
"use client";

import { Option, Product, Variant, hexColor } from "./types";

interface BuyBoxProps {
  product: Product;
  activeVariant: Variant | null;
  qty: number;
  optionGroups: Option[][];
  onQtyChange: (qty: number) => void;
  onOptionSelect: (optionIndex: number, value: string) => void;
  isOptionAvailable: (optionIndex: number, value: string) => boolean;
  onAddToCart: () => void;
  onReadMore: () => void;
}

// Короткий опис із сирого markdown (без розмітки)
const buildShortDescription = (description: string, limit = 160) => {
  const plain = (description || "")
    .replace(/[#*_>`~[\]()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    text: plain.length > limit ? plain.slice(0, limit).trimEnd() : plain,
    truncated: plain.length > limit,
  };
};

export default function BuyBox({
  product,
  activeVariant,
  qty,
  optionGroups,
  onQtyChange,
  onOptionSelect,
  isOptionAvailable,
  onAddToCart,
  onReadMore,
}: BuyBoxProps) {
  const isUnavailable = !activeVariant || !activeVariant.inStock;
  const short = buildShortDescription(product.description);

  return (
    <div>
      {/* На мобільному — вертикальний стек (щоб артикул не накладався на кольори);
          на десктопі — назва/ціна зліва, вибір кольору справа */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-medium tracking-wide mb-1">
            {product.model || product.name}
          </h1>
          <p className="text-xs opacity-60 mb-4">Art: {activeVariant?.sku || 'N/A'}</p>

          {/* Ціна оновлюється залежно від активної варіації та кількості */}
          <p className="text-xl">
            {((activeVariant?.price || product.minPrice) * qty).toLocaleString('uk-UA')} ₴
          </p>
        </div>

        {/* Вибір варіації */}
        {product.variants && product.variants.length > 0 && (
          <div className="flex flex-col items-start md:items-end gap-3 md:pt-2">
            {optionGroups.map((optionGroup, groupIdx) => (
              <div key={groupIdx} className="flex flex-col items-start md:items-end gap-1">
                <span className="text-xs text-gray-500 mb-1">
                  {activeVariant?.options[groupIdx]?.name ?? `Колір ${groupIdx + 1}`}
                </span>
                {/* На мобільному кружечки більші й переносяться у 2 ряди */}
                <div className="flex items-center gap-2.5 md:gap-2 flex-wrap justify-start md:justify-end">
                  {optionGroup.map((opt) => {
                    const available = isOptionAvailable(groupIdx, opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => onOptionSelect(groupIdx, opt.value)}
                        className={`relative w-8 h-8 md:w-6 md:h-6 rounded-full transition-all duration-200 overflow-hidden shrink-0 ${
                          activeVariant?.options[groupIdx]?.value === opt.value
                            ? 'ring-1 ring-gray-900 ring-offset-2 ring-offset-white scale-110'
                            : 'ring-1 ring-gray-900/60 ring-offset-0 hover:ring-gray-900 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hexColor(opt.value) }}
                        title={available ? opt.name : `${opt.name} — немає в наявності`}
                      >
                        {!available && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-red-300/80"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Короткий опис із посиланням на повний опис */}
      {short.text && (
        <p className="text-sm text-stone-600 leading-relaxed border-t border-stone-200 pt-6 mb-6">
          {short.text}
          {short.truncated && (
            <>
              …{' '}
              <button
                onClick={onReadMore}
                className="text-stone-900 underline underline-offset-2 hover:text-amber-800 transition-colors"
              >
                Більше
              </button>
            </>
          )}
        </p>
      )}

      <div className="flex items-center gap-6 mb-6">
        <button onClick={() => onQtyChange(Math.max(1, qty - 1))} className="text-xl w-6 hover:opacity-70">-</button>
        <span className="text-lg font-light">{qty}</span>
        <button onClick={() => onQtyChange(qty + 1)} className="text-xl w-6 hover:opacity-70">+</button>
      </div>

      <button
        onClick={onAddToCart}
        className={`w-full py-4 text-white font-medium transition-opacity ${
          isUnavailable ? 'bg-gray-400 cursor-not-allowed' : 'bg-opora-brown hover:opacity-90'
        }`}
        disabled={isUnavailable}
      >
        {isUnavailable ? 'Немає в наявності' : 'Додати до кошика'}
      </button>
    </div>
  );
}
