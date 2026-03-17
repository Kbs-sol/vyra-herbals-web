'use client';

import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";

const SearchBar = (props) => {
  const {
    searchTerm,
    setSearchTerm,
    onSearchClick,
    onChange,
    onKeyDown,
    onClear,
  } = props;
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);
  const [isInputFocus, setInputFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholderPhrases = [
    "Search for Hair Oil",
    "Search for Shampoo",
    "Search for Scalp Massager",
    "Search for Hair Mask Powder",
    "Search for Neem Combs",
    "Search for Rosemary Leaves",
  ];

  // Handle typing and deleting effect
  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % placeholderPhrases.length;
      const fullText = placeholderPhrases[i];

      setTypedText(
        isDeleting
          ? fullText.substring(0, typedText.length - 1)
          : fullText.substring(0, typedText.length + 1)
      );

      setTypingSpeed(isDeleting ? 50 : 150);

      if (!isDeleting && typedText === fullText) {
        setTimeout(() => setIsDeleting(true), 1000);
      } else if (isDeleting && typedText === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };
    const typingTimeout = setTimeout(handleTyping, typingSpeed);
    if (isInputFocus || searchTerm) {
      clearTimeout(typingTimeout);
      setTypedText("");
    }
    return () => clearTimeout(typingTimeout);
  }, [typedText, isDeleting, loopNum, typingSpeed, isInputFocus, searchTerm]);

  const clearSearch = () => {
    setSearchTerm("");
    if (inputRef.current) {
      (inputRef.current as HTMLInputElement).focus();
    }
    onClear?.();
  };

  return (
    <StyledSearchBar className="search-bar-container">
      <button onClick={onSearchClick}>
        <i className="fas fa-search"></i>
      </button>
      <input
        ref={inputRef}
        type="text"
        placeholder={typedText}
        value={searchTerm}
        className="animated-search-input"
        onFocus={() => setInputFocus(true)}
        onBlur={() => setInputFocus(false)}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      {searchTerm && (
        <button onClick={clearSearch} className="search-clear-icon">
          &#x2715;
        </button>
      )}
    </StyledSearchBar>
  );
};

export default SearchBar;

const StyledSearchBar = styled.section`
  /* AnimatedSearchBar.css */

  &.search-bar-container {
    position: relative;
    display: flex;
    align-items: center;
    border: 1px solid #ccc;
    padding: 0 0.5rem;
    border-radius: 4px;

    .animated-search-input {
      width: 100%;
      max-width: 12rem;
      height: 2.4rem;
      padding: 0 0.5rem;
      padding-right: 1.5rem;
      font-size: 0.85rem;
      line-height: normal;
      flex-grow: 1;

      .product-name {
        text-transform: capitalize;
        min-height: 4.2rem;
        a {
          width: 100%;
          color: var(--sub-heading);
          transition: all linear 0.3s;
          -webkit-transition: all linear 0.3s;
          -moz-transition: all linear 0.3s;
          -ms-transition: all linear 0.3s;
          -o-transition: all linear 0.3s;
          font-size: 17px;
          display: block;
          &:hover {
            color: var(--primary);
          }
        }
      }

      &::placeholder {
        text-transform: none;
        font-size: 0.8rem;
        opacity: 0.7;
      }

      @media (max-width: 576px) {
        max-width: none;
        font-size: 0.9rem;
      }
    }

    .search-clear-icon {
      position: absolute;
      right: 0.8rem;
      top: 50%;
      transform: translateY(-50%);
    }
  }
`;
