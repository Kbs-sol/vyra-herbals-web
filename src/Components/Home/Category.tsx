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
                    <img
                      src="https://vyraherbals.com/api/uploads/1.jpg"
                      alt="Hair Oil"
                    />
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
                    <img
                      src="https://vyraherbals.com/api/uploads/16.jpg"
                      alt="Comb"
                    />
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
                    <img
                      src="https://vyraherbals.com/api/uploads/14.jpg"
                      alt="Shampoo"
                    />
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
                    <img
                      src="https://vyraherbals.com/api/uploads/scalp_massager.jpg"
                      alt="Scalp Massager"
                    />
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
  .category-media {
    img:last-child {
      opacity: 0;
      position: absolute;
      left: 0;
      top: 0;
    }
    &:hover {
      img:first-child {
        opacity: 0;
      }
      img:last-child {
        opacity: 1;
      }
    }
    img {
      transition: all 0.5s ease-in-out;
    }
  }
`;
