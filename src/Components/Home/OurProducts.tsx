'use client';

import React from "react";
import { useState, useEffect } from "react";
import { API_PATH } from "../../constants";
import ProductCard from "../Shared/ProductCard";
import Loader from "../Loader";
import Link from "next/link";

const Our1 = () => {
  const [handpickedProducts, setHandpickedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Fetch handpicked products data from your API
  useEffect(() => {
    setIsLoading(true);
    const postData = {
      tbl_name: "products",
      extra_condition: " ORDER BY id DESC LIMIT 8", // Assuming productId is already defined in your component
      // Add other data properties as needed
      ids: [2, 1, 18, 13, 16, 15, 3, 17],
    };

    // Define the fetch options
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Specify the content type as JSON
      },
      body: JSON.stringify(postData), // Convert the data to JSON format
    };

    // Replace the placeholder URL with your actual API endpoint
    fetch(`${API_PATH}/products/with-reviews`, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch handpicked products");
        }
        return response.json();
      })
      .then((data) => {
        // Update the state with the fetched handpicked products data
        setHandpickedProducts(data || []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching handpicked products:", error);
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
              <Loader />
            </div>
          ) : handpickedProducts.length > 0 ? (
            handpickedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
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
