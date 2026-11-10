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
                  alt="Sahera Banu, founder and creator of Vyra Herbals"
                  width={800}
                  height={838}
                  loading="lazy"
                  className="founder-portrait"
                />
                <div className="founder-badge-caption">
                  <span className="caption-tag">FOUNDER & CREATOR</span>
                  <h4 className="caption-name">Sahera Banu</h4>
                </div>
              </div>
            </div>

            {/* Narrative Column */}
            <div className="col-lg-7 order-1 order-lg-2">
              <div className="founder-narrative-content">
                <span className="section-eyebrow">OUR STORY</span>
                <h2 className="founder-quote-heading">
                  “I started this journey not as a businesswoman, but as someone struggling with hair problems, just like you.”
                </h2>
                
                <p className="founder-lead-text">
                  At Vyra Herbals, every bottle tells a story—my story. I faced significant challenges with my hair, dealing with thinning, excessive breakage, and a complete lack of shine. After trying countless products with no results, it became one of the toughest, most frustrating periods of my life.
                </p>

                <p className="founder-body-text">
                  There were moments when I felt like giving up entirely. But then, something shifted. I decided to take matters into my own hands and started experimenting with natural ingredients at home. Over time, my hair became noticeably stronger, glossier, and healthier. When I shared my homemade formulations with friends facing similar struggles, their hair transformed too—and Vyra Herbals was born.
                </p>

                <div className="founder-action-box">
                  <Link href="/about#story-continue-reading" className="founder-story-link">
                    Continue Reading Our Story <FiArrowRight className="ms-1" />
                  </Link>
                  <span className="founder-signoff">Handmade in India • 100% Natural Herbal Care</span>
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
    font-size: clamp(1.35rem, 2.4vw, 1.95rem);
    font-weight: 700;
    line-height: 1.35;
    color: #0b140e;
    margin-bottom: 1.4rem;
    letter-spacing: -0.01em;
  }

  .founder-lead-text {
    font-size: 0.95rem;
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
