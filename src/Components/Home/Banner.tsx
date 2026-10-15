"use client";
// import React from "react";
import React, { useState } from "react";
import Link from "next/link";
import { IoIosArrowBack } from "react-icons/io";
import { IoIosArrowForward } from "react-icons/io";
// import Image from "next/image";
import Slider from "react-slick";
import Loader from "../Loader";

const Banner = () => {
  const [loading, setLoading] = useState(true);

  function SampleNextArrow(props) {
    const { className, style, onClick } = props;
    return (
      <div className="right_icon">
        <IoIosArrowForward
          color="black"
          // className={className}
          style={{
            ...style,
            display: "block",
          }}
          onClick={onClick}
          size={50}
        />
      </div>
    );
  }

  function SamplePrevArrow(props) {
    const { className, style, onClick } = props;
    return (
      <div className="left_icon">
        <IoIosArrowBack
          color="black"
          // className={className}
          style={{
            ...style,
            display: "block",
          }}
          onClick={onClick}
          size={50}
        />
      </div>
    );
  }

  const settings = {
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
    swipeToSlide: true,
    autoplay: true,
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />,
  };

  return (
    <>
      {/* {loading && <Loader />} */}
      <div className="baner_sects">
        <div className="slider-container">
          <Slider {...settings}>
            <div className="banner-list">
              <Link href="/search?searchtext=all">
                <img
                  src="/assets/images/banner/slide-02.webp"
                  // onLoad={() => setLoading(false)}
                  // onError={() => setLoading(false)}
                  alt="Healthy Hair, Happy You - Vyra herbal shampoo and hair oil with natural ingredients"
                  width={1200}
                  height={505}
                  fetchPriority="high"
                />
              </Link>
            </div>
            <div className="banner-list">
              <img src="/assets/images/banner-02.webp" alt="Hair care for strong and healthy hair - transform your hair, naturally" width={831} height={350} />
            </div>
            <div className="banner-list">
              <img src="/assets/images/hero-banner.webp" alt="Vyra All in One Hair Growth Kit - shampoo, hair oil, rosemary leaves, hair mask, neem combs and scalp massager" width={1200} height={800} />
            </div>
          </Slider>
        </div>
      </div>
    </>
  );
};

export default Banner;
