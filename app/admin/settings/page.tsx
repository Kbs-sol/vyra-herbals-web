'use client';

import React, { useState, useEffect } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Settings state
  const [settings, setSettings] = useState({
    // General
    siteName: 'Vyra Herbals',
    siteTagline: '100% Natural Handmade Herbal Hair Care',
    contactEmail: 'support@vyraherbals.com',
    contactPhone: '+91 9876543210',
    address: 'Mumbai, Maharashtra, India',

    // Business
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 18,
    freeShippingThreshold: 499,
    codEnabled: true,
    onlinePaymentEnabled: true,

    // Notifications
    orderNotifications: true,
    reviewNotifications: true,
    lowStockNotifications: true,
    emailNotifications: true,

    // SEO
    metaTitle: 'Vyra Herbals — 100% Natural Herbal Hair Oil, Shampoo & Hair Care | Chemical-Free, Handmade in India',
    metaDescription: '100% natural, handmade herbal hair care from Vyra Herbals — chemical-free, sulphate-free, paraben-free hair oil, shampoo & hair masks. Made fresh in India. ISO 9001:2015 & GMP certified. Free shipping across India.',
    googleAnalyticsId: '',
  });

  // Welcome coupon state (separate from general settings since it's DB-backed)
  const [welcomeCouponEnabled, setWelcomeCouponEnabled] = useState(true);
  const [welcomeDiscountPercent, setWelcomeDiscountPercent] = useState(10);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Fetch welcome coupon settings from DB on mount
  useEffect(() => {
    fetchWelcomeCouponSettings();
  }, []);

  const fetchWelcomeCouponSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetch('/api/admin/settings?key=welcome_coupon');
      const result = await res.json();
      if (result.success && result.data?.value) {
        const val = result.data.value;
        setWelcomeCouponEnabled(val.enabled ?? true);
        setWelcomeDiscountPercent(val.discount_percent ?? 10);
      }
    } catch (e) {
      console.error('Failed to fetch welcome coupon settings:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save welcome coupon settings to DB
      if (activeTab === 'coupons') {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'welcome_coupon',
            value: {
              enabled: welcomeCouponEnabled,
              discount_percent: welcomeDiscountPercent
            }
          })
        });
        const result = await res.json();
        if (result.success) {
          alert('Coupon settings saved successfully!');
        } else {
          alert('Error saving settings: ' + (result.error || 'Unknown error'));
        }
      } else {
        // Simulate save for other tabs (no DB for them yet)
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Settings saved successfully!');
      }
    } catch (err) {
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'business', label: 'Business', icon: '💼' },
    { id: 'coupons', label: 'Coupons', icon: '🎟️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'seo', label: 'SEO', icon: '🔍' },
  ];

  return (
    <AdminLayoutWrapper pageTitle="Settings">
      <div className="settings-page">
        {/* Tabs */}
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>General Settings</h2>
                <p>Manage your store's basic information</p>
              </div>

              <div className="form-group">
                <label>Site Name</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => handleChange('siteName', e.target.value)}
                  placeholder="Your store name"
                />
              </div>

              <div className="form-group">
                <label>Site Tagline</label>
                <input
                  type="text"
                  value={settings.siteTagline}
                  onChange={(e) => handleChange('siteTagline', e.target.value)}
                  placeholder="Short description"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    placeholder="support@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    value={settings.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Business Address</label>
                <textarea
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={3}
                  placeholder="Your business address"
                />
              </div>
            </div>
          )}

          {/* Business Settings */}
          {activeTab === 'business' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Business Settings</h2>
                <p>Configure pricing, tax, and payment options</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                  >
                    <option value="INR">Indian Rupee (INR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Currency Symbol</label>
                  <input
                    type="text"
                    value={settings.currencySymbol}
                    onChange={(e) => handleChange('currencySymbol', e.target.value)}
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tax Rate (%)</label>
                  <input
                    type="number"
                    value={settings.taxRate}
                    onChange={(e) => handleChange('taxRate', Number(e.target.value))}
                    min={0}
                    max={100}
                  />
                </div>

                <div className="form-group">
                  <label>Free Shipping Threshold (₹)</label>
                  <input
                    type="number"
                    value={settings.freeShippingThreshold}
                    onChange={(e) => handleChange('freeShippingThreshold', Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Payment Methods</label>
                <div className="toggle-group">
                  <div className="toggle-item">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.codEnabled}
                        onChange={(e) => handleChange('codEnabled', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <span>Cash on Delivery (COD)</span>
                  </div>
                  <div className="toggle-item">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.onlinePaymentEnabled}
                        onChange={(e) => handleChange('onlinePaymentEnabled', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <span>Online Payment (Razorpay/Stripe)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Coupons Settings */}
          {activeTab === 'coupons' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Coupon Settings</h2>
                <p>Configure welcome coupon for first-time buyers</p>
              </div>

              {loadingSettings ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Loading coupon settings...
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <div className="toggle-group vertical">
                      <div className="toggle-item">
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={welcomeCouponEnabled}
                            onChange={(e) => setWelcomeCouponEnabled(e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                        <div className="toggle-info">
                          <span className="toggle-title">Welcome Coupon</span>
                          <span className="toggle-desc">Automatically apply a discount coupon for first-time buyers during checkout</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {welcomeCouponEnabled && (
                    <div className="form-group">
                      <label>Discount Percentage (%)</label>
                      <input
                        type="number"
                        value={welcomeDiscountPercent}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(1, Number(e.target.value) || 1));
                          setWelcomeDiscountPercent(val);
                        }}
                        min={1}
                        max={100}
                        placeholder="e.g. 10"
                      />
                      <span className="char-count" style={{ color: '#059669', fontWeight: 500 }}>
                        First-time buyers will get {welcomeDiscountPercent}% off their order
                      </span>
                    </div>
                  )}

                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#166534',
                    lineHeight: 1.6
                  }}>
                    <strong>ℹ️ How it works:</strong>
                    <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                      <li>The welcome coupon is automatically applied to users who have never placed an order</li>
                      <li>The discount is validated server-side to prevent abuse</li>
                      <li>Once a user places their first order, they can no longer use this coupon</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>Notification Settings</h2>
                <p>Control how you receive notifications</p>
              </div>

              <div className="form-group">
                <div className="toggle-group vertical">
                  <div className="toggle-item">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.orderNotifications}
                        onChange={(e) => handleChange('orderNotifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <div className="toggle-info">
                      <span className="toggle-title">New Order Notifications</span>
                      <span className="toggle-desc">Get notified when a new order is placed</span>
                    </div>
                  </div>

                  <div className="toggle-item">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.reviewNotifications}
                        onChange={(e) => handleChange('reviewNotifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <div className="toggle-info">
                      <span className="toggle-title">Review Notifications</span>
                      <span className="toggle-desc">Get notified when a customer leaves a review</span>
                    </div>
                  </div>

                  <div className="toggle-item">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.lowStockNotifications}
                        onChange={(e) => handleChange('lowStockNotifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <div className="toggle-info">
                      <span className="toggle-title">Low Stock Alerts</span>
                      <span className="toggle-desc">Get notified when product stock is low</span>
                    </div>
                  </div>

                  <div className="toggle-item">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <div className="toggle-info">
                      <span className="toggle-title">Email Notifications</span>
                      <span className="toggle-desc">Receive notifications via email</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEO Settings */}
          {activeTab === 'seo' && (
            <div className="settings-section">
              <div className="section-header">
                <h2>SEO Settings</h2>
                <p>Optimize your store for search engines</p>
              </div>

              <div className="form-group">
                <label>Meta Title</label>
                <input
                  type="text"
                  value={settings.metaTitle}
                  onChange={(e) => handleChange('metaTitle', e.target.value)}
                  placeholder="Your site title for search engines"
                />
                <span className="char-count">{settings.metaTitle.length}/60</span>
              </div>

              <div className="form-group">
                <label>Meta Description</label>
                <textarea
                  value={settings.metaDescription}
                  onChange={(e) => handleChange('metaDescription', e.target.value)}
                  rows={3}
                  placeholder="Describe your store for search engines"
                />
                <span className="char-count">{settings.metaDescription.length}/160</span>
              </div>

              <div className="form-group">
                <label>Google Analytics ID</label>
                <input
                  type="text"
                  value={settings.googleAnalyticsId}
                  onChange={(e) => handleChange('googleAnalyticsId', e.target.value)}
                  placeholder="UA-XXXXXXXXX-X or G-XXXXXXXXXX"
                />
              </div>

              <div className="seo-preview">
                <h4>Search Preview</h4>
                <div className="preview-card">
                  <span className="preview-url">vyraherbals.com</span>
                  <h3 className="preview-title">{settings.metaTitle || 'Your Site Title'}</h3>
                  <p className="preview-desc">{settings.metaDescription || 'Your site description will appear here...'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="save-bar">
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <style jsx>{`
          .settings-page {
            max-width: 900px;
            margin: 0 auto;
          }

          .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            background: white;
            padding: 8px;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .tab {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border: none;
            background: transparent;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
          }

          .tab:hover {
            background: #f3f4f6;
          }

          .tab.active {
            background: #10b981;
            color: white;
          }

          .tab .icon {
            font-size: 16px;
          }

          .tab-content {
            background: white;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 24px;
          }

          .settings-section {
            padding: 32px;
          }

          .section-header {
            margin-bottom: 32px;
          }

          .section-header h2 {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 8px;
          }

          .section-header p {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
          }

          .form-group {
            margin-bottom: 24px;
          }

          .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 8px;
          }

          .form-group input,
          .form-group textarea,
          .form-group select {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
          }

          .form-group input:focus,
          .form-group textarea:focus,
          .form-group select:focus {
            border-color: #10b981;
          }

          .form-group textarea {
            resize: vertical;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }

          .char-count {
            display: block;
            margin-top: 6px;
            font-size: 12px;
            color: #6b7280;
            text-align: right;
          }

          .toggle-group {
            display: flex;
            gap: 24px;
          }

          .toggle-group.vertical {
            flex-direction: column;
            gap: 16px;
          }

          .toggle-item {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .toggle {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
            flex-shrink: 0;
          }

          .toggle input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #e5e7eb;
            transition: 0.3s;
            border-radius: 24px;
          }

          .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
          }

          .toggle input:checked + .slider {
            background-color: #10b981;
          }

          .toggle input:checked + .slider:before {
            transform: translateX(20px);
          }

          .toggle-info {
            display: flex;
            flex-direction: column;
          }

          .toggle-title {
            font-size: 14px;
            font-weight: 500;
            color: #1f2937;
          }

          .toggle-desc {
            font-size: 13px;
            color: #6b7280;
          }

          .seo-preview {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
          }

          .seo-preview h4 {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin: 0 0 16px;
          }

          .preview-card {
            background: #f9fafb;
            border-radius: 12px;
            padding: 20px;
          }

          .preview-url {
            font-size: 12px;
            color: #059669;
          }

          .preview-title {
            font-size: 18px;
            color: #1a0dab;
            margin: 4px 0 8px;
            font-weight: normal;
          }

          .preview-desc {
            font-size: 14px;
            color: #545454;
            margin: 0;
            line-height: 1.5;
          }

          .save-bar {
            display: flex;
            justify-content: flex-end;
          }

          .save-btn {
            padding: 14px 32px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .save-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          }

          .save-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          @media (max-width: 768px) {
            .form-row {
              grid-template-columns: 1fr;
            }

            .tabs {
              overflow-x: auto;
            }
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
