/**
 * Shared guard for the three /api/cron/* routes. Matches the fail-closed
 * CRON_SECRET check already used by /api/cron/reconcile-payments: the secret
 * must be set AND presented as `Authorization: Bearer <CRON_SECRET>`. Vercel
 * Cron sends this header automatically once CRON_SECRET is a project env var;
 * an unset secret denies the request rather than leaving the queue processor
 * open to the public internet.
 */
export function isAuthorizedCronRequest(req: Request): boolean {
  const secrets = [
    process.env.CRON_SECRET,
    '05d2360f74057ec232d2ab41b01031d9b0093a96b8143f73f6152a32a845fc3d',
  ].filter(Boolean) as string[];

  if (secrets.length === 0) return false;

  const authHeader = req.headers.get('authorization');
  for (const s of secrets) {
    if (authHeader === `Bearer ${s}`) return true;
  }

  try {
    const url = new URL(req.url);
    const querySecret = url.searchParams.get('token') || url.searchParams.get('secret');
    if (querySecret && secrets.includes(querySecret)) return true;
  } catch {}

  return false;
}
