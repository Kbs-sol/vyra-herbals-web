'use client';

import React from "react";
import Link from "next/link";
import styled from "styled-components";
import { FiArrowRight } from "react-icons/fi";

const Founder = () => {
  return (
    <StyledFounderSection className="founder-section-curated">
      <div className="container">
        <div className="founder-card-wrapper">
          <div className="row g-0 align-items-center">
            {/* Visual Column */}
            <div className="col-lg-5 order-2 order-lg-1">
              <div className="founder-image-box">
                <img
                  src="/assets/images/vyra-founder.webp"
                  alt="Sahera Banu, founder and formulator of Vyra Herbals"
                  width={800}
                  height={838}
                  loading="lazy"
                  className="founder-portrait"
                />
                <div className="founder-badge-caption">
                  <span className="caption-tag">FOUNDER & FORMULATOR</span>
                  <h4 className="caption-name">Sahera Banu</h4>
                </div>
              </div>
            </div>

            {/* Narrative Column */}
            <div className="col-lg-7 order-1 order-lg-2">
              <div className="founder-narrative-content">
                <span className="section-eyebrow">OUR ORIGIN STORY</span>
                <h2 className="founder-quote-heading">
                  “I didn’t start a company. I started experimenting in my kitchen because my own hair was falling out.”
                </h2>
                
                <p className="founder-lead-text">
                  Like millions of Indian men and women, I dealt with postpartum hair fall, alarming thinning, and lifeless breakage. Commercial shelves were crowded with artificial fragrances, concealed sulfates, and empty marketing promises that only aggravated my scalp.
                </p>

                <p className="founder-body-text">
                  Frustrated by the lack of honesty in hair care, I turned to the kitchen: slow-infusing cold-pressed coconut oil with hand-sourced Amla, Bhringraj, Rosemary leaves, Fenugreek, and fresh Hibiscus petals. When family and friends saw my hair transform, they asked for their own bottles. That personal journey of care and transparency is what powers every batch of Vyra Herbals today.
                </p>

                <div className="founder-action-box">
                  <Link href="/about" className="founder-story-link">
                    Read Our Complete Story <FiArrowRight className="ms-1" />
                  </Link>
                  <span className="founder-signoff">Handmade in India • 100% Chemical-Free</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StyledFounderSection>
  );
};

export default Founder;

const StyledFounderSection = styled.section`
  padding: 5rem 0;
  background-color: var(--vyra-canvas, #ffffff);

  .founder-card-wrapper {
    background: #f8f9f8;
    border: 1px solid var(--vyra-border-hairline, rgba(11, 20, 14, 0.08));
    border-radius: 4px;
    overflow: hidden;
  }

  .founder-image-box {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 440px;
    background-color: #0b140e;
  }

  .founder-portrait {
    width: 100%;
    height: 100%;
    min-height: 440px;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  .founder-badge-caption {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: rgba(11, 20, 14, 0.85);
    backdrop-filter: blur(10px);
    padding: 14px 18px;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  .caption-tag {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: #dfc282;
    text-transform: uppercase;
    display: block;
    margin-bottom: 2px;
  }

  .caption-name {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .founder-narrative-content {
    padding: 3.5rem 3rem;
  }

  .section-eyebrow {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #b58934;
    display: block;
    margin-bottom: 0.8rem;
  }

  .founder-quote-heading {
    font-size: clamp(1.4rem, 2.5vw, 2rem);
    font-weight: 700;
    line-height: 1.3;
    color: #0b140e;
    margin-bottom: 1.4rem;
    letter-spacing: -0.01em;
  }

  .founder-lead-text {
    font-size: 0.96rem;
    line-height: 1.65;
    color: #18231c;
    font-weight: 500;
    margin-bottom: 1rem;
  }

  .founder-body-text {
    font-size: 0.9rem;
    line-height: 1.7;
    color: #4a574f;
    margin-bottom: 2rem;
  }

  .founder-action-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(11, 20, 14, 0.08);
  }

  .founder-story-link {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #0b140e;
    display: inline-flex;
    align-items: center;
    transition: color 0.2s ease;

    &:hover {
      color: #b58934;
    }
  }

  .founder-signoff {
    font-size: 0.75rem;
    color: #78857d;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  @media (max-width: 991px) {
    padding: 3rem 0;

    .founder-narrative-content {
      padding: 2rem 1.5rem;
    }

    .founder-image-box {
      min-height: 340px;
    }

    .founder-portrait {
      min-height: 340px;
    }
  }
`;
