import { normalizePhone, tryNormalizePhone } from '@/services/communications/utils/phoneNormalizer';
import { ValidationError } from '@/services/communications/utils/errors';

describe('normalizePhone', () => {
  it('normalizes a bare 10-digit number', () => {
    expect(normalizePhone('9876543210')).toBe('919876543210');
  });

  it('strips a leading trunk zero', () => {
    expect(normalizePhone('09876543210')).toBe('919876543210');
  });

  it('strips a +91 country code with spaces', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('919876543210');
  });

  it('strips a 91- prefix with a dash', () => {
    expect(normalizePhone('91-9876543210')).toBe('919876543210');
  });

  it('is idempotent on an already-normalized number', () => {
    expect(normalizePhone('919876543210')).toBe('919876543210');
  });

  it('throws on too-short input', () => {
    expect(() => normalizePhone('12345')).toThrow(ValidationError);
  });

  it('throws on a number not starting with 6-9', () => {
    expect(() => normalizePhone('5876543210')).toThrow(ValidationError);
  });

  it('throws on empty/undefined input', () => {
    // @ts-expect-error testing invalid input deliberately
    expect(() => normalizePhone(undefined)).toThrow(ValidationError);
  });
});

describe('tryNormalizePhone', () => {
  it('returns null instead of throwing on invalid input', () => {
    expect(tryNormalizePhone('not-a-phone')).toBeNull();
  });

  it('returns the normalized number on valid input', () => {
    expect(tryNormalizePhone('9876543210')).toBe('919876543210');
  });

  it('returns null for null/undefined', () => {
    expect(tryNormalizePhone(null)).toBeNull();
    expect(tryNormalizePhone(undefined)).toBeNull();
  });
});
