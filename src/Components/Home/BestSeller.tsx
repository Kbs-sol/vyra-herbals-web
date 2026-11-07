'use client';

import React, { useState, useEffect } from "react";
import { API_PATH } from "../../constants";
import ProductCard2 from "../Shared/ProductCard2";
import { ProductCard2Skeleton } from "../Common/SkeletonComponents";
import { STATIC_PRODUCTS } from "../../utils/staticCatalogue";

const BestSeller = () => {
  const [bestsellers, setBestsellers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBestsellers = async () => {
      try {
        setIsLoading(true);
        const featuredRes = await fetch('/api/featured');
        const featuredData = await featuredRes.json();

        let targetIds: number[] = [];
        if (featuredData.success && Array.isArray(featuredData.data) && featuredData.data.length > 0) {
          targetIds = featuredData.data
            .sort((a: any, b: any) => a.position - b.position)
            .filter((item: any) => item.product_id)
            .map((item: any) => item.product_id);
        }

        const postData = targetIds.length > 0
          ? { ids: targetIds }
          : { extra_condition: " ORDER BY id ASC LIMIT 4" };

        const response = await fetch(`${API_PATH}/products/with-reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postData),
        });

        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setBestsellers(data);
        } else {
          // Fallback to top curated static combo & oil bestsellers
          setBestsellers(STATIC_PRODUCTS.slice(0, 4));
        }
      } catch (error) {
        console.warn("DB offline or empty, falling back to static catalogue for Best Sellers:", error);
        setBestsellers(STATIC_PRODUCTS.slice(0, 4));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBestsellers();
  }, []);

  return (
    <section className="section feature-part pt-4 pb-4">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-header text-center mb-4">
              <span className="subtitle">CUSTOMER PROVEN</span>
              <h2 className="title">Best Sellers / Popular Now</h2>
            </div>
          </div>
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <ProductCard2Skeleton key={i} />)
          ) : (
            bestsellers.map((product, index) => (
              <ProductCard2 key={product.id ?? `best-${index}`} product={product} />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default BestSeller;
