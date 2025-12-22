// import React from 'react'

import { DNA } from "react-loader-spinner";

const Loader = () => {
  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="spinner-container">
            {/* <DNA
            visible={true}
            height="80"
            width="80"
            ariaLabel="dna-loading"
            wrapperStyle={{}}
            wrapperClass="dna-wrapper"
          /> */}

            <div id="edublink-preloader">
              <div className="loading-spinner">
                <div className="preloader-spin-1"></div>
                <div className="preloader-spin-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Loader;
