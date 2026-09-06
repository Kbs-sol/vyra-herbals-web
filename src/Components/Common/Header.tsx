'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Offcanvas from "react-bootstrap/Offcanvas";
// import { FaBars } from "react-icons/fa6";
import { FaBarsStaggered } from "react-icons/fa6";
import { useCart } from "../Contexts/CartContext";
import { useWishlist } from "../Contexts/WishlistContext";
import { useAuth } from "../Contexts/AuthContext";
import Slider from "react-slick";
import SearchBar from "../Shared/SearchBar";
import styled, { createGlobalStyle } from "styled-components";
import { FaShoppingCart, FaUserCircle, FaHeart } from "react-icons/fa";
import { Accordion, Dropdown } from "react-bootstrap";
import { Category } from "@/types";

const GlobalMobileMenuStyle = createGlobalStyle`
  .styled-offcanvas {
    width: 300px !important;
    background-color: #fff !important;
    
    .offcanvas-header {
      border-bottom: 1px solid #f1f1f1 !important;
      /* Align close button with hamburger menu toggle (X=21px, Y=61.6px) */
      padding: 62px 0 15px 23px !important; 
      display: flex !important;
      justify-content: flex-start !important;
      
      .btn-close {
        font-size: 0.9rem !important;
        opacity: 0.8 !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        &:focus {
          box-shadow: none !important;
        }
      }
    }

    .offcanvas-body {
      padding: 0 !important;
    }

    .mobile-menu {
      height: 100%;
      display: flex;
      flex-direction: column;

      .header-top-list {
        padding: 1rem 0 !important;
        list-style: none !important;
        margin: 0 !important;

        li {
          margin: 0 !important;
          border-bottom: 1px solid #f8f8f8 !important;
          width: 100% !important;
          
          &:last-child {
             border-bottom: none !important;
          }
          
          & > a {
            display: block !important;
            padding: 14px 24px !important;
            font-size: 0.95rem !important;
            font-weight: 500 !important;
            color: #333 !important;
            letter-spacing: 0.2px !important;
            text-transform: capitalize !important;
            transition: all 0.2s ease !important;
            text-decoration: none !important;

            &:hover, &:active {
              color: #704a0d !important;
              background-color: rgba(112, 74, 13, 0.04) !important;
            }
          }
        }
      }

      .social-container-wrapper {
        margin-top: auto !important;
        padding: 2rem 1.5rem !important;
        border-top: 1px solid #f1f1f1 !important;
        background: #fff !important;
      }

      .social-container {
        display: flex !important;
        justify-content: center !important;
        gap: 1.2rem !important;
        padding: 0 !important;
        margin: 0 !important;
        list-style: none !important;

        li {
          border: none !important;
          width: auto !important;
        }

        li a {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 42px !important;
          height: 42px !important;
          border-radius: 50% !important;
          background: #f8f8f8 !important;
          color: #555 !important;
          font-size: 1.2rem !important;
          transition: all 0.3s ease !important;
          text-decoration: none !important;

          &:hover {
            background: #704a0d !important;
            color: #fff !important;
            transform: translateY(-3px) !important;
            box-shadow: 0 4px 12px rgba(112, 74, 13, 0.15) !important;
          }
        }
      }
    }

    /* Accordion Overrides */
    .accordion {
      width: 100% !important;
    }
    
    .accordion-item {
      border: none !important;
      border-radius: 0 !important;
      background: transparent !important;
      margin: 0 !important;

      .accordion-header {
        padding: 0 !important;
        border: none !important;
        margin: 0 !important;
        
        .accordion-button {
          padding: 14px 24px !important;
          font-size: 0.95rem !important;
          font-weight: 500 !important;
          color: #333 !important;
          background-color: transparent !important;
          box-shadow: none !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          border: none !important;
          text-decoration: none !important;
          width: 100% !important;

          &::after {
            width: 0.8rem !important;
            height: 0.8rem !important;
            background-size: 0.8rem !important;
            transition: transform 0.3s ease !important;
            opacity: 0.4 !important;
            margin-left: auto !important;
          }

          &:not(.collapsed) {
            color: #704a0d !important;
            background-color: rgba(112, 74, 13, 0.04) !important;
            
            &::after {
              opacity: 0.8 !important;
              transform: rotate(-180deg) !important;
            }
          }
          
          &:focus {
            box-shadow: none !important;
            background-color: rgba(112, 74, 13, 0.04) !important;
          }
        }
      }

      .accordion-body {
        padding: 0 !important;
        background-color: #fcfcfc !important;
        display: flex !important;
        flex-direction: column !important;
        border: none !important;

        a {
          padding: 10px 48px !important;
          font-size: 0.9rem !important;
          color: #666 !important;
          text-decoration: none !important;
          transition: all 0.2s ease !important;
          display: block !important;
          width: 100% !important;

          &:hover, &:active {
            color: #704a0d !important;
            background-color: rgba(112, 74, 13, 0.02) !important;
          }
        }
      }
    }
  }
`;

const Header = () => {
  const [showMenu, setShowMenu] = useState(false);
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentSearchingTerm, setCurrentSearchingTerm] = useState("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const CATEGORY_ORDER = [
    "Hair Oil",
    "Shampoo",
    "Scalp Massager",
    "Herbal Hair Mask Powder", // Renamed in UI but kept for sorting
    "Neem Combs",
    "Rosemary Leaves",
    "Combo's",
    "Kits"
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tbl_name: 'categories' })
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          const sortedCategories = [...data].sort((a, b) => {
            const indexA = CATEGORY_ORDER.indexOf(a.name);
            const indexB = CATEGORY_ORDER.indexOf(b.name);
            if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
          setCategories(sortedCategories);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

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

  const [isSticky, setIsSticky] = useState(false);


  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 100) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <GlobalMobileMenuStyle />
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
      <StyledHeader className={`header-part ${isSticky ? 'fixed-header' : ''}`}>

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
                    {categories.map((cat, index) => (
                      <li key={cat.id || index}>
                        <button
                          className="dropdown-item"
                          onClick={() => router.push(`/category/${cat.slug || cat.handle || ""}`)}
                        >
                          {cat.name === "Herbal Hair Mask Powder" ? "Hair Mask Powder" : cat.name}
                        </button>
                      </li>
                    ))}
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

              <button className="header-widget header-wishlist" title="Go to wishlist">
                <Link
                  href="/wishlist"
                  onClick={(e) => pathname?.includes("wishlist") && e.preventDefault()}
                >
                  <FaHeart />
                  {wishlistCount > 0 && <sup>{wishlistCount}</sup>}
                </Link>
              </button>

              <button className="header-widget header-cart" title="Go to cart">
                <Link
                  href="/cart"
                  onClick={(e) => pathname?.includes("cart") && e.preventDefault()}
                >
                  <FaShoppingCart />
                  <sup>{cartCount}</sup>
                </Link>
              </button>

              <div className="header-widget">
                {user ? (
                  <Link href="/profile" className="header-profile" title="My Profile">
                    <FaUserCircle size={24} color="var(--primary)" />
                  </Link>
                ) : (
                  <Link href="/login" className="login-btn">
                    <span>Login</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </StyledHeader>

      <OffCanvasWrapper>
        <Offcanvas className="styled-offcanvas" show={showMenu} onHide={hideMobileCanvas} placement="start">
          {/* Replace Offcanvas.Header to avoid React 19 "element.ref" access inside library components */}
          <div className="offcanvas-header">
            <button type="button" className="btn-close" aria-label="Close" onClick={hideMobileCanvas}></button>
          </div>
          <Offcanvas.Body>
            <div className="mobile-menu">
              <ul className="header-top-list">
                <li>
                  <Link href="/" onClick={hideMobileCanvas}>
                    Home
                  </Link>
                </li>
                <li>
                  <StyledAccordion>
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>Shop</Accordion.Header>
                      <Accordion.Body>
                        <Link href="/search?searchtext=all" onClick={hideMobileCanvas}>
                          All Products
                        </Link>

                        {categories.map((cat, index) => (
                          <Link
                            key={cat.id || index}
                            href={`/category/${cat.slug || cat.handle || ""}`}
                            onClick={hideMobileCanvas}
                          >
                            {cat.name === "Herbal Hair Mask Powder" ? "Hair Mask Powder" : cat.name}
                          </Link>
                        ))}
                      </Accordion.Body>
                    </Accordion.Item>
                  </StyledAccordion>
                </li>
                <li>
                  <StyledAccordion>
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
                  </StyledAccordion>
                </li>
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
                <li>
                  <StyledAccordion>
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
                  </StyledAccordion>
                </li>
                <li>
                  <Link href="/track-order" onClick={hideMobileCanvas}>
                    Track Order
                  </Link>
                </li>
              </ul>
              <div className="social-container-wrapper">
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
    transition: transform 0.3s ease-in-out, background 0.3s ease, box-shadow 0.3s ease;
    width: 100%;
    z-index: 99;
    /* Default position */
    position: relative; 
    
    &.fixed-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      transform: translateY(0);
    }


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
      .header-cart,
      .header-wishlist {
        color: var(--white);
        background: var(--chalk);
        border-radius: 50%;
        width: 1.6rem;
        svg path {
          fill: var(--primary);
        }
      }
      .header-wishlist {
        svg {
          color: var(--primary);
        }
      }
      
      .login-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--primary);
        font-weight: 600;
        text-decoration: none !important;
        padding: 5px 12px;
        border-radius: 6px;
        transition: all 0.3s ease;
        font-size: 0.95rem;

        &:hover {
          background: rgba(112, 74, 13, 0.08);
          color: #5c3c0b;
        }
      }
    }

    /* Active state for when menu or search is open, keeps header visible */
    &.active {
       background: var(--white);
    }
  }

  //bootstrap break-point: md
  @media (max-width: 576px) {
    &.header-part {
      padding: 0.4rem 0;
      
      .header-content {
        margin-bottom: 2.8rem; /* Increased to accommodate search bar */
        display: flex;
        justify-content: space-between;
        align-items: center;

        .header-logo-and-list {
          .header-logo {
            margin-right: 1rem;
            img {
              height: 2.2rem;
            }
          }
        }

        .search-section {
          position: absolute;
          bottom: 0.4rem;
          left: 0.75rem;
          right: 0.75rem;
          width: calc(100% - 1.5rem);
        }

        .header-widget-group {
          margin-right: 0;
          gap: 8px;

          .header-widget {
            margin-left: 8px;
          }

          .header-wishlist {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .login-btn {
            padding: 4px 8px;
            font-size: 0.85rem;
          }
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
  /* Handled by GlobalMobileMenuStyle */
`;

const StyledAccordion = styled(Accordion)`
  /* Handled by GlobalMobileMenuStyle */
`;

const StyledDropdownToggle = styled(Dropdown.Toggle)`
    padding: 0;
    border: none;
    color: var(--primary);
    &::after {
        display: none !important;
    }
    &:hover, &:focus, &:active {
        color: var(--primary-dark) !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
    }
`;
