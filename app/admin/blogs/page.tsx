'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Blog } from '@/types';
import Select from 'react-select';
import MarkdownEditor from '@/Components/Shared/MarkdownEditor';

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    handle: '',
    author: '',
    excerpt: '',
    content: '',
    image_url: '',
    images: [] as string[],
    tags: '',
    meta_title: '',
    meta_description: '',
    status: 1,
    related_posts: [] as number[],
  });

  const pageSize = 10;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchQuery,
      });

      const res = await fetch(`/api/admin/blogs?${params}`);
      const data = await res.json();
      if (data.success) {
        setBlogs(data.data || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalItems(data.pagination.total || 0);
      } else {
        showToast('error', data.error || 'Failed to fetch blogs');
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      showToast('error', 'Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchBlogs();
  }, [fetchBlogs]);

  // load all blog options for Related Posts selector
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await fetch(`/api/admin/blogs?page=1&limit=200`);
        const json = await res.json();
        if (json.success) {
          const opts = (json.data || []).map((b: any) => ({ value: b.id, label: b.title }));
          setAllBlogOptions(opts);
        }
      } catch (err) {
        console.warn('Failed to load blog options', err);
      }
    };
    loadOptions();
  }, []);

  const slugify = (text: string) =>
    (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'blog';

  const uploadToStorage = async (file: File) => {
    const safeHandle = formData.handle || slugify(formData.title || 'blog');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('handle', safeHandle);
    fd.append('bucket', 'blogs'); // upload to 'blogs' bucket

    const res = await fetch('/api/admin/uploads', {
      method: 'POST',
      body: fd,
    });

    const data = await res.json();
    if (!data.success) {
      console.error('Server upload error:', data.error || 'Upload failed');
      throw new Error(data.error || 'Upload failed');
    }

    return data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const publicUrl = await uploadToStorage(file);
      setFormData((prev) => ({ ...prev, image_url: publicUrl, images: [publicUrl, ...(prev.images || [])] }));
      showToast('success', 'Image uploaded');
    } catch (err: any) {
      console.error('Image upload failed', err);
      showToast('error', 'Failed to upload image. Ensure the "blogs" bucket exists');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const openAddModal = () => {
    setEditingBlog(null);
    setFormData({ 
      title: '', handle: '', author: '', excerpt: '', content: '', image_url: '', 
      images: [], tags: '', meta_title: '', meta_description: '', status: 1,
      related_posts: [] 
    });
    setShowModal(true);
  };

  // const [mdeTab, setMdeTab] = useState<'write' | 'preview'>('write'); // removed in favor of component state
  const [allBlogOptions, setAllBlogOptions] = useState<{ value: number; label: string }[]>([]);

  const openEditModal = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title || '',
      handle: blog.handle || '',
      author: (blog.author as string) || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      image_url: blog.image_url || blog.images?.[0] || '',
      images: (blog.images as string[]) || [],
      tags: (blog.tags as any)?.join?.(',') || '',
      meta_title: blog.meta_title || '',
      meta_description: blog.meta_description || '',
      status: blog.status ?? 1,
      related_posts: (blog.related_posts as any[]) || [],
    });
    setShowModal(true);
  };

  const resetAndClose = () => {
    setShowModal(false);
    setEditingBlog(null);
  };

  // Keep a body class while modal is open so we can hide global backdrops/disable scrolling
  React.useEffect(() => {
    if (showModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showModal]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    const generateExcerpt = (htmlOrMd: string) => {
      const plainText = htmlOrMd.replace(/[#>*_`\[\]()<>{}~\-!]/g, ' ') // rough stripping markdown symbols
        .replace(/\s+/g, ' ').trim();
      return plainText.slice(0, 180).trim();
    };

    try {
      const resolvedExcerpt = formData.excerpt?.trim() || '';
      const finalExcerpt = resolvedExcerpt || generateExcerpt(formData.content || '');

      const payload: any = {
        ...formData,
        excerpt: finalExcerpt,
        handle: formData.handle || slugify(formData.title),
        images: (formData.images || []).filter((i) => !!i),
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };

      if (editingBlog) payload.id = editingBlog.id;

      const res = await fetch('/api/admin/blogs', {
        method: editingBlog ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast('success', editingBlog ? 'Blog updated' : 'Blog created');
        resetAndClose();
        fetchBlogs();
      } else {
        showToast('error', data.error || 'Failed to save blog');
      }
    } catch (error) {
      console.error('Save error', error);
      showToast('error', 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm('Delete this blog?')) return;
    try {
      const res = await fetch(`/api/admin/blogs?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Blog deleted');
        fetchBlogs();
      } else {
        showToast('error', data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete error', err);
      showToast('error', 'Error deleting blog');
    }
  };

  const getSnippet = (text?: string, maxChars = 130) => {
    if (!text) return 'No description provided yet';
    const plain = text
      .replace(/\s+/g, ' ')
      .replace(/[#>*_`\[\]<>\-~]/g, '')
      .trim();
    if (plain.length <= maxChars) return plain;
    return `${plain.slice(0, maxChars).trim()}...`;
  };

  const togglePublish = async (b: Blog) => {
    try {
      const payload = { id: b.id, status: b.status === 1 ? 0 : 1 };
      const res = await fetch('/api/admin/blogs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        showToast('success', b.status === 1 ? 'Unpublished' : 'Published');
        fetchBlogs();
      } else showToast('error', data.error || 'Failed to update status');
    } catch (err) {
      console.error('Publish toggle error', err);
      showToast('error', 'Failed to update status');
    }
  };

  // removed legacy regex-based renderMarkdown

  return (
    <AdminLayoutWrapper pageTitle="Blogs">
      <div className="blogs-page">
        <div className="toolbar">
          <div className="left">
            <h1>Blogs</h1>
            <p className="muted">Manage articles, drafts and published posts</p>
          </div>

          <div className="right">
            <input
              className="search"
              placeholder="Search by title, handle or excerpt..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
            <button className="btn primary" onClick={openAddModal}>Add Blog</button>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="loading">Loading blogs...</div>
            ) : (
              <>
                <table className="blogs-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Excerpt</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th style={{ width: 260 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blogs.length === 0 ? (
                      <tr><td colSpan={5} className="empty">No blogs found</td></tr>
                    ) : (
                      blogs.map((b) => (
                        <tr key={b.id}>
                          <td className="title-cell">
                            {b.image_url && <img src={b.image_url} alt={b.title} />}
                            <div>
                              <strong>{b.title}</strong>
                            </div>
                          </td>
                          <td className="excerpt">{getSnippet(b.content || b.excerpt)}</td>
                          <td>
                            <span className={`badge ${b.status === 1 ? 'published' : 'draft'}`}>{b.status === 1 ? 'Published' : 'Draft'}</span>
                          </td>
                          <td>{b.created_at ? new Date(b.created_at).toLocaleString() : '-'}</td>
                          <td>
                            <div className="actions">
                              <button className="btn" onClick={() => openEditModal(b)}>Edit</button>
                              <button className="btn" onClick={() => togglePublish(b)}>{b.status === 1 ? 'Unpublish' : 'Publish'}</button>
                              <a className="btn" target="_blank" rel="noreferrer" href={`/blogs/${b.handle}`}>Preview</a>
                              <button className="btn danger" onClick={() => handleDelete(b.id as number)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="pagination">
                  <div>Showing page {currentPage} of {totalPages} ({totalItems} items)</div>
                  <div className="controls">
                    <button className="btn" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Prev</button>
                    <button className="btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <header>
                <h3>{editingBlog ? 'Edit Blog' : 'Add Blog'}</h3>
                <div>
                  <button className="btn" onClick={() => { setShowModal(false); }}>Close</button>
                </div>
              </header>

              <form onSubmit={handleSave} className="modal-form">
                <div className="modal-content-layout">
                  <div className="primary-panel">
                    <div className="form-grid-two">
                      <div>
                        <label>Title</label>
                        <input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} required />
                      </div>

                      <div>
                        <label>Handle (slug)</label>
                        <input value={formData.handle} onChange={(e) => setFormData((p) => ({ ...p, handle: e.target.value }))} placeholder="Auto-generated from title" />
                      </div>

                      <div>
                        <label>Author</label>
                        <input value={formData.author} onChange={(e) => setFormData((p) => ({ ...p, author: e.target.value }))} />
                      </div>

                      <div>
                        <label>Tags (comma separated)</label>
                        <input value={formData.tags} onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))} />
                      </div>

                      <div className="full">
                        <label>Description / Excerpt</label>
                        <textarea value={formData.excerpt} onChange={(e) => setFormData((p) => ({ ...p, excerpt: e.target.value }))} rows={3} placeholder="Enter a short summary for listing cards, or leave blank to auto-generate from content." />
                        <small className="muted">If empty, a short excerpt is derived from content on save.</small>
                      </div>

                      <div className="full">
                        <label>Content (Markdown Editor)</label>
                        <MarkdownEditor 
                          value={formData.content} 
                          onChange={(val) => setFormData(p => ({ ...p, content: val }))} 
                          minHeight="420px"
                        />
                        <small className="muted">Supports Markdown, toolbar actions, and live preview. Use "Format Paste" for ChatGPT content.</small>
                      </div>
                    </div>
                  </div>

                  <aside className="secondary-panel">
                    <div>
                      <label>Related Posts</label>
                      <Select
                        isMulti
                        options={allBlogOptions}
                        value={allBlogOptions.filter((o) => (formData.related_posts || []).includes(o.value))}
                        onChange={(selected) => setFormData((p) => ({ ...p, related_posts: (selected || []).map((s: any) => s.value) }))}
                        placeholder="Select related posts..."
                      />
                      <small className="muted">Add related posts that show on the public blog page.</small>
                    </div>

                    <div>
                      <label>Feature Image</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} />
                      {uploadingImage && <small>Uploading...</small>}
                      {formData.image_url && <img src={formData.image_url} className="thumb" alt="feature image" />}
                    </div>

                    <div>
                      <label>Status</label>
                      <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: parseInt(e.target.value) }))}>
                        <option value={1}>Published</option>
                        <option value={0}>Draft</option>
                      </select>
                    </div>

                    <div>
                      <label>SEO Title</label>
                      <input value={formData.meta_title} onChange={(e) => setFormData((p) => ({ ...p, meta_title: e.target.value }))} />
                    </div>

                    <div>
                      <label>SEO Description</label>
                      <textarea value={formData.meta_description} onChange={(e) => setFormData((p) => ({ ...p, meta_description: e.target.value }))} rows={4} />
                    </div>
                  </aside>
                </div>

                <div className="form-actions">
                  <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : (editingBlog ? 'Update' : 'Create')}</button>
                  <button className="btn" type="button" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {toast && (
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        )}

      </div>
      <style jsx>{`
        .toolbar { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:18px }
        .toolbar .left h1{margin:0}
        .muted{ color:#6b7280; margin-top:4px }
        .search{ padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px; min-width:240px }
        .btn{ padding:8px 12px; border-radius:8px; border:none; background:#f3f4f6; cursor:pointer; margin-left:8px }
        .btn.primary{ background:linear-gradient(90deg,#10b981,#059669); color:white }
        .btn.danger{ background:#ef4444; color:white }
        .card{ background:white; border-radius:12px; box-shadow:0 6px 18px rgba(15,23,42,0.06); overflow:hidden }
        .card-body{ padding:18px }
        .blogs-table{ width:100%; border-collapse:collapse }
        .blogs-table thead th{
          text-align:left;
          padding:12px 16px;
          color:#0f172a; /* zinc-900 */
          font-weight:700;
          font-size:13px;
          background:#f8fafc; /* zinc-50 - light, clean */
          border-bottom:1px solid rgba(2,6,23,0.06);
        }
        .blogs-table thead th:first-child{ border-top-left-radius:10px; }
        .blogs-table thead th:last-child{ border-top-right-radius:10px; }
        .blogs-table td{ padding:12px; border-top:1px solid #eef2f7; vertical-align:top }
        .title-cell{ display:flex; align-items:center; gap:12px }
        .title-cell img{ width:64px; height:48px; object-fit:cover; border-radius:8px }
        .meta{ color:#9ca3af; font-size:12px }
        .excerpt{ color:#4b5563; max-width:380px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
        .badge{ padding:6px 8px; border-radius:999px; font-weight:700; font-size:12px }
        .badge.published{ background:#dcfce7; color:#065f46 }
        .badge.draft{ background:#fef3c7; color:#92400e }
        .actions{ display:flex; gap:8px }
        .pagination{ display:flex; justify-content:space-between; align-items:center; padding:12px 0; color:#6b7280 }
        .modal-overlay{ position:fixed; inset:0; display:flex; align-items:flex-start; justify-content:center; z-index:2000; pointer-events:auto; overflow:auto; padding:12px }
        .modal-dialog{ width:100%; max-width:1180px; background:white; border-radius:12px; box-shadow:0 20px 50px rgba(2,6,23,0.2); overflow:auto; max-height:calc(100vh - 24px); z-index:2001; pointer-events:auto }
        .modal-dialog header{ display:flex; justify-content:space-between; align-items:center; padding:18px 24px; border-bottom:1px solid #f3f4f6 }
        /* When an admin modal is open, hide any global header/backdrop that may block clicks */
        body.modal-open .backdrop { display: none !important; pointer-events: none !important }
        body.modal-open { overflow: hidden }
        .modal-form{ padding:18px 20px }
        .modal-content-layout { display:grid; grid-template-columns: 2fr 1fr; gap:24px; width:100%; align-items: start; }
        .primary-panel, .secondary-panel { background:#fff; }
        .primary-panel { padding-right:12px; }
        .form-grid-two { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .form-grid-two .full{ grid-column:1 / -1 }
        .modal-form label{ display:block; font-weight:600; margin-bottom:6px; color:#374151 }
        .modal-form input, .modal-form textarea, .modal-form select{ width:100%; padding:10px 12px; border-radius:8px; border:1px solid #e5e7eb; background:#fff }
        .secondary-panel{ display:flex; flex-direction:column; gap:16px; align-self:start; width:100% }
        .secondary-panel div{ background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; padding:16px; }
        .secondary-panel .thumb{ width:100%; max-height:220px; object-fit:cover; border-radius:8px; margin-top:8px }
        .form-grid .full, .modal-content-layout + .form-actions { width:100%; }
        .preview-box{ background:#f9fafb; padding:12px; border-radius:8px; border:1px solid #eef2f7; min-height:120px }
        .thumb{ width:120px; height:80px; object-fit:cover; margin-top:8px; border-radius:8px }
        .form-actions{ display:flex; gap:12px; justify-content:flex-end; padding:12px 20px; border-top:1px solid #f3f4f6 }
        .toast{ position:fixed; right:20px; bottom:20px; padding:10px 14px; border-radius:10px; color:white; z-index:2000 }
        .toast.success{ background:#10b981 }
        .toast.error{ background:#ef4444 }
        .empty{ text-align:center; color:#6b7280; padding:20px }

        @media (max-width: 760px){
          .form-grid{ grid-template-columns:1fr }
          .title-cell img{ width:48px; height:40px }
          .actions{ flex-wrap:wrap }
        }
      `}</style>
    </AdminLayoutWrapper>
  );
}
