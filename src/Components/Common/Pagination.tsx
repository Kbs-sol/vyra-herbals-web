'use client';

import React from "react";
import styled from "styled-components";

const Pagination = (props) => {
  const {
    currentPage,
    totalPages = 1,
    onPageChange,
    maxButtonCount = 5,
  } = props;

  const renderPageButtons = () => {
    const buttons: React.ReactNode[] = [];
    let start = Math.max(1, currentPage - Math.floor(maxButtonCount / 2));
    let end = Math.min(totalPages, start + maxButtonCount - 1);

    if (end - start < maxButtonCount - 1) {
      start = Math.max(1, end - maxButtonCount + 1);
    }

    for (let index = start; index <= end; index++) {
      buttons.push(
        <PageButton
          className={`${currentPage === index ? "active" : ""}`}
          key={index}
          onClick={() => onPageChange(index)}
          disabled={currentPage === index}
        >
          {index}
        </PageButton>
      );
    }
    return buttons;
  };

  return (
    <StyledPagination>
      <PageButton
        className="text"
        type="button"
        onClick={() => {
          if (currentPage > 1) onPageChange(currentPage - 1);
        }}
        disabled={currentPage === 1}
      >
        Prev
      </PageButton>
      {renderPageButtons()}
      <PageButton
        className="text"
        type="button"
        onClick={() => {
          if (currentPage < totalPages) onPageChange(currentPage + 1);
        }}
        disabled={currentPage === totalPages}
      >
        Next
      </PageButton>
    </StyledPagination>
  );
};

export default Pagination;

const StyledPagination = styled.div`
  display: flex;
  justify-content: center;
  margin: 2rem;
`;

const PageButton = styled.button`
  width: 2.4rem;
  margin: 0 0.4rem;
  padding: 0.4rem 0;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 5px;
  &:hover:not(:disabled) {
    background-color: #ddd;
  }
  &.active {
    border-color: var(--primary);
    color: #000;
    font-weight: bold;
  }
  &.text {
    width: auto;
    padding: 0.4rem 0.8rem;
  }
`;
