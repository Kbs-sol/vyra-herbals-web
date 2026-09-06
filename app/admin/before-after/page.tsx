'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

export interface BeforeAfterImage {
  id?: number;
  image_url: string;
  status: string | number;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: '#10b981', bg: '#d1fae5' },
  { value: 'inactive', label: 'Inactive', color: '#6b7280', bg: '#f3f4f6' },
];

export default function BeforeAfterPage() {
  const [images, setImages] = useState<BeforeAfterImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    image: '',
    status: 'active',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/before-after');
      const data = await res.json();

      if (data.success) {
        const normalized = (data.data || []).map((t: any) => ({
          ...t,
          image_url: t.image_url || '',
          status: t.status === 1 || t.status === '1' ? 'active' : 'inactive',
        }));

        setImages(normalized);
      }
    } catch (error) {
      console.error('Error fetching before/after images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      image: '',
      status: 'active',
    });
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = formData.image || null;

      if (selectedFile) {
        const uploadForm = new FormData();
        uploadForm.append('file', selectedFile);
        uploadForm.append('handle', 'testimonials'); // reuse the testimonials bucket/folder

        const uploadRes = await fetch('/api/admin/uploads', {
          method: 'POST',
          body: uploadForm,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'File upload failed');
        }
        imageUrl = uploadData.signedUrl || uploadData.publicUrl || null;
      }

      if (!imageUrl) {
        throw new Error('Please provide an image.');
      }

      const payload = {
        image_url: imageUrl,
        status: formData.status === 'active' ? 1 : 0,
      };

      const res = await fetch('/api/admin/before-after', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        setSelectedFile(null);
        fetchImages();
      } else {
        alert(data.error || 'Failed to save image');
      }
    } catch (error) {
      console.error(error);
      alert((error as any)?.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/before-after?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        fetchImages();
      } else {
        alert(data.error || 'Failed to delete image');
      }
    } catch (error) {
      alert('An error occurred while deleting');
    } finally {
      setDeleting(null);
    }
  };

  const toggleStatus = async (img: BeforeAfterImage) => {
    const newStatusStr = img.status === 'active' ? 'inactive' : 'active';
    const newStatus = newStatusStr === 'active' ? 1 : 0;

    try {
      const res = await fetch('/api/admin/before-after', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: img.id, status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        setImages(images.map(t =>
          t.id === img.id ? { ...t, status: newStatusStr } : t
        ));
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const getStatusStyle = (status: string | number) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found || { color: '#6b7280', bg: '#f3f4f6' };
  };

  return (
    <AdminLayoutWrapper pageTitle="Before & After Images">
      <div className="testimonials-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-info">
            <p className="subtitle">{images.length} total images</p>
          </div>
          <button className="add-btn" onClick={handleAdd}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add Image
          </button>
        </div>

        {/* Images Grid */}
        <div className="testimonials-grid">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p>No before/after images found</p>
              <button className="add-btn-secondary" onClick={handleAdd}>Add Your First Image</button>
            </div>
          ) : (
            images.map((img) => {
              const statusStyle = getStatusStyle(img.status);

              return (
                <div key={img.id} className="testimonial-card">
                  <div className="card-header">
                    <div className="status-toggle">
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={img.status === 'active'}
                          onChange={() => toggleStatus(img)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span
                        className="status-label"
                        style={{ color: statusStyle.color }}
                      >
                        {img.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="image-wrapper" style={{ margin: '16px 0', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1/1' }}>
                    {img.image_url && (
                      <img src={img.image_url} alt="Before & After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>

                  <div className="card-actions" style={{ justifyContent: 'flex-end', borderTop: 'none', paddingTop: 0 }}>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(img.id as number)}
                      disabled={deleting === img.id}
                      style={{ color: '#ef4444' }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" />
                        <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      {deleting === img.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2>Add Image</h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSave} className="modal-form">
                <div className="form-group">
                  <label>Image File *</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = (e.target as HTMLInputElement).files?.[0] || null;
                        setSelectedFile(file);
                        if (file) setFormData(prev => ({ ...prev, image: '' }));
                      }}
                      required={!formData.image}
                    />

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {(selectedFile || formData.image) && (
                        <div style={{ width: 128, height: 128, borderRadius: 6, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                          <img
                            src={selectedFile ? URL.createObjectURL(selectedFile) : formData.image}
                            alt="preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      {selectedFile && (
                        <button type="button" className="cancel-btn" onClick={() => setSelectedFile(null)}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100%' }}
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
                    {saving ? 'Uploading...' : 'Upload Image'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Styles for Page (Copied basic ones from testimonials) */}
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
          .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
          .add-btn {
             display: flex; align-items: center; gap: 8px; padding: 12px 20px;
             background: linear-gradient(135deg, #10b981, #059669); color: white; border: none;
             border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;
          }
          .add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
          .testimonials-grid {
             display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;
          }
          .loading, .empty-state {
             display: flex; flexDirection: column; align-items: center; justify-content: center;
             padding: 60px 20px; color: #6b7280; gap: 16px; grid-column: 1 / -1; background: white; border-radius: 16px;
          }
          .spinner {
             width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #10b981; border-radius: 50%;
             animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .add-btn-secondary {
             padding: 10px 20px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;
          }
          .testimonial-card {
             background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .card-header { display: flex; justify-content: space-between; align-items: center; }
          .status-toggle { display: flex; align-items: center; gap: 12px; }
          .toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
          .toggle input { opacity: 0; width: 0; height: 0; }
          .slider {
             position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
             background-color: #e5e7eb; transition: .4s; border-radius: 24px;
          }
          .slider:before {
             position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
             background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          input:checked + .slider { background-color: #10b981; }
          input:focus + .slider { box-shadow: 0 0 1px #10b981; }
          input:checked + .slider:before { transform: translateX(20px); }
          .status-label { font-size: 13px; font-weight: 500; }
          .card-actions {
             display: flex; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f3f4f6;
          }
          .action-btn {
             display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px;
             font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: transparent; border: none;
          }
          .action-btn:hover { background: #f3f4f6; }
          .modal-overlay {
             position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);
             z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px;
          }
          .admin-modal {
             background: white; border-radius: 20px; width: 100%; max-width: 600px;
             max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }
          .admin-modal-header {
             display: flex; justify-content: space-between; align-items: center; padding: 24px;
             border-bottom: 1px solid #f3f4f6; position: sticky; top: 0; background: white; z-index: 10;
          }
          .admin-modal-header h2 { margin: 0; font-size: 20px; font-weight: 600; color: #111827; }
          .close-btn { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 8px; transition: all 0.2s; }
          .close-btn:hover { background: #f3f4f6; color: #374151; }
          .modal-form { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
          .form-group { display: flex; flex-direction: column; gap: 8px; }
          .form-row { display: grid; gap: 20px; grid-template-columns: 1fr 1fr; }
          .form-group label { font-size: 14px; font-weight: 500; color: #374151; }
          .form-actions {
             display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; padding-top: 24px; border-top: 1px solid #f3f4f6;
          }
          .cancel-btn {
             padding: 10px 20px; background: white; border: 1px solid #d1d5db; color: #374151; border-radius: 10px; font-weight: 500; cursor: pointer;
          }
          .cancel-btn:hover { background: #f9fafb; }
          .submit-btn {
             padding: 10px 20px; background: #10b981; border: none; color: white; border-radius: 10px; font-weight: 500; cursor: pointer; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
          }
          .submit-btn:hover:not(:disabled) { background: #059669; }
          .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
