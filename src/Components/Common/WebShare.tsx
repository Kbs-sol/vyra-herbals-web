'use client';

import React from "react";
import { RWebShare } from "react-web-share";

function WebShare(props) {
  const {
    title,
    text = "Vyra Herbals - Truth in every drop",
    url,
    onClick,
    children,
    icon = <i className="fas fa-share-alt me-2" />,
    label,
  } = props;
  return (
    <RWebShare
      data={{
        text,
        url,
        title,
      }}
      onClick={onClick}
    >
      <section>
        {children || (
          <span className="share-label-icon">
            {icon} <span className="label">{label}</span>
          </span>
        )}
      </section>
    </RWebShare>
  );
}
export default React.memo(WebShare);
