"use client";
import React from "react";
import Slider from "react-slick";
import InfiniteScroller from "../Common/InfiniteScroller";
import styled from "styled-components";

const media = [
  {
    img: "/assets/images/thumbnails/story-01.png",
    video:
      "https://drive.google.com/file/d/1AVs29eA5jXKwiwAvRfrrPg6jkSGbDilh/view?usp=drive_link",
  },
  {
    img: "/assets/images/thumbnails/story-02.png",
    video:
      "https://drive.google.com/file/d/1ABl-RZ6hp0XfjicJD3UwWvNlfhnMEmk5/view?usp=drive_link",
  },
  {
    img: "/assets/images/thumbnails/story-03.png",
    video:
      "https://drive.google.com/file/d/1Aaicyll1FmPJTwkwSCEY4_e9IS4AwfWf/view?usp=drive_link",
  },
  {
    img: "/assets/images/thumbnails/story-04.png",
    video:
      "https://drive.google.com/file/d/1AGZT23-V6XoalRarwz50lDwt9SkfYedl/view?usp=drive_link",
  },
  {
    img: "/assets/images/thumbnails/story-05.png",
    video:
      "https://drive.google.com/file/d/1AHm7qINHVDM6qv5Nx-hYA7cnsZZSX1f8/view?usp=drive_link",
  },
  {
    img: "/assets/images/thumbnails/story-06.png",
    video:
      "https://drive.google.com/file/d/1AXdWcKTMicUFyhcS868lpINWeO_k78wc/view?usp=drive_link",
  },
  {
    img: "/assets/images/thumbnails/story-07.png",
    video:
      "https://drive.google.com/file/d/1R0gvRPJTdldYU0HE7qBa6dUPvwVIwR25/view?usp=drive_link",
  },
  // Add more objects as needed
];

const Stories = () => {
  // const settings = {
  //   className: "center",
  //   infinite: true,
  //   centerPadding: "600px",
  //   slidesToShow: 4,
  //   slidesToScroll: 1,
  //   responsive: [
  //     {
  //       breakpoint: 1024,
  //       settings: {
  //         slidesToShow: 3,
  //         slidesToScroll: 1,
  //         infinite: true,
  //         dots: true,
  //       },
  //     },
  //     {
  //       breakpoint: 600,
  //       settings: {
  //         slidesToShow: 3,
  //         slidesToScroll: 1,
  //       },
  //     },
  //     {
  //       breakpoint: 480,
  //       settings: {
  //         slidesToShow: 3,
  //         slidesToScroll: 1,
  //       },
  //     },
  //   ],
  //   swipeToSlide: true,
  //   autoplay: true,
  //   nextArrow: <></>,
  //   prevArrow: <></>,
  //   speed: 4000,
  //   autoplaySpeed: 0,
  //   cssEase: "linear",
  // };

  return (
    <>
      <section className="cerse pt-5 pb-5">
        <div className="fluid-container">
          <div className="row">
            <div className="col-lg-12">
              <div className="section-heading">
                <h2>Customer Stories</h2>
              </div>
            </div>
          </div>
          {/* <Slider {...settings}>
            {media.map((file, index) => {
              return (
                <div
                  className="col-md-12 px-2"
                  key={"customer-review-" + index}
                >
                  <div className="text-center">
                    <a href={file.video} target="_blank">
                      <img src={file.img} alt="customer-review" />
                    </a>
                  </div>
                </div>
              );
            })}
          </Slider> */}
          <StyledInfiniteScroller>
            <InfiniteScroller
              images={media.map((file, index) => {
                return (
                  <div className="text-center">
                    <a href={file.video} target="_blank">
                      <img src={file.img} alt={"customer-review-" + index} />
                    </a>
                  </div>
                );
              })}
              duration={20}
            />
          </StyledInfiniteScroller>
        </div>
      </section>
    </>
  );
};

export default Stories;

const StyledInfiniteScroller = styled.section`
  .scroller-image-wrapper {
    height: 20rem;
    width: 12rem;
  }
`;
