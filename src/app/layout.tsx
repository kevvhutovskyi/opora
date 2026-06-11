import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css"; // ЦЕЙ ІМПОРТ Є ОБОВ'ЯЗКОВИМ! Без нього Tailwind не завантажиться.
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingMessenger from "@/components/layout/FloatingMessenger";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from "@/lib/site";
import Providers from "./providers";

const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — мінімалістичні крісла та меблі`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["меблі", "крісла", "дизайнерські меблі", "OPORA", "мінімалізм"],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — мінімалістичні крісла та меблі`,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — мінімалістичні крісла та меблі`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${rubik.variable}`}>
      <body className="font-sans text-opora-brown antialiased" suppressHydrationWarning>
        <JsonLd data={organizationJsonLd} />
        <Providers>
          <Header />
          {children}
          <Footer />
          <FloatingMessenger />
        </Providers>
      </body>
    </html>
  );
}