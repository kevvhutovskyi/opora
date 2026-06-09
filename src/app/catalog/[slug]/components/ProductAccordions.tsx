// Акордеони товару: Опис / Характеристики / Збірка (ліва колонка під відео)
"use client";

import ReactMarkdown from "react-markdown";
import { PlusIcon, MinusIcon } from "@/components/ui/Icons";
import { Product } from "./types";

interface ProductAccordionsProps {
  product: Product;
  openSections: string[];
  onToggle: (section: string) => void;
  onDownloadPdf: (url: string, filename: string) => void;
}

export default function ProductAccordions({
  product,
  openSections,
  onToggle,
  onDownloadPdf,
}: ProductAccordionsProps) {
  const toggleIcon = (section: string) =>
    openSections.includes(section)
      ? <MinusIcon className="fill-amber-800 w-6 h-6" />
      : <PlusIcon className="fill-stone-400 group-hover:fill-amber-800 w-6 h-6 transition-colors" />;

  return (
    <div className="flex flex-col w-full border-t-2 border-stone-200">
      {/* 1. Опис */}
      <div id="accordion-desc" className="border-b-2 border-stone-200 scroll-mt-32">
        <button
          onClick={() => onToggle('desc')}
          className="flex items-center justify-between w-full py-5 text-xl font-medium text-stone-900 hover:text-amber-800 transition-colors group"
        >
          <span>Опис</span>
          <span className="transform transition-transform duration-300">{toggleIcon('desc')}</span>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSections.includes('desc') ? 'max-h-500 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pb-6 pt-2 text-stone-600 leading-relaxed text-base prose prose-stone max-w-none [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:my-1.5">
            <ReactMarkdown>{product.description.replace(/\n/g, '\n\n')}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* 2. Характеристики */}
      <div className="border-b-2 border-stone-200">
        <button
          onClick={() => onToggle('chars')}
          className="flex items-center justify-between w-full py-5 text-xl font-medium text-stone-900 hover:text-amber-800 transition-colors group"
        >
          <span>Характеристики</span>
          <span className="transform transition-transform duration-300">{toggleIcon('chars')}</span>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSections.includes('chars') ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pb-6 pt-2">
            <ul className="flex flex-col">
              {product.specifications?.map((spec, idx) => {
                const values = spec.value.split(',').map((v) => v.trim()).filter(Boolean);
                return (
                  <li key={idx} className="flex justify-between gap-4 py-3 border-b border-stone-200/60 last:border-0">
                    <span className="text-stone-500 shrink-0">{spec.name}</span>
                    {values.length > 1 ? (
                      <ul className="font-semibold text-stone-800 text-right space-y-1">
                        {values.map((v, i) => (
                          <li key={i} className="flex items-center justify-end gap-2">
                            <span>{v}</span>
                            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="font-semibold text-stone-800 text-right">{spec.value}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Збірка */}
      <div className="border-b-2 border-stone-200">
        <button
          onClick={() => onToggle('assembly')}
          className="flex items-center justify-between w-full py-5 text-xl font-medium text-stone-900 hover:text-amber-800 transition-colors group"
        >
          <span>Збірка</span>
          <span className="transform transition-transform duration-300">{toggleIcon('assembly')}</span>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSections.includes('assembly') ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pb-8 pt-2">
            <p className="text-stone-600 mb-6 text-base">
              Завантажте інструкцію по збірці у форматі PDF для детального ознайомлення.
            </p>
            <button
              onClick={() => {
                const pdfUrl = product.assemblyPdfUrl || "https://example.com/secured-cloudflare-url.pdf";
                const filename = `Інструкція_збірки_${product.model?.replace(/\s+/g, '_') || 'товар'}`;
                onDownloadPdf(pdfUrl, filename);
              }}
              className="inline-flex items-center justify-center border-2 border-amber-800 bg-amber-800 text-white py-3 px-8 font-bold uppercase tracking-widest text-xs hover:bg-transparent hover:text-amber-800 transition-all duration-300 rounded-sm"
            >
              Завантажити PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
