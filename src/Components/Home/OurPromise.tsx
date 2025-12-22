'use client';

import React from "react";
import Link from "next/link";
import { IoIosArrowBack } from "react-icons/io";
import { IoIosArrowForward } from "react-icons/io";
// import Image from "next/image";
import Slider from "react-slick";
import InfiniteScroller from "../Common/InfiniteScroller";
import styled from "styled-components";

export const PromisesSlider = () => {
  const images = [
    "cert-01.jpg",
    "cert-02.jpg",
    "cert-03.jpg",
    "cert-04.jpg",
    "cert-05.jpg",
    "cert-06.jpg",
    "cert-07.jpg",
    "cert-08.jpg",
    "cert-09.jpg",
  ];
  const settings = {
    className: "center",
    infinite: true,
    centerPadding: "600px",
    slidesToShow: 4,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1500,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
          infinite: true,
        },
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
    ],
    autoplay: true,
    speed: 2000,
    autoplaySpeed: 0,
    cssEase: "linear",
    nextArrow: <></>,
    prevArrow: <></>,
  };

  return (
    <StyledInfiniteScroller>
      {/* <Slider {...settings}>
        {images.map((src, i) => {
          return (
            <div className="brand-media" key={"our-promise-" + i}>
              <img src={"assets/images/promises/" + src} alt="brand" />
            </div>
          );
        })}
      </Slider> */}
      <InfiniteScroller
        images={images.map((i) => "assets/images/promises/" + i)}
        duration={20}
      />
    </StyledInfiniteScroller>
  );
};

const OurPromise = () => {
  return (
    <section className="section brand-part">
      <div className="fluid-container">
        <div className="row">
          <div className="col-12">
            <div className="section-heading">
              <h2> Our Promises </h2>
            </div>
          </div>
        </div>
        <PromisesSlider />
      </div>
    </section>
  );
};

export default OurPromise;

const StyledInfiniteScroller = styled.section`
  .scroller-image-wrapper {
    border-radius: 50%;
    height: 10rem;
    width: 10rem;
  }
`;
