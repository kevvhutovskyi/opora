// src/app/catalog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/airtable/products/productsService";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/site";
import JsonLd from "@/components/seo/JsonLd";
import ProductDetailClient from "./components/ProductDetailClient";

// Регенеруємо сторінку товару раз на годину (ISR), щоб не бити в Airtable на кожен запит.
export const revalidate = 3600;

// Per-product метадані для пошуку та шерингу. getProductById обгорнуто в React cache(),
// тож той самий виклик у generateMetadata і в сторінці = один запит до Airtable.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductById(slug);

  if (!product) return { title: "Товар не знайдено" };

  const title = product.model || product.name;
  const description =
    (product.description || "").trim().slice(0, 160) ||
    `${title} від ${SITE_NAME}.`.trim();
  const image = product.variants?.[0]?.images?.[0] || DEFAULT_OG_IMAGE;
  const url = `/catalog/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: [{ url: image, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

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

  const title = product.model || product.name;
  const inStock = product.variants?.some((v) => v.inStock) ?? false;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: product.description || undefined,
    image: product.variants?.flatMap((v) => v.images).filter(Boolean).slice(0, 6),
    sku: product.variants?.[0]?.sku || undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: product.minPrice || product.variants?.[0]?.price || 0,
      priceCurrency: "UAH",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/catalog/${slug}`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Головна", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Каталог", item: `${SITE_URL}/catalog` },
      { "@type": "ListItem", position: 3, name: title, item: `${SITE_URL}/catalog/${slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ProductDetailClient product={product} />
    </>
  );
}
