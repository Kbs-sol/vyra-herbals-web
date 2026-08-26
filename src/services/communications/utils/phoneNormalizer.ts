/**
 * Normalizes Indian phone numbers into the E.164-without-plus format
 * WhatsApp's Cloud API expects (e.g. "919876543210").
 */

import { ValidationError } from './errors';

const INDIA_COUNTRY_CODE = '91';

/**
 * Strips everything except digits.
 */
function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Normalizes a raw phone number string into WhatsApp's expected format.
 * Accepts inputs like:
 *   "9876543210"      -> "919876543210"
 *   "09876543210"     -> "919876543210"
 *   "+91 98765 43210"  -> "919876543210"
 *   "91-9876543210"   -> "919876543210"
 *
 * Throws ValidationError for anything that isn't a plausible 10-digit
 * Indian mobile number.
 */
export function normalizePhone(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    throw new ValidationError('Phone number is missing or not a string');
  }

  let digits = digitsOnly(raw);

  // Strip a single leading trunk-prefix zero: "09876543210" -> "9876543210"
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Already has country code: "919876543210"
  if (digits.length === 12 && digits.startsWith(INDIA_COUNTRY_CODE)) {
    digits = digits.slice(2);
  }

  // Defensive: some inputs may carry a duplicated country code like "0091..."
  if (digits.length === 13 && digits.startsWith('00' + INDIA_COUNTRY_CODE)) {
    digits = digits.slice(4);
  }

  if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
    throw new ValidationError(`Invalid Indian mobile number: "${raw}"`);
  }

  return `${INDIA_COUNTRY_CODE}${digits}`;
}

/**
 * Same as normalizePhone but returns null instead of throwing — useful in
 * handlers where an invalid phone should skip the send rather than blow up
 * the whole event pipeline.
 */
export function tryNormalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return normalizePhone(raw);
  } catch {
    return null;
  }
}
