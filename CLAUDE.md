# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OPORA — a Ukrainian e-commerce storefront for minimalist furniture (chairs, tables, nightstands). Next.js 16 (App Router, React 19) deployed to Cloudflare Workers via OpenNext. Airtable is the CMS/database; Cloudflare R2 stores product media. UI copy and most code comments are in Ukrainian.

## Commands

```bash
npm run dev        # local dev server at http://localhost:3000
npm run lint       # next lint (ESLint: next/core-web-vitals + next/typescript)
npm run build      # next build
npm run preview    # build + run on the Cloudflare Workers runtime locally (OpenNext)
npm run deploy     # build + deploy to Cloudflare
npm run cf-typegen # regenerate cloudflare-env.d.ts from wrangler bindings
```

There is no test suite. Type-check by running `npm run build` — but note `next.config.ts` sets `typescript.ignoreBuildErrors: true`, so TS errors do **not** fail the build. Verify types explicitly with `npx tsc --noEmit` when correctness matters.

## Architecture

### Data layer (`src/lib/airtable/`)
All product/content data lives in Airtable. The layer is intentionally centralized:

- **`schema.ts`** is the single source of truth for Airtable table and column names (which are Ukrainian/Cyrillic strings). Never hardcode a table/field string elsewhere — add it to `TABLES` / `FIELDS` / `CATEGORY_TABLES` and reference the constant.
- **`tables/index.ts`** exports pre-bound table handles (`tableProducts`, `tableVariants`, etc.). `index.ts` exports the shared `airtableBase`.
- **`helpers.ts`** holds the reusable Airtable patterns: `fetchRecordsByIds` (chunks ID lists to avoid formula-length limits + dedupes), `indexById` (O(1) lookup map), `recordIdFormula`, `parseImageUrls`.
- Each domain (`products/`, `comments/`, `requests/`, `catalog/`, `banners/`) is a folder with a `*Service.ts` + `types/`. Services resolve Airtable's linked-record relationships manually: fetch parents → collect linked IDs → batch-fetch children via `fetchRecordsByIds` → join with `indexById`. See `productsService.ts` for the canonical product→variant→option→spec join.
- Read functions used by SSR pages are wrapped in React `cache()` (e.g. `getProductById`) so a page and its API route can share a fetch within one request.

### Rendering model
- Pages under `src/app/` are **Server Components** that read Airtable directly (server-only). Interactive parts are split into `*Client.tsx` Client Components (e.g. `CatalogClient.tsx`, `ProductDetailClient.tsx`).
- API routes under `src/app/api/` expose the same services to the browser and to the external Airtable extension (CORS is opened to `*` in `next.config.ts`). Routes follow a uniform try/catch → `NextResponse.json` with proper status codes.
- Client data fetching uses **TanStack Query** (`providers.tsx`, `staleTime: 60s`, no refetch-on-focus).
- Cart is global client state via **Zustand** with `persist` to localStorage (key `opora-cart-storage`). Only `items` is persisted — UI flags like `isCartOpen` are deliberately excluded so the cart doesn't reopen on reload (`store/cartStore.ts`).

### Integrations
- **R2** (`src/lib/r2/`): S3-compatible client for product images/videos. Media is served from `*.r2.dev` (allowed in `next.config.ts` `images.remotePatterns`).
- **Nova Poshta** (`src/lib/novaposhta/`, `api/novaposhta/`): Ukrainian delivery — city/warehouse lookup for checkout.
- **Telegram** (`api/telegram/`): order/lead notifications via bot `sendMessage`.
- **Analytics** (`src/lib/analytics/umami.ts`): `trackEvent()` is a safe no-op wrapper around `window.umami` (never throws); GA is also wired via `NEXT_PUBLIC_GA_ID`.
- **SEO**: `src/lib/site.ts` centralizes `SITE_*` constants and store contact info (`STORE`); `app/sitemap.ts`, `robots.ts`, and `components/seo/JsonLd.tsx` consume them.

### Path alias
`@/*` → `src/*` (see `tsconfig.json`).

## Deployment & environment

Deployed as a Cloudflare Worker via `@opennextjs/cloudflare` (config in `wrangler.jsonc`, `open-next.config.ts`). Bindings: `ASSETS`, `IMAGES` (image optimization), `WORKER_SELF_REFERENCE`. Cloudflare binding types are generated into `cloudflare-env.d.ts` (large, committed) via `npm run cf-typegen`.

Required env vars (do not commit secrets; local dev uses `.env`/`.env.local`/`.dev.vars`): `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `CLOUDFLARE_R2_API_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `NOVA_POSHTA_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`.

## Airtable extension

`airtable-extensions/update_the_prices/` is a separate, self-contained Airtable Blocks app (its own `package.json`/`node_modules`, excluded from the main `tsconfig.json`). It calls back into this app's `/api` routes — keep those routes and their CORS headers compatible when changing them.
