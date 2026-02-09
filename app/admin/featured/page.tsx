'use client';

import React, { useEffect, useState } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Product } from '@/types';

export default function FeaturedProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [featuredSlots, setFeaturedSlots] = useState<{ [key: number]: string }>({
        1: '',
        2: '',
        3: '',
        4: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all products for the dropdowns
            const productsRes = await fetch('/api/admin/products?limit=1000'); // Assuming this endpoint exists and supports no pagination or high limit
            const productsData = await productsRes.json();

            if (productsData.success) {
                setProducts(productsData.data || []);
            }

            // 2. Fetch current featured selection
            const featuredRes = await fetch('/api/featured');
            const featuredData = await featuredRes.json();

            if (featuredData.success && Array.isArray(featuredData.data)) {
                const slots: { [key: number]: string } = {};
                featuredData.data.forEach((item: any) => {
                    // We store product ID as string in state for select inputs
                    if (item.product_id) slots[item.position] = item.product_id.toString();
                });
                setFeaturedSlots(prev => ({ ...prev, ...slots }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSlotChange = (position: number, productId: string) => {
        setFeaturedSlots(prev => ({
            ...prev,
            [position]: productId
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Convert state to API format
            const items = Object.entries(featuredSlots).map(([pos, prodId]) => ({
                position: parseInt(pos),
                product_id: prodId ? parseInt(prodId) : null
            }));

            const res = await fetch('/api/featured', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });

            const data = await res.json();
            if (data.success) {
                alert('Featured products updated successfully!');
            } else {
                alert('Failed to save: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving featured products:', error);
            alert('An error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayoutWrapper pageTitle="Best Sellers Management">
            <div className="featured-page">
                <div className="page-header">
                    <div className="header-info">
                        <p className="subtitle">Manage products in the "Best Sellers" section manually</p>
                    </div>
                    <button
                        className="save-btn"
                        onClick={handleSave}
                        disabled={saving || loading}
                        style={{
                            backgroundColor: '#000',
                            color: '#fff',
                            padding: '10px 20px',
                            borderRadius: '5px',
                            border: 'none',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
                ) : (
                    <div className="slots-container" style={{ marginTop: '20px', display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {[1, 2, 3, 4].map((position) => (
                            <div key={position} className="slot-card" style={{
                                background: '#fff',
                                padding: '20px',
                                borderRadius: '8px',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                border: '1px solid #eee'
                            }}>
                                <h3 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '600' }}>Position {position}</h3>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>Select Product</label>
                                    <select
                                        value={featuredSlots[position] || ''}
                                        onChange={(e) => handleSlotChange(position, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '5px',
                                            border: '1px solid #ddd',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="">-- Select Product --</option>
                                        {products.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.title} (ID: {product.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {featuredSlots[position] && (
                                    <div className="preview" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {(() => {
                                            const prod = products.find(p => p.id?.toString() === featuredSlots[position]);
                                            if (!prod) return null;
                                            const img = prod.image_url || (prod.images && prod.images[0]);
                                            return (
                                                <>
                                                    {img && <img src={img} alt={prod.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                                                    <span style={{ fontSize: '12px', fontWeight: '500' }}>{prod.title}</span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayoutWrapper>
    );
}
