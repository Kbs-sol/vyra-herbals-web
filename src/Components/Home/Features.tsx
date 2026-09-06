'use client';

import React from "react";

const Features = () => {
  return (
    <section className="intro-part">
      <div className="container">
        <div className="row intro-content">
          <div className="col-sm-6 col-lg-3">
            <div className="intro-wrap">
              <div className="intro-icon">
                <i className="fas fa-truck"></i>
              </div>
              <div className="intro-content">
                <h5>Door delivery</h5>
                <p>
                  Enjoy free home delivery across India with Vyra Herbals. Get
                  your favorite herbal products delivered to your doorstep.
                </p>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="intro-wrap">
              <div className="intro-icon">
                <i className="fas fa-hand-holding-usd"></i>
              </div>
              <div className="intro-content">
                <h5>Affordable Pricing</h5>
                <p>
                  High quality, herbal hair care at affordable prices. Discover
                  effective, natural products that fit your budget.
                </p>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="intro-wrap">
              <div className="intro-icon">
                <i className="fas fa-headset"></i>
              </div>
              <div className="intro-content">
                <h5>Quick Support System</h5>
                <p>
                  Our quick support team is always ready to assist with any
                  queries or issues. Reach out for fast, reliable help.
                </p>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="intro-wrap">
              <div className="intro-icon">
                <i className="fas fa-lock"></i>
              </div>
              <div className="intro-content">
                <h5>secure payments way</h5>
                <p>
                  Shop safely with our secure payment options. Your details are
                  protected with our encrypted payment gateway for a worry-free
                  checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
