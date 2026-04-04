'use client';

import React from "react";
import { useState, useEffect } from "react";
import { API_PATH } from "../../constants";
import ProductCard from "../Shared/ProductCard";
import Link from "next/link";
import { ProductCardSkeleton } from "../Common/SkeletonComponents";

const Our1 = () => {
  const [handpickedProducts, setHandpickedProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch first 8 products ordered by ID
  useEffect(() => {
    setIsLoading(true);
    const postData = {
      extra_condition: " ORDER BY featured_order ASC LIMIT 8",
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    };

    fetch(`${API_PATH}/products/with-reviews`, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch featured products");
        }
        return response.json();
      })
      .then((data) => {
        setHandpickedProducts(data || []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching featured products:", error);
        setIsLoading(false);
      });
  }, []);

  return (
    <section className="section deals-part">
      <div className="container px-0">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-header text-center mb-5">
              <span className="subtitle">CURATED FOR YOU</span>
              <h2 className="title">Explore our Products</h2>
              <div className="title-divider"></div>
            </div>
          </div>
        </div>

        <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-4">
          {isLoading ? (
            Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : handpickedProducts.length > 0 ? (
            handpickedProducts.map((product, index) => (
              <ProductCard key={product.id ?? `product-${index}`} product={product} />
            ))
          ) : (
            <div className="col-12 text-center">
              <p>No products available.</p>
            </div>
          )}
        </div>
        <div className="row">
          <div className="col-lg-12">
            <div className="section-btn-25 mt-5">
              <Link href="/search?searchtext=all" className="btn-premium">
                <span>View All Products</span>
                <i className="fas fa-long-arrow-alt-right ms-2"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Our1;
