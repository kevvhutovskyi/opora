"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Drawer from "@/components/layout/Drawer";
import FilterContent, { DynamicFilters } from "@/components/blocks/FilterContent";
import SortContent from "@/components/blocks/SortContent";
import ProductCard from "@/components/ui/ProductCard";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";
import { FiltersIcon, SortingIcon } from "@/components/ui/Icons";
import { CatalogProductDetails } from "@/lib";

type CatalogClientProps = { 
  initialProducts: CatalogProductDetails[], 
  filterOptions: DynamicFilters 
}

export default function CatalogClient({ initialProducts, filterOptions }: CatalogClientProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Wrap navigation in a transition so `isPending` stays true while the server
  // re-fetches the filtered catalog — that's what drives the skeleton state.
  const navigate = (queryString: string) => {
    startTransition(() => {
      router.push(`${pathname}?${queryString}`);
    });
  };

  return (
    <main className="min-h-screen bg-opora-white pb-24">
      
      {/* 1. Catalog Hero Section */}
      <section className="relative w-full h-[50svh] md:h-[60svh] bg-opora-softBeige overflow-hidden pt-24">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(/images/catalog-hero.jpg)` }} 
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

      {/* 2. Control Bar (Natural Flow, NOT Sticky) */}
      <div className="w-full bg-opora-white border-b border-opora-brown/10 py-6">
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

      {/* 3. Product Grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 mt-12">
        {isPending ? (
          // Skeleton grid while the server re-fetches filtered results
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-8">
            {initialProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product} // Make sure your ProductCard expects a "product" prop containing the whole object
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Drawers */}
      <Drawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} position="left">
        <FilterContent onClose={() => setIsFilterOpen(false)} filters={filterOptions} onApply={navigate} />
      </Drawer>

      <Drawer isOpen={isSortOpen} onClose={() => setIsSortOpen(false)} position="left">
        <SortContent onClose={() => setIsSortOpen(false)} onApply={navigate} />
      </Drawer>

    </main>
  );
}