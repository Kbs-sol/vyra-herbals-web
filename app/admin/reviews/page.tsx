'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Review } from '@/types';

interface ReviewWithProduct extends Review {
  products?: {
    title: string;
    handle: string;
    images: string[];
  };
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'approved', label: 'Approved', color: '#10b981', bg: '#d1fae5' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444', bg: '#fee2e2' },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedReview, setSelectedReview] = useState<ReviewWithProduct | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [currentPage, statusFilter, ratingFilter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        status: statusFilter,
        rating: ratingFilter,
      });

      const res = await fetch(`/api/admin/reviews?${params}`);
      const data = await res.json();

      if (data.success) {
        setReviews(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReviewStatus = async (reviewId: number, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewId, status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        setReviews(reviews.map(r => 
          r.id === reviewId ? { ...r, status: newStatus } : r
        ));
        if (selectedReview?.id === reviewId) {
          setSelectedReview({ ...selectedReview, status: newStatus });
        }
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (error) {
      alert('An error occurred while updating');
    }
  };

  const deleteReview = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    setDeleting(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews?id=${reviewId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setReviews(reviews.filter(r => r.id !== reviewId));
        setTotalItems(prev => prev - 1);
        if (selectedReview?.id === reviewId) {
          setSelectedReview(null);
        }
      } else {
        alert(data.error || 'Failed to delete review');
      }
    } catch (error) {
      alert('An error occurred while deleting');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusStyle = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found || { color: '#6b7280', bg: '#f3f4f6' };
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`star ${i < rating ? 'filled' : ''}`}>★</span>
    ));
  };

  return (
    <AdminLayoutWrapper pageTitle="Reviews">
      <div className="reviews-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-info">
            <p className="subtitle">{totalItems} total reviews</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          {/* Quick Filter Buttons */}
          <div className="quick-filters">
            <button
              className={`quick-btn ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('pending');
                setCurrentPage(1);
              }}
            >
              Pending ({reviews.filter(r => r.status === 'pending').length})
            </button>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="reviews-grid">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No reviews found</p>
            </div>
          ) : (
            reviews.map((review) => {
              const statusStyle = getStatusStyle(review.status || 'pending');

              return (
                <div key={review.id} className="review-card">
                  <div className="card-header">
                    <div className="rating">
                      {renderStars(review.rating)}
                    </div>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                    >
                      {review.status?.charAt(0).toUpperCase() + review.status?.slice(1)}
                    </span>
                  </div>

                  <div className="review-content">
                    <p className="comment">{review.comment}</p>
                  </div>

                  <div className="reviewer-info">
                    <div className="avatar">
                      {review.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="info">
                      <span className="name">{review.name || 'Anonymous'}</span>
                      <span className="date">{formatDate(review.created_at || '')}</span>
                    </div>
                  </div>

                  {review.products && (
                    <div className="product-info">
                      <span className="label">Product:</span>
                      <span className="product-name">{review.products.title}</span>
                    </div>
                  )}

                  <div className="card-actions">
                    <button
                      className="action-btn approve"
                      onClick={() => updateReviewStatus(review.id as number, 'approved')}
                      disabled={review.status === 'approved'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Approve
                    </button>
                    <button
                      className="action-btn reject"
                      onClick={() => updateReviewStatus(review.id as number, 'rejected')}
                      disabled={review.status === 'rejected'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Reject
                    </button>
                    <button
                      className="action-btn view"
                      onClick={() => setSelectedReview(review)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      View
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => deleteReview(review.id as number)}
                      disabled={deleting === review.id}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2"/>
                        <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
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

        {/* Review Detail Modal */}
        {selectedReview && (
          <div className="modal-overlay" onClick={() => setSelectedReview(null)}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Review Details</h2>
                <button className="close-btn" onClick={() => setSelectedReview(null)}>
                  <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div className="modal-body">
                {/* Status Update */}
                <div className="detail-section">
                  <h3>Status</h3>
                  <div className="status-selector">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status.value}
                        className={`status-option ${selectedReview.status === status.value ? 'active' : ''}`}
                        style={{ 
                          '--active-color': status.color,
                          '--active-bg': status.bg 
                        } as React.CSSProperties}
                        onClick={() => updateReviewStatus(selectedReview.id as number, status.value)}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="detail-section">
                  <h3>Rating</h3>
                  <div className="large-rating">
                    {renderStars(selectedReview.rating)}
                    <span className="rating-text">{selectedReview.rating} out of 5</span>
                  </div>
                </div>

                {/* Review Text */}
                <div className="detail-section">
                  <h3>Review</h3>
                  <div className="review-text">
                    {selectedReview.comment}
                  </div>
                </div>

                {/* Reviewer */}
                <div className="detail-section">
                  <h3>Reviewer</h3>
                  <div className="reviewer-detail">
                    <div className="avatar large">
                      {selectedReview.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="details">
                      <span className="name">{selectedReview.name || 'Anonymous'}</span>
                      <span className="email">{selectedReview.email || 'No email provided'}</span>
                      <span className="date">Submitted on {formatDate(selectedReview.created_at || '')}</span>
                    </div>
                  </div>
                </div>

                {/* Product */}
                {selectedReview.products && (
                  <div className="detail-section">
                    <h3>Product</h3>
                    <div className="product-detail">
                      {selectedReview.products.images?.[0] && (
                        <img 
                          src={selectedReview.products.images[0]} 
                          alt={selectedReview.products.title}
                          className="product-img"
                        />
                      )}
                      <span className="product-title">{selectedReview.products.title}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="modal-actions">
                  <button
                    className="btn approve-btn"
                    onClick={() => updateReviewStatus(selectedReview.id as number, 'approved')}
                    disabled={selectedReview.status === 'approved'}
                  >
                    Approve Review
                  </button>
                  <button
                    className="btn reject-btn"
                    onClick={() => updateReviewStatus(selectedReview.id as number, 'rejected')}
                    disabled={selectedReview.status === 'rejected'}
                  >
                    Reject Review
                  </button>
                  <button
                    className="btn delete-btn"
                    onClick={() => {
                      deleteReview(selectedReview.id as number);
                    }}
                  >
                    Delete Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .reviews-page {
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
            align-items: center;
          }

          .filter-select {
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            background: white;
            cursor: pointer;
            min-width: 140px;
          }

          .quick-filters {
            margin-left: auto;
          }

          .quick-btn {
            padding: 10px 16px;
            border: 1px solid #f59e0b;
            background: white;
            color: #f59e0b;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .quick-btn.active,
          .quick-btn:hover {
            background: #f59e0b;
            color: white;
          }

          .reviews-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
          }

          .loading, .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: #6b7280;
            gap: 16px;
            grid-column: 1 / -1;
            background: white;
            border-radius: 16px;
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

          .review-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .rating {
            display: flex;
            gap: 2px;
          }

          .star {
            font-size: 18px;
            color: #e5e7eb;
          }

          .star.filled {
            color: #f59e0b;
          }

          .status-badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
          }

          .review-content {
            margin-bottom: 16px;
          }

          .comment {
            color: #374151;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .reviewer-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
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
            width: 56px;
            height: 56px;
            font-size: 20px;
          }

          .info {
            display: flex;
            flex-direction: column;
          }

          .name {
            font-weight: 600;
            color: #1f2937;
          }

          .date {
            font-size: 12px;
            color: #6b7280;
          }

          .product-info {
            display: flex;
            gap: 8px;
            font-size: 13px;
            color: #6b7280;
            padding: 10px;
            background: #f9fafb;
            border-radius: 8px;
            margin-bottom: 16px;
          }

          .product-info .label {
            font-weight: 500;
          }

          .product-name {
            color: #374151;
          }

          .card-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .action-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border: 1px solid #e5e7eb;
            background: white;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .action-btn.approve {
            color: #10b981;
            border-color: #10b981;
          }

          .action-btn.approve:hover:not(:disabled) {
            background: #d1fae5;
          }

          .action-btn.reject {
            color: #f59e0b;
            border-color: #f59e0b;
          }

          .action-btn.reject:hover:not(:disabled) {
            background: #fef3c7;
          }

          .action-btn.view {
            color: #3b82f6;
            border-color: #3b82f6;
          }

          .action-btn.view:hover {
            background: #dbeafe;
          }

          .action-btn.delete {
            color: #ef4444;
            border-color: #ef4444;
          }

          .action-btn.delete:hover:not(:disabled) {
            background: #fee2e2;
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

          .review-modal {
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            position: sticky;
            top: 0;
            background: white;
          }

          .modal-header h2 {
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

          .modal-body {
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

          .status-option:hover {
            border-color: var(--active-color);
            color: var(--active-color);
          }

          .status-option.active {
            border-color: var(--active-color);
            background: var(--active-bg);
            color: var(--active-color);
          }

          .large-rating {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .large-rating .star {
            font-size: 28px;
          }

          .rating-text {
            color: #6b7280;
            font-size: 14px;
          }

          .review-text {
            padding: 16px;
            background: #f9fafb;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.7;
            color: #374151;
          }

          .reviewer-detail {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .reviewer-detail .details {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .reviewer-detail .email {
            font-size: 13px;
            color: #6b7280;
          }

          .product-detail {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #f9fafb;
            border-radius: 10px;
          }

          .product-img {
            width: 48px;
            height: 48px;
            object-fit: cover;
            border-radius: 8px;
          }

          .product-title {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
          }

          .modal-actions {
            display: flex;
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }

          .btn {
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .approve-btn {
            background: #10b981;
            color: white;
          }

          .approve-btn:hover:not(:disabled) {
            background: #059669;
          }

          .reject-btn {
            background: #f59e0b;
            color: white;
          }

          .reject-btn:hover:not(:disabled) {
            background: #d97706;
          }

          .delete-btn {
            background: #ef4444;
            color: white;
          }

          .delete-btn:hover:not(:disabled) {
            background: #dc2626;
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
