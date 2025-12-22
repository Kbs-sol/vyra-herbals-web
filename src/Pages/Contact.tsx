'use client';

import React, { useState } from "react";
import styled from "styled-components";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    comment: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add form submission logic here (API call)
    console.log("Form data submitted:", formData);
  };

  return (
    <StyledContact className="row">
      <div className="col-md-8 contact-form">
        <h2>Contact Us</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="comment">Comment</label>
            <textarea
              id="comment"
              name="comment"
              value={formData.comment}
              onChange={handleChange}
            />
          </div>

          <button type="submit">Send message</button>
        </form>
      </div>
      <div className="col-md-3 contact-wrapper">
        <ul className="contact-list">
          <li className="my-4">
            <h4>Phone</h4>
            <a className="link" href="tel:+91 9866082590">
              +91 9866082590
            </a>
          </li>
          <li className="my-4">
            <h4>Email</h4>
            <a className="link" href="mailto:vyraherbals@gmail.com">
              vyraherbals@gmail.com
            </a>
          </li>
          <li className="my-4">
            <h4>Follow us</h4>
            <ul className="social-container">
              <li>
                <a
                  target="_blank"
                  rel="noopener"
                  href="https://www.facebook.com/vyraherbals"
                  className="icofont-facebook"
                ></a>
              </li>
              <li>
                <a
                  target="_blank"
                  rel="noopener"
                  href="https://www.instagram.com/vyraherbals"
                  className="icofont-instagram"
                ></a>
              </li>
              <li>
                <a
                  target="_blank"
                  rel="noopener"
                  href="https://www.youtube.com/@vyraherbals"
                  className="fab fa-youtube"
                />
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </StyledContact>
  );
};

export default Contact;
const StyledContact = styled.section`
  background-color: #f7f7f7;
  padding-bottom: 3rem;
  justify-content: space-around;
  .contact-form {
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 0.4rem 0.8rem rgba(0, 0, 0, 0.1);
    h2 {
      font-size: 2.3rem;
      text-align: center;
      color: #333;
    }

    .form-group {
      margin-bottom: 1.5rem;

      label {
        display: block;

        font-weight: bold;
        margin-bottom: 0.5rem;
        color: #555;
      }

      input,
      textarea {
        width: 100%;
        padding: 0.4rem;
        font-size: 1.6rem;
        border: 1px solid #ccc;
        border-radius: 0.5rem;
        box-sizing: border-box;
        background-color: #fff;
      }
      textarea {
        resize: vertical;
        height: 5rem;
        min-height: 3rem;
      }
    }

    button[type="submit"] {
      background-color: #704a0d;
      color: #fff;
      padding: 0.5rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      display: block;
      width: 100%;
      &:hover {
        background-color: #704a0d;
      }
    }
  }

  .contact-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    .contact-list {
      a {
        color: #000;
        &:hover {
          text-decoration: underline;
        }
      }
      li h4 {
        color: #83563f;
      }
      .social-container {
        display: flex;
        gap: 1.4rem;
        a {
          text-decoration: none;
          color: #83563f;
          &:hover {
            color: #fff;
          }
        }
      }
    }
  }
`;
