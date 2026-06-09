// src/app/catalog/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/airtable/products/productsService";
import ProductDetailClient from "./components/ProductDetailClient";

// Server Component: fetches the product on the server and passes it to the
// interactive client component (same pattern as TopProducts).
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductById(slug);

  if (!product) notFound();

  return <ProductDetailClient product={product} />;
}
