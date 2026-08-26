/**
 * Error types for the communications module.
 * Distinguishing retryable vs permanent failures up front means the queue
 * processor never has to re-derive intent from a raw HTTP status later.
 */

export class CommunicationError extends Error {
  public readonly retryable: boolean;
  public readonly status?: number;
  public readonly code?: string | number;

  constructor(
    message: string,
    opts: { retryable: boolean; status?: number; code?: string | number }
  ) {
    super(message);
    this.name = 'CommunicationError';
    this.retryable = opts.retryable;
    this.status = opts.status;
    this.code = opts.code;
  }
}

export class ProviderError extends CommunicationError {
  constructor(message: string, status?: number, code?: string | number) {
    const permanentCodes = [400, 401, 403, 404];
    const retryable = status ? !permanentCodes.includes(status) : true;
    super(message, { retryable, status, code });
    this.name = 'ProviderError';
  }
}

export class ValidationError extends CommunicationError {
  constructor(message: string) {
    super(message, { retryable: false });
    this.name = 'ValidationError';
  }
}

export class TemplateNotFoundError extends CommunicationError {
  constructor(templateName: string) {
    super(`Template not found: ${templateName}`, { retryable: false });
    this.name = 'TemplateNotFoundError';
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof CommunicationError) return error.retryable;

  const retryableCodes = [408, 429, 500, 502, 503, 504];
  const retryableMessages = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'network timeout',
    'rate limit',
    'fetch failed',
  ];

  const err = error as { status?: number; message?: string };
  if (err?.status && retryableCodes.includes(err.status)) return true;
  if (
    err?.message &&
    retryableMessages.some((m) => err.message!.toLowerCase().includes(m.toLowerCase()))
  ) {
    return true;
  }
  // Default to retryable for genuinely unknown errors — losing a notification
  // silently is worse than one extra retry attempt.
  return true;
}
