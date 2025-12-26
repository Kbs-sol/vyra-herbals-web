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

  const settings = {
    className: "center",
    infinite: true,
    centerPadding: "600px",
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
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
    autoplay: true,
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />,
    pauseOnHover: true,
    dots: true,
  };

  const [isLoading, setIsLoading] = useState(false);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    setIsLoading(true);
    const postData = {
      tbl_name: "reviews",
      extra_condition: " ORDER BY rating DESC LIMIT 9",
      status: 1,
    };

    // Define the fetch options
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Specify the content type as JSON
      },
      body: JSON.stringify(postData), // Convert the data to JSON format
    };

    // Replace the placeholder URL with your actual API endpoint
    fetch(`${API_PATH}/data`, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch testimonials");
        }
        return response.json();
      })
      .then((data) => {
        // Update the state with the fetched handpicked products data
        setTestimonials(data);
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
            <Slider {...settings}>
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
      height: 14rem;
      &,
      .read-more-btn {
        color: #fff;
      }
    }
    .loader {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 14rem;
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
