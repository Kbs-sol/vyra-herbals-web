'use client';

import React from "react";

type SVGIconProps = {
  iconName: string;
  className?: string;
  height?: number;
  width?: number;
};

const SVGIcon = ({ iconName, className, height = 24, width = 24 }: SVGIconProps) => {
  switch (iconName) {
    case "line-graph":
      return (
        <svg
          version="1.0"
          xmlns="http://www.w3.org/2000/svg"
          width={width}
          height={height}
          viewBox="0 0 457.000000 427.000000"
          preserveAspectRatio="xMidYMid meet"
          className={className}
        >
          <g
            transform="translate(0.000000,427.000000) scale(0.100000,-0.100000)"
            fill="#000000"
            stroke="none"
          >
            <path
              d="M3680 3000 c-36 -10 -192 -53 -348 -96 l-283 -77 91 -92 92 -92 -339
       -344 c-187 -189 -398 -404 -470 -478 l-130 -135 -283 287 c-156 158 -287 286
       -291 285 -5 -2 -86 -73 -181 -159 -95 -86 -297 -268 -448 -404 -317 -287 -309
       -274 -235 -361 l47 -54 106 96 c59 54 242 219 406 367 l299 270 290 -291 289
       -291 372 377 c204 207 444 451 533 542 l163 165 104 -110 c57 -60 106 -108
       109 -105 6 6 187 691 187 708 0 15 0 15 -80 -8z"
            />
          </g>
        </svg>
      );

    case "error-icon":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 12 12"
          width="12"
          height="12"
          fill="none"
          stroke="#dc3545"
          className="error-icon"
        >
          <circle cx="6" cy="6" r="4.5" />
          <path strokeLinejoin="round" d="M5.8 3.6h.4L6 6.5z" />
          <circle cx="6" cy="8.2" r=".6" fill="#dc3545" stroke="none" />
        </svg>
      );

    default:
      return <>NA</>;
  }
};

export default SVGIcon;
