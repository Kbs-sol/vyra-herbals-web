'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { API_PATH, APP_NAME } from "../../constants";
import { useAuth } from "./AuthContext";
import type { CartItem } from "@/types";

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

  const { user } = useAuth();

  useEffect(() => {
    fetchCart();
  }, []);

  const getCartFromLocal = (): CartItem[] => {
    return JSON.parse(localStorage.getItem(`${APP_NAME}_cart`) || '[]') as CartItem[];
  };

  const fetchCart = async (): Promise<void> => {
    try {
      // Check if the user is logged in
      if (user && user.id) {
        // User is logged in, fetch cart count from API
        const postData = {
          tbl_name: "cart",
          user_id: user.id,
        };

        const requestOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        };

        const response = await fetch(`${API_PATH}/data`, requestOptions);
        const data = await response.json();

        // Ensure data is an array and set cart count
        if (Array.isArray(data)) {
          setCartItems([...data]);
          setCartCount(data.length);
        } else {
          console.error("Unexpected data format:", data);
          setCartCount(0);
        }
      } else {
        // User is not logged in, retrieve cart count from localStorage
        const cartList = getCartFromLocal();
        setCartItems([...cartList]);
        setCartCount(cartList.length);
      }
    } catch (error) {
      console.error("Error fetching cart count:", error);
      setCartCount(0);
    }
  };

  const updateCartCount = (newCount: number): void => {
    setCartCount(newCount);
  };

  /**
   * Fetch the details of the each product present in the existing cart
   */
  const fetchCartProductsFromAPI = async (): Promise<void> => {
    const updateProductQuantities = (products: any[], items: CartItem[]): CartItem[] => {
      return products.map((product) => ({
        ...product,
        quantity: items.find((item) => item.id === product.id)?.quantity || 0,
      }));
    };
    if (cartItems.length) {
      const productIds = cartItems.map((item) => item.id);
      return fetch(`${API_PATH}/products/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productIds: productIds }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch product details");
          }
          return response.json();
        })
        .then((products) => {
          setCartItems(updateProductQuantities(products, cartItems));
        })
        .catch((error) =>
          console.error("Error fetching product details:", error)
        );
    }
  };

  /**
   * Adds the product to the existing cart
   * @param {number} id - ID of the product
   * @param {string} quantity - Quantity of product to be added (dafault is 1)
   */

  const addItemToCart = async (id: number | string, quantity: number = 1): Promise<void> => {
    if (!id) {
      console.error("Product or Product ID is undefined");
      return;
    }
    try {
      if (user && user.id) {
        // Handle API call for logged-in users
        const response = await fetch(`${API_PATH}/cart/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, product_id: id, quantity })
        });

        if (!response.ok) {
          throw new Error('Failed to add item to cart');
        }

        // Refresh cart to get updated backend state
        await fetchCart();
      } else {
        const cart = [...getCartFromLocal()];
        const existingItemIndex = cart.findIndex(item => item.id === id);

        if (existingItemIndex > -1) {
          cart[existingItemIndex].quantity = (Number(cart[existingItemIndex].quantity) || 0) + quantity;
        } else {
          cart.push({ id, quantity });
        }

        setCartItems(cart);
        localStorage.setItem(`${APP_NAME}_cart`, JSON.stringify(cart));
        setCartCount(cart.length);
      }
    } catch (error) {
      console.error("Error adding product to cart:", error);
    }
  };

  const removeItemFromCart = async (productId: number | string): Promise<void> => {
    if (!productId) {
      console.log("Invalid productId passed to remove");
      return;
    }

    try {
      if (user && user.id) {
        const response = await fetch(`${API_PATH}/cart/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, product_id: productId })
        });

        if (!response.ok) {
          throw new Error('Failed to remove item from cart');
        }
        await fetchCart();
      } else {
        // Remove the item with matching ID
        const filteredCart = cartItems.filter((item) => item.id !== productId);

        // Update local storage with the filtered cart items
        localStorage.setItem(`${APP_NAME}_cart`, JSON.stringify(filteredCart));
        setCartItems(filteredCart);
        setCartCount(filteredCart.length);
      }
    } catch (error) {
      console.error("Error removing item from cart:", error);
    }
  };

  const updateItemInCart = async (action: 'increment' | 'decrement', productId: number | string): Promise<void> => {
    const maxQty = 10;

    // Optimistic update helper
    const calculateNewQty = (currentQty: number) => {
      if (action === 'decrement') return currentQty - 1;
      if (action === 'increment') return currentQty < maxQty ? currentQty + 1 : currentQty;
      return currentQty;
    };

    try {
      if (user && user.id) {
        const currentItem = cartItems.find(item => item.id === productId);
        if (!currentItem) return;

        const newQty = calculateNewQty(Number(currentItem.quantity));
        if (newQty < 1) return; // Prevent reducing below 1 via update, usu. remove is explicit

        const response = await fetch(`${API_PATH}/cart/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, product_id: productId, quantity: newQty })
        });

        if (!response.ok) {
          throw new Error('Failed to update item quantity');
        }
        await fetchCart();

      } else {
        const updatedCart = cartItems.map((item) =>
          item.id === productId
            ? {
              ...item,
              quantity: calculateNewQty(Number(item.quantity))
            }
            : item
        );
        setCartItems(updatedCart);
        localStorage.setItem(`${APP_NAME}_cart`, JSON.stringify(updatedCart));
      }
    } catch (error) {
      console.error("Error updating item in cart:", error);
    }
  };

  const clearCart = (): void => {
    setCartItems([]);
    setCartCount(0);
    localStorage.setItem(`${APP_NAME}_cart`, JSON.stringify([]));
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
