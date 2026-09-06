'use client';

import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import styled from "styled-components";
import StarRatings from "../Common/StarRatings";
import EllipsisControl from "../Common/EllipsisControl";
import Utility from "../../utils/UtilityFunctions";

const ReviewCard = ({ review, className }) => {
  const [showModal, setShowModal] = useState(false);

  const onModalClose = () => {
    setShowModal(false);
  };
  return (
    <>
      <StyledReviewCard className={className} key={"review" + review.id}>
        <div className="card-body">
          <div className="card-head">
            <div className="avatar">
              {review.image ? (
                <img src={review.image} alt={review.reviewer_name || 'Avatar'} />
              ) : (
                <span>{(review.reviewer_name || 'A').charAt(0)}</span>
              )}
            </div>
            <div className="card-info">
              <div className="card-title-row">
                <span className="reviewer-name">{review.reviewer_name || "Anonymous"}</span>
                <span className="review-date">
                  {Utility.formatDate(review.created_at)}
                </span>
              </div>
              {review.products && (
                <div className="product-info-mini">
                  <img src={review.products.image_url} alt={review.products.title} className="product-thumb-min" />
                  <span className="product-name-min">{review.products.title}</span>
                </div>
              )}
              <StarRatings rating={review.rating} className={"rating"} />
            </div>
          </div>

          <div className="reviewer-text">
            <EllipsisControl
              lines={2}
              text={review.review_text}
              showReadMore={true}
              onReadClick={() => setShowModal(true)}
            />
          </div>
        </div>
      </StyledReviewCard>
      {/* ... modal remains same ... */}

      <StyledModal show={showModal} onHide={onModalClose}>
        <Modal.Header closeButton style={{ backgroundColor: "white" }}>
          <Modal.Title>
            <EllipsisControl
              text={"Review posted by " + (review.reviewer_name || "Anonymous")}
            />
            {review.products && (
               <div className="product-info-mini modal-prod">
                  <img src={review.products.image_url} alt={review.products.title} className="product-thumb-min" />
                  <span className="product-name-min">{review.products.title}</span>
                </div>
            )}
            <StarRatings rating={review.rating} className={"rating"} />
            <span className="review-date">
              {Utility.formatDate(review.created_at)}
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{ backgroundColor: "white" }}
          className="customScrollbar"
        >
          {review.review_text}
        </Modal.Body>
      </StyledModal>
    </>
  );
};

export default ReviewCard;

const StyledReviewCard = styled.section`
  .card-body {
    padding-bottom: 2rem;
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .avatar {
    width: 65px;
    height: 65px;
    border-radius: 50%;
    overflow: hidden;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    flex-shrink: 0;
    color: #444;
    font-size: 1.5rem;
  }
  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .reviewer-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: inherit;
  }
  .review-date {
    font-size: 0.8rem;
    color: inherit;
    opacity: 0.8;
  }
  .product-info-mini {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin: 0.2rem 0;
    padding: 4px 8px;
    background: #f8f9fa;
    border-radius: 6px;
    width: fit-content;

    &.modal-prod {
        background: none;
        padding: 0;
        margin-bottom: 0.5rem;
    }
  }
  .product-thumb-min {
    width: 24px;
    height: 24px;
    object-fit: contain;
    border-radius: 4px;
  }
  .product-name-min {
    font-size: 0.85rem;
    color: var(--primary);
    font-weight: 600;
  }
  .rating {
    display: flex;
    margin-top: 2px;
  }
  .reviewer-text {
    font-size: 1.1rem;
    line-height: 1.6;
    color: inherit;
  }
`;

const StyledModal = styled(Modal)`
  display: flex !important;
  justify-content: center;
  align-items: center;
  .modal-dialog {
    width: 50%;
    min-width: 30rem;
  }
  .modal-content {
    max-height: calc(100vh - 4rem);
    .modal-header {
      border-bottom: none;
      .modal-title {
        font-size: 1.2rem;
        line-height: 1.2;
        .rating {
          display: inline-block;
          margin-right: 1rem;
        }
        .review-date {
          font-size: 0.6rem;
        }
      }
    }
    .modal-body {
      padding-top: 0;
      text-align: justify;
    }
  }

  .customScrollbar {
    overflow-y: scroll;
    /* Custom scrollbar styles */
    &::-webkit-scrollbar {
      width: 6px; /* Width of the scrollbar */
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1; /* Background of the scrollbar track */
    }

    &::-webkit-scrollbar-thumb {
      background-color: #c4c4cd; /* Scrollbar thumb color */
      border-radius: 10px; /* Rounded scrollbar edges */
      border: 1px solid #f1f1f1; /* Padding around the thumb */
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: #808080; /* Thumb color on hover */
    }
  }
  @media screen and (max-width: 480px) {
    .modal-dialog {
      width: 98%;
      min-width: auto;
    }
  }
  @media screen and (min-width: 1200px) {
    .modal-dialog {
      max-width: 40vw;
    }
  }
`;
