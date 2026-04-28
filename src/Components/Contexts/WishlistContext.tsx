'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface WishlistItem {
  id: number;
  title: string;
  handle: string;
  price: number;
  regular_price?: number;
  image_url: string;
  category?: string;
}

interface WishlistContextType {
  wishlistCount: number;
  wishlistItems: WishlistItem[];
  addToWishlist: (productId: number | string, product?: any) => Promise<void>;
  removeFromWishlist: (productId: number | string) => Promise<void>;
  isInWishlist: (productId: number | string) => boolean;
  fetchWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const router = useRouter();
  const { user, loading } = useAuth();

  const wishlistCount = useMemo(() => wishlistItems.length, [wishlistItems]);

  useEffect(() => {
    if (!loading) {
      fetchWishlist();
    }
    // Depend on user.id (stable) so token refreshes don't refetch needlessly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  const fetchWishlist = async (): Promise<void> => {
    try {
      if (user && user.id) {
        // Fetch wishlist with product details joined
        const { data, error } = await supabase
          .from('wishlist')
          .select('product_id, products(*)')
          .eq('user_id', user.id);

        if (error) {
          console.error("Error fetching wishlist:", error);
          return;
        }

        if (data) {
          const items: WishlistItem[] = data.map((item: any) => ({
            ...item.products,
            id: item.products.id
          }));
          setWishlistItems(items);
        }
      } else {
        // Not logged in - clear wishlist
        setWishlistItems([]);
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      setWishlistItems([]);
    }
  };

  const isInWishlist = useCallback((productId: number | string): boolean => {
    return wishlistItems.some((item) => item.id == productId);
  }, [wishlistItems]);

  const addToWishlist = async (productId: number | string, product?: any): Promise<void> => {
    if (!productId) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Check if already in wishlist
    if (isInWishlist(productId)) {
      toast.info("Already in wishlist");
      return;
    }

    // Optimistic update
    const prevItems = [...wishlistItems];
    if (product) {
      const newItem: WishlistItem = {
        id: typeof productId === 'string' ? parseInt(productId) : productId,
        title: product.title,
        handle: product.handle,
        price: product.price,
        regular_price: product.regular_price,
        image_url: product.image_url,
        category: product.category,
      };
      setWishlistItems(prev => [...prev, newItem]);
    }

    try {
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: productId
        });

      if (error) throw error;

      // Re-fetch to ensure consistency
      await fetchWishlist();
      toast.success("Added to wishlist");

    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("Failed to add to wishlist");
      // Revert on error
      setWishlistItems(prevItems);
    }
  };

  const removeFromWishlist = async (productId: number | string): Promise<void> => {
    if (!productId || !user) return;

    // Optimistic update
    const prevItems = [...wishlistItems];
    setWishlistItems(prev => prev.filter(item => item.id != productId));

    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
      // Revert on error
      setWishlistItems(prevItems);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistCount,
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
