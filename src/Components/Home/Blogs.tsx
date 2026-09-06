'use client';

import React from "react";

const Blogs = () => {
  return (
    <section className="pt-4 pb-4">
      <div className="blog-slider">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="section-heading">
                <h2>Our Blogs</h2>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-4">
              <div className="blog-card">
                <div className="blog-media">
                  <a className="blog-img" href="#">
                    <img src="/assets/images/blog-01.jpg" alt="blog" />
                  </a>
                </div>
                <div className="blog-content">
                  <ul className="blog-meta">
                    <li>
                      <i className="fas fa-user"></i>
                      <span>admin</span>
                    </li>
                    <li>
                      <i className="fas fa-calendar-alt"></i>
                      <span>July 02, 2024</span>
                    </li>
                  </ul>
                  <h4 className="blog-title">
                    <a href="blog-details.html">
                      Voluptate blanditiis provident....
                    </a>
                  </h4>
                  <p className="blog-desc">
                    Lorem ipsum dolor sit, amet consectetur adipisicing elit...{" "}
                  </p>
                  <a className="blog-btn" href="#">
                    <span>read more</span>
                    <i className="icofont-arrow-right"></i>
                  </a>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="blog-card">
                <div className="blog-media">
                  <a className="blog-img" href="#">
                    <img src="/assets/images/blog-01.jpg" alt="blog" />
                  </a>
                </div>
                <div className="blog-content">
                  <ul className="blog-meta">
                    <li>
                      <i className="fas fa-user"></i>
                      <span>admin</span>
                    </li>
                    <li>
                      <i className="fas fa-calendar-alt"></i>
                      <span>July 02, 2024</span>
                    </li>
                  </ul>
                  <h4 className="blog-title">
                    <a href="blog-details.html">
                      Voluptate blanditiis provident....
                    </a>
                  </h4>
                  <p className="blog-desc">
                    Lorem ipsum dolor sit, amet consectetur adipisicing elit...{" "}
                  </p>
                  <a className="blog-btn" href="#">
                    <span>read more</span>
                    <i className="icofont-arrow-right"></i>
                  </a>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="blog-card">
                <div className="blog-media">
                  <a className="blog-img" href="#">
                    <img src="/assets/images/blog-01.jpg" alt="blog" />
                  </a>
                </div>
                <div className="blog-content">
                  <ul className="blog-meta">
                    <li>
                      <i className="fas fa-user"></i>
                      <span>admin</span>
                    </li>
                    <li>
                      <i className="fas fa-calendar-alt"></i>
                      <span>July 02, 2024</span>
                    </li>
                  </ul>
                  <h4 className="blog-title">
                    <a href="blog-details.html">
                      Voluptate blanditiis provident....
                    </a>
                  </h4>
                  <p className="blog-desc">
                    Lorem ipsum dolor sit, amet consectetur adipisicing elit...{" "}
                  </p>
                  <a className="blog-btn" href="#">
                    <span>read more</span>
                    <i className="icofont-arrow-right"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Blogs;
