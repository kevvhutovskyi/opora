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
  
  const seatColors = params.seatColor ? (params.seatColor as string).split(',') : [];
  const legColors = params.legColor ? (params.legColor as string).split(',') : [];
  const tableColors = params.tableColor ? (params.tableColor as string).split(',') : [];

  const specFilters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("specFilter_") && typeof value === "string") {
      specFilters[key.slice(11)] = value.split(",");
    }
  }

  const categories = ["Chair"];

  const [products, filterOptions, catalogHeroImage] = await Promise.all([
    getFilteredCatalog({ type, sort, seatColors, legColors, tableColors, specFilters }),
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