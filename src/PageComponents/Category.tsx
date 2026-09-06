"use client";
import React, { useState, useEffect } from "react";
import type { Product } from "@/types";
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
  const params = useParams();
  const categoryName = String(params?.categoryName ?? '');
  const [categoryData, setCategoryData] = useState<Product[]>([]);
  const [filteredData, setFilteredData] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState('price-low-high');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);

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
        // Set initial price range based on products
        if (data.products && data.products.length > 0) {
          const prices = data.products.map(p => parseInt(p.price) || 0);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          setMinPrice(min);
          setMaxPrice(max);
          setPriceRange([min, max]);
        }
      })
      .catch((error) => {
        console.error("Error fetching category data:", error);
      });
  }, [categoryName]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...categoryData];

    // Apply price range filter
    filtered = filtered.filter((product) => {
      const price = Number(product.price) || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Apply sorting
    switch (sortBy) {
      case 'price-low-high':
        filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case 'price-high-low':
        filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        );
        break;
      default:
        break;
    }

    setFilteredData(filtered);
  }, [categoryData, sortBy, priceRange]);

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

      {/* Filter and Sort Section */}
      <section className="pt-3 pb-3 filter-section">
        <div className="container">
          <div className="filter-controls">
            <FilterContainer>
              {/* Sort Dropdown */}
              <FilterGroup>
                <label htmlFor="sort-select">Sort By:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest First</option>
                </select>
              </FilterGroup>

              {/* Price Range Filter */}
              <FilterGroup>
                <label htmlFor="min-price">Min Price:</label>
                <input
                  id="min-price"
                  type="number"
                  min={minPrice}
                  max={maxPrice}
                  value={priceRange[0]}
                  onChange={(e) =>
                    setPriceRange([Math.max(minPrice, parseInt(e.target.value) || 0), priceRange[1]])
                  }
                  className="filter-input"
                />
              </FilterGroup>

              <FilterGroup>
                <label htmlFor="max-price">Max Price:</label>
                <input
                  id="max-price"
                  type="number"
                  min={minPrice}
                  max={maxPrice}
                  value={priceRange[1]}
                  onChange={(e) =>
                    setPriceRange([priceRange[0], Math.min(maxPrice, parseInt(e.target.value) || maxPrice)])
                  }
                  className="filter-input"
                />
              </FilterGroup>

              {/* Reset Filters Button */}
              <FilterGroup className="reset-group">
                <button
                  onClick={() => {
                    setSortBy('price-low-high');
                    setPriceRange([minPrice, maxPrice]);
                  }}
                  className="reset-btn"
                >
                  Reset Filters
                </button>
              </FilterGroup>

              {/* Results Count */}
              <FilterGroup className="results-count">
                <span>{filteredData.length} products found</span>
              </FilterGroup>
            </FilterContainer>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="pt-3 pb-3">
        <div className="container">
          <div className="row row-cols-1 row-cols-md-1 row-cols-lg-2 row-cols-xl-2">
            {filteredData.length > 0 ? (
              filteredData.map((product) => (
                <ProductCard2 key={product.id} product={product} />
              ))
            ) : categoryData.length === 0 ? (
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
            ) : (
              <div className="no-products">
                <p>No products found matching your filters.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Category;

const PlaceholderImage = styled(StyledProductCard2)``;

const FilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    gap: 12px;
    padding: 15px;
  }

  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: stretch;
    gap: 8px;
    padding: 10px;

    & > *:first-child {
      grid-column: 1 / -1;
    }
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    font-size: 14px;
  }

  .filter-select,
  .filter-input {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    background-color: white;
    cursor: pointer;
    transition: border-color 0.3s ease;

    &:hover {
      border-color: #b8a877;
    }

    &:focus {
      outline: none;
      border-color: #b8a877;
      box-shadow: 0 0 0 2px rgba(184, 168, 119, 0.1);
    }
  }

  .filter-input {
    width: 90px;
  }

  .reset-btn {
    padding: 8px 16px;
    background-color: #b8a877;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.3s ease;
    white-space: nowrap;

    &:hover {
      background-color: #9a8a60;
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &.results-count {
    margin-left: auto;
    font-size: 14px;
    color: #666;
    font-weight: 500;

    @media (max-width: 768px) {
      margin-left: 0;
      justify-content: center;
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    flex-wrap: wrap;
    gap: 6px;

    label {
      font-size: 12px;
    }

    .filter-select,
    .filter-input {
      flex: 1;
      min-width: 0;
      padding: 6px 8px;
      font-size: 13px;
    }

    &.reset-group,
    &.results-count {
      grid-column: 1 / -1;
    }

    .reset-btn {
      width: 100%;
    }
  }
`;

