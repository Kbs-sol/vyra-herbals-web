'use client';

import React, { useMemo } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import { FaEye, FaShoppingCart } from "react-icons/fa";
import { useCart } from "../Contexts/CartContext";
import { useRouter } from "next/navigation";

const AddToCartButton = (props) => {
  const { productId, quantity = 1, className } = props;
  const { cartItems, addItemToCart } = useCart();
  const router = useRouter();

  const isInCart = useMemo(() => {
    return cartItems.some((item) => item?.id === productId);
  }, [cartItems, productId]);

  const handleAddToCart = () => {
    addItemToCart(productId, quantity);
  };

  return isInCart ? (
    <StyledButton
      className="product-add goto-cart"
      title="Go to Cart"
      onClick={() => navigate("/cart")}
    >
      <span>
        <FaShoppingCart /> Go to Cart
      </span>
    </StyledButton>
  ) : (
    <StyledButton
      className="product-add"
      title="Add to Cart"
      onClick={handleAddToCart}
    >
      <span>
        <FaShoppingCart /> Add to Cart
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
};

const StyledButton = styled.button`
  &.goto-cart {
    background: var(--btn-green) !important;
    color: #fff;
  }
`;
