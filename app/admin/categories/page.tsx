'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Category } from '@/types';

interface CategoryWithCount extends Category {
  product_count?: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    description: '',
    image: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();

      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateHandle = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      handle: editingCategory ? prev.handle : generateHandle(name),
    }));
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      handle: '',
      description: '',
      image: '',
    });
    setShowModal(true);
  };

  const handleEdit = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      handle: category.handle || '',
      description: category.description || '',
      image: category.image || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingCategory ? 'PUT' : 'POST';
      const payload = editingCategory 
        ? { ...formData, id: editingCategory.id }
        : formData;

      const res = await fetch('/api/admin/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        fetchCategories();
      } else {
        alert(data.error || 'Failed to save category');
      }
    } catch (error) {
      alert('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const category = categories.find(c => c.id === id);
    if (category?.product_count && category.product_count > 0) {
      alert(`Cannot delete category with ${category.product_count} products. Please move or delete the products first.`);
      return;
    }

    if (!confirm('Are you sure you want to delete this category?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchCategories();
      } else {
        alert(data.error || 'Failed to delete category');
      }
    } catch (error) {
      alert('An error occurred while deleting');
    } finally {
      setDeleting(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(e);
  };

  return (
    <AdminLayoutWrapper pageTitle="Categories">
      <div className="categories-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-info">
            <p className="subtitle">{categories.length} total categories</p>
          </div>
          <button className="add-btn" onClick={handleAdd}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Add Category
          </button>
        </div>

        {/* Categories Grid */}
        <div className="categories-grid">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <p>No categories found</p>
              <button className="add-btn-secondary" onClick={handleAdd}>Add Your First Category</button>
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="category-card">
                <div className="card-image">
                  {category.image ? (
                    <img src={category.image} alt={category.name} />
                  ) : (
                    <div className="placeholder-image">
                      <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                        <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="card-content">
                  <h3 className="category-name">{category.name}</h3>
                  <p className="category-handle">/{category.handle}</p>
                  {category.description && (
                    <p className="category-description">{category.description}</p>
                  )}
                  <div className="product-count">
                    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                      <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M3 6H21" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {category.product_count || 0} products
                  </div>
                </div>

                <div className="card-actions">
                  <button className="action-btn edit" onClick={() => handleEdit(category)}>
                    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Edit
                  </button>
                  <button 
                    className="action-btn delete" 
                    onClick={() => handleDelete(category.id as number)}
                    disabled={deleting === category.id}
                  >
                    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2"/>
                      <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {deleting === category.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>{editingCategory ? 'Edit Category' : 'New Category'}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="modal-form">
                <div className="form-group">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="e.g., Hair Care"
                  />
                </div>

                <div className="form-group">
                  <label>Handle (URL slug) *</label>
                  <div className="handle-input">
                    <span className="prefix">/category/</span>
                    <input
                      type="text"
                      value={formData.handle}
                      onChange={(e) => setFormData(prev => ({ ...prev, handle: e.target.value }))}
                      required
                      placeholder="hair-care"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Brief description of this category..."
                  />
                </div>

                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://example.com/category-image.jpg"
                  />
                  {formData.image && (
                    <div className="image-preview">
                      <img src={formData.image} alt="Preview" />
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={saving}>
                    {saving ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <style jsx>{`
          .categories-page {
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

          .categories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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

          .category-card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
          }

          .category-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .card-image {
            height: 160px;
            background: #f3f4f6;
            overflow: hidden;
          }

          .card-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .placeholder-image {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #d1d5db;
          }

          .card-content {
            padding: 20px;
          }

          .category-name {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 4px;
          }

          .category-handle {
            font-size: 13px;
            color: #10b981;
            margin: 0 0 12px;
          }

          .category-description {
            font-size: 14px;
            color: #6b7280;
            margin: 0 0 12px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .product-count {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #6b7280;
          }

          .card-actions {
            display: flex;
            gap: 8px;
            padding: 0 20px 20px;
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
            max-width: 500px;
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
          .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
          }

          .form-group input:focus,
          .form-group textarea:focus {
            border-color: #10b981;
          }

          .form-group textarea {
            resize: vertical;
          }

          .handle-input {
            display: flex;
            align-items: center;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
          }

          .handle-input .prefix {
            padding: 12px 16px;
            background: #f9fafb;
            color: #6b7280;
            font-size: 14px;
            border-right: 1px solid #e5e7eb;
          }

          .handle-input input {
            border: none;
            border-radius: 0;
          }

          .image-preview {
            margin-top: 12px;
            border-radius: 10px;
            overflow: hidden;
            height: 120px;
          }

          .image-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
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
