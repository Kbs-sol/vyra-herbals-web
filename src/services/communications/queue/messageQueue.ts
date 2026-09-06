import type { OutboundMessage, QueuedMessageRow } from '@/types/communications';
import type { EnqueueOptions } from './types';

/**
 * Queue interface. dbQueue.ts is the Supabase-backed implementation used
 * today; this abstraction exists so the project can move to Redis/BullMQ
 * later (per the spec's "why Supabase not Redis" note) without touching
 * eventDispatcher, handlers, or the cron routes.
 */
export interface MessageQueue {
  enqueue(message: OutboundMessage, opts?: EnqueueOptions): Promise<QueuedMessageRow>;
  getDueMessages(limit: number): Promise<QueuedMessageRow[]>;
  getDueRetries(limit: number): Promise<QueuedMessageRow[]>;
  markSent(id: number, messageId: string, raw: unknown): Promise<void>;
  markFailedRetry(id: number, error: string, nextRetryAt: Date, attempts: number): Promise<void>;
  markFailedPermanent(id: number, error: string): Promise<void>;
  findByDedupeKey(dedupeKey: string): Promise<QueuedMessageRow | null>;
  findByMessageId(messageId: string): Promise<QueuedMessageRow | null>;
  updateStatusByMessageId(messageId: string, status: 'delivered' | 'read', timestamp: Date): Promise<void>;
  deleteOldFailedPermanent(olderThanDays: number): Promise<number>;
}
