import Link from 'next/link';

/**
 * Full-width mode banner shown at the top of both WhatsApp admin pages so an
 * admin can never mistake the 1-to-1 inbox for the one-to-many bulk sender.
 *
 *   mode="inbox" → green  "LIVE INBOX"   — replies go to ONE customer
 *   mode="bulk"  → red    "BULK SENDER"  — a send reaches MANY customers
 */

type Mode = 'inbox' | 'bulk';

const THEME: Record<Mode, {
  bg: string;
  border: string;
  badgeBg: string;
  text: string;
  label: string;
  message: string;
  linkText: string;
  linkHref: string;
}> = {
  inbox: {
    bg: '#ecfdf5',
    border: '#10b981',
    badgeBg: '#059669',
    text: '#065f46',
    label: 'LIVE INBOX',
    message: 'This is for 1-to-1 replies only. Messages you send here go to a single customer.',
    linkText: 'Need to message many customers? Go to Bulk Sender',
    linkHref: '/admin/whatsapp/broadcast',
  },
  bulk: {
    bg: '#fef2f2',
    border: '#ef4444',
    badgeBg: '#dc2626',
    text: '#991b1b',
    label: 'BULK SENDER',
    message: 'This sends to many customers at once. Double-check the template and recipient list before sending.',
    linkText: 'Replying to one customer? Go to Live Inbox',
    linkHref: '/admin/whatsapp',
  },
};

export default function ModeBanner({ mode }: { mode: Mode }) {
  const t = THEME[mode];
  return (
    <div
      role="status"
      aria-label={`${t.label} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '10px 14px',
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderLeft: `6px solid ${t.border}`,
        borderRadius: 10,
        color: t.text,
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          background: t.badgeBg,
          color: '#fff',
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: 0.8,
          padding: '4px 10px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
        }}
      >
        {t.label}
      </span>
      <span style={{ flex: 1, minWidth: 220 }}>{t.message}</span>
      <Link href={t.linkHref} style={{ color: t.text, fontWeight: 700, textDecoration: 'underline', whiteSpace: 'nowrap' }}>
        {t.linkText} &rarr;
      </Link>
    </div>
  );
}
