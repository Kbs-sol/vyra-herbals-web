'use client';

import React from "react";
import { API_PATH } from "../../constants";
import { useState, useEffect } from "react";
import ProductCard2 from "../Shared/ProductCard2";

const BestSeller = () => {
  const [handpickedProducts, setHandpickedProducts] = useState([]);
  // Fetch first 4 best seller products
  useEffect(() => {
    const postData = {
      extra_condition: " ORDER BY id ASC LIMIT 4",
      // Fetch first 4 products - don't filter by specific IDs
    };

    // Define the fetch options
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    };

    // Fetch products with reviews
    fetch(`${API_PATH}/products/with-reviews`, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch best seller products");
        }
        return response.json();
      })
      .then((data) => {
        setHandpickedProducts(data);
      })
      .catch((error) => {
        console.error("Error fetching best seller products:", error);
      });
  }, []);

  return (
    <section className="section feature-part pt-4 pb-4">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            <div className="section-heading">
              <h2>Best Sellers / Popular Now </h2>
            </div>
          </div>
        </div>

        <div className="row row-cols-1 row-cols-md-1 row-cols-lg-2 row-cols-xl-2">
          {handpickedProducts.length > 0
            ? handpickedProducts.map((product) => (
                <ProductCard2 key={product.id} product={product} />
              ))
            : null}
        </div>
      </div>
    </section>
  );
};

export default BestSeller;
