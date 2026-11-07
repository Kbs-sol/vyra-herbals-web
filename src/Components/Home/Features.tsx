'use client';

import React from "react";
import styled from "styled-components";
import { FiCheckCircle, FiTruck, FiRefreshCw, FiShield } from "react-icons/fi";

const Features = () => {
  return (
    <StyledPillarsSection className="herbal-pillars-section">
      <div className="container">
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="pillar-tile">
              <span className="pillar-icon">🌿</span>
              <h5 className="pillar-title">100% Plant-Based</h5>
              <p className="pillar-desc">
                Infused with pure botanicals, wild leaves, and cold-pressed seeds.
              </p>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="pillar-tile">
              <span className="pillar-icon">🚫</span>
              <h5 className="pillar-title">Zero Harsh Chemicals</h5>
              <p className="pillar-desc">
                Strictly free from sulfates, parabens, silicones, and artificial dyes.
              </p>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="pillar-tile">
              <span className="pillar-icon">📦</span>
              <h5 className="pillar-title">Free Pan-India Delivery</h5>
              <p className="pillar-desc">
                Fast, carbon-conscious doorstep shipping with full parcel tracking.
              </p>
            </div>
          </div>

          <div className="col-6 col-md-3">
            <div className="pillar-tile">
              <span className="pillar-icon">🤝</span>
              <h5 className="pillar-title">Small-Batch Handmade</h5>
              <p className="pillar-desc">
                Freshly formulated and crafted in India under strict GMP guidelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </StyledPillarsSection>
  );
};

export default Features;

const StyledPillarsSection = styled.section`
  padding: 3rem 0;
  background-color: #f8f9f8;
  border-top: 1px solid rgba(11, 20, 14, 0.08);
  border-bottom: 1px solid rgba(11, 20, 14, 0.08);

  .pillar-tile {
    background: #ffffff;
    border: 1px solid rgba(11, 20, 14, 0.08);
    border-radius: 4px;
    padding: 24px 18px;
    height: 100%;
    text-align: left;
    transition: transform 0.2s ease, border-color 0.2s ease;

    &:hover {
      border-color: #0b140e;
      transform: translateY(-2px);
    }
  }

  .pillar-icon {
    font-size: 1.6rem;
    display: inline-block;
    margin-bottom: 12px;
  }

  .pillar-title {
    font-size: 0.88rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #0b140e;
    margin-bottom: 6px;
  }

  .pillar-desc {
    font-size: 0.8rem;
    line-height: 1.5;
    color: #4a574f;
    margin: 0;
  }

  @media (max-width: 576px) {
    padding: 2rem 0;

    .pillar-tile {
      padding: 16px 12px;
    }

    .pillar-title {
      font-size: 0.78rem;
    }

    .pillar-desc {
      font-size: 0.72rem;
    }
  }
`;
