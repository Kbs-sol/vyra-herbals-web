'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Offcanvas from "react-bootstrap/Offcanvas";
// import { FaBars } from "react-icons/fa6";
import { FaBarsStaggered } from "react-icons/fa6";
import { useCart } from "../Contexts/CartContext";
import Slider from "react-slick";
import SearchBar from "../Shared/SearchBar";
import styled from "styled-components";
import { FaShoppingCart } from "react-icons/fa";
import { Accordion } from "react-bootstrap";

const Header = () => {
  const [showMenu, setShowMenu] = useState(false);
  const { cartCount } = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentSearchingTerm, setCurrentSearchingTerm] = useState("all");

  // Custom arrow component to avoid passing currentSlide/slideCount to DOM
  const HiddenArrow = ({ className, style, onClick }: any) => (
    <span className={className} style={{ ...style, display: 'none' }} onClick={onClick} />
  );

  const settings = {
    fade: true,
    infinite: true,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    waitForAnimate: false,
    autoplay: true,
    autoplaySpeed: 3000,
    cssEase: "linear",
    nextArrow: <HiddenArrow />,
    prevArrow: <HiddenArrow />,
  };

  // Remove useQuery custom hook (not needed)

  const handleSearch = () => {
    if (searchTerm.trim() !== currentSearchingTerm) {
      setCurrentSearchingTerm(searchTerm);
      router.push(`/search?searchtext=${searchTerm.trim()}`);
    }
  };

  const hideMobileCanvas = () => {
    setShowMenu(false);
  };

  useEffect(() => {
    if (pathname?.toLowerCase() === "/search") {
      // searchParams can be null, so check before using .get
      const q = searchParams?.get("searchtext") ?? "all";
      setSearchTerm(q);
      setCurrentSearchingTerm(q);
    } else {
      setSearchTerm("");
      setCurrentSearchingTerm("");
    }
  }, [pathname, searchParams]);

  return (
    <>
      <div className="backdrop"></div>
      <section className="header-top">
        <div className="container">
          <div className="row">
            <div className="col-md-12 col-lg-12">
              <div className="header-top-welcome text-center">
                <Slider {...settings}>
                  <p>Welcome to Vyra Herbals: Truth in Every Drop!</p>
                  <p>FREE Shipping Available on All Products</p>
                  <p>ISO 9001 : 2015 & GMP Certified</p>
                  {/* <p>Use coupon code: VYRABIRTHDAY - to get flat Rs.100/- off.</p> */}
                </Slider>
              </div>
            </div>
          </div>
        </div>
      </section>
      <StyledHeader className="header-part">
        <div className="container">
          <div className="header-content">
            <div className="header-media-group">
              <button className="toggle" onClick={() => setShowMenu(true)}>
                <FaBarsStaggered />
              </button>
            </div>
            <div className="header-logo-and-list">
              <Link href="/" className={"header-logo"}>
                <img src="/assets/images/logo-final.png" alt="logo" />
              </Link>

              <ul className="navbar-list">
                <li className="navbar-item">
                  <Link className="navbar-link" href="/">
                    Home
                  </Link>
                </li>
                <li className="navbar-item dropdown">
                  <span
                    className="navbar-link dropdown-arrow"
                    data-bs-toggle="dropdown"
                  >
                    Shop
                  </span>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => router.push("/search?searchtext=all")}
                      >
                        All Products
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => router.push("/category/hair-oil")}
                      >
                        Hair Oil
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => router.push("/category/shampoo")}
                      >
                        Shampoo
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => router.push("/category/combs")}
                      >
                        Neem Combs
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => router.push("/category/scalp-massager")}
                      >
                        Scalp Massager
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => router.push("/category/kits")}
                      >
                        Combos & Kits
                      </button>
                    </li>
                  </ul>
                </li>
                <li className="navbar-item dropdown">
                  <span
                    className="navbar-link dropdown-arrow"
                    data-bs-toggle="dropdown"
                  >
                    Reviews
                  </span>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => router.push("/#customerStoriesSection")}
                      >
                        Customer Stories
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => router.push("/#customerTestimonials")}
                      >
                        Customer Testimonials
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => router.push("/testimonials#images")}
                      >
                        Before & After Images
                      </button>
                    </li>
                  </ul>
                </li>
                <li className="navbar-item">
                  <Link className="navbar-link" href="/blogs">
                    Blog
                  </Link>
                </li>
                <li className="navbar-item">
                  <Link className="navbar-link" href="/about">
                    About Us
                  </Link>
                </li>
                <li className="navbar-item dropdown">
                  <span
                    className="navbar-link dropdown-arrow"
                    data-bs-toggle="dropdown"
                  >
                    Help
                  </span>
                  <ul className="dropdown-menu">
                    <li>
                      <Link className="dropdown-item" href="/contact">
                        Contact Us
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" href="/faqs">
                        FAQs
                      </Link>
                    </li>
                  </ul>
                </li>
                <li className="navbar-item">
                  <Link className="navbar-link" href="/track-order">
                    Track Order
                  </Link>
                </li>
              </ul>
            </div>
            <div className="header-widget-group">
              <section className="search-section">
                <SearchBar
                  id="search-input"
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  onClear={() => {
                    currentSearchingTerm !== "all" &&
                      pathname?.toLowerCase() === "/search" &&
                      router.push("/search");
                  }}
                />
              </section>

              <button className="header-widget header-cart" title="Go to cart">
                <Link
                  href="/cart"
                  onClick={(e) => pathname?.includes("cart") && e.preventDefault()}
                >
                  <FaShoppingCart />
                  <sup>{cartCount}</sup>
                </Link>
              </button>
            </div>
          </div>
        </div>
      </StyledHeader>

      <OffCanvasWrapper>
        <Offcanvas className="styled-offcanvas" show={showMenu} onHide={hideMobileCanvas} placement="end">
          <Offcanvas.Header closeButton></Offcanvas.Header>
          <Offcanvas.Body>
            <div className="mobile-menu">
              <ul className="header-top-list">
                <li>
                  <Link href="/" onClick={hideMobileCanvas}>
                    Home
                  </Link>
                </li>
                <StyledAccordion>
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>Shop</Accordion.Header>
                    <Accordion.Body>
                      <Link href="/search?searchtext=all" onClick={hideMobileCanvas}>
                        All Products
                      </Link>

                      <Link href="/category/hair-oil" onClick={hideMobileCanvas}>
                        Hair Oil
                      </Link>
                      <Link href="/category/shampoo" onClick={hideMobileCanvas}>
                        Shampoo
                      </Link>
                      <Link href="/category/combs" onClick={hideMobileCanvas}>
                        Neem Combs
                      </Link>
                      <Link
                        href="/category/scalp-massager"
                        onClick={hideMobileCanvas}
                      >
                        Scalp Massager
                      </Link>
                      <Link href="/category/kits" onClick={hideMobileCanvas}>
                        Combos & Kits
                      </Link>
                    </Accordion.Body>
                  </Accordion.Item>
                  <Accordion.Item eventKey="1">
                    <Accordion.Header>Reviews</Accordion.Header>
                    <Accordion.Body>
                      <Link
                        href="/#customerStoriesSection"
                        onClick={hideMobileCanvas}
                      >
                        Customer Stories
                      </Link>
                      <Link
                        href="/#customerTestimonials"
                        onClick={hideMobileCanvas}
                      >
                        Customer Testimonials
                      </Link>
                      <Link href="/testimonials#images" onClick={hideMobileCanvas}>
                        Before & After Images
                      </Link>
                    </Accordion.Body>
                  </Accordion.Item>
                  <li>
                    <Link href="/about" onClick={hideMobileCanvas}>
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/blogs" onClick={hideMobileCanvas}>
                      Blog
                    </Link>
                  </li>
                  <Accordion.Item eventKey="2">
                    <Accordion.Header>Help</Accordion.Header>
                    <Accordion.Body>
                      <Link href="/contact" onClick={hideMobileCanvas}>
                        Contact Us
                      </Link>
                      <Link href="/faqs" onClick={hideMobileCanvas}>
                        FAQs
                      </Link>
                    </Accordion.Body>
                  </Accordion.Item>
                  <li>
                    <Link href="/track-order" onClick={hideMobileCanvas}>
                      Track Order
                    </Link>
                  </li>
                </StyledAccordion>
              </ul>
              <ul className="social-container">
                <li>
                  <a
                    target="_blank"
                    rel="noopener"
                    href="https://www.facebook.com/vyraherbals"
                    className="icofont-facebook"
                  ></a>
                </li>
                <li>
                  <a
                    target="_blank"
                    rel="noopener"
                    href="https://www.instagram.com/vyraherbals"
                    className="icofont-instagram"
                  ></a>
                </li>
                <li>
                  <a
                    target="_blank"
                    rel="noopener"
                    href="https://www.youtube.com/@vyraherbals"
                    className="fab fa-youtube"
                  />
                </li>
              </ul>
            </div>
          </Offcanvas.Body>
        </Offcanvas>
      </OffCanvasWrapper>
    </>
  );
};

export default Header;

const StyledHeader = styled.section`
  &.header-part {
    padding: 0.5rem 0;
    background: var(--white);
    transition: all linear 0.3s;
    -webkit-transition: all linear 0.3s;
    -moz-transition: all linear 0.3s;
    -ms-transition: all linear 0.3s;
    -o-transition: all linear 0.3s;
    box-shadow: 0 9px 10px -8px #0000001f !important;
    position: sticky;
    top: 0;
    z-index: 99;
    margin-top: 1px;

    .header-logo-and-list {
      display: flex;

      .header-logo {
        margin-right: 3rem;
        img {
          width: auto;
          height: 3rem;
        }
      }
      .navbar-list {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding-right: 2rem;

        .navbar-item {
          position: relative;
        }

        .navbar-link {
          font-size: 1rem !important;
          cursor: pointer;
          text-decoration: none; /* Remove default underline */
          color: black; /* Text color */
          position: relative; /* Ensure the pseudo-element is positioned correctly */
        }

        .navbar-link::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: 24%;
          width: 0;
          height: 2px; /* Thickness of the underline */
          background-color: var(--primary); /* Underline color */
          transition:
            width 0.4s ease,
            left 0.4s ease; /* Animate width and position */
        }

        .navbar-item:hover .navbar-link::after {
          width: 100%; /* Full width of the link */
          left: 0; /* Keep the left position at the start */
        }

        .dropdown {
          cursor: pointer;
          .dropdown-menu {
            padding: 0;
            li {
              margin: 0;
            }
          }
          .dropdown-item {
            &:active {
              background: var(--primary);
            }
          }
          &:hover {
            .navbar-link {
              text-decoration-color: var(--primary);
              &,
              &::before {
                color: var(--primary);
              }
            }
            .dropdown-menu {
              display: block;
              margin-top: 0;
            }
          }
          & > .dropdown-arrow {
            pointer-events: none;
          }
        }
      }
    }

    .header-widget-group {
      display: flex;
      align-items: center;
      justify-content: center;
      .header-widget {
        /* padding-top: 10px; */
        margin-left: 20px;
        &:first-child {
          margin-left: 0px;
        }
      }
      .header-cart {
        color: var(--white);
        background: var(--chalk);
        border-radius: 50%;
        width: 1.6rem;
        svg path {
          fill: var(--primary);
        }
      }
    }

    &.active {
      position: sticky;
      top: 0px;
      left: 0px;
      width: 100%;
      z-index: 3;
      background: var(--white);
      box-shadow: 0px 5px 15px 0px rgba(0, 0, 0, 0.15);
      transition: all linear 0.3s;
      -webkit-transition: all linear 0.3s;
      -moz-transition: all linear 0.3s;
      -ms-transition: all linear 0.3s;
      -o-transition: all linear 0.3s;
      .header-widget:hover i {
        background: var(--primary);
      }
      .header-widget sup {
        border-color: var(--white);
      }
      .header-form {
        background: var(--white);
        border-color: var(--primary);
      }
    }
  }

  //bootstrap break-point: md
  @media (max-width: 576px) {
    &.header-part {
      overflow-x: hidden !important;
      .header-content {
        margin-bottom: 2.4rem;
        .search-section {
          position: absolute;
          bottom: 0.6rem;
          left: 0.6rem;
          right: 0.6rem;
        }
        .header-widget-group {
          margin-right: 1.2rem;
        }
      }
    }
  }

  @media (min-width: 991px) and (max-width: 1200px) {
    .header-content {
      .header-logo-and-list {
        .header-logo {
          margin-right: 1rem;
        }
        .navbar-list {
          padding-right: 1rem;
        }
      }
    }
  }
`;

// Use a wrapper to style Offcanvas via a class to avoid ref access issues in React 19
const OffCanvasWrapper = styled.div`
  .styled-offcanvas {
    .mobile-menu {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .social-container {
        display: flex;
        justify-content: end;
        gap: 0.5rem;
        border-top: 1px solid var(--primary);
      }
      .header-top-list {
        display: flex;
        align-items: center;
        justify-content: flex-end;

        li {
          margin-left: 20px;
          a {
            font-size: 1rem;
            color: var(--white);
            letter-spacing: 0.3px;
            white-space: nowrap;
            text-transform: capitalize;
            transition: all linear 0.3s;
            -webkit-transition: all linear 0.3s;
            -moz-transition: all linear 0.3s;
            -ms-transition: all linear 0.3s;
            -o-transition: all linear 0.3s;
            &:hover {
              color: var(--green-chalk);
            }
          }
        }
      }
    }

    @media (max-width: 991px) {
      ul.header-top-list li {
        a {
          font-size: 1rem;
          padding: 10px 15px;
          border-bottom: 1px solid rgb(130 85 62);
          width: 100%;
          color: #000 !important;
        }
        &:last-child {
          a:last-child {
            border-bottom: none;
          }
        }
      }
      .header-top-list li {
        margin-left: 0px !important;
      }
      .offcanvas-body {
        padding-top: 0px !important;
      }
    }
  }
`;

const StyledAccordion = styled(Accordion)`
  .accordion-item {
    border: none;
    border-radius: 0;
    margin-bottom: 0;
    .accordion-header {
      border-bottom: 1px solid var(--primary);
      padding: 0 15px;
      .accordion-button {
        padding: 0;
        border-radius: 0;
        background-color: transparent;
        &:not(.collapsed),
        &:focus {
          color: var(--text);
          box-shadow: none;
          border: none;
        }
      }
    }
    .accordion-body {
      border-bottom: 1px solid var(--primary);
      padding: 0.4rem 1rem;
      display: flex;
      flex-direction: column;
      a {
        font-size: 14px;
        padding: 0.1rem 1.5rem;
        color: var(--text);
        &:last-child {
          border: none !important;
        }
      }
    }
  }
`;
