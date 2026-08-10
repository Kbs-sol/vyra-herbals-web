'use client';

import React from "react";
import { Helmet } from "react-helmet";

type SEOComponentProps = {
  title?: string;
  /** Optional: pages that only set a title simply omit the meta description. */
  description?: string;
};

const SEOComponent = ({ title, description }: SEOComponentProps) => {
  return (
    <Helmet>
      <meta charSet="utf-8" />
      <title>{title}</title>
      <meta name="description" content={description} />
      {/* Add any other meta tags here */}
      {/* Include Bootstrap CSS if needed */}
      {/* <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        integrity="..."
        crossorigin="anonymous"
      /> */}
    </Helmet>
  );
};

export default SEOComponent;
