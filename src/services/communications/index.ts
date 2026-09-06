/**
 * Main export surface for the communications module. Other parts of the
 * app (existing routes you're modifying) should only need this file plus
 * the event types from '@/types/communications'.
 *
 *   import { automationEngine } from '@/services/communications';
 *   await automationEngine.emit({ type: 'ORDER_PLACED', ... });
 */
export { automationEngine, emit } from './automationEngine/eventDispatcher';
export { whatsappClient, WhatsAppClient } from './providers/whatsapp/client';
export { messageQueue, DbMessageQueue } from './queue/dbQueue';
export { processPendingQueue, processRetryQueue, runCleanup } from './automationEngine/scheduler/scheduler';
export * from '@/types/communications';
