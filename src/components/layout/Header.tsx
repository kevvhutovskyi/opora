"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MenuIcon, CartIcon, OporaLogo } from "../ui/Icons";
import Drawer from "./Drawer";
import { useCartStore } from "@/store/cartStore";
import { ClientRequest, generateRequestNumber, formatUaPhone } from "@/lib";
import { STORE } from "@/lib/site";
import NovaPoshtaDelivery, { DeliverySelection } from "@/components/blocks/NovaPoshtaDelivery";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isVisible, setIsVisible] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Checkout State
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'success'>('cart');
  const [formData, setFormData] = useState({ name: '', phone: '+380' });
  const [delivery, setDelivery] = useState<DeliverySelection | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const cartItems = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const clearCart = useCartStore((state) => state.clearCart);

  // Стан відкриття кошика — глобальний (щоб CartToast міг його відкривати)
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);

  const handleCloseCart = () => {
    closeCart();
    setTimeout(() => {
      setCheckoutStep('cart');
      setFormData({ name: '', phone: '+380' });
      setDelivery(null);
    }, 300); // Reset after drawer transition finishes
  };

  const handleCheckoutSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsSubmitting(true);

  // Генеруємо номер замовлення на клієнті й передаємо на бекенд
  const newOrderNumber = generateRequestNumber();

  try {
    const payload: ClientRequest = {
      name: formData.name,
      phoneNumber: formData.phone,
      // email: formData.email, // Розкоментуйте, якщо додасте поле email у форму
      orderNumber: newOrderNumber,
      deliveryCity: delivery?.cityName,
      deliveryWarehouse: delivery?.warehouseName,
      orders: [
        ...cartItems,
      ]
    };

    // 2. Відправляємо запит
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { success?: boolean; error?: string };

    // 3. Обробляємо результат
    if (response.ok && data.success) {
      setOrderNumber(newOrderNumber);
      setCheckoutStep('success');
      clearCart();
    } else {
      alert(data.error || "Сталася помилка. Будь ласка, спробуйте пізніше.");
    }
  } catch (error) {
    console.error("Помилка відправки форми:", error);
    alert("Помилка з'єднання. Перевірте підключення до інтернету.");
  } finally {
    setIsSubmitting(false);
  }
};

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Toggle visibility
      setIsVisible(currentScrollY < lastScrollY || currentScrollY < 50);
      
      // Toggle background style: true if scrolled down more than 20px
      setHasScrolled(currentScrollY > 20);
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <header 
        className={`fixed top-0 left-0 w-full z-30 px-4 md:px-8 py-6 flex justify-between items-center text-opora-brown 
          transition-all duration-300 ease-in-out
          ${isVisible ? "translate-y-0" : "-translate-y-full"}
          ${hasScrolled 
            ? "bg-opora-softBeige shadow-md" 
            : "bg-transparent backdrop-blur-md"
          }
        `}
      >
        <button
          onClick={openCart}
          aria-label="Відкрити кошик"
          className="hover:opacity-70 transition-opacity p-2 -ml-2 relative"
        >
          <CartIcon className="w-6 h-6" />
          {getTotalItems() > 0 && (
            <span className="absolute top-1 right-0 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {getTotalItems()}
            </span>
          )}
        </button>

        {/* Логотип */}
        <Link 
          href="/" 
          className="text-2xl md:text-3xl tracking-[0.2em] uppercase font-medium"
        >
          <OporaLogo />
        </Link>

        {/* Кнопка меню (Бургер) */}
        <button 
          onClick={() => setIsMenuOpen(true)} 
          aria-label="Відкрити меню" 
          className="hover:opacity-70 transition-opacity p-2 -mr-2"
        >
          <MenuIcon className="w-6 h-6" />
        </button>

      </header>

      <Drawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} position="left">
        <div className="flex flex-col h-full justify-between pb-6">
          <div className="flex flex-col items-center text-center mt-12 space-y-12">

            {/* Навігація */}
            <nav>
              <ul className="space-y-4 text-xl font-medium">
                <li>
                  <Link href="/" onClick={() => setIsMenuOpen(false)} className="hover:opacity-70 transition-opacity">
                    Головна
                  </Link>
                </li>
                <li>
                  <Link href="/catalog" onClick={() => setIsMenuOpen(false)} className="hover:opacity-70 transition-opacity">
                    Каталог
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Блок: Контакти + Адреса */}
            <div>
              <h3 className="font-bold text-lg mb-6">Контакти</h3>
              <ul className="space-y-4 text-base">
                <li>
                  <a href={`tel:+${STORE.phoneRaw}`} className="hover:opacity-70 transition-opacity">
                    {STORE.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${STORE.email}`} className="hover:opacity-70 transition-opacity">
                    {STORE.email}
                  </a>
                </li>
                <li>{STORE.addressLine}, {STORE.city}</li>
                <li>{STORE.hours}</li>
              </ul>
            </div>
          </div>

          {/* Футер всередині меню */}
          <div className="text-center text-sm text-opora-brown/80 mt-10">
            <p className="mb-2">© 2026 OPORA. Всі права захищені.</p>
          </div>
        </div>
      </Drawer>

      {/* Кошик Drawer */}
      <Drawer isOpen={isCartOpen} onClose={handleCloseCart} position="right">
        <div className="flex flex-col h-full text-opora-brown">
          
          {/* STEP 1: CART ITEMS */}
          {checkoutStep === 'cart' && (
            <>
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    <p className="text-lg">Ваш кошик порожній</p>
                    <Link
                      href="/catalog"
                      onClick={handleCloseCart}
                      className="py-3 px-8 bg-opora-brown text-white font-medium hover:opacity-90 transition-opacity"
                    >
                      До покупок
                    </Link>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="relative w-20 h-20 bg-opora-softBeige rounded-sm shrink-0 overflow-hidden">
                        <Image src={item.image} alt={item.title} fill sizes="80px" className="object-cover object-center" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium leading-tight mb-1">{item.title}</h4>
                        <div className="flex items-center gap-2 mb-1">
                          {item.options.map((opt, i) => (
                            <span
                              key={i}
                              className="w-3 h-3 rounded-full border border-black/10 inline-block shrink-0"
                              style={{ backgroundColor: opt.value }}
                              title={opt.name}
                            />
                          ))}
                          <p className="text-xs font-light opacity-60">Art: {item.sku}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="hover:opacity-70 text-lg leading-none">-</button>
                          <span className="text-sm font-light">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="hover:opacity-70 text-lg leading-none">+</button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button onClick={() => removeItem(item.id)} className="p-1 hover:opacity-70 transition-opacity"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <p className="text-sm font-medium whitespace-nowrap">{(item.price * item.quantity).toLocaleString('uk-UA')} ₴</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="pt-6 mt-auto bg-opora-white">
                  <div className="flex justify-between items-center mb-6 text-lg font-medium border-t border-opora-brown/10 pt-6">
                    <span>Разом:</span>
                    <span>{getTotalPrice().toLocaleString('uk-UA')} ₴</span>
                  </div>
                  <button 
                    onClick={() => setCheckoutStep('form')}
                    className="w-full py-4 bg-opora-brown text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    Оформити замовлення
                  </button>
                </div>
              )}
            </>
          )}

          {/* STEP 2: CHECKOUT FORM (Matches image_a2eb05.png) */}
          {checkoutStep === 'form' && (
            <div className="flex flex-col h-full items-center justify-center text-center">
              <h3 className="font-bold text-2xl mb-2">Визначились з замовленням?</h3>
              <p className="text-lg font-light mb-8 max-w-62.5">
                Заповніть форму і ми вам передзвонимо!
              </p>
              
              <form onSubmit={handleCheckoutSubmit} className="w-full max-w-sm space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ваше ім'я"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-opora-brown p-4 pr-8 text-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-opora-brown placeholder:text-opora-brown/50"
                  />
                  <span className="absolute top-3 right-3 text-red-500 text-lg leading-none pointer-events-none">*</span>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="+380 XX XXX XX XX"
                    pattern="^\+380 \d{2} \d{3} \d{2} \d{2}$"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatUaPhone(e.target.value) })}
                    className="w-full border border-opora-brown p-4 pr-8 text-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-opora-brown placeholder:text-opora-brown/50"
                  />
                  <span className="absolute top-3 right-3 text-red-500 text-lg leading-none pointer-events-none">*</span>
                </div>

                <NovaPoshtaDelivery value={delivery} onChange={setDelivery} />

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-opora-brown text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isSubmitting ? 'Відправка...' : 'Оформити замовлення'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setCheckoutStep('cart')}
                    className="w-full mt-4 text-sm underline underline-offset-4 hover:opacity-70"
                  >
                    Повернутися до кошика
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {checkoutStep === 'success' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <h3 className="font-bold text-2xl mb-4">Дякуємо за замовлення!</h3>
              {orderNumber && (
                <p className="text-sm font-medium mb-3 px-4 py-1.5 rounded-full bg-opora-softBeige">
                  Замовлення №{orderNumber}
                </p>
              )}
              <p className="text-lg font-light mb-8 max-w-62.5">
                Наш менеджер зв'яжеться з вами найближчим часом для підтвердження.
              </p>
              <button
                onClick={handleCloseCart}
                className="py-4 px-8 border border-opora-brown hover:bg-opora-brown hover:text-white transition-colors"
              >
                Закрити
              </button>
            </div>
          )}

        </div>
      </Drawer>
    </>
  );
}