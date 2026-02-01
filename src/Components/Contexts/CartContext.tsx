'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { APP_NAME } from "../../constants";
import { useAuth } from "./AuthContext";
import type { CartItem } from "@/types";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface CartContextType {
  cartCount: number;
  updateCartCount: (newCount: number) => void;
  cartItems: CartItem[];
  clearCart: () => void;
  addItemToCart: (id: number | string, quantity?: number) => Promise<void>;
  removeItemFromCart: (productId: number | string) => void;
  updateItemInCart: (action: 'increment' | 'decrement', productId: number | string) => void;
  fetchCartProductsFromAPI: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartCount, setCartCount] = useState<number>(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const router = useRouter();

  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      fetchCart();
    }
  }, [user, loading]);

  const fetchCart = async (): Promise<void> => {
    try {
      if (user && user.id) {
        // Fetch cart with product details joined
        const { data, error } = await supabase
          .from('cart')
          .select('quantity, product_id, products(*)')
          .eq('user_id', user.id);

        if (error) {
          console.error("Error fetching cart:", error);
          return;
        }

        if (data) {
          const items: CartItem[] = data.map((item: any) => ({
            ...item.products,
            quantity: item.quantity,
            // Ensure ID from product is used as the main ID for CartItem
            id: item.products.id
          }));

          setCartItems(items);
          setCartCount(items.length);
        }
      } else {
        // If not logged in, cart is empty (per requirement: login required to use cart)
        // We could optionally show local storage but requirement says "store ... in database instead of localstorage"
        // and "when he tries to add product to cart then it will login"
        setCartItems([]);
        setCartCount(0);
      }
    } catch (error) {
      console.error("Error fetching cart count:", error);
      setCartCount(0);
    }
  };

  const updateCartCount = (newCount: number): void => {
    setCartCount(newCount);
  };

  // Deprecated/No-op as we fetch details in fetchCart now
  const fetchCartProductsFromAPI = async (): Promise<void> => {
    // Already handled in fetchCart via join
    return Promise.resolve();
  };

  const addItemToCart = async (id: number | string, quantity: number = 1): Promise<void> => {
    if (!id) return;

    if (!user) {
      // Enforce login
      //   toast.info("Please login to add items to cart");
      router.push('/login');
      return;
    }

    try {
      // Upsert: simpler handling of "if exists update, else insert" if we had a unique constraint on (user_id, product_id)
      // The schema has UNIQUE(user_id, product_id), so upsert works great.

      // First, get current quantity if it exists to add to it? 
      // Supabase upsert will just replace unless we handle conflicts or use a function.
      // Easiest is to check if exists in current state or DB.

      const existingItem = cartItems.find(item => item.id === id);
      let finalQuantity = quantity;

      if (existingItem) {
        finalQuantity = (existingItem.quantity || 0) + quantity;
      }

      // Optimization: Insert or Update
      const { error } = await supabase
        .from('cart')
        .upsert({
          user_id: user.id,
          product_id: id,
          quantity: finalQuantity
        }, { onConflict: 'user_id, product_id' });

      if (error) throw error;

      await fetchCart();
      toast.success("Added to cart");

    } catch (error) {
      console.error("Error adding product to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  const removeItemFromCart = async (productId: number | string): Promise<void> => {
    if (!productId || !user) return;

    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      await fetchCart();
    } catch (error) {
      console.error("Error removing item from cart:", error);
    }
  };

  const updateItemInCart = async (action: 'increment' | 'decrement', productId: number | string): Promise<void> => {
    if (!user) return;

    const maxQty = 10;
    const currentItem = cartItems.find(item => item.id === productId);
    if (!currentItem) return;

    let newQty = currentItem.quantity;
    if (action === 'decrement') newQty -= 1;
    if (action === 'increment') newQty += 1;

    if (newQty < 1) return; // Or remove? Usually stay at 1.
    if (newQty > maxQty) return;

    try {
      const { error } = await supabase
        .from('cart')
        .update({ quantity: newQty })
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      // Optimistic update
      setCartItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));

    } catch (error) {
      console.error("Error updating item in cart:", error);
      await fetchCart(); // Revert on error
    }
  };

  const clearCart = async (): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setCartItems([]);
      setCartCount(0);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartCount,
        updateCartCount,
        cartItems,
        clearCart,
        addItemToCart,
        removeItemFromCart,
        updateItemInCart,
        fetchCartProductsFromAPI,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
// End of file

