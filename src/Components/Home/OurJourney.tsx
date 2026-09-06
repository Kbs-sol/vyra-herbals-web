'use client';

import React from "react";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";
import styled from "styled-components";

const OurJourney = () => {
  const { ref, inView } = useInView({
    threshold: 0.5, // Trigger when 50% of the section is visible
    // triggerOnce: true, // Run animation only once
  });
  const happyCustomers = 10000;
  const customerSatisfaction = 95;

  return (
    <CounterContainer ref={ref}>
      <div className="journey-title">Our Journey</div>
      {inView && (
        <section className="counters gap-lg-4 w-100 d-flex justify-content-center">
          <div className="card col-5 col-lg-2 m-lg-4">
            <div className="count-value">
              <CountUp start={0} end={happyCustomers} duration={3} />
              <span className="symbol">+</span>
            </div>
            <div className="counter-title">Happy Customers</div>
          </div>
          <div className="card col-5 col-lg-2 m-lg-4">
            <div className="count-value">
              <CountUp start={0} end={customerSatisfaction} duration={3} />
              <span className="symbol">%</span>
            </div>
            <div className="counter-title">Customer Satisfaction</div>
          </div>
        </section>
      )}
    </CounterContainer>
  );
};

export default OurJourney;

const CounterContainer = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  height: 10rem; /* Adjust based on your layout */
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  .journey-title {
    font-size: 2rem;
  }
  .counters {
    .card {
      height: 5rem;
      justify-content: center;
      color: #679911;
      background: #f3ebeb;
      font-weight: bold;
      font-family: "IcoFont";
    }
  }

  //bootstrap break-point: md
  @media (max-width: 576px) {
    .counters {
      gap: 1rem;
    }
  }
`;
