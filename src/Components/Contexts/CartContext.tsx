'use client';

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from "react";
import { APP_NAME } from "../../constants";
import { useAuth } from "./AuthContext";
import type { CartItem } from "@/types";
import { supabase } from "@/utils/supabaseClient";
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

/** Per-line quantity ceiling, shared by the guest and signed-in paths. */
const MAX_CART_QTY = 10;

/**
 * ---- Guest cart ----
 * A signed-in cart lives in the `cart` table keyed on `user_id`. Guests have no
 * user_id, so their selections are parked in localStorage as {product_id, quantity}
 * only — never product details, so prices and stock are always re-read from the
 * server and can't go stale in a shopper's browser. On sign-in,
 * mergeGuestCartIntoAccount() folds these rows into the database cart and clears
 * this key.
 */
const GUEST_CART_KEY = 'vyra_guest_cart_v1';

interface GuestCartEntry {
  product_id: number | string;
  quantity: number;
}

const readGuestCart = (): GuestCartEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: this data is user-editable, so re-validate rather than trust it.
    return parsed
      .filter((entry: any) => entry && entry.product_id !== null && entry.product_id !== undefined)
      .map((entry: any) => ({
        product_id: entry.product_id,
        quantity: Math.min(MAX_CART_QTY, Math.max(1, Number(entry.quantity) || 1)),
      }));
  } catch {
    return [];
  }
};

const writeGuestCart = (entries: GuestCartEntry[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded or private-browsing storage denial: the in-memory cart still
    // works for this page view, it just won't survive a reload.
  }
};

const clearGuestCart = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // ignore
  }
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartCount, setCartCount] = useState<number>(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [directCheckoutItems, setDirectCheckoutItems] = useState<CouponLineItem[] | null>(null);
  // Guards the guest-cart merge so it runs exactly once per sign-in, even though
  // supabase can re-emit auth events for the same user.
  const mergedForUserId = useRef<string | null>(null);
  // Holds the current merge so concurrent effect runs await the same work.
  const mergeInFlight = useRef<Promise<void> | null>(null);

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
    if (loading) return;

    let cancelled = false;
    (async () => {
      // On a fresh sign-in, fold any guest selections into the account *before*
      // the first read. Doing it in this order means the cart never flashes empty
      // and never loses what the shopper picked out before logging in.
      if (user?.id) {
        if (mergedForUserId.current !== String(user.id)) {
          // Share a single in-flight merge across effect runs. React StrictMode
          // invokes effects twice in development, and without this the second run
          // would skip the merge and read the cart while the first run's upsert
          // was still in flight — showing the pre-merge cart.
          if (!mergeInFlight.current) {
            const uid = String(user.id);
            mergeInFlight.current = mergeGuestCartIntoAccount(user.id)
              // Only mark this user as merged once it actually succeeded, so a
              // failed merge is retried instead of leaving the guest's items
              // stranded in localStorage while the cart renders empty.
              .then((merged) => { if (merged) mergedForUserId.current = uid; })
              .finally(() => { mergeInFlight.current = null; });
          }
          await mergeInFlight.current;
        }
      } else {
        mergedForUserId.current = null;
      }

      if (!cancelled) await fetchCart();
    })();

    return () => { cancelled = true; };
    // Depend on user.id (stable) rather than the user object — supabase's
    // onAuthStateChange replaces the user reference on every token refresh,
    // which would otherwise cause needless cart refetches mid-checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  /**
   * Turn stored {product_id, quantity} rows into renderable cart items by
   * re-reading the products from the server. Mirrors the `products(*)` join the
   * signed-in path gets from supabase.
   *
   * Returns null if the lookup failed, which the caller must distinguish from an
   * empty array — blanking the cart on a transient network error would show
   * "your cart is empty" to a shopper whose items are still safely stored.
   */
  const hydrateGuestCart = async (entries: GuestCartEntry[]): Promise<CartItem[] | null> => {
    if (entries.length === 0) return [];

    try {
      const res = await fetch('/api/products/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: entries.map(e => e.product_id) }),
      });

      if (!res.ok) throw new Error(`Failed to load cart products (${res.status})`);

      const products = await res.json();
      if (!Array.isArray(products)) return null;

      // Walk `entries` (not `products`) so the shopper's own ordering is kept.
      // Ids that no longer resolve to a product are dropped — deleted or
      // unpublished items shouldn't wedge the cart.
      return entries.reduce<CartItem[]>((acc, entry) => {
        const product = products.find((p: any) => String(p.id) === String(entry.product_id));
        if (product) {
          acc.push({ ...product, id: product.id, quantity: entry.quantity } as CartItem);
        }
        return acc;
      }, []);
    } catch (error) {
      console.error("Error hydrating guest cart:", error);
      return null;
    }
  };

  /**
   * Move the guest cart into the signed-in user's `cart` rows. Quantities combine
   * the same way addItemToCart does (existing + incoming), and the upsert's
   * onConflict target means a product already in the account cart is updated in
   * place rather than duplicated.
   *
   * Returns true when the guest cart has been handed over (or there was nothing to
   * hand over). Returns false if the database rejected it, so the caller can retry
   * rather than treat the transfer as done.
   */
  const mergeGuestCartIntoAccount = async (userId: string | number): Promise<boolean> => {
    const entries = readGuestCart();
    if (entries.length === 0) return true;

    try {
      const { data: existingRows, error: readError } = await supabase
        .from('cart')
        .select('product_id, quantity')
        .eq('user_id', userId);

      if (readError) throw readError;

      const existingQty = new Map<string, number>();
      (existingRows || []).forEach((row: any) => {
        existingQty.set(String(row.product_id), Number(row.quantity) || 0);
      });

      const rows = entries.map(entry => {
        const existing = existingQty.get(String(entry.product_id)) || 0;
        return {
          user_id: userId,
          product_id: entry.product_id,
          // Cap the combined quantity, but never below what the account already
          // held: the signed-in add path doesn't clamp, so an existing line can
          // legitimately sit above MAX_CART_QTY and a merge must not silently
          // shrink it.
          quantity: Math.max(existing, Math.min(MAX_CART_QTY, existing + entry.quantity)),
        };
      });

      const { error: upsertError } = await supabase
        .from('cart')
        .upsert(rows, { onConflict: 'user_id, product_id' });

      if (upsertError) throw upsertError;

      // Only drop the local copy once the database has accepted it, so a failed
      // merge leaves the guest cart intact for the next attempt.
      clearGuestCart();
      return true;
    } catch (error) {
      console.error("Error merging guest cart into account:", error);
      return false;
    }
  };

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
        // Guests shop without an account: their cart is held in localStorage and
        // rehydrated from the server here, then merged on sign-in. A null result
        // means the lookup failed, so leave the current items on screen rather
        // than wrongly telling the shopper their cart is empty.
        const items = await hydrateGuestCart(readGuestCart());
        if (items === null) return;
        setCartItems(items);
        setCartCount(items.length);
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

    // Guests are not redirected to /login here — that gate now lives at checkout.
    // Their picks go to localStorage and are merged into the account on sign-in.
    if (!user) {
      const entries = readGuestCart();
      const existingIndex = entries.findIndex(e => String(e.product_id) === String(id));

      if (existingIndex > -1) {
        entries[existingIndex] = {
          ...entries[existingIndex],
          quantity: Math.min(MAX_CART_QTY, entries[existingIndex].quantity + quantity),
        };
      } else {
        entries.push({ product_id: id, quantity: Math.min(MAX_CART_QTY, Math.max(1, quantity)) });
      }

      writeGuestCart(entries);
      await fetchCart();
      toast.success("Added to cart");
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
    if (!productId) return;

    if (!user) {
      writeGuestCart(readGuestCart().filter(e => String(e.product_id) !== String(productId)));
      await fetchCart();
      return;
    }

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
    const currentItem = cartItems.find(item => item.id === productId);
    if (!currentItem) return;

    let newQty = currentItem.quantity;
    if (action === 'decrement') newQty -= 1;
    if (action === 'increment') newQty += 1;

    if (newQty < 1) return; // Or remove? Usually stay at 1.
    if (newQty > MAX_CART_QTY) return;

    if (!user) {
      writeGuestCart(
        readGuestCart().map(e =>
          String(e.product_id) === String(productId) ? { ...e, quantity: newQty } : e
        )
      );
      setCartItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
      return;
    }

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
    if (!user) {
      clearGuestCart();
      setCartItems([]);
      setCartCount(0);
      setAppliedCoupon(null);
      return;
    }

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

