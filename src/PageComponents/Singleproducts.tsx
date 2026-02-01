"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FaEye, FaShoppingCart } from "react-icons/fa";
// import { FaHeart } from "react-icons/fa";
import { FaStar } from "react-icons/fa";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import { IoIosArrowForward } from "react-icons/io";
import Slider from "react-slick";
import { FiChevronsLeft } from "react-icons/fi";
import { FiChevronsRight } from "react-icons/fi";
import Accordion from "react-bootstrap/Accordion";
import { IoMdHome } from "react-icons/io";
import { toast } from "react-toastify";

import { API_PATH, APP_NAME } from "../constants";
import { Product, Review } from "@/types";

import ProductCard from "../Components/Shared/ProductCard";
import SEOComponent from "../Components/Shared/SEOComponent";
import Checkout from "./Checkout";
import { useAuth } from "../Components/Contexts/AuthContext";
import { useCart } from "../Components/Contexts/CartContext";
import Loader from "../Components/Loader";
import AddToCartButton from "../Components/Common/AddToCartButton";
import styled from "styled-components";
import WebShare from "../Components/Common/WebShare";
import SVGIcon from "../Components/Common/SVGIcon";
import AddReview from "../Components/Shared/AddReview";
import Utility from "../utils/UtilityFunctions";
import StarRatings from "../Components/Common/StarRatings";
import Pagination from "../Components/Common/Pagination";
import QuantitySelector from "../Components/Common/QuantitySelector";

const Singleproducts = () => {
  const params = useParams();
  const productHandle = params?.productHandle || '';
  const [product, setProduct] = useState<Product | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [isInCart, setIsInCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false); //product page
  const [currentPage, setCurrentPage] = useState(1); // Pagination state
  const reviewsPerPage = 8; //pagination
  const sortOptions = [
    { value: "mostRecent", label: "Most Recent" },
    { value: "highestRating", label: "Highest Rating" },
    { value: "lowestRating", label: "Lowest Rating" },
  ];
  const [reviewSortBy, setReviewSortBy] = useState(
    sortOptions.find((o) => o.value === "mostRecent")
  );
  const [sortedReviews, setSortedReviews] = useState<Review[]>([]);

  const { user } = useAuth();
  const { cartCount, updateCartCount } = useCart();

  const [qty, setQty] = useState(1);

  const handleCloseCheckout = () => {
    setShowCheckout(false);
  };

  const handleSortChange = (option) => {
    setReviewSortBy(option);
  };

  const filteredReviews = useMemo(() => {
    return product?.reviews?.filter((a) => Number(a.status) === 1);
  }, [product?.reviews]);

  useEffect(() => {
    let sortedArray = [...(filteredReviews || [])];
    switch (reviewSortBy.value) {
      case "mostRecent":
        // Sort by most recent (descending by date)
        sortedArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case "highestRating":
        // Sort by highest rating (descending by rating)
        sortedArray.sort((a, b) => b.rating - a.rating);
        break;
      case "lowestRating":
        // Sort by lowest rating (ascending by rating)
        sortedArray.sort((a, b) => a.rating - b.rating);
        break;
      default:
        break;
    }
    setSortedReviews(sortedArray);
  }, [reviewSortBy, filteredReviews]);

  const ratingDetails = useMemo(() => {
    if (product && filteredReviews?.length) {
      return Utility.calculateRating(filteredReviews);
    }
    return {};
  }, [filteredReviews]);



  const buildGallery = useCallback((prod: any) => {
    const gallery = Array.isArray(prod?.images)
      ? prod.images.filter((img: any) => !!img)
      : [];
    if (prod?.image_url && !gallery.includes(prod.image_url)) {
      gallery.unshift(prod.image_url);
    }
    return Array.from(new Set(gallery));
  }, []);

  const galleryImages = useMemo(() => buildGallery(product), [product, buildGallery]);

  const notify = () =>
    toast.success("Added to cart !", {
      position: "bottom-center",
      autoClose: 500,
      // hideProgressBar: false,
      // closeOnClick: true,
      // pauseOnHover: true,
      // draggable: true,
      // progress: undefined,
      // theme: "light",
      // transition: Bounce,
    });

  // useEffect(() => {
  //     if (!productHandle) return;

  //     const fetchData = async () => {
  //       try {
  //         let requestData = { product_handle: productHandle };

  //         const response = await fetch(`${API_PATH}/product_detail.php`, {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json'
  //           },
  //           body: JSON.stringify(requestData)
  //         });

  //         if (!response.ok) {
  //           throw new Error('Failed to fetch product details');
  //         }

  //         const data = await response.json();
  //         console.log(data);
  //         setProduct(data);
  //         setMainImage(data.image_url);

  //         // Check product-added-to-cart status
  //         // Check from localStorage if user is not logged in
  //         const cartItems = JSON.parse(localStorage.getItem(`${APP_NAME}_cart`)) || [];
  //         // console.log(cartItems, data.id, cartItems.some(item => item === data.id));
  //         setIsInCart(cartItems.some(item => item.id === data.id));
  //       } catch (error) {
  //         console.error('Error fetching product details:', error);
  //       }
  //     };

  //     fetchData();
  //   }, [productHandle]);

  useEffect(() => {
    if (!productHandle) return;

    const fetchData = async () => {
      try {
        let requestData = { product_handle: productHandle };

        // Include user ID in request payload if user is logged in
        if (user) {
          (requestData as any).user_id = user.id;
        }

        const response = await fetch(`${API_PATH}/products/detail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch product details");
        }

        const data = await response.json();
        setProduct(data);
        setMainImage(data.image_url);

        // Check product-added-to-cart status
        if (user) {
          setIsInCart(data.is_in_cart === "1");
        } else {
          // Check from localStorage if user is not logged in
          const cartItems =
            JSON.parse(localStorage.getItem(`${APP_NAME}_cart`)) || [];
          // console.log("cartItems : ", cartItems);
          // console.log(cartItems, data.id, cartItems.some(item => item === data.id));
          setIsInCart(cartItems.some((item) => item.id === data.id));
          // setIsInCart(cartItems.includes(data.id));
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
      }
    };

    fetchData();
  }, [productHandle, user]);

  const [handpickedProducts, setHandpickedProducts] = useState<Product[]>([]);
  // Fetch related products (optimized - only fetch when product is loaded)
  useEffect(() => {
    if (!product) return; // Only fetch when we have the product

    const hasAssignedRelated = product.related_products && Array.isArray(product.related_products) && product.related_products.length > 0;

    const postData: any = {
      tbl_name: "products",
      // Only fetch fields needed for product cards
      fields: 'id, handle, title, price, regular_price, image_url, category',
    };

    if (hasAssignedRelated) {
      postData.ids = product.related_products;

      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      };

      fetch(`${API_PATH}/data`, requestOptions)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch related products");
          }
          return response.json();
        })
        .then((data) => {
          // Filter out the current product from related products (just in case)
          const filtered = data.filter((p: any) => p.id !== product.id);
          setHandpickedProducts(filtered);
          setIsPageLoaded(true);
        })
        .catch((error) => {
          console.error("Error fetching related products:", error);
          setIsPageLoaded(true);
        });
    } else {
      setHandpickedProducts([]);
      setIsPageLoaded(true);
    }
  }, [product]);

  // const handleAddToCart = async () => {
  //   if (!product) return;

  //   try {
  //     if (user) {
  //       // User is logged in, add product to cart via API
  //       const response = await fetch(`${API_PATH}/insert.php`, {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify({ tbl_name: "cart", user_id: user.id, product_id: product.id })
  //       });

  //       if (!response.ok) {
  //         throw new Error('Failed to add product to cart');
  //       }

  //       const data = await response.json();
  //       if (data.status === "1") {
  //         setIsInCart(true);
  //         updateCartCount(cartCount + 1);
  //       } else {
  //         console.error('Error adding product to cart:', data.message);
  //       }
  //     } else {
  //       console.log('no user.. ', user, product.id);
  //       // User is not logged in, add product to localStorage
  //       let cart = JSON.parse(localStorage.getItem(`${APP_NAME}_cart`)) || [];
  //       cart.push({'id': product.id, 'qty': 1});
  //       console.log('cart : ', cart);
  //       localStorage.setItem(`${APP_NAME}_cart`, JSON.stringify(cart));
  //       setIsInCart(true);
  //       updateCartCount(cartCount + 1);
  //     }
  //     notify();
  //   } catch (error) {
  //     console.error('Error adding product to cart:', error);
  //   }
  // };

  function SampleNextArrow(props) {
    const { className, style, onClick } = props;
    return (
      <div className="right_icon">
        <IoIosArrowForward
          color="black"
          // className={className}
          style={{
            ...style,
            display: "block",
          }}
          onClick={onClick}
          size={50}
        />
      </div>
    );
  }

  function SamplePrevArrow(props) {
    const { className, style, onClick } = props;
    return (
      <div className="left_icon">
        <IoIosArrowBack
          color="black"
          // className={className}
          style={{
            ...style,
            display: "block",
          }}
          onClick={onClick}
          size={50}
        />
      </div>
    );
  }

  const settings = {
    className: "center",
    infinite: handpickedProducts.length > 4,
    centerPadding: "600px",
    slidesToShow: Math.min(4, handpickedProducts.length),
    slidesToScroll: 1,
    speed: 500,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: handpickedProducts.length > 3,
          dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
    ],
    swipeToSlide: true,
    autoplay: true,
    nextArrow: <SampleNextArrow onClick={undefined} />,
    prevArrow: <SamplePrevArrow onClick={undefined} />,
  };

  const gallerySettings = {
    infinite: false,
    slidesToShow: 4,
    slidesToScroll: 1,
    focusOnSelect: false,
    arrows: true,
    responsive: [
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 3,
        }
      }
    ]
  };

  const pathname = usePathname();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && isPageLoaded) {
      setTimeout(() => {
        Utility.scrollToSection(hash, 100);
      }, 500);
    }
  }, [pathname, isPageLoaded]);

  // Get current testimonials for pagination
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const paginatedReviews = sortedReviews?.slice(
    indexOfFirstReview,
    indexOfLastReview
  );

  // Handle pagination
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <StyledSingleProduct>
      {/* <section className="inner-section single-banner">
            <div className="container">
                <h2>Single Product</h2>
            </div>
        </section> */}

      {!product ? (
        <Loader />
      ) : (
        <>
          <SEOComponent
            title={product.title}
            description={product.description}
          />
          <section className="bredcum_out">
            <div className="container">
              <div className="breadcrumbs">
                <ul className="items d-flex">
                  <li className="item home">
                    <Link href="/" title="Go to Home Page">
                      <IoMdHome />
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="item cms_page">
                    <strong> {product.title}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="inner-section shop-part pt-3 pb-3">
            <div className="container">
              <div className="row">
                <div className="col-lg-6">
                  <div className="details-gallery">
                    {/* <div className="details-label-group">
                      <label className="details-label new">new</label>
                      <label className="details-label off">-10%</label>
                    </div> */}
                    <ul className="details-preview">
                      <li>
                        <img src={mainImage} alt="product" />
                      </li>
                    </ul>
                    {galleryImages.length > 1 && (
                      <div className="details-thumb-slider">
                        <Slider {...gallerySettings}>
                          {galleryImages.map((img: any, index: number) => (
                            <div key={`${img}-${index}`} className={`slide-item ${img === mainImage ? "active" : ""}`}>
                              <div className="img-wrapper" onClick={() => setMainImage(img)}>
                                <img
                                  src={img}
                                  alt={`${product.title || "product"} ${index + 1}`}
                                />
                              </div>
                            </div>
                          ))}
                        </Slider>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="details-content">
                    <span className="mb-1 user-stat d-inline-block d-xl-none">
                      <SVGIcon iconName={"line-graph"} />
                      {product.view_count +
                        "+" +
                        " People ordered this in last 30 days"}
                    </span>
                    <h3 className="details-name"> {product.title} </h3>
                    <p> {product.description} </p>

                    <div className="d-flex">
                      <div className="details-rating">
                        {!!ratingDetails.average && (
                          <StarRatings
                            rating={ratingDetails.average}
                            className="me-1 mb-1"
                          />
                        )}
                        <a href="#reviews">
                          ({ratingDetails.count || "No"}{" "}
                          {ratingDetails.count === 1 ? "review" : "reviews"})
                        </a>
                      </div>
                    </div>

                    <div>
                      <span className="details-price">₹{product.price}</span>
                      <span className="pe-1 text-muted">MRP</span>
                      <span
                        className="text-muted"
                        style={{ textDecoration: "line-through" }}
                      >
                        ₹{product.regular_price}
                      </span>
                      <span className="discount ms-2 text-success">
                        {Math.floor(
                          Utility.calculateDiscount(
                            product.price,
                            product.regular_price
                          )
                        )}
                        % Off
                      </span>
                      <span className="ms-3 user-stat d-none d-xl-inline-block">
                        <SVGIcon iconName={"line-graph"} />
                        {product.view_count +
                          "+" +
                          " People ordered this in last 30 days"}
                      </span>
                    </div>

                    <p>Tax included. Shipping calculated at checkout.</p>

                    {/* <div className='size_out'>
                            <span>Size</span>
                            <div className="d-flex">
                                <button>100ml</button>
                                <button>200ml</button>
                            </div>
                        </div> */}
                    <div className="details-list-group mt-3 mb-3">
                      <label className="details-list-title">
                        <WebShare
                          url={`/product/${product.handle}`}
                          title={product.title}
                          label="Share"
                        />
                      </label>
                    </div>
                    <div className="details-add-group row align-items-center">
                      <div className="col-md-3 mb-0 px-0">
                        <QuantitySelector
                          value={qty}
                          setValue={setQty}
                          maxValue={10}
                        />
                      </div>
                      <div className="col-md-9 px-0">
                        {/* <button className="product-add" title="Add to Cart"><span><FaShoppingCart /> Add to Cart</span></button> */}
                        {/* <button className="product-add" title="Add to Cart" onClick={handleAddToCart}><span><FaShoppingCart /> Add to Cart</span></button> */}
                        <AddToCartButton
                          productId={product?.id}
                          quantity={qty}
                          product={product}
                        />
                      </div>

                      <div className="col-md-12 mt-3 px-0">
                        {/* <button><span>Buy it Now</span></button> */}
                        <Checkout
                          show={showCheckout}
                          onHide={handleCloseCheckout}
                          product={product}
                        />
                      </div>
                    </div>

                    <div className="speci_out">
                      {/* <p className="mb-3"> {product.description} </p> */}
                      <div className="faq_out">
                        <Accordion defaultActiveKey="0">
                          <Accordion.Item eventKey="0">
                            <Accordion.Header>Directions</Accordion.Header>
                            <Accordion.Body>
                              <div className="details-cont">
                                <ul>
                                  {/* <li>{product.directions}</li> */}

                                  {/* <li>● All adults over 3 years old can use Biloba Naturals Hair Oil.</li>
                                    <li>● Results may vary from person to person.</li>
                                    <li>● Natural herbal formulations tend to change color over time. However, the product efficiency remains unchanged.</li>
                                    <li>● Avoid brushing your hair when it’s wet or after an oil application.</li> */}
                                </ul>

                                <ul>
                                  {(product.directions || '')
                                    .split(/\.\s+|\n/) // Split on full stops and new lines
                                    .filter((line) => line.trim() !== "") // Remove empty lines
                                    .map((line, index) => (
                                      <li key={index}>● {line.trim()}</li> // Render each line in an <li>
                                    ))}
                                </ul>
                              </div>
                            </Accordion.Body>
                          </Accordion.Item>
                          <Accordion.Item eventKey="1">
                            <Accordion.Header>benefits </Accordion.Header>
                            <Accordion.Body>
                              <div className="details-cont">
                                {/* <ul>
                                        <li>● All adults over 3 years old can use Biloba Naturals Hair Oil.</li>
                                        <li>● Results may vary from person to person.</li>
                                        <li>● Natural herbal formulations tend to change color over time. However, the product efficiency remains unchanged.</li>
                                        <li>● Avoid brushing your hair when it’s wet or after an oil application.</li>
                                </ul> */}
                                <ul>
                                  {(product.benefits || '')
                                    .split(/\.\s+|\n/) // Split on full stops and new lines
                                    .filter((line) => line.trim() !== "") // Remove empty lines
                                    .map((line, index) => (
                                      <li key={index}>● {line.trim()}</li> // Render each line in an <li>
                                    ))}
                                </ul>
                                {/* <p>*GET VISIBLE RESULTS IN JUST 3 WEEKS & USE THE PRODUCT FOR A MINIMUM OF 3 MONTHS FOR BETTER RESULTS*</p> */}
                              </div>
                            </Accordion.Body>
                          </Accordion.Item>
                          <Accordion.Item eventKey="2">
                            <Accordion.Header>ingredients </Accordion.Header>
                            <Accordion.Body>
                              <div className="details-cont">
                                {/* <ul>
                                        <li>● All adults over 3 years old can use Biloba Naturals Hair Oil.</li>
                                        <li>● Results may vary from person to person.</li>
                                        <li>● Natural herbal formulations tend to change color over time. However, the product efficiency remains unchanged.</li>
                                        <li>● Avoid brushing your hair when it’s wet or after an oil application.</li>
                                </ul> */}
                                <ul>
                                  {(product.ingredients || '')
                                    .split(/\.\s+|\n/) // Split on full stops and new lines
                                    .filter((line) => line.trim() !== "") // Remove empty lines
                                    .map((line, index) => (
                                      <li key={index}>● {line.trim()}</li> // Render each line in an <li>
                                    ))}
                                </ul>
                                {/* <p>*GET VISIBLE RESULTS IN JUST 3 WEEKS & USE THE PRODUCT FOR A MINIMUM OF 3 MONTHS FOR BETTER RESULTS*</p> */}
                              </div>
                            </Accordion.Body>
                          </Accordion.Item>
                          <Accordion.Item eventKey="3">
                            <Accordion.Header>Note </Accordion.Header>
                            <Accordion.Body>
                              <div className="details-cont">
                                {/* <ul>
                                        <li>● All adults over 3 years old can use Biloba Naturals Hair Oil.</li>
                                        <li>● Results may vary from person to person.</li>
                                        <li>● Natural herbal formulations tend to change color over time. However, the product efficiency remains unchanged.</li>
                                        <li>● Avoid brushing your hair when it’s wet or after an oil application.</li>
                                </ul> */}
                                <p style={{ whiteSpace: "pre-line" }}>
                                  {product.note}
                                </p>
                                {/* <p>*GET VISIBLE RESULTS IN JUST 3 WEEKS & USE THE PRODUCT FOR A MINIMUM OF 3 MONTHS FOR BETTER RESULTS*</p> */}
                              </div>
                            </Accordion.Body>
                          </Accordion.Item>
                        </Accordion>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <section className="add-review my-4">
                <AddReview
                  reviewProductId={product.id}
                  ratingDetails={ratingDetails}
                  onAddSuccess={(review) =>
                    setProduct((prev) => ({
                      ...prev,
                      reviews: [...(prev?.reviews || []), {
                        id: review.id ?? null,
                        product_id: review.product_id ?? product.id,
                        rating: review.rating,
                        reviewer_name: review.reviewer_name || review.reviewer || 'Anonymous',
                        review_text: review.review_text || review.comment || '',
                        status: typeof review.status === 'string' ? Number(review.status) : review.status ?? 0,
                        created_at: review.created_at || review.date || new Date().toISOString(),
                        review_date: review.created_at || review.date || new Date().toISOString(),
                      }]
                    }))
                  }
                />
              </section>
              {!!ratingDetails.stats && (
                <div id="reviews" className="review-list-container">
                  <h3 className="frame-title">
                    Reviews ({ratingDetails.count})
                  </h3>

                  <ul className="review-list">
                    {paginatedReviews.map((review, index) => {
                      return (
                        <li className="review-item" key={"review-" + index}>
                          <div className="review-media">
                            <span className="review-avatar">
                              <img
                                src="/assets/images/user.png"
                                alt="user-img"
                              />
                            </span>
                            <div className="review-meta">
                              <StarRatings rating={review.rating} />
                              <span className="reviewer-name">
                                {review.reviewer_name || "Anonymous"}
                              </span>
                              {review.review_date && (
                                <span className="review-date">
                                  {Utility.formatDate(review.review_date)}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="review-desc mb-0">
                            {review.review_text}
                          </p>
                        </li>
                      );
                    })}
                    <Pagination
                      totalPages={Math.ceil(
                        sortedReviews.length / reviewsPerPage
                      )}
                      onPageChange={paginate}
                      currentPage={currentPage}
                    />
                  </ul>
                  {/* <div className="d-flex justify-content-center align-items-center mt-4 pag-out">
                    <button>
                      <FiChevronsLeft />
                    </button>
                    <button>1</button>
                    <button>2</button>
                    <button>3</button>
                    <button>4</button>
                    ....
                    <button>
                      <FiChevronsRight />
                    </button>
                  </div> */}
                </div>
              )}
            </div>
          </section>

          {handpickedProducts.length > 0 && (
            <section className="related-products">
              <div className="container">
                <div className="row">
                  <div className="col-lg-12">
                    <div className="section-heading">
                      <h2>Related Products</h2>
                    </div>
                  </div>
                </div>
                <div className="slider-container">
                  <Slider {...settings}>
                    {handpickedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isImageLazy={false}
                      />
                    ))}
                  </Slider>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </StyledSingleProduct>
  );
};

export default Singleproducts;

const StyledSingleProduct = styled.section`
  .inner-section {
    .review-list-container {
      .review-list {
        .review-item {
          padding: 15px 18px;
          border-radius: 8px;
          margin-bottom: 15px;
          background: #f9f9f9;
          border: 1px solid var(--border);
          &:last-child {
            margin-bottom: 0px;
          }
          .review-media {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            .review-avatar {
              margin-right: 15px;
              border-radius: 50%;
              border: 2px solid var(--primary);
              img {
                width: 65px;
                border-radius: 50%;
                border: 2px solid var(--white);
              }
            }
            .review-meta {
              text-transform: capitalize;
              cursor: default;
              .reviewer-name {
                color: var(--heading);
                text-transform: capitalize;
                font-size: 1rem;
              }
              .review-date {
                display: block;
                font-size: 12px;
                line-height: 1;
                color: var(--text);
              }
            }
          }
        }
      }
      .sort-dropdown {
        border: 1px solid #d1c7c7;
        border-radius: 0.4rem;
        padding: 0.5rem 1rem;
        font-size: 14px;
        margin-bottom: 1rem;
        display: inline-block;
        .dropdown-menu {
          padding: 0;
          .dropdown-item {
            &:active,
            &:focus {
              background: var(--border);
              color: var(--text);
            }
          }
        }
      }
    }
  }
  .details-content {
    .user-stat {
      font-size: 1rem;
      font-style: italic;
      font-weight: bold;
      svg path {
        fill: green;
      }
    }
    .details-price {
      font-size: 1.4rem;
      font-weight: bold;
      margin-right: 0.4rem;
    }
    .text-muted {
      font-size: 1.2rem;
    }
    .discount {
      font-weight: bold;
      font-size: 1rem;
    }
    .details-list-title {
      font-weight: 500;
      margin-right: 15px;
      color: var(--heading);
      text-transform: capitalize;
      display: flex;
      cursor: pointer;
      .label:hover {
        text-decoration: underline;
      }
      i {
        color: var(--primary);
      }
    }
    @media (max-width: 1200px) {
      .user-stat {
        font-size: 1.1rem;
      }
    }
  }

  .faq_out h2 {
    border: none !important;
    line-height: 28px;
    background: transparent;
    font-size: 18px !important;
    color: #000;
  }
  .accordion-header {
    margin-bottom: 0;
  }
  .accordion-button:not(.collapsed) {
    color: #000;
  }
  .faq_out button {
    padding: 0px;
    border: none !important;
    background-color: transparent !important;
    box-shadow: none !important;
    font-size: 18px;
    text-transform: capitalize;
    color: #000;
  }
  .faq_out button:focus {
    box-shadow: none !important;
  }
  .accordion-item {
    border: none !important;
    border-radius: 0px !important;
    border-top: 1px solid #000 !important;
    margin-bottom: 0px !important;
    margin-top: 0px !important;
    padding: 10px 15px !important;
  }
  .accordion-body {
    padding: 10px 0px;
  }

  .accordion-button::after {
    width: 23px !important;
    height: 14px !important;
    background-size: 71%;
    background-position: center;
  }

  .faq_out .accordion .accordion-item:last-child {
    border-bottom: 1px solid #000 !important;
  }

  .related-products {
    .slider-container {
      @media (min-width: 768px) {
        .slick-initialized .slick-slide {
          padding: 0 1rem;
        }
      }
    }
  }

  .details-thumb-slider {
      margin-top: 15px;
      padding: 0 10px;
      
      .slick-prev, .slick-next {
        width: 25px;
        height: 25px;
        z-index: 1;
        &:before {
            color: #333;
            opacity: 1;
            font-size: 24px;
        }
      }
      
      .slick-prev { left: -15px; }
      .slick-next { right: -15px; }

      .slick-slide {
        padding: 0 6px;
      }

      .slide-item {
        .img-wrapper {
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          
          img {
            width: 100%;
            height: 80px;
            object-fit: cover;
            display: block;
          }
        }

        &.active .img-wrapper {
          border-color: #0f5132;
        }
      }
    }
`;
