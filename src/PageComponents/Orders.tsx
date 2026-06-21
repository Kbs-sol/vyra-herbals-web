'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_PATH } from "../constants";
import styled from "styled-components";
import { FaCheckCircle } from "react-icons/fa";
import LoadingIndicator from "../Components/Common/LoadingIndicator";
import { useCart } from "../Components/Contexts/CartContext";
import { useAuth } from "../Components/Contexts/AuthContext";
import OrderTracker from "../Components/Orders/OrderTracker";
import OrderProductItem from "../Components/Orders/OrderProductItem";
import { generateInvoice } from "../utils/invoiceGenerator";
import { resolveCurrentHandle } from "../utils/productHandle";
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
  const [accessError, setAccessError] = useState<null | 'forbidden'>(null);
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId || '';
  const { cartItems, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait until auth has finished initialising before fetching. The order API
    // authorises the request using the logged-in user's access token, so firing
    // the fetch before the session is restored (e.g. on a direct/cold page load)
    // would send no token and get a 403. Gating on authLoading guarantees the
    // session is ready and avoids the "must open homepage first" race.
    if (authLoading) return;
    fetchOrderData(orderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, authLoading, user?.id]);

  const fetchOrderData = async (orderId) => {
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

    setAccessError(null);

    const requestWithToken = (token?: string | null) => {
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      // This endpoint authenticates via the Authorization header, NOT cookies.
      // Omitting credentials stops the browser from attaching the (potentially
      // very large) cookie jar to the request — otherwise the cookies + the JWT
      // can exceed the server's max header size and fail with HTTP 431
      // (Request Header Fields Too Large).
      return fetch(`${API_PATH}/orders/info?order_id=${effectiveOrderId}`, {
        headers,
        credentials: 'omit',
      });
    };

    try {
      let { data: { session } } = await supabase.auth.getSession();
      let response = await requestWithToken(session?.access_token);

      // If we sent a token but still got rejected, the access token is likely
      // stale (long-idle tab, or a client/server clock skew that makes a token
      // the client thinks is valid look expired to the server). Force a refresh
      // and retry ONCE before concluding the visitor doesn't own this order —
      // this is what makes a direct/cold page load reliable for the owner.
      if ((response.status === 401 || response.status === 403) && session?.access_token) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session?.access_token && refreshed.session.access_token !== session.access_token) {
          session = refreshed.session;
          response = await requestWithToken(session.access_token);
        }
      }

      // The order API authorises by the logged-in user. A 401/403 that survives
      // the refresh means either we're not logged in, or we're logged in as
      // someone who doesn't own this order — handle each distinctly instead of
      // showing a bare "no order found" message.
      if (response.status === 401 || response.status === 403) {
        if (!session?.access_token) {
          router.push(`/login?next=${encodeURIComponent(`/orders/${effectiveOrderId}`)}`);
        } else {
          setAccessError('forbidden');
          setLoading(false);
        }
        return;
      }

      // Read as text first and parse defensively — an error response (e.g. a
      // 4xx/5xx) may not carry a JSON body, and response.json() would throw.
      const rawBody = await response.text();
      let data: any = null;
      try { data = JSON.parse(rawBody); } catch { /* non-JSON body */ }

      if (data && data.status === "success") {
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
        console.error("Error fetching order data:", data?.message || `HTTP ${response.status}`);
        setOrderData(null);
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching order data:", error);
      setOrderData(null);
      setLoading(false);
    }
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

  const [orderingAgain, setOrderingAgain] = useState(false);

  const handleOrderAgain = async () => {
    const firstOrderedItem: any = orderData?.products?.[0] || {};

    // The handle stored on the order line-item is a snapshot from purchase time
    // and may be stale if an admin has since changed the product's URL slug.
    // Resolve the CURRENT handle from the stable product id so the link always
    // points at the live product page; fall back to the snapshot handle if the
    // lookup fails.
    const productId =
      firstOrderedItem.product_id ??
      firstOrderedItem.id ??
      null;
    const snapshotHandle =
      firstOrderedItem.handle ||
      firstOrderedItem.product_handle ||
      firstOrderedItem.productHandle ||
      '';

    if (!productId && !snapshotHandle) {
      console.error('Order again failed: no product id or handle found in order items');
      return;
    }

    setOrderingAgain(true);
    try {
      const handle = await resolveCurrentHandle(productId, snapshotHandle);
      if (!handle) {
        console.error('Order again failed: could not resolve a product handle');
        return;
      }
      router.push(`/product/${handle}?orderAgain=1`);
    } finally {
      setOrderingAgain(false);
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

              <button
                type="button"
                className="btn btn-order-again w-100 mb-3 rounded-3"
                onClick={handleOrderAgain}
                disabled={orderingAgain}
              >
                {orderingAgain ? 'Opening…' : 'Order Again'}
              </button>

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
        ) : accessError === 'forbidden' ? (
          <div className="loading-container flex-column text-center py-5">
            <h5 className="fw-bold mb-2">This order isn't linked to your account</h5>
            <p className="text-muted mb-4" style={{ maxWidth: 460 }}>
              You're signed in, but this order was placed with a different account.
              Log in with the mobile number used to place this order to view it.
            </p>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-order-again rounded-3 px-4"
                onClick={() => router.push(`/login?next=${encodeURIComponent(`/orders/${orderId}`)}`)}
              >
                Switch account
              </button>
              <Link href="/profile" className="btn btn-outline-secondary rounded-3 px-4">
                My Orders
              </Link>
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
      color: var(--primary);

      &:hover {
          background-color: #f8f9fa;
      }
  }

  .btn-order-again {
      background-color: #704a0d;
      border: 1px solid #704a0d;
      color: #fff;
      font-weight: 600;
      transition: background-color 0.2s, opacity 0.2s;

      &:hover,
      &:focus,
      &:active {
          background-color: #5a3a0a !important;
          border-color: #5a3a0a !important;
          color: #fff !important;
      }

      &:disabled {
          opacity: 0.7;
      }
  }
`;
