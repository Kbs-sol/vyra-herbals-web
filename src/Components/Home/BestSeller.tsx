'use client';

import React from "react";
import { useState, useEffect } from "react";
import ProductCard2 from "../Shared/ProductCard2";

const BestSeller = () => {
  const [handpickedProducts, setHandpickedProducts] = useState([]);
  // Fetch handpicked products data from your API
  useEffect(() => {
    const postData = {
      tbl_name: "products",
      extra_condition: " ORDER BY id DESC LIMIT 4", // Assuming productId is already defined in your component
      // Add other data properties as needed
      ids: [4, 6, 7, 2],
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
    // fetch(`${API_PATH}/get.php`, requestOptions)
    // fetch("https://vyraherbals.com/api/get.php", requestOptions)
    fetch(
      "https://vyraherbals.com/api/get_products_with_reviews.php",
      requestOptions
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch handpicked products");
        }
        return response.json();
      })
      .then((data) => {
        // Update the state with the fetched handpicked products data
        setHandpickedProducts(data);
      })
      .catch((error) => {
        console.error("Error fetching handpicked products:", error);
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
