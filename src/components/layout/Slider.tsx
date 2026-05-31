// src/components/blocks/HeroSlider.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Mock data - replace images with your actual URLs (e.g., AWS S3 or CMS links)
const slides = [
  {
    id: 1,
    title: "Форма має значення",
    subtitle: "Мінімалістичні крісла, що стають головним акцентом вашого інтер'єру.",
    image: "https://picsum.photos/1000/800", 
    link: "/catalog",
  },
  {
    id: 2,
    title: "Комфорт у деталях",
    subtitle: "Сучасні дивани для вашого відпочинку та естетики.",
    image: "https://picsum.photos/1000/800",
    link: "/catalog",
  },
  {
    id: 3,
    title: "Бездоганні лінії",
    subtitle: "Ексклюзивні рішення для сучасного простору.",
    image: "https://picsum.photos/1000/800",
    link: "/catalog",
  },
  {
    id: 4,
    title: "Мистецтво затишку",
    subtitle: "Створюйте атмосферу разом з нами.",
    image: "https://picsum.photos/1000/800",
    link: "/catalog",
  }
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full h-svh overflow-hidden bg-opora-beige">
      {/* Slides Container */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: `url(${slide.image})` }}
            aria-hidden="true"
          />

          {/* Slight dark gradient overlay if needed to ensure white text readability */}
          <div className="absolute inset-0 bg-black/10" aria-hidden="true" />

          {/* Content Wrapper */}
          <div className="relative z-20 flex flex-col h-full px-4 md:px-8">
            
            {/* Top Text Section (Pushed down on mobile, centered on desktop) */}
            <div className="flex-1 flex flex-col items-center justify-start pt-40 md:pt-0 md:justify-center text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-wide drop-shadow-sm">
                {slide.title}
              </h1>
              <p className="text-base md:text-lg text-white max-w-sm md:max-w-md mx-auto font-light drop-shadow-sm">
                {slide.subtitle}
              </p>
            </div>

            {/* Bottom Section (Button and Dots) */}
            <div className="flex flex-col items-center gap-8 pb-12 md:pb-16">
              <Link 
                href={slide.link}
                className="px-8 py-3 border border-white text-white hover:bg-white hover:text-opora-brown transition-colors duration-300 text-sm md:text-base tracking-wider"
              >
                Перейти до каталогу
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Pagination Dots (Rendered outside the map so they don't fade out during transitions) */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? "bg-white scale-125" 
                : "bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Перейти до слайду ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}