"use client";

import { useState, useRef, UIEvent, useEffect } from "react";
import dynamic from "next/dynamic";
import { useCartStore } from "@/store/cartStore";
import { toHue } from "@/lib/utils";
import { MOCK_PRODUCT_IMAGES } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics/umami";
import { BenefitBoxIcon, BenefitColorsIcon, BenefitShieldIcon } from "@/components/ui/Icons";
import Reviews from "@/components/blocks/Reviews";
import RecentlyViewed from "@/components/blocks/RecentlyViewed";
import { CatalogProductDetails } from "@/lib";
import { Option, Product, Variant, hexColor } from "./types";
import ProductGallery from "./ProductGallery";
import BuyBox from "./BuyBox";
import AssemblyVideo from "./AssemblyVideo";
import ProductAccordions from "./ProductAccordions";
import CartToast from "./CartToast";

// Повноекранна галерея потрібна лише після кліку — виносимо в окремий чанк.
const FullscreenGallery = dynamic(() => import("./FullscreenGallery"), { ssr: false });

export default function ProductDetailClient({ product }: { product: Product }) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Стан для обраної варіації (конкретного SKU) — перша варіація за замовчуванням
  const [activeVariant, setActiveVariant] = useState<Variant | null>(
    product.variants?.[0] ?? null
  );

  const [qty, setQty] = useState(1);
  const addItemToCart = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const [openSections, setOpenSections] = useState(['desc']);
  const [toast, setToast] = useState<{ message: string; options: Option[] } | null>(null);

  // Стан для галереї
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSlide, setFullscreenSlide] = useState(0);
  // Монтуємо галерею лише після першого відкриття (потім лишаємо для анімації закриття).
  const [galleryMounted, setGalleryMounted] = useState(false);

  // Чи видно шапку — щоб sticky-блок підлаштовував відступ зверху (та сама логіка, що в Header)
  const [headerVisible, setHeaderVisible] = useState(true);

  const fullscreenSliderRef = useRef<HTMLDivElement>(null);

  // Оригінали активної варіації — для повноекранної галереї.
  const currentImages = activeVariant?.images && activeVariant.images.length > 0
    ? activeVariant.images
    : [...MOCK_PRODUCT_IMAGES]; // Тимчасові мок-зображення, якщо фото немає

  // Стиснені версії — для самої сторінки (легші, віддаються напряму з R2 без оптимізації Worker'а).
  // Fallback на оригінали/моки, якщо стиснених немає (старі фото).
  const currentImagesCompressed = activeVariant?.imagesCompressed && activeVariant.imagesCompressed.length > 0
    ? activeVariant.imagesCompressed
    : currentImages;

  // Надійна синхронізація прокрутки для повноекранної галереї
  useEffect(() => {
    if (isFullscreen && fullscreenSliderRef.current) {
      // Даємо браузеру мілісекунду на рендер DOM перед скролом
      requestAnimationFrame(() => {
        if (fullscreenSliderRef.current) {
           fullscreenSliderRef.current.scrollLeft = fullscreenSliderRef.current.offsetWidth * fullscreenSlide;
        }
      });
    }
  }, [isFullscreen, fullscreenSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;

      if (e.key === "ArrowRight" && fullscreenSlide < currentImages.length - 1) {
        scrollToFullscreenImage(fullscreenSlide + 1);
      } else if (e.key === "ArrowLeft" && fullscreenSlide > 0) {
        scrollToFullscreenImage(fullscreenSlide - 1);
      } else if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, fullscreenSlide, currentImages.length]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Очищення при розмонтуванні компонента (якщо користувач перейде на іншу сторінку)
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isFullscreen]);

  // Відстежуємо видимість шапки (як у Header): видно при скролі вгору або біля верху
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setHeaderVisible(y < lastScrollY || y < 50);
      lastScrollY = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const slider = fullscreenSliderRef.current;
    if (!slider) return;

    // Якщо користувач свайпає горизонтально (наприклад, на тачпаді),
    // браузер впорається з цим нативно, тому ми нічого не робимо.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    // Перетворюємо вертикальний рух коліщатка миші на горизонтальний скрол
    slider.scrollLeft += e.deltaY;
  };

  // Завантаження PDF-інструкції (це дія користувача, а не дані — лишаємо звичайний fetch)
  const handleDownloadPDF = async (url: string, filename: string) => {
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${filename}.pdf`);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Не вдалося завантажити інструкцію. Спробуйте пізніше.');
    }
  };

  const toggleAccordion = (section: string) => {
    setOpenSections((prevSections) =>
      prevSections.includes(section)
        ? prevSections.filter((item) => item !== section)
        : [...prevSections, section]
    );
  };

  const handleAddToCart = () => {
    if (!product || !activeVariant) return;

    const itemPayload = {
      id: activeVariant.id,
      productId: product.id,
      title: product.model || product.name,
      sku: activeVariant.sku,
      price: activeVariant.price || product.minPrice,
      image: activeVariant.images[0] || '/placeholder.png',
      quantity: qty,
      options: activeVariant.options.map((o) => ({ name: o.name, value: hexColor(o.value) })),
    };

    addItemToCart(itemPayload);
    openCart();
    trackEvent("Додано до кошика", {
      product: product.model || product.name,
      sku: activeVariant.sku,
      price: activeVariant.price || product.minPrice,
      qty,
    });
    setToast({ message: `Додано до кошика: ${product.model || product.name} (${qty} шт.)`, options: activeVariant.options });
    setTimeout(() => setToast(null), 3000);
  };

  // Відкрити повний опис: розгорнути акордеон «Опис» і доскролити до нього
  const handleReadMore = () => {
    trackEvent("Читати більше", { product: product.model || product.name });
    setOpenSections((prev) => (prev.includes('desc') ? prev : [...prev, 'desc']));
    requestAnimationFrame(() => {
      document.getElementById('accordion-desc')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Логіка Галереї
  const handleFullscreenScroll = (e: UIEvent<HTMLDivElement>) => {
    if (!e.currentTarget) return;
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    setFullscreenSlide(Math.round(scrollLeft / width));
  };

  const openGallery = (index: number) => {
    trackEvent("Відкрито галерею", { product: product.model || product.name, index });
    setFullscreenSlide(index);
    setGalleryMounted(true);
    setIsFullscreen(true);
  };

  const scrollToFullscreenImage = (index: number) => {
    setFullscreenSlide(index);
    if (fullscreenSliderRef.current) {
      fullscreenSliderRef.current.scrollTo({
        left: fullscreenSliderRef.current.offsetWidth * index,
        behavior: 'smooth'
      });
    }
  };

  // Group unique option values by index across all variants
  const getOptionGroups = (variants: Variant[]): Option[][] => {
    if (!variants || variants.length === 0) return [];
    const numOptions = variants[0].options.length;
    return Array.from({ length: numOptions }, (_, i) => {
      const seen = new Set<string>();
      const unique: Option[] = [];
      for (const v of variants) {
        const opt = v.options[i];
        if (opt && !seen.has(opt.value)) {
          seen.add(opt.value);
          unique.push(opt);
        }
      }
      // Зворотний порядок сортування за відтінком (на запит)
      unique.sort((a, b) => toHue(b.value) - toHue(a.value));
      return unique;
    });
  };

  const handleOptionSelect = (optionIndex: number, value: string) => {
    if (!product) return;
    const currentValues = activeVariant?.options.map((o) => o.value) ?? [];
    const desired = currentValues.map((v, i) => (i === optionIndex ? value : v));
    const match =
      product.variants.find((v) => v.options.every((o, i) => o.value === desired[i])) ??
      product.variants.find((v) => v.options[optionIndex]?.value === value);
    if (match) {
      setActiveVariant(match);
      trackEvent("Вибір варіації", { product: product.model || product.name, value });
    }
  };

  // Чи доступна опція (є варіація в наявності) з урахуванням поточного вибору інших опцій
  const isOptionAvailable = (optionIndex: number, value: string): boolean => {
    if (!product) return false;
    const currentValues = activeVariant?.options.map((o) => o.value) ?? [];
    const desired = currentValues.map((v, i) => (i === optionIndex ? value : v));
    // Якщо є точна комбінація з поточним вибором — дивимось саме її наявність
    const exact = product.variants.find((v) => v.options.every((o, i) => o.value === desired[i]));
    if (exact) return Boolean(exact.inStock);
    // Інакше опція доступна, якщо існує хоча б одна варіація в наявності з цим значенням
    return product.variants.some((v) => v.options[optionIndex]?.value === value && v.inStock);
  };

  // Поточний товар у форматі картки каталогу — для секції «Ви раніше переглядали» (localStorage)
  const recentlyViewedCurrent: CatalogProductDetails = {
    id: product.id,
    name: product.model || product.name,
    price: product.minPrice || product.variants?.[0]?.price || 0,
    href: `/catalog/${product.id}`,
    variations: product.variants.map((v) => ({
      id: v.id,
      allHexes: v.options.map((o) => ({ hex: hexColor(o.value), name: o.name })),
      images: v.images,
      imagesCompressed: v.imagesCompressed,
    })),
  };

  return (
    <main className="min-h-screen bg-opora-white text-opora-brown">
      <div className="max-w-7xl mx-auto px-4 pt-24 md:pt-32 pb-6 md:pb-12 grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-12">

        {/* ГАЛЕРЕЯ — ліва колонка, верхній рядок (сітка квадратів 2 в ряд) */}
        <div className="order-1 lg:col-start-1 lg:row-start-1">
          <ProductGallery images={currentImagesCompressed} onImageClick={openGallery} />
        </div>

        {/* БЛОК ПОКУПКИ + ВІДЕО — права колонка, тягнеться на 2 рядки, sticky всередині */}
        <div className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <div className={`lg:sticky transition-[top] duration-300 ease-in-out ${headerVisible ? 'lg:top-28' : 'lg:top-6'}`}>
            <BuyBox
              product={product}
              activeVariant={activeVariant}
              qty={qty}
              optionGroups={getOptionGroups(product.variants)}
              onQtyChange={setQty}
              onOptionSelect={handleOptionSelect}
              isOptionAvailable={isOptionAvailable}
              onAddToCart={handleAddToCart}
              onReadMore={handleReadMore}
            />
            <AssemblyVideo
              videoUrl={product.assemblyVideoUrl}
              isPlaying={isVideoPlaying}
              onPlay={() => {
                setIsVideoPlaying(true);
                trackEvent("Відтворено відео", { product: product.model || product.name });
              }}
            />
            {/* Немає відео збірки — заповнюємо порожнечу під блоком покупки гарантіями. */}
            {!product.assemblyVideoUrl && (
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <BenefitBoxIcon className="w-7 h-7 stroke-current" />, title: "Доставка по всій Україні" },
                  { icon: <BenefitShieldIcon className="w-7 h-7 stroke-current" />, title: "Гарантія якості" },
                  { icon: <BenefitColorsIcon className="w-7 h-7 stroke-current" />, title: "Колір на будь-який смак" },
                ].map((b) => (
                  <div key={b.title} className="flex flex-col items-center justify-center text-center gap-2 p-4 rounded-xl bg-opora-softBeige/60 text-opora-brown">
                    <span className="shrink-0">{b.icon}</span>
                    <span className="text-sm font-medium leading-tight">{b.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* АКОРДЕОНИ — ліва колонка під галереєю */}
        <div className="order-3 lg:col-start-1 lg:row-start-2">
          <ProductAccordions
            product={product}
            openSections={openSections}
            onToggle={toggleAccordion}
            onDownloadPdf={handleDownloadPDF}
          />
        </div>
      </div>

      {/* ВІДГУКИ — на всю ширину під сіткою */}
      <Reviews variation={product.model || product.name} />

      {/* ВИ РАНІШЕ ПЕРЕГЛЯДАЛИ — історія з localStorage, під відгуками */}
      <RecentlyViewed current={recentlyViewedCurrent} />

      {galleryMounted && (
        <FullscreenGallery
          images={currentImages}
          isOpen={isFullscreen}
          activeSlide={fullscreenSlide}
          sliderRef={fullscreenSliderRef}
          onClose={() => setIsFullscreen(false)}
          onScroll={handleFullscreenScroll}
          onWheel={handleWheelScroll}
          onThumbClick={scrollToFullscreenImage}
        />
      )}

      {/* <CartToast toast={toast} onClose={() => setToast(null)} /> */}

    </main>
  );
}
