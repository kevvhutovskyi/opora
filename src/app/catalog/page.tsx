// src/app/catalog/page.tsx
import { Suspense } from "react";
import CatalogClient from "./CatalogClient";
import { getFilteredCatalog, getFilterOptions } from "@/lib";

// This is a Server Component. 
// Next.js passes searchParams directly to page components.
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;

  // 1. Extract URL parameters safely
  // Default to "All" if no type is provided
  const type = (params.type as any) || "All";
  const sort = (params.sort as any) || "default";
  
  // Parse comma-separated strings into arrays
  const seatColors = params.seatColor ? (params.seatColor as string).split(',') : [];
  const legColors = params.legColor ? (params.legColor as string).split(',') : [];
  const tableColors = params.tableColor ? (params.tableColor as string).split(',') : [];

  console.log(type, sort, seatColors, legColors, tableColors);

  const [products, filterOptions] = await Promise.all([
    getFilteredCatalog({ type, sort, seatColors, legColors, tableColors }),
    getFilterOptions()
  ]);

  return (
    // Suspense shows a fallback while the server is fetching data
    <Suspense 
      fallback={
        <div className="min-h-screen bg-opora-white flex items-center justify-center text-opora-brown font-medium">
          Завантаження каталогу...
        </div>
      }
    >
      {/* 3. Pass the fetched data to the interactive UI */}
      <CatalogClient initialProducts={products} filterOptions={filterOptions} />
    </Suspense>
  );
}