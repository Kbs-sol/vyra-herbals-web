"use client";
import React, { useEffect, useState } from "react";
import { API_PATH } from "../../constants";
import Link from "next/link";
import { IoIosArrowBack } from "react-icons/io";
import { IoIosArrowForward } from "react-icons/io";
import Slider from "react-slick";
import styled from "styled-components";
import ReviewCard from "./ReviewCard";
import LoadingIndicator from "../Common/LoadingIndicator";

const Testimonial = () => {
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

  // Slider settings will be computed based on available testimonials to avoid duplication/cloning when few items
  const [isLoading, setIsLoading] = useState(false);
  const [testimonials, setTestimonials] = useState([]);

  const getSliderSettings = (count) => {
    const slidesToShow = Math.min(3, Math.max(1, count));
    // centerPadding controls how much side space is shown around the center slide.
    // We keep it moderate to avoid an overstretched center card.
    const centerPadding = slidesToShow > 1 ? '60px' : '160px';

    return {
      className: "center",
      infinite: count > slidesToShow, // only infinite if there are more items than visible slides
      centerPadding,
      slidesToShow,
      slidesToScroll: 1,
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: Math.min(2, count),
            slidesToScroll: 1,
          },
        },
        {
          breakpoint: 767,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
            nextArrow: <></>,
            prevArrow: <></>,
          },
        },
        {
          breakpoint: 600,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
            nextArrow: <></>,
            prevArrow: <></>,
          },
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
            nextArrow: <></>,
            prevArrow: <></>,
          },
        },
      ],
      swipeToSlide: true,
      autoplay: count > 1, // only autoplay if more than one slide
      nextArrow: <SampleNextArrow />,
      prevArrow: <SamplePrevArrow />,
      pauseOnHover: true,
      dots: true,
    };
  };

  useEffect(() => {
    setIsLoading(true);
    // Fetch reviews for testimonials - use * to avoid column mismatch issues
    const postData = {
      tbl_name: "testimonials",
      extra_condition: " ORDER BY created_at DESC LIMIT 9",
      status: 1 // only active testimonials
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    };

    fetch(`${API_PATH}/data`, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch testimonials");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Testimonials data:", data);
        // Map testimonials rows to the shape review card expects
        const mapped = (data || []).map((t) => ({
          id: t.id,
          reviewer_name: t.name,
          review_text: t.content,
          rating: t.rating || 5,
          created_at: t.created_at,
          image: t.image_url || t.image || null,
        }));
        setTestimonials(mapped);
      })
      .catch((error) => {
        console.error("Error while fetching testimonials:", error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <StyledTestimonials className="inner-section about-testimonial">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="section-heading position-relative">
              <h2> Customer Testimonials </h2>
              <div className="section-btn-25">
                <Link href="/testimonials" className="">
                  <span>View All</span>
                  <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="slider-container">
          {!isLoading ? (
            <Slider {...getSliderSettings(testimonials.length)}>
              {testimonials.map((review, index) => {
                return (
                  <div className="col-md-12 px-2" key={"review-card-" + index}>
                    <ReviewCard review={review} className={"card-test"} />
                  </div>
                );
              })}
            </Slider>
          ) : (
            <section className="loader">
              <LoadingIndicator />
            </section>
          )}
        </div>
      </div>
    </StyledTestimonials>
  );
};

export default Testimonial;

const StyledTestimonials = styled.section`
  .section-btn-25 {
    position: absolute;
    margin: 0 10px;
    top: 25%;
    right: 0;
    a {
      text-decoration: underline #000;
      color: #000;
      .fa-arrow-right:before {
        color: black;
        padding-left: 6px;
      }
    }
  }
  .slider-container {
    .card-test {
      max-width: 920px; /* limit width so the card isn't too long */
      margin: 0 auto;   /* center the card */
      height: 12rem;    /* slightly shorter */
      padding: 1.6rem;
      border-radius: 14px;
      box-sizing: border-box;
      &,
      .read-more-btn {
        color: #fff;
      }
    }
    .loader {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 12rem;
    }
  }
  //bootstrap break-point: md
  @media (max-width: 576px) {
    .section-heading {
      margin-bottom: 15px !important;
      .section-btn-25 {
        position: static;
        text-align: end;
        margin-top: 10px;
      }
    }

    .slider-container {
      .slick-slider {
        display: flex;
        align-items: center;
        .left_icon,
        .right_icon {
          position: static;
        }
      }
    }
  }
`;
