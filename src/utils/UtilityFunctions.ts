import React from "react";

/** Aggregated review statistics for a product. */
export type RatingDetails = {
  /** How many reviews awarded each star value. */
  stats: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Mean rating rounded to 2dp, or 0 when there are no reviews. */
  average: number;
  /** Total number of reviews counted. */
  count: number;
};

class Utility {
  /**
   * Scrolls the page smoothly to a specific section identified by its hash (ID).
   * If an offset is provided, it adjusts the scroll position accordingly.
   *
   * @param {string} hash - The CSS selector or ID of the section to scroll to (e.g., '#section1').
   * @param {number} [offSet] - Optional. A number representing how much to offset the scroll position.
   *                            Useful when you have a fixed header or want to stop a little earlier.
   *
   * @example
   * // Scrolls to the section with the ID 'section1' smoothly
   * scrollToSection('#section1');
   *
   * // Scrolls to the section with the ID 'section2', but with a 100px offset (to cover sticky header height)
   * scrollToSection('#section2', 100);
   */
  static scrollToSection = (hash, offSet) => {
    const section = document.querySelector(hash);
    if (section) {
      //   if (offSet) {
      const elementPosition = section.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - (offSet || 0);

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      //   } else {
      //     section.scrollIntoView({ block: "start", behavior: "smooth" });
      //   }
    }
  };

  /**
   * Formats a given date string (YYYY-MM-DD) into a readable format: DD month YYYY.
   *
   * @param {string} dateString - The date string in the format YYYY-MM-DD.
   * @returns {string} - The formatted date in the format DD month YYYY.
   *
   * @example
   * // returns '15 September 2024'
   * formatDate('2024-09-15');
   */
  static formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (!date || isNaN(date.getTime())) return '';

    const options: Intl.DateTimeFormatOptions = { day: "2-digit", year: "numeric", month: "long" };
    return date.toLocaleDateString("en-US", options);
  };

  /**
   * Calculates average rating, rating statistics, review count based passed review list
   *
   * @param {array} reviews - List of reviews (each review object should contain rating)
   * @returns {object} - {average, stats, count}
   *
   * @example
   * // returns {avarage: 4.67, count:20, stats: {5:12, 4:8, 3:0, 2:0, 1:0}}
   * calculateRating(reviewList);
   */
  static calculateRating = (reviews): RatingDetails => {
    const stats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    // Always return the same shape. This used to fall off the end and return
    // undefined when there were no reviews, so every caller needed its own
    // `|| {}` fallback and then guessed at the field types.
    if (!reviews?.length) {
      return { stats, average: 0, count: 0 };
    }

    const reviewCount = reviews.length;
    let total = 0;

    reviews.forEach((curr) => {
      if (stats[Number(curr.rating)] !== undefined) {
        stats[Number(curr.rating)] += 1;
        total += Number(curr.rating);
      }
    });

    return {
      stats,
      // A number, not the string toFixed() produces, so callers can compare
      // and do arithmetic with it directly.
      average: Number((total / reviewCount || 0).toFixed(2)),
      count: reviewCount,
    };
  };

  /**
   * Calculates percetange of value from totalValue upto provided precision
   *
   * @param {number} price - current value
   * @param {number} MRP - total value
   * @param {number} decimalUpto - Number of digits after the decimal point. Must be in the range 0 - 20, inclusive.
   * @returns {number}
   *
   * @example
   * // returns 74.88
   * calculateDiscount(55,219,2);
   */
  static calculateDiscount = (price, MRP, decimalUpto = 2): number => {
    if (!MRP) return 0;
    // Always return a number. This used to return the string from toFixed() on
    // the success path and the number 0 on the zero-MRP path, so every caller
    // had to wrap it in Math.floor()/Number() to do arithmetic with it.
    return Number((((MRP - price) * 100) / MRP).toFixed(decimalUpto));
  };
}

export default Utility;
