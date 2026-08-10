'use client';

import React from "react";
import Link from "next/link";
import styled from "styled-components";
import Utility from "../../utils/UtilityFunctions";
import { FaMinus, FaPlus, FaTrash } from "react-icons/fa";

const CartItem = ({
  product,
  showQuantitySelector = false,
  onIncrement = () => {},
  onDecrement = () => {},
  onDeleteClick = () => {},
}) => {
  const titleStyle: React.CSSProperties = {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
    lineHeight: "1.2em",
  };
  return (
    <StyledCartItem
      key={product.id}
      className="p-2 border rounded d-flex justify-content-between gap-2 cart-list-item"
    >
      <div className="w-20 h-20 bg-gray-200 rounded-md flex-shrink-0">
        <Link href={`/product/${product.handle}`}>
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover rounded"
            style={{ width: "100px", height: "100px" }}
          />
        </Link>
      </div>

      <div className="align-items-center w-100">
        <div className="mt-1">
          <p className="mb-2 fw-bold" style={titleStyle}>
            {product.title}
          </p>
        </div>
        <div
          className="d-flex justify-content-start item-price-details"
          style={{ marginBottom: "6px" }}
        >
          <span className="py-1 px-2 rounded-1 bg-light bg-opacity-25 price-calc">
            <span className="fw-bold">₹{product.price} </span>
            <span className="me-1">*({product.quantity})</span>
            <span className="fw-bold">
              = ₹{product.price * product.quantity}
            </span>
          </span>

          <span className="ms-1 py-1 px-2 rounded-1 bg-light bg-opacity-25">
            <span className="text-muted me-1"> MRP</span>
            <s>
              <span className="text-muted me-2 ">
                <i>₹{product.regular_price * product.quantity}</i>
              </span>
            </s>
            <span className="discount ms-2 text-success fw-bold">
              {Math.floor(
                Utility.calculateDiscount(product.price, product.regular_price)
              )}
              % Off
            </span>
          </span>
        </div>
        {showQuantitySelector && (
          <div className="d-flex justify-content-between">
            <span className="border rounded" style={{ paddingLeft: "4px" }}>
              <b>Qty: </b>
              <button
                title={product.quantity > 1 ? "Remove" : ""}
                onClick={onDecrement}
                disabled={product.quantity <= 1}
                className="py-0 px-1 border-2 rounded"
              >
                <FaMinus />
              </button>
              <span className="p-1 fw-bold">{product.quantity}</span>
              <button
                title="Add"
                onClick={onIncrement}
                className="py-0 px-1 border-2 rounded"
              >
                <FaPlus />
              </button>
            </span>
            <span className="" style={{ paddingLeft: "4px" }}>
              <button
                style={{ padding: "0 4px" }}
                onClick={onDeleteClick} // Attach removeItemFromCart function
                className="text-gray-500 hover:text-red-700 rounded text-danger" // Style for delete button
              >
                <FaTrash />
              </button>
            </span>
          </div>
        )}
      </div>
    </StyledCartItem>
  );
};

export default CartItem;

const StyledCartItem = styled.div`
  @media (max-width: 576px) {
    .item-price-details {
      font-size: 0.85rem;
    }
  }
`;
