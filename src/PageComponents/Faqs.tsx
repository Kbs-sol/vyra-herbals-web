'use client';

import React, { useState } from "react";
import { Card } from "react-bootstrap";

const Faqs = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // const faqs = [
  //   {
  //     question: 'What are the benefits of using natural beauty products?',
  //     answer:
  //       'Natural beauty products use ingredients derived from nature, such as plants, herbs, and essential oils. They are free from harmful chemicals and are gentle on the skin, offering various benefits like nourishment, hydration, and protection.',
  //   },
  //   {
  //     question: 'Are your products cruelty-free?',
  //     answer:
  //       'Yes, all our products are cruelty-free. We do not test on animals, and we ensure that our suppliers adhere to ethical practices.',
  //   },
  //   {
  //     question: 'How do I know if a product is suitable for my skin type?',
  //     answer:
  //       'We provide detailed information about each product, including its ingredients and recommended skin types. Additionally, you can consult with our skincare experts for personalized recommendations.',
  //   },
  //   {
  //     question: 'Do you offer international shipping?',
  //     answer:
  //       'Yes, we offer international shipping to select countries. Please check our shipping policy or contact customer support for more information.',
  //   },
  //   {
  //     question: 'What is your return policy?',
  //     answer:
  //       'We have a hassle-free return policy. If you are not satisfied with your purchase, you can return the product within 30 days for a full refund or exchange.',
  //   },
  //   {
  //     question: 'Are your products suitable for sensitive skin?',
  //     answer:
  //       'Many of our products are formulated to be gentle and suitable for sensitive skin. However, we recommend performing a patch test before using any new product, especially if you have sensitive skin or allergies.',
  //   },
  //   {
  //     question: 'Do you offer gift wrapping services?',
  //     answer:
  //       'Yes, we offer gift wrapping services for special occasions. You can select the gift wrapping option during checkout and add a personalized message.',
  //   },
  //   {
  //     question: 'Can I cancel or modify my order after it has been placed?',
  //     answer:
  //       'Once an order has been placed, it cannot be canceled or modified. However, you can contact our customer support team for assistance, and they will do their best to accommodate your request.',
  //   },
  //   {
  //     question: 'How can I track my order?',
  //     answer:
  //       'Once your order has been shipped, you will receive a tracking number via email. You can use this tracking number to monitor the status of your delivery.',
  //   },
  //   {
  //     question: 'Do you offer wholesale pricing for bulk orders?',
  //     answer:
  //       'Yes, we offer wholesale pricing for bulk orders. Please contact our sales team for more information and to discuss your specific requirements.',
  //   },
  // ];

  const faqs = [
    {
      question: "How Long Does To Take To Deliver The Product?",
      answer: "Orders take 07 to 12 working days to deliver pan India.",
    },
    {
      question: "Does Vyra Herbals Offer Cash On Delivery?",
      answer:
        "Partial COD is available with 100/- extra charges. The extra charges need to be paid first, and the remaining amount can be paid on delivery. Prepaid orders do not incur extra charges.",
    },
    {
      question: "Can I Track My Order?",
      answer:
        "Yes, once your order is shipped, you will receive a tracking number via email or text message. You can use that number to track your order on our Track Order page.",
    },
    {
      question: "Do You Offer International Shipping?",
      answer: "No, shipping is currently available only within India.",
    },
    {
      question: "How Can I Trust You?",
      answer:
        "We ensure trust through transparency, accuracy of information, responsive customer support, honest feedback and reviews, and a strong commitment to quality.",
    },
    {
      question: "Can The Products Be Used By Men And Women?",
      answer:
        "Yes, all Vyra Herbal products are formulated to be used by both men and women.",
    },
    {
      question: "How Long Does The Product Take To Show Results?",
      answer:
        "Results may occur in as little as 4 weeks, but for some, it may take up to 4 to 6 months for complete transformation as Vyra Herbal products are natural and show different results from person to person.",
    },
    {
      question: "Can I Leave It Overnight And Use It Every day?",
      answer:
        "Yes, it is recommended to use the hair oil before bed and leave it overnight. The oil is non-sticky and non-greasy, hence can be used every day.",
    },
    {
      question: "Does Oil Colour And Fragrance Change?",
      answer:
        "Yes, Vyra Herbal hair oil contains natural ingredients, so the color and fragrance may change without losing effectiveness.",
    },
    {
      question: "How Many Days We Need To Apply The Oil In a week?",
      answer:
        "Use 1-2 times a week for best results. Since the oil is thick in texture, applying less will be enough.",
    },
    {
      question: "Is This Shampoo Contains Harmful Chemical?",
      answer:
        "No, Vyra Herbal Shampoo is free from harmful chemicals like SLS, SLES, and Silicones. It is also Paraben Free.",
    },
    {
      question: "Can I Cancel or Modify My Order After It Has Been Placed?",
      answer:
        "Once an order has been placed, it cannot be canceled or modified. However, you can contact our customer support team for assistance.",
    },
    {
      question: "What Is Your Exchanges, Returns And Refund Policy?",
      answer: "We don't allow exchange or refund.",
    },
    {
      question: "Do you offer wholesale pricing for bulk orders?",
      answer:
        "Yes, we offer wholesale pricing for bulk orders. Please contact us for more information.",
    },
    {
      question: "How Can I Provide Feedback?",
      answer:
        "You can leave feedback through our Contact Us page or via our social media channels.",
    },
  ];

  return (
    <div className="container mt-5">
      {/* <br /><hr /><br /> */}
      <h3 style={{ textAlign: "center" }}>
        {" "}
        Frequently Asked Questions <b>(FAQs)</b>{" "}
      </h3>{" "}
      <br />
      {faqs.map((faq, index) => (
        <div className="mb-3" style={{ cursor: "pointer" }} key={index}>
          <Card>
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              style={{
                all: "unset",
                display: "block",
                width: "100%",
                cursor: "pointer",
              }}
            >
              <Card.Header
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <b>{faq.question}</b>
                <span style={{ fontWeight: "bold", alignSelf: "flex-start" }}>
                  {openIndex === index ? "-" : "+"}
                </span>
              </Card.Header>
            </button>

            {openIndex === index ? <Card.Body>{faq.answer}</Card.Body> : null}
          </Card>
        </div>
      ))}
    </div>
  );
};

export default Faqs;
