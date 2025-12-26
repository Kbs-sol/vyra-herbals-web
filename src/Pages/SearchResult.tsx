"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { API_PATH } from "../constants";
import ProductCard, { StyledProduct } from "../Components/Shared/ProductCard";
import SEOComponent from "../Components/Shared/SEOComponent";
import LazyImage from "../Components/Common/LazyImage";
import styled from "styled-components";
import BestSeller from "../Components/Home/BestSeller";

const SearchResult = () => {
  const [searchResults, setSearchResults] = useState(null);
  const searchParams = useSearchParams();
  const word = searchParams.get("searchtext") || "all";
  //   let searchHeading = `Search Results for ${word}`;
  const [searchHeading, setSearchHeading] = useState("Searching...");
  const [isLoading, setIsLoading] = useState(true);

  // Call search API with the search term
  // Replace 'https://example.com/api/search' with your actual search API endpoint
  // Fetch handpicked products data from your API

  useEffect(() => {
    let extraCondition = "";
    if (word !== "all") {
      extraCondition = ` AND title LIKE '%${word}%'`;
    }

    let postData = {
      tbl_name: "products",
      extra_condition: extraCondition,
      // Add other data properties as needed
    };

    if (word === "all") {
      postData = {
        tbl_name: "products",
        // new_query: "SELECT products.*, reviews.* FROM products JOIN reviews ON reviews.product_id = products.id;",
        new_query: `
        SELECT 
            products.*, 
            COUNT(reviews.id) AS reviews_count, 
            AVG(reviews.rating) AS rating_average
        FROM 
            products
        LEFT JOIN 
            reviews ON reviews.product_id = products.id
        GROUP BY 
            products.id;
        `,
      };
    }

    // Define the fetch options
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Specify the content type as JSON
      },
      body: JSON.stringify(postData), // Convert the data to JSON format
    };

    setIsLoading(true);
    // Replace the placeholder URL with your actual API endpoint
    fetch(`${API_PATH}/data`, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch handpicked products");
        }
        return response.json();
      })
      .then((data) => {
        console.log(data);
        // Update the state with the fetched handpicked products data
        setSearchResults(data);
        if (word == "all") {
          setSearchHeading("Explore our Products");
        } else {
          if (data.length <= 0) {
            setSearchHeading(`No search results for "${word}"`);
          } else {
            setSearchHeading(`Search Results for "${word}"`);
          }
        }
      })
      .catch((error) => {
        console.error("Error fetching handpicked products:", error);
        setSearchResults(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [word]);

  useEffect(() => {
  window.scrollTo(0, 0);
}, [word]);

  return (
    <StyledSearchResult>
      <SEOComponent
        title={word == "all" ? "All Products" : `Search results for ${word}`}
        description={`Search results for ${word} from Vyra Herbals`}
      />
      <section className="section deals-part">
        <div
          className={`container ${searchResults !== null && searchResults.length === 0 ? "mt-5 pt-5" : ""}`}
        >
          <div className="row">
            <div className="col-lg-12">
              <div className="section-heading search-head">
                <h2>{searchHeading}</h2>
                {searchResults !== null && searchResults.length === 0 && (
                  <h4 className="text-center">
                    We think you will like our recommendations below.
                  </h4>
                )}
              </div>
            </div>
          </div>

          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-4">
            {searchResults && !isLoading ? (
              searchResults.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <>
                {[1, 2, 3, 4].map((k) => (
                  <PlaceholderImage key={"placeholder-product-" + k}>
                    <div className="product-card">
                      <div className="product-media">
                        <div className="product-image">
                          <LazyImage />
                        </div>
                      </div>
                      <div className="product-content">
                        <h6 className="product-name">Loading...</h6>
                        <div className="product-rating">...</div>
                        <h6 className="product-price">
                          <span>₹₹₹₹</span>
                        </h6>
                        <div className="product-add"> loading </div>
                      </div>
                    </div>
                  </PlaceholderImage>
                ))}
              </>
            )}
          </div>
        </div>
        {searchResults !== null && searchResults.length === 0 && <BestSeller />}
      </section>
    </StyledSearchResult>
  );
};

export default SearchResult;

const PlaceholderImage = styled(StyledProduct)`
  .product-name {
    width: 100%;
    color: var(--sub-heading);
    font-size: 17px;
  }
  .product-card {
    .product-image {
      display: inline-block;
    }
    &:hover .product-add {
      background: var(--border);
      cursor: default;
      color: var(--heading);
    }
  }
`;

const StyledSearchResult = styled.section`
  .feature-part {
    margin-top: 10rem;
    border-top: 1px solid var(--gray-chalk);
  }
`;
