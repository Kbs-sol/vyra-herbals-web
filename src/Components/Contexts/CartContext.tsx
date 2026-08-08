'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { APP_NAME } from "../../constants";
import { useAuth } from "./AuthContext";
import type { CartItem } from "@/types";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface AppliedCoupon {
  code: string;
  discount: number;
  description?: string | null;
  discount_type?: 'percent' | 'flat';
  discount_value?: number;
}

interface CartContextType {
  cartCount: number;
  updateCartCount: (newCount: number) => void;
  cartItems: CartItem[];
  clearCart: () => void;
  addItemToCart: (id: number | string, quantity?: number, product?: any) => Promise<void>;
  removeItemFromCart: (productId: number | string) => void;
  updateItemInCart: (action: 'increment' | 'decrement', productId: number | string) => void;
  fetchCartProductsFromAPI: () => Promise<void>;
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (code: string) => Promise<{ ok: boolean; reason?: string }>;
  removeCoupon: () => void;
  /**
   * "Buy now" bypasses the cart entirely — Checkout is handed the product
   * directly. Coupons must still validate against *something*, so the
   * buy-now flow registers its line items here and the coupon logic below
   * prefers them over `cartItems` (which is legitimately empty in that flow).
   */
  directCheckoutItems: CouponLineItem[] | null;
  setDirectCheckoutItems: (items: CouponLineItem[] | null) => void;
}

interface CouponLineItem {
  id: number | string;
  price: number;
  quantity: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartCount, setCartCount] = useState<number>(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [directCheckoutItems, setDirectCheckoutItems] = useState<CouponLineItem[] | null>(null);
  const router = useRouter();

  // Items a coupon is validated against: the buy-now line items when the
  // direct-checkout flow is active, otherwise the cart.
  const couponItems: CouponLineItem[] =
    directCheckoutItems && directCheckoutItems.length > 0
      ? directCheckoutItems
      : (cartItems || []).map(it => ({
        id: it.id,
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 0,
      }));
  const couponItemsKey = couponItems.map(i => `${i.id}:${i.quantity}:${i.price}`).join('|');

  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      fetchCart();
    }
    // Depend on user.id (stable) rather than the user object — supabase's
    // onAuthStateChange replaces the user reference on every token refresh,
    // which would otherwise cause needless cart refetches mid-checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

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
      setAppliedCoupon(null);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const applyCoupon = async (code: string): Promise<{ ok: boolean; reason?: string }> => {
    const trimmed = (code || '').trim();
    if (!trimmed) return { ok: false, reason: 'Enter a coupon code' };
    if (couponItems.length === 0) {
      return { ok: false, reason: 'Add items to cart before applying a coupon' };
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // Forward auth so the API can enforce per-user usage limits
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      } catch { /* ignore */ }

      const items = couponItems;

      const res = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: trimmed, items }),
      });
      const data = await res.json();

      if (!data?.ok) {
        setAppliedCoupon(null);
        return { ok: false, reason: data?.reason || 'Invalid coupon' };
      }

      setAppliedCoupon({
        code: data.coupon?.code || trimmed.toUpperCase(),
        discount: Number(data.discount) || 0,
        description: data.coupon?.description || null,
        discount_type: data.coupon?.discount_type,
        discount_value: data.coupon?.discount_value,
      });
      return { ok: true };
    } catch (e: any) {
      console.error('applyCoupon error:', e);
      return { ok: false, reason: 'Failed to validate coupon' };
    }
  };

  const removeCoupon = (): void => {
    setAppliedCoupon(null);
  };

  // Re-validate or recompute coupon discount whenever cart items change
  // (silently drop the coupon if it no longer applies — e.g. items removed below min order)
  useEffect(() => {
    if (!appliedCoupon) return;
    const code = appliedCoupon.code;
    // No items left → drop coupon
    if (couponItems.length === 0) {
      setAppliedCoupon(null);
      return;
    }
    // Re-run validation in background to recompute discount for the new totals
    (async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
        } catch { /* ignore */ }
        const res = await fetch('/api/coupon/validate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ code, items: couponItems }),
        });
        const data = await res.json();
        if (data?.ok) {
          setAppliedCoupon(prev => prev && prev.code === code ? { ...prev, discount: Number(data.discount) || 0 } : prev);
        } else {
          // Coupon no longer applies — drop it
          setAppliedCoupon(null);
        }
      } catch {
        // network errors: leave as-is, server will re-validate at order time
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponItemsKey]);

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
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        directCheckoutItems,
        setDirectCheckoutItems,
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

