'use client';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API_PATH } from "../constants";
import styled from "styled-components";
import { FaCheckCircle } from "react-icons/fa";
import LoadingIndicator from "../Components/Common/LoadingIndicator";
import { useCart } from "../Components/Contexts/CartContext";
import OrderTracker from "../Components/Orders/OrderTracker";
import OrderProductItem from "../Components/Orders/OrderProductItem";
import { generateInvoice } from "../utils/invoiceGenerator";
import { supabase } from "@/utils/supabaseClient";


interface OrderData {
  shipping_address: string;
  order_amount: number;
  products: any[];
  status: string;
  status_timeline?: any[];
  courier_name?: string;
  awb_code?: string;
  label_url?: string;
  delivery_status?: string;
  tracking_id?: string;
}

const Orders = () => {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const orderId = params?.orderId || '';
  const { cartItems, clearCart } = useCart();

  useEffect(() => {
    // Fetch order data from API
    fetchOrderData(orderId);
  }, [orderId]);

  const fetchOrderData = (orderId) => {
    if (orderId === 'legacy-view') {
      try {
        const cachedOrder = localStorage.getItem('legacy_order_view');
        if (cachedOrder) {
          const parsedOrder = JSON.parse(cachedOrder);
          // Normalize legacy data to match OrderData interface
          const normalizedData = {
            ...parsedOrder,
            products: parsedOrder.items || parsedOrder.products || [],
            status: parsedOrder.status || 'placed',
            order_amount: parsedOrder.total_amount || 0,
            shipping_address: parsedOrder.shipping_address || JSON.stringify({
              fullName: 'Details Unavailable',
              address: 'Address details missing for this legacy order',
              mobile: 'N/A'
            })
          };
          setOrderData(normalizedData);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Error parsing legacy order:", e);
      }
    }

    const effectiveOrderId = String(orderId);
    if (!effectiveOrderId) return;

    // Get access token for secure fetching
    supabase.auth.getSession().then(({ data: { session } }) => {
      const headers: any = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      fetch(`${API_PATH}/orders/info?order_id=${effectiveOrderId}`, {
        headers: headers
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "success") {
            // Normalize data
            const normalizedData = {
              ...data.data,
              products: data.data.products || data.data.items || [],
              status: data.data.status || 'placed',
              order_amount: data.data.order_amount || data.data.total_amount || 0,
              courier_name: data.data.courier_name,
              awb_code: data.data.awb_code,
              label_url: data.data.label_url,
              delivery_status: data.data.delivery_status
            };
            setOrderData(normalizedData);

            if (cartItems.length > 0) {
              const orderProductsMap = new Map(
                normalizedData.products.map(product => [
                  product.product_id || product.id,
                  Number(product.quantity || product.qty || 1)
                ])
              );
              const isOrderMatching = cartItems.every(cartItem =>
                orderProductsMap.get(cartItem.product_id || cartItem.id) === Number(cartItem.quantity)
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
    });
  };

  const formatShippingAddress = (shippingAddress) => {
    try {
      const parsedAddress = JSON.parse(shippingAddress);

      // Handle legacy simple address string
      if (parsedAddress.address && !parsedAddress.houseNumber) {
        return {
          name: parsedAddress.fullName || 'No Name',
          mobile: parsedAddress.phone || parsedAddress.mobile || 'N/A',
          email: parsedAddress.email || "Not provided",
          address: parsedAddress.address
        };
      }

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
        address: `${houseNumber || ''}, ${area || ''}, ${city || ''}, ${state || ''} - ${pincode || ''}, ${country || ''}`.replace(/^, /, '').replace(/, , /g, ', ').replace(/, - ,/g, ','),
      };
    } catch (e) {
      return {
        name: 'Invalid Address Data',
        mobile: 'N/A',
        email: 'N/A',
        address: 'Could not parse address details'
      };
    }
  };

  return (
    <StyledOrders>
      <div className="container py-4">
        {loading ? (
          <div className="loading-container">
            <LoadingIndicator variant="spinner" />
          </div>
        ) : orderData ? (
          <div className="row g-4">
            {/* Left Column */}
            <div className="col-lg-8">
              {/* Address Card */}
              <div className="card shadow-sm border-0 mb-4 rounded-3 overflow-hidden">
                <div className="card-header bg-white border-bottom p-3">
                  <h5 className="mb-0 fw-bold">Delivery Address</h5>
                </div>
                <div className="card-body p-4">
                  <div className="d-flex gap-3">
                    <div className="address-icon text-muted"> <FaCheckCircle size={20} /> </div> {/* Using generic icon if map/home not available */}
                    <div>
                      <h6 className="fw-bold mb-1">{orderData.shipping_address ? formatShippingAddress(orderData.shipping_address).name : 'No Name'}</h6>
                      <p className="mb-1 text-muted small">{orderData.shipping_address ? formatShippingAddress(orderData.shipping_address).address : 'No Address Details'}</p>
                      <p className="mb-0 text-dark fw-medium">Phone: {orderData.shipping_address ? formatShippingAddress(orderData.shipping_address).mobile : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Tracker */}
              <div className="card shadow-sm border-0 mb-4 rounded-3">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold mb-0">Order Status</h5>
                    {orderData.awb_code && (
                      <span className="badge bg-light text-dark border">
                        AWB: {orderData.awb_code}
                      </span>
                    )}
                  </div>

                  <OrderTracker
                    currentStatus={orderData.status || 'placed'}
                    deliveryStatus={orderData.delivery_status}
                    timeline={orderData.status_timeline || []}
                  />

                  {orderData.courier_name && (
                    <div className="mt-4 pt-3 border-top">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="mb-0 text-muted small text-uppercase fw-bold">Courier Partner</p>
                          <p className="mb-0 fw-medium">{orderData.courier_name}</p>
                        </div>
                        {orderData.label_url && (
                          <a href={orderData.label_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary rounded-pill">
                            Download Label
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Products */}
              <div className="card shadow-sm border-0 mb-4 rounded-3">
                <div className="card-header bg-white border-bottom p-3">
                  <h5 className="mb-0 fw-bold">Items in this Order</h5>
                </div>
                <div className="card-body p-0">
                  <div className="px-4">
                    {orderData.products.map((product, index) => (
                      <OrderProductItem key={product.product_id || product.id || index} product={product} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-lg-4">
              {/* Price Details */}
              <div className="card shadow-sm border-0 mb-4 rounded-3">
                <div className="card-header bg-white border-bottom p-3">
                  <h5 className="mb-0 fw-bold">Price Details</h5>
                </div>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Price ({orderData.products.length} items)</span>
                    <span>₹{orderData.order_amount}</span> {/* Assuming order_amount is total, if subtotal is available use that */}
                  </div>
                  <div className="d-flex justify-content-between mb-3 border-bottom pb-3">
                    <span className="text-muted">Delivery Charges</span>
                    <span className="text-success">Free</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold fs-5">Total Amount</span>
                    <span className="fw-bold fs-5">₹{orderData.order_amount}</span>
                  </div>
                </div>
              </div>

              {/* More Actions */}
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-body p-0">
                  <ul className="list-group list-group-flush rounded-3">
                    <li className="list-group-item p-3 action-link" style={{ cursor: 'pointer' }} onClick={() => generateInvoice(orderData)}>
                      Download Invoice
                    </li>
                    <Link href={`/contact?orderId=${orderId}`} passHref style={{ textDecoration: 'none' }}>
                      <li className="list-group-item p-3 action-link" style={{ cursor: 'pointer' }}>
                        Need Help with this order?
                      </li>
                    </Link>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="loading-container text-center py-5">
            <p className="text-muted">No order details found.</p>
          </div>
        )}
      </div>
    </StyledOrders>
  );
};

export default Orders;

const StyledOrders = styled.div`
  background-color: #f1f3f6;
  min-height: 100vh;

  .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 50vh;
  }
  
  .action-link {
      transition: background-color 0.2s;
      font-weight: 500;
      color: #2874f0;
      
      &:hover {
          background-color: #f8f9fa;
      }
  }
`;
