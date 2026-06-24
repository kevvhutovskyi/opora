"use client";

import { useEffect } from "react";
import { CloseIcon, CartIcon, OporaLogo } from "../ui/Icons";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCartClick?: () => void;
  children: React.ReactNode;
  position?: "left" | "right";
}

export default function Drawer({ isOpen, onClose, onCartClick, children, position = 'left' }: DrawerProps) {
  const sideClasses =
    position === "right"
      ? isOpen
        ? "left-0 translate-x-0"
        : "left-0 -translate-x-full"
      : isOpen
        ? "right-0 translate-x-0"
        : "right-0 translate-x-full";

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={`
        fixed top-0 h-[100svh]
        bg-opora-white z-50 flex flex-col
        transform transition-transform duration-300 ease-in-out
        w-full md:w-[400px]
        ${sideClasses}
      `}>
        {/* ЄДИНА ШАПКА ДЛЯ ВСІХ СТАНІВ */}
        <div className={`flex ${position === 'left' ? 'justify-end' : 'justify-start'} items-center px-6 py-6 border-b border-opora-brown/10 bg-opora-white`}>
          {onCartClick && <button 
            onClick={onCartClick} 
            aria-label="Відкрити кошик" 
            className="p-2 -ml-2 text-opora-brown hover:opacity-70 transition-opacity"
          >
            <CartIcon className="w-6 h-6" />
          </button>}

          <button
            onClick={onClose}
            aria-label="Закрити"
            className="p-2 -mr-2 text-opora-brown hover:opacity-70 transition-opacity"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Змінний контент (Меню, Фільтри, Сортування) */}
        <div className="flex-1 overflow-y-auto sm:overflow-hidden px-3 py-5">
          {children}
        </div>
      </div>
    </>
  );
}