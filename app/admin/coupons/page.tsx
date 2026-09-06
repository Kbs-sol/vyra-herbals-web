'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

type Coupon = {
    id: number;
    code: string;
    description: string | null;
    discount_type: 'percent' | 'flat';
    discount_value: number;
    min_order_amount: number | null;
    max_discount_amount: number | null;
    usage_limit: number | null;
    per_user_limit: number | null;
    used_count: number | null;
    starts_at: string | null;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
};

type FormState = {
    code: string;
    description: string;
    discount_type: 'percent' | 'flat';
    discount_value: string;
    min_order_amount: string;
    max_discount_amount: string;
    usage_limit: string;
    per_user_limit: string;
    starts_at: string;
    expires_at: string;
    is_active: boolean;
};

const blankForm: FormState = {
    code: '',
    description: '',
    discount_type: 'percent',
    discount_value: '',
    min_order_amount: '0',
    max_discount_amount: '',
    usage_limit: '',
    per_user_limit: '1',
    starts_at: '',
    expires_at: '',
    is_active: true,
};

const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
};

export default function AdminCouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [needsMigration, setNeedsMigration] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Coupon | null>(null);
    const [form, setForm] = useState<FormState>(blankForm);
    const [saving, setSaving] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ search, page: '1', limit: '100' });
            const res = await fetch(`/api/admin/coupons?${params}`);
            const data = await res.json();
            if (data.success) {
                setCoupons(data.data || []);
                setNeedsMigration(!!data.needsMigration);
            } else {
                setErrorMsg(data.error || 'Failed to load coupons');
            }
        } catch (e: any) {
            setErrorMsg(e.message || 'Failed to load coupons');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm(blankForm);
        setErrorMsg('');
        setShowModal(true);
    };

    const openEdit = (c: Coupon) => {
        setEditing(c);
        setForm({
            code: c.code,
            description: c.description || '',
            discount_type: c.discount_type,
            discount_value: String(c.discount_value),
            min_order_amount: String(c.min_order_amount ?? 0),
            max_discount_amount: c.max_discount_amount == null ? '' : String(c.max_discount_amount),
            usage_limit: c.usage_limit == null ? '' : String(c.usage_limit),
            per_user_limit: c.per_user_limit == null ? '' : String(c.per_user_limit),
            starts_at: toLocalInput(c.starts_at),
            expires_at: toLocalInput(c.expires_at),
            is_active: c.is_active,
        });
        setErrorMsg('');
        setShowModal(true);
    };

    const handleField = (field: keyof FormState, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg('');
        try {
            const payload: any = {
                code: form.code.trim(),
                description: form.description.trim() || null,
                discount_type: form.discount_type,
                discount_value: form.discount_value === '' ? null : Number(form.discount_value),
                min_order_amount: form.min_order_amount === '' ? 0 : Number(form.min_order_amount),
                max_discount_amount: form.max_discount_amount === '' ? null : Number(form.max_discount_amount),
                usage_limit: form.usage_limit === '' ? null : parseInt(form.usage_limit, 10),
                per_user_limit: form.per_user_limit === '' ? null : parseInt(form.per_user_limit, 10),
                starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
                is_active: form.is_active,
            };

            const url = editing ? `/api/admin/coupons/${editing.id}` : '/api/admin/coupons';
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to save coupon');
            }
            setShowModal(false);
            await fetchCoupons();
        } catch (e: any) {
            setErrorMsg(e.message || 'Failed to save coupon');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (deleteConfirmId == null) return;
        try {
            const res = await fetch(`/api/admin/coupons/${deleteConfirmId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Delete failed');
            setDeleteConfirmId(null);
            await fetchCoupons();
        } catch (e: any) {
            alert(e.message || 'Delete failed');
        }
    };

    const toggleActive = async (c: Coupon) => {
        try {
            const res = await fetch(`/api/admin/coupons/${c.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !c.is_active }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Update failed');
            await fetchCoupons();
        } catch (e: any) {
            alert(e.message || 'Update failed');
        }
    };

    return (
        <AdminLayoutWrapper pageTitle="Coupons">
            <div className="coupons-page">
                <div className="page-header">
                    <div>
                        <h2>Custom Coupons</h2>
                        <p>Create promo codes for events, festivals, and campaigns</p>
                    </div>
                    <button className="primary-btn" onClick={openCreate} disabled={needsMigration}>
                        + Create Coupon
                    </button>
                </div>

                {needsMigration && (
                    <div className="banner warning">
                        <strong>Database migration required.</strong>
                        <span>
                            Run <code>CUSTOM_COUPONS_SETUP.sql</code> in your Supabase SQL editor to enable
                            this feature.
                        </span>
                    </div>
                )}

                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search by code or description"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') fetchCoupons(); }}
                    />
                    <button onClick={fetchCoupons}>Search</button>
                </div>

                <div className="table-wrap">
                    {loading ? (
                        <div className="empty">Loading…</div>
                    ) : coupons.length === 0 ? (
                        <div className="empty">No coupons yet. Create your first one.</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Discount</th>
                                    <th>Min Order</th>
                                    <th>Validity</th>
                                    <th>Usage</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coupons.map(c => (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="code">{c.code}</div>
                                            {c.description && <div className="muted small">{c.description}</div>}
                                        </td>
                                        <td>
                                            {c.discount_type === 'percent'
                                                ? `${c.discount_value}%${c.max_discount_amount ? ` (max ₹${c.max_discount_amount})` : ''}`
                                                : `₹${c.discount_value}`}
                                        </td>
                                        <td>{c.min_order_amount ? `₹${c.min_order_amount}` : '—'}</td>
                                        <td className="small">
                                            <div>From: {formatDate(c.starts_at)}</div>
                                            <div>To: {formatDate(c.expires_at)}</div>
                                        </td>
                                        <td className="small">
                                            <div>{c.used_count ?? 0}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</div>
                                            <div className="muted">Per user: {c.per_user_limit ?? '∞'}</div>
                                        </td>
                                        <td>
                                            <button
                                                className={`status-pill ${c.is_active ? 'active' : 'inactive'}`}
                                                onClick={() => toggleActive(c)}
                                                title="Click to toggle"
                                            >
                                                {c.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="actions">
                                            <button onClick={() => openEdit(c)}>Edit</button>
                                            <button className="danger" onClick={() => setDeleteConfirmId(c.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {mounted && showModal && createPortal(
                    <div
                        onClick={() => !saving && setShowModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(15, 23, 42, 0.55)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            padding: '16px',
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#fff',
                                borderRadius: '16px',
                                width: '100%',
                                maxWidth: '640px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                            }}
                        >
                            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>{editing ? 'Edit Coupon' : 'Create Coupon'}</h3>
                                <button type="button" onClick={() => !saving && setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
                            </div>
                            <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {errorMsg && <div className="banner error">{errorMsg}</div>}
                                <div className="row">
                                    <div className="field">
                                        <label>Code *</label>
                                        <input
                                            type="text"
                                            value={form.code}
                                            onChange={(e) => handleField('code', e.target.value.toUpperCase())}
                                            placeholder="e.g. DIWALI25"
                                            required
                                            maxLength={50}
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Status</label>
                                        <label className="toggle-row">
                                            <input
                                                type="checkbox"
                                                checked={form.is_active}
                                                onChange={(e) => handleField('is_active', e.target.checked)}
                                            />
                                            <span>{form.is_active ? 'Active' : 'Inactive'}</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="field">
                                    <label>Description</label>
                                    <input
                                        type="text"
                                        value={form.description}
                                        onChange={(e) => handleField('description', e.target.value)}
                                        placeholder="Diwali special — 25% off all herbal products"
                                    />
                                </div>
                                <div className="row">
                                    <div className="field">
                                        <label>Discount Type *</label>
                                        <select
                                            value={form.discount_type}
                                            onChange={(e) => handleField('discount_type', e.target.value)}
                                        >
                                            <option value="percent">Percent (%)</option>
                                            <option value="flat">Flat (₹)</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label>Discount Value *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={form.discount_value}
                                            onChange={(e) => handleField('discount_value', e.target.value)}
                                            placeholder={form.discount_type === 'percent' ? 'e.g. 25' : 'e.g. 100'}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="field">
                                        <label>Min Order Amount (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.min_order_amount}
                                            onChange={(e) => handleField('min_order_amount', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    {form.discount_type === 'percent' && (
                                        <div className="field">
                                            <label>Max Discount Cap (₹) — optional</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={form.max_discount_amount}
                                                onChange={(e) => handleField('max_discount_amount', e.target.value)}
                                                placeholder="Leave blank for no cap"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="row">
                                    <div className="field">
                                        <label>Total Usage Limit — optional</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.usage_limit}
                                            onChange={(e) => handleField('usage_limit', e.target.value)}
                                            placeholder="Unlimited"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Per-User Limit — empty = unlimited</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.per_user_limit}
                                            onChange={(e) => handleField('per_user_limit', e.target.value)}
                                            placeholder="1"
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="field">
                                        <label>Starts At — optional</label>
                                        <input
                                            type="datetime-local"
                                            value={form.starts_at}
                                            onChange={(e) => handleField('starts_at', e.target.value)}
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Expires At — optional</label>
                                        <input
                                            type="datetime-local"
                                            value={form.expires_at}
                                            onChange={(e) => handleField('expires_at', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer" style={{ paddingTop: '12px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                                    <button type="button" className="secondary-btn" onClick={() => setShowModal(false)} disabled={saving}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="primary-btn" disabled={saving}>
                                        {saving ? 'Saving…' : editing ? 'Update Coupon' : 'Create Coupon'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {mounted && deleteConfirmId != null && createPortal(
                    <div
                        onClick={() => setDeleteConfirmId(null)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(15, 23, 42, 0.55)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            padding: '16px',
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#fff',
                                borderRadius: '16px',
                                width: '100%',
                                maxWidth: '420px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                            }}
                        >
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Delete Coupon?</h3>
                            </div>
                            <div style={{ padding: '20px 24px' }}>
                                <p style={{ margin: 0, color: '#374151' }}>This action cannot be undone. The coupon and its usage history will be permanently removed.</p>
                            </div>
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="secondary-btn" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                                <button type="button" className="danger-btn" onClick={confirmDelete}>Delete</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                <style jsx>{`
                    .coupons-page { max-width: 1200px; margin: 0 auto; }
                    .page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
                    .page-header h2 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 4px; }
                    .page-header p { color: #6b7280; margin: 0; font-size: 14px; }
                    .primary-btn { padding: 10px 20px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
                    .primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(16,185,129,.25); }
                    .primary-btn:disabled { opacity: .5; cursor: not-allowed; }
                    .secondary-btn { padding: 10px 18px; background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; border-radius: 10px; font-weight: 500; cursor: pointer; }
                    .danger-btn { padding: 10px 18px; background: #ef4444; color: #fff; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
                    .banner { padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; }
                    .banner.warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; display: flex; flex-direction: column; gap: 4px; }
                    .banner.warning code { background: #fef3c7; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
                    .banner.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
                    .search-bar { display: flex; gap: 8px; margin-bottom: 16px; }
                    .search-bar input { flex: 1; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 10px; outline: none; font-size: 14px; }
                    .search-bar input:focus { border-color: #10b981; }
                    .search-bar button { padding: 10px 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; font-weight: 500; }
                    .table-wrap { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); overflow: hidden; }
                    table { width: 100%; border-collapse: collapse; }
                    th { text-align: left; padding: 14px 16px; background: #f9fafb; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; }
                    td { padding: 14px 16px; border-top: 1px solid #f3f4f6; vertical-align: top; font-size: 14px; color: #1f2937; }
                    .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; color: #059669; }
                    .small { font-size: 12px; }
                    .muted { color: #9ca3af; }
                    .empty { padding: 60px; text-align: center; color: #9ca3af; }
                    .actions { display: flex; gap: 6px; }
                    .actions button { padding: 6px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; }
                    .actions button.danger { color: #ef4444; border-color: #fecaca; }
                    .status-pill { padding: 4px 12px; border-radius: 999px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; }
                    .status-pill.active { background: #d1fae5; color: #065f46; }
                    .status-pill.inactive { background: #fee2e2; color: #991b1b; }
                    .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .55); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
                    .modal { background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; }
                    .modal.small { max-width: 420px; }
                    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; }
                    .modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }
                    .modal-header .close { background: none; border: none; font-size: 24px; cursor: pointer; color: #9ca3af; }
                    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
                    .modal-footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 10px; }
                    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
                    .field { display: flex; flex-direction: column; gap: 6px; }
                    .field label { font-size: 13px; font-weight: 500; color: #374151; }
                    .field input, .field select { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; outline: none; font-size: 14px; background: #fff; }
                    .field input:focus, .field select:focus { border-color: #10b981; }
                    .toggle-row { display: flex; align-items: center; gap: 8px; padding: 10px 0; }
                    @media (max-width: 768px) {
                        .row { grid-template-columns: 1fr; }
                        table { font-size: 13px; }
                        th, td { padding: 10px; }
                    }
                `}</style>
            </div>
        </AdminLayoutWrapper>
    );
}
