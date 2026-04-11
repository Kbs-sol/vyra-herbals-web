import React from 'react';

const MarketplaceAvailable = () => {
  return (
    <section className="marketplace-available section">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-7">
            <div className="marketplace-text">
              <h4 className="marketplace-title">Now Shop on Your Favorite Platforms</h4>
              <p className="marketplace-desc mb-0">
                Experience Vyra Herbals quality on Amazon, Flipkart, and Meesho.
              </p>
            </div>
          </div>
          <div className="col-md-5 text-md-end text-start mt-3 mt-md-0">
            <div className="marketplace-logos">
              <a
                href="https://www.amazon.in/stores/VyraHerbals/page/C2261B34-C6F6-4EF1-ABD0-8686E06686E8?lp_asin=B0DLPCD26N&ref_=cm_sw_r_apann_ast_store_WAB400E495G0943WH87C"
                target="_blank"
                rel="noopener noreferrer"
                className="market-link"
                title="Shop VyraHerbals on Amazon"
              >
                <img
                  src="/amazon-logo-png_seeklogo-286206.png"
                  alt="Amazon"
                  className="market-logo amazon-logo"
                />
              </a>
              <a
                href="https://dl.flipkart.com/s/2nTQvdNNNN"
                target="_blank"
                rel="noopener noreferrer"
                className="market-link"
                title="Shop VyraHerbals on Flipkart"
              >
                <img
                  src="/flipkart-logo-icon-flat-style-png-4.png"
                  alt="Flipkart"
                  className="market-logo flipkart-logo"
                />
              </a>
              <a
                href="https://www.meesho.com/VyraHerbals?_ms=3.0.1"
                target="_blank"
                rel="noopener noreferrer"
                className="market-link"
                title="Shop VyraHerbals on Meesho"
              >
                <img
                  src="/Meesho-682x435.avif"
                  alt="Meesho"
                  className="market-logo meesho-logo"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketplaceAvailable;
