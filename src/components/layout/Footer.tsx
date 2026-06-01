"use client";

import { useState } from "react";
import { PlusIcon, MinusIcon, ChairLogo } from "../ui/Icons";

export default function Footer() {
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track which FAQ is open. Only one opens at a time for a cleaner look.
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const handleFormSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phoneNumber: formData.phone,
          orders: [] // Empty array for a general consultation request
        }),
      });

      if (response.ok) {
        alert("Заявка успішно відправлена! Наш менеджер зв'яжеться з вами найближчим часом.");
        setFormData({ name: "", phone: "" });
      } else {
        alert("Сталася помилка. Спробуйте пізніше.");
      }
    } catch (error) {
      console.error("Помилка відправки:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real, professional text to replace the placeholders
  const buyerInfo = [
    {
      id: "delivery",
      title: "Оплата та доставка",
      text: "Ми здійснюємо доставку по всій Україні за допомогою Нової Пошти. Оплата можлива готівкою при отриманні (післяплата), переказом на карту або за безготівковим розрахунком для юридичних осіб. Термін відправки: 1-3 робочих дні."
    },
    {
      id: "returns",
      title: "Обмін та повернення",
      text: "Ви можете повернути або обміняти товар протягом 14 днів з моменту покупки згідно із Законом України «Про захист прав споживачів», за умови збереження товарного вигляду, упаковки та чеку."
    },
    {
      id: "warranty",
      title: "Гарантія якості",
      text: "Всі меблі OPORA проходять суворий контроль якості. Ми надаємо офіційну гарантію від виробника терміном на 12 місяців на всю продукцію, що підтверджує нашу впевненість у матеріалах та збірці."
    }
  ];

  return (
    // Reduced padding: py-16 md:py-24 -> py-12 md:py-16
    <footer className="relative bg-opora-brown text-white overflow-hidden py-12 md:py-16">
      
      {/* Background SVG Chair */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] md:w-[600px] md:h-[600px] opacity-5 pointer-events-none translate-x-1/4 translate-y-1/4">
        <ChairLogo className="w-full h-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Top Section: Form (More compact spacing) */}
        <div className="max-w-md mx-auto text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-medium tracking-wider mb-2">Важко обрати?</h2>
          <p className="text-white/80 mb-6 font-light">
            Залиште заявку і наш менеджер зв'яжеться з вами
          </p>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Ваше ім'я"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent border border-white/40 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:border-white transition-colors"
            />
            <input
              type="tel"
              placeholder="+380 XX XXX XX XX"
              pattern="^\+?[1-9]\d{7,14}$"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-transparent border border-white/40 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white text-opora-brown font-medium py-3 mt-1 hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Відправка..." : "Отримати консультацію"}
            </button>
          </form>
        </div>

        {/* Bottom Section: Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          
          {/* Column 1: Buyers FAQ */}
          <div>
            <h3 className="text-lg font-medium mb-5 tracking-wide uppercase">Покупцям</h3>
            <ul className="space-y-3">
              {buyerInfo.map((item) => (
                <li key={item.id} className="border-b border-white/10 pb-2 last:border-0">
                  <button 
                    onClick={() => toggleFaq(item.id)}
                    className="flex items-center gap-3 text-white/90 hover:text-white transition-colors w-full text-left font-light"
                  >
                    <span className="shrink-0">
                      {openFaq === item.id ? <MinusIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                    </span>
                    <span className="text-base">{item.title}</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === item.id ? 'max-h-60 opacity-100 mt-3 pl-7' : 'max-h-0 opacity-0'}`}>
                    <p className="text-sm text-white/70 font-light leading-relaxed pr-4">
                      {item.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Contacts */}
          <div>
            <h3 className="text-lg font-medium mb-5 tracking-wide uppercase">Контакти</h3>
            <div className="space-y-3 font-light text-white/80">
              <p>
                <a href="tel:+380000000000" className="hover:text-white transition-colors">[Номер телефону]</a>
              </p>
              <p>
                <a href="mailto:info@opora.ua" className="hover:text-white transition-colors">info@opora.ua</a>
              </p>
              <p>Щодня з 10:00 до 20:00</p>
            </div>
          </div>

          {/* Column 3: Store & Map */}
          <div className="flex flex-col items-start md:items-end md:text-right">
            <h3 className="text-lg font-medium mb-5 tracking-wide uppercase">Наші магазини</h3>
            <p className="font-medium mb-1">Львів</p>
            <p className="font-light text-white/80 mb-2">Вулиця Степана Бандери, 12.</p>
            <p className="font-medium mb-5 text-sm">Щодня з 10:00 до 20:00</p>
            
            {/* Map Placeholder */}
            <div className="w-full max-w-[650px] aspect-[2/1] bg-white/10 rounded-sm overflow-hidden border border-white/20">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2573.232598375438!2d24.015112576916515!3d49.83810247148003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x473add7bceb83e6b%3A0xc39f88c3af37d39!2sStepana%20Bandery%20St%2C%2012%2C%20L&#39;viv%2C%20L&#39;vivs&#39;ka%20oblast%2C%20Ukraine%2C%2079000!5e0!3m2!1sen!2sus!4v1716900000000!5m2!1sen!2sus" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="OPORA Магазин Львів"
              />
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div className="mt-16 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-sm font-light text-white/50">
          <p>© 2026 OPORA. Всі права захищені.</p>
          <a href="#" className="hover:text-white mt-2 md:mt-0 transition-colors">Політика конфіденційності</a>
        </div>

      </div>
    </footer>
  );
}