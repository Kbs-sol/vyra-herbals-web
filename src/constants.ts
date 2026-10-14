// export const API_PATH = 'http://localhost/spro/vyra-api';

export const API_PATH: string = "/api";

export const APP_NAME: string = "VyraStore";

export const COD_Charges: number = 50;

/**
 * Amount collected online up-front on a cash-on-delivery order; the rest is
 * paid to the courier. Shared with the server so the checkout page and the
 * payment-integrity check can never disagree about what should be charged.
 */
export const COD_ADVANCE_PAYMENT: number = 100;
