'use client';

import React from "react";
import styled from "styled-components";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

const Follow = () => {
  return (
    <StyledFollowSection className="connect-section-curated">
      <div className="container">
        <div className="connect-card-box">
          <div className="text-center mb-4">
            <span className="connect-eyebrow">DIRECT BOTANICAL CARE</span>
            <h2 className="connect-heading">Connect With Our Herbal Team</h2>
            <p className="connect-subtext">
              Have questions about your hair fall, ingredients, or ritual? We're here to help you choose the right formulation.
            </p>
          </div>

          <div className="row justify-content-center g-3">
            {/* WhatsApp Tile */}
            <div className="col-12 col-md-5 col-lg-4">
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://wa.me/919866082590"
                className="connect-tile whatsapp-tile"
              >
                <div className="tile-icon-box">
                  <FaWhatsapp size={28} />
                </div>
                <div className="tile-text-box">
                  <span className="tile-label">INSTANT WHATSAPP</span>
                  <h4 className="tile-title">Chat With Us</h4>
                  <p className="tile-desc">Direct advice on routines and order help</p>
                </div>
              </a>
            </div>

            {/* Instagram Community Tile */}
            <div className="col-12 col-md-5 col-lg-4">
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.instagram.com/vyraherbals"
                className="connect-tile instagram-tile"
              >
                <div className="tile-icon-box">
                  <FaInstagram size={28} />
                </div>
                <div className="tile-text-box">
                  <span className="tile-label">COMMUNITY SPOTLIGHT</span>
                  <h4 className="tile-title">Join 3,000+ On Instagram</h4>
                  <p className="tile-desc">Real stories, hair tips & behind-the-scenes</p>
                </div>
              </a>
            </div>
          </div>

          <p className="connect-timing-note">
            Personal replies Monday to Saturday, 9:00 AM – 10:00 PM IST
          </p>
        </div>
      </div>
    </StyledFollowSection>
  );
};

export default Follow;

const StyledFollowSection = styled.section`
  padding: 4rem 0;
  background-color: var(--vyra-canvas, #ffffff);

  .connect-card-box {
    background: #f8f9f8;
    border: 1px solid var(--vyra-border-hairline, rgba(11, 20, 14, 0.08));
    border-radius: 4px;
    padding: 3.5rem 2rem;
  }

  .connect-eyebrow {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #b58934;
    display: block;
    margin-bottom: 0.5rem;
  }

  .connect-heading {
    font-size: clamp(1.6rem, 3vw, 2.3rem);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    color: #0b140e;
    margin-bottom: 0.6rem;
  }

  .connect-subtext {
    font-size: 0.92rem;
    color: #4a574f;
    max-width: 540px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .connect-tile {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #ffffff;
    border: 1px solid rgba(11, 20, 14, 0.1);
    border-radius: 4px;
    padding: 20px 22px;
    text-decoration: none;
    transition: all 0.25s ease;
    height: 100%;

    &:hover {
      border-color: #0b140e;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(11, 20, 14, 0.06);
    }
  }

  .whatsapp-tile .tile-icon-box {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #e7f7ed;
    color: #128c7e;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .instagram-tile .tile-icon-box {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #fdf0f4;
    color: #c13584;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tile-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #78857d;
    text-transform: uppercase;
    display: block;
    margin-bottom: 2px;
  }

  .tile-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #0b140e;
    margin: 0 0 2px;
  }

  .tile-desc {
    font-size: 0.8rem;
    color: #5d6d62;
    margin: 0;
    line-height: 1.4;
  }

  .connect-timing-note {
    text-align: center;
    font-size: 0.78rem;
    color: #78857d;
    margin-top: 2rem;
    margin-bottom: 0;
    font-weight: 500;
  }

  @media (max-width: 576px) {
    padding: 2.5rem 0;

    .connect-card-box {
      padding: 2rem 1.25rem;
    }

    .connect-tile {
      padding: 16px;
    }

    .tile-title {
      font-size: 0.95rem;
    }
  }
`;
