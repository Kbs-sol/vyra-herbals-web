/**
 * WhatsApp admin endpoints (/api/whatsapp/admin/*, /api/whatsapp/send) reuse
 * the storefront's single source of admin authentication — the httpOnly
 * `admin_token` cookie JWT verified in @/utils/adminAuth — instead of a
 * separate Bearer token. One admin-auth system to reason about, not two.
 *
 * NOTE: this `requireAdmin` is async (JWT verification is async), so every
 * call site must `await` it. It resolves to a 401 NextResponse to return
 * early with, or null when the request carries a valid admin session.
 */
export { requireAdmin } from '@/utils/adminAuth';
