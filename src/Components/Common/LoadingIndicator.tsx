'use client';

import React from "react";
import styled, { keyframes } from "styled-components";

// Keyframes for the spinning animation
const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Styled component for the circular-loader
const CircularLoader = styled.div`
  border: 2px solid #f3f3f3;
  border-top: 2px solid var(--primary);
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  animation: ${spin} 2s linear infinite; /* Spin infinitely */
`;

const SpinnerLoader = () => {
  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 9999,
      }}
    >
      <div className="spinner-border text-primary" role="status">
        <span className="sr-only"></span>
      </div>
    </div>
  );
};

const LoadingIndicator = ({ variant }) => {
  switch (variant) {
    case "circular":
      return <CircularLoader />;

    case "spinner":
      return <SpinnerLoader />;

    default:
      return <CircularLoader />;
  }
};

export default LoadingIndicator;
