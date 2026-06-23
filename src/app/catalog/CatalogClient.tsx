"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Drawer from "@/components/layout/Drawer";
import FilterContent, { DynamicFilters, FilterContentRef } from "@/components/blocks/FilterContent";
import SortContent from "@/components/blocks/SortContent";
import ProductCard from "@/components/ui/ProductCard";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";
import { FiltersIcon, SortingIcon } from "@/components/ui/Icons";
import { CatalogProductDetails } from "@/lib";
import { trackEvent } from "@/lib/analytics/umami";

type CatalogClientProps = {
  initialProducts: CatalogProductDetails[],
  filterOptions: DynamicFilters,
  categories: string[],
  // Банер каталогу з таблиці «Банери» (R2). Поки немає — мок нижче.
  heroImage?: string | null,
}

// Мок-зображення банера каталогу (fallback, поки в базі немає свого фото).
const MOCK_CATALOG_HERO = "/images/catalog-hero.jpg";

export default function CatalogClient({ initialProducts, filterOptions, categories, heroImage }: CatalogClientProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sidebarFilterRef = useRef<FilterContentRef>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedColors = useMemo(() => {
    const colors: string[] = [];
    searchParams.forEach((val, key) => {
      if (key.startsWith("optFilter_") && val) colors.push(...val.split(","));
    });
    return colors;
  }, [searchParams]);

  const navigate = (queryString: string) => {
    startTransition(() => {
      router.push(`${pathname}?${queryString}`, { scroll: false });
    });
  };

  const handleFilterApply = (queryString: string) => {
    trackEvent("Фільтр каталогу", { query: queryString });
    navigate(queryString);
  };

  const handleSortApply = (queryString: string) => {
    trackEvent("Сортування каталогу", { query: queryString });
    navigate(queryString);
  };

  return (
    <main className="min-h-screen bg-opora-white pb-24">

      <section className="relative w-full h-[50svh] md:h-[60svh] bg-opora-softBeige overflow-hidden pt-24">
        <Image
          src={heroImage || MOCK_CATALOG_HERO}
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-md">
            Каталог
          </h1>
          <p className="text-white max-w-md drop-shadow-md font-light">
            Мінімалістичні рішення, що стають головним акцентом вашого інтер'єру.
          </p>
        </div>
      </section>

      {/* Filter/Sort toolbar — mobile only */}
      <div className="lg:hidden w-full bg-opora-white border-b border-opora-brown/10 py-6">
        <div className="max-w-7xl mx-auto flex justify-center gap-16 md:gap-32 text-opora-brown">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-3 font-medium hover:opacity-70 transition-opacity text-lg"
          >
            Фільтр <FiltersIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSortOpen(true)}
            className="flex items-center gap-3 font-medium hover:opacity-70 transition-opacity text-lg"
          >
            Сортування <SortingIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content: desktop sidebar + product grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 lg:flex lg:gap-12 lg:items-start">

        {/* Desktop sidebar — hidden on mobile */}
        <aside
          className="hidden lg:flex flex-col w-72 shrink-0 sticky transition-[top] duration-300 ease-in-out"
          style={{
            top: 'var(--header-offset, 2rem)',
            height: 'calc(100vh - 7rem)',
          }}
        >
          <div className="flex flex-col h-full">

            <div className="flex flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto pl-4 space-y-8 pb-4">
                <div className="pb-8 border-b border-opora-brown/10">
                  <SortContent onClose={() => {}} onApply={handleSortApply} />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-6 text-opora-brown text-center">Фільтри</h3>
                  <FilterContent
                    ref={sidebarFilterRef}
                    inline
                    hideApplyButton
                    onClose={() => {}}
                    filters={filterOptions}
                    categories={categories}
                    onApply={handleFilterApply}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-opora-brown/10 bg-opora-white">
              <button
                onClick={() => sidebarFilterRef.current?.applyFilters()}
                className="w-full py-4 bg-opora-brown text-white text-lg font-medium hover:opacity-90 transition-opacity"
              >
                Показати товари
              </button>
            </div>

          </div>
        </aside>

        {/* Product grid */}
        <section className="flex-1 min-w-0">
          {isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-16 gap-x-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : initialProducts.length === 0 ? (
            <div className="text-center text-opora-brown/60 py-20">
              <p className="text-xl">За вашим запитом товарів не знайдено.</p>
              <p className="mt-2 font-light">Спробуйте змінити параметри фільтру.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-16 gap-x-8">
              {initialProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selectedColors={selectedColors}
                  initialIndex={index}
                />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Mobile: filter opens from the right, sort from the left */}
      <Drawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} position="right">
        <FilterContent onClose={() => setIsFilterOpen(false)} filters={filterOptions} categories={categories} onApply={handleFilterApply} />
      </Drawer>

      <Drawer isOpen={isSortOpen} onClose={() => setIsSortOpen(false)} position="left">
        <SortContent onClose={() => setIsSortOpen(false)} onApply={handleSortApply} />
      </Drawer>

    </main>
  );
}
