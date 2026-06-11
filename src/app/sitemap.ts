import type { MetadataRoute } from "next";
import { getFilteredCatalog } from "@/lib";
import { SITE_URL } from "@/lib/site";

// Регенерувати sitemap раз на годину.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/catalog`, changeFrequency: "daily", priority: 0.9 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getFilteredCatalog({ type: "All" });
    productRoutes = products.map((p) => ({
      url: `${SITE_URL}${p.href}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (error) {
    console.error("sitemap: не вдалося отримати товари", error);
  }

  return [...staticRoutes, ...productRoutes];
}
