'use client';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_PATH } from "../constants";
import styled from "styled-components";
import { FaCheckCircle } from "react-icons/fa";
import LoadingIndicator from "../Components/Common/LoadingIndicator";
import { useCart } from "../Components/Contexts/CartContext";

const Orders = () => {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const orderId = params?.orderId || '';
  const { cartItems, clearCart } = useCart();

  useEffect(() => {
    // Fetch order data from API
    fetchOrderData(orderId);
  }, [orderId]);

  const fetchOrderData = (orderId) => {
    fetch(`${API_PATH}/orders/info?order_id=${orderId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setOrderData(data.data);
          if (cartItems.length > 0) {
            const orderProductsMap = new Map(
              data.data.products.map(product => [
                product.product_id,
                Number(product.quantity)
              ])
            );
            const isOrderMatching = cartItems.every(cartItem =>
              orderProductsMap.get(cartItem.product_id || cartItem.id ) === Number(cartItem.quantity)
            );

            if (isOrderMatching) {
              clearCart();
            }
          }
        } else {
          console.error("Error fetching order data:", data.message);
          setOrderData(null);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching order data:", error);
        setOrderData(null);
        setLoading(false);
      });
  };

  const formatShippingAddress = (shippingAddress) => {
    const parsedAddress = JSON.parse(shippingAddress);
    const {
      fullName,
      phone,
      email,
      houseNumber,
      area,
      pincode,
      city,
      state,
      country,
    } = parsedAddress;
    return {
      name: fullName,
      mobile: phone,
      email: email || "Not provided",
      address: `${houseNumber}, ${area}, ${city}, ${state} - ${pincode}, ${country}`,
    };
  };

  return (
    <StyledOrders>
      {loading ? (
        <div className="loading-container">
          <LoadingIndicator variant="spinner" />
        </div>
      ) : orderData ? (
        <div className="order-table">
          <div className="order-header flex-lg-row flex-column align-items-center">
            <div className="order-success centered">
              <FaCheckCircle size={60} className="success-icon" />
              <h3>Order Placed Successfully!</h3>
              <p>Thank you for shopping with us.</p>
              <p className="note-text text-danger">
                Kindly note the Order ID for further tracking.
              </p>
            </div>

            <div className="order-details border md-3">
              <h6>Order Information:</h6>

              <p>
                <strong>Order ID:</strong> {orderData.shipment_id}
              </p>
              <p>
                <strong>Order Amount:</strong> ₹{orderData.order_amount}
              </p>
              <p>
                <strong>Order Date:</strong> {orderData.order_date}
              </p>
              <p>
                <strong>Payment Method:</strong>{" "}
                {orderData.order_payment_method === "cod"
                  ? "Cash On Delivery"
                  : "Prepaid"}
              </p>
              {orderData.order_payment_method !== "cod" && (
                <p>
                  <strong>Transaction ID:</strong> {orderData.transaction_id}
                </p>
              )}
              <h6>Shipping Address</h6>
              <p>
                <strong>Name:</strong>{" "}
                {formatShippingAddress(orderData.shipping_address).name}
              </p>
              <p>
                <strong>Mobile:</strong>{" "}
                {formatShippingAddress(orderData.shipping_address).mobile}
              </p>
              <p>
                <strong>Address:</strong>{" "}
                {formatShippingAddress(orderData.shipping_address).address}
              </p>
            </div>
          </div>

          <div className="product-details">
            <h3>Products:</h3>
            {orderData.products.map((product) => (
              <div key={product.product_id} className="product-item">
                <img
                  src={product.product_image}
                  alt={product.product_title}
                  className="product-image"
                />
                <div className="product-info">
                  <p>
                    <strong>Product Title:</strong> {product.product_title}
                  </p>
                  <p>
                    <strong>Quantity:</strong> {product.quantity}
                  </p>
                  <p>
                    <strong>Item Amount:</strong> ₹{product.item_amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="loading-container">
          <p>No order data found.</p>
        </div>
      )}
    </StyledOrders>
  );
};

export default Orders;

const StyledOrders = styled.div`
  .order-table {
    max-width: 900px;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    border: 1px solid #ddd;
    padding: 1.5rem;
    background: #f9f9f9;
    border-radius: 10px;
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #ddd;
    padding-bottom: 1rem;
  }

  .order-success {
    flex: 1;
    text-align: center;
  }

  .centered {
    margin: 0 auto;
    text-align: center;
  }

  .order-details {
    flex: 1;
    font-size: 1rem;
    padding-bottom: 0.5rem;
    border-radius: 1rem;
    overflow: hidden;
    h6 {
      background-color: var(--border);
      &:not(:first-child) {
        margin-top: 0.5rem;
      }
    }
    p,
    h6 {
      padding: 0 1rem;
    }
  }

  .product-details {
    background: #fff;
    padding: 1.5rem;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }

  .product-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }

  .product-image {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 5px;
  }

  .success-icon {
    color: #28a745;
  }
`;
