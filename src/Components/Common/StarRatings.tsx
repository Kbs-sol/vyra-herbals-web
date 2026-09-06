'use client';

import React from "react";
import styled from "styled-components";
import { FaRegStar, FaRegStarHalfStroke, FaStar } from "react-icons/fa6";
import PropTypes from "prop-types";

const StarRatings = (props) => {
  const { rating, onChange, className } = props;

  const renderStar = (val) => {
    if (val <= Math.floor(rating)) {
      return <FaStar className="on" />; // Full star
    } else if (val === Math.floor(rating) + 1 && rating % 1 !== 0) {
      return <FaRegStarHalfStroke className="half" />; // Half star
    } else {
      return <FaRegStar className="off" />; // Empty star
    }
  };

  return (
    <StyledStars className={"stars " + className}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={"star " + star}
          className={`star ${onChange ? "clickable" : ""}`}
          onClick={() => onChange?.(star)}
        >
          {renderStar(star)}
        </span>
      ))}
    </StyledStars>
  );
};

export default StarRatings;

StarRatings.propTypes = {
  rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  onChange: PropTypes.func,
  className: PropTypes.string,
};

const StyledStars = styled.div`
  &.stars {
    display: flex;
    align-items: center;
    height: 1rem;
    .star {
      display: inline-block;
      color: var(--yellow);
      cursor: default;
      &.clickable {
        cursor: pointer;
      }
      svg {
        height: 1rem;
        width: 1rem;
      }
    }
  }
`;
