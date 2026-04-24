'use client';

import React, { useMemo } from "react";
import Link from "next/link";
import styled from "styled-components";
// import Freeshiping from '../Home/Freeshiping';
// import Follow from '../Home/Follow';

const Footer = () => {
  const currentYear = useMemo(() => {
    const date = new Date();
    return date.getFullYear();
  }, []);
  return (
    <>
      <StyledFooter className="footer-part">
        <div className="container">
          <div className="row">
            <div className="col-sm-6 col-xl-3">
              <div className="footer-widget">
                <Link className="footer-logo" href="/" title="Go to Home Page">
                  <img src="/assets/images/logo-final.png" alt="logo" />
                </Link>

                <p className="footer-desc">
                  Experience the power of nature with our Vyra herbal hair care
                  products, formulated to promote healthy, shiny and beautiful
                  hair.
                </p>
                <ul className="social-container">
                  <li>
                    <a
                      target="_blank"
                      rel="noopener"
                      href="https://www.facebook.com/vyraherbals"
                      className="icofont-facebook"
                    />
                  </li>
                  <li>
                    <a
                      target="_blank"
                      rel="noopener"
                      href="https://www.instagram.com/vyraherbals"
                      className="icofont-instagram"
                    />
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
            <div className="col-sm-6 col-xl-3">
              <div className="footer-widget">
                <h3 className="footer-title">quick Links</h3>
                <div className="footer-links">
                  <ul>
                    {/* <li>
                      <a href="#">My Account</a>
                    </li> */}
                    <li>
                      <Link href={"/search?searchtext=all"}>Shop</Link>
                    </li>
                    <li>
                      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                      <a href="/#bestSellers">Best Seller</a>
                    </li>
                    {/* <li>
                      <a href="#">New Arrivals</a>
                    </li> */}
                    <li>
                      <Link href="/faqs">FAQs</Link>
                    </li>
                  </ul>
                  <ul>
                    <li>
                      <Link href="/about">About Us</Link>
                    </li>
                    <li>
                      <Link href="/contact">Contact Us</Link>
                    </li>
                    <li>
                      <Link href="/privacy-policy">Privacy Policy</Link>
                    </li>
                    <li>
                      <Link href="/terms-conditions">Terms and Conditions</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-xl-3">
              <div className="footer-widget contact">
                <h3 className="footer-title">contact us</h3>
                <ul className="footer-contact">
                  <li>
                    <i className="icofont-ui-email"></i>
                    <a className="link" href="mailto:vyraherbals@gmail.com">
                      vyraherbals@gmail.com
                    </a>
                  </li>
                  <li>
                    <i className="icofont-ui-touch-phone"></i>
                    <p>
                      <span>+91 9866082590</span>
                    </p>
                  </li>
                  <li>
                    <i className="icofont-location-pin"></i>
                    <p>
                      <span>
                        32-75, CSP Road, Mandamarri, Mancherial (Dist.),
                      </span>
                      <span className="text-nowrap">
                        Telangana - 504231, India
                      </span>
                    </p>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="footer-widget">
                <h3 className="mb-2">100% secure payments by EaseBuzz</h3>
                <h5>Our Delivery partners:</h5>
                Delhivery | XpressBees | eComXpress | DTDC
                <div className="del-dt">
                  <span>
                    <img src="/assets/images/dtdc.jpg" alt="payment" />
                  </span>
                  <span>
                    <img src="/assets/images/delivery.jpg" alt="payment" />
                  </span>
                  <span>
                    <img src="/assets/images/xpress.jpg" alt="payment" />
                  </span>
                  <span>
                    <img src="/assets/images/express.png" alt="payment" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="footr-top">
            <div className="col-12">
              <div className="container">
                <div className="footer-bottom">
                  <p className="footer-copytext">
                    © {currentYear} VyraHerbals. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="footer_wts">
          <a target="_blank" rel="noopener" href="https://wa.me/919866082590">
            <img
              className="whts-icon"
              src="/assets/images/wts-nw.png"
              alt=""
              width="150"
              height="150"
            />
          </a>
        </div>
      </StyledFooter>
    </>
  );
};

export default Footer;

const StyledFooter = styled.footer`
  .footer_wts img {
    width: 100%;
    height: 100%;
  }
  .footer_wts {
    position: fixed;
    bottom: 5rem;
    width: 3rem;
    right: 2rem;
    left: auto;
    z-index: 2500;
    height: 3rem;
  }

  /* Marketplace availability strip styling */
  .marketplace-available {
    background: linear-gradient(to right, #fdfbf7, #f7f1e6);
    border-top: 1px solid rgba(0,0,0,0.05);
    padding: 30px 0;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
  }
  .marketplace-text {
    border-left: 3px solid var(--primary);
    padding-left: 20px;
  }
  .marketplace-available .marketplace-title {
    margin: 0 0 6px 0;
    font-size: 1.25rem;
    color: var(--heading);
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .marketplace-available .marketplace-desc {
    margin: 0;
    color: #666;
    font-size: 1rem;
    opacity: 0.9;
  }
  .marketplace-logos {
    display: flex;
    gap: 32px;
    align-items: center;
    justify-content: flex-end;
  }
  .market-link {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 45px;
    transition: all .3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 8px 12px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    border: 1px solid rgba(0,0,0,0.03);
  }
  .market-link:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(112,74,13,0.1);
    border-color: var(--primary-light, #f1e9da);
  }
  .market-logo {
    height: 100%;
    width: auto;
    max-width: 110px;
    object-fit: contain;
    transition: all .3s ease;
  }
  .market-logo.amazon-logo { height: 24px; }
  .market-logo.flipkart-logo { height: 28px; }
  .market-logo.meesho-logo { height: 28px; }
  
  .market-link:hover .market-logo {
    filter: brightness(1.05);
  }

  @media (max-width: 575px) {
    .footer_wts {
      bottom: 5rem;
      right: 1rem;
      left: auto;
    }

    .marketplace-available {
      text-align: left;
      padding: 25px 0;
    }
    .marketplace-text {
      border-left: none;
      padding-left: 0;
      margin-bottom: 20px;
    }
    .marketplace-logos {
      justify-content: center;
      gap: 15px;
    }
    .market-link {
      height: 40px;
      padding: 6px 10px;
      flex: 1;
      max-width: 120px;
    }
    .market-logo.amazon-logo { height: 18px; }
    .market-logo.flipkart-logo { height: 22px; }
    .market-logo.meesho-logo { height: 22px; }
  }
`;
