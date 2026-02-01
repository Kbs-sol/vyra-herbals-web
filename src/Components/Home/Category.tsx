'use client';

import React from "react";
import { FaArrowRight } from "react-icons/fa6";
import Link from "next/link";
import styled from "styled-components";

const Category = () => {
  return (
    <StyledCategories className="section category-part pt-4 pb-4">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="section-heading">
              <h2>shop by categories</h2>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-lg-12">
            <div className="category-slider slider-arrow d-flex">
              <div className="category-wrap">
                <Link href="/category/hair-oil">
                  <div className="category-media">
                    <img src="/assets/images/cat/oil.jpg" alt="category" />
                    <img src="/home-hair-oil.jpg" alt="Hair Oil" />
                  </div>
                  <div className="category-meta">
                    <h4>
                      Hair Oil
                      <FaArrowRight />
                    </h4>
                    {/* <p>(25 items)</p> */}
                  </div>
                </Link>
              </div>

              <div className="category-wrap">
                <Link href="/category/combs">
                  <div className="category-media">
                    <img src="/assets/images/cat/coomb.jpg" alt="category" />
                    <img src="/home-neem-comb.jpg" alt="Comb" />
                  </div>
                  <div className="category-meta">
                    <h4>
                      Neem Combs <FaArrowRight />
                    </h4>
                  </div>
                </Link>
              </div>
              <div className="category-wrap">
                <Link href="/category/shampoo">
                  <div className="category-media">
                    <img src="/assets/images/cat/shampoo.jpg" alt="category" />
                    <img src="/home-shampoo.jpg" alt="Shampoo" />
                  </div>
                  <div className="category-meta">
                    <h4>
                      Shampoo <FaArrowRight />
                    </h4>
                  </div>
                </Link>
              </div>
              <div className="category-wrap">
                <Link href="/category/scalp-massager">
                  <div className="category-media">
                    <img src="/assets/images/cat/scalp.jpg" alt="category" />
                    <img src="/home-scalp-massager.jpg" alt="Scalp Massager" />
                  </div>
                  <div className="category-meta">
                    <h4>
                      Scalp Massager
                      <FaArrowRight />
                    </h4>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StyledCategories>
  );
};

export default Category;

const StyledCategories = styled.section`
  .category-wrap {
    transition: transform 0.3s ease;
    &:hover {
      transform: translateY(-5px);
    }
  }

  .category-media {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 1/1;
    
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
      gap: 8px;
      color: #333;
      
      svg {
        font-size: 0.9rem;
        transition: transform 0.3s ease;
      }
    }
  }

  .category-wrap:hover .category-meta h4 svg {
    transform: translateX(5px);
  }
`;
