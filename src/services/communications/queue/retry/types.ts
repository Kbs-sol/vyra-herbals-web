export interface RetryDecision {
  shouldRetry: boolean;
  nextRetryAt: Date | null;
}
