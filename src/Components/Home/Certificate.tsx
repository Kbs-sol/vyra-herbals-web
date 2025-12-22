'use client';

import React from "react";

const Certificate = () => {
  return (
    <>
      <section className="cerse pb-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="section-heading">
                <h2>Our Certifications </h2>
              </div>
            </div>
          </div>
          <div className="row align-items-center justify-content-center cert-out">
            {/* <div className="col-md-1">
          </div>
          <div className="col-md-1">
          </div> */}

            <div className="col-md-3">
              <div className="text-center">
                <img
                  src="/assets/images/certificates/certificate-02.png"
                  width={230}
                  alt="certification"
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center">
                <img
                  src="/assets/images/certificates/certificate-01.png"
                  width={230}
                  alt="certification"
                />
              </div>
            </div>

            <div className="col-md-3">
              <div className="text-center">
                <img
                  src="/assets/images/certificates/certificate-03.jpg"
                  width={230}
                  alt="certification"
                />
              </div>
            </div>
            {/* <div className="col-md-3">
           <div className='text-center'>
           <img src="/assets/images/certificates/certificate-04.png" width={230}  alt="certification" />
            </div>
           </div> */}
            {/* <div className="col-md-1">
           </div>
           <div className="col-md-1">
           </div> */}
          </div>
        </div>
      </section>
    </>
  );
};

export default Certificate;
