'use client';

import React from "react";
import styled from "styled-components";

const Follow = () => {
  return (
    // <div>Follow</div>

    <StyledFollow>
      <section className="pb-4 follow-us">
        <div className="container">
          <div className="text-center">
            <h2>Wanna Connect with us ???</h2>
          </div>
          <div className="row justify-content-center">
            <div className="col-md-3">
              <div className="text-center">
                <a
                  target="_blank"
                  rel="noopener"
                  href="https://www.instagram.com/vyraherbals"
                >
                  <img
                    src="/assets/images/insta.webp"
                    alt="product"
                    width={150}
                  />
                </a>
                <p className="">Join the 3000+ Happy Souls Today!</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <a
                  target="_blank"
                  rel="noopener"
                  href="https://wa.me/919866082590"
                >
                  <img
                    src="/assets/images/whatsapp.webp"
                    alt="product"
                    width={150}
                  />
                </a>

                <p>Have a Question? Lets Chat!</p>
              </div>
            </div>
          </div>
          <p className="text-center quri_out">
            (Queries will be answered between 9AM to 10PM IST)
          </p>
        </div>
      </section>
    </StyledFollow>
  );
};

export default Follow;

const StyledFollow = styled.section`
  .follow-us {
    h2 {
      font-size: 1.8rem;
    }
  }
`;
