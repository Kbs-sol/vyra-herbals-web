'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Order } from '@/types';

const ORDER_STATUSES = [
  { value: 'placed', label: 'Placed', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'confirmed', label: 'Confirmed', color: '#3b82f6', bg: '#dbeafe' },
  { value: 'shipped', label: 'Shipped', color: '#8b5cf6', bg: '#ede9fe' },
  { value: 'delivered', label: 'Delivered', color: '#10b981', bg: '#d1fae5' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444', bg: '#fee2e2' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter, paymentFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        status: statusFilter,
        paymentMethod: paymentFilter,
        search: searchQuery,
      });

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrders();
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        setOrders(orders.map(o => 
          o.id === orderId ? { ...o, status: newStatus } : o
        ));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (error) {
      alert('An error occurred while updating');
    } finally {
      setUpdating(false);
    }
  };

  const updateTrackingId = async (orderId: number, trackingId: string) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, tracking_id: trackingId }),
      });

      const data = await res.json();

      if (data.success) {
        setOrders(orders.map(o => 
          o.id === orderId ? { ...o, tracking_id: trackingId } : o
        ));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, tracking_id: trackingId });
        }
      }
    } catch (error) {
      console.error('Error updating tracking ID:', error);
    }
  };

  // Pull live shipment status (shipped/delivered) from iCarry and persist it.
  const syncFromIcarry = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/orders/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        alert(`iCarry sync complete: ${data.updated} of ${data.checked} order(s) updated.`);
        fetchOrders();
      } else {
        alert(data.error || 'Sync failed');
      }
    } catch (e) {
      alert('An error occurred during sync');
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyle = (status: string) => {
    const found = ORDER_STATUSES.find(s => s.value === status);
    return found || { color: '#6b7280', bg: '#f3f4f6' };
  };

  return (
    <AdminLayoutWrapper pageTitle="Orders">
      <div className="orders-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-info">
            <p className="subtitle">{totalItems} total orders</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search by Order ID or Tracking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="search-btn">Search</button>
          </form>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Status</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Payment</option>
            <option value="cod">Cash on Delivery</option>
            <option value="online">Online</option>
          </select>

          <button
            type="button"
            className="sync-btn"
            onClick={syncFromIcarry}
            disabled={syncing}
            title="Fetch live shipped/delivered status from iCarry and update orders"
          >
            {syncing ? 'Syncing…' : '⟳ Sync from iCarry'}
          </button>
        </div>

        {/* Orders Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <p>No orders found</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusStyle = getStatusStyle(order.status);
                  const shipping = order.shipping_data || {};
                  const items = Array.isArray(order.items) ? order.items : [];

                  return (
                    <tr key={order.id}>
                      <td className="order-id">#{order.id}</td>
                      <td>
                        <div className="customer-info">
                          <span className="name">{shipping.name || shipping.fullName || 'N/A'}</span>
                          <span className="phone">{shipping.phone || shipping.mobile || ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className="items-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                      </td>
                      <td className="amount">{formatCurrency(order.total_amount)}</td>
                      <td>
                        <span className={`payment-badge ${order.payment_method}`}>
                          {order.payment_method === 'cod' ? 'COD' : 'Online'}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="date">{formatDate(order.created_at || '')}</td>
                      <td>
                        <button 
                          className="view-btn"
                          onClick={() => setSelectedOrder(order)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="page-btn"
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="page-btn"
            >
              Next
            </button>
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="order-modal" onClick={(e) => e.stopPropagation()}>
              <div className="order-modal-header">
                <div className="header-text">
                  <h2>Order #{selectedOrder.id}</h2>
                  {selectedOrder.order_id && (
                    <span className="order-ref">{selectedOrder.order_id}</span>
                  )}
                </div>
                <button className="close-btn" onClick={() => setSelectedOrder(null)}>
                  <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div className="order-modal-body">
                {/* Status Section */}
                <div className="detail-section">
                  <h3>Order Status</h3>
                  <div className="status-selector">
                    {ORDER_STATUSES.map((status) => (
                      <button
                        key={status.value}
                        className={`status-option ${selectedOrder.status === status.value ? 'active' : ''}`}
                        style={{
                          '--active-color': status.color,
                          '--active-bg': status.bg
                        } as React.CSSProperties}
                        onClick={() => updateOrderStatus(selectedOrder.id as number, status.value)}
                        disabled={updating}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tracking ID */}
                <div className="detail-section">
                  <h3>Tracking ID</h3>
                  <div className="tracking-input">
                    <input
                      type="text"
                      placeholder="Enter tracking ID"
                      defaultValue={selectedOrder.tracking_id || ''}
                      onBlur={(e) => updateTrackingId(selectedOrder.id as number, e.target.value)}
                    />
                  </div>
                </div>

                {/* Shipment Info */}
                {(selectedOrder.awb_code || selectedOrder.courier_name || selectedOrder.shipment_id || selectedOrder.delivery_status || selectedOrder.label_url) && (
                  <div className="detail-section">
                    <h3>Shipment Info</h3>
                    <div className="detail-grid">
                      {selectedOrder.awb_code && (
                        <div className="detail-item">
                          <span className="label">AWB Code</span>
                          <span className="value">{selectedOrder.awb_code}</span>
                        </div>
                      )}
                      {selectedOrder.courier_name && (
                        <div className="detail-item">
                          <span className="label">Courier</span>
                          <span className="value">{selectedOrder.courier_name}</span>
                        </div>
                      )}
                      {selectedOrder.shipment_id && (
                        <div className="detail-item">
                          <span className="label">Shipment ID</span>
                          <span className="value">{selectedOrder.shipment_id}</span>
                        </div>
                      )}
                      {selectedOrder.delivery_status && (
                        <div className="detail-item">
                          <span className="label">Delivery Status</span>
                          <span className="value">{selectedOrder.delivery_status}</span>
                        </div>
                      )}
                      {selectedOrder.label_url && (
                        <div className="detail-item full">
                          <span className="label">Shipping Label</span>
                          <a className="value link" href={selectedOrder.label_url} target="_blank" rel="noreferrer">
                            Download Label
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer Details */}
                <div className="detail-section">
                  <h3>Customer Details</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Name</span>
                      <span className="value">
                        {selectedOrder.shipping_data?.fullName || selectedOrder.shipping_data?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Phone</span>
                      <span className="value">
                        {selectedOrder.shipping_data?.phone || selectedOrder.shipping_data?.mobile || 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item full">
                      <span className="label">Email</span>
                      <span className="value">
                        {selectedOrder.shipping_data?.email || 'N/A'}
                      </span>
                    </div>
                    {selectedOrder.shipping_data?.houseNumber && (
                      <div className="detail-item">
                        <span className="label">House No.</span>
                        <span className="value">{selectedOrder.shipping_data.houseNumber}</span>
                      </div>
                    )}
                    {selectedOrder.shipping_data?.area && (
                      <div className="detail-item">
                        <span className="label">Area / Street</span>
                        <span className="value">{selectedOrder.shipping_data.area}</span>
                      </div>
                    )}
                    {selectedOrder.shipping_data?.landmark && (
                      <div className="detail-item">
                        <span className="label">Landmark</span>
                        <span className="value">{selectedOrder.shipping_data.landmark}</span>
                      </div>
                    )}
                    {selectedOrder.shipping_data?.city && (
                      <div className="detail-item">
                        <span className="label">City</span>
                        <span className="value">{selectedOrder.shipping_data.city}</span>
                      </div>
                    )}
                    {selectedOrder.shipping_data?.state && (
                      <div className="detail-item">
                        <span className="label">State</span>
                        <span className="value">{selectedOrder.shipping_data.state}</span>
                      </div>
                    )}
                    {selectedOrder.shipping_data?.pincode && (
                      <div className="detail-item">
                        <span className="label">Pincode</span>
                        <span className="value">{selectedOrder.shipping_data.pincode}</span>
                      </div>
                    )}
                    {selectedOrder.shipping_data?.country && (
                      <div className="detail-item">
                        <span className="label">Country</span>
                        <span className="value">{selectedOrder.shipping_data.country}</span>
                      </div>
                    )}
                    <div className="detail-item full">
                      <span className="label">Full Address</span>
                      <span className="value">
                        {[
                          selectedOrder.shipping_data?.houseNumber,
                          selectedOrder.shipping_data?.area,
                          selectedOrder.shipping_data?.landmark,
                          selectedOrder.shipping_data?.city,
                          selectedOrder.shipping_data?.state,
                          selectedOrder.shipping_data?.pincode,
                          selectedOrder.shipping_data?.country,
                        ].filter(Boolean).join(', ') || 'N/A'}
                      </span>
                    </div>
                    {selectedOrder.user_id && (
                      <div className="detail-item full">
                        <span className="label">User ID</span>
                        <span className="value">{selectedOrder.user_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="detail-section">
                  <h3>Order Items</h3>
                  <div className="items-list">
                    {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item: any, index: number) => {
                      const thumb = item.image_url || item.image || (Array.isArray(item.images) ? item.images[0] : '');
                      const unitPrice = Number(item.price) || 0;
                      const qty = Number(item.quantity) || 0;
                      return (
                        <div key={index} className="item-row">
                          {thumb && (
                            <img src={thumb} alt={item.title || 'item'} className="item-thumb" />
                          )}
                          <div className="item-info">
                            <span className="item-title">{item.title || item.name || `Product #${item.id}`}</span>
                            <div className="item-meta">
                              {item.sku && <span>SKU: {item.sku}</span>}
                              {item.handle && !item.sku && <span>{item.handle}</span>}
                              <span>Qty: {qty}</span>
                              <span>Unit: {formatCurrency(unitPrice)}</span>
                            </div>
                          </div>
                          <span className="item-price">{formatCurrency(unitPrice * qty)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="detail-section">
                  <h3>Order Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-row">
                      <span>Payment Method</span>
                      <span className={`payment-badge ${selectedOrder.payment_method}`}>
                        {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span>Order Date</span>
                      <span className="summary-value">{formatDate(selectedOrder.created_at || selectedOrder.order_date || '')}</span>
                    </div>
                    {typeof selectedOrder.transaction_price === 'number' && selectedOrder.transaction_price > 0 && (
                      <div className="summary-row">
                        <span>Transaction Price</span>
                        <span className="summary-value">{formatCurrency(selectedOrder.transaction_price)}</span>
                      </div>
                    )}
                    {selectedOrder.welcome_coupon_applied && (
                      <div className="summary-row">
                        <span>Welcome Coupon</span>
                        <span className="summary-value discount">
                          -{formatCurrency(selectedOrder.welcome_coupon_discount || 0)}
                        </span>
                      </div>
                    )}
                    {selectedOrder.razorpay_payment_id && (
                      <div className="summary-row">
                        <span>Payment ID</span>
                        <span className="summary-value mono">{selectedOrder.razorpay_payment_id}</span>
                      </div>
                    )}
                    {selectedOrder.razorpay_order_id && (
                      <div className="summary-row">
                        <span>Razorpay Order ID</span>
                        <span className="summary-value mono">{selectedOrder.razorpay_order_id}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>Total Amount</span>
                      <span className="total-amount">{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .orders-page {
            max-width: 1400px;
            margin: 0 auto;
          }

          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }

          .subtitle {
            color: #6b7280;
            font-size: 14px;
            margin: 0;
          }

          .filters {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            flex-wrap: wrap;
          }

          .search-form {
            display: flex;
            gap: 12px;
            flex: 1;
            min-width: 300px;
          }

          .search-input {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 12px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 0 16px;
          }

          .search-input svg {
            color: #9ca3af;
          }

          .search-input input {
            flex: 1;
            border: none;
            outline: none;
            padding: 12px 0;
            font-size: 14px;
          }

          .search-btn {
            padding: 12px 20px;
            background: #1f2937;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            cursor: pointer;
          }

          .filter-select {
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            background: white;
            cursor: pointer;
            min-width: 160px;
          }

          .sync-btn {
            padding: 12px 20px;
            background: #556b2f;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            cursor: pointer;
            white-space: nowrap;
          }

          .sync-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .table-container {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .loading, .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: #6b7280;
            gap: 16px;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid #f3f4f6;
          }

          th {
            background: #f9fafb;
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
          }

          .order-id {
            font-weight: 600;
            color: #1f2937;
          }

          .customer-info {
            display: flex;
            flex-direction: column;
          }

          .customer-info .name {
            font-weight: 500;
            color: #1f2937;
          }

          .customer-info .phone {
            font-size: 12px;
            color: #6b7280;
          }

          .items-count {
            color: #6b7280;
          }

          .amount {
            font-weight: 600;
            color: #10b981;
          }

          .payment-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
          }

          .payment-badge.cod {
            background: #fef3c7;
            color: #92400e;
          }

          .payment-badge.online {
            background: #dbeafe;
            color: #1e40af;
          }

          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
          }

          .date {
            color: #6b7280;
            font-size: 13px;
          }

          .view-btn {
            padding: 8px 16px;
            background: #f3f4f6;
            color: #374151;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .view-btn:hover {
            background: #e5e7eb;
          }

          .pagination {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-top: 24px;
          }

          .page-btn {
            padding: 10px 20px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .page-btn:hover:not(:disabled) {
            background: #f9fafb;
          }

          .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .page-info {
            font-size: 14px;
            color: #6b7280;
          }

          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .order-modal {
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 700px;
            max-height: 90vh;
            overflow-y: auto;
          }

          .order-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            position: sticky;
            top: 0;
            background: white;
            z-index: 2;
          }

          .header-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }

          .order-modal-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          }

          .order-ref {
            font-size: 12px;
            color: #6b7280;
            font-family: ui-monospace, Menlo, monospace;
          }

          .close-btn {
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
          }

          .order-modal-body {
            padding: 24px;
          }

          .detail-section {
            margin-bottom: 24px;
          }

          .detail-section h3 {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin: 0 0 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .status-selector {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .status-option {
            padding: 8px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            font-size: 13px;
            font-weight: 500;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
          }

          .status-option:hover:not(:disabled) {
            border-color: var(--active-color);
            color: var(--active-color);
          }

          .status-option.active {
            border-color: var(--active-color);
            background: var(--active-bg);
            color: var(--active-color);
          }

          .status-option:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .tracking-input input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            outline: none;
          }

          .tracking-input input:focus {
            border-color: #10b981;
          }

          .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .detail-item.full {
            grid-column: span 2;
          }

          .detail-item .label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
          }

          .detail-item .value {
            font-size: 14px;
            color: #1f2937;
            word-break: break-word;
          }

          .detail-item .value.link {
            color: #2563eb;
            text-decoration: underline;
          }

          .items-list {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
          }

          .item-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #f3f4f6;
          }

          .item-row:last-child {
            border-bottom: none;
          }

          .item-thumb {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            object-fit: cover;
            background: #f3f4f6;
            flex-shrink: 0;
          }

          .item-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
            min-width: 0;
          }

          .item-title {
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
            word-break: break-word;
          }

          .item-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 10px;
            font-size: 12px;
            color: #6b7280;
          }

          .item-qty {
            font-size: 12px;
            color: #6b7280;
          }

          .item-price {
            font-weight: 600;
            color: #10b981;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .summary-grid {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #f3f4f6;
          }

          .summary-row:last-child {
            border-bottom: none;
          }

          .summary-row.total {
            background: #f9fafb;
          }

          .summary-row > span:first-child {
            color: #6b7280;
            font-size: 14px;
            flex-shrink: 0;
          }

          .summary-value {
            font-size: 14px;
            color: #1f2937;
            text-align: right;
            word-break: break-word;
          }

          .summary-value.mono {
            font-family: ui-monospace, Menlo, monospace;
            font-size: 12px;
          }

          .summary-value.discount {
            color: #ef4444;
            font-weight: 600;
          }

          .total-amount {
            font-size: 18px;
            font-weight: 700;
            color: #10b981;
            white-space: nowrap;
          }

          @media (max-width: 640px) {
            .order-modal {
              max-height: 95vh;
              border-radius: 12px;
            }

            .order-modal-header {
              padding: 16px;
            }

            .order-modal-body {
              padding: 16px;
            }

            .detail-grid {
              grid-template-columns: 1fr;
            }

            .detail-item.full {
              grid-column: span 1;
            }

            .summary-row {
              flex-direction: column;
              align-items: flex-start;
              gap: 4px;
            }

            .summary-value,
            .total-amount {
              text-align: left;
            }

            .item-row {
              flex-wrap: wrap;
            }

            .item-price {
              margin-left: auto;
            }
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
