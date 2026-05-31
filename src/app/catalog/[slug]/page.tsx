// src/app/catalog/[slug]/page.tsx
"use client";

import { useState, useRef, UIEvent, useEffect } from "react";
import { useParams } from "next/navigation";
import { PlusIcon, MinusIcon, PlayIcon } from "@/components/ui/Icons";
import { useCartStore } from "@/store/cartStore";
import Reviews from "@/components/blocks/Reviews"; // Не забудь свій імпорт відгуків

// 1. Оновлені типи на основі твого скріншота
interface Option {
  name: string;
  value: string; // Це Hex колір (наприклад, 'FF0000')
}

interface Variant {
  id: string;
  name: string;
  sku: string;
  price: number;
  inStock: boolean;
  images: string[];
  options: Option[];
}

interface Specification {
  name: string;
  value: string;
}

interface Product {
  id: string;
  model: string;
  name: string;
  manufacturer: string;
  catalog: string;
  description: string;
  assemblyVideoUrl: string;
  assemblyPdfUrl: string;
  minPrice: number;
  specifications: Specification[];
  variants: Variant[];
}

export default function ProductPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Стан для обраної варіації (конкретного SKU)
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);

  const [qty, setQty] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const addItemToCart = useCartStore((state) => state.addItem);
  
  const [variantsModalOpen, setVariantsModalOpen] = useState(false);

  // Стан для галереї
  const [activeSlide, setActiveSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSlide, setFullscreenSlide] = useState(0);
  
  const inlineSliderRef = useRef<HTMLDivElement>(null);
  const fullscreenSliderRef = useRef<HTMLDivElement>(null);

  // Масив фотографій беремо з активної варіації
  const currentImages = activeVariant?.images && activeVariant.images.length > 0 
    ? activeVariant.images 
    : ['/placeholder.png']; // Заглушка, якщо фото немає

  // 2. Завантаження даних
  useEffect(() => {
    if (!slug) return;

    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/${slug}`);
        if (!res.ok) throw new Error("Помилка завантаження");
        const data: Product = await res.json();
        
        console.log('data =>', data);

        setProduct(data);
        
        // Встановлюємо першу варіацію як активну за замовчуванням
        if (data.variants && data.variants.length > 0) {
          setActiveVariant(data.variants[0]);
        }
      } catch (err) {
        setError("Не вдалося завантажити інформацію про товар.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

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

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const slider = fullscreenSliderRef.current;
    if (!slider) return;

    // Якщо користувач свайпає горизонтально (наприклад, на тачпаді), 
    // браузер впорається з цим нативно, тому ми нічого не робимо.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    // Перетворюємо вертикальний рух коліщатка миші на горизонтальний скрол
    slider.scrollLeft += e.deltaY;
  };
    
  // 1. Add this helper function
  const handleDownloadPDF = async (url: string, filename: string) => {
    if (!url) return;

    try {
      // We use fetch to get the file data directly
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      // Convert the response to a Blob
      const blob = await response.blob();
      
      // Create a temporary local URL for the Blob
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // The download attribute forces the browser to download instead of navigate
      link.setAttribute('download', `${filename}.pdf`); 
      
      // Append, click, and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Не вдалося завантажити інструкцію. Спробуйте пізніше.');
    }
  };

  const toggleAccordion = (id: string) => setOpenAccordion(openAccordion === id ? null : id);

  const handleAddToCart = () => {
    if (!product || !activeVariant) return;
    
    const itemPayload = {
      id: activeVariant.id, // Використовуємо ID конкретної варіації
      productId: product.id,
      title: product.model || product.name,
      price: activeVariant.price || product.minPrice,
      image: activeVariant.images[0] || '/placeholder.png',
      quantity: qty,
      variation: activeVariant.name,
    };
    
    addItemToCart(itemPayload);
    alert(`Додано до кошика: ${activeVariant.name} (${qty} шт.)`); 
  };

  // Логіка Галереї
  const handleInlineScroll = (e: UIEvent<HTMLDivElement>) => {
    if (!e.currentTarget) return;
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    setActiveSlide(Math.round(scrollLeft / width));
  };

  const handleFullscreenScroll = (e: UIEvent<HTMLDivElement>) => {
    if (!e.currentTarget) return;
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    setFullscreenSlide(Math.round(scrollLeft / width));
  };

  const openGallery = (index: number) => {
    setFullscreenSlide(index);
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

  // Функція для створення градієнта або суцільного кольору для кружечка
  const getSwatchStyle = (options: Option[]) => {
    if (!options || options.length === 0) return { backgroundColor: '#CCCCCC' };
    
    const hexes = options.map(o => o.value.startsWith('#') ? o.value : `#${o.value}`);
    if (hexes.length >= 2) {
      return { background: `linear-gradient(135deg, ${hexes[0]} 50%, ${hexes[1]} 50%)` };
    }
    return { backgroundColor: hexes[0] };
  };

  // 4. Екрани завантаження та помилки
  if (isLoading) {
    return (
      <main className="min-h-screen bg-opora-white flex items-center justify-center">
        <div className="animate-pulse text-opora-brown font-medium">Завантаження товару...</div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-opora-white flex items-center justify-center text-center px-4">
        <div>
          <h2 className="text-2xl font-medium text-opora-brown mb-4">Товар не знайдено</h2>
          <p className="opacity-60">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-opora-white text-opora-brown">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-32 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        
        {/* ЛІВА КОЛОНКА (Галерея) */}
        <div className="relative w-full">
          <div 
            ref={inlineSliderRef}
            onScroll={handleInlineScroll}
            className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible snap-x snap-mandatory lg:snap-none gap-4 pb-4 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {currentImages.map((img, idx) => (
              <div 
                key={idx} 
                onClick={() => openGallery(idx)}
                className="w-full shrink-0 snap-center lg:snap-align-none aspect-[4/5] bg-opora-softBeige overflow-hidden relative cursor-pointer group"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${img})` }}
                />
              </div>
            ))}
          </div>

          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 lg:hidden pointer-events-none">
            {currentImages.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'bg-opora-brown w-4' : 'bg-opora-brown/30'
                }`} 
              />
            ))}
          </div>
        </div>

        {/* ПРАВА КОЛОНКА */}
        <div className="flex flex-col h-full">
          <div className="lg:sticky lg:top-32">
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-medium tracking-wide uppercase mb-1">
                  {product.model || product.name}
                </h1>
                <p className="text-xs opacity-60 mb-4">Art: {activeVariant?.sku || 'N/A'}</p>
                
                {/* Ціна оновлюється залежно від активної варіації */}
                <p className="text-xl mb-6">
                  {activeVariant?.price ? activeVariant.price.toLocaleString('uk-UA') : product.minPrice.toLocaleString('uk-UA')} ₴
                </p>
                
                <div className="flex items-center gap-6">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="text-xl w-6 hover:opacity-70">-</button>
                  <span className="text-lg font-light">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="text-xl w-6 hover:opacity-70">+</button>
                </div>
              </div>

              {/* Вибір Варіації */}
              {product.variants && product.variants.length > 0 && (
                <div className="flex flex-col items-end gap-2 pt-2">
                  <span className="text-sm font-medium">Колір (Комбінація)</span>
                  <div className="flex items-center gap-2">
                    {product.variants.slice(0, 4).map(variant => (
                      <button 
                        key={variant.id} 
                        onClick={() => setActiveVariant(variant)}
                        className={`w-6 h-6 rounded-full shadow-sm border-2 transition-all ${
                          activeVariant?.id === variant.id ? 'border-gray-900 scale-110' : 'border-opora-softBeige hover:scale-110'
                        }`} 
                        style={getSwatchStyle(variant.options)} 
                        title={variant.name}
                      />
                    ))}
                    
                    {product.variants.length > 4 && (
                      <button 
                        onClick={() => setVariantsModalOpen(true)} 
                        className="text-sm font-light hover:opacity-70 ml-1"
                      >
                        +{product.variants.length - 4}
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 max-w-[120px] text-right mt-1">
                    {activeVariant?.options.map(o => o.name).join(' / ')}
                  </span>
                </div>
              )}
            </div>

            <button 
              onClick={handleAddToCart}
              className={`w-full py-4 text-white font-medium transition-opacity mb-12 ${
                activeVariant?.inStock === false ? 'bg-gray-400 cursor-not-allowed' : 'bg-opora-brown hover:opacity-90'
              }`}
              disabled={activeVariant?.inStock === false}
            >
              {activeVariant?.inStock === false ? 'Немає в наявності' : 'Добавити до кошика'}
            </button>

            {product.assemblyVideoUrl && (
              <div className="mb-16 text-center">
                <h3 className="text-xl font-medium mb-6">Відео збірки</h3>
                <div className="relative w-full aspect-video bg-opora-softBeige rounded-xl overflow-hidden group">
                  
                  {isVideoPlaying ? (
                    /* ВАРІАНТ 1: Якщо Cloudflare віддає пряме посилання на відеофайл (.mp4) */
                    <video 
                      src={product.assemblyVideoUrl} 
                      controls 
                      autoPlay 
                      className="absolute inset-0 w-full h-full object-cover bg-black"
                      controlsList="nodownload" // Додатковий захист від завантаження
                    />

                    /* ВАРІАНТ 2: Якщо ти використовуєш Cloudflare Stream Iframe */
                    /*
                    <iframe
                      src={product.assemblyVideoUrl}
                      className="absolute inset-0 w-full h-full border-none"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen
                    />
                    */
                  ) : (
                    /* Прев'ю з кнопкою Play, яке показується до кліку */
                    <div 
                      onClick={() => setIsVideoPlaying(true)}
                      className="cursor-pointer w-full h-full relative"
                    >
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors z-10" />
                      <PlayIcon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-white z-20 opacity-90 group-hover:scale-110 transition-transform" />
                      {/* <div 
                        className="absolute inset-0 bg-cover bg-center"
                        // Використовуємо перше фото товару як обкладинку для відео
                        style={{ backgroundImage: `url(${currentImages[0]})` }}
                      /> */}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* Акордеони */}
            <div className="flex flex-col gap-6 mb-16">
              <div>
                <button onClick={() => toggleAccordion('desc')} className="flex items-center gap-2 text-lg hover:opacity-70 transition-opacity">
                  Опис {openAccordion === 'desc' ? <MinusIcon className="fill-amber-800" /> : <PlusIcon className="fill-amber-800" />}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openAccordion === 'desc' ? 'max-h-40 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="font-light text-sm opacity-80 leading-relaxed">{product.description}</p>
                </div>
              </div>

              <div>
                <button onClick={() => toggleAccordion('chars')} className="flex items-center gap-2 text-lg hover:opacity-70 transition-opacity">
                  Характеристики {openAccordion === 'chars' ? <MinusIcon className="fill-amber-800"/> : <PlusIcon className="fill-amber-800"/>}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openAccordion === 'chars' ? 'max-h-96 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <ul className="flex flex-col gap-2 font-light text-sm opacity-80">
                    {product.specifications?.map((spec, idx) => (
                      <li key={idx} className="flex justify-between border-b border-gray-100 pb-1">
                        <span>{spec.name}</span>
                        <span className="font-medium">{spec.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div>
                <button 
                  onClick={() => toggleAccordion('assembly')} 
                  className="flex items-center gap-2 text-lg hover:opacity-70 transition-opacity"
                >
                  Збірка {openAccordion === 'assembly' ? <MinusIcon className="fill-amber-800" /> : <PlusIcon className="fill-amber-800" />}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openAccordion === 'assembly' ? 'max-h-40 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="font-light text-sm opacity-80 mb-4">
                    Завантажте інструкцію по збірці у форматі PDF
                  </p>
                  
                  {/* 2. Update the button to use the handler */}
                  <button 
                    onClick={() => {
                      // Assuming your product data has a field for the PDF URL, e.g., product.assemblyPdfUrl
                      // Replace 'product.assemblyPdfUrl' with your actual property name
                      const pdfUrl = product.assemblyPdfUrl || "https://example.com/secured-cloudflare-url.pdf"; 
                      const filename = `Інструкція_збірки_${product.model.replace(/\s+/g, '_')}`;
                      handleDownloadPDF(pdfUrl, filename);
                    }}
                    className="border border-opora-brown py-2 px-6 font-medium text-sm hover:bg-opora-brown hover:text-white transition-colors"
                  >
                    Завантажити PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-16">
              <Reviews variation={product.model || product.name} />
            </div>
            
            {/* Форма відгуку (без змін) */}
          </div>
        </div>
      </div>

      {/* Модальне вікно для всіх кольорів */}
      {variantsModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setVariantsModalOpen(false)}
        >
          <div 
            className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium mb-6 text-lg">Всі варіанти кольорів</h3>
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
              {product.variants.map((variant) => (
                <button 
                  key={variant.id} 
                  className={`flex items-center gap-4 cursor-pointer group w-full text-left p-2 rounded-lg transition-colors ${
                    activeVariant?.id === variant.id ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setActiveVariant(variant);
                    setVariantsModalOpen(false);
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-full shadow-sm border border-black/10 shrink-0" 
                    style={getSwatchStyle(variant.options)}
                  />
                  <div>
                    <span className="block font-medium text-sm group-hover:opacity-70 transition-opacity">
                      {variant.name}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {variant.options.map(o => o.name).join(' / ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setVariantsModalOpen(false)}
              className="mt-6 w-full border border-opora-brown py-3 rounded-lg text-sm hover:bg-opora-brown hover:text-white transition-colors"
            >
              Закрити
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN GALLERY MODAL */}
      <div 
        className={`fixed inset-0 z-[100] bg-white flex flex-col h-[100dvh] transition-all duration-500 ease-in-out transform ${
          isFullscreen 
            ? "opacity-100 translate-y-0 pointer-events-auto" 
            : "opacity-0 translate-y-8 pointer-events-none"
        }`}
      >
        {/* Close Button */}
        <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
          <button 
            onClick={() => setIsFullscreen(false)}
            className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Закрити галерею"
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M1 13L13 1" stroke="#333333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Swipeable Main Image */}
        <div 
          ref={fullscreenSliderRef}
          onScroll={handleFullscreenScroll}
          onWheel={handleWheelScroll} // <--- Додано обробник скролу мишею
          className="flex-1 overflow-x-auto flex snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pt-16 md:pt-0"
        >
          {currentImages.map((img, idx) => (
            <div 
              key={idx} 
              className="w-full shrink-0 snap-center h-full flex items-center justify-center p-4 md:p-12"
            >
              <img 
                src={img} 
                alt={`Gallery image ${idx + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
        </div>

        {/* Thumbnails Row */}
        <div className="h-24 md:h-32 shrink-0 flex items-center justify-center gap-2 md:gap-4 px-4 overflow-x-auto pb-4 md:pb-8">
          {currentImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => scrollToFullscreenImage(idx)}
              className={`w-16 h-16 md:w-20 md:h-20 shrink-0 border-2 transition-all overflow-hidden ${
                fullscreenSlide === idx ? 'border-opora-brown scale-105' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

    </main>
  );
}