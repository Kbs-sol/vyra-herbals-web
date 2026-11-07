"use client";
import React from "react";
import Link from "next/link";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { FiArrowRight } from "react-icons/fi";
import Slider from "react-slick";
import styled from "styled-components";

function SampleNextArrow(props: any) {
  const { onClick } = props;
  return (
    <button className="banner-nav-btn banner-nav-next" onClick={onClick} aria-label="Next slide">
      <IoIosArrowForward size={18} />
    </button>
  );
}

function SamplePrevArrow(props: any) {
  const { onClick } = props;
  return (
    <button className="banner-nav-btn banner-nav-prev" onClick={onClick} aria-label="Previous slide">
      <IoIosArrowBack size={18} />
    </button>
  );
}

const Banner = () => {
  const settings = {
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    dots: true,
    arrows: true,
    fade: true,
    cssEase: "cubic-bezier(0.16, 1, 0.3, 1)",
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />,
  };

  return (
    <StyledHeroSection className="bluorng-editorial-hero">
      <div className="hero-slider-wrap">
        <Slider {...settings}>
          {/* Slide 1: Meadow Editorial Lookbook */}
          <div className="hero-slide">
            <div className="hero-canvas">
              <picture>
                <source media="(max-width: 768px)" srcSet="/assets/images/vyra-meadow-banner.png" />
                <img
                  src="/assets/images/vyra-meadow-banner.png"
                  alt="Vyra Herbals - Botanical Haircare"
                  className="hero-media"
                  fetchPriority="high"
                />
              </picture>
              
              <div className="hero-scrim"></div>

              <div className="hero-content-anchor">
                <div className="hero-content-container">
                  <span className="hero-season-tag">BOTANICAL HARVEST • 2026</span>
                  <h1 className="hero-title-editorial">
                    TRUTH IN EVERY DROP.
                  </h1>
                  <p className="hero-description-compact">
                    Small-batch decoctions of 20+ wild Indian herbs, unrefined and cold-pressed for potent follicle restoration.
                  </p>
                  <div className="hero-action-row">
                    <Link href="/search?searchtext=all" className="hero-btn-solid">
                      SHOP ALL PRODUCTS
                    </Link>
                    <Link href="/category/hair-oil" className="hero-btn-outline">
                      HAIR OILS
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 2: Kit Campaign */}
          <div className="hero-slide">
            <div className="hero-canvas">
              <picture>
                <source media="(max-width: 768px)" srcSet="/assets/images/banner/slide-02.webp" />
                <img
                  src="/assets/images/banner/slide-02.webp"
                  alt="Vyra All-in-One Hair Care Kit"
                  className="hero-media"
                />
              </picture>

              <div className="hero-scrim"></div>

              <div className="hero-content-anchor">
                <div className="hero-content-container">
                  <span className="hero-season-tag">CLEAN FORMULATION</span>
                  <h2 className="hero-title-editorial">
                    HEALTHY HAIR, NATURALLY.
                  </h2>
                  <p className="hero-description-compact">
                    Zero sulfates. Zero synthetic fragrances. Clinically tested pure actives that nourish from the roots up.
                  </p>
                  <div className="hero-action-row">
                    <Link href="/search?searchtext=all" className="hero-btn-solid">
                      EXPLORE COLLECTION
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Slider>
      </div>

      {/* Bluorng-Style Marquee Ticker */}
      <div className="hero-ticker-bar">
        <div className="ticker-track">
          <span>COLD-PRESSED AYURVEDIC HERBS</span>
          <span className="ticker-bullet">•</span>
          <span>FREE SHIPPING ALL OVER INDIA</span>
          <span className="ticker-bullet">•</span>
          <span>ISO 9001 & GMP CERTIFIED</span>
          <span className="ticker-bullet">•</span>
          <span>HANDMADE IN SMALL BATCHES</span>
          <span className="ticker-bullet">•</span>
          <span>ZERO SULFATES & PARABENS</span>
          <span className="ticker-bullet">•</span>
          <span>COLD-PRESSED AYURVEDIC HERBS</span>
          <span className="ticker-bullet">•</span>
          <span>FREE SHIPPING ALL OVER INDIA</span>
          <span className="ticker-bullet">•</span>
          <span>ISO 9001 & GMP CERTIFIED</span>
          <span className="ticker-bullet">•</span>
        </div>
      </div>
    </StyledHeroSection>
  );
};

export default Banner;

const StyledHeroSection = styled.section`
  position: relative;
  background-color: #0b140e;
  overflow: hidden;

  .hero-canvas {
    position: relative;
    width: 100%;
    height: 75vh;
    min-height: 520px;
    max-height: 720px;
    background-color: #0b140e;
  }

  .hero-media {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }

  /* Cinematic Scrim Gradient (Bluorng aesthetic) */
  .hero-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(11, 20, 14, 0.2) 0%,
      rgba(11, 20, 14, 0.45) 50%,
      rgba(11, 20, 14, 0.88) 100%
    );
    pointer-events: none;
  }

  /* Content Positioning anchored to bottom-left with generous spacing */
  .hero-content-anchor {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 3.5rem 2.5rem;
    z-index: 2;
  }

  .hero-content-container {
    max-width: 640px;
  }

  .hero-season-tag {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    color: #dfc282;
    text-transform: uppercase;
    margin-bottom: 0.6rem;
  }

  .hero-title-editorial {
    font-size: clamp(2rem, 4.5vw, 3.8rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: #ffffff;
    text-transform: uppercase;
    margin-bottom: 0.85rem;
    font-family: inherit;
  }

  .hero-description-compact {
    font-size: 0.95rem;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.82);
    margin-bottom: 1.6rem;
    max-width: 520px;
    font-weight: 400;
  }

  /* Sharp, Tactile Button Row */
  .hero-action-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .hero-btn-solid {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    color: #0b140e;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    padding: 14px 28px;
    text-transform: uppercase;
    border-radius: 2px;
    transition: all 0.2s ease;
    border: 1px solid #ffffff;

    &:hover {
      background: #dfc282;
      border-color: #dfc282;
      color: #0b140e;
      transform: translateY(-1px);
    }
  }

  .hero-btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(11, 20, 14, 0.4);
    backdrop-filter: blur(8px);
    color: #ffffff;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    padding: 14px 28px;
    text-transform: uppercase;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: #ffffff;
      color: #ffffff;
      transform: translateY(-1px);
    }
  }

  /* Minimalist Nav Arrows */
  .banner-nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    background: rgba(11, 20, 14, 0.6);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    border-radius: 2px;
    transition: all 0.2s ease;

    &:hover {
      background: #ffffff;
      color: #0b140e;
    }
  }

  .banner-nav-prev {
    left: 20px;
  }

  .banner-nav-next {
    right: 20px;
  }

  .slick-dots {
    bottom: 20px;
    right: 30px;
    left: auto;
    width: auto;

    li {
      margin: 0 3px;
      button:before {
        font-size: 7px;
        color: #ffffff;
        opacity: 0.4;
      }
      &.slick-active button:before {
        color: #ffffff;
        opacity: 1;
        font-size: 9px;
      }
    }
  }

  /* Ticker / Running Marquee Bar */
  .hero-ticker-bar {
    background: #0b140e;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 10px 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .ticker-track {
    display: inline-flex;
    align-items: center;
    animation: tickerScroll 24s linear infinite;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: rgba(255, 255, 255, 0.75);
    text-transform: uppercase;
  }

  .ticker-bullet {
    margin: 0 16px;
    color: #dfc282;
  }

  @keyframes tickerScroll {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  /* Mobile-first Viewport Enhancements */
  @media (max-width: 768px) {
    .hero-canvas {
      height: 82vh;
      min-height: 480px;
    }

    .hero-content-anchor {
      padding: 1.8rem 1.25rem 2.5rem;
    }

    .hero-title-editorial {
      font-size: 2.1rem;
      line-height: 1.1;
      margin-bottom: 0.5rem;
    }

    .hero-description-compact {
      font-size: 0.85rem;
      line-height: 1.45;
      margin-bottom: 1.25rem;
    }

    .hero-btn-solid,
    .hero-btn-outline {
      padding: 13px 20px;
      font-size: 0.74rem;
      width: 100%;
      text-align: center;
    }

    .banner-nav-btn {
      display: none !important;
    }

    .slick-dots {
      right: 50%;
      transform: translateX(50%);
      bottom: 12px;
    }
  }
`;
