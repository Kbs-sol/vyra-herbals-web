'use client';

import React from "react";
import { useState, useEffect } from "react";
import { API_PATH } from "../../constants";
import ProductCard from "../Shared/ProductCard";
import Link from "next/link";

// Inline lightweight loader instead of full-screen loader
const InlineLoader = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <div style={{ 
      width: '40px', 
      height: '40px', 
      border: '3px solid #f3f3f3',
      borderTop: '3px solid var(--primary, #064d35)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto'
    }} />
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

const Our1 = () => {
  const [handpickedProducts, setHandpickedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Fetch first 8 products ordered by ID
  useEffect(() => {
    setIsLoading(true);
    const postData = {
      extra_condition: " ORDER BY id ASC LIMIT 8",
      // Don't filter by specific IDs - fetch first 8 products
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
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-heading">
              <h2>Explore our Products</h2>
            </div>
          </div>
        </div>

        <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-4">
          {isLoading ? (
            <div className="col-12 text-center">
              <InlineLoader />
            </div>
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
            <div className="section-btn-25">
              <Link href="/search?searchtext=all" className="btn btn-inline">
                <i className="fas fa-eye"></i>
                <span>View All Products</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Our1;
