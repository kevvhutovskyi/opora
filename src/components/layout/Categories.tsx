"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "../ui/Icons";

const CATEGORIES = [
  {
    id: 1,
    title: "Стільці",
    mockImage: "https://picsum.photos/id/230/800/600",
    link: "/catalog?type=Chair",
    colSpan: "md:col-span-2",
  },
  {
    id: 2,
    title: "Столи",
    mockImage: "https://picsum.photos/id/231/800/600",
    link: "/catalog?type=Table",
    colSpan: "md:col-span-1",
  },
  {
    id: 3,
    title: "Табуретки",
    mockImage: "https://picsum.photos/id/232/800/600",
    link: "/catalog?type=Nightstand",
    colSpan: "md:col-span-1",
  },
];

type CategoriesProps = {
  // Map назваКатегорії → url із таблиці «Банери». Якщо немає — мок-зображення.
  images?: Record<string, string>;
};

export default function Categories({ images = {} }: CategoriesProps) {
  const categories = CATEGORIES.map((c) => ({
    ...c,
    image: images[c.title] || c.mockImage,
  }));
  return (
    <section className="w-full bg-opora-menu py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 px-4 md:px-8">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={category.link}
            className={`group relative w-full h-87.5 md:h-100 overflow-hidden bg-opora-beige block ${category.colSpan}`}
          >
            {/* Background Image */}
            <Image
              src={category.image}
              alt={category.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/10" />

            {/* Category Title */}
            <h3 className="absolute top-6 left-6 text-2xl md:text-3xl text-white font-medium tracking-wide">
              {category.title}
            </h3>

            {/* Arrow Button */}
            <div className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center text-opora-brown shadow-md group-hover:bg-opora-brown group-hover:text-white transition-colors duration-300">
              <ArrowRightIcon className="w-6 h-6" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}