'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { STATIC_PRODUCTS } from '../../utils/staticCatalogue';

interface ConcernCategory {
  id: string;
  icon: string;
  label: string;
  headline: string;
  description: string;
  suggestedHandles: string[];
}

const HERBAL_CONCERNS: ConcernCategory[] = [
  {
    id: 'hair-fall',
    icon: '🌿',
    label: 'Hair Fall & Breakage',
    headline: 'Nourish & Strengthen Roots Naturally',
    description: 'Cold-infused Bhringraj, Amla & Hibiscus nourish fragile hair follicles. Pure herbal care works steadily with your scalp’s natural hair cycle—best results are experienced with consistent use over 2 to 3 months.',
    suggestedHandles: ['VYRA-OIL-100', 'VYRA-OIL-200', 'VYRA-100-OIL-200-SHAMPOO-COMBO', 'VYRA-SHAMPOO-200'],
  },
  {
    id: 'hair-growth',
    icon: '✨',
    label: 'Growth & Density',
    headline: 'Support Natural Strands & Fullness',
    description: 'Formulated with dried rosemary leaves, curry leaves, and cold-pressed coconut oil to stimulate micro-circulation and deeply nourish hair roots.',
    suggestedHandles: ['VYRA-OIL-200', 'ROSEMARY-LEAVES', 'MASSAGER', 'vyra-hair-growth-kit'],
  },
  {
    id: 'dandruff-scalp',
    icon: '❄️',
    label: 'Dandruff & Scalp Flakes',
    headline: 'Gentle Botanical Scalp Clarification',
    description: 'Neem wood combs and mild, sulfate-free cleansers gently soothe itching and clear product buildup without stripping natural scalp moisture.',
    suggestedHandles: ['NEEM-FULL-HALF', 'VYRA-SHAMPOO-200', 'MASSAGER', 'VYRA-200-SHAMPOO-MASSAGER-COMBO'],
  },
  {
    id: 'dry-damaged',
    icon: '💧',
    label: 'Dry & Frizzy Hair',
    headline: 'Plant-Based Softness & Natural Shine',
    description: 'Pure 9-herb conditioning mask powder and deep oil hydration restore manageability and gloss to sun-stressed or dry hair strands.',
    suggestedHandles: ['MASK-POWDER', 'VYRA-OIL-100', 'vyra-healthy-hair-kit', 'VYRA-200-OIL-200-SHAMPOO-COMBO'],
  },
];

const ConcernDiscoveryTray = () => {
  const [activeConcernId, setActiveConcernId] = useState<string>('hair-fall');

  const selectedConcern = HERBAL_CONCERNS.find((c) => c.id === activeConcernId) || HERBAL_CONCERNS[0];

  const matchingProducts = selectedConcern.suggestedHandles
    .map((handle) => STATIC_PRODUCTS.find((p) => p.handle === handle))
    .filter(Boolean);

  return (
    <StyledTraySection className="concern-discovery-section">
      <div className="container">
        <div className="section-header text-center mb-4">
          <span className="subtitle">CUSTOM HERBAL ROUTINES</span>
          <h2 className="title">Choose Your Hair Concern</h2>
          <p className="section-subtext">
            Every scalp is unique. Explore herbal suggestions tailored to your routine without pressure or forced claims.
          </p>
        </div>

        {/* 4 Interactive Concern Tabs */}
        <div className="concern-tabs-row">
          {HERBAL_CONCERNS.map((concern) => (
            <button
              key={concern.id}
              className={`concern-tab-btn ${concern.id === activeConcernId ? 'active' : ''}`}
              onClick={() => setActiveConcernId(concern.id)}
              type="button"
            >
              <span className="tab-icon">{concern.icon}</span>
              <span className="tab-label">{concern.label}</span>
            </button>
          ))}
        </div>

        {/* Active Concern Insight Card */}
        <div className="concern-insight-card">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h3 className="insight-headline">{selectedConcern.headline}</h3>
              <p className="insight-description">{selectedConcern.description}</p>
              <div className="insight-honest-note">
                🌿 <strong>Honest Herbal Note:</strong> Natural plant formulations work gradually with your body. Consistent 2 to 3 months of regular application is key to noticing real, lasting improvements.
              </div>
            </div>
            <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
              <span className="insight-meta-badge">100% Chemical-Free</span>
            </div>
          </div>
        </div>

        {/* Suggested Product Cards */}
        <div className="row row-cols-2 row-cols-md-4 g-3 mt-2">
          {matchingProducts.map((product: any) => (
            <div className="col" key={product.handle}>
              <div className="curated-mini-card">
                <Link href={`/product/${product.handle}`} className="mini-card-media">
                  <img src={product.image_url} alt={product.title} loading="lazy" />
                  {product.regular_price > product.price && (
                    <span className="mini-badge-save">
                      SAVE ₹{product.regular_price - product.price}
                    </span>
                  )}
                </Link>
                <div className="mini-card-body">
                  <h4 className="mini-card-title">
                    <Link href={`/product/${product.handle}`}>{product.title}</Link>
                  </h4>
                  <div className="mini-card-price">
                    <span className="current-price">₹{product.price}</span>
                    {product.regular_price > product.price && (
                      <span className="mrp-price">₹{product.regular_price}</span>
                    )}
                  </div>
                  <Link href={`/product/${product.handle}`} className="mini-view-btn">
                    VIEW DETAILS
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StyledTraySection>
  );
};

export default ConcernDiscoveryTray;

const StyledTraySection = styled.section`
  padding: 3.5rem 0;
  background-color: #ffffff;
  border-bottom: 1px solid rgba(11, 20, 14, 0.08);

  .section-subtext {
    font-size: 0.92rem;
    color: #4a574f;
    max-width: 560px;
    margin: 0.5rem auto 0;
    line-height: 1.55;
  }

  .concern-tabs-row {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 24px;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      height: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(11, 20, 14, 0.1);
      border-radius: 4px;
    }
  }

  .concern-tab-btn {
    flex: 1;
    min-width: 140px;
    background: #f8f9f8;
    border: 1px solid rgba(11, 20, 14, 0.08);
    border-radius: 4px;
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    .tab-icon {
      font-size: 1.4rem;
    }

    .tab-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #0b140e;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      text-align: center;
      line-height: 1.25;
    }

    &:hover {
      border-color: #0b140e;
      background: #ffffff;
    }

    &.active {
      background: #14281d;
      border-color: #14281d;

      .tab-label {
        color: #ffffff;
      }
    }
  }

  .concern-insight-card {
    background: #f8f9f8;
    border: 1px solid rgba(11, 20, 14, 0.08);
    border-radius: 4px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .insight-headline {
    font-size: 1.2rem;
    font-weight: 700;
    color: #0b140e;
    margin-bottom: 8px;
  }

  .insight-description {
    font-size: 0.88rem;
    line-height: 1.6;
    color: #3c4a41;
    margin-bottom: 12px;
  }

  .insight-honest-note {
    font-size: 0.82rem;
    color: #22422f;
    background: #eaf1ec;
    border-left: 3px solid #2e593c;
    padding: 8px 12px;
    border-radius: 2px;
    line-height: 1.45;
  }

  .insight-meta-badge {
    display: inline-block;
    background: #14281d;
    color: #ffffff;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 2px;
  }

  .curated-mini-card {
    background: #ffffff;
    border: 1px solid rgba(11, 20, 14, 0.08);
    border-radius: 4px;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease, border-color 0.2s ease;

    &:hover {
      border-color: #0b140e;
      transform: translateY(-2px);
    }
  }

  .mini-card-media {
    position: relative;
    aspect-ratio: 1/1;
    background: #fbfbf9;
    display: block;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .mini-badge-save {
      position: absolute;
      top: 6px;
      left: 6px;
      background: #d97746;
      color: #ffffff;
      font-size: 0.64rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 2px;
    }
  }

  .mini-card-body {
    padding: 10px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    .mini-card-title {
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 6px;
      line-height: 1.3;
      min-height: 2.1rem;

      a {
        color: #0b140e;
        text-transform: uppercase;
        letter-spacing: 0.02em;

        &:hover {
          color: #b58934;
        }
      }
    }

    .mini-card-price {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-top: auto;
      margin-bottom: 8px;

      .current-price {
        font-size: 1.05rem;
        font-weight: 800;
        color: #0b140e;
      }

      .mrp-price {
        font-size: 0.76rem;
        color: #78857d;
        text-decoration: line-through;
      }
    }

    .mini-view-btn {
      display: block;
      width: 100%;
      text-align: center;
      background: #0b140e;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 8px 10px;
      border-radius: 2px;
      text-decoration: none;
      transition: background 0.2s ease;

      &:hover {
        background: #22422f;
      }
    }
  }

  @media (max-width: 576px) {
    padding: 2rem 0;

    .concern-tabs-row {
      margin-bottom: 16px;
    }

    .concern-tab-btn {
      min-width: 110px;
      padding: 10px 6px;

      .tab-icon {
        font-size: 1.2rem;
      }
      .tab-label {
        font-size: 0.68rem;
      }
    }

    .concern-insight-card {
      padding: 16px;
    }

    .insight-headline {
      font-size: 1.05rem;
    }

    .insight-description {
      font-size: 0.8rem;
    }
  }
`;
