// src/components/blocks/FilterContent.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const CATEGORIES = [
  { label: "Всі", value: "All" },
  { label: "Крісла", value: "Chair" },
  { label: "Столи", value: "Table" },
  { label: "Тумбочки", value: "Nightstand" },
];

export interface FilterOption { label: string; hex?: string; }
export interface DynamicFilters { seatColors: FilterOption[]; legColors: FilterOption[]; tableColors: FilterOption[]; }

interface FilterContentProps {
  onClose: () => void;
  filters: DynamicFilters;
  // Called with the new query string; the parent owns navigation (so it can
  // wrap it in a transition and show the loading skeleton).
  onApply: (queryString: string) => void;
}

const FilterAccordion = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-opora-brown/10 pb-4 last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 font-bold w-full text-left hover:opacity-70 transition-opacity">
        <span className="text-xl font-light w-4 text-center leading-none">{isOpen ? '−' : '+'}</span> {title}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
        <div className="space-y-3 ml-7">{children}</div>
      </div>
    </div>
  );
};

export default function FilterContent({ onClose, filters, onApply }: FilterContentProps) {
  const searchParams = useSearchParams();

  const parseUrlParam = (paramName: string) => {
    const val = searchParams.get(paramName);
    return val ? val.split(',') : [];
  };

  const [activeType, setActiveType] = useState(searchParams.get("type") || "All");
  const [seatColors, setSeatColors] = useState<string[]>(parseUrlParam("seatColor"));
  const [legColors, setLegColors] = useState<string[]>(parseUrlParam("legColor"));
  const [tableColors, setTableColors] = useState<string[]>(parseUrlParam("tableColor"));

  // NEW: Handle Category Change and Clear Irrelevant Filters
  const handleCategoryChange = (newType: string) => {
    setActiveType(newType);
    
    // If we switch away from Chairs, clear Seat colors
    if (newType !== "Chair" && newType !== "All") {
      setSeatColors([]);
    }
    // If we switch away from Tables, clear Table colors
    if (newType !== "Table" && newType !== "All") {
      setTableColors([]);
    }
    // Note: Leg colors apply to everything, so we don't clear them!
  };

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, colorLabel: string) => {
    setter(prev => 
      prev.includes(colorLabel) 
        ? prev.filter(c => c !== colorLabel) 
        : [...prev, colorLabel]              
    );
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", activeType);
    
    if (seatColors.length > 0) params.set("seatColor", seatColors.join(',')); else params.delete("seatColor");
    if (legColors.length > 0) params.set("legColor", legColors.join(',')); else params.delete("legColor");
    if (tableColors.length > 0) params.set("tableColor", tableColors.join(',')); else params.delete("tableColor");

    onApply(params.toString());
    onClose();
  };

  return (
    <div className="flex flex-col h-full text-opora-brown">
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        
        {/* Category Accordion */}
        <FilterAccordion title="Категорія">
          {CATEGORIES.map((cat) => (
            <label key={cat.value} className="flex items-center gap-3 cursor-pointer group">
              <div className="w-4 h-4 rounded-full border border-opora-brown flex items-center justify-center group-hover:bg-opora-brown/10 transition-colors">
                {activeType === cat.value && <div className="w-2.5 h-2.5 bg-opora-brown rounded-full" />}
              </div>
              <span className="text-lg font-light">{cat.label}</span>
              <input 
                type="radio" 
                className="hidden" 
                checked={activeType === cat.value} 
                onChange={() => handleCategoryChange(cat.value)} // Updated to use the new handler
              />
            </label>
          ))}
        </FilterAccordion>

        {/* Chair Colors (Seat) */}
        {(activeType === "Chair" || activeType === "All") && filters.seatColors.length > 0 && (
          <FilterAccordion title="Колір сидіння">
            <label className="flex items-center gap-3 cursor-pointer group mb-3">
              <div className="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center bg-white group-hover:scale-110 transition-transform">
                {seatColors.length === 0 && <div className="w-2.5 h-2.5 bg-opora-brown rounded-full" />}
              </div>
              <span className={`text-lg font-light ${seatColors.length === 0 ? "font-medium underline underline-offset-4" : ""}`}>Усі</span>
              <input type="checkbox" className="hidden" checked={seatColors.length === 0} onChange={() => setSeatColors([])} />
            </label>

            {filters.seatColors.map((c) => (
              <label key={c.label} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full shadow-sm transition-transform ${seatColors.includes(c.label) ? 'ring-2 ring-opora-brown ring-offset-1 scale-110' : 'border border-black/10 group-hover:scale-110'}`} style={{ backgroundColor: c.hex }} />
                <span className={`text-lg font-light ${seatColors.includes(c.label) ? "font-medium underline underline-offset-4" : ""}`}>{c.label.includes(':') ? c.label.split(':').pop()!.trim() : c.label}</span>
                <input type="checkbox" className="hidden" checked={seatColors.includes(c.label)} onChange={() => toggleSelection(setSeatColors, c.label)} />
              </label>
            ))}
          </FilterAccordion>
        )}

        {/* Table Colors */}
        {(activeType === "Table" || activeType === "All") && filters.tableColors.length > 0 && (
          <FilterAccordion title="Колір стола">
            <label className="flex items-center gap-3 cursor-pointer group mb-3">
              <div className="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center bg-white group-hover:scale-110 transition-transform">
                {tableColors.length === 0 && <div className="w-2.5 h-2.5 bg-opora-brown rounded-full" />}
              </div>
              <span className={`text-lg font-light ${tableColors.length === 0 ? "font-medium underline underline-offset-4" : ""}`}>Усі</span>
              <input type="checkbox" className="hidden" checked={tableColors.length === 0} onChange={() => setTableColors([])} />
            </label>

            {filters.tableColors.map((c) => (
              <label key={c.label} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full shadow-sm transition-transform ${tableColors.includes(c.label) ? 'ring-2 ring-opora-brown ring-offset-1 scale-110' : 'border border-black/10 group-hover:scale-110'}`} style={{ backgroundColor: c.hex }} />
                <span className={`text-lg font-light ${tableColors.includes(c.label) ? "font-medium underline underline-offset-4" : ""}`}>{c.label.includes(':') ? c.label.split(':').pop()!.trim() : c.label}</span>
                <input type="checkbox" className="hidden" checked={tableColors.includes(c.label)} onChange={() => toggleSelection(setTableColors, c.label)} />
              </label>
            ))}
          </FilterAccordion>
        )}

        {/* Common Filters (Legs) */}
        {filters.legColors.length > 0 && (
          <FilterAccordion title="Колір ніжок">
            <label className="flex items-center gap-3 cursor-pointer group mb-3">
              <div className="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center bg-white group-hover:scale-110 transition-transform">
                {legColors.length === 0 && <div className="w-2.5 h-2.5 bg-opora-brown rounded-full" />}
              </div>
              <span className={`text-lg font-light ${legColors.length === 0 ? "font-medium underline underline-offset-4" : ""}`}>Усі</span>
              <input type="checkbox" className="hidden" checked={legColors.length === 0} onChange={() => setLegColors([])} />
            </label>

            {filters.legColors.map((c) => (
              <label key={c.label} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full shadow-sm transition-transform ${legColors.includes(c.label) ? 'ring-2 ring-opora-brown ring-offset-1 scale-110' : 'border border-black/10 group-hover:scale-110'}`} style={{ backgroundColor: c.hex }} />
                <span className={`text-lg font-light ${legColors.includes(c.label) ? "font-medium underline underline-offset-4" : ""}`}>{c.label.includes(':') ? c.label.split(':').pop()!.trim() : c.label}</span>
                <input type="checkbox" className="hidden" checked={legColors.includes(c.label)} onChange={() => toggleSelection(setLegColors, c.label)} />
              </label>
            ))}
          </FilterAccordion>
        )}

      </div>

      <div className="pt-6 mt-auto bg-opora-white">
        <button onClick={applyFilters} className="w-full py-4 bg-opora-brown text-white text-lg font-medium hover:opacity-90 transition-opacity">
          Показати товари
        </button>
      </div>
    </div>
  );
}