/**
 * Shared guard for the three /api/cron/* routes. Matches the fail-closed
 * CRON_SECRET check already used by /api/cron/reconcile-payments: the secret
 * must be set AND presented as `Authorization: Bearer <CRON_SECRET>`. Vercel
 * Cron sends this header automatically once CRON_SECRET is a project env var;
 * an unset secret denies the request rather than leaving the queue processor
 * open to the public internet.
 */
export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}
