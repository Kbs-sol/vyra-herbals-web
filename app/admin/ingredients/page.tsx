'use client';

import React, { useEffect, useState, useRef } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Product } from '@/types';

interface Ingredient {
  id?: number;
  product_id: number;
  name: string;
  description: string;
  image_url: string;
  status: number;
}

export default function IngredientsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    status: 1,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
    
    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectAllProducts = () => setSelectedProductIds(products.map(p => p.id as number));
  const clearProductSelection = () => setSelectedProductIds([]);

  useEffect(() => {
    if (selectedProductIds.length === 1) {
      fetchIngredients();
    } else {
      setIngredients([]);
    }
  }, [selectedProductIds]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products?limit=1000');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchIngredients = async () => {
    if (selectedProductIds.length !== 1) return;
    const selectedProductId = selectedProductIds[0];
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/product-ingredients?productId=${selectedProductId}`);
      const data = await res.json();
      if (data.success) {
        setIngredients(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadToStorage = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('handle', 'ingredient-' + Date.now());

    const res = await fetch('/api/admin/uploads', {
      method: 'POST',
      body: fd,
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Upload failed');
    }
    return data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      e.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const publicUrl = await uploadToStorage(file);
      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      alert(err.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const openAddModal = () => {
    if (selectedProductIds.length === 0) {
      alert('Please select at least one product first');
      return;
    }
    setEditingIngredient(null);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      status: 1,
    });
    setShowModal(true);
  };

  const openEditModal = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      description: ingredient.description,
      image_url: ingredient.image_url,
      status: ingredient.status,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image_url) {
      alert('Please upload an image for the ingredient');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        ...formData,
        ...(editingIngredient ? { id: editingIngredient.id, product_id: selectedProductIds[0] } : { productIds: selectedProductIds }),
      };

      const res = await fetch('/api/admin/product-ingredients', {
        method: editingIngredient ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        fetchIngredients();
      } else {
        alert(data.error || 'Failed to save ingredient');
      }
    } catch (error) {
      alert('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/product-ingredients?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirm(null);
        fetchIngredients();
      } else {
        alert(data.error || 'Failed to delete ingredient');
      }
    } catch (error) {
      alert('An error occurred while deleting');
    }
  };

  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id as number));
  const isBulkMode = selectedProductIds.length > 1;

  const getProductImage = (p: Product | null | undefined) => {
    if (!p) return 'https://via.placeholder.com/40';
    try {
      if ((p as any).image_url) {
        if (typeof (p as any).image_url === 'string' && (p as any).image_url.startsWith('[')) {
          const parsed = JSON.parse((p as any).image_url);
          return parsed[0] || 'https://via.placeholder.com/40';
        }
        return (p as any).image_url;
      }
      if (p.images && Array.isArray(p.images) && p.images.length > 0) {
        return p.images[0];
      }
      if (p.images && typeof p.images === 'string') {
          const parsed = JSON.parse(p.images);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : 'https://via.placeholder.com/40';
      }
    } catch (err) {
      console.error("Error parsing product image", err);
    }
    return 'https://via.placeholder.com/40';
  };

  return (
    <AdminLayoutWrapper pageTitle="Product Ingredients">
      <div className="ingredients-page">
        <div className="page-header">
          <div className="header-info">
            <h1 className="page-title">Manage Ingredients</h1>
            <p className="subtitle">Add, edit, and organize ingredients displayed on product pages</p>
          </div>
          <button 
            className="add-btn" 
            onClick={openAddModal}
            disabled={selectedProductIds.length === 0}
          >
            {isBulkMode ? 'Bulk Add Ingredient' : '+ Add Ingredient'}
          </button>
        </div>

        <div className="filters">
          <div className="form-group" style={{ maxWidth: '500px', width: '100%', marginBottom: 0 }}>
            <label>Select Product to Manage Ingredients</label>
            <div className="custom-dropdown-container" ref={dropdownRef}>
              <div 
                className={`custom-dropdown-selected ${isDropdownOpen ? 'active' : ''}`} 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedProductIds.length > 0 ? (
                  <div className="selected-product-info">
                    {selectedProductIds.length === 1 ? (
                      <>
                        <img 
                          src={getProductImage(selectedProducts[0])} 
                          alt={selectedProducts[0].title} 
                          className="dropdown-product-img"
                        />
                        <span className="dropdown-product-title">{selectedProducts[0].title}</span>
                      </>
                    ) : (
                      <span className="dropdown-product-title">{selectedProductIds.length} Products Selected</span>
                    )}
                  </div>
                ) : (
                  <span className="dropdown-placeholder">-- Select Product(s) --</span>
                )}
                <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" width="20" height="20">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              {isDropdownOpen && (
                <div className="custom-dropdown-list">
                  <div className="dropdown-actions">
                    <button type="button" onClick={selectAllProducts}>Select All</button>
                    <button type="button" onClick={clearProductSelection}>Clear</button>
                  </div>
                  <ul className="dropdown-items-list">
                    {products.map(p => (
                      <li 
                        key={p.id} 
                        className={`custom-dropdown-item ${selectedProductIds.includes(p.id as number) ? 'selected' : ''}`}
                        onClick={(e) => { 
                          e.stopPropagation();
                          const id = p.id as number;
                          setSelectedProductIds(prev => 
                            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
                          );
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={selectedProductIds.includes(p.id as number)}
                          readOnly
                          className="product-checkbox"
                        />
                        <img 
                          src={getProductImage(p)} 
                          alt={p.title} 
                          className="dropdown-product-img"
                        />
                        <span className="dropdown-product-title">{p.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="table-container mt-4">
          {selectedProductIds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                  <path d="M4 6h16M4 12h16m-7 6h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p>Please select at least one product above to view or add ingredients.</p>
            </div>
          ) : isBulkMode ? (
            <div className="empty-state bulk-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Bulk Management Mode</h3>
              <p>You have selected <strong>{selectedProductIds.length}</strong> products.</p>
              <p className="subtitle">Any ingredient you add now will be applied to all selected products.</p>
              <button onClick={openAddModal} className="add-btn-small">Bulk Add Ingredient</button>
            </div>
          ) : loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading ingredients...</p>
            </div>
          ) : ingredients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p>No ingredients found for this product</p>
              <button onClick={openAddModal} className="add-btn-small">Add first ingredient</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <img src={item.image_url} alt={item.name} className="table-img" />
                    </td>
                    <td><strong>{item.name}</strong></td>
                    <td className="desc-col">
                      <div className="desc-text">{item.description}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${item.status === 1 ? 'active' : 'inactive'}`}>
                        {item.status === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="action-btn edit" onClick={() => openEditModal(item)} title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button className="action-btn delete" onClick={() => setDeleteConfirm(item.id!)} title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>{editingIngredient ? 'Edit Ingredient' : 'Add New Ingredient'}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <form onSubmit={handleSave} className="admin-modal-form">
                <div className="admin-modal-body">
                  <div className="form-group">
                    <label>Ingredient Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g. Rosemary Oil"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={4}
                      placeholder="e.g. Stimulates hair growth and improves scalp circulation"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Ingredient Image *</label>
                    <div className="image-upload-area">
                      {formData.image_url ? (
                        <div className="image-preview">
                          <img src={formData.image_url} alt="Preview" />
                          <button 
                            type="button" 
                            className="remove-image-btn"
                            onClick={() => setFormData({ ...formData, image_url: '' })}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            id="image-upload"
                            className="file-input-hidden"
                          />
                          <label htmlFor="image-upload" className="upload-btn-label">
                            <svg viewBox="0 0 24 24" fill="none" width="24" height="24" style={{ marginBottom: '8px', color: '#6b7280' }}>
                              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>{uploadingImage ? 'Uploading...' : 'Click to Upload Image'}</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                      className="form-input"
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn" disabled={saving || uploadingImage}>
                    {saving ? 'Saving...' : 'Save Ingredient'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal-overlay">
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Delete Ingredient?</h3>
              <p>Are you sure you want to remove this ingredient? This action cannot be undone.</p>
              <div className="confirm-actions">
                <button className="cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="delete-btn" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .ingredients-page {
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
          }

          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
          }

          .header-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .page-title {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin: 0;
          }

          .subtitle {
            color: #6b7280;
            font-size: 14px;
            margin: 0;
          }

          .add-btn {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
          }

          .add-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
          }

          .add-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          .add-btn-small {
            background: #10b981;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 12px;
          }

          .filters {
            background: white;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            margin-bottom: 24px;
            border: 1px solid #f3f4f6;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
          }

          .form-group label {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
          }

          .form-input {
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            font-size: 14px;
            color: #1f2937;
            transition: all 0.2s;
            width: 100%;
            background: #f9fafb;
            font-family: inherit;
          }

          .form-input:focus {
            outline: none;
            border-color: #10b981;
            background: white;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
          }

          /* Custom Dropdown Styles */
          .custom-dropdown-container {
            position: relative;
            width: 100%;
            user-select: none;
          }

          .custom-dropdown-selected {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #f9fafb;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            min-height: 52px;
          }

          .custom-dropdown-selected:hover {
            border-color: #10b981;
          }

          .custom-dropdown-selected.active {
            border-color: #10b981;
            background: white;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
          }

          .selected-product-info,
          .dropdown-product-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .dropdown-product-img {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            object-fit: cover;
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
          }

          .dropdown-product-title {
            font-size: 14px;
            color: #1f2937;
            font-weight: 500;
          }

          .dropdown-placeholder {
            color: #6b7280;
            font-size: 14px;
          }

          .dropdown-arrow {
            color: #9ca3af;
            transition: transform 0.2s;
          }

          .custom-dropdown-selected.active .dropdown-arrow {
            transform: rotate(180deg);
          }

          .custom-dropdown-list {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            z-index: 50;
            max-height: 400px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .dropdown-actions {
            display: flex;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #f3f4f6;
            background: #f9fafb;
          }

          .dropdown-actions button {
            background: none;
            border: none;
            color: #10b981;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            padding: 0;
          }

          .dropdown-actions button:hover {
            text-decoration: underline;
          }

          .dropdown-items-list {
            margin: 0;
            padding: 8px 0;
            list-style: none;
            overflow-y: auto;
            flex: 1;
          }

          .custom-dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            cursor: pointer;
            transition: background 0.2s;
          }

          .product-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #10b981;
          }

          .custom-dropdown-item:hover {
            background: #f3f4f6;
          }

          .custom-dropdown-item.selected {
            background: #ecfdf5;
          }

          /* Table Styles */
          .table-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid #f3f4f6;
            overflow: hidden;
            overflow-x: auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }

          th {
            background: #f9fafb;
            padding: 16px 24px;
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e5e7eb;
          }

          td {
            padding: 16px 24px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: middle;
            font-size: 14px;
            color: #1f2937;
          }

          tbody tr {
            transition: background-color 0.2s;
          }

          tbody tr:hover {
            background-color: #f9fafb;
          }

          .table-img {
            width: 48px;
            height: 48px;
            object-fit: cover;
            border-radius: 8px;
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
          }

          .desc-col {
            max-width: 300px;
          }

          .desc-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #4b5563;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 500;
          }

          .status-badge.active {
            background: #ecfdf5;
            color: #059669;
          }

          .status-badge.inactive {
            background: #fef2f2;
            color: #e11d48;
          }

          .actions {
            display: flex;
            gap: 8px;
          }

          .action-btn {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            background: transparent;
          }

          .action-btn.edit {
            color: #3b82f6;
          }
          .action-btn.edit:hover {
            background: #eff6ff;
          }

          .action-btn.delete {
            color: #ef4444;
          }
          .action-btn.delete:hover {
            background: #fef2f2;
          }

          /* General Utility Classes */
          .empty-state {
            padding: 64px 24px;
            text-align: center;
            color: #6b7280;
          }

          .empty-icon {
            width: 64px;
            height: 64px;
            background: #f3f4f6;
            color: #9ca3af;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
          }

          .loading {
            padding: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            color: #6b7280;
          }

          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #f3f4f6;
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          /* Modal Styles */
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(17, 24, 39, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            padding: 24px;
            animation: fadeIn 0.2s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .admin-modal {
            background: white;
            border-radius: 20px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            overflow: hidden;
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          .admin-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24px;
            border-bottom: 1px solid #f3f4f6;
          }

          .admin-modal-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
          }

          .close-btn {
            background: #f3f4f6;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 16px;
          }

          .close-btn:hover {
            background: #e5e7eb;
            color: #1f2937;
          }

          .admin-modal-form {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
          }

          .admin-modal-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
          }

          .admin-modal-footer {
            padding: 20px 24px;
            border-top: 1px solid #f3f4f6;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            background: #f9fafb;
            border-bottom-left-radius: 20px;
            border-bottom-right-radius: 20px;
          }

          .cancel-btn {
            padding: 10px 20px;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            color: #374151;
            font-weight: 500;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }

          .cancel-btn:hover {
            background: #f9fafb;
            border-color: #9ca3af;
          }

          .save-btn {
            padding: 10px 24px;
            background: #10b981;
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
          }

          .save-btn:hover:not(:disabled) {
            background: #059669;
            box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
          }

          .save-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .file-input-hidden {
            width: 0.1px;
            height: 0.1px;
            opacity: 0;
            overflow: hidden;
            position: absolute;
            z-index: -1;
          }

          .upload-btn-label {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px 24px;
            background: #f9fafb;
            border: 2px dashed #d1d5db;
            border-radius: 12px;
            color: #4b5563;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            font-weight: 500;
            text-align: center;
          }

          .upload-btn-label:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
            color: #1f2937;
          }

          .image-preview {
            position: relative;
            width: 120px;
            height: 120px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
          }

          .image-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .remove-image-btn {
            position: absolute;
            top: 6px;
            right: 6px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .remove-image-btn:hover {
            background: #dc2626;
            transform: scale(1.1);
          }

          .confirm-modal {
            background: white;
            border-radius: 20px;
            padding: 32px;
            width: 100%;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .confirm-icon {
            width: 64px;
            height: 64px;
            background: #fef2f2;
            color: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
          }

          .confirm-modal h3 {
            margin: 0 0 8px;
            font-size: 20px;
            font-weight: 600;
            color: #111827;
          }

          .confirm-modal p {
            margin: 0 0 24px;
            color: #6b7280;
            font-size: 14px;
            line-height: 1.5;
          }

          .confirm-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
          }

          .delete-btn {
            padding: 10px 24px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
          }

          .delete-btn:hover {
            background: #dc2626;
            box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
