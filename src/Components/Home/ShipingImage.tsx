'use client';

import React from "react";
import Link from "next/link";

const ShipingImage = () => {
  return (
    // <section className="section countdown-part">
    //     <div className="container">
    //         <div className="row align-items-center">
    //             <div className="col-lg-6 mx-auto">
    //                 <div className="countdown-content">
    //                     <h3>special discount offer for vegetable items</h3>
    //                     <p>Reprehenderit sed quod autem molestiae aut modi minus veritatis iste dolorum suscipit quis voluptatum fugiat mollitia quia minima</p>
    //                     <div className="countdown countdown-clock" data-countdown="2021/09/09"><span className="countdown-time"><span>00</span><small>days</small></span><span className="countdown-time"><span>00</span><small>hours</small></span><span className="countdown-time"><span>00</span><small>minutes</small></span><span className="countdown-time"><span>00</span><small>seconds</small></span>
    //                     </div><a href="shop-4column.html" className="btn btn-inline"><i className="fas fa-shopping-basket"></i><span>shop now</span></a></div>
    //             </div>
    //             <div className="col-lg-1"></div>
    //             <div className="col-lg-5">
    //                 <div className="countdown-img"><img src="/assets/images/countdown.png" alt="countdown" />
    //                     <div className="countdown-off"><span>20%</span><span>off</span></div>
    //                 </div>
    //             </div>
    //         </div>
    //     </div>
    // </section>

    <>
      <section>
        <div className="free_ship">
          <Link href="/search?searchtext=all">
            <img src="/assets/images/freeshiping-01.png" />
          </Link>
        </div>
      </section>
    </>
  );
};

export default ShipingImage;
