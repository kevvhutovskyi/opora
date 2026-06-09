"use client";

import { useState, useRef, UIEvent } from "react";
import { useQuery } from "@tanstack/react-query";
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

const TRUNCATE_AT = 250;

function ReviewCard({ comment }: { comment: Comment }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = () => { setModalOpen(true); requestAnimationFrame(() => setModalVisible(true)); };
  const closeModal = () => { setModalVisible(false); setTimeout(() => setModalOpen(false), 250); };
  const isLong = (comment.text?.length ?? 0) > TRUNCATE_AT;
  const preview = isLong ? comment.text.slice(0, TRUNCATE_AT).trimEnd() : comment.text;

  const Header = () => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h4 className="font-semibold text-opora-brown text-base leading-tight">{comment.authorName}</h4>
        <span className="text-xs text-[#888] mt-0.5 block">{formatDate(comment.createdAt)}</span>
      </div>
      <div className="flex space-x-0.5 shrink-0 mt-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= comment.rating
            ? <YellowStarIcon key={star} className="w-4 h-4" />
            : <GrayStarIcon key={star} className="w-4 h-4" />
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Картка */}
      <div className="relative overflow-hidden rounded-2xl bg-white/60 border border-white/80 backdrop-blur-sm p-6 flex flex-col gap-4">
        <Header />
        <p className="text-opora-brown/75 text-sm leading-relaxed relative z-10">
          {preview}
          {isLong && (
            <>
              …{' '}
              <button
                onClick={openModal}
                className="text-opora-brown font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                Більше
              </button>
            </>
          )}
        </p>
      </div>

      {/* Модальне вікно */}
      {modalOpen && (
        <div
          className={`fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-250 ${modalVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeModal}
        >
          <div
            className={`relative w-full max-w-lg bg-opora-white rounded-2xl p-8 shadow-2xl transition-all duration-250 ${modalVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Закрити — над контентом, не поверх зірок */}
            <button
              onClick={closeModal}
              aria-label="Закрити"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M1 13L13 1" stroke="#333" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="flex flex-col gap-5 pr-8">
              <Header />
              <p className="text-opora-brown/80 text-sm leading-relaxed">{comment.text}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

async function fetchComments(variation?: string): Promise<Comment[]> {
  const url = variation
    ? `/api/comments?variation=${encodeURIComponent(variation)}`
    : '/api/comments';
  const response = await fetch(url);
  if (!response.ok) throw new Error("Не вдалося завантажити відгуки");
  return response.json();
}

export default function Reviews({ variation }: ReviewsProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mobileSliderRef = useRef<HTMLDivElement>(null);

  // React Query caches per variation — switching variants back and forth is instant.
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", variation ?? null],
    queryFn: () => fetchComments(variation),
  });

  const handleMobileScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el.offsetWidth) return;
    setActiveSlide(Math.round(el.scrollLeft / el.offsetWidth));
  };

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
    <section className="py-12 md:py-16 bg-opora-menu overflow-hidden">
      {/* Шапка */}
      <div className="flex justify-between items-center px-4 md:px-8 mb-10">
        <h2 className="text-2xl md:text-3xl font-medium text-opora-brown">Відгуки</h2>
        <div className="hidden md:flex space-x-2">
          <button onClick={() => scroll("left")} aria-label="Попередні відгуки" className="p-2 hover:opacity-70 transition-opacity text-opora-brown">
            <SliderArrowLeftIcon className="w-5 h-5" />
          </button>
          <button onClick={() => scroll("right")} aria-label="Наступні відгуки" className="p-2 hover:opacity-70 transition-opacity text-opora-brown">
            <SliderArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* МОБІЛЬНИЙ: слайдер по одному відгуку з крапками */}
      <div className="relative md:hidden">
        <div
          ref={mobileSliderRef}
          onScroll={handleMobileScroll}
          className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-4"
        >
          {comments.map((comment) => (
            <div key={comment.id} className="w-full shrink-0 snap-center px-4">
              <ReviewCard comment={comment} />
            </div>
          ))}
        </div>
        {comments.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {comments.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'w-5 bg-opora-brown' : 'w-2 bg-opora-brown/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ДЕСКТОП: горизонтальний скрол з картками */}
      <div
        ref={scrollContainerRef}
        className="hidden md:flex gap-8 overflow-x-auto snap-x snap-mandatory hide-scrollbar px-8 pb-4"
      >
        {comments.map((comment) => (
          <div key={comment.id} className="shrink-0 w-[320px] snap-start">
            <ReviewCard comment={comment} />
          </div>
        ))}
      </div>
    </section>
  );
}