'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  registeredAt?: string | null;
  status: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sortBy, setSortBy] = useState<'totalSpent' | 'orderCount' | 'lastOrderDate' | 'name' | 'registeredAt'>('totalSpent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'purchasers' | 'leads'>('all');
  const [totals, setTotals] = useState({ totalRevenue: 0, totalOrders: 0, totalCustomers: 0, avgCustomerValue: 0 });

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, sortBy, sortOrder, filter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        sortBy,
        sortOrder,
        filter,
      });

      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();

      if (data.success) {
        setCustomers(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
        if (data.totals) setTotals(data.totals);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers();
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
    });
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '100000',
        search: searchQuery,
        sortBy,
        sortOrder,
        filter,
      });

      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        const csvRows: string[] = [];
        if (filter === 'leads') {
          csvRows.push(['Name', 'Email', 'Phone', 'Registered At'].join(','));
          data.data.forEach((c: Customer) => {
            csvRows.push([
              `"${String(c.name || '').replace(/"/g, '""')}"`,
              `"${c.email || ''}"`,
              `"${c.phone || ''}"`,
              `"${c.registeredAt ? formatDate(c.registeredAt) : ''}"`
            ].join(','));
          });
        } else {
          csvRows.push(['Name', 'Email', 'Phone', 'Orders', 'Total Spent', 'Last Order'].join(','));
          data.data.forEach((c: Customer) => {
            csvRows.push([
              `"${String(c.name || '').replace(/"/g, '""')}"`,
              `"${c.email || ''}"`,
              `"${c.phone || ''}"`,
              c.orderCount || 0,
              c.totalSpent || 0,
              `"${c.lastOrderDate ? formatDate(c.lastOrderDate) : ''}"`
            ].join(','));
          });
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers_${filter}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  const getCustomerTier = (totalSpent: number) => {
    if (totalSpent >= 10000) return { name: 'Gold', color: '#f59e0b', bg: '#fef3c7' };
    if (totalSpent >= 5000) return { name: 'Silver', color: '#6b7280', bg: '#f3f4f6' };
    return { name: 'Bronze', color: '#b45309', bg: '#fef3c7' };
  };

  return (
    <AdminLayoutWrapper pageTitle="Customers">
      <div className="customers-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-info">
            <p className="subtitle">{totalItems} total customers</p>
          </div>
          <button onClick={exportToCSV} className="export-btn">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ marginRight: '8px' }}>
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Customer Tabs */}
        <div className="customer-tabs">
          <button 
            className={`tab ${filter === 'all' ? 'active' : ''}`} 
            onClick={() => { setFilter('all'); setCurrentPage(1); setSortBy('totalSpent'); setSortOrder('desc'); }}
          >
            All Customers
          </button>
          <button 
            className={`tab ${filter === 'purchasers' ? 'active' : ''}`} 
            onClick={() => { setFilter('purchasers'); setCurrentPage(1); setSortBy('totalSpent'); setSortOrder('desc'); }}
          >
            Purchasers
          </button>
          <button 
            className={`tab ${filter === 'leads' ? 'active' : ''}`} 
            onClick={() => { setFilter('leads'); setCurrentPage(1); setSortBy('registeredAt'); setSortOrder('desc'); }}
          >
            Signed Up (No Orders)
          </button>
        </div>

        {/* Search & Sort */}
        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="search-btn">Search</button>
          </form>

          <div className="sort-controls">
            <label className="sort-label">Sort by</label>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                setCurrentPage(1);
              }}
            >
              <option value="totalSpent">Total Spent</option>
              <option value="orderCount">Orders</option>
              <option value="lastOrderDate">Last Order</option>
              <option value="name">Name</option>
              {filter === 'leads' && <option value="registeredAt">Registration Date</option>}
            </select>
            <button
              type="button"
              className="sort-order-btn"
              onClick={() => {
                setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'));
                setCurrentPage(1);
              }}
              title={sortOrder === 'desc' ? 'Descending (high to low)' : 'Ascending (low to high)'}
            >
              {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon customers">
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalItems}</span>
              <span className="stat-label">Total Customers</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue">
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <path d="M12 1V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {formatCurrency(totals.totalRevenue)}
              </span>
              <span className="stat-label">Total Revenue</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orders">
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {totals.totalOrders}
              </span>
              <span className="stat-label">Total Orders</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon average">
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                <line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {formatCurrency(totals.avgCustomerValue)}
              </span>
              <span className="stat-label">Avg. Customer Value</span>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <p>No customers found</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  {filter === 'leads' && <th>Registration Date</th>}
                  {filter !== 'leads' && (
                    <>
                      <th>Orders</th>
                      <th>Total Spent</th>
                      <th>Tier</th>
                      <th>Last Order</th>
                      <th>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const tier = getCustomerTier(customer.totalSpent);

                  return (
                    <tr key={customer.id}>
                      <td>
                        <div className="customer-cell">
                          <div className="avatar">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="name">{customer.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <span className="email">{customer.email || '-'}</span>
                          <span className="phone">{customer.phone || '-'}</span>
                        </div>
                      </td>
                      {filter === 'leads' && (
                        <td className="date">
                          {customer.registeredAt ? formatDate(customer.registeredAt) : '-'}
                        </td>
                      )}
                      {filter !== 'leads' && (
                        <>
                          <td className="orders-count">{customer.orderCount}</td>
                          <td className="amount">{formatCurrency(customer.totalSpent)}</td>
                          <td>
                            <span 
                              className="tier-badge"
                              style={{ backgroundColor: tier.bg, color: tier.color }}
                            >
                              {tier.name}
                            </span>
                          </td>
                          <td className="date">
                            {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '-'}
                          </td>
                          <td>
                            <button 
                              className="view-btn"
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              View Details
                            </button>
                          </td>
                        </>
                      )}
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

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>Customer Details</h2>
                <button className="close-btn" onClick={() => setSelectedCustomer(null)}>
                  <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div className="admin-modal-body">
                {/* Customer Profile */}
                <div className="customer-profile">
                  <div className="avatar large">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <h3>{selectedCustomer.name}</h3>
                    <span 
                      className="tier-badge"
                      style={{ 
                        backgroundColor: getCustomerTier(selectedCustomer.totalSpent).bg, 
                        color: getCustomerTier(selectedCustomer.totalSpent).color 
                      }}
                    >
                      {getCustomerTier(selectedCustomer.totalSpent).name} Customer
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="customer-stats">
                  <div className="stat">
                    <span className="stat-value">{selectedCustomer.orderCount}</span>
                    <span className="stat-label">Orders</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatCurrency(selectedCustomer.totalSpent)}</span>
                    <span className="stat-label">Total Spent</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">
                      {formatCurrency(selectedCustomer.orderCount > 0 
                        ? selectedCustomer.totalSpent / selectedCustomer.orderCount 
                        : 0)}
                    </span>
                    <span className="stat-label">Avg. Order</span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="detail-section">
                  <h4>Contact Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Email</span>
                      <span className="value">{selectedCustomer.email || 'Not provided'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Phone</span>
                      <span className="value">{selectedCustomer.phone || 'Not provided'}</span>
                    </div>
                    <div className="detail-item full">
                      <span className="label">Address</span>
                      <span className="value">{selectedCustomer.address || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Activity */}
                <div className="detail-section">
                  <h4>Activity</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Last Order</span>
                      <span className="value">
                        {selectedCustomer.lastOrderDate 
                          ? formatDate(selectedCustomer.lastOrderDate) 
                          : 'No orders yet'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Customer Since</span>
                      <span className="value">
                        {selectedCustomer.registeredAt
                          ? formatDate(selectedCustomer.registeredAt)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .customers-page {
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

          .export-btn {
            display: flex;
            align-items: center;
            padding: 8px 16px;
            background-color: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .export-btn:hover {
            background-color: #059669;
          }

          .customer-tabs {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 12px;
          }

          .customer-tabs .tab {
            padding: 8px 16px;
            background: none;
            border: none;
            font-size: 14px;
            font-weight: 500;
            color: #6b7280;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
          }

          .customer-tabs .tab:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .customer-tabs .tab.active {
            background: #1f2937;
            color: white;
          }

          .filters {
            margin-bottom: 24px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: center;
            justify-content: space-between;
          }

          .search-form {
            display: flex;
            gap: 12px;
            flex: 1;
            min-width: 280px;
            max-width: 500px;
          }

          .sort-controls {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .sort-label {
            font-size: 13px;
            color: #6b7280;
            font-weight: 500;
          }

          .sort-select {
            padding: 10px 12px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            color: #1f2937;
            cursor: pointer;
            outline: none;
          }

          .sort-select:focus {
            border-color: #10b981;
          }

          .sort-order-btn {
            padding: 10px 14px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 500;
            color: #1f2937;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          }

          .sort-order-btn:hover {
            background: #f9fafb;
            border-color: #d1d5db;
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

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 24px;
          }

          .stat-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .stat-icon.customers {
            background: #dbeafe;
            color: #3b82f6;
          }

          .stat-icon.revenue {
            background: #d1fae5;
            color: #10b981;
          }

          .stat-icon.orders {
            background: #fef3c7;
            color: #f59e0b;
          }

          .stat-icon.average {
            background: #ede9fe;
            color: #8b5cf6;
          }

          .stat-info {
            display: flex;
            flex-direction: column;
          }

          .stat-info .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
          }

          .stat-info .stat-label {
            font-size: 13px;
            color: #6b7280;
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

          .customer-cell {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
          }

          .avatar.large {
            width: 64px;
            height: 64px;
            font-size: 24px;
          }

          .name {
            font-weight: 500;
            color: #1f2937;
          }

          .contact-info {
            display: flex;
            flex-direction: column;
          }

          .email {
            font-size: 14px;
            color: #1f2937;
          }

          .phone {
            font-size: 12px;
            color: #6b7280;
          }

          .orders-count {
            font-weight: 600;
            color: #3b82f6;
          }

          .amount {
            font-weight: 600;
            color: #10b981;
          }

          .tier-badge {
            display: inline-block;
            padding: 4px 12px;
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

          .admin-modal {
            display: block;
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 550px;
            max-height: 90vh;
            overflow-y: auto;
          }

          .admin-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
          }

          .admin-modal-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          }

          .close-btn {
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
          }

          .admin-modal-body {
            padding: 24px;
          }

          .customer-profile {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
          }

          .profile-info h3 {
            margin: 0 0 8px;
            font-size: 20px;
          }

          .customer-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 24px;
          }

          .customer-stats .stat {
            background: #f9fafb;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
          }

          .customer-stats .stat-value {
            display: block;
            font-size: 18px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 4px;
          }

          .customer-stats .stat-label {
            font-size: 12px;
            color: #6b7280;
          }

          .detail-section {
            margin-bottom: 24px;
          }

          .detail-section h4 {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin: 0 0 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
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
          }

          @media (max-width: 768px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
