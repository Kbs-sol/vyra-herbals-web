'use client';

import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FaMinus, FaPlus } from "react-icons/fa";
import { APP_NAME, COD_Charges, COD_ADVANCE_PAYMENT, API_PATH } from "../constants";
import styled from "styled-components";
import LoadingIndicator from "../Components/Common/LoadingIndicator";
import SVGIcon from "../Components/Common/SVGIcon";
import Cart from "./Cart";
import CartItem from "../Components/Shared/CartItem";
import BillSummary from "../Components/Shared/BillSummary";
import CouponInput from "../Components/Shared/CouponInput";
import { useAuth } from "../Components/Contexts/AuthContext";
import { useCart } from "../Components/Contexts/CartContext";
import { supabase } from "@/utils/supabaseClient";
import { trackEvent } from "@/utils/analytics";

interface CheckoutFormData {
  fullName: string;
  phone: string;
  email: string;
  houseNumber: string;
  area: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
}

const Checkout = ({
  show = false,
  onHide = () => {},
  cartItems,
  product,
  quantity = 1,
}: {
  show?: boolean;
  onHide?: () => void;
  cartItems: any;
  product: any;
  quantity?: number;
}) => {
  const { user } = useAuth();
  const { appliedCoupon, setDirectCheckoutItems } = useCart();
  const defaultFormData: CheckoutFormData = {
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
  // Persist form data to sessionStorage so accidental reloads don't wipe it
  const FORM_STORAGE_KEY = 'vyra_checkout_form_v1';
  const loadStoredForm = (): CheckoutFormData => {
    if (typeof window === 'undefined') return { ...defaultFormData };
    try {
      const raw = sessionStorage.getItem(FORM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultFormData, ...parsed };
      }
    } catch { /* ignore */ }
    return { ...defaultFormData };
  };
  const [formData, setFormData] = useState<CheckoutFormData>(loadStoredForm);
  const [formErrors, setFormErrors] = useState<any>({});

  // Persist on every change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    } catch { /* ignore quota errors */ }
  }, [formData]);

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
  const [orderedItems, setOrderedItems] = useState<any[]>([]);
  const [hasValidation, setHasValidation] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [isModalOpenedPreviously, setIsModalOpenedPreviously] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [saveAddressChecked, setSaveAddressChecked] = useState(true);
  // Inline payment error shown inside the modal. Toasts can be missed on mobile
  // (covered by keyboard, scrolled out of view, or dismissed too fast), so we
  // also render the failure reason right next to the Confirm Order button.
  const [paymentError, setPaymentError] = useState<string>("");

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({}); // Store refs dynamically

  const assignRef = (el, fieldName) => {
    inputRefs.current[fieldName] = el;
  };

  // const notify = (msg, tym=1000) => toast.success(msg, {
  //   position: "bottom-center",
  //   autoClose: tym,
  // });

  // Light cleanup: do NOT wipe formData here. Closing the modal must not lose
  // the user's typed address (that's a major friction point and was the cause
  // of "all data gone" reports). Form is only cleared after a successful order.
  const cleanUp = () => {
    setShowOrderSummary(false);
    setFormErrors({});
    setLoading(false);
    setHasValidation(false);
  };

  // Call this after a successful order to fully reset the form and storage
  const clearStoredForm = () => {
    setFormData({ ...defaultFormData });
    setFormErrors({});
    setHasValidation(false);
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem(FORM_STORAGE_KEY); } catch { /* ignore */ }
    }
  };

  const notify = (msg, tym = 2500) =>
    toast.warning(msg, {
      position: "bottom-center",
      autoClose: tym,
    });
  // Errors must stay long enough for the user to read AND act on them.
  // Don't shrink this back to ~500ms — orders that fail silently are the #1
  // reported issue and short toasts make the failure feel like a UI freeze.
  const notifyError = (msg, tym = 6000) =>
    toast.error(msg, {
      position: "bottom-center",
      autoClose: tym,
      closeOnClick: true,
    });

  // Payment endpoints identify the customer from their Supabase access token
  // rather than from a `userId` in the body, so every call must carry it.
  const authHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    } catch {
      // No session: the server will reject with 401, which handlePayment
      // surfaces to the customer as a "please sign in again" error.
    }
    return headers;
  };

  const updateOrderedItemsState = (items) => {
    setOrderedItems(
      items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        regular_price: item.regular_price || item.price,
        title: item.title,
        handle: item.handle,
        sku: item.sku || '',
        image_url: item.image_url,
      }))
    );
  };

  // Removed checkWelcomeCouponEligibility

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
      const singleProductPrice = product.price * quantity;
      setTotalPriceOfCartProducts(singleProductPrice);
      updateOrderedItemsState([{ ...product, quantity }]);
    }
  }, [cartItems, product, quantity]);

  // "Buy now" skips the cart, so the cart context has nothing to validate a
  // coupon against. Publish the single line item while this checkout is open
  // (and clear it on close) so coupons work in the direct-buy flow too.
  const isDirectBuy = (!cartItems || cartItems.length === 0) && !!product;
  useEffect(() => {
    if (showModal && isDirectBuy) {
      setDirectCheckoutItems([
        {
          id: product.id,
          price: Number(product.price) || 0,
          quantity: Number(quantity) || 1,
        },
      ]);
    } else {
      setDirectCheckoutItems(null);
    }
    return () => setDirectCheckoutItems(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, isDirectBuy, product?.id, product?.price, quantity]);

  useEffect(() => {
    if (user && showModal) {
      fetchSavedAddresses();
    }
    // Use user.id (stable) so token refreshes don't re-fetch and clobber the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, showModal]);

  const fetchSavedAddresses = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') {
        console.error("Error fetching addresses:", error);
      } else if (data && data.length > 0) {
        setSavedAddresses(data);
        // Pre-select default address if needed
        const defaultAddr = data.find(a => a.is_default) || data[0];
        if (!formData.fullName && !formData.phone) {
          handleAddressSelection(defaultAddr.id, data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddressSelection = (addressId, addressesToSearch = savedAddresses) => {
    setSelectedAddressId(addressId);
    if (!addressId) {
      setFormData({ ...defaultFormData });
      setFormErrors({});
      setIsApiSuccess(false);
      return;
    }

    const addr = addressesToSearch.find(a => a.id.toString() === addressId.toString());
    if (addr) {
      setFormData({
        ...formData,
        fullName: addr.full_name || '',
        phone: addr.phone || '',
        houseNumber: addr.house_number || '',
        area: addr.area || '',
        landmark: addr.landmark || '',
        pincode: addr.pincode || '',
        city: addr.city || '',
        state: addr.state || '',
        country: addr.country || 'India',
      });
      setIsApiSuccess(true);
      setFormErrors({});
    }
  };

  // Persists a freshly-typed address to the user's address book. No-op if the
  // order is using an already-saved address (nothing new to add) or the user
  // opted out via the checkbox. Idempotent: on success it selects the newly
  // saved address, so a retried checkout (e.g. after a payment failure) won't
  // insert a duplicate.
  const saveAddressToBook = async () => {
    if (!user || selectedAddressId) return;
    try {
      const isFirstAddress = savedAddresses.length === 0;
      const { data, error } = await supabase
        .from('user_addresses')
        .insert([{
          user_id: user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          house_number: formData.houseNumber,
          area: formData.area,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country || 'India',
          address_type: 'home',
          is_default: isFirstAddress,
        }])
        .select()
        .single();

      if (error) {
        console.error("Failed to save address to address book:", error);
        return;
      }
      if (data) {
        setSavedAddresses((prev) => [data, ...prev]);
        setSelectedAddressId(String(data.id));
      }
    } catch (e) {
      console.error("Failed to save address to address book:", e);
    }
  };

  useEffect(() => {
    const itemsTotal = (cartItems && cartItems.length > 0)
      ? cartItems.reduce(
        (total, item) => total + item.quantity * item.price,
        0
      )
      : (product ? product.price * quantity : 0);
    const discount = Math.min(Number(appliedCoupon?.discount || 0), itemsTotal);
    if (paymentMethod === "online") {
      setTransactionPrice(Math.max(0, itemsTotal - discount));
    } else if (paymentMethod === "cod") {
      setTransactionPrice(COD_ADVANCE_PAYMENT);
    }
  }, [paymentMethod, cartItems, product, quantity, appliedCoupon]);

  useEffect(() => {
    if (String(formData.pincode).length === 6) {
      fetchCityState(formData.pincode);
    }
  }, [formData.pincode]);

  useEffect(() => {
    if (typeof show === 'boolean') {
      setShowModal(show);
      if (show) setIsModalOpenedPreviously(true);
    }
  }, [show]);

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
    let errors: any = {};
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
    } else if (String(formData.pincode).length !== 6 || !String(formData.state).length) {
      errors.pincode = "Invalid Pincode. Please enter correct pincode.";
      isValid = false;
    }

    setFormErrors(errors);
    const err = Object.entries(errors).find((entry) => {
      const value = entry[1];
      return typeof value === 'string' && value.length > 0;
    });
    if (Array.isArray(err)) (inputRefs.current as any)[err[0]]?.focus();
    return isValid;
  };

  const handleCheckout = () => {
    // This is the app's authentication boundary. Browsing and adding to the cart
    // are open to guests; signing in is only required to place an order.
    if (!user) {
      toast.error("You have to login first", {
        position: "bottom-center",
        autoClose: 1000,
      });
      // A cart checkout resumes at /checkout, so signing in continues the order
      // rather than dropping the shopper back on the cart to click again. A direct
      // "Buy Now" must return to the product page instead: its line item lives in
      // this component's props and /checkout renders with product={null}, so
      // sending a direct buy there would silently lose the selected item.
      const returnTo = isDirectBuy
        ? window.location.pathname + window.location.search
        : '/checkout';
      router.push(`/login?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem("checkout_prev_path", currentPath);
    if (!isModalOpenedPreviously && window.location.pathname !== '/checkout') window.history.pushState({}, "", "/checkout");
    else if (window.location.pathname !== '/checkout') window.history.replaceState({}, "", "/checkout");
    
    // Track InitiateCheckout event — GA4 `begin_checkout` needs `items`.
    const items = cartItems || (product ? [{ ...product, quantity }] : []);
    const totalPrice = items.reduce((total, item) => total + (Number(item.quantity) * Number(item.price)), 0);
    const gaItems = items.map((i: any) => ({
      item_id: String(i.id),
      item_name: i.title || i.name || 'Vyra product',
      item_category: i.category || i.category_name || undefined,
      item_brand: 'Vyra Herbals',
      quantity: Number(i.quantity || 1),
      price: Number(i.price || 0),
    }));

    trackEvent('InitiateCheckout', {
      content_ids: gaItems.map((i) => i.item_id),
      content_type: 'product',
      value: totalPrice,
      currency: 'INR',
      num_items: gaItems.reduce((n, i) => n + i.quantity, 0),
      items: gaItems,
    });

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

  // Centralised error reporting — toast + inline + console — so a failure is
  // never silent. Mobile users frequently miss the toast (keyboard up, scroll
  // position, modal backdrop), and a silent loader looks like the page is broken.
  const reportPaymentError = (msg: string) => {
    console.error("[checkout] payment error:", msg);
    setPaymentError(msg);
    notifyError(msg);
  };

  const handlePayment = async () => {
    if (disableBtn) return; // double-tap guard
    setDisableBtn(true);
    setLoading(true);
    setPaymentError("");
    try {
      // Guard against payment-gateway misconfiguration / zero-amount orders before
      // we even hit the gateway — those would otherwise return a generic error.
      if (paymentMethod === 'online' && (!transactionPrice || transactionPrice < 1)) {
        reportPaymentError(
          "Payment amount must be at least ₹1. Please remove the coupon or contact support."
        );
        return;
      }

      if (saveAddressChecked) {
        await saveAddressToBook();
      }

      const responseData = await getAccessKey();
      if (!responseData || responseData.error || !responseData.paymentUrl) {
        const reason =
          responseData?.error ||
          "Couldn't reach the payment gateway. Please check your internet and try again.";
        reportPaymentError(`Order failed: ${reason}`);
        return;
      }
      const paymentTxnId = responseData.txnid;
      if (!paymentTxnId) {
        reportPaymentError("Order failed: payment gateway did not return a transaction ID.");
        return;
      }

      const paymentUrl = responseData.paymentUrl;

      // Parcel contents from SKU. Single unit -> "VYRA-OIL-100";
      // multiple units -> "2 × VYRA-OIL-100". Falls back to handle/title when a
      // product has no SKU.
      const productDetails = (orderedItems || [])
        .map((item) => {
          const label = item.sku || item.handle || item.title;
          const qty = Number(item.quantity) || 1;
          return qty > 1 ? `${qty} × ${label}` : `${label}`;
        })
        .join(", ");

      const couponDiscount = Math.min(
        Number(appliedCoupon?.discount || 0),
        totalPriceOfCartProducts
      );
      const discountedTotal = Math.max(0, totalPriceOfCartProducts - couponDiscount);
      const orderData = {
        orderItems: orderedItems,
        totalAmount: discountedTotal + (paymentMethod === "cod" ? COD_Charges : 0),
        transactionPrice: transactionPrice,
        shippingMethod: "standard",
        shippingData: {
          ...formData,
          productTitle: productDetails,
        },
        paymentMethod: paymentMethod,
        userId: user?.id,
        welcomeCouponApplied: false,
        welcomeCouponDiscount: 0,
        couponCode: appliedCoupon?.code || null,
      };

      const sessionRes = await fetch(`${API_PATH}/payment/session`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ txnId: paymentTxnId, orderData }),
      });
      const sessionData = await sessionRes.json().catch(() => null);
      if (!sessionRes.ok || sessionData?.status !== 'ok') {
        const reason = sessionData?.error || `Server returned ${sessionRes.status}`;
        reportPaymentError(`Could not save your order before payment: ${reason}`);
        return;
      }

      // Order session saved successfully — safe to clear the cached form and redirect.
      clearStoredForm();

      // Stash the pending txn so /order-placed (or anywhere else the user
      // lands back on after a failed surl POST) can call /api/payment/reconcile
      // and recover the order without admin intervention.
      try {
        localStorage.setItem(
          'vyra_pending_txn',
          JSON.stringify({ txnId: paymentTxnId, at: Date.now() })
        );
      } catch {
        // Storage unavailable (Safari private mode, etc.) — surl POST will
        // still create the order normally, and the cron sweep covers the rest.
      }

      // Mobile Safari/Chrome occasionally drop a `window.location.href` set after
      // a long await chain (treated as out-of-user-gesture). A synthetic anchor
      // click within the same tick is the most reliable cross-browser redirect.
      // We keep `window.location.assign` as a belt-and-braces fallback.
      try {
        const a = document.createElement("a");
        a.href = paymentUrl;
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        // Fallback: if for some reason the click didn't navigate within 400ms,
        // force a same-tab redirect so the user is never left on a stuck modal.
        setTimeout(() => {
          if (typeof window !== "undefined" && window.location.href !== paymentUrl) {
            window.location.assign(paymentUrl);
          }
        }, 400);
      } catch (navErr) {
        console.error("[checkout] redirect failed:", navErr);
        window.location.href = paymentUrl;
      }
    } catch (err) {
      console.error("handlePayment error:", err);
      reportPaymentError(`Unexpected error: ${(err as Error).message || 'please try again.'}`);
    } finally {
      setLoading(false);
      setDisableBtn(false);
    }
  };

  const getAccessKey = async () => {
    const url = `${API_PATH}/payment/access`;
    const params = {
      amount: transactionPrice,
      productinfo: orderedItems.length === 1
        ? orderedItems[0].title
        : `${orderedItems.length} items from Vyra Herbals`,
      firstname: formData.fullName,
      email: formData.email || "guest@vyraherbals.com",
      phone: formData.phone,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(params),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return { error: data?.error || `Payment gateway returned ${response.status}` };
      }
      return data;
    } catch (error) {
      console.error("getAccessKey network error:", error);
      return { error: (error as Error).message || "Network error" };
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
        return;
      }
      // Reached /checkout directly rather than through the "Proceed to Checkout"
      // button — resuming after login, or a bookmark — so no prior page was
      // recorded and there is nothing rendered underneath the modal. Fall back to
      // the cart instead of leaving an empty checkout shell on screen.
      if (window.location.pathname === '/checkout') {
        router.replace('/cart');
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
        <SVGIcon iconName={"error-icon"} className={"error-svg"} />
        {msg}
      </Form.Control.Feedback>
    );
  };

  const renderOrderSummary = () => {
    return (
      <StyledOrderSummary>
        <ul className="item-list">
          {orderedItems.map((item, index) => (
            <CartItem
              key={"order-item-" + index}
              product={item}
              showQuantitySelector={false}
            />
          ))}
        </ul>
        <section className="bill-summary">
          <div style={{ padding: "0 1rem" }}>
            <CouponInput />
          </div>
          <BillSummary
            items={orderedItems}
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

        <Form
          className="checkout-form"
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            // Prevent Enter from submitting the form (which would reload the page)
            const target = e.target as HTMLElement;
            if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
        >
          {savedAddresses.length > 0 && (
            <Form.Group className="mb-4 form-group bg-light p-3 rounded border">
              <Form.Label className="fw-bold mb-2">Select a Saved Address</Form.Label>
              <Form.Select
                value={selectedAddressId}
                onChange={(e) => handleAddressSelection(e.target.value)}
                className="mb-2 shadow-sm"
              >
                <option value="">-- Enter New Address --</option>
                {savedAddresses.map(addr => (
                  <option key={addr.id} value={addr.id}>
                    {addr.full_name}, {addr.house_number ? addr.house_number + ', ' : ''}{addr.area} - {addr.pincode}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

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

          {!selectedAddressId && (
            <Form.Group className="mb-3 form-group">
              <Form.Check
                type="checkbox"
                id="saveAddressCheckbox"
                label="Save this address to my address book for faster checkout next time"
                checked={saveAddressChecked}
                onChange={(e) => setSaveAddressChecked(e.target.checked)}
              />
            </Form.Group>
          )}

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
                      (For COD orders, you have to pay a ₹100 advance payment before booking. The remaining amount + ₹50 COD charge can be paid when your
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
      <StyledModal
        show={showModal}
        onHide={onClose}
        backdrop="static"
        keyboard={false}
      >
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
        {paymentError && showOrderSummary && (
          <div
            role="alert"
            style={{
              backgroundColor: "#fdecea",
              color: "#a31515",
              borderTop: "1px solid #f5c2c0",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              lineHeight: 1.35,
            }}
          >
            {paymentError}
          </div>
        )}
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
        {cartItems && cartItems.length > 0 ? "Proceed to Checkout" : "Buy Now"}
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
