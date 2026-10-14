'use client';

import React, { useMemo } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import { FaEye, FaShoppingCart } from "react-icons/fa";
import { useCart } from "../Contexts/CartContext";
import { useRouter } from "next/navigation";

import { addToCart } from "@/utils/analytics";

const AddToCartButton = (props) => {
  const { productId, quantity = 1, className, product } = props;
  const { cartItems, addItemToCart } = useCart();
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);

  const isInCart = useMemo(() => {
    return cartItems.some((item) => item?.id === productId);
  }, [cartItems, productId]);

  const handleAddToCart = async () => {
    // No auth check here by design: guests can fill a cart freely. The login
    // requirement lives at the checkout step (Checkout.handleCheckout), so the
    // shopper is only asked to sign in when they are ready to order.
    setLoading(true);
    await addItemToCart(productId, quantity, product);
    
    // Track AddToCart — GA4 + Meta Pixel (browser) + Meta CAPI (server, via
    // /api/events/meta), all deduplicated via the shared event_id. The named
    // helper takes care of storing the event_id in sessionStorage so a
    // matching InitiateCheckout / Purchase can reference the same journey.
    addToCart({
      item_id: productId,
      item_name: product?.title,
      item_category: product?.category,
      item_brand: 'Vyra Herbals',
      price: Number(product?.price || 0),
      quantity,
      currency: 'INR',
    });

    setLoading(false);
  };

  if (isInCart) {
    return (
      <StyledButton
        className="product-add goto-cart"
        title="Go to Cart"
        onClick={() => router.push("/cart")}
      >
        <span>
          <FaShoppingCart /> Go to Cart
        </span>
      </StyledButton>
    );
  }

  return (
    <StyledButton
      className="product-add"
      title="Add to Cart"
      onClick={handleAddToCart}
      disabled={loading}
    >
      <span>
        {loading ? (
          <>
            <Spinner /> Adding...
          </>
        ) : (
          <>
            <FaShoppingCart /> Add to Cart
          </>
        )}
      </span>
    </StyledButton>
  );
};

export default React.memo(AddToCartButton);

AddToCartButton.propTypes = {
  className: PropTypes.string,
  productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  quantity: PropTypes.number,
  product: PropTypes.object,
};

const StyledButton = styled.button`
  &.goto-cart {
    background: var(--btn-green) !important;
    color: #fff;
  }
`;

const Spinner = styled.div`
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
