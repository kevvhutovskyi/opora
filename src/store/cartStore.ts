import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  image: string;
  quantity: number;
  options: { name: string; value: string }[];
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  // UI: стан відкриття бокового кошика (керується глобально, щоб
  // будь-який компонент — наприклад CartToast — міг відкрити кошик)
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  // Computed values
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      isCartOpen: false,
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addItem: (newItem) => {
        set((state) => {
          // Check if the exact item (including variation) is already in the cart
          const existingItem = state.items.find((item) => item.id === newItem.id);

          if (existingItem) {
            // If it exists, just update the quantity
            return {
              items: state.items.map((item) =>
                item.id === newItem.id
                  ? { ...item, quantity: item.quantity + newItem.quantity }
                  : item
              ),
            };
          }

          // If it's a new item, add it to the array
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'opora-cart-storage', // The key used in localStorage
      // Зберігаємо лише товари — UI-прапорці (isCartOpen) не персистимо,
      // інакше кошик відкривався б сам після перезавантаження сторінки.
      partialize: (state) => ({ items: state.items }),
    }
  )
);