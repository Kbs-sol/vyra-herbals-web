'use client';

/**
 * Admin Media Library
 * -------------------
 * Bulk editor for product images:
 *
 *  - View every product with its main image + gallery in one place.
 *  - Edit `image_url` (main image) via **paste URL** OR **file upload**.
 *  - Manage the gallery `images[]` array — add by URL, reorder, delete.
 *  - Search + category filter to jump to a specific product.
 *  - Preview thumbnails inline before saving.
 *  - Every save hits `PUT /api/admin/products` (existing endpoint) with
 *    just `{ id, image_url, images }` — no other fields disturbed.
 *
 * This complements the full product editor at `/admin/products` — that
 * page is optimised for creating a product; this page is optimised for
 * FAST image-only maintenance (paste a new hosted URL, click Save, done).
 */

import React, { useEffect, useMemo, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Product } from '@/types';

// ------------------------------- Row --------------------------------------

interface RowState {
  id: number;
  title: string;
  handle: string;
  category: string;
  mainImage: string;
  gallery: string[];
  saving: boolean;
  savedAt: number | null;
  error: string | null;
  dirty: boolean;
  uploading: boolean;
  newUrl: string;      // Input buffer for "Add gallery image by URL"
  mainUrlDraft: string; // Input buffer for the main image field
}

const emptyRow = (p: any): RowState => ({
  id: p.id,
  title: p.title || '(untitled)',
  handle: p.handle || '',
  category: p.category || '',
  mainImage: p.image_url || (Array.isArray(p.images) && p.images[0]) || '',
  gallery: Array.isArray(p.images) ? [...p.images] : [],
  saving: false,
  savedAt: null,
  error: null,
  dirty: false,
  uploading: false,
  newUrl: '',
  mainUrlDraft: p.image_url || (Array.isArray(p.images) && p.images[0]) || '',
});

// -------------------------- Small components -----------------------------

function Thumb({ url, onClick, size = 72 }: { url: string; onClick?: () => void; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!url) {
    return (
      <div
        className="thumb thumb-empty"
        style={{ width: size, height: size }}
        title="No image"
      >
        <span>—</span>
      </div>
    );
  }
  return (
    <div
      className="thumb"
      style={{ width: size, height: size, cursor: onClick ? 'pointer' : 'default' }}
      title={url}
      onClick={onClick}
    >
      {broken ? (
        <span className="broken">broken</span>
      ) : (
        // Using a plain <img> here on purpose — this is an admin panel and
        // we do NOT want next/image's optimiser to hit every candidate URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="preview" onError={() => setBroken(true)} />
      )}
    </div>
  );
}

// ----------------------------- Main page ---------------------------------

export default function AdminMediaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [onlyBroken, setOnlyBroken] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<string>('');

  // -------- fetch --------
  useEffect(() => {
    void loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products?limit=1000', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const list = (data.data || []) as any[];
        setProducts(list);
        const map: Record<number, RowState> = {};
        list.forEach((p) => {
          map[p.id] = emptyRow(p);
        });
        setRows(map);
        const cats = Array.from(new Set(list.map((p) => p.category).filter(Boolean))) as string[];
        setCategories(cats.sort());
      } else {
        setGlobalStatus(data.error || 'Failed to load products.');
      }
    } catch (e: any) {
      setGlobalStatus(e.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  // -------- filtered view --------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const row = rows[p.id];
      if (!row) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (onlyMissing && row.mainImage) return false;
      if (onlyBroken && !row.mainImage) return false; // broken filter is best-effort
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        row.handle.toLowerCase().includes(q) ||
        String(row.id).includes(q)
      );
    });
  }, [products, rows, categoryFilter, search, onlyBroken, onlyMissing]);

  // -------- state mutation helpers --------
  const patchRow = (id: number, patch: Partial<RowState>) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch, dirty: true },
    }));
  };

  const onMainUrlChange = (id: number, value: string) => {
    patchRow(id, { mainUrlDraft: value });
  };

  const commitMainUrl = (id: number) => {
    const row = rows[id];
    if (!row) return;
    const url = row.mainUrlDraft.trim();
    // Update gallery so main image is always at index 0 (or absent if empty)
    let gallery = row.gallery.filter((g) => g && g !== url);
    if (url) gallery = [url, ...gallery];
    patchRow(id, { mainImage: url, gallery });
  };

  const addGalleryUrl = (id: number) => {
    const row = rows[id];
    if (!row) return;
    const url = row.newUrl.trim();
    if (!url) return;
    if (row.gallery.includes(url)) {
      patchRow(id, { newUrl: '', error: 'Already in gallery' });
      return;
    }
    patchRow(id, {
      gallery: [...row.gallery, url],
      newUrl: '',
      error: null,
      // If the main image is empty, promote the first gallery URL.
      mainImage: row.mainImage || url,
      mainUrlDraft: row.mainUrlDraft || url,
    });
  };

  const removeGallery = (id: number, url: string) => {
    const row = rows[id];
    if (!row) return;
    const gallery = row.gallery.filter((g) => g !== url);
    patchRow(id, {
      gallery,
      // If we removed the main image, promote the next one.
      mainImage: row.mainImage === url ? gallery[0] || '' : row.mainImage,
      mainUrlDraft: row.mainImage === url ? gallery[0] || '' : row.mainUrlDraft,
    });
  };

  const moveGallery = (id: number, from: number, to: number) => {
    const row = rows[id];
    if (!row) return;
    const gallery = [...row.gallery];
    if (to < 0 || to >= gallery.length) return;
    const [item] = gallery.splice(from, 1);
    gallery.splice(to, 0, item);
    patchRow(id, {
      gallery,
      mainImage: gallery[0] || '',
      mainUrlDraft: gallery[0] || '',
    });
  };

  // -------- upload --------
  const onFileUpload = async (id: number, file: File, target: 'main' | 'gallery') => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      patchRow(id, { error: 'File must be under 5 MB' });
      return;
    }
    patchRow(id, { uploading: true, error: null });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');
      const url: string = data.publicUrl;
      const row = rows[id];
      if (target === 'main') {
        const gallery = [url, ...row.gallery.filter((g) => g !== url)];
        patchRow(id, {
          mainImage: url,
          mainUrlDraft: url,
          gallery,
          uploading: false,
        });
      } else {
        const gallery = row.gallery.includes(url) ? row.gallery : [...row.gallery, url];
        patchRow(id, {
          gallery,
          mainImage: row.mainImage || url,
          mainUrlDraft: row.mainUrlDraft || url,
          uploading: false,
        });
      }
    } catch (e: any) {
      patchRow(id, { uploading: false, error: e.message || 'Upload failed' });
    }
  };

  // -------- save --------
  const saveRow = async (id: number) => {
    const row = rows[id];
    if (!row) return;
    patchRow(id, { saving: true, error: null });
    try {
      // Force main image to be index 0 of the gallery, always.
      const gallery = row.mainImage
        ? [row.mainImage, ...row.gallery.filter((g) => g && g !== row.mainImage)]
        : row.gallery.filter(Boolean);
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          image_url: row.mainImage || null,
          images: gallery,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setRows((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          saving: false,
          savedAt: Date.now(),
          dirty: false,
          gallery,
        },
      }));
    } catch (e: any) {
      patchRow(id, { saving: false, error: e.message || 'Save failed' });
    }
  };

  const revertRow = (id: number) => {
    const src = products.find((p) => p.id === id);
    if (!src) return;
    setRows((prev) => ({ ...prev, [id]: emptyRow(src) }));
  };

  const saveAllDirty = async () => {
    const dirty = Object.values(rows).filter((r) => r.dirty && !r.saving);
    if (!dirty.length) {
      setGlobalStatus('Nothing to save.');
      return;
    }
    setGlobalStatus(`Saving ${dirty.length} product(s)…`);
    let ok = 0;
    let fail = 0;
    for (const r of dirty) {
      // Sequential to keep server load gentle.
      // eslint-disable-next-line no-await-in-loop
      await saveRow(r.id);
      const post = rows[r.id];
      if (post?.error) fail += 1;
      else ok += 1;
    }
    setGlobalStatus(`Done. ${ok} saved, ${fail} failed.`);
    setTimeout(() => setGlobalStatus(''), 5000);
  };

  // -------- render --------
  const dirtyCount = Object.values(rows).filter((r) => r.dirty).length;

  return (
    <AdminLayoutWrapper pageTitle="Media Library">
      <div className="media-wrap">
        <div className="topbar">
          <div>
            <h1 className="title">Media Library</h1>
            <p className="sub">
              Bulk image manager for every product. Paste a URL (from any host — S3,
              CDN, WhatsApp image, Instagram Business, Google Drive public link) or
              upload from disk. Changes save to <code>products.image_url</code> and{' '}
              <code>products.images[]</code> only — nothing else on the product is
              touched.
            </p>
          </div>
          <div className="toolbar">
            <input
              className="input"
              placeholder="Search title / handle / ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="chk">
              <input
                type="checkbox"
                checked={onlyMissing}
                onChange={(e) => setOnlyMissing(e.target.checked)}
              />
              Missing main image only
            </label>
            <button
              className="btn btn-primary"
              onClick={saveAllDirty}
              disabled={!dirtyCount}
              title={dirtyCount ? `${dirtyCount} unsaved` : 'No unsaved changes'}
            >
              Save all ({dirtyCount})
            </button>
            <button className="btn btn-ghost" onClick={loadProducts}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {globalStatus && <div className="global-status">{globalStatus}</div>}

        {loading ? (
          <div className="loading">Loading products…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No products match this filter.</div>
        ) : (
          <div className="rows">
            {filtered.map((p) => {
              const r = rows[p.id];
              if (!r) return null;
              return (
                <div key={p.id} className={`row ${r.dirty ? 'row-dirty' : ''}`}>
                  <div className="row-head">
                    <Thumb url={r.mainImage} size={96} />
                    <div className="meta">
                      <div className="prod-title">
                        {r.title}{' '}
                        <span className="prod-id">#{r.id}</span>
                      </div>
                      <div className="prod-handle">
                        /product/{r.handle} · {r.category || 'uncategorised'}
                      </div>
                      <div className="prod-actions">
                        <a
                          href={`/product/${encodeURIComponent(r.handle)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="link"
                        >
                          View on site ↗
                        </a>
                        <a
                          href={`/admin/products?id=${r.id}`}
                          className="link"
                        >
                          Full editor ↗
                        </a>
                      </div>
                    </div>
                    <div className="row-status">
                      {r.dirty && <span className="tag tag-warn">Unsaved</span>}
                      {r.savedAt && !r.dirty && (
                        <span className="tag tag-ok">Saved</span>
                      )}
                      {r.error && (
                        <span className="tag tag-err" title={r.error}>
                          Error
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="row-body">
                    {/* Main image URL editor */}
                    <div className="field">
                      <label className="lbl">Main image URL</label>
                      <div className="url-row">
                        <input
                          className="input url-input"
                          placeholder="https://…jpg / .png / .webp — or upload below"
                          value={r.mainUrlDraft}
                          onChange={(e) => onMainUrlChange(p.id, e.target.value)}
                          onBlur={() => commitMainUrl(p.id)}
                        />
                        <label className="btn btn-ghost">
                          {r.uploading ? 'Uploading…' : 'Upload…'}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            disabled={r.uploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void onFileUpload(p.id, f, 'main');
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      {r.error && <div className="err-line">{r.error}</div>}
                    </div>

                    {/* Gallery */}
                    <div className="field">
                      <label className="lbl">
                        Gallery ({r.gallery.length}){' '}
                        <span className="sub-lbl">
                          — first image becomes the main image on save
                        </span>
                      </label>
                      <div className="gallery">
                        {r.gallery.map((url, i) => (
                          <div key={url + i} className="g-item">
                            <Thumb url={url} size={72} />
                            <div className="g-controls">
                              <button
                                className="ic-btn"
                                title="Move left"
                                disabled={i === 0}
                                onClick={() => moveGallery(p.id, i, i - 1)}
                              >
                                ‹
                              </button>
                              <button
                                className="ic-btn"
                                title="Move right"
                                disabled={i === r.gallery.length - 1}
                                onClick={() => moveGallery(p.id, i, i + 1)}
                              >
                                ›
                              </button>
                              <button
                                className="ic-btn ic-danger"
                                title="Remove"
                                onClick={() => removeGallery(p.id, url)}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="url-row" style={{ marginTop: 8 }}>
                        <input
                          className="input url-input"
                          placeholder="Paste new image URL and press Enter"
                          value={r.newUrl}
                          onChange={(e) => patchRow(p.id, { newUrl: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addGalleryUrl(p.id);
                            }
                          }}
                        />
                        <button className="btn btn-ghost" onClick={() => addGalleryUrl(p.id)}>
                          + Add URL
                        </button>
                        <label className="btn btn-ghost">
                          {r.uploading ? 'Uploading…' : '+ Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            disabled={r.uploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void onFileUpload(p.id, f, 'gallery');
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="row-foot">
                    <button
                      className="btn btn-primary"
                      disabled={!r.dirty || r.saving}
                      onClick={() => saveRow(p.id)}
                    >
                      {r.saving ? 'Saving…' : 'Save this product'}
                    </button>
                    <button
                      className="btn btn-ghost"
                      disabled={!r.dirty || r.saving}
                      onClick={() => revertRow(p.id)}
                    >
                      Revert
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <style jsx>{`
          .media-wrap {
            max-width: 1200px;
            margin: 0 auto;
            padding-bottom: 120px;
          }
          .topbar {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
          }
          @media (min-width: 900px) {
            .topbar {
              flex-direction: row;
              align-items: flex-end;
              justify-content: space-between;
            }
          }
          .title {
            font-size: 26px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 6px;
            letter-spacing: -0.3px;
          }
          .sub {
            color: #64748b;
            font-size: 14px;
            max-width: 640px;
            line-height: 1.55;
            margin: 0;
          }
          .sub code {
            background: #f1f5f9;
            border-radius: 4px;
            padding: 1px 6px;
            font-size: 12px;
          }
          .toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
          }
          .input {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 9px 12px;
            font-size: 14px;
            background: #fff;
            color: #0f172a;
            min-width: 200px;
          }
          .input:focus {
            outline: none;
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
          }
          .chk {
            display: inline-flex;
            gap: 6px;
            align-items: center;
            color: #475569;
            font-size: 13px;
          }
          .btn {
            border: 0;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            padding: 9px 14px;
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.2s, background 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .btn-primary {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
          }
          .btn-primary:not(:disabled):hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
          }
          .btn-ghost {
            background: #fff;
            color: #334155;
            border: 1px solid #e2e8f0;
          }
          .btn-ghost:not(:disabled):hover {
            background: #f8fafc;
          }
          .global-status {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #065f46;
            padding: 10px 14px;
            border-radius: 8px;
            margin-bottom: 16px;
            font-size: 13px;
          }
          .loading,
          .empty {
            padding: 60px 20px;
            text-align: center;
            color: #94a3b8;
            font-size: 14px;
            background: #fff;
            border-radius: 12px;
            border: 1px dashed #e2e8f0;
          }
          .rows {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .row {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 18px;
            transition: border-color 0.15s;
          }
          .row-dirty {
            border-color: #fbbf24;
            box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.12);
          }
          .row-head {
            display: flex;
            gap: 16px;
            align-items: center;
            margin-bottom: 14px;
          }
          .meta {
            flex: 1;
            min-width: 0;
          }
          .prod-title {
            font-size: 15px;
            font-weight: 600;
            color: #0f172a;
            display: flex;
            gap: 8px;
            align-items: baseline;
          }
          .prod-id {
            font-size: 12px;
            color: #94a3b8;
            font-weight: 400;
          }
          .prod-handle {
            font-size: 12.5px;
            color: #64748b;
            margin-top: 2px;
            font-family: ui-monospace, SFMono-Regular, monospace;
          }
          .prod-actions {
            margin-top: 6px;
            display: flex;
            gap: 12px;
          }
          .link {
            font-size: 12px;
            color: #059669;
            text-decoration: none;
          }
          .link:hover {
            text-decoration: underline;
          }
          .row-status {
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: flex-end;
          }
          .tag {
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 999px;
            font-weight: 600;
          }
          .tag-warn {
            background: #fef3c7;
            color: #92400e;
          }
          .tag-ok {
            background: #d1fae5;
            color: #065f46;
          }
          .tag-err {
            background: #fee2e2;
            color: #991b1b;
          }
          .row-body {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .lbl {
            font-size: 12.5px;
            font-weight: 600;
            color: #334155;
            letter-spacing: 0.2px;
          }
          .sub-lbl {
            color: #94a3b8;
            font-weight: 400;
          }
          .url-row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .url-input {
            flex: 1;
            min-width: 240px;
            font-family: ui-monospace, SFMono-Regular, monospace;
            font-size: 13px;
          }
          .err-line {
            color: #b91c1c;
            font-size: 12px;
          }
          .gallery {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .g-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .g-controls {
            display: flex;
            gap: 2px;
          }
          .ic-btn {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            background: #fff;
            color: #475569;
            font-size: 14px;
            line-height: 1;
            cursor: pointer;
          }
          .ic-btn:disabled {
            opacity: 0.35;
            cursor: not-allowed;
          }
          .ic-btn:not(:disabled):hover {
            background: #f1f5f9;
          }
          .ic-danger {
            color: #ef4444;
          }
          .ic-danger:not(:disabled):hover {
            background: #fef2f2;
            border-color: #fecaca;
          }
          .row-foot {
            margin-top: 14px;
            display: flex;
            gap: 8px;
            border-top: 1px solid #f1f5f9;
            padding-top: 14px;
          }
          .thumb {
            border-radius: 8px;
            overflow: hidden;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #e2e8f0;
            flex-shrink: 0;
          }
          .thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .thumb-empty {
            color: #cbd5e1;
            font-size: 20px;
          }
          .broken {
            color: #ef4444;
            font-size: 10px;
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
