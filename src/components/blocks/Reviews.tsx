"use client";

import { useEffect, useState, useRef } from "react";
import { YellowStarIcon, GrayStarIcon, SliderArrowLeftIcon, SliderArrowRightIcon } from "../ui/Icons";
import { Comment } from "@/lib";

type ReviewsProps = {
  variation?: string;
}

const formatDate = (isoString?: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function Reviews({ variation }: ReviewsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const url = variation 
          ? `/api/comments?variation=${encodeURIComponent(variation)}` 
          : '/api/comments';
          
        const response = await fetch(url);
        if (response.ok) {
          const data: Comment[] = await response.json();
          setComments(data);
        }
      } catch (error) {
        console.error("Помилка при завантаженні відгуків:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [variation]);

  // Логіка плавного скролу для стрілочок
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Приблизна ширина однієї картки + gap
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return <div className="py-12 px-4 md:px-8 bg-opora-menu animate-pulse h-[300px] w-full" />;
  }

  // Якщо відгуків немає, взагалі не рендеримо секцію
  if (comments.length === 0) return null;

  return (
    <section className="py-12 md:py-16 px-4 md:px-8 bg-opora-menu overflow-hidden">
      {/* Шапка секції */}
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl md:text-3xl font-medium text-opora-brown">Відгуки</h2>
        
        {/* Навігація (ховаємо на мобільних, оскільки там зручніше свайпати) */}
        <div className="hidden md:flex space-x-2">
          <button 
            onClick={() => scroll("left")}
            aria-label="Попередні відгуки"
            className="p-2 hover:opacity-70 transition-opacity text-opora-brown"
          >
            <SliderArrowLeftIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => scroll("right")}
            aria-label="Наступні відгуки"
            className="p-2 hover:opacity-70 transition-opacity text-opora-brown"
          >
            <SliderArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Контейнер зі скролом */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4"
      >
        {comments.map((comment) => (
          <div 
            key={comment.id} 
            className="shrink-0 w-[280px] md:w-[320px] snap-start flex flex-col"
          >
            {/* Зірки рейтингу */}
            <div className="flex space-x-1 mb-5">
              {[1, 2, 3, 4, 5].map((star) => (
                star <= comment.rating ? 
                <YellowStarIcon key={star} className="w-5 h-5 md:w-6 md:h-6"/> : 
                <GrayStarIcon key={star} className="w-5 h-5 md:w-6 md:h-6"  />
              ))}
            </div>

            <div className="mb-4 text-opora-brown">
              <h4 className="font-medium text-base mb-1">{comment.authorName}</h4>
              
              <span className="text-sm opacity-60 font-light">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            {/* Текст відгуку */}
            <p className="text-opora-brown opacity-80 text-sm leading-relaxed font-light">
              {comment.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}