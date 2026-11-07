'use client';

import React from "react";
import { FaArrowRight } from "react-icons/fa6";
import Link from "next/link";
import styled from "styled-components";
import { useState } from "react";
import { Category as CategoryType } from "@/types";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { CategorySkeleton } from "../Common/SkeletonComponents";
import Slider from "react-slick";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Comprehensive 6-Pillar Category Architecture for Vyra Herbals
const COMPREHENSIVE_HERBAL_CATEGORIES = [
  {
    id: 1,
    name: "Herbal Hair Oil",
    slug: "hair-oil",
    image_url: "/category-images/Hair Oil.webp",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/hair-oil-100ml/1769794807906-zgf6vtn.jpg"
  },
  {
    id: 2,
    name: "Herbal Shampoo",
    slug: "shampoo",
    image_url: "/category-images/Shampo.webp",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-shampoo-200ml/1769795134812-b9j9hng.jpg"
  },
  {
    id: 3,
    name: "Kits & Combos",
    slug: "combo-s",
    image_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/oil-100ml-shampoo-200ml-combo/1769795539392-gnur19u.jpg",
    hover_url: "/assets/images/hero-banner.webp"
  },
  {
    id: 4,
    name: "Hair Mask Powder",
    slug: "herbal-hair-mask-powder",
    image_url: "/category-images/Hair Mask.webp",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-hair-mask-powder/1771663039180-wsclkdq.jpeg"
  },
  {
    id: 5,
    name: "Neem Wooden Combs",
    slug: "neem-combs",
    image_url: "/assets/images/cat/coomb.webp",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/neem-combs-combo-2/1769797623158-lx3krar.jpg"
  },
  {
    id: 6,
    name: "Scalp Massager",
    slug: "scalp-massager",
    image_url: "/category-images/scalp.webp",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/scalp-massager/1771935718696-hz94vln.jpg"
  }
];

const Category = () => {
  const [categories] = useState<CategoryType[]>(COMPREHENSIVE_HERBAL_CATEGORIES as any);
  const [isLoading] = useState(false);

  const CustomPrevArrow = (props: any) => {
    const { onClick, currentSlide } = props;
    if (currentSlide === 0) return null;
    return (
      <button className="nav-btn prev" onClick={onClick} aria-label="Previous category">
        <FaChevronLeft />
      </button>
    );
  };

  const CustomNextArrow = (props: any) => {
    const { onClick, currentSlide, slideCount, slidesToShow } = props;
    if (currentSlide >= slideCount - slidesToShow) return null;
    return (
      <button className="nav-btn next" onClick={onClick} aria-label="Next category">
        <FaChevronRight />
      </button>
    );
  };

  const settings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 6,
    slidesToScroll: 1,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3.2,
          slidesToScroll: 1,
          arrows: false,
        }
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 2.3,
          slidesToScroll: 1,
          arrows: false,
          dots: true,
        }
      }
    ]
  };

  return (
    <StyledCategories className="section category-part">
      <div className="container">
        <div className="section-header">
          <div className="title-wrapper">
            <span className="subtitle">COLLECTIONS</span>
            <h2 className="title">Shop by Categories</h2>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-12">
            <div className="slider-wrapper">
              <Slider {...settings}>
                {isLoading ? (
                  Array(6).fill(0).map((_, i) => <div key={i}><CategorySkeleton /></div>)
                ) : categories.map((cat, index) => {
                  return (
                    <div className="category-slide px-1 px-md-2" key={cat.id || index}>
                      <div className="category-wrap">
                        <Link href={`/category/${cat.slug}`}>
                          <div className="category-media">
                            <img src={cat.image_url} alt={cat.name} width={300} height={300} loading="lazy" />
                            <img src={cat.hover_url} alt={cat.name} width={300} height={300} loading="lazy" />
                          </div>
                          <div className="category-meta">
                            <h4>
                              {cat.name}
                              <FaArrowRight />
                            </h4>
                          </div>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </Slider>
            </div>
          </div>
        </div>
      </div>
    </StyledCategories>
  );
};

export default Category;

const StyledCategories = styled.section`
  &.category-part {
    padding: 3.5rem 0 !important;
    background-color: #f8f9f8;
  }

  .section-header {
    margin-bottom: 2rem;
    text-align: left;

    .subtitle {
      display: block;
      font-size: 0.72rem;
      font-weight: 800;
      color: #b58934;
      letter-spacing: 0.22em;
      margin-bottom: 0.4rem;
      text-transform: uppercase;
    }

    .title {
      font-size: clamp(1.6rem, 3vw, 2.2rem);
      font-weight: 800;
      color: #0b140e;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      margin: 0;
    }
  }

  .slider-wrapper {
    position: relative;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    width: 38px;
    height: 38px;
    background: #ffffff;
    border: 1px solid rgba(11, 20, 14, 0.1);
    border-radius: 2px;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer;
    color: #0b140e;
    transition: all 0.2s ease;

    &.prev { left: -14px; }
    &.next { right: -14px; }

    &:hover {
      background: #0b140e;
      color: #ffffff;
    }
  }

  .category-media {
    position: relative;
    width: 100%;
    margin: 0 auto;
    border-radius: 4px;
    overflow: hidden;
    aspect-ratio: 1/1;
    background: #ffffff;
    border: 1px solid rgba(11, 20, 14, 0.08);
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    img:last-child {
      opacity: 0;
      position: absolute;
      left: 0;
      top: 0;
      transform: scale(1.04);
    }

    &:hover {
      border-color: #0b140e;
      img:first-child {
        opacity: 0;
      }
      img:last-child {
        opacity: 1;
        transform: scale(1);
      }
    }
  }

  .category-meta {
    margin-top: 10px;
    text-align: center;
    
    h4 {
      font-size: 0.84rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      color: #0b140e;
      margin: 0;
      
      svg {
        font-size: 0.68rem;
        transition: transform 0.2s ease;
      }
    }
  }

  .category-wrap:hover .category-meta h4 svg {
    transform: translateX(4px);
  }

  @media (max-width: 576px) {
    &.category-part {
      padding: 2.2rem 0 !important;
    }

    .category-meta h4 {
      font-size: 0.74rem;
    }
  }
`;
