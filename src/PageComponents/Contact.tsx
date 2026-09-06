'use client';

import { supabase } from "@/utils/supabaseClient";
import React, { useState } from "react";
import styled from "styled-components";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    comment: "",
  });
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionStatus('loading');

    try {
      const { error } = await supabase
        .from('contact_inquiries')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            comment: formData.comment,
          }
        ]);

      if (error) throw error;

      setSubmissionStatus('success');
      setFormData({ name: "", email: "", phone: "", comment: "" });
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setSubmissionStatus('error');
    }
  };

  return (
    <StyledContact className="row">
      <div className="col-md-8 contact-form">
        <h2>Contact Us</h2>
        {submissionStatus === 'success' ? (
          <div className="alert alert-success">
            <h3>Thank you!</h3>
            <p>Your message has been sent successfully. We will get back to you soon.</p>
            <button
              className="btn btn-primary mt-3"
              onClick={() => setSubmissionStatus('idle')}
            >
              Send another message
            </button>
          </div>
        ) : (
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
                disabled={submissionStatus === 'loading'}
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
                disabled={submissionStatus === 'loading'}
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
                disabled={submissionStatus === 'loading'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="comment">Comment</label>
              <textarea
                id="comment"
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                required
                disabled={submissionStatus === 'loading'}
              />
            </div>

            {submissionStatus === 'error' && (
              <p className="error-message">Failed to send message. Please try again.</p>
            )}

            <button type="submit" disabled={submissionStatus === 'loading'}>
              {submissionStatus === 'loading' ? 'Sending...' : 'Send message'}
            </button>
          </form>
        )}
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

  @media (max-width: 768px) {
    padding: 1rem;
    .contact-form {
      padding: 1.5rem;
      h2 {
        font-size: 1.8rem;
      }
      .form-group {
        input, textarea {
          font-size: 1.2rem;
        }
      }
    }
  }

  .contact-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    @media (max-width: 768px) {
      margin-top: 2rem;
      padding: 0 1rem;
    }
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
