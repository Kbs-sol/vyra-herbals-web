import { whatsappClient } from '../../providers/whatsapp/client';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Secret admin-only WhatsApp command for toggling test mode.
 *
 * Recognized commands (exact, case-insensitive):
 *   __test on       → activate all test products (status = 1)
 *   __test off      → deactivate all test products (status = 0)
 *   __test status   → report current test mode state
 *   __test reset    → delete all test orders (source = 'test')
 *
 * Security:
 *   Only the phone number set in ADMIN_WHATSAPP_PHONE env variable
 *   can use these commands. All other senders are silently ignored.
 *
 * The test products are identified by category = '__test__' and
 * are NEVER visible to real customers regardless of status.
 */

function getAdminPhones(): string[] {
  // Supports a single number or a comma-separated list:
  // ADMIN_WHATSAPP_PHONE=919XXXXXXXXX,919YYYYYYYYY
  const raw = process.env.ADMIN_WHATSAPP_PHONE || '';
  return raw
    .split(',')
    .map((p) => p.replace(/\D/g, '').trim())
    .filter(Boolean);
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Returns true if the sender is one of the configured admin WhatsApp numbers. */
export function isAdminPhone(from: string): boolean {
  const adminPhones = getAdminPhones();
  if (adminPhones.length === 0) return false;
  const senderPhone = normalizePhone(from);
  const senderLast10 = senderPhone.slice(-10);
  // Match last 10 digits to handle +91 prefix differences
  return adminPhones.some(
    (adminPhone) =>
      senderPhone === adminPhone ||
      senderPhone.endsWith(adminPhone.slice(-10)) ||
      adminPhone.endsWith(senderLast10)
  );
}

/** Returns true if the text matches a __test command. */
export function isTestModeCommand(text: string): boolean {
  return /^__test(\s+\w+)?$/i.test(text.trim());
}

export async function handleTestModeCommand(from: string, text: string): Promise<void> {
  const sendText = async (msg: string) => {
    await whatsappClient.sendRaw({
      messaging_product: 'whatsapp',
      to: from,
      type: 'text',
      text: { body: msg },
    });
  };

  // Only allow the configured admin phone
  if (!isAdminPhone(from)) {
    // Silently ignore — do not tip off random users that this command exists
    return;
  }

  const parts = text.trim().toLowerCase().split(/\s+/);
  const subcommand = parts[1] || 'status';
  const db = getSupabaseAdmin();

  if (subcommand === 'on') {
    const { error } = await db
      .from('products')
      .update({ status: 1, updated_at: new Date().toISOString() })
      .eq('category', '__test__');

    if (error) {
      await sendText(`❌ Test mode ON failed: ${error.message}`);
      return;
    }

    const { data: products } = await db
      .from('products')
      .select('title, price')
      .eq('category', '__test__');

    const list = (products || []).map((p: any) => `  • ${p.title} — ₹${p.price}`).join('\n');
    await sendText(
      `🟢 *TEST MODE ON*\n\nTest products are now LIVE in the shop at ₹1:\n${list || '  (none seeded yet)'}\n\n` +
      `⚠️ Remember to turn off with *__test off* when done!\n\n` +
      `Customers CAN see these products right now.`
    );

  } else if (subcommand === 'off') {
    const { error } = await db
      .from('products')
      .update({ status: 0, updated_at: new Date().toISOString() })
      .eq('category', '__test__');

    if (error) {
      await sendText(`❌ Test mode OFF failed: ${error.message}`);
      return;
    }

    await sendText(
      `🔴 *TEST MODE OFF*\n\nAll test products are now hidden from the shop.\nCustomers cannot see them.\n\n✅ You're safe.`
    );

  } else if (subcommand === 'reset') {
    const { error } = await db.from('orders').delete().eq('source', 'test');

    if (error) {
      await sendText(`❌ Reset failed: ${error.message}`);
      return;
    }

    await sendText(`🗑️ *TEST ORDERS CLEARED*\n\nAll dummy test orders (source = 'test') have been deleted.`);

  } else {
    // status or unknown subcommand — show current state
    const { data: products } = await db
      .from('products')
      .select('title, price, status')
      .eq('category', '__test__');

    const { data: orders } = await db
      .from('orders')
      .select('id')
      .eq('source', 'test');

    if (!products || products.length === 0) {
      await sendText(
        `🧪 *TEST LAB STATUS*\n\nNo test products seeded yet.\nGo to Admin → Test Lab to seed them.\n\n*Commands:*\n__test on — activate test products\n__test off — deactivate test products\n__test reset — delete test orders`
      );
      return;
    }

    const activeCount = products.filter((p: any) => p.status === 1).length;
    const modeLabel = activeCount > 0 ? `🟢 ON (${activeCount} active)` : '🔴 OFF';
    const list = products
      .map((p: any) => `  ${p.status === 1 ? '🟢' : '⚫'} ${p.title} — ₹${p.price}`)
      .join('\n');

    await sendText(
      `🧪 *TEST LAB STATUS*\n\nTest Mode: *${modeLabel}*\nTest Orders: ${(orders || []).length} dummy order(s)\n\n*Products:*\n${list}\n\n*Commands:*\n__test on\n__test off\n__test reset`
    );
  }
}
