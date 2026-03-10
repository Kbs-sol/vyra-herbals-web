'use client';

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { PromisesSlider } from "../Components/Home/OurPromise";
import Utility from "../utils/UtilityFunctions";
// import SEOComponent from '../Components/Shared/SEOComponent';

const About = () => {
  const [isStoryOpen, setIsStoryOpen] = useState(false);

  const toggleStory = () => {
    setIsStoryOpen(!isStoryOpen);
  };

  // To make the page automatically scroll to story section
  const pathname = usePathname();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      Utility.scrollToSection(hash, 100);
    }
  }, [pathname]);

  return (
    <AboutContainer className="mx-lg-5">
      {/* <SEOComponent 
        title="About Us" 
        description="Learn more about Vyra Herbals and our commitment to providing high-quality, organic skincare and haircare products."
      /> */}
      <div className="mt-5 about-us">
        <h3 className="text-center">About Vyra Herbals</h3>
        <section className="text-center">
          <img
            src="/assets/images/ingredients.jpg"
            alt="ingredients-logo"
            width={180}
            height={180}
          />
        </section>
        <p>
          At Vyra Herbals, we believe in the power of nature to nurture your
          hair. That&apos;s why we craft hair care products using only the finest
          all-natural ingredients.
        </p>

        <h3 className="text-center mini-heading my-4">
          Why Choose Vyra Herbals?
        </h3>

        <p>
          <strong>Natural Ingredients:</strong> We use only the natural plant
          extracts, herbs, and botanical ingredients to nourish your hair and
          scalp.
        </p>

        <p>
          <strong>Chemical-Free:</strong> Our products are free from sulfates,
          parabens, and other harsh chemicals that can damage your hair. At
          Vyra, it&apos;s all about what&apos;s best for your hair.
        </p>

        <p>
          <strong>Effective Results:</strong> Experience the difference natural
          ingredients can make. Our hair care products are formulated to deliver
          visible results, leaving your hair healthy, manageable, and beautiful.
        </p>

        <h3 className="text-center mini-heading my-4">
          Vyra Herbals: Truth In Every Drop!
        </h3>

        <p>
          Our mission is to provide you with safe and effective hair care
          solutions that are free from harsh chemicals. Whether you are looking
          to nourish dry hair, frizz hair, or promote healthy growth, Vyra
          Herbals has a product to meet your needs.
        </p>

        <h3 className="text-center mini-heading my-4">Our Products</h3>
        <p>
          <strong>Herbal Hair Oil:</strong> Made with all-natural ingredients
          and helps to reduce hair fall problems and promote hair growth,
          strengthen strands, and add shine.
        </p>
        <p>
          <strong>Herbal Shampoo:</strong> Cleanse your scalp gently while
          providing essential moisture and nourishment for healthy hair.
        </p>
        <p>
          <strong>Neem Combs:</strong> Experience the benefits of neem, a
          natural antibacterial and antifungal wood, to promote scalp health and
          reduce dandruff.
        </p>
        <p>
          <strong>Scalp Massager:</strong> Boost hair health and relaxation with
          Vyra scalp Massager. Its soft bristles help to clean and massage the
          scalp thereby reducing dandruff, improving blood circulation,
          promoting hair growth and relieving stress.
        </p>
        <section className="promises-part">
          <div>
            <PromisesSlider />
          </div>
        </section>

        <br />
        <hr />
        <br />

        <section id="story-continue-reading" className="our-story-section">
          <h3 className="text-center my-4">Our Story</h3>
          <h4 className="text-center my-4">
            A Journey From Personal Struggle to Shared Success
          </h4>
          <p>
            At Vyra Herbals, every bottle tells a story—my story. I&apos;m Sahera
            Banu, the founder, and I started this journey not as a
            businesswoman, but as someone struggling with hair problems, just
            like you. I faced significant challenges with my hair. I dealt with
            thinning hair, excessive breakage, and a lack of shine. After trying
            countless products with no results, It was one of the toughest
            periods of my life, leaving me feeling hopeless and frustrated.
          </p>
          <p>
            There were moments when I felt like giving up entirely. But then,
            something shifted. I decided to take matters into my own hands and
            started experimenting with natural ingredients at home. It was a
            journey of trial, but slowly, I began to see a difference. Over
            time, I noticed my hair becoming noticeably stronger, glossier, and
            healthier with each application.
          </p>
          <p>
            Seeing my own success, I began sharing my homemade solutions with
            friends who were facing similar issues. To my delight, they too saw
            remarkable improvements. One friend remarked, &lsquo;My hair hasn&apos;t felt
            this healthy in years,&rsquo; while another said, &lsquo;I&apos;ve finally found a
            solution that works for me.&rsquo; These consistent positive outcomes were
            incredibly encouraging and made me realize that I had stumbled upon
            something truly special.
          </p>
          <p>
            That is how Vyra Herbals was born – from a desire to find a solution,
            a love for natural ingredients, and a passion for helping others
            achieve their hair goals. Vyra Herbals is more than just a brand;
            it is a community of individuals who believe in the power of nature
            to nurture and beautify.
          </p>
          <p>
            So, if you&apos;re reading this and struggling with your hair, know that
            you&apos;re not alone. And know that there is hope. At Vyra Herbals, we
            understand your frustration because we&apos;ve been there. We believe in
            the transformative power of natural ingredients, and we&apos;re here to
            help you. Join us in embracing the beauty of natural, healthy hair
            and become part of the Vyra Herbals community.
          </p>
        </section>
      </div>
    </AboutContainer>
  );
};

export default About;

const AboutContainer = styled.section`
  margin: 0px 10px;
  text-align: justify;
  h3 {
    font-size: 34px;
  }
  p {
    margin-bottom: 4px;
  }
  img {
    margin: 24px 0;
  }
  .mini-heading {
    font-size: 28px;
  }
  .promises-part {
    background: #f7f7f7;
  }
  .our-story-section {
    p {
      margin-bottom: 20px;
    }
  }

  //bootstrap break-point: lg
  @media (min-width: 992px) {
    &.mx-lg-5 {
      margin: 0px 140px !important;
    }
  }

  //bootstrap break-point: md
  @media (max-width: 576px) {
    h3 {
      font-size: 24px;
    }
    .mini-heading {
      font-size: 20px;
    }
    p {
      margin-bottom: 14px;
      font-size: 16px;
    }
  }
`;
