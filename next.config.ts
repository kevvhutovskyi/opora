import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Warning: Leaving this as 'true' in production is dangerous.
    // It's highly recommended to fix TS errors before a prod build,
    // otherwise runtime crashes will slip through.
    ignoreBuildErrors: true,

  },
  images: {
    // Не оптимізуємо зображення у Worker'і (/_next/image). Інакше кожен запит тягнув би
    // оригінал у Worker і кодував AVIF/WebP — на великих фото це впирається в ліміти Worker'а
    // (Cloudflare Error 1102). Натомість віддаємо файли напряму з R2 CDN (вони вже стиснені
    // на момент завантаження — див. /api/products/media/images). Lazy-loading лишається.
    unoptimized: true,
    // Дозволені зовнішні хости для next/image.
    // R2 (фото товарів), Airtable (fallback), picsum (тимчасові слайди героя).
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.airtableusercontent.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  async headers() {
    return [
        {
          // This applies CORS specifically to your API routes
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Credentials", value: "true" },
            // In the future, change "*" to your specific Airtable extension URL for tighter security
            { key: "Access-Control-Allow-Origin", value: "*" }, 
            { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
            { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
          ]
        }
    ]
  },
  env: {
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  }
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();