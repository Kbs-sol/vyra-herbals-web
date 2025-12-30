'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Product } from '@/types';
import { supabase } from '@/utils/supabaseClient';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    handle: '',
    description: '',
    price: '',
    regular_price: '',
    image_url: '',
    category: '',
    images: [] as string[],
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, searchQuery, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.map((c: any) => c.slug));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        category: categoryFilter,
      });

      const res = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const bucketName =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    'images';

  const slugify = (text: string) =>
    (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'product';

  const uploadToStorage = async (file: File) => {
    const safeHandle = formData.handle || slugify(formData.title || 'product');
    const extension = file.name.split('.').pop() || 'jpg';
    const path = `products/${safeHandle}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (error) throw error;

    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMainImage(true);
    try {
      const publicUrl = await uploadToStorage(file);
      setFormData((prev) => ({
        ...prev,
        image_url: publicUrl,
        images: [publicUrl, ...(prev.images || []).filter((img) => img !== publicUrl)],
      }));
    } catch (err) {
      console.error('Main image upload failed', err);
      alert('Failed to upload main image. Please try again.');
    } finally {
      setUploadingMainImage(false);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setUploadingGallery(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadToStorage(file);
        uploaded.push(url);
      }
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...uploaded],
      }));
    } catch (err) {
      console.error('Gallery upload failed', err);
      alert('Failed to upload gallery images.');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const removeGalleryImage = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((img) => img !== url),
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      title: '',
      handle: '',
      description: '',
      price: '',
      regular_price: '',
      image_url: '',
      category: '',
      images: [],
    });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title || '',
      handle: product.handle || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      regular_price: product.regular_price?.toString() || '',
      image_url: product.image_url || product.images?.[0] || '',
      category: product.category || '',
      images: (product.images as string[]) || [],
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const sanitizedImages = (formData.images || []).filter((img) => !!img);
      const mergedImages =
        formData.image_url && !sanitizedImages.includes(formData.image_url)
          ? [formData.image_url, ...sanitizedImages]
          : sanitizedImages;
      const payload = {
        ...formData,
        handle: formData.handle || slugify(formData.title),
        images: mergedImages,
        image_url: formData.image_url || mergedImages[0] || null,
        price: parseFloat(formData.price),
        regular_price: formData.regular_price ? parseFloat(formData.regular_price) : null,
        ...(editingProduct ? { id: editingProduct.id } : {}),
      };

      const res = await fetch('/api/admin/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        fetchProducts();
      } else {
        alert(data.error || 'Failed to save product');
      }
    } catch (error) {
      alert('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setDeleteConfirm(null);
        fetchProducts();
      } else {
        alert(data.error || 'Failed to delete product');
      }
    } catch (error) {
      alert('An error occurred while deleting');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AdminLayoutWrapper pageTitle="Products">
      <div className="products-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-info">
            <p className="subtitle">{totalItems} products in your store</p>
          </div>
          <button className="add-btn" onClick={openAddModal}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add Product
          </button>
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
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="search-btn">Search</button>
          </form>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
        </div>

        {/* Products Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                <path d="M21 16V8.00002C20.9996 7.6493 20.9071 7.30483 20.7315 7.00119C20.556 6.69754 20.3037 6.44539 20 6.27002L13 2.27002C12.696 2.09449 12.3511 2.00208 12 2.00208C11.6489 2.00208 11.304 2.09449 11 2.27002L4 6.27002C3.69626 6.44539 3.44398 6.69754 3.26846 7.00119C3.09294 7.30483 3.00036 7.6493 3 8.00002V16C3.00036 16.3508 3.09294 16.6952 3.26846 16.9989C3.44398 17.3025 3.69626 17.5547 4 17.73L11 21.73C11.304 21.9056 11.6489 21.998 12 21.998C12.3511 21.998 12.696 21.9056 13 21.73L20 17.73C20.3037 17.5547 20.556 17.3025 20.7315 16.9989C20.9071 16.6952 20.9996 16.3508 21 16Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <p>No products found</p>
              <button onClick={openAddModal} className="add-btn-small">Add your first product</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Regular Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-image">
                          {product.image_url || product.images?.[0] ? (
                            <img
                              src={(product.image_url as string) || (product.images?.[0] as string)}
                              alt={product.title}
                            />
                          ) : (
                            <div className="no-image">
                              <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                                <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="product-info">
                          <h4>{product.title}</h4>
                          <p className="handle">{product.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">
                        {product.category?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="price">{formatCurrency(product.price)}</td>
                    <td className="regular-price">
                      {product.regular_price ? formatCurrency(product.regular_price) : '-'}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="action-btn edit" onClick={() => openEditModal(product)} title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => setDeleteConfirm(product.id as number)}
                          title="Delete"
                        >
                          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Product Title *</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="Enter product title"
                      />
                    </div>
                    <div className="form-group">
                      <label>Handle (URL Slug)</label>
                      <input
                        type="text"
                        value={formData.handle}
                        onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                        placeholder="auto-generated-from-title"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      placeholder="Enter product description"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Price *</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label>Regular Price (MRP)</label>
                      <input
                        type="number"
                        value={formData.regular_price}
                        onChange={(e) => setFormData({ ...formData, regular_price: e.target.value })}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="text"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="/assets/images/products/image.jpg"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Upload Main Image</label>
                      <div className="upload-control">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMainImageUpload}
                          disabled={uploadingMainImage}
                        />
                        <span className="help-text">
                          Stored in Supabase Storage ({bucketName})
                        </span>
                        {uploadingMainImage && <span className="uploading">Uploading...</span>}
                      </div>
                      {formData.image_url && (
                        <div className="image-preview">
                          <img src={formData.image_url} alt="Main preview" />
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                image_url: '',
                                images: (prev.images || []).filter((img) => img !== prev.image_url),
                              }))
                            }
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Gallery Images</label>
                      <div className="upload-control">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleGalleryUpload}
                          disabled={uploadingGallery}
                        />
                        <span className="help-text">Add additional angles or lifestyle shots</span>
                        {uploadingGallery && <span className="uploading">Uploading...</span>}
                      </div>
                      <div className="gallery-preview">
                        {formData.images?.length ? (
                          formData.images.map((img) => (
                            <div className="thumb" key={img}>
                              <img src={img} alt="Gallery" />
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeGalleryImage(img)}
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="muted">No gallery images yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
                  <path d="M12 9V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M10.29 3.86L1.82 18C1.64 18.3024 1.54 18.6453 1.53 18.9973C1.52 19.3492 1.60 19.6975 1.76 20.0098C1.92 20.322 2.16 20.5872 2.45 20.7798C2.75 20.9723 3.09 21.0851 3.44 21.1H20.56C20.91 21.0851 21.25 20.9723 21.55 20.7798C21.84 20.5872 22.08 20.322 22.24 20.0098C22.4 19.6975 22.48 19.3492 22.47 18.9973C22.46 18.6453 22.36 18.3024 22.18 18L13.71 3.86C13.53 3.56611 13.28 3.32312 12.98 3.15448C12.68 2.98585 12.34 2.89725 12 2.89725C11.66 2.89725 11.32 2.98585 11.02 3.15448C10.72 3.32312 10.47 3.56611 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Delete Product?</h3>
              <p>This action cannot be undone. Are you sure you want to delete this product?</p>
              <div className="confirm-actions">
                <button className="cancel-btn" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button className="delete-btn" onClick={() => handleDelete(deleteConfirm)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .products-page {
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .add-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
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
            min-width: 180px;
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

          .add-btn-small {
            padding: 10px 16px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
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

          .product-cell {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .product-image {
            width: 60px;
            height: 60px;
            border-radius: 10px;
            overflow: hidden;
            background: #f3f4f6;
            flex-shrink: 0;
          }

          .product-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .no-image {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
          }

          .product-info h4 {
            margin: 0 0 4px;
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
          }

          .product-info .handle {
            margin: 0;
            font-size: 12px;
            color: #9ca3af;
          }

          .category-badge {
            display: inline-block;
            padding: 4px 10px;
            background: #f3f4f6;
            color: #4b5563;
            border-radius: 20px;
            font-size: 12px;
            text-transform: capitalize;
          }

          .price {
            font-weight: 600;
            color: #10b981;
          }

          .regular-price {
            color: #9ca3af;
            text-decoration: line-through;
          }

          .actions {
            display: flex;
            gap: 8px;
          }

          .action-btn {
            width: 36px;
            height: 36px;
            border: none;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
          }

          .action-btn.edit {
            background: #dbeafe;
            color: #3b82f6;
          }

          .action-btn.edit:hover {
            background: #bfdbfe;
          }

          .action-btn.delete {
            background: #fee2e2;
            color: #ef4444;
          }

          .action-btn.delete:hover {
            background: #fecaca;
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
            border-color: #d1d5db;
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

          .modal {
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 640px;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
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
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          @media (max-width: 640px) {
            .form-row {
              grid-template-columns: 1fr;
            }
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .form-group label {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            border-color: #10b981;
          }

          .form-group textarea {
            resize: vertical;
          }

          .upload-control {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .help-text {
            font-size: 12px;
            color: #6b7280;
          }

          .uploading {
            font-size: 13px;
            color: #2563eb;
          }

          .image-preview {
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .image-preview img {
            width: 96px;
            height: 96px;
            object-fit: cover;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
          }

          .remove-btn {
            border: none;
            background: #fee2e2;
            color: #b91c1c;
            padding: 6px 10px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
          }

          .gallery-preview {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 12px;
            margin-top: 10px;
          }

          .gallery-preview .thumb {
            position: relative;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            background: #f9fafb;
          }

          .gallery-preview img {
            width: 100%;
            height: 120px;
            object-fit: cover;
            display: block;
          }

          .gallery-preview .remove-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 4px 8px;
          }

          .muted {
            color: #6b7280;
            font-size: 13px;
            margin: 0;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px;
            border-top: 1px solid #e5e7eb;
          }

          .cancel-btn {
            padding: 12px 20px;
            background: #f3f4f6;
            color: #374151;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            cursor: pointer;
          }

          .save-btn {
            padding: 12px 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            cursor: pointer;
          }

          .save-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .confirm-modal {
            background: white;
            border-radius: 16px;
            padding: 32px;
            text-align: center;
            max-width: 400px;
          }

          .confirm-icon {
            width: 64px;
            height: 64px;
            background: #fee2e2;
            color: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
          }

          .confirm-modal h3 {
            margin: 0 0 8px;
            font-size: 18px;
          }

          .confirm-modal p {
            margin: 0 0 24px;
            color: #6b7280;
            font-size: 14px;
          }

          .confirm-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
          }

          .delete-btn {
            padding: 12px 20px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            cursor: pointer;
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
