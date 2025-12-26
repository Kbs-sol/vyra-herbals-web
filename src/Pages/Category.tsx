"use client";
import React, { useState, useEffect } from "react";
import { FaShoppingCart } from "react-icons/fa";
// import { FaHeart } from "react-icons/fa";
import { FaStar } from "react-icons/fa";

import { IoIosArrowBack } from "react-icons/io";
import { IoIosArrowForward } from "react-icons/io";

import { IoMdHome } from "react-icons/io";

import Slider from "react-slick";
import ProductCard2, {
  StyledProductCard2,
} from "../Components/Shared/ProductCard2";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_PATH } from "../constants";
import SEOComponent from "../Components/Shared/SEOComponent";
import LazyImage from "../Components/Common/LazyImage";
import styled from "styled-components";

const Category = () => {
  const { categoryName } = useParams();
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    // Fetch category data from API
    fetch(`${API_PATH}/products/by-category`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category_name: categoryName.toLowerCase().replace(/\s+/g, "-"),
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch category data");
        }
        return response.json();
      })
      .then((data) => {
        setCategoryData(data.products);
      })
      .catch((error) => {
        console.error("Error fetching category data:", error);
      });
  }, [categoryName]);

  function SampleNextArrow(props) {
    const { className, style, onClick } = props;
    return (
      <div className="right_icon">
        <IoIosArrowForward
          color="black"
          // className={className}
          style={{
            ...style,
            display: "block",
          }}
          onClick={onClick}
          size={50}
        />
      </div>
    );
  }

  function SamplePrevArrow(props) {
    const { className, style, onClick } = props;
    return (
      <div className="left_icon">
        <IoIosArrowBack
          color="black"
          // className={className}
          style={{
            ...style,
            display: "block",
          }}
          onClick={onClick}
          size={50}
        />
      </div>
    );
  }

  const settings = {
    className: "center",
    infinite: true,
    centerPadding: "600px",
    slidesToShow: 4,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
    swipeToSlide: true,
    autoplay: true,
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />,
  };

  return (
    <>
      <SEOComponent title={`${categoryName} category results`} />

      <section className="bredcum_out">
        <div className="container">
          <div className="breadcrumbs">
            <ul className="items d-flex">
              <li className="item home">
                <Link href="/" title="Go to Home Page">
                  <IoMdHome />
                </Link>
              </li>
              <li>/</li>
              <li className="item cms_page">
                <strong>Shop</strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="pt-3 pb-3">
        <div className="container">
          <div className="row row-cols-1 row-cols-md-1 row-cols-lg-2 row-cols-xl-2">
            {categoryData.length > 0 ? (
              categoryData.map((product) => (
                <ProductCard2 key={product.id} product={product} />
              ))
            ) : (
              <>
                {[1, 2, 3, 4].map((k) => (
                  <PlaceholderImage key={"placeholder-product-" + k}>
                    <div className="feature-card">
                      <div className="feature-media">
                        <div className="feature-image">
                          <LazyImage alt="placeholder" />
                        </div>
                      </div>
                      <div className="feature-content">
                        <h6 className="feature-name">Loading...</h6>
                      </div>
                    </div>
                  </PlaceholderImage>
                ))}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Category;

const PlaceholderImage = styled(StyledProductCard2)``;
