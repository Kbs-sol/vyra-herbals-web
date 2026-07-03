'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from './components/AdminLayoutWrapper';

interface DashboardData {
  overview: {
    totalOrders: number;
    totalProducts: number;
    totalReviews: number;
    pendingReviews: number;
    totalTestimonials: number;
    totalRevenue: number;
    deliveredRevenue: number;
    recentRevenue: number;
  };
  range?: {
    startDate: string | null;
    endDate: string | null;
    active: boolean;
  };
  orderStats: {
    placed: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  paymentStats: {
    cod: number;
    online: number;
  };
  dailyOrders: Array<{
    date: string;
    label: string;
    orders: number;
    revenue: number;
  }>;
  latestOrders: Array<{
    id: number;
    total_amount: number;
    status: string;
    payment_method: string;
    created_at: string;
    customer: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Empty = all-time; "YYYY-MM" scopes the dashboard to that month.
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    fetchDashboardData(selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const monthToRange = (month: string) => {
    if (!month) return null;
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) return null;
    const lastDay = new Date(y, m, 0).getDate(); // m is 1-based -> last day of month
    return {
      startDate: `${month}-01`,
      endDate: `${month}-${String(lastDay).padStart(2, '0')}`,
    };
  };

  const monthLabel = (month: string) => {
    if (!month) return '';
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const fetchDashboardData = async (month = '') => {
    setLoading(true);
    try {
      const range = monthToRange(month);
      const qs = range ? `?startDate=${range.startDate}&endDate=${range.endDate}` : '';
      const res = await fetch(`/api/admin/dashboard${qs}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      placed: '#f59e0b',
      confirmed: '#3b82f6',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusBg = (status: string) => {
    const colors: Record<string, string> = {
      placed: '#fef3c7',
      confirmed: '#dbeafe',
      shipped: '#ede9fe',
      delivered: '#d1fae5',
      cancelled: '#fee2e2',
    };
    return colors[status] || '#f3f4f6';
  };

  return (
    <AdminLayoutWrapper pageTitle="Dashboard">
      <div className="dashboard">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => fetchDashboardData(selectedMonth)}>Retry</button>
          </div>
        ) : data && (
          <>
            {/* Month filter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <label htmlFor="dashboard-month" style={{ fontWeight: 600, color: '#374151' }}>
                Filter by month:
              </label>
              <input
                id="dashboard-month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#111827',
                }}
              />
              {selectedMonth ? (
                <>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>
                    Showing {monthLabel(selectedMonth)}
                  </span>
                  <button
                    onClick={() => setSelectedMonth('')}
                    style={{
                      padding: '8px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      background: '#fff',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Clear (All time)
                  </button>
                </>
              ) : (
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Showing all time</span>
              )}
            </div>

            {/* Overview Stats */}
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                    <path d="M12 2V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Revenue (Delivered)</p>
                  <h3 className="stat-value">{formatCurrency(data.overview.deliveredRevenue)}</h3>
                  <p className="stat-change positive">
                    <span>{data.orderStats.delivered}</span> delivered order{data.orderStats.delivered === 1 ? '' : 's'}
                    {selectedMonth ? ` in ${monthLabel(selectedMonth)}` : ''}
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                    <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Orders</p>
                  <h3 className="stat-value">{data.overview.totalOrders}</h3>
                  <p className="stat-change">
                    <span>{data.orderStats.placed}</span> pending
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">
                  <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                    <path d="M21 16V8.00002C20.9996 7.6493 20.9071 7.30483 20.7315 7.00119C20.556 6.69754 20.3037 6.44539 20 6.27002L13 2.27002C12.696 2.09449 12.3511 2.00208 12 2.00208C11.6489 2.00208 11.304 2.09449 11 2.27002L4 6.27002C3.69626 6.44539 3.44398 6.69754 3.26846 7.00119C3.09294 7.30483 3.00036 7.6493 3 8.00002V16C3.00036 16.3508 3.09294 16.6952 3.26846 16.9989C3.44398 17.3025 3.69626 17.5547 4 17.73L11 21.73C11.304 21.9056 11.6489 21.998 12 21.998C12.3511 21.998 12.696 21.9056 13 21.73L20 17.73C20.3037 17.5547 20.556 17.3025 20.7315 16.9989C20.9071 16.6952 20.9996 16.3508 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Products</p>
                  <h3 className="stat-value">{data.overview.totalProducts}</h3>
                  <p className="stat-change">Active listings</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">
                  <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                    <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total Reviews</p>
                  <h3 className="stat-value">{data.overview.totalReviews}</h3>
                  <p className="stat-change warning">
                    <span>{data.overview.pendingReviews}</span> pending approval
                  </p>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="charts-row">
              {/* Order Status */}
              <div className="chart-card">
                <div className="card-header">
                  <h3>Order Status</h3>
                </div>
                <div className="status-grid">
                  <div className="status-item">
                    <div className="status-bar" style={{ backgroundColor: '#fef3c7' }}>
                      <div className="status-fill" style={{ width: `${(data.orderStats.placed / data.overview.totalOrders) * 100}%`, backgroundColor: '#f59e0b' }}></div>
                    </div>
                    <div className="status-info">
                      <span className="status-label" style={{ color: '#f59e0b' }}>Placed</span>
                      <span className="status-count">{data.orderStats.placed}</span>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-bar" style={{ backgroundColor: '#dbeafe' }}>
                      <div className="status-fill" style={{ width: `${(data.orderStats.confirmed / data.overview.totalOrders) * 100}%`, backgroundColor: '#3b82f6' }}></div>
                    </div>
                    <div className="status-info">
                      <span className="status-label" style={{ color: '#3b82f6' }}>Confirmed</span>
                      <span className="status-count">{data.orderStats.confirmed}</span>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-bar" style={{ backgroundColor: '#ede9fe' }}>
                      <div className="status-fill" style={{ width: `${(data.orderStats.shipped / data.overview.totalOrders) * 100}%`, backgroundColor: '#8b5cf6' }}></div>
                    </div>
                    <div className="status-info">
                      <span className="status-label" style={{ color: '#8b5cf6' }}>Shipped</span>
                      <span className="status-count">{data.orderStats.shipped}</span>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-bar" style={{ backgroundColor: '#d1fae5' }}>
                      <div className="status-fill" style={{ width: `${(data.orderStats.delivered / data.overview.totalOrders) * 100}%`, backgroundColor: '#10b981' }}></div>
                    </div>
                    <div className="status-info">
                      <span className="status-label" style={{ color: '#10b981' }}>Delivered</span>
                      <span className="status-count">{data.orderStats.delivered}</span>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-bar" style={{ backgroundColor: '#fee2e2' }}>
                      <div className="status-fill" style={{ width: `${(data.orderStats.cancelled / data.overview.totalOrders) * 100}%`, backgroundColor: '#ef4444' }}></div>
                    </div>
                    <div className="status-info">
                      <span className="status-label" style={{ color: '#ef4444' }}>Cancelled</span>
                      <span className="status-count">{data.orderStats.cancelled}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="chart-card">
                <div className="card-header">
                  <h3>Payment Methods</h3>
                </div>
                <div className="payment-stats">
                  <div className="payment-item">
                    <div className="payment-icon cod">
                      <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="payment-info">
                      <span className="payment-label">Cash on Delivery</span>
                      <span className="payment-count">{data.paymentStats.cod} orders</span>
                    </div>
                    <div className="payment-percentage">
                      {data.overview.totalOrders > 0 
                        ? Math.round((data.paymentStats.cod / data.overview.totalOrders) * 100) 
                        : 0}%
                    </div>
                  </div>
                  <div className="payment-item">
                    <div className="payment-icon online">
                      <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                        <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="payment-info">
                      <span className="payment-label">Online Payment</span>
                      <span className="payment-count">{data.paymentStats.online} orders</span>
                    </div>
                    <div className="payment-percentage">
                      {data.overview.totalOrders > 0 
                        ? Math.round((data.paymentStats.online / data.overview.totalOrders) * 100) 
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Orders Chart */}
              <div className="chart-card weekly-chart">
                <div className="card-header">
                  <h3>Weekly Orders</h3>
                </div>
                <div className="bar-chart">
                  {data.dailyOrders.map((day, index) => (
                    <div key={index} className="bar-item">
                      <div className="bar-wrapper">
                        <div 
                          className="bar" 
                          style={{ 
                            height: `${Math.max(10, (day.orders / Math.max(...data.dailyOrders.map(d => d.orders), 1)) * 100)}%`
                          }}
                        >
                          <span className="bar-value">{day.orders}</span>
                        </div>
                      </div>
                      <span className="bar-label">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="recent-orders">
              <div className="card-header">
                <h3>Recent Orders</h3>
                <a href="/admin/orders" className="view-all">View All →</a>
              </div>
              <div className="orders-table">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.latestOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="order-id">#{order.id}</td>
                        <td>{order.customer}</td>
                        <td className="amount">{formatCurrency(order.total_amount)}</td>
                        <td>
                          <span className={`payment-badge ${order.payment_method}`}>
                            {order.payment_method === 'cod' ? 'COD' : 'Online'}
                          </span>
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ 
                              backgroundColor: getStatusBg(order.status),
                              color: getStatusColor(order.status)
                            }}
                          >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="date">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="actions-grid">
                <a href="/admin/products" className="action-card">
                  <div className="action-icon">
                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                      <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Add Product</span>
                </a>
                <a href="/admin/orders" className="action-card">
                  <div className="action-icon">
                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                      <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Process Orders</span>
                </a>
                <a href="/admin/reviews" className="action-card">
                  <div className="action-icon">
                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Manage Reviews</span>
                </a>
                <a href="/admin/blogs" className="action-card">
                  <div className="action-icon">
                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                      <path d="M4 19V5C4 4.44772 4.44772 4 5 4H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 20H5C4.44772 20 4 19.5523 4 19V8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V19C20 19.5523 19.5523 20 19 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Manage Blogs</span>
                </a>
                <a href="/admin/settings" className="action-card">
                  <div className="action-icon">
                    <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Settings</span>
                </a>
              </div>
            </div>
          </>
        )}

        <style jsx>{`
          .dashboard {
            max-width: 1400px;
            margin: 0 auto;
          }

          .loading-container, .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
          }

          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .error-container button {
            padding: 10px 20px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          }

          /* Stats Grid */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 24px;
          }

          @media (max-width: 1200px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (max-width: 640px) {
            .stats-grid {
              grid-template-columns: 1fr;
            }
          }

          .stat-card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            display: flex;
            gap: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .stat-card.primary {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
          }

          .stat-card.primary .stat-label {
            color: rgba(255, 255, 255, 0.8);
          }

          .stat-card.primary .stat-change {
            color: rgba(255, 255, 255, 0.9);
          }

          .stat-icon {
            width: 56px;
            height: 56px;
            background: rgba(16, 185, 129, 0.1);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #10b981;
            flex-shrink: 0;
          }

          .stat-card.primary .stat-icon {
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }

          .stat-icon.blue {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
          }

          .stat-icon.purple {
            background: rgba(139, 92, 246, 0.1);
            color: #8b5cf6;
          }

          .stat-icon.orange {
            background: rgba(245, 158, 11, 0.1);
            color: #f59e0b;
          }

          .stat-content {
            flex: 1;
          }

          .stat-label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 4px;
          }

          .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 4px;
          }

          .stat-card.primary .stat-value {
            color: white;
          }

          .stat-change {
            font-size: 13px;
            color: #6b7280;
          }

          .stat-change span {
            font-weight: 600;
            color: #10b981;
          }

          .stat-change.warning span {
            color: #f59e0b;
          }

          .stat-card.primary .stat-change span {
            color: white;
          }

          /* Charts Row */
          .charts-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 24px;
          }

          @media (max-width: 1200px) {
            .charts-row {
              grid-template-columns: repeat(2, 1fr);
            }
            .charts-row .weekly-chart {
              grid-column: span 2;
            }
          }

          @media (max-width: 768px) {
            .charts-row {
              grid-template-columns: 1fr;
            }
            .charts-row .weekly-chart {
              grid-column: span 1;
            }
          }

          .chart-card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .card-header h3 {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
          }

          .view-all {
            font-size: 14px;
            color: #10b981;
            text-decoration: none;
            font-weight: 500;
          }

          .view-all:hover {
            text-decoration: underline;
          }

          /* Status Grid */
          .status-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .status-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .status-bar {
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
          }

          .status-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
          }

          .status-info {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
          }

          .status-label {
            font-weight: 500;
          }

          .status-count {
            color: #6b7280;
          }

          /* Payment Stats */
          .payment-stats {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .payment-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #f9fafb;
            border-radius: 10px;
          }

          .payment-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .payment-icon.cod {
            background: #fef3c7;
            color: #f59e0b;
          }

          .payment-icon.online {
            background: #dbeafe;
            color: #3b82f6;
          }

          .payment-info {
            flex: 1;
          }

          .payment-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
          }

          .payment-count {
            font-size: 12px;
            color: #6b7280;
          }

          .payment-percentage {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
          }

          /* Bar Chart */
          .bar-chart {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            height: 160px;
            gap: 8px;
          }

          .bar-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
          }

          .bar-wrapper {
            flex: 1;
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }

          .bar {
            width: 100%;
            background: linear-gradient(180deg, #10b981 0%, #059669 100%);
            border-radius: 6px 6px 0 0;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 4px;
            min-height: 20px;
          }

          .bar-value {
            font-size: 12px;
            font-weight: 600;
            color: white;
          }

          .bar-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 8px;
          }

          /* Recent Orders */
          .recent-orders {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 24px;
          }

          .orders-table {
            overflow-x: auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            padding: 12px 16px;
            text-align: left;
          }

          th {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            border-bottom: 1px solid #e5e7eb;
          }

          td {
            font-size: 14px;
            color: #374151;
            border-bottom: 1px solid #f3f4f6;
          }

          tr:hover {
            background: #f9fafb;
          }

          .order-id {
            font-weight: 600;
            color: #1f2937;
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
          }

          /* Quick Actions */
          .quick-actions h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 16px;
          }

          .actions-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          @media (max-width: 1024px) {
            .actions-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (max-width: 480px) {
            .actions-grid {
              grid-template-columns: 1fr;
            }
          }

          .action-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            background: white;
            border-radius: 12px;
            text-decoration: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
          }

          .action-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .action-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }

          .action-card span {
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
