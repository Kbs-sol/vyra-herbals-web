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
  addItemToCart: (id: number | string, quantity?: number, product?: any) => Promise<void>;
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

  const addItemToCart = async (id: number | string, quantity: number = 1, product?: any): Promise<void> => {
    if (!id) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // 1. Optimistic Update
    const prevCartItems = [...cartItems];
    const prevCartCount = cartCount;

    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((item) => item.id == id); // Use == for loose equality

      if (existingItemIndex > -1) {
        // Item exists, update quantity
        const newItems = [...prevItems];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: (newItems[existingItemIndex].quantity || 0) + quantity,
        };
        return newItems;
      } else {
        // New item
        if (product) {
          // Construct a temporary CartItem using the passed product
          // This should match your CartItem type structure
          const newItem: CartItem = {
            id: typeof id === 'string' ? parseInt(id) : id,
            quantity: quantity,
            title: product.title,
            price: product.price,
            image_url: product.image_url,
            handle: product.handle,
            // Add other necessary fields if CartItem type requires them
            // For optimistic UI, title/price/image are usually enough
          } as CartItem;

          return [...prevItems, newItem];
        }
        // If no product details passed, we can't show it in the list optimistically 
        // but we can update the count.
        return prevItems;
      }
    });

    // Optimistically update count (more important for header)
    const existingItem = cartItems.find(item => item.id == id);
    if (!existingItem) {
      setCartCount(prev => prev + 1);
    }
    // If it exists, count (number of unique items) doesn't change, usually. 
    // Or if count represents total quantity? 
    // Context seems to define cartCount as items.length based on fetchCart: setCartCount(items.length);

    try {
      const existingItem = prevCartItems.find(item => item.id == id);
      let finalQuantity = quantity;
      if (existingItem) {
        finalQuantity = (existingItem.quantity || 0) + quantity;
      }

      // 2. Perform Async Operation
      const { error } = await supabase
        .from('cart')
        .upsert({
          user_id: user.id,
          product_id: id,
          quantity: finalQuantity
        }, { onConflict: 'user_id, product_id' });

      if (error) throw error;

      // 3. Confirm / Re-fetch to ensure consistency
      await fetchCart();
      toast.success("Added to cart");

    } catch (error) {
      console.error("Error adding product to cart:", error);
      toast.error("Failed to add to cart");

      // 4. Revert on Error
      setCartItems(prevCartItems);
      setCartCount(prevCartCount);
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

