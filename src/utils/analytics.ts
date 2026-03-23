export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-MHSG926J';
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

declare global {
  interface Window {
    dataLayer: any[];
    fbq: any;
  }
}

/**
 * Push an event to GTM and Meta Pixel
 * @param eventName Name of the event (e.g., 'Purchase', 'AddToCart')
 * @param eventData Metadata for the event
 */
export const trackEvent = (eventName: string, eventData: Record<string, any> = {}) => {
  // 1. Google Tag Manager (Data Layer)
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData,
    });
  }

  // 2. Meta Pixel (fbq)
  if (typeof window !== 'undefined' && window.fbq && FB_PIXEL_ID) {
    // Meta Pixel standard events mapping
    const standardEvents = [
      'AddPaymentInfo', 'AddToCart', 'AddToWishlist', 'CompleteRegistration',
      'Contact', 'CustomizeProduct', 'Donate', 'FindLocation',
      'InitiateCheckout', 'Lead', 'Purchase', 'Schedule',
      'Search', 'StartTrial', 'SubmitApplication', 'Subscribe', 'ViewContent'
    ];

    if (standardEvents.includes(eventName)) {
        window.fbq('track', eventName, eventData);
    } else {
        window.fbq('trackCustom', eventName, eventData);
    }
  }

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] Event: ${eventName}`, eventData);
  }
};

/**
 * Initialize Meta Pixel PageView
 */
export const pageview = () => {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'PageView');
    }

    if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
            event: 'pageview',
        });
    }
};
