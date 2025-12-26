'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_PATH, APP_NAME } from "../constants";
import { useAuth } from "../Components/Contexts/AuthContext";
import { useCart } from "../Components/Contexts/CartContext";
import Checkout from "./Checkout";
import { toast } from "react-toastify";
import LoadingIndicator from "../Components/Common/LoadingIndicator";
import BestSeller from "../Components/Home/BestSeller";
import styled from "styled-components";
import CartItem from "../Components/Shared/CartItem";
import BillSummary from "../Components/Shared/BillSummary";

const Cart = () => {
  const router = useRouter();
  const { user } = useAuth();
  const {
    cartItems,
    removeItemFromCart,
    updateItemInCart,
    fetchCartProductsFromAPI,
  } = useCart();

  const [showCheckout, setShowCheckout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);

  const notify = (msg) =>
    toast.success(msg, {
      position: "bottom-center",
      autoClose: 500,
    });

  const notifyWarning = (msg) =>
    toast.warning(msg, {
      position: "bottom-center",
      autoClose: 500,
    });

  const handleShowCheckout = () => {
    setShowCheckout(true);
  };

  const handleCloseCheckout = () => {
    setShowCheckout(false);
  };

  const fetchProducts = () => {
    setIsLoading(true);
    fetchCartProductsFromAPI().finally(() => {
      setIsLoading(false);
      setIsFirstRender(false);
    });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!isFirstRender && cartItems.every((i) => !i.price)) fetchProducts();
  }, [cartItems]);

  const updateHandler = (type, productId) => {
    const maxQty = 10;
    updateItemInCart(type, productId);
    if (
      type === "increment" &&
      cartItems.find((item) => item.id === productId)?.quantity >= maxQty
    ) {
      notifyWarning("Maximum quantity reached for this product");
      // notify('Quantity cannot be more than 10');
    }
  };

  const renderCartItems = () => {
    return cartItems.map((product) => (
      <CartItem
        key={"product" + product.id}
        product={product}
        showQuantitySelector
        onIncrement={() => updateHandler("increment", product.id)}
        onDecrement={() => updateHandler("decrement", product.id)}
        onDeleteClick={() => removeItemFromCart(product.id)}
      />
    ));
  };

  return (
    <>
      {isLoading ? (
        <div className="my-5">
          <center>
            <b>Loading...</b>
            <LoadingIndicator />
          </center>
        </div>
      ) : !cartItems.some((i) => i.price) ? (
        <EmptyCart>
          <center className="empty-msg py-5">
            <b>Looks like your cart is empty !</b>
            <div>We think you will like our recommendations below.</div>
          </center>
          {!isFirstRender && <BestSeller />}
        </EmptyCart>
      ) : (
        <div className="container mt-4">
          <div className="row">
            <div className="col-md-8 my-2 cart-item-list">
              {renderCartItems()}
            </div>
            <div className="col-md-4 my-2 bill-summary">
              <div className="p-4 border rounded-1">
                <BillSummary items={cartItems} />
                <Checkout
                  show={showCheckout}
                  onHide={handleCloseCheckout}
                  cartItems={cartItems}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Cart;

const EmptyCart = styled.div`
  .empty-msg {
    background-color: var(--border);
  }
`;
