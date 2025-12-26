'use client';

import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FaMinus, FaPlus } from "react-icons/fa";
import { APP_NAME, COD_Charges, API_PATH } from "../constants";
import styled from "styled-components";
import LoadingIndicator from "../Components/Common/LoadingIndicator";
import SVGIcon from "../Components/Common/SVGIcon";
import Cart from "./Cart";
import CartItem from "../Components/Shared/CartItem";
import BillSummary from "../Components/Shared/BillSummary";

const Checkout = ({ show, onHide, cartItems, product }) => {
  const defaultFormData = {
    fullName: "",
    phone: "",
    email: "",
    houseNumber: "",
    area: "",
    landmark: "",
    pincode: "",
    city: "",
    state: "",
    country: "",
  };
  const defaultFormErrors = {
    fullName: "Please enter your full name.",
    phone: "Please enter your 10 digit mobile number.",
    email: "Please enter valid email.",
    landmark: "Please enter your landmark or any nearby place.",
    area: "Please enter your area or street or village.",
    pincode: "Please enter valid pincode.",
  };
  const regex = {
    fullName: /^[a-zA-Z\s.]*$/,
    pincode: /^[0-9]{0,6}$/,
    phone: /^[0-9]{0,10}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  };
  const [formData, setFormData] = useState({ ...defaultFormData });
  const [formErrors, setFormErrors] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [totalPriceOfCartProducts, setTotalPriceOfCartProducts] = useState(0);
  const [transactionPrice, setTransactionPrice] = useState(0);
  const [productQuantity, setProductQuantity] = useState(1);
  const [userInfo, setUserInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const router = useRouter();
  const [isApiSuccess, setIsApiSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderedItems, setOrderedItems] = useState();
  const [hasValidation, setHasValidation] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [isModalOpenedPreviously, setIsModalOpenedPreviously] = useState(false);

  const inputRefs = useRef({}); // Store refs dynamically

  const assignRef = (el, fieldName) => {
    inputRefs.current[fieldName] = el;
  };

  // const notify = (msg, tym=1000) => toast.success(msg, {
  //   position: "bottom-center",
  //   autoClose: tym,
  // });

  const cleanUp = () => {
    setShowOrderSummary(false);
    setFormData({ ...defaultFormData });
    setFormErrors({});
    setLoading(false);
    setHasValidation(false);
  };

  const notify = (msg, tym = 500) =>
    toast.warning(msg, {
      position: "bottom-center",
      autoClose: tym,
    });
  const notifyError = (msg, tym = 500) =>
    toast.error(msg, {
      position: "bottom-center",
      autoClose: tym,
    });

  const updateOrderedItemsState = (items) => {
    setOrderedItems(
      items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        title: item.title,
      }))
    );
  };

  useEffect(() => {
    loadScript(
      "https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/v2.0.0/easebuzz-checkout-v2.min.js"
    );

    if (cartItems && cartItems.length > 0) {
      const totalPrice = cartItems.reduce(
        (total, item) => total + item.quantity * item.price,
        0
      );
      setTotalPriceOfCartProducts(totalPrice);
      updateOrderedItemsState(cartItems);
    } else if (product) {
      setTotalPriceOfCartProducts(product.price);
      updateOrderedItemsState([product]);
    }
  }, [cartItems, product]);

  useEffect(() => {
    if (paymentMethod === "online") {
      // comment this and uncomment below code to if you want 100 early charges for COD
      // if (paymentMethod === "cod") {
      // setTransactionPrice((prevPrice) => prevPrice * 0.25);
      // setTransactionPrice(100);
      // } else {
      const totalPrice = cartItems
        ? cartItems.reduce(
            (total, item) => total + item.quantity * item.price,
            0
          )
        : product.price;
      setTransactionPrice(totalPrice);
    }
  }, [paymentMethod, cartItems, product]);

  useEffect(() => {
    if (String(formData.pincode).length === 6) {
      fetchCityState(formData.pincode);
    }
  }, [formData.pincode]);

  useEffect(() => {
    const handlePop = () => {
      if (showModal && window.location.pathname !== "/checkout") {
        cleanUp();
        setShowModal(false);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [showModal]);

  const fetchCityState = async (pincode) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`
      );
      const data = await response.json();

      if (data[0].Status === "Success" && data[0].PostOffice) {
        const postOffice = data[0].PostOffice[0];
        setFormData({
          ...formData,
          city: postOffice.District,
          state: postOffice.State,
          country: postOffice.Country,
        });
        setFormErrors((prev) => ({ ...prev, pincode: "" }));
        setIsApiSuccess(true);
      } else {
        setFormErrors((prev) => ({
          ...prev,
          pincode: "Invalid Pincode. Please enter correct pincode.",
        }));
        setFormData((prev) => ({
          ...prev,
          city: "",
          state: "",
          country: "",
        }));
        setIsApiSuccess(false);
      }
    } catch (error) {
      console.error("Error fetching location details:", error);
      setIsApiSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const isValidInput = (field, value) => {
    switch (field) {
      case "fullName":
        return regex.fullName.test(value);
      case "pincode":
        return regex.pincode.test(value);
      case "phone":
        return regex.phone.test(value);
      default:
        return true;
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === "phone" && (value.startsWith("+") || value.startsWith("0")))
      value = value.slice(-10);
    if (isValidInput(name, value))
      setFormData({
        ...formData,
        [name]: value,
      });
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const isValidPhoneNumber = (phoneNumber) => {
    const phonePattern = /^[6-9]\d{9}$/;
    return phonePattern.test(phoneNumber);
  };

  const isFormValid = () => {
    setHasValidation(true);
    let isValid = true;
    let errors = {};
    if (!formData.fullName.trim()) {
      errors.fullName = defaultFormErrors.fullName;
      isValid = false;
    }

    if (!formData.phone || formData.phone.trim() === "") {
      errors.phone = defaultFormErrors.phone;
      isValid = false;
    } else if (!isValidPhoneNumber(formData.phone)) {
      errors.phone = defaultFormErrors.phone;
      isValid = false;
    }
    if (formData.email && !regex.email.test(formData.email)) {
      errors.email = defaultFormErrors.email;
      isValid = false;
    }

    if (!formData.area.trim()) {
      errors.area = defaultFormErrors.area;
      isValid = false;
    }

    if (!formData.landmark.trim()) {
      errors.landmark = defaultFormErrors.landmark;
      isValid = false;
    }

    if (!formData.pincode.trim()) {
      errors.pincode = "Please enter your PIN code";
      isValid = false;
    } else if (formData.pincode.length !== 6 || !formData.state.length) {
      errors.pincode = "Invalid Pincode. Please enter correct pincode.";
      isValid = false;
    }

    setFormErrors(errors);
    // if (hasValidation) {
    const err = Object.entries(errors).find((err) => err[1]?.length > 0);
    if (Array.isArray(err)) inputRefs.current[err[0]]?.focus();
    // }
    return isValid;
  };

  const handleCheckout = () => {
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem("checkout_prev_path", currentPath);
    if (!isModalOpenedPreviously) window.history.pushState({}, "", "/checkout");
    else window.history.replaceState({}, "", "/checkout");
    setDisableBtn(true);
    setTimeout(() => {
      setShowModal(true);
      setIsModalOpenedPreviously(true);
      setDisableBtn(false);
    }, 100);
  };

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  };

  var txnId = null;

  const handlePayment = async () => {
    setLoading(true);
    let accessKey = null;
    if (paymentMethod !== "cod") {
      accessKey = await getAccessKey(); // Implement getAccessKey to fetch the access key from your server
      // console.log("accessKey : ", accessKey);
      if (accessKey == null) {
        console.log("Failed to get access key. Please try again..");
        setLoading(false);
        return;
      }
    }

    // Extract product titles with quantity
    const productDetails = orderedItems
      .map((item) => `${item.quantity} x ${item.title}`)
      .join(", ");

    const orderData = {
      orderItems: orderedItems,
      totalAmount: totalPriceOfCartProducts,
      transactionPrice: transactionPrice,
      shippingMethod: "standard",
      shippingData: {
        ...formData,
        productTitle: productDetails, // Include product titles in shipping data
      },
      paymentMethod: paymentMethod,
      // orderId: txnId
    };

    // console.log(txnId, orderData);

    // if (paymentMethod === "cod") {
    //   orderData.transactionPrice = COD_Charges;
    //   orderData.totalAmount = COD_Charges;
    // }

    if (paymentMethod === "cod") {
      orderData.totalAmount += COD_Charges;
      orderData.transactionPrice = 0;
      // For COD payment, call the COD API
      fetch(`${API_PATH}/payment/cod`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderData }),
      })
        .then((res) => res.json())
        .then((data) => {
          // let data = JSON.parse(res.replace(/^[^{]*/, ""));
          if (data?.order_id) {
            router.push(`/orders/${data.order_id}`);
          }
          clearCart(); // Clear cart after successful COD order
        })
        .catch((err) => {
          notifyError("Failed to process COD order. Please try again.");
          console.log("Failed to process COD order.", err);
        })
        .finally(() => setLoading(false));
    } else if (paymentMethod === "online") {
      // For Prepaid payment, call the Prepaid API
      fetch(`${API_PATH}/payment/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txnId, orderData }),
      })
        .then((res) => {
          // Proceed with Prepaid payment redirection
          window.open("https://pay.easebuzz.in/pay/" + accessKey);
          // window.open("https://testpay.easebuzz.in/pay/" + accessKey); // For testing environment
        })
        .catch((err) => {
          notifyError("Failed to save order session. Please try again.");
          console.log("Failed to save order session.", err);
          return;
        })
        .finally(() => setLoading(false));
    }
  };

  const getAccessKey = async () => {
    const url = `${API_PATH}/payment/access`;
    // const params = getParamsFromUrl();
    const params = {
      amount: transactionPrice,
      productinfo: "Product Description",
      firstname: formData.fullName,
      email: formData.email || "test@mail.com",
      phone: formData.phone,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      console.log(data);
      txnId = data.txnid;
      return data.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const clearCart = () => {
    // Logic to clear the cart
    localStorage.removeItem(`${APP_NAME}_cart`);
  };

  const onClose = () => {
    cleanUp();
    setShowModal(false);

    try {
      const prevPath = sessionStorage.getItem("checkout_prev_path");
      if (prevPath) {
        sessionStorage.removeItem("checkout_prev_path");
        window.history.replaceState({}, "", prevPath);
      }
    } catch (e) {
      router.replace("/");
    }
  };

  const formFields = [
    { fieldName: "fullName", label: "Full Name", type: "text", required: true },
    {
      fieldName: "phone",
      label: "Mobile Number",
      type: "text",
      required: true,
      isValid: () => isValidPhoneNumber(formData.phone),
    },
    {
      fieldName: "email",
      label: "Email (Optional)",
      type: "email",
      isValid: () => !formData.email || regex.email.test(formData.email),
    },
    {
      fieldName: "houseNumber",
      label: "House No./Building Name",
      type: "text",
    },
    {
      fieldName: "area",
      label: "Area/Street/Village",
      type: "text",
      required: true,
    },
    { fieldName: "landmark", label: "Landmark", type: "text", required: true },
    {
      fieldName: "pincode",
      label: "Pincode",
      type: "text",
      required: true,
      isValid: () =>
        formData.pincode &&
        formData.pincode.length === 6 &&
        !formErrors.pincode,
    },
    {
      fieldName: "city",
      label: "Town/City/District",
      type: "text",
      required: true,
      readOnly: isApiSuccess,
    },
    {
      fieldName: "state",
      label: "State",
      type: "text",
      required: true,
      readOnly: isApiSuccess,
    },
    {
      fieldName: "country",
      label: "Country",
      type: "text",
      required: true,
      readOnly: isApiSuccess,
    },
  ];

  const isInvalidField = (field) => {
    const isValid = field.isValid
      ? field.isValid()
      : !field.required || formData[field.fieldName].trim();
    return hasValidation && !isValid;
  };

  const renderErrorMessage = (msg) => {
    return (
      <Form.Control.Feedback type="invalid">
        <SVGIcon iconName={"error-icon"} />
        {msg}
      </Form.Control.Feedback>
    );
  };

  const renderOrderSummary = () => {
    return (
      <StyledOrderSummary>
        <ul className="item-list">
          {cartItems &&
            cartItems.map((item, index) => (
              <CartItem
                key={"order-item-" + index}
                product={item}
                showQuantitySelector={false}
              />
            ))}
          {product && (
            <CartItem product={product} showQuantitySelector={false} />
          )}
        </ul>
        <section className="bill-summary">
          <BillSummary
            items={cartItems || [product]}
            isCOD={paymentMethod === "cod"}
          />
        </section>
      </StyledOrderSummary>
    );
  };

  const renderForm = () => {
    return (
      <StyledForm>
        <center>
          <b> Provide details to checkout </b>
        </center>

        <Form className="checkout-form">
          {formFields.map((field) => {
            const hasError = !field.readOnly && isInvalidField(field);
            return (
              <Form.Group
                controlId={field.fieldName}
                className="mb-3 form-group"
                key={"form-field-" + field.fieldName}
              >
                <Form.Label className="mb-1">
                  {field.label}
                  {field.required && <span className="text-danger">*</span>}
                </Form.Label>
                <Form.Control
                  ref={(el) => assignRef(el, field.fieldName)}
                  type={field.type}
                  name={field.fieldName}
                  value={formData[field.fieldName]}
                  onChange={handleInputChange}
                  placeholder={"Enter " + field.label}
                  isInvalid={hasError}
                  required={field.required}
                  readOnly={field.readOnly}
                />
                {hasError &&
                  renderErrorMessage(
                    formErrors[field.fieldName] ||
                      defaultFormErrors[field.fieldName]
                  )}
              </Form.Group>
            );
          })}

          {/* New Payment Method Block */}
          <Form.Group controlId="paymentMethod">
            <Form.Label>Payment Method</Form.Label>
            <div>
              <Form.Check
                type="radio"
                label={
                  <>
                    <label htmlFor="prepaidMethod" className="payment-option">
                      Prepaid
                    </label>
                    <p className="method-info">
                      (Prepaid orders have no extra charges, and you'll receive
                      a tracking link to your given mobile number after placing
                      your order)
                    </p>
                  </>
                }
                name="prepaidMethod"
                id="prepaidMethod"
                value="online"
                checked={paymentMethod === "online"}
                onChange={handlePaymentMethodChange}
              />
              <Form.Check
                type="radio"
                label={
                  <>
                    <label htmlFor="codMethod" className="payment-option">
                      Cash on Delivery
                    </label>
                    <p className="method-info">
                      (For COD orders, there's an extra ₹69 charge that you need
                      to pay first. The remaining amount can be paid when your
                      order is delivered)
                    </p>
                  </>
                }
                name="codMethod"
                id="codMethod"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={handlePaymentMethodChange}
              />
            </div>
          </Form.Group>
        </Form>
      </StyledForm>
    );
  };

  return (
    <StyledCheckout>
      {loading && <LoadingIndicator variant={"spinner"} />}

      {/* <meta name="viewport" content="width=device-width, initial-scale=1.0" /> */}
      <StyledModal show={showModal} onHide={onClose}>
        <Modal.Header closeButton style={{ backgroundColor: "white" }}>
          <Modal.Title>
            {showOrderSummary ? "Order Summary" : "Add Address"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{ backgroundColor: "white" }}
          className="customScrollbar"
        >
          {showOrderSummary ? renderOrderSummary() : renderForm()}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: "white" }}>
          <Button
            variant="secondary"
            onClick={() =>
              showOrderSummary ? setShowOrderSummary(false) : onClose()
            }
          >
            {showOrderSummary ? "Edit Address" : "Close"}
          </Button>
          <Button
            variant="primary"
            disabled={disableBtn}
            onClick={() => {
              if (showOrderSummary) handlePayment();
              else {
                isFormValid() ? setShowOrderSummary(true) : null;
              }
            }}
          >
            {disableBtn
              ? "Processing..."
              : showOrderSummary
                ? "Confirm Order"
                : "Continue"}
          </Button>
        </Modal.Footer>
      </StyledModal>
      <Button
        className="w-100 rounded-1 buy-button"
        style={{ backgroundColor: "#704a0d" }}
        onClick={handleCheckout}
      >
        {cartItems ? "Proceed to Checkout" : "Buy Now"}
      </Button>
    </StyledCheckout>
  );
};

export default Checkout;

const StyledCheckout = styled.section`
  .buy-button {
    &:active,
    &:hover,
    &:focus {
      border-color: transparent;
    }
  }
`;

const StyledModal = styled(Modal)`
  display: flex !important;
  justify-content: center;
  align-items: center;
  .modal-dialog {
    width: 50%;
    min-width: 30rem;
  }
  .modal-content {
    max-height: calc(100vh - 4rem);
    .modal-body {
      padding: 0;
    }
    .modal-footer {
      button {
        border: 1px solid var(--gray);
        &.btn-secondary {
          background-color: var(--white);
          color: var(--text);
          &:hover {
            background-color: #e8e8e8;
          }
        }
        &.btn-primary {
          &,
          &:hover {
            background-color: var(--primary);
            color: var(--white);
            border-color: transparent;
          }
        }
      }
    }
  }

  .customScrollbar {
    overflow-y: auto;
    /* Custom scrollbar styles */
    &::-webkit-scrollbar {
      width: 6px; /* Width of the scrollbar */
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1; /* Background of the scrollbar track */
    }

    &::-webkit-scrollbar-thumb {
      background-color: #c4c4cd; /* Scrollbar thumb color */
      border-radius: 10px; /* Rounded scrollbar edges */
      border: 1px solid #f1f1f1; /* Padding around the thumb */
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: #808080; /* Thumb color on hover */
    }
  }
  @media screen and (max-width: 480px) {
    .modal-dialog {
      width: 98%;
      min-width: auto;
    }
  }
  @media screen and (min-width: 1200px) {
    .modal-dialog {
      max-width: 40vw;
    }
  }
`;

const StyledOrderSummary = styled.section`
  height: calc(100vh - 20rem);
  display: flex;
  flex-flow: column;
  justify-content: space-between;

  .container {
    > .row {
      flex-flow: column;
    }
  }
  .item-list {
    padding: 1rem;
    .cart-list-item {
      width: 100%;
      img {
        width: 5rem !important;
        height: 5rem !important;
      }
    }
  }
  .bill-summary {
    width: 100%;
    position: sticky;
    bottom: -1px;
    background: white;
    padding: 0 1rem;
  }
`;

const StyledForm = styled.section`
  padding: 1rem;
  .checkout-form {
    & > div:last-child {
      label {
        margin-bottom: 0;
      }
    }
    .form-group {
      .form-control {
        &.is-invalid:not(:read-only) {
          background: #fff;
        }
        &:hover:not(:focus-within, :read-only) {
          background: var(--chalk);
        }
        &:read-only:not(:disabled) {
          border: none;
          background-image: none;
        }
      }
      .is-invalid ~ .invalid-feedback {
        display: flex;
        align-items: center;
      }
      .invalid-feedback {
        svg {
          margin-right: 0.2rem;
        }
      }
    }

    .form-check {
      .form-check-input {
        margin-top: 0.4rem;
        cursor: pointer;
        &:checked {
          background-color: var(--primary);
          border-color: var(--primary);
        }
      }
      label {
        cursor: pointer;
      }
      .payment-option {
        font-weight: bold;
      }
      .method-info {
        font-size: 12px;
        line-height: 1;
      }
    }
  }
`;
