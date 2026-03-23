'use client';

import React, { useMemo } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import { FaEye, FaShoppingCart } from "react-icons/fa";
import { useCart } from "../Contexts/CartContext";
import { useAuth } from "../Contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { trackEvent } from "@/utils/analytics";

const AddToCartButton = (props) => {
  const { productId, quantity = 1, className, product } = props;
  const { cartItems, addItemToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);

  const isInCart = useMemo(() => {
    return cartItems.some((item) => item?.id === productId);
  }, [cartItems, productId]);

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("You have to login first", {
        position: "bottom-center",
        autoClose: 1000,
      });
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setLoading(true);
    await addItemToCart(productId, quantity, product);
    
    // Track AddToCart event
    trackEvent('AddToCart', {
      content_name: product?.title,
      content_ids: [productId],
      content_type: 'product',
      value: product?.price || 0,
      currency: 'INR',
      quantity: quantity
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
