'use client';

import React from "react";
import styled from "styled-components";

const QuantitySelector = ({ value, setValue, maxValue }) => {
  return (
    <StyledSelector>
      <div className="d-flex quant_sze justify-content-start align-items-center">
        <button
          title={value > 1 ? "Remove" : ""}
          className="minus"
          onClick={() => {
            if (value > 1) setValue(value - 1);
          }}
          disabled={value <= 1}
        >
          <span>-</span>
        </button>
        <p> {value} </p>
        <button
          title="Add"
          className="plus"
          onClick={() => {
            if (value < maxValue) setValue(value + 1);
          }}
        >
          <span>+</span>
        </button>
      </div>
    </StyledSelector>
  );
};

export default QuantitySelector;

const StyledSelector = styled.section`
  .quant_sze {
    button:disabled {
      background: #848484;
    }
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      &.plus {
        padding-bottom: 0;
      }
    }
  }
`;
