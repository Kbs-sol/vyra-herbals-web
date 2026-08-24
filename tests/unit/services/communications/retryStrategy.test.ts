import { calculateNextRetry, decideRetry, getMaxAttempts } from '@/services/communications/queue/retry/strategy';
import { ProviderError } from '@/services/communications/utils/errors';

describe('calculateNextRetry', () => {
  beforeEach(() => {
    delete process.env.RETRY_DELAYS_MS;
  });

  it('returns a future date for attempt 0 using the default delay table', () => {
    const before = Date.now();
    const next = calculateNextRetry(0);
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThan(before);
    expect(next!.getTime() - before).toBeGreaterThanOrEqual(4000); // ~5s, allow scheduling jitter
  });

  it('returns null once attempts exceeds the configured delay table', () => {
    expect(calculateNextRetry(7)).toBeNull();
  });

  it('respects a custom RETRY_DELAYS_MS', () => {
    process.env.RETRY_DELAYS_MS = '1000,2000';
    expect(calculateNextRetry(0)).not.toBeNull();
    expect(calculateNextRetry(2)).toBeNull();
  });
});

describe('decideRetry', () => {
  it('schedules a retry for a 429 rate-limit error within attempt budget', () => {
    const err = new ProviderError('Rate limited', 429);
    const decision = decideRetry(err, 1);
    expect(decision.shouldRetry).toBe(true);
    expect(decision.nextRetryAt).not.toBeNull();
  });

  it('does not retry a 400 (permanent/client) error', () => {
    const err = new ProviderError('Invalid template', 400);
    const decision = decideRetry(err, 1);
    expect(decision.shouldRetry).toBe(false);
    expect(decision.nextRetryAt).toBeNull();
  });

  it('does not retry a 401 (auth) error', () => {
    const err = new ProviderError('Unauthorized', 401);
    expect(decideRetry(err, 1).shouldRetry).toBe(false);
  });

  it('stops retrying once max attempts are exhausted, even for a retryable error', () => {
    const err = new ProviderError('Server error', 500);
    const decision = decideRetry(err, getMaxAttempts());
    expect(decision.shouldRetry).toBe(false);
  });
});
