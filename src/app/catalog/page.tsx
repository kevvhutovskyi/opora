import type { Metadata } from "next";
import { Suspense } from "react";
import CatalogClient from "./CatalogClient";
import { getCatalogHeroImage, getFilteredCatalog, getFilterOptions } from "@/lib";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Каталог мінімалістичних крісел та меблів OPORA. Оберіть колір і розмір під свій інтер'єр.",
  alternates: { canonical: "/catalog" },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;

  const type = (params.type as any) || "All";
  const sort = (params.sort as any) || "default";
  
  const optionFilters: Record<string, string[]> = {};
  const specFilters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "string") continue;
    if (key.startsWith("optFilter_")) {
      optionFilters[key.slice(10)] = value.split(",");
    } else if (key.startsWith("specFilter_")) {
      specFilters[key.slice(11)] = value.split(",");
    }
  }

  const categories = ["Chair", "Table"];

  const [products, filterOptions, catalogHeroImage] = await Promise.all([
    getFilteredCatalog({ type, sort, optionFilters, specFilters }),
    getFilterOptions(),
    getCatalogHeroImage()
  ]);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-opora-white flex items-center justify-center text-opora-brown font-medium">
          Завантаження каталогу...
        </div>
      }
    >
      <CatalogClient initialProducts={products} filterOptions={filterOptions} categories={categories} heroImage={catalogHeroImage} />
    </Suspense>
  );
}