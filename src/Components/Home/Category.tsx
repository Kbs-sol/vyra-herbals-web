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

// Slick carousel CSS
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const HARDCODED_CATEGORIES = [
  {
    id: 1,
    name: "Hair Oil",
    slug: "hair-oil",
    image_url: "/category-images/Hair Oil.png",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/hair-oil-100ml/1769794807906-zgf6vtn.jpg"
  },
  {
    id: 2,
    name: "Shampoo",
    slug: "shampoo",
    image_url: "/category-images/Shampo.jpeg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-shampoo-200ml/1769795134812-b9j9hng.jpg"
  },
  {
    id: 3,
    name: "Scalp Massager",
    slug: "scalp-massager",
    image_url: "/category-images/scalp.jpg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/scalp-massager/1771935718696-hz94vln.jpg"
  },
  {
    id: 4,
    name: "Herbal Hair Mask Powder",
    slug: "herbal-hair-mask-powder",
    image_url: "/category-images/Hair Mask.jpeg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/herbal-hair-mask-powder/1771663039180-wsclkdq.jpeg"
  },
  {
    id: 5,
    name: "Neem Combs",
    slug: "neem-combs",
    image_url: "/assets/images/cat/coomb.jpg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/neem-combs-combo-2/1769797623158-lx3krar.jpg"
  },
  {
    id: 6,
    name: "Rosemary Leaves",
    slug: "rosemary-leaves",
    image_url: "/category-images/Rosemary Leaves.jpeg",
    hover_url: "https://obbohecegyagnqufelpx.supabase.co/storage/v1/object/public/images/rosemary-leaves/1771662946547-x0yeozh.jpeg"
  }
];

const Category = () => {
  const [categories] = useState<CategoryType[]>(HARDCODED_CATEGORIES);
  const [isLoading] = useState(false);

  const CustomPrevArrow = (props: any) => {
    const { onClick, currentSlide } = props;
    if (currentSlide === 0) return null;
    return (
      <button className="nav-btn prev" onClick={onClick} aria-label="Previous">
        <FaChevronLeft />
      </button>
    );
  };

  const CustomNextArrow = (props: any) => {
    const { onClick, currentSlide, slideCount, slidesToShow } = props;
    if (currentSlide >= slideCount - slidesToShow) return null;
    return (
      <button className="nav-btn next" onClick={onClick} aria-label="Next">
        <FaChevronRight />
      </button>
    );
  };

  const settings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 1.1,
          slidesToScroll: 1,
          arrows: false,
          dots: true,
          centerMode: false,
          infinite: false,
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
                            <img src={cat.image_url} alt={cat.name} />
                            <img src={cat.hover_url} alt={cat.name} />
                          </div>
                          <div className="category-meta">
                            <h4>
                              {cat.name === "Herbal Hair Mask Powder" ? "Hair Mask Powder" : cat.name}
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
  @media (max-width: 576px) {
    .category-slide {
      width: 180% !important;
    }
  }
  
  .category-wrap {
    width: 100%;
    display: block;
    text-decoration: none !important;
  }

  &.category-part {
    padding: 4rem 0 !important;
    background-color: #f9fbf9;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2.5rem;
    padding: 0 10px;

    .subtitle {
        display: block;
        font-size: 0.8rem;
        font-weight: 800;
        color: var(--primary);
        letter-spacing: 2px;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
    }

    .title {
        font-size: 2.2rem;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0;
        text-transform: none;
    }
  }

  .slider-wrapper {
    position: relative;
    padding: 0;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 100;
    width: 44px;
    height: 44px;
    background: #ffffff;
    border: 1px solid #f0f0f0;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer;
    color: #1a1a1a;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 15px rgba(0,0,0,0.06);
    padding: 0;
    
    svg {
        font-size: 1rem;
    }

    &.prev { 
      left: -15px; 
    }
    &.next { 
      right: -15px; 
    }

    &:hover {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
      transform: translateY(-50%) scale(1.1);
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    }
    
    @media (max-width: 991px) {
      &.prev { left: -10px; }
      &.next { right: -10px; }
    }
  }

  .category-media {
    position: relative;
    width: 100%;
    margin: 0 auto;
    border-radius: 20px;
    overflow: hidden;
    aspect-ratio: 1/1;
    box-shadow: 0 8px 25px rgba(0,0,0,0.05);
    border: 1px solid #f0f0f0;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    img:last-child {
      opacity: 0;
      position: absolute;
      left: 0;
      top: 0;
      transform: scale(1.1);
    }

    &:hover {
      img:first-child {
        opacity: 0;
        transform: scale(0.9);
      }
      img:last-child {
        opacity: 1;
        transform: scale(1);
      }
    }

    @media (max-width: 576px) {
        border-radius: 20px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
  }

  .category-meta {
    margin-top: 15px;
    text-align: center;
    
    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #333;
      white-space: normal;
      text-align: center;
      
      @media (max-width: 576px) {
        font-size: 0.85rem; /* Better fit for 2.2 cards */
        font-weight: 600;
        margin-top: 8px;
        flex-wrap: nowrap;
        color: #333;
      }
      
      svg {
        font-size: 0.8rem;
        transition: transform 0.3s ease;
        
        @media (max-width: 576px) {
            display: inline-block;
            font-size: 0.7rem;
        }
      }
    }
  }

    @media (max-width: 576px) {
      margin-top: 15px;
      .section-header {
        margin-bottom: 2rem;
        .title { font-size: 1.6rem; }
        .subtitle { font-size: 0.75rem; }
      }
    }

  .category-wrap:hover .category-meta h4 svg {
    transform: translateX(5px);
  }

  /* Override Slick default dots */
  .slick-dots {
    bottom: -35px;
    li button:before {
      color: var(--primary);
      opacity: 0.25;
      font-size: 10px;
    }
    li.slick-active button:before {
      color: var(--primary);
      opacity: 1;
    }
  }
`;
