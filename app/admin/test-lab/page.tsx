'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

// ── Types ──────────────────────────────────────────────────────────────────

interface TestProduct {
  id: number;
  handle: string;
  title: string;
  price: number;
  status: number;
  stock_quantity: number;
  category: string;
}

interface TestOrder {
  id: number;
  order_id: string;
  status: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  source: string;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  testUrl?: string;
  apiAction?: string;
  actionLabel?: string;
  notes?: string;
  warning?: string;
}

// ── Static test scenarios ──────────────────────────────────────────────────

const SCENARIOS: TestScenario[] = [
  {
    id: 'shop_browse',
    name: 'Browse Shop',
    description: 'Verify test products appear in the shop when activated.',
    icon: '',
    category: 'storefront',
    testUrl: '/shop',
    notes: 'Activate test products first, then open the shop. They should appear.',
  },
  {
    id: 'product_page',
    name: 'Product Detail Page',
    description: 'Open a test product page and check images, reviews, Add to Cart button.',
    icon: '',
    category: 'storefront',
    testUrl: '/product/vyra-test-product-a',
    notes: 'Checks product page rendering, price display, MRP vs sale price badge.',
  },
  {
    id: 'add_to_cart',
    name: 'Add to Cart (Guest)',
    description: 'Add a test product to cart without logging in. Checks anonymous cart.',
    icon: '',
    category: 'cart',
    testUrl: '/product/vyra-test-product-a',
    notes: 'Click "Add to Cart". Check cart icon count updates and cart drawer shows the item.',
  },
  {
    id: 'cart_qty',
    name: 'Cart Quantity Update',
    description: 'Update quantity and remove items from cart.',
    icon: '',
    category: 'cart',
    testUrl: '/cart',
    notes: 'Increase, decrease quantity. Hit remove. Cart total should update.',
  },
  {
    id: 'checkout_online',
    name: 'Online Payment Checkout',
    description: 'Go through the full checkout with Easebuzz. Use UPI sandbox.',
    icon: '',
    category: 'payment',
    testUrl: '/cart',
    notes: 'Add test product → Checkout → Pay ₹1 with UPI test mode. Verify order appears in admin.',
    warning: 'This creates a real ₹1 payment. Use UPI sandbox or test card if available.',
  },
  {
    id: 'checkout_cod',
    name: 'COD Checkout',
    description: 'Place a Cash on Delivery order (₹1 advance expected).',
    icon: '',
    category: 'payment',
    testUrl: '/cart',
    notes: 'Add test product → Checkout → Select COD → Pay ₹1 advance. Verify order in admin.',
  },
  {
    id: 'create_test_order_online',
    name: 'Create Dummy Online Order',
    description: 'Creates a fake "Payment Received" order instantly — no real payment.',
    icon: '',
    category: 'payment',
    apiAction: 'create_order_online',
    actionLabel: 'Create Test Order (Online)',
    notes: 'Use to test admin order view, WhatsApp notifications, and shipping without real payment.',
  },
  {
    id: 'create_test_order_cod',
    name: 'Create Dummy COD Order',
    description: 'Creates a fake COD order instantly — no real money involved.',
    icon: '',
    category: 'payment',
    apiAction: 'create_order_cod',
    actionLabel: 'Create Test Order (COD)',
    notes: 'Use to test COD flow, admin status updates, and WhatsApp notifications.',
  },
  {
    id: 'wishlist',
    name: 'Wishlist',
    description: 'Add a test product to wishlist, remove it, verify it persists after reload.',
    icon: '',
    category: 'storefront',
    testUrl: '/product/vyra-test-product-b',
    notes: 'Must be logged in. Add to wishlist → go to /wishlist → verify item appears → remove.',
  },
  {
    id: 'coupon',
    name: 'Coupon Code',
    description: 'Apply a coupon at checkout. Verify discount applies correctly.',
    icon: '',
    category: 'payment',
    testUrl: '/cart',
    notes: 'Create a test coupon in Admin → Coupons first. Then apply at checkout.',
  },
  {
    id: 'whatsapp_menu',
    name: 'WhatsApp Menu',
    description: 'Send "hi" to the business WhatsApp. Main menu should appear.',
    icon: '',
    category: 'whatsapp',
    notes: 'Open WhatsApp and send "hi". Should receive the main menu with categories.',
  },
  {
    id: 'whatsapp_catalog',
    name: 'WhatsApp Catalog Order',
    description: 'Browse products via WhatsApp bot and place a ₹1 test order.',
    icon: '',
    category: 'whatsapp',
    notes: 'Use the WhatsApp bot to browse, add to cart, enter address, and pay. Verify in admin orders.',
    warning: 'Test products must be active for the bot to find them.',
  },
  {
    id: 'whatsapp_tracking',
    name: 'WhatsApp Order Tracking',
    description: 'Send "Track Order" to WhatsApp. Should show recent orders with tracking link.',
    icon: '',
    category: 'whatsapp',
    notes: 'Tapping "Track on iCarry ↗" should open iCarry tracking in browser.',
  },
  {
    id: 'admin_orders',
    name: 'Admin Orders View',
    description: 'Verify test orders appear in the Admin → Orders tab with correct data.',
    icon: '',
    category: 'admin',
    testUrl: '/admin/orders',
    notes: 'Filter by source or search by TEST- prefix. Check all columns display correctly.',
  },
  {
    id: 'admin_price_update',
    name: 'Admin Price Update',
    description: 'Update test product price in admin. Verify it reflects in shop without errors.',
    icon: '',
    category: 'admin',
    testUrl: '/admin/products',
    notes: 'Edit "Test Product A", change price to 50, save. No bigint errors should appear.',
  },
  {
    id: 'admin_status_toggle',
    name: 'Admin Product Status Toggle',
    description: 'Set a test product to Draft and verify it disappears from shop.',
    icon: '',
    category: 'admin',
    testUrl: '/admin/products',
    notes: 'Set status = Draft on Test Product A → visit /shop → confirm it\'s gone.',
  },
  {
    id: 'icarry_shipment',
    name: 'iCarry Shipment Creation',
    description: 'Create a test order then manually trigger shipment sync to test iCarry API.',
    icon: '',
    category: 'shipping',
    testUrl: '/admin/orders',
    notes: 'Find a test order → click "Sync Shipment". Check that AWB is assigned or error is logged.',
    warning: 'This calls the real iCarry API. Use sparingly.',
  },
  {
    id: 'notifications',
    name: 'WhatsApp Notification Trigger',
    description: 'Trigger an order notification to a test phone number.',
    icon: '',
    category: 'whatsapp',
    testUrl: '/admin/whatsapp',
    notes: 'Go to Admin → WhatsApp → use broadcast or direct message to send to your own number.',
  },
];

const CATEGORIES = [
  { id: 'all', label: '🔍 All', color: '#6b7280' },
  { id: 'storefront', label: '🛍️ Storefront', color: '#16a34a' },
  { id: 'cart', label: '🛒 Cart', color: '#2563eb' },
  { id: 'payment', label: '💳 Payment', color: '#9333ea' },
  { id: 'whatsapp', label: '💬 WhatsApp', color: '#25d366' },
  { id: 'admin', label: '🗂️ Admin', color: '#d97706' },
  { id: 'shipping', label: '🚚 Shipping', color: '#0891b2' },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function TestLabPage() {
  const [testProducts, setTestProducts] = useState<TestProduct[]>([]);
  const [testOrders, setTestOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ type: 'success' | 'error' | 'info'; text: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [testModeActive, setTestModeActive] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const addMessage = (type: 'success' | 'error' | 'info', text: string) => {
    const msg = { type, text };
    setMessages((prev) => [msg, ...prev].slice(0, 8));
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/test-lab');
      const data = await res.json();
      if (data.success) {
        setTestProducts(data.test_products || []);
        setTestOrders(data.test_orders || []);
        const anyActive = (data.test_products || []).some((p: TestProduct) => p.status === 1);
        setTestModeActive(anyActive);
      }
    } catch {
      addMessage('error', 'Failed to load test lab status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const doAction = async (action: string, extra: Record<string, any> = {}, label?: string) => {
    setActionLoading(action);
    try {
      const res = await fetch('/api/admin/test-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        addMessage('success', data.message || (label ? `${label} done.` : 'Done.'));
        if (Array.isArray(data.results)) {
          data.results.forEach((r: string) => addMessage('info', r));
        }
        await fetchStatus();
      } else {
        addMessage('error', data.error || 'Action failed');
      }
    } catch {
      addMessage('error', 'Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAll = async (active: boolean) => {
    await doAction('toggle', { active }, active ? 'Test Mode ON' : 'Test Mode OFF');
  };

  const handleToggleOne = async (productId: number, active: boolean) => {
    await doAction('toggle_one', { product_id: productId, active });
  };

  const handleScenarioAction = async (scenario: TestScenario) => {
    if (!scenario.apiAction) return;
    if (scenario.apiAction === 'create_order_online') {
      await doAction('create_order', { payment_method: 'online' }, 'Test order (online)');
    } else if (scenario.apiAction === 'create_order_cod') {
      await doAction('create_order', { payment_method: 'cod' }, 'Test order (COD)');
    }
  };

  const filteredScenarios = activeCategory === 'all'
    ? SCENARIOS
    : SCENARIOS.filter((s) => s.category === activeCategory);

  const hasTestProducts = testProducts.length > 0;
  const activeProductCount = testProducts.filter((p) => p.status === 1).length;

  return (
    <AdminLayoutWrapper pageTitle="Test Lab">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111', margin: 0 }}>
            Test Lab
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.3rem', fontSize: '0.95rem' }}>
            Test any feature safely without touching live production products or prices.
            Test products are <strong>always hidden from customers</strong> unless you explicitly activate them.
          </p>
        </div>

        {/* ── Messages ───────────────────────────────────────────────────── */}
        {messages.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                padding: '0.6rem 1rem',
                marginBottom: '0.4rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                background: m.type === 'success' ? '#dcfce7' : m.type === 'error' ? '#fee2e2' : '#dbeafe',
                color: m.type === 'success' ? '#15803d' : m.type === 'error' ? '#b91c1c' : '#1d4ed8',
                borderLeft: `4px solid ${m.type === 'success' ? '#16a34a' : m.type === 'error' ? '#dc2626' : '#2563eb'}`,
              }}>
                {m.text}
              </div>
            ))}
          </div>
        )}

        {/* ── Test Mode Banner ───────────────────────────────────────────── */}
        <div style={{
          background: testModeActive ? '#fef9c3' : '#f9fafb',
          border: `2px solid ${testModeActive ? '#eab308' : '#e5e7eb'}`,
          borderRadius: 12,
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: testModeActive ? '#854d0e' : '#374151' }}>
              {testModeActive
                ? `Test Mode is ACTIVE — ${activeProductCount} product(s) visible in shop`
                : 'Test Mode is OFF — customers see nothing'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
              {testModeActive
                ? 'Test products at ₹1 are live. Turn off when done!'
                : 'Turn on to make ₹1 test products appear in the shop for testing.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!hasTestProducts ? (
              <button
                onClick={() => doAction('seed', {}, 'Seed test products')}
                disabled={actionLoading === 'seed'}
                style={{
                  background: '#2563eb', color: '#fff', border: 'none',
                  padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.875rem',
                  opacity: actionLoading ? 0.6 : 1,
                }}
              >
                {actionLoading === 'seed' ? 'Seeding…' : 'Seed Test Products'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleToggleAll(!testModeActive)}
                  disabled={!!actionLoading}
                  style={{
                    background: testModeActive ? '#dc2626' : '#16a34a',
                    color: '#fff', border: 'none',
                    padding: '0.5rem 1.25rem', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.875rem',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading === 'toggle'
                    ? 'Updating…'
                    : testModeActive ? 'Turn Off Test Mode' : 'Turn On Test Mode'}
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

          {/* ── Test Products Panel ───────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>📦 Test Products</h2>
              {!hasTestProducts ? (
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Not seeded yet</span>
              ) : (
                <button
                  onClick={() => doAction('seed', {}, 'Re-seed')}
                  disabled={!!actionLoading}
                  style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '0.2rem 0.5rem', cursor: 'pointer' }}
                >
                  Re-seed
                </button>
              )}
            </div>
            {loading ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading…</div>
            ) : !hasTestProducts ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem', padding: '1rem 0' }}>
                No test products yet. Click "Seed Test Products" above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {testProducts.map((p) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: p.status === 1 ? '#f0fdf4' : '#f9fafb',
                    border: `1px solid ${p.status === 1 ? '#bbf7d0' : '#e5e7eb'}`,
                    borderRadius: 8,
                  }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111' }}>{p.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>₹{p.price} • ID: {p.id}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700,
                        color: p.status === 1 ? '#16a34a' : '#9ca3af',
                        background: p.status === 1 ? '#dcfce7' : '#f3f4f6',
                        padding: '0.15rem 0.5rem', borderRadius: 4,
                      }}>
                        {p.status === 1 ? 'LIVE' : 'HIDDEN'}
                      </span>
                      <button
                        onClick={() => handleToggleOne(p.id, p.status !== 1)}
                        disabled={!!actionLoading}
                        style={{
                          fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                          border: '1px solid #d1d5db', borderRadius: 6,
                          background: '#fff', cursor: 'pointer',
                        }}
                      >
                        {p.status === 1 ? 'Hide' : 'Show'}
                      </button>
                      <a
                        href={`/product/${p.handle}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.75rem', color: '#2563eb' }}
                      >
                        Open ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Test Orders Panel ─────────────────────────────────────────── */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>🧾 Test Orders</h2>
              {testOrders.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Delete ALL test orders? This cannot be undone.')) {
                      doAction('cleanup_orders', {}, 'Cleanup orders');
                    }
                  }}
                  disabled={!!actionLoading}
                  style={{
                    fontSize: '0.75rem', color: '#dc2626', background: 'none',
                    border: '1px solid #fca5a5', borderRadius: 6, padding: '0.2rem 0.5rem', cursor: 'pointer',
                  }}
                >
                  🗑️ Delete all test orders
                </button>
              )}
            </div>
            {loading ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading…</div>
            ) : testOrders.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem', padding: '1rem 0' }}>
                No test orders yet. Create one from a scenario below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 260, overflowY: 'auto' }}>
                {testOrders.map((o) => (
                  <div key={o.id} style={{
                    padding: '0.5rem 0.75rem',
                    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, fontFamily: 'monospace', color: '#111' }}>{o.order_id}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                        ₹{o.total_amount} • {o.payment_method?.toUpperCase()} • {new Date(o.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <a
                      href={`/admin/orders?search=${o.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.75rem', color: '#2563eb' }}
                    >
                      View ↗
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Scenario Checklist ─────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>✅ Feature Test Checklist</h2>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{filteredScenarios.length} scenarios</span>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: 20,
                  border: activeCategory === cat.id ? `2px solid ${cat.color}` : '1px solid #e5e7eb',
                  background: activeCategory === cat.id ? `${cat.color}15` : '#fff',
                  color: activeCategory === cat.id ? cat.color : '#374151',
                  fontWeight: activeCategory === cat.id ? 700 : 400,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Scenario Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {filteredScenarios.map((scenario) => {
              const isExpanded = expandedScenario === scenario.id;
              const catConfig = CATEGORIES.find((c) => c.id === scenario.category);
              return (
                <div
                  key={scenario.id}
                  style={{
                    border: `1px solid ${isExpanded ? (catConfig?.color || '#e5e7eb') : '#e5e7eb'}`,
                    borderRadius: 10,
                    padding: '0.9rem',
                    background: isExpanded ? `${catConfig?.color || '#6b7280'}08` : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem' }}>{scenario.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111' }}>{scenario.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>{scenario.description}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: catConfig?.color || '#6b7280', flexShrink: 0 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div
                      style={{ marginTop: '0.75rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {scenario.notes && (
                        <div style={{
                          fontSize: '0.8rem', color: '#374151',
                          background: '#f0f9ff', border: '1px solid #bae6fd',
                          borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.5rem',
                        }}>
                          📋 {scenario.notes}
                        </div>
                      )}
                      {scenario.warning && (
                        <div style={{
                          fontSize: '0.8rem', color: '#92400e',
                          background: '#fff7ed', border: '1px solid #fed7aa',
                          borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.5rem',
                        }}>
                          ⚠️ {scenario.warning}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {scenario.testUrl && (
                          <a
                            href={scenario.testUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: '#2563eb', color: '#fff',
                              padding: '0.4rem 0.85rem', borderRadius: 7,
                              fontSize: '0.8rem', fontWeight: 600,
                              textDecoration: 'none', display: 'inline-block',
                            }}
                          >
                            Open Page ↗
                          </a>
                        )}
                        {scenario.apiAction && (
                          <button
                            onClick={() => handleScenarioAction(scenario)}
                            disabled={!!actionLoading}
                            style={{
                              background: '#7c3aed', color: '#fff',
                              padding: '0.4rem 0.85rem', borderRadius: 7,
                              fontSize: '0.8rem', fontWeight: 600,
                              border: 'none', cursor: 'pointer',
                              opacity: actionLoading ? 0.6 : 1,
                            }}
                          >
                            {actionLoading ? '⏳…' : scenario.actionLabel || 'Run'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Danger Zone ────────────────────────────────────────────────── */}
        <div style={{
          background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 12,
          padding: '1rem 1.25rem', marginTop: '1.5rem',
        }}>
          <div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: '0.5rem' }}>🔴 Danger Zone</div>
          <p style={{ fontSize: '0.8rem', color: '#7f1d1d', margin: '0 0 0.75rem' }}>
            These actions are irreversible. Use only when cleaning up after a test cycle.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (confirm('Delete ALL test orders? Cannot be undone.')) {
                  doAction('cleanup_orders', {}, 'Cleanup orders');
                }
              }}
              disabled={!!actionLoading}
              style={{ background: '#fff', border: '1px solid #dc2626', color: '#dc2626', padding: '0.4rem 0.9rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              🗑️ Delete All Test Orders
            </button>
            <button
              onClick={() => {
                if (confirm('This will DELETE all test products and test orders from the database. Are you absolutely sure?')) {
                  doAction('cleanup_all', {}, 'Full cleanup');
                }
              }}
              disabled={!!actionLoading}
              style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '0.4rem 0.9rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
            >
              💣 Full Cleanup (Products + Orders)
            </button>
          </div>
        </div>

      </div>
    </AdminLayoutWrapper>
  );
}
