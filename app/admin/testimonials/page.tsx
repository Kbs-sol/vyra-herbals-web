'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Testimonial } from '@/types';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: '#10b981', bg: '#d1fae5' },
  { value: 'inactive', label: 'Inactive', color: '#6b7280', bg: '#f3f4f6' },
];

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Reviews state for importing
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewPicker, setShowReviewPicker] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    comment: '',
    image: '',
    rating: 5,
    status: 'active',
  });

  // Selected file for direct image upload (optional)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // hoverRating is used to preview stars on hover (does not persist)
  

  useEffect(() => {
    fetchTestimonials();
    fetchApprovedReviews();
  }, [currentPage]);

  const fetchApprovedReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch('/api/admin/reviews?status=1&limit=50');
      const data = await res.json();
      if (data.success) {
        setReviews(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      const res = await fetch(`/api/admin/testimonials?${params}`);
      const data = await res.json();

      if (data.success) {
        // normalize api fields to the UI shape used in this component
        const normalized = (data.data || []).map((t: any) => ({
          ...t,
          designation: t.designation || '',
          comment: t.content || '',
          image: t.image_url || t.image || '',
          rating: typeof t.rating === 'number' ? t.rating : (t.rating ? Number(t.rating) : 5),
          status: t.status === 1 || t.status === '1' ? 'active' : (t.status === 0 || t.status === '0' ? 'inactive' : (t.status || 'active')),
        }));

        setTestimonials(normalized);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (initialData?: any) => {
    setEditingTestimonial(null);
    setFormData({
      name: initialData?.reviewer_name || '',
      designation: initialData?.designation || '',
      comment: initialData?.review_text || '',
      image: initialData?.image || '',
      rating: initialData?.rating || 5,
      status: 'active',
    });
    setShowModal(true);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      name: testimonial.name || '',
      designation: testimonial.designation || '',
      comment: testimonial.comment || '',
      image: testimonial.image || '',
      rating: testimonial.rating || 5,
      status: testimonial.status || 'active',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = formData.image || null;

      // If admin selected a local file, upload it first using admin upload endpoint
      if (selectedFile) {
        const uploadForm = new FormData();
        uploadForm.append('file', selectedFile);
        uploadForm.append('handle', 'testimonials');

        const uploadRes = await fetch('/api/admin/uploads', {
          method: 'POST',
          body: uploadForm,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'File upload failed');
        }
        // Prefer signedUrl if returned, otherwise publicUrl
        imageUrl = uploadData.signedUrl || uploadData.publicUrl || null;
      }

      const method = editingTestimonial ? 'PUT' : 'POST';
      // Map UI form fields to API / DB column names
      const payload = editingTestimonial 
        ? {
            id: editingTestimonial.id,
            name: formData.name,
            content: formData.comment,
            image_url: imageUrl || null,
            rating: Number(formData.rating) || 5,
            status: formData.status === 'active' ? 1 : 0,
          }
        : {
            name: formData.name,
            content: formData.comment,
            image_url: imageUrl || null,
            rating: Number(formData.rating) || 5,
            status: formData.status === 'active' ? 1 : 0,
          };

      const res = await fetch('/api/admin/testimonials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        setSelectedFile(null);
        fetchTestimonials();
      } else {
        alert(data.error || 'Failed to save testimonial');
      }
    } catch (error) {
      console.error(error);
      alert((error as any)?.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/testimonials?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchTestimonials();
      } else {
        alert(data.error || 'Failed to delete testimonial');
      }
    } catch (error) {
      alert('An error occurred while deleting');
    } finally {
      setDeleting(null);
    }
  };

  const toggleStatus = async (testimonial: Testimonial) => {
    const newStatusStr = testimonial.status === 'active' ? 'inactive' : 'active';
    const newStatus = newStatusStr === 'active' ? 1 : 0;

    try {
      const res = await fetch('/api/admin/testimonials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: testimonial.id, status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        setTestimonials(testimonials.map(t =>
          t.id === testimonial.id ? { ...t, status: newStatusStr } : t
        ));
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleStarKey = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setFormData(prev => ({ ...prev, rating: i + 1 }));
    }
  };

  // Stars removed — using numeric rating input/display instead
  const renderRatingNumber = (rating: number) => {
    return <span className="rating-number">{rating ?? 5} / 5</span>;
  };

  const getStatusStyle = (status: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found || { color: '#6b7280', bg: '#f3f4f6' };
  };

  return (
    <AdminLayoutWrapper pageTitle="Testimonials">
      <div className="testimonials-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-info">
            <p className="subtitle">{totalItems} total testimonials</p>
          </div>
          <button className="add-btn" onClick={handleAdd}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add Testimonial
          </button>
          <button className="import-btn" onClick={() => setShowReviewPicker(!showReviewPicker)}>
             <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {showReviewPicker ? 'Close Reviews' : 'Import from Reviews'}
          </button>
        </div>

        {/* Review Picker Section */}
        {showReviewPicker && (
          <div className="review-picker-section">
            <div className="section-header">
              <h3>Approved User Reviews</h3>
              <p>Quickly add these reviews to your testimonials</p>
            </div>
            <div className="reviews-horizontal-scroll">
              {loadingReviews ? (
                <div className="mini-loading">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="mini-empty">No approved reviews found</div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="mini-review-card">
                    <div className="review-meta">
                      <span className="reviewer">{review.reviewer_name}</span>
                      <span className="rating">{review.rating} ★</span>
                    </div>
                    <p className="text">{review.review_text}</p>
                    <button 
                      className="add-to-testimonials-btn"
                      onClick={() => handleAdd(review)}
                    >
                      Use as Testimonial
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Testimonials Grid */}
        <div className="testimonials-grid">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading testimonials...</p>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No testimonials found</p>
              <button className="add-btn-secondary" onClick={handleAdd}>Add Your First Testimonial</button>
            </div>
          ) : (
            testimonials.map((testimonial) => {
              const statusStyle = getStatusStyle(testimonial.status || 'active');

              return (
                <div key={testimonial.id} className="testimonial-card">
                  <div className="card-header">
                    <div className="rating">
                      {renderRatingNumber(testimonial.rating || 5)}
                    </div>
                    <div className="status-toggle">
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={testimonial.status === 'active'}
                          onChange={() => toggleStatus(testimonial)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span 
                        className="status-label"
                        style={{ color: statusStyle.color }}
                      >
                        {testimonial.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="testimonial-content">
                    <p className="quote">&ldquo;{testimonial.comment}&rdquo;</p>
                  </div>

                  <div className="author-info">
                    <div className="avatar">
                      {testimonial.image ? (
                        <img src={testimonial.image} alt={testimonial.name} />
                      ) : (
                        <span>{testimonial.name?.charAt(0).toUpperCase() || 'U'}</span>
                      )}
                    </div>
                    <div className="info">
                      <span className="name">{testimonial.name}</span>
                      <span className="designation">{testimonial.designation}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button className="action-btn edit" onClick={() => handleEdit(testimonial)}>
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Edit
                    </button>
                    <button 
                      className="action-btn delete" 
                      onClick={() => handleDelete(testimonial.id as number)}
                      disabled={deleting === testimonial.id}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2"/>
                        <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {deleting === testimonial.id ? 'Deleting...' : 'Delete'}
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

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>{editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSave} className="modal-form">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Customer name"
                  />
                </div>

                <div className="form-group">
                  <label>Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g., CEO, Happy Customer"
                  />
                </div>

                <div className="form-group">
                  <label>Testimonial *</label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                    required
                    rows={4}
                    placeholder="Customer's testimonial text..."
                  />
                </div>

                <div className="form-group">
                  <label>Image</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = (e.target as HTMLInputElement).files?.[0] || null;
                        setSelectedFile(file);
                        // clear URL if a new file selected
                        if (file) setFormData(prev => ({ ...prev, image: '' }));
                      }}
                    />

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={formData.image}
                        onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                        placeholder="Or paste an image URL (optional)"
                        style={{ minWidth: 240 }}
                      />
                      { (selectedFile || formData.image) && (
                        <div style={{ width: 64, height: 64, borderRadius: 6, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                          <img
                            src={selectedFile ? URL.createObjectURL(selectedFile) : formData.image}
                            alt="preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) }
                      { selectedFile && (
                        <button type="button" className="cancel-btn" onClick={() => setSelectedFile(null)}>
                          Remove
                        </button>
                      ) }
                    </div>
                  </div>
                </div>

                  <div className="form-row">
                  <div className="form-group">
                    <label>Rating</label>
                    <div className="star-input">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={formData.rating}
                        onChange={(e) => setFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                        className="rating-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={saving}>
                    {saving ? 'Saving...' : (editingTestimonial ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <style jsx>{`
          .testimonials-page {
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

          .add-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .add-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }

          .import-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: white;
            color: #10b981;
            border: 1px solid #10b981;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            margin-left: 12px;
          }

          .import-btn:hover {
            background: #f0fdf4;
          }

          .review-picker-section {
            background: #f9fafb;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 24px;
            border: 1px dashed #d1d5db;
          }

          .section-header h3 {
            margin: 0 0 4px 0;
            font-size: 18px;
            color: #111827;
          }

          .section-header p {
            margin: 0 0 16px 0;
            font-size: 14px;
            color: #6b7280;
          }

          .reviews-horizontal-scroll {
            display: flex;
            gap: 16px;
            overflow-x: auto;
            padding-bottom: 8px;
          }

          .mini-review-card {
            min-width: 300px;
            max-width: 300px;
            background: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .review-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .reviewer {
            font-weight: 600;
            font-size: 14px;
            color: #374151;
          }

          .mini-review-card .rating {
            color: #f59e0b;
            font-weight: 700;
            font-size: 14px;
          }

          .mini-review-card .text {
            margin: 0;
            font-size: 13px;
            color: #4b5563;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            font-style: italic;
          }

          .add-to-testimonials-btn {
            padding: 8px;
            background: #ecfdf5;
            color: #059669;
            border: 1px solid #d1fae5;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .add-to-testimonials-btn:hover {
            background: #10b981;
            color: white;
          }

          .mini-loading, .mini-empty {
            padding: 20px;
            color: #6b7280;
            font-style: italic;
          }

          .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
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

          .add-btn-secondary {
            padding: 10px 20px;
            background: #f3f4f6;
            color: #374151;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
          }

          .testimonial-card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .rating {
            display: flex;
            gap: 2px;
          }

          .star {
            font-size: 20px;
            color: #e5e7eb;
            transition: transform 0.12s ease, color 0.12s ease, font-size 0.12s ease;
            display: inline-block;
            line-height: 1;
            background: none;
            border: none;
            padding: 0;
            margin: 0;
            cursor: default;
          }

          .star.filled {
            color: #f59e0b;
            transform: scale(1.25);
          }

          .star.interactive {
            cursor: pointer;
            pointer-events: auto; /* ensure clicks register */
            position: relative;
            z-index: 10003; /* above neighbors to avoid accidental overlap */
            background: transparent;
            border: none;
          }

          .star.interactive:hover {
            transform: scale(1.35);
          }

          .star.interactive:focus {
            outline: 2px solid #10b981;
            outline-offset: 3px;
          }

          /* Ensure the glyph inside the button inherits the color and size */
          .star span {
            display: inline-block;
            color: inherit;
            font-size: inherit;
            line-height: 1;
          }

          /* Force filled glyph color as a fallback if other rules override */
          .star.filled span {
            color: #f59e0b !important;
          }

          /* Larger filled size in modal/star-input area */
          .star-input .star {
            font-size: 28px;
          }

          .star-input .star.filled {
            transform: scale(1.4);
            font-size: 34px;
          }

          .status-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .toggle {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 22px;
          }

          .toggle input:checked + .slider:before {
            transform: translateX(18px);
          }

          .status-label {
            font-size: 12px;
            font-weight: 500;
          }

          .testimonial-content {
            margin-bottom: 20px;
          }

          .quote {
            font-size: 15px;
            line-height: 1.7;
            color: #374151;
            margin: 0;
            font-style: italic;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .author-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-top: 16px;
            border-top: 1px solid #f3f4f6;
          }

          .avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 18px;
            overflow: hidden;
          }

          .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .info {
            display: flex;
            flex-direction: column;
          }

          .name {
            font-weight: 600;
            color: #1f2937;
            font-size: 15px;
          }

          .designation {
            font-size: 13px;
            color: #6b7280;
          }

          .card-actions {
            display: flex;
            gap: 10px;
          }

          .action-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 16px;
            border: 1px solid #e5e7eb;
            background: white;
            border-radius: 10px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .action-btn.edit {
            color: #3b82f6;
            border-color: #3b82f6;
          }

          .action-btn.edit:hover {
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
            z-index: 10000;
            padding: 20px;
          }

          .admin-modal {
            display: block; /* ensure visible despite any global .modal rules */
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 550px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative; /* ensure it sits above overlay and captures events */
            z-index: 10001;
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

          .modal-form {
            padding: 24px;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 8px;
          }

          .form-group input,
          .form-group textarea,
          .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
          }

          .form-group input:focus,
          .form-group textarea:focus,
          .form-group select:focus {
            border-color: #10b981;
          }

          .form-group textarea {
            resize: vertical;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .star-input {
            display: flex;
            gap: 4px;
            padding: 12px 0;
          }

          .rating-input {
            width: 90px;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            font-size: 16px;
            outline: none;
          }

          .rating-input:focus {
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16,185,129,0.08);
          }

          .rating-number {
            font-weight: 600;
            color: #f59e0b;
            font-size: 16px;
          }

          .star-input .star {
            font-size: 28px;
          }

          .form-actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
          }

          .cancel-btn {
            flex: 1;
            padding: 14px 20px;
            background: #f3f4f6;
            color: #374151;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }

          .submit-btn {
            flex: 2;
            padding: 14px 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }

          .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
