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
          <div className="card-title">
            {review.reviewer_name || "Anonymous"}
            <span className="review-date">
              {Utility.formatDate(review.created_at)}
            </span>
          </div>
          <StarRatings rating={review.rating} className={"rating"} />

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

      <StyledModal show={showModal} onHide={onModalClose}>
        <Modal.Header closeButton style={{ backgroundColor: "white" }}>
          <Modal.Title>
            <EllipsisControl
              text={"Review posted by " + (review.reviewer_name || "Anonymous")}
            />
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
  .rating {
    display: inline-block;
    margin-right: 1rem;
  }
  .review-date {
    font-size: 0.6rem;
  }
  .card-title {
    display: flex;
    justify-content: space-between;
    line-height: 1;
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
