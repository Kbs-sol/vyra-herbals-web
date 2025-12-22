'use client';

import React from "react";

const Founder = () => {
  return (
    <section className="about-company pt-4 pb-4">
      <div className="container">
        <h2 className="moble-on d-none">Meet our Founder</h2>
        <div className="row align-items-center">
          <div className="col-lg-6">
            <div className="about-content">
              <h2 className="desk-on">Meet our Founder</h2>
              <p>
                At Vyra Herbals, every bottle tells a story—my story. I'm Sahera
                Banu, the founder, and I started this journey not as a
                businesswoman, but as someone struggling with hair problems,
                just like you.
              </p>
              <p>
                I faced significant challenges with my hair. I dealt with
                thinning hair, excessive breakage, and a lack of shine. After
                trying countless products with no results, It was one of the
                toughest periods of my life, leaving me feeling hopeless and
                frustrated.
              </p>
              <p>
                There were moments when I felt like giving up entirely. But
                then, something shifted...
              </p>
              <p className="">
                <a href="/about#story-continue-reading">Continue Reading...</a>
              </p>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="about-img">
              <img src="/assets/images/vyra-founder.jpeg" alt="about" />
              <div className="fondr-titl">
                <h4>Sahera Banu</h4>
                <h5>Founder</h5>
              </div>
            </div>
          </div>
        </div>

        {/* <p className='moble-on d-none'><a href="#">Continue Reading...</a></p> */}
      </div>
    </section>
  );
};

export default Founder;
