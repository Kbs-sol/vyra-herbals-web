'use client';

import React from "react";
import { API_PATH } from "../../constants";
import { useState, useEffect } from "react";
import ProductCard2 from "../Shared/ProductCard2";
import { ProductCard2Skeleton } from "../Common/SkeletonComponents";

import { Product } from "@/types";

const BestSeller = () => {
  const [handpickedProducts, setHandpickedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch first 4 best seller products
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setIsLoading(true);
        // 1. Fetch featured selection
        const featuredRes = await fetch('/api/featured');
        const featuredData = await featuredRes.json();

        let targetIds: number[] = [];

        if (featuredData.success && Array.isArray(featuredData.data) && featuredData.data.length > 0) {
          // Sort by position and extract product_ids
          const sortedItems = featuredData.data
            .sort((a: any, b: any) => a.position - b.position)
            .filter((item: any) => item.product_id); // Filter out empty slots

          targetIds = sortedItems.map((item: any) => item.product_id);
        }

        // 2. Fetch products details
        let postData: any = {};

        if (targetIds.length > 0) {
          postData = { ids: targetIds };
        } else {
          // Fallback to default behavior if no featured products selected
          postData = { extra_condition: " ORDER BY id ASC LIMIT 4" };
        }

        const requestOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postData),
        };

        const response = await fetch(`${API_PATH}/products/with-reviews`, requestOptions);
        if (!response.ok) throw new Error("Failed to fetch products");

        const data = await response.json();

        // 3. If we used targetIds, we need to sort the result to match the ID order
        // because SQL 'IN' clause doesn't guarantee order
        if (targetIds.length > 0) {
          const sortedData = targetIds
            .map(id => data.find((p: any) => p.id === id))
            .filter(p => !!p); // Remove any undefined (e.g. if product was deleted)
          setHandpickedProducts(sortedData as any);
        } else {
          setHandpickedProducts(data);
        }

      } catch (error) {
        console.error("Error fetching featured products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <section className="section feature-part pt-4 pb-4">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-header text-center mb-5">
              <span className="subtitle">POPULAR PICKS</span>
              <h2 className="title">Best Sellers / Popular Now</h2>
              <div className="title-divider"></div>
            </div>
          </div>
        </div>

        <div className="row row-cols-1 row-cols-md-1 row-cols-lg-2 row-cols-xl-2">
          {isLoading ? (
            Array(2).fill(0).map((_, i) => <ProductCard2Skeleton key={i} />)
          ) : handpickedProducts.length > 0 ? (
            handpickedProducts.map((product, index) => (
              <ProductCard2 key={product.id ?? `bestseller-${index}`} product={product} />
            ))
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default BestSeller;
