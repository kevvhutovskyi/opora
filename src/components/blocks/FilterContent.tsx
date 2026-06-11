"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { useSearchParams } from "next/navigation";

const ALL_CATEGORIES = [
  { label: "Всі", value: "All" },
  { label: "Крісла", value: "Chair" },
  { label: "Столи", value: "Table" },
  { label: "Тумбочки", value: "Nightstand" },
];

export interface FilterOption { label: string; hex?: string; }
export interface SpecFilterGroup { specName: string; values: string[]; }
export interface DynamicFilters {
  seatColors: FilterOption[];
  legColors: FilterOption[];
  tableColors: FilterOption[];
  specFilters: SpecFilterGroup[];
}

export interface FilterContentRef {
  applyFilters: () => void;
}

interface FilterContentProps {
  onClose: () => void;
  filters: DynamicFilters;
  categories: string[];
  onApply: (queryString: string) => void;
  inline?: boolean;
  hideApplyButton?: boolean;
}

const FilterAccordion = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-opora-brown/10 pb-4 last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 font-bold w-full text-left hover:opacity-70 transition-opacity">
        <span className="text-xl font-light w-4 text-center leading-none">{isOpen ? '−' : '+'}</span> {title}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-125 opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
        <div className="space-y-3 ml-7">{children}</div>
      </div>
    </div>
  );
};

function parseSpecFiltersFromUrl(searchParams: URLSearchParams): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith("specFilter_")) {
      result[key.slice(11)] = value.split(",");
    }
  });
  return result;
}


const FilterContent = forwardRef<FilterContentRef, FilterContentProps>(
  function FilterContent({ onClose, filters, categories, onApply, inline, hideApplyButton }, ref) {
    const searchParams = useSearchParams();

    const parseUrlParam = (paramName: string) => {
      const val = searchParams.get(paramName);
      return val ? val.split(',') : [];
    };

    const [activeType, setActiveType] = useState(searchParams.get("type") || "All");
    const [seatColors, setSeatColors] = useState<string[]>(parseUrlParam("seatColor"));
    const [legColors, setLegColors] = useState<string[]>(parseUrlParam("legColor"));
    const [tableColors, setTableColors] = useState<string[]>(parseUrlParam("tableColor"));
    const [specSelections, setSpecSelections] = useState<Record<string, string[]>>(
      parseSpecFiltersFromUrl(searchParams)
    );

    const handleCategoryChange = (newType: string) => {
      setActiveType(newType);
      if (newType !== "Chair" && newType !== "All") setSeatColors([]);
      if (newType !== "Table" && newType !== "All") setTableColors([]);
    };

    const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, label: string) => {
      setter(prev => prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]);
    };

    const toggleSpecSelection = (specName: string, value: string) => {
      setSpecSelections(prev => {
        const current = prev[specName] || [];
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        return { ...prev, [specName]: next };
      });
    };

    const applyFilters = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("type", activeType);

      if (seatColors.length > 0) params.set("seatColor", seatColors.join(',')); else params.delete("seatColor");
      if (legColors.length > 0) params.set("legColor", legColors.join(',')); else params.delete("legColor");
      if (tableColors.length > 0) params.set("tableColor", tableColors.join(',')); else params.delete("tableColor");

      const keysToDelete: string[] = [];
      params.forEach((_, key) => { if (key.startsWith("specFilter_")) keysToDelete.push(key); });
      keysToDelete.forEach((key) => params.delete(key));
      for (const [specName, vals] of Object.entries(specSelections)) {
        if (vals.length > 0) params.set("specFilter_" + specName, vals.join(','));
      }

      onApply(params.toString());
      onClose();
    };

    useImperativeHandle(ref, () => ({ applyFilters }));

    const availableCategories = ALL_CATEGORIES.filter(
      (cat) => cat.value === "All" || categories.includes(cat.value)
    );
    const showCategoryFilter = categories.length > 1;

    return (
      <div className={`flex flex-col ${inline ? '' : 'h-full'} text-opora-brown`}>
        <div className={inline ? 'space-y-6 pr-2' : 'flex-1 overflow-y-auto space-y-6 pr-2'}>

          {showCategoryFilter && (
            <FilterAccordion title="Категорія">
              {availableCategories.map((cat) => (
                <label key={cat.value} className="flex items-center gap-3 cursor-pointer group">
                  <div className="w-4 h-4 rounded-full border border-opora-brown flex items-center justify-center group-hover:bg-opora-brown/10 transition-colors">
                    {activeType === cat.value && <div className="w-2.5 h-2.5 bg-opora-brown rounded-full" />}
                  </div>
                  <span className="text-lg font-light">{cat.label}</span>
                  <input type="radio" className="hidden" checked={activeType === cat.value} onChange={() => handleCategoryChange(cat.value)} />
                </label>
              ))}
            </FilterAccordion>
          )}

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

          {filters.specFilters.map((group) => (
            <FilterAccordion key={group.specName} title={group.specName}>
              <label className="flex items-center gap-3 cursor-pointer group mb-3">
                <div className="w-4 h-4 rounded-full border border-opora-brown flex items-center justify-center group-hover:bg-opora-brown/10 transition-colors">
                  {!(specSelections[group.specName]?.length > 0) && <div className="w-2.5 h-2.5 bg-opora-brown rounded-full" />}
                </div>
                <span className={`text-lg font-light ${!(specSelections[group.specName]?.length > 0) ? "font-medium underline underline-offset-4" : ""}`}>Усі</span>
                <input type="checkbox" className="hidden" checked={!(specSelections[group.specName]?.length > 0)} onChange={() => setSpecSelections(prev => ({ ...prev, [group.specName]: [] }))} />
              </label>
              {group.values.map((val) => {
                const isSelected = specSelections[group.specName]?.includes(val);
                return (
                  <label key={val} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 border transition-colors flex items-center justify-center ${isSelected ? 'bg-opora-brown border-opora-brown' : 'border-opora-brown/40 group-hover:border-opora-brown'}`}>
                      {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                    </div>
                    <span className={`text-lg font-light ${isSelected ? "font-medium underline underline-offset-4" : ""}`}>{val}</span>
                    <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleSpecSelection(group.specName, val)} />
                  </label>
                );
              })}
            </FilterAccordion>
          ))}

        </div>

        {!hideApplyButton && (
          <div className={inline ? 'pt-6' : 'pt-6 mt-auto bg-opora-white'}>
            <button onClick={applyFilters} className="w-full py-4 bg-opora-brown text-white text-lg font-medium hover:opacity-90 transition-opacity">
              Показати товари
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default FilterContent;
