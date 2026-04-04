'use client';

import React, { useEffect, useState } from "react";
import { API_PATH } from "../../constants";
import styled from "styled-components";
import LazyImage from "../Common/LazyImage";
import { usePathname, useRouter } from "next/navigation";
import LoadingIndicator from "../Common/LoadingIndicator";
import ReviewCard from "./ReviewCard";
import Pagination from "../Common/Pagination";
import Utility from "../../utils/UtilityFunctions";


const TestimonialPage = () => {
  const Tabs = { TextReviews: 1, ImageReviews: 2 };
  const [activeTab, setActiveTab] = useState(Tabs.TextReviews); // Active tab state
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const [testimonials, setTestimonials] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [selectedRating, setSelectedRating] = useState(0);
  const [beforeAfterImages, setBeforeAfterImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const reviewsPerPage = 8;

  const pathname = usePathname();
  const router = useRouter();

  // Handle tab switch
  const handleTabChange = (tab) => {
    if (tab === Tabs.TextReviews) router.push("/testimonials");
    else router.push("#images");
    setActiveTab(tab);
    setCurrentPage(1); // Reset page when switching tabs
  };

  // Get current testimonials for pagination
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = filteredReviews?.slice(
    indexOfFirstReview,
    indexOfLastReview
  );

  // Handle pagination
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#images") setActiveTab(Tabs.ImageReviews);
  }, [pathname]);

  useEffect(() => {
    setIsLoading(true);
    const postData = {
      tbl_name: "reviews",
      fields: "*, products(title, image_url)"
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
    fetch(`${API_PATH}/data`, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch testimonials");
        }
        return response.json();
      })
      .then((data) => {
        // Update the state with the fetched handpicked products data
        console.log("All Testimonials data:", data);
        setTestimonials(data);
        setFilteredReviews(data);
      })
      .catch((error) => {
        console.error("Error while fetching testimonials:", error);
      })
      .finally(() => setIsLoading(false));

    // Fetch dynamic before/after images
    const baData = { tbl_name: "before_after_images", status: 1 };
    fetch(`${API_PATH}/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBeforeAfterImages(data.map((item: any) => item.image_url));
        }
      })
      .catch((err) => console.error("Error fetching before/after images:", err));
  }, []);

  useEffect(() => {
    if (selectedRating === 0) {
      setFilteredReviews(testimonials);
    } else {
      setFilteredReviews(testimonials.filter((r: any) => Math.floor(r.rating) === selectedRating));
    }
    setCurrentPage(1);
  }, [selectedRating, testimonials]);

  return (
    <StyledReviews>
      <section className="disclaimer">
        <b>Authentic Reviews from Real Customers!</b>
        <p>
          We pride ourselves on genuine feedback—no fake reviews or stock images
          here.
        </p>
        <p>
          Each review is a heartfelt testimonial from our customers, given
          freely without any incentives.
        </p>
      </section>
      <section className="container tabs-container">
        <TabButton
          $active={activeTab === Tabs.TextReviews}
          onClick={() => handleTabChange(Tabs.TextReviews)}
        >
          Customer Testimonials
        </TabButton>
        <TabButton
          $active={activeTab === Tabs.ImageReviews}
          onClick={() => handleTabChange(Tabs.ImageReviews)}
        >
          Before & After Images
        </TabButton>
      </section>

      {activeTab === Tabs.TextReviews && (
        <section className="filter-container container">
            <div className="filter-label">Filter by Rating:</div>
            <div className="rating-filters">
                <button className={`filter-chip ${selectedRating === 0 ? 'active' : ''}`} onClick={() => setSelectedRating(0)}>All</button>
                {[5, 4, 3, 2, 1].map(star => (
                    <button 
                        key={star} 
                        className={`filter-chip ${selectedRating === star ? 'active' : ''}`} 
                        onClick={() => setSelectedRating(star)}
                    >
                        {star} ★
                    </button>
                ))}
            </div>
        </section>
      )}

      <section className="tab-content d-grid">
        {isLoading ? (
          <LoadingIndicator variant="circular" />
        ) : (
          <>
            {activeTab === Tabs.TextReviews ? (
              <>
                <section id="textReviewList" className="text-review-list row">
                  {/* List of customer testimonials in grid layout */}
                  {currentReviews.map((review, index) => (
                    <ReviewCard
                      review={review}
                      key={"review-card-" + index}
                      className={"card col-10 col-md-5"}
                    />
                  ))}
                </section>
                {/* Pagination */}
                <Pagination
                  totalPages={Math.ceil(filteredReviews.length / reviewsPerPage)}
                  onPageChange={paginate}
                  currentPage={currentPage}
                />
              </>
            ) : (
              <section className="image-reviews">
                {/* List of before & after images */}
                {beforeAfterImages.map((src, index) => (
                  <div className="image-wrapper" key={index}>
                    <LazyImage src={src} alt={`Before & After ${index + 1}`} />
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </section>
    </StyledReviews>
  );
};

export default TestimonialPage;

const TabButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  background-color: ${(props) =>
    props.$active ? "var(--btn-green)" : "var(--primary)"};
  box-shadow: ${(props) =>
    props.$active ? "0px 0px 4px 4px #888888" : "none"};
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  &:hover {
    background-color: var(--btn-green);
    color: white;
  }
`;

const StyledReviews = styled.section`
  margin-top: 2rem;
  .disclaimer {
    text-align: center;
    margin-bottom: 2rem;
  }
  .tabs-container {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
    padding-right: 1.6rem;
    gap: 3rem;
  }
  .filter-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;

      .filter-label {
          font-weight: 700;
          color: #444;
          font-size: 0.9rem;
          text-transform: uppercase;
      }

      .rating-filters {
          display: flex;
          gap: 0.5rem;
      }

      .filter-chip {
        padding: 0.4rem 1.2rem;
        border-radius: 2rem;
        border: 1px solid #ddd;
        background: white;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            border-color: var(--primary);
            color: var(--primary);
        }

        &.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
      }
  }
  .tab-content {
    justify-items: center;
    .text-review-list {
      justify-content: center;
      gap: 1rem;
      width: 100%;
      .card {
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: 8px;
        color: #333;
        .card-title {
          margin: 0;
          font-size: 14px;
          font-weight: bold;
        }
        .reviewer-text {
          font-size: 14px;
          color: #555;
        }
      }
    }
    .image-reviews {
      display: grid;
      grid-template-columns: repeat(4, minmax(100px, 1fr));
      width: 80%;
      margin: 1rem auto;
      gap: 1rem;
      .image-wrapper {
        border: 1px solid var(--border);
        border-radius: 1rem;
        overflow: hidden;
        img {
          width: 100%;
          height: auto;
          border-radius: 5px;
        }
      }
    }
  }

  /* sm: 480px,
  md: 768px,
  lg: 1024px */

  @media screen and (max-width: 768px) {
    .tab-content {
      .image-reviews {
        grid-template-columns: repeat(3, minmax(100px, 1fr));
      }
    }
  }
  @media screen and (max-width: 480px) {
    .disclaimer {
      p {
        margin: 0.6rem 0;
      }
    }
    .tab-content {
      .image-reviews {
        width: 94%;
        grid-template-columns: repeat(2, minmax(100px, 1fr));
      }
    }
  }
`;