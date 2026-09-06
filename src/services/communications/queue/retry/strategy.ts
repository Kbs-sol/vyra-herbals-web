import { isRetryableError } from '../../utils/errors';
import type { RetryDecision } from './types';

const DEFAULT_DELAYS_MS = [5_000, 15_000, 45_000, 120_000, 300_000, 900_000, 3_600_000];

function getDelays(): number[] {
  const raw = process.env.RETRY_DELAYS_MS;
  if (!raw) return DEFAULT_DELAYS_MS;
  const parsed = raw.split(',').map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n));
  return parsed.length > 0 ? parsed : DEFAULT_DELAYS_MS;
}

export function getMaxAttempts(): number {
  return Number(process.env.MESSAGE_QUEUE_MAX_RETRIES ?? getDelays().length);
}

/**
 * `attempts` is the number of attempts already made (0-indexed into the
 * delay table). Returns null once attempts has exhausted the configured
 * delay table -> caller should mark the message failed_permanent.
 */
export function calculateNextRetry(attempts: number): Date | null {
  const delays = getDelays();
  if (attempts >= delays.length) return null;
  return new Date(Date.now() + delays[attempts]);
}

export { isRetryableError as shouldRetry };

/**
 * Single entry point used by the queue processor / retry cron: given the
 * error that just occurred and how many attempts have already happened,
 * decide whether to schedule another attempt or give up.
 */
export function decideRetry(error: unknown, attemptsSoFar: number): RetryDecision {
  if (!isRetryableError(error)) {
    return { shouldRetry: false, nextRetryAt: null };
  }
  const nextRetryAt = calculateNextRetry(attemptsSoFar);
  return { shouldRetry: nextRetryAt !== null, nextRetryAt };
}
