"use client";

import React, { useState } from "react";
import { API_PATH } from "../../constants";
import styled from "styled-components";
import StarRatings from "../Common/StarRatings";
import SVGIcon from "../Common/SVGIcon";

const AddReview = ({ reviewProductId, ratingDetails, onAddSuccess }) => {
  const [rating, setRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [hasValidation, sethasvalidation] = useState(false);

  const handleRatingClick = (ratingValue) => {
    setRating(ratingValue);
  };

  const cleanUp = () => {
    setIsFormVisible(false);
    setReviewerName("");
    setRating(0);
    setReviewBody("");
    sethasvalidation(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Hi", rating, reviewerName, reviewBody);
    sethasvalidation(true);
    const payload = {
      tbl_name: "reviews",
      data: {
        product_id: reviewProductId,
        rating: rating,
        reviewer_name: reviewerName,
        review_text: reviewBody,
      },
    };

    if (rating > 0 && reviewerName && reviewBody) {
      try {
        const response = await fetch(`${API_PATH}/reviews/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const result = await response.json();
        console.log("Response from server:", result);
        if (result && result.success) {
          // Prefer returned inserted row
          const inserted = Array.isArray(result.data) ? result.data[0] : (result.data && result.data[0]) || result.data;
          onAddSuccess?.(inserted);
        }
        setSubmitted(true);
        cleanUp();
      } catch (error) {
        console.error("Failed to submit the review:", error);
      }
    }

    // setSubmitted(true);
  };

  const renderErrorMsg = (msg) => {
    return (
      <div className="error-msg">
        <SVGIcon iconName={"error-icon"} />
        {msg}
      </div>
    );
  };

  return (
    <ReviewContainer>
      <h2>Customer Reviews</h2>
      <section className="rating-section d-flex gap-4 flex-column flex-lg-row">
        {!!ratingDetails.stats ? (
          <>
            <RatingSummary>
              <div className="rating-indicator">
                <StarRatings rating={ratingDetails.average} />
                <span className="rating-text">
                  {ratingDetails.average} out of 5
                </span>
              </div>
              <div>Based on {ratingDetails.count} reviews</div>
            </RatingSummary>

            <Histogram>
              {[5, 4, 3, 2, 1].map((star, index) => (
                <div key={index} className="histogram-row">
                  <div className="rating-indicator">
                    <StarRatings rating={star} />
                  </div>
                  <div className="bar">
                    <div
                      style={{
                        width: `${(ratingDetails.stats[star] * 100) / ratingDetails.count}%`,
                      }}
                    ></div>
                  </div>
                  <div className="frequency">
                    {ratingDetails.stats[star]} reviews
                  </div>
                </div>
              ))}
            </Histogram>
          </>
        ) : (
          <h5>
            No Reviews yet. You'll be the first to review this product. Please
            add your review
          </h5>
        )}
        <button
          className="review-button"
          type="submit"
          onClick={() => {
            setSubmitted(false);
            setIsFormVisible((prev) => !prev);
            if (isFormVisible) cleanUp();
          }}
        >
          {!isFormVisible ? "Write a review" : "Cancel Review"}
        </button>
      </section>

      {isFormVisible && !submitted && (
        <ReviewForm onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Rating</label>
            <div className="rating-indicator">
              <StarRatings
                rating={rating}
                onChange={(rate) => {
                  handleRatingClick(rate);
                }}
              />
            </div>
            {hasValidation &&
              !(rating > 0) &&
              renderErrorMsg("Please give your Rating")}
          </div>
          <div className="form-field">
            <label>Name</label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Enter your name"
            />
            {hasValidation &&
              reviewerName === "" &&
              renderErrorMsg("Please enter your Name")}
          </div>
          <div className="form-field">
            <label>Review</label>
            <textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="Write your comments here"
            ></textarea>
            {hasValidation &&
              reviewBody === "" &&
              renderErrorMsg("Please add your Comments")}
          </div>

          <button type="submit">Submit Review</button>
        </ReviewForm>
      )}
      {submitted && (
        <section className="message">
          <div className="thanks">Thanks for your review!</div>
          <div className="info">
            **Your review will be published once verified**
          </div>
        </section>
      )}
    </ReviewContainer>
  );
};

export default AddReview;

const ReviewContainer = styled.section`
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  /* font-family: "Arial", sans-serif; */
  h2 {
    font-size: 24px;
    margin-bottom: 10px;
    color: #333;
    text-align: center;
  }

  .form-field {
    &:has(.error-msg) {
      input,
      textarea {
        border-color: #dc3545;
      }
    }
    .error-msg {
      color: red;

      display: flex;
      align-items: center;
      svg {
        margin-right: 0.2rem;
        stroke: red;
      }
    }
  }

  .rating-section {
    align-items: center;
    justify-content: center;
    .review-button {
      background-color: #000;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      width: 20%;
      height: 3rem;
    }
  }

  .message {
    text-align: center;
    font-size: 18px;
    margin-top: 20px;
    .thanks {
      font-size: 1.2rem;
      font-weight: bold;
      color: var(--green);
    }
    .info {
      font-size: 0.8rem;
    }
  }
  @media screen and (max-width: 992px) {
    .rating-indicator {
      .star {
        margin-right: 0;
      }
    }
    .rating-section {
      .review-button {
        width: 100%;
      }
    }
  }
`;

const RatingSummary = styled.div`
  .rating-text {
    font-size: 18px;
    color: #666;
  }
`;

const Histogram = styled.div`
  padding: 0 1rem;
  flex-grow: 1;
  @media screen and (max-width: 992px) {
    width: 100%;
  }
  .histogram-row {
    display: flex;
    align-items: center;
    margin-bottom: 10px;

    .bar {
      flex: 1;
      height: 8px;
      background-color: #e0e0e0;
      margin-left: 10px;
      border-radius: 4px;

      & > div {
        height: 100%;
        background-color: var(--btn-green);
        border-radius: 4px;
      }
    }

    .frequency {
      margin-left: 10px;
      font-size: 14px;
      color: #666;
    }
  }
`;

const ReviewForm = styled.form`
  background-color: white;
  padding: 20px;
  margin-top: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .rating-indicator {
    .star svg {
      height: 1.2rem;
      width: 1.2rem;
    }
  }

  .form-field {
    margin-bottom: 20px;

    label {
      font-size: 16px;
      margin-bottom: 5px;
      display: block;
      color: #333;
    }

    input,
    textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      &::placeholder {
        font-size: 12px;
      }
    }

    textarea {
      resize: vertical;
    }
  }

  button {
    background-color: var(--btn-green);
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;

    &:hover {
      background-color: var(--primary);
    }
  }
`;
