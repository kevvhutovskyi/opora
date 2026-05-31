// src/app/layout.tsx
import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css"; // 1. ЦЕЙ ІМПОРТ Є ОБОВ'ЯЗКОВИМ! Без нього Tailwind не завантажиться.
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

// 2. Ініціалізуємо шрифт з правильною CSS-змінною
const rubik = Rubik({ 
  subsets: ["latin", "cyrillic"],
  variable: "--font-rubik", // Ця змінна має точно збігатися з тією, що у вашому tailwind.config.ts
  display: "swap",
});

export const metadata: Metadata = {
  title: "OPORA",
  description: "Мінімалістичні крісла та меблі",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 3. Додаємо змінну шрифту в html або body
    <html lang="uk" className={`${rubik.variable}`}>
      {/* 4. Задаємо font-sans (який тепер посилається на Rubik) та базовий колір тексту */}
      <body className="font-sans text-opora-brown antialiased" suppressHydrationWarning>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}