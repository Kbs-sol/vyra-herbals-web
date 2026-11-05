"use client";
import React from "react";
import Link from "next/link";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import { FiArrowRight, FiShield, FiHeart } from "react-icons/fi";
import Slider from "react-slick";
import styled from "styled-components";

function SampleNextArrow(props: any) {
  const { onClick } = props;
  return (
    <div className="banner-nav-btn banner-nav-next" onClick={onClick} aria-label="Next slide">
      <IoIosArrowForward size={22} />
    </div>
  );
}

function SamplePrevArrow(props: any) {
  const { onClick } = props;
  return (
    <div className="banner-nav-btn banner-nav-prev" onClick={onClick} aria-label="Previous slide">
      <IoIosArrowBack size={22} />
    </div>
  );
}

const Banner = () => {
  const settings = {
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5500,
    pauseOnHover: true,
    dots: true,
    arrows: true,
    fade: true,
    cssEase: "cubic-bezier(0.4, 0, 0.2, 1)",
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />,
  };

  return (
    <StyledBannerWrapper className="vyra-awwwards-hero">
      <div className="hero-slider-wrap">
        <Slider {...settings}>
          {/* Slide 1: Meadow Banner (Brand Reference Image) */}
          <div className="hero-slide-item">
            <div className="hero-slide-inner">
              <Link href="/search?searchtext=all" className="hero-image-link">
                <img
                  src="/assets/images/vyra-meadow-banner.png"
                  alt="Vyra Herbals - Truth in Every Drop - Natural Hair Oil & Care"
                  className="hero-slide-bg"
                  width={1920}
                  height={800}
                  fetchPriority="high"
                />
              </Link>
              <div className="hero-overlay-curated">
                <div className="container h-100">
                  <div className="row h-100 align-items-center">
                    <div className="col-12 col-md-8 col-lg-7">
                      <div className="hero-floating-card">
                        <div className="hero-pill-badge">
                          <FiShield className="badge-icon" /> 100% Ayurvedic & Cold-Pressed
                        </div>
                        <h1 className="hero-title">
                          Truth in Every Drop. <br />
                          <span>Pure Botanical Hair Care.</span>
                        </h1>
                        <p className="hero-lead">
                          Infused with 20+ handpicked wild herbs, Bhringraj, and Rosemary for dense, healthy, naturally radiant hair.
                        </p>
                        <div className="hero-cta-group">
                          <Link href="/search?searchtext=all" className="hero-btn-primary">
                            Explore Collection <FiArrowRight className="ms-1" />
                          </Link>
                          <Link href="/about" className="hero-btn-secondary">
                            Our Heritage
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 2: Kit / Care Banner */}
          <div className="hero-slide-item">
            <div className="hero-slide-inner">
              <Link href="/search?searchtext=all" className="hero-image-link">
                <img
                  src="/assets/images/banner/slide-02.webp"
                  alt="Healthy Hair, Happy You - Vyra herbal shampoo and hair oil"
                  className="hero-slide-bg"
                  width={1920}
                  height={800}
                />
              </Link>
              <div className="hero-overlay-curated">
                <div className="container h-100">
                  <div className="row h-100 align-items-center">
                    <div className="col-12 col-md-8 col-lg-7">
                      <div className="hero-floating-card">
                        <div className="hero-pill-badge">
                          <FiHeart className="badge-icon" /> Chemical-Free & Handmade in India
                        </div>
                        <h2 className="hero-title">
                          Revitalize Your Scalp. <br />
                          <span>Strengthen Every Strand.</span>
                        </h2>
                        <p className="hero-lead">
                          Traditional small-batch decoctions proven to stop hair fall at the root without sulfates, parabens, or mineral oils.
                        </p>
                        <div className="hero-cta-group">
                          <Link href="/category/hair-oil" className="hero-btn-primary">
                            Shop Hair Oils <FiArrowRight className="ms-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 3: All-in-One Growth Kit */}
          <div className="hero-slide-item">
            <div className="hero-slide-inner">
              <Link href="/search?searchtext=kit" className="hero-image-link">
                <img
                  src="/assets/images/hero-banner.webp"
                  alt="Vyra All in One Hair Growth Kit"
                  className="hero-slide-bg"
                  width={1920}
                  height={800}
                />
              </Link>
            </div>
          </div>
        </Slider>
      </div>

      {/* Luxury Botanical Value Bar */}
      <div className="hero-trust-strip">
        <div className="container">
          <div className="row g-3 text-center align-items-center">
            <div className="col-6 col-md-3">
              <div className="trust-item">
                <span className="trust-icon">🌿</span>
                <span className="trust-text">20+ Rare Herbs</span>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="trust-item">
                <span className="trust-icon">✨</span>
                <span className="trust-text">100% Cold-Pressed</span>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="trust-item">
                <span className="trust-icon">🍃</span>
                <span className="trust-text">Zero Mineral Oils</span>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="trust-item">
                <span className="trust-icon">⭐</span>
                <span className="trust-text">4.9/5 Customer Loved</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StyledBannerWrapper>
  );
};

export default Banner;

const StyledBannerWrapper = styled.section`
  position: relative;
  background-color: var(--vyra-canvas, #faf8f5);
  overflow: hidden;

  .hero-slide-inner {
    position: relative;
    width: 100%;
    min-height: 480px;
    max-height: 640px;
    overflow: hidden;
  }

  .hero-image-link {
    display: block;
    width: 100%;
    height: 100%;
  }

  .hero-slide-bg {
    width: 100%;
    height: 540px;
    object-fit: cover;
    object-position: center;
    display: block;
    transition: transform 7s ease;
  }

  .hero-slide-item:hover .hero-slide-bg {
    transform: scale(1.03);
  }

  .hero-overlay-curated {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      rgba(18, 35, 25, 0.78) 0%,
      rgba(18, 35, 25, 0.45) 50%,
      rgba(18, 35, 25, 0.1) 100%
    );
    pointer-events: none;
    display: flex;
    align-items: center;
  }

  .hero-floating-card {
    pointer-events: auto;
    padding: 36px 32px;
    background: rgba(18, 35, 25, 0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    color: #fff;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
    animation: fadeInLuxe 0.8s ease-out;
  }

  .hero-pill-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(207, 168, 88, 0.2);
    border: 1px solid rgba(207, 168, 88, 0.5);
    color: #ffd885;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 9999px;
    margin-bottom: 16px;
  }

  .hero-title {
    font-family: var(--font-cormorant, Georgia, serif);
    font-size: clamp(2rem, 3.8vw, 3.2rem);
    line-height: 1.15;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 14px;

    span {
      color: #dfc282;
      font-style: italic;
    }
  }

  .hero-lead {
    font-size: 1rem;
    line-height: 1.6;
    color: #e5ece6;
    margin-bottom: 24px;
    max-width: 520px;
  }

  .hero-cta-group {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .hero-btn-primary {
    background: linear-gradient(135deg, #cfa858, #b58934);
    color: #122319;
    font-weight: 700;
    font-size: 0.9rem;
    padding: 12px 26px;
    border-radius: 9999px;
    letter-spacing: 0.04em;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    box-shadow: 0 6px 20px rgba(181, 137, 52, 0.35);

    &:hover {
      background: linear-gradient(135deg, #dfc282, #cfa858);
      color: #0b1710;
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(181, 137, 52, 0.45);
    }
  }

  .hero-btn-secondary {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: #ffffff;
    font-weight: 600;
    font-size: 0.9rem;
    padding: 12px 22px;
    border-radius: 9999px;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.22);
      color: #ffffff;
      transform: translateY(-2px);
    }
  }

  /* Slider Navigation Arrows */
  .banner-nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(6px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #122319;
    cursor: pointer;
    z-index: 10;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    transition: all 0.25s ease;

    &:hover {
      background: #ffffff;
      transform: translateY(-50%) scale(1.08);
      color: #b58934;
    }
  }

  .banner-nav-prev {
    left: 20px;
  }

  .banner-nav-next {
    right: 20px;
  }

  /* Slick Dots Custom styling */
  .slick-dots {
    bottom: 24px;

    li {
      margin: 0 4px;
      button:before {
        font-size: 10px;
        color: #ffffff;
        opacity: 0.5;
      }
      &.slick-active button:before {
        color: #dfc282;
        opacity: 1;
        font-size: 12px;
      }
    }
  }

  /* Bottom Trust Strip */
  .hero-trust-strip {
    background: #ffffff;
    border-bottom: 1px solid rgba(27, 56, 39, 0.07);
    padding: 16px 0;
  }

  .trust-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #2e4336;
    letter-spacing: 0.02em;
  }

  .trust-icon {
    font-size: 1.15rem;
  }

  @media (max-width: 768px) {
    .hero-slide-inner {
      min-height: 420px;
    }

    .hero-slide-bg {
      height: 420px;
    }

    .hero-floating-card {
      padding: 24px 20px;
      margin: 15px 10px;
      border-radius: 16px;
    }

    .hero-title {
      font-size: 1.8rem;
    }

    .hero-lead {
      font-size: 0.88rem;
      margin-bottom: 18px;
    }

    .banner-nav-btn {
      display: none !important;
    }

    .hero-trust-strip .trust-text {
      font-size: 0.76rem;
    }
  }
`;
