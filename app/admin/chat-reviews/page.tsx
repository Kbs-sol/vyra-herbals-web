'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

interface ChatReview {
  id?: number;
  image_url: string;
  platform: 'whatsapp' | 'instagram';
  caption: string;
  customer_label: string;
  sort_order: number;
  status: number;
}

const EMPTY: ChatReview = {
  image_url: '',
  platform: 'whatsapp',
  caption: '',
  customer_label: '',
  sort_order: 0,
  status: 1,
};

export default function ChatReviewsPage() {
  const [items, setItems] = useState<ChatReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ChatReview | null>(null);
  const [form, setForm] = useState<ChatReview>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/chat-reviews?limit=100');
      const data = await res.json();
      if (data.success) setItems(data.data || []);
      else setError(data.error || 'Failed to load');
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, sort_order: items.length ? Math.max(...items.map((i) => i.sort_order || 0)) + 1 : 0 });
    setFile(null);
    setShowModal(true);
  };

  const openEdit = (item: ChatReview) => {
    setEditing(item);
    setForm({ ...EMPTY, ...item, caption: item.caption || '', customer_label: item.customer_label || '' });
    setFile(null);
    setShowModal(true);
  };

  const uploadFile = async (f: File) => {
    const fd = new FormData();
    fd.append('file', f);
    fd.append('handle', 'chat-reviews');
    const res = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');
    return (data.publicUrl || data.signedUrl) as string;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let url = form.image_url;
      if (file) url = await uploadFile(file);
      if (!url) throw new Error('Please choose a screenshot image.');
      const payload = { ...form, image_url: url };
      const res = await fetch('/api/admin/chat-reviews', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setShowModal(false);
      load();
    } catch (err: any) {
      alert(err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (item: ChatReview, changes: Partial<ChatReview>) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...changes } : i)));
    await fetch('/api/admin/chat-reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, ...changes }),
    });
  };

  const remove = async (item: ChatReview) => {
    if (!confirm('Delete this chat screenshot?')) return;
    const res = await fetch(`/api/admin/chat-reviews?id=${item.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) load();
    else alert(data.error || 'Delete failed');
  };

  const preview = file ? URL.createObjectURL(file) : form.image_url;

  return (
    <AdminLayoutWrapper pageTitle="Chat Reviews (WhatsApp / Instagram)">
      <div className="cr-page">
        <div className="cr-head">
          <p>
            Real customer chat screenshots shown on the homepage ({items.filter((i) => i.status === 1).length} visible of{' '}
            {items.length}). Blur phone numbers before uploading. Lower sort number shows first.
          </p>
          <button className="cr-add" onClick={openAdd}>
            + Add screenshot
          </button>
        </div>

        {error && <div className="cr-error">{error}</div>}

        {loading ? (
          <div className="cr-empty">Loading...</div>
        ) : items.length === 0 ? (
          <div className="cr-empty">
            No screenshots yet. The homepage section stays hidden until you add one.
            <button className="cr-add" onClick={openAdd}>
              Upload the first screenshot
            </button>
          </div>
        ) : (
          <div className="cr-grid">
            {items.map((item) => (
              <div key={item.id} className="cr-card">
                <div className="cr-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.caption || 'Chat screenshot'} />
                  <span className={`cr-badge ${item.platform}`}>{item.platform}</span>
                </div>
                <div className="cr-body">
                  <strong>{item.customer_label || 'Customer'}</strong>
                  <span>{item.caption || 'No caption'}</span>
                  <div className="cr-row">
                    <label>
                      Order
                      <input
                        type="number"
                        value={item.sort_order}
                        onChange={(e) => setItems((p) => p.map((i) => (i.id === item.id ? { ...i, sort_order: Number(e.target.value) } : i)))}
                        onBlur={(e) => patch(item, { sort_order: Number(e.target.value) })}
                      />
                    </label>
                    <label className="cr-switch">
                      <input type="checkbox" checked={item.status === 1} onChange={() => patch(item, { status: item.status === 1 ? 0 : 1 })} />
                      {item.status === 1 ? 'Visible' : 'Hidden'}
                    </label>
                  </div>
                  <div className="cr-actions">
                    <button onClick={() => openEdit(item)}>Edit</button>
                    <button className="danger" onClick={() => remove(item)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="cr-overlay" onClick={() => setShowModal(false)}>
            <form className="cr-modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
              <h2>{editing ? 'Edit screenshot' : 'Add screenshot'}</h2>

              <label>
                Screenshot image *
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="cr-preview" src={preview} alt="preview" />
              )}

              <label>
                Platform
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as ChatReview['platform'] })}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                </select>
              </label>
              <label>
                Customer label (optional, e.g. &quot;Priya, Pune&quot;)
                <input value={form.customer_label} maxLength={80} onChange={(e) => setForm({ ...form, customer_label: e.target.value })} />
              </label>
              <label>
                Caption (optional, e.g. &quot;Hair fall reduced in 6 weeks&quot;)
                <input value={form.caption} maxLength={300} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
              </label>
              <div className="cr-two">
                <label>
                  Sort order
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </label>
                <label>
                  Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
                    <option value={1}>Visible</option>
                    <option value={0}>Hidden</option>
                  </select>
                </label>
              </div>

              <div className="cr-foot">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        <style jsx>{`
          .cr-page { max-width: 1400px; margin: 0 auto; }
          .cr-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
          .cr-head p { color: #6b7280; font-size: 14px; margin: 0; max-width: 640px; }
          .cr-add { padding: 11px 18px; background: #1b3b2b; color: #fff; border: 0; border-radius: 10px; font-weight: 600; cursor: pointer; }
          .cr-error { background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; }
          .cr-empty { display: flex; flex-direction: column; gap: 14px; align-items: center; padding: 56px 20px; background: #fff; border-radius: 16px; color: #6b7280; }
          .cr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
          .cr-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); display: flex; flex-direction: column; }
          .cr-thumb { position: relative; background: #f3f4f6; aspect-ratio: 3 / 4; overflow: hidden; }
          .cr-thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
          .cr-badge { position: absolute; top: 8px; left: 8px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: capitalize; color: #fff; }
          .cr-badge.whatsapp { background: #25d366; }
          .cr-badge.instagram { background: #c13584; }
          .cr-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
          .cr-body span { color: #6b7280; }
          .cr-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 6px; }
          .cr-row label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #374151; }
          .cr-row input[type='number'] { width: 56px; padding: 4px 6px; border: 1px solid #d1d5db; border-radius: 6px; }
          .cr-actions { display: flex; gap: 8px; margin-top: 6px; }
          .cr-actions button { flex: 1; padding: 7px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-size: 13px; }
          .cr-actions .danger { color: #dc2626; border-color: #fecaca; }
          .cr-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; }
          .cr-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 520px; max-height: 92vh; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 14px; }
          .cr-modal h2 { margin: 0; font-size: 20px; }
          .cr-modal label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #374151; }
          .cr-modal input:not([type='file']), .cr-modal select { padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
          .cr-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .cr-preview { max-height: 240px; width: auto; align-self: flex-start; border-radius: 10px; border: 1px solid #e5e7eb; }
          .cr-foot { display: flex; justify-content: flex-end; gap: 10px; padding-top: 8px; border-top: 1px solid #f3f4f6; }
          .cr-foot button { padding: 10px 18px; border-radius: 10px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }
          .cr-foot .primary { background: #1b3b2b; color: #fff; border-color: #1b3b2b; }
          .cr-foot .primary:disabled { opacity: .6; }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
