// src/store/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the shape of a single cart item
export interface CartItem {
  id: string; // E.g., "mc-001-b-beige" (Product ID + Variation)
  productId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  variation?: string; // Optional: To distinguish between colors/sizes
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  // Computed values
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

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
    }
  )
);