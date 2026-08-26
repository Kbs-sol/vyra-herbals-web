'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

import { API_PATH } from '../../constants';
import { Product } from '@/types';
import { FaShoppingCart, FaWhatsapp } from 'react-icons/fa';
import Link from 'next/link';
import { useCart } from '../Contexts/CartContext';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/utils/analytics';

const CONCERNS = [
  {
    id: 'hair-loss',
    icon: '🌿',
    label: 'Hair\nLoss',
    banner: 'Reduce Hair Fall',
    sub: 'Root-strengthening herbs since centuries',
    searchTerms: ['hair fall', 'hair loss', 'thinning', 'bhringraj', 'amla'],
    productIds: [1, 4, 14, 24],
    tips: [
      'Bhringraj oil massage 3× a week strengthens follicles and reduces shedding.',
      'Sulfate-free shampoo preserves the scalp barrier — switch today.',
      'Iron & protein deficiency is the hidden #1 cause of hair fall.'
    ],
  },
  {
    id: 'hair-growth',
    icon: '✨',
    label: 'Hair\nGrowth',
    banner: 'Stimulate New Growth',
    sub: 'Clinically-backed herbs for thicker hair',
    searchTerms: ['growth', 'rosemary', 'root', 'thickening'],
    productIds: [9, 4, 21, 10],
    tips: [
      'Daily scalp massage with oil increases blood flow — the #1 driver of growth.',
      'Rosemary extract matches 2% minoxidil per clinical studies.',
      'Protein, biotin & Vitamin D are the 3 nutrients most tied to hair growth.'
    ],
  },
  {
    id: 'dandruff',
    icon: '❄️',
    label: 'Dandruff',
    banner: 'Beat Dandruff for Good',
    sub: 'Neem actives target the fungal root cause',
    searchTerms: ['dandruff', 'flake', 'itchy', 'neem', 'tea tree'],
    productIds: [15, 14, 9, 8],
    tips: [
      'Neem is antifungal — use neem shampoo 3× a week minimum.',
      'Hot water worsens flaking; always rinse with cool water.',
      'Don\'t scratch — use a neem comb gently to lift flakes without irritation.'
    ],
  },
  {
    id: 'dry-damage',
    icon: '💧',
    label: 'Dry &\nDamage',
    banner: 'Restore & Repair Deeply',
    sub: 'Intense moisture therapy for damaged strands',
    searchTerms: ['dry', 'damage', 'repair', 'moistur', 'brittle', 'mask'],
    productIds: [16, 9, 14, 22],
    tips: [
      'Apply hair mask as a pre-wash weekly treatment to restore lost proteins.',
      'Sulfate-free shampoo is non-negotiable for dry or chemically treated hair.',
      'Cold rinse after conditioner seals the cuticle and cuts frizz significantly.'
    ],
  },
  {
    id: 'oily-scalp',
    icon: '🫧',
    label: 'Oily\nScalp',
    banner: 'Balance & Refresh',
    sub: 'Regulate sebum without stripping moisture',
    searchTerms: ['oily', 'greasy', 'cleanse', 'sebum', 'balancing'],
    productIds: [4, 10, 9, 8],
    tips: [
      'Wash every 2–3 days — over-washing triggers the scalp to produce more oil.',
      'Apply oil only on lengths and ends, never directly on the scalp.',
      'Rosemary water rinse post-wash naturally regulates sebum production.'
    ],
  },
];

const StickyHairConcern = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { cartItems, addItemToCart } = useCart();
  const router = useRouter();

  const toggleSheet = () => setIsOpen(!isOpen);

  const handleAddToCart = async (product: Product) => {
    // No auth check here by design: guests can fill a cart freely. The login
    // requirement lives at the checkout step (Checkout.handleCheckout).
    await addItemToCart(product.id, 1, product);
    
    // Track AddToCart event
    trackEvent('AddToCart', {
      content_name: product.title,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price || 0,
      currency: 'INR',
      quantity: 1
    });
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_PATH}/products/with-reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extra_condition: ' ORDER BY id ASC' })
        });
        if (response.ok) {
          const data = await response.json();
          setAllProducts(data || []);
        }
      } catch (error) {
        console.error('Error fetching products for concerns:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const currentConcern = CONCERNS[activeTab];

  const isProductIdMappingActive = Array.isArray(currentConcern.productIds) && currentConcern.productIds.length > 0;

  const filteredProducts = isProductIdMappingActive
    ? allProducts.filter(p => currentConcern.productIds!.includes(Number(p.id)))
    : allProducts.filter(p => {
        const title = p.title.toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        return currentConcern.searchTerms.some(term => 
          title.includes(term) || desc.includes(term) || category.includes(term)
        );
      });

  const displayProducts = filteredProducts.length > 0 ? filteredProducts.slice(0, 4) : allProducts.slice(0, 4);

  return (
    <>
      {/* STICKY BOTTOM BAR TRIGGER */}
      <StickyBar onClick={toggleSheet} className={isOpen ? 'hidden' : ''}>
        <div className="bar-content">
          <div className="bar-left">
            <span className="bar-icon">🌿</span>
            <div className="bar-text-wrapper">
              <span className="bar-text">What's your hair concern?</span>
              <span className="bar-subtext">Get personalised product picks</span>
            </div>
          </div>
          <span className="bar-action">
            Explore <span className="bar-arrow">→</span>
          </span>
        </div>
      </StickyBar>

      {isHydrated && (
        <>
          {/* OVERLAY */}
          <Overlay className={isOpen ? 'open' : ''} onClick={toggleSheet} />

          {/* BOTTOM SHEET */}
          <Sheet className={isOpen ? 'open' : ''}>
        <div className="sheet-handle"></div>
        <div className="sheet-header">
          <div className="sheet-title">🌿 What's your hair concern?</div>
          <button className="sheet-close" onClick={toggleSheet}>✕</button>
        </div>
        <div className="zepto-layout">
          <div className="sidebar">
            {CONCERNS.map((c, i) => (
              <div
                key={c.id}
                className={`sidebar-item ${activeTab === i ? 'active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                <div className="sb-icon-wrap">{c.icon}</div>
                <div className="sb-label">{c.label}</div>
              </div>
            ))}
          </div>
          <div className="content">
            <div className="concern-banner">
              <div className="banner-icon">{currentConcern.icon}</div>
              <div>
                <div className="banner-title">{currentConcern.banner}</div>
                <div className="banner-sub">{currentConcern.sub}</div>
              </div>
            </div>
            
            <ProductsGrid>
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <div className="product-card skeleton" key={i}>
                    <div className="product-img"></div>
                    <div className="product-info">
                      <div className="skeleton-line"></div>
                      <div className="skeleton-line short"></div>
                    </div>
                  </div>
                ))
              ) : displayProducts.map((p) => (
                <div className="product-card" key={p.id}>
                  <Link href={`/product/${p.handle}`} className="product-link">
                    <div className="product-img">
                      {(p.view_count ?? 0) > 100 && <div className="product-badge">Trending</div>}
                      <img src={p.image_url} alt={p.title} />
                    </div>
                    <div className="product-info">
                      <div className="product-name">{p.title}</div>
                      <div className="product-desc">{p.category}</div>
                      <div className="product-footer">
                        <div className="product-price">₹{p.price}</div>
                        <button 
                          className={`add-btn ${cartItems.some(item => item.id === p.id) ? 'in-cart' : ''}`} 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (cartItems.some(item => item.id === p.id)) {
                              router.push('/cart');
                            } else {
                              handleAddToCart(p);
                            }
                          }}
                        >
                          {cartItems.some(item => item.id === p.id) ? 'GO TO CART' : 'ADD'}
                        </button>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </ProductsGrid>

            {displayProducts.length === 0 && !isLoading && (
              <div className="no-products">
                No specific products found for this concern yet.
              </div>
            )}

            <div className="tips-section">
              <div className="tips-title">Expert tips</div>
              {currentConcern.tips.map((t, i) => (
                <div className="tip-card" key={i}>
                  <div className="tip-dot">{i + 1}</div>
                  <div className="tip-text">{t}</div>
                </div>
              ))}
            </div>
            
            <Link href={`/search?searchtext=${currentConcern.id}`} className="view-all-row">
              View all {currentConcern.banner} products &rarr;
            </Link>
          </div>
        </div>
          </Sheet>
        </>
      )}
    </>
  );
};

export default StickyHairConcern;

// --- STYLED COMPONENTS ---

const StickyBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1c1c2e;
  padding: 12px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 2000;
  box-shadow: 0 -4px 15px rgba(0,0,0,0.15);
  transition: transform 0.3s ease;

  &.hidden {
    transform: translateY(100%);
  }

  .bar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    max-width: 820px;
    width: 100%;
  }

  .bar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .bar-text-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .bar-icon {
    font-size: 22px;
  }

  .bar-text {
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-subtext {
    color: #d8d8d8;
    font-size: 13px;
    line-height: 1.3;
  }

  .bar-action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(90deg, #7fa73b, #2f5a23);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 14px;
    border-radius: 999px;
    letter-spacing: 0.4px;
    flex-shrink: 0;
  }

  .bar-arrow {
    font-size: 16px;
    line-height: 1;
  }

  @media (max-width: 575px) {
    padding: 10px 15px;
    .bar-text { font-size: 13px; }
    .bar-action { font-size: 10px; padding: 4px 10px; }
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 3000;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: all 0.3s ease;

  &.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
`;

const Sheet = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) translateY(100%);
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 24px 24px 0 0;
  z-index: 4000;
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), visibility 0s linear 0.5s;
  visibility: hidden;
  pointer-events: none;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.2);

  &.open {
    transform: translateX(-50%) translateY(0);
    visibility: visible;
    pointer-events: auto;
    transition-delay: 0s;
  }

  .sheet-handle {
    width: 40px;
    height: 5px;
    border-radius: 3px;
    background: #e0e0e0;
    margin: 12px auto 8px;
    flex-shrink: 0;
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
  }

  .sheet-title {
    font-size: 17px;
    font-weight: 800;
    color: #1a1a1a;
  }

  .sheet-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #f5f5f5;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #666;
    transition: all 0.2s;
    &:hover { 
      background: #fee2e2;
      color: #ef4444;
    }
  }

  .zepto-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    width: 90px;
    flex-shrink: 0;
    background: #f8f9fa;
    overflow-y: auto;
    border-right: 1px solid #f0f0f0;
    padding-bottom: 40px;
    &::-webkit-scrollbar { display: none; }
  }

  .sidebar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 18px 8px;
    cursor: pointer;
    position: relative;
    border-bottom: 1px solid #f1f1f1;
    transition: all 0.2s;
    
    &.active {
      background: #fff;
      &::before {
        content: '';
        position: absolute;
        right: 0;
        top: 20%;
        bottom: 20%;
        width: 4px;
        background: #0C831F;
        border-radius: 4px 0 0 4px;
      }
    }
  }

  .sb-icon-wrap {
    width: 50px;
    height: 50px;
    border-radius: 16px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    border: 1px solid #eee;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-item.active .sb-icon-wrap {
    background: #e8f5e9;
    border-color: #0C831F;
    transform: scale(1.05);
  }

  .sb-label {
    font-size: 10px;
    font-weight: 700;
    color: #666;
    text-align: center;
    margin-top: 8px;
    line-height: 1.2;
    white-space: pre-line;
  }

  .sidebar-item.active .sb-label {
    color: #0C831F;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    background: #fff;
    padding-bottom: 40px;
    &::-webkit-scrollbar { display: none; }
  }

  .concern-banner {
    margin: 16px;
    border-radius: 16px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    border: 1px solid #a5d6a7;
    box-shadow: 0 4px 12px rgba(12, 131, 31, 0.1);
  }

  .banner-icon { font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
  .banner-title { font-size: 16px; font-weight: 800; color: #1b5e20; }
  .banner-sub { font-size: 12px; color: #2e7d32; margin-top: 2px; opacity: 0.9; }

  .no-products {
    text-align: center;
    padding: 30px 20px;
    color: #888;
    font-size: 13px;
    font-style: italic;
  }

  .tips-section { padding: 0 16px 16px; }
  .tips-title { 
    font-size: 12px; 
    font-weight: 800; 
    color: #444; 
    text-transform: uppercase; 
    letter-spacing: 0.08em;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #eee;
    }
  }

  .tip-card {
    background: #f9fafb;
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 10px;
    display: flex;
    gap: 12px;
    border: 1px solid #f0f0f0;
    transition: transform 0.2s;
    &:hover { transform: translateX(4px); }
  }

  .tip-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #0C831F;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
  }

  .tip-text { font-size: 13px; color: #444; line-height: 1.5; font-weight: 500; }

  .view-all-row {
    margin: 10px 16px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px;
    border-radius: 14px;
    border: 2px solid #0C831F;
    color: #0C831F;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    background: #fff;
    text-decoration: none !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &:hover {
      background: #0C831F;
      color: #fff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(12, 131, 31, 0.2);
    }
  }
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 16px 24px;

  .product-link {
    text-decoration: none !important;
    color: inherit;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .product-card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #f0f0f0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    transition: all 0.3s ease;
    height: 100%;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      border-color: #e0e0e0;
    }

    &.skeleton {
      .product-img {
        background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
      }
      .skeleton-line {
        height: 12px;
        background: #f0f0f0;
        border-radius: 4px;
        margin-bottom: 8px;
        &.short { width: 60%; }
      }
    }
  }

  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .product-img {
    aspect-ratio: 1;
    background: #fbfbfb;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border-bottom: 1px solid #f5f5f5;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 10px;
    }
  }

  .product-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    background: #ef4444;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    z-index: 1;
  }

  .product-info {
    padding: 12px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .product-name {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.4;
    height: 2.8em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .product-desc {
    font-size: 11px;
    color: #777;
    margin-top: 4px;
    text-transform: capitalize;
  }

  .product-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 12px;
  }

  .product-price {
    font-size: 16px;
    font-weight: 900;
    color: #1a1a1a;
  }

  .add-btn {
    background: #fff;
    color: #0C831F;
    border: 2px solid #0C831F;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 800;
    padding: 5px 14px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: #0C831F;
      color: #fff;
    }
    &.in-cart {
      background: #0C831F;
      color: #fff;
    }
  }

`;
