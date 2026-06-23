"use client";

import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const ALL_CATEGORIES = [
  { label: "Всі", value: "All" },
  { label: "Крісла", value: "Chair" },
  { label: "Столи", value: "Table" },
  { label: "Табуретки", value: "Nightstand" },
];

export interface FilterOption { label: string; hex?: string; categories: string[]; }
export interface SpecFilterGroup { specName: string; values: string[]; }
export interface OptionFilterGroup {
  groupName: string;
  categories: string[]; // ProductType[]; адмін-обмеження групи, порожньо = всі
  values: FilterOption[];
}
export interface DynamicFilters {
  optionFilters: OptionFilterGroup[];
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

function parsePrefixedFiltersFromUrl(searchParams: URLSearchParams, prefix: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = value.split(",");
    }
  });
  return result;
}


const FilterContent = forwardRef<FilterContentRef, FilterContentProps>(
  function FilterContent({ onClose, filters, categories, onApply, inline, hideApplyButton }, ref) {
    const searchParams = useSearchParams();

    const [activeType, setActiveType] = useState(searchParams.get("type") || "All");
    const [optionSelections, setOptionSelections] = useState<Record<string, string[]>>(
      parsePrefixedFiltersFromUrl(searchParams, "optFilter_")
    );
    const [specSelections, setSpecSelections] = useState<Record<string, string[]>>(
      parsePrefixedFiltersFromUrl(searchParams, "specFilter_")
    );

    const handleCategoryChange = (newType: string) => {
      setActiveType(newType);
    };

    const toggleGroupSelection = (
      setSelections: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
      groupName: string,
      value: string,
    ) => {
      setSelections(prev => {
        const current = prev[groupName] || [];
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        return { ...prev, [groupName]: next };
      });
    };

    const toggleSpecSelection = (specName: string, value: string) =>
      toggleGroupSelection(setSpecSelections, specName, value);

    const applyFilters = () => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("type", activeType);

      const keysToDelete: string[] = [];
      params.forEach((_, key) => {
        if (key.startsWith("specFilter_") || key.startsWith("optFilter_")) keysToDelete.push(key);
      });
      keysToDelete.forEach((key) => params.delete(key));
      if (activeType !== "All") {
        for (const [groupName, vals] of Object.entries(optionSelections)) {
          if (vals.length > 0) params.set("optFilter_" + groupName, vals.join(','));
        }
      }
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

    // Опції-фільтри показуємо лише при обраній категорії (не на «Всі»),
    // а значення фільтруємо за категорією товарів, що їх використовують.
    const visibleOptionFilters =
      activeType === "All"
        ? []
        : filters.optionFilters
            .filter((group) => group.categories.length === 0 || group.categories.includes(activeType))
            .map((group) => ({
              ...group,
              values: group.values.filter((v) => v.categories.includes(activeType)),
            }))
            .filter((group) => group.values.length > 0);

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

          {visibleOptionFilters.map((group) => {
            const selected = optionSelections[group.groupName] || [];
            return (
              <FilterAccordion key={group.groupName} title={group.groupName}>
                <label className="flex items-center gap-3 cursor-pointer group mb-3">
                  <div className="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center bg-white group-hover:scale-110 transition-transform">
                    {selected.length === 0 && <div className="w-2.5 h-2.5 bg-opora-brown rounded-full" />}
                  </div>
                  <span className={`text-lg font-light ${selected.length === 0 ? "font-medium underline underline-offset-4" : ""}`}>Усі</span>
                  <input type="checkbox" className="hidden" checked={selected.length === 0} onChange={() => setOptionSelections(prev => ({ ...prev, [group.groupName]: [] }))} />
                </label>
                {group.values.map((c) => (
                  <label key={c.label} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full shadow-sm transition-transform ${selected.includes(c.label) ? 'ring-2 ring-opora-brown ring-offset-1 scale-110' : 'border border-black/10 group-hover:scale-110'}`} style={{ backgroundColor: c.hex }} />
                    <span className={`text-lg font-light ${selected.includes(c.label) ? "font-medium underline underline-offset-4" : ""}`}>{c.label.includes(':') ? c.label.split(':').pop()!.trim() : c.label}</span>
                    <input type="checkbox" className="hidden" checked={selected.includes(c.label)} onChange={() => toggleGroupSelection(setOptionSelections, group.groupName, c.label)} />
                  </label>
                ))}
              </FilterAccordion>
            );
          })}

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
