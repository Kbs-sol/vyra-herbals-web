'use client';

import React, { useState, useEffect } from "react";
import { API_PATH } from "../../constants";
import ProductCard from "../Shared/ProductCard";
import Link from "next/link";
import { ProductCardSkeleton } from "../Common/SkeletonComponents";
import { STATIC_PRODUCTS } from "../../utils/staticCatalogue";

const OurProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const postData = {
      extra_condition: " ORDER BY featured_order ASC LIMIT 8",
    };

    fetch(`${API_PATH}/products/with-reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        } else {
          // Graceful fallback to static catalogue when DB is not yet populated
          setProducts(STATIC_PRODUCTS.slice(0, 8));
        }
      })
      .catch((err) => {
        console.warn("DB offline or empty, falling back to static catalogue:", err);
        // Fallback to static snapshot so design & review never break
        setProducts(STATIC_PRODUCTS.slice(0, 8));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <section className="section deals-part">
      <div className="container px-0">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-header text-center mb-4">
              <span className="subtitle">100% PLANT-BASED FORMULATIONS</span>
              <h2 className="title">Explore Our Products</h2>
            </div>
          </div>
        </div>

        <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
          {isLoading ? (
            Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : (
            products.map((product, index) => (
              <ProductCard
                key={product.id ?? `product-${index}`}
                product={product}
                isImageLazy={index >= 4}
              />
            ))
          )}
        </div>

        <div className="row">
          <div className="col-lg-12 text-center mt-4">
            <Link href="/search?searchtext=all" className="hero-btn-solid d-inline-block">
              VIEW ALL FORMULATIONS →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurProducts;
