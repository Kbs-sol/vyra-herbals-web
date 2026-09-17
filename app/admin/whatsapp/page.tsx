'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

/**
 * WhatsApp Inbox — the admin's view of every real-time conversation.
 *
 * Data model:
 *   /api/admin/whatsapp/conversations   → left-hand thread list + unread badges
 *   /api/admin/whatsapp/thread?phone=…  → right-hand chat pane
 *   /api/admin/whatsapp/reply           → send a free-text reply (24h window)
 *
 * IMPORTANT UX contract:
 *   - Meta only retains inbound history via YOUR webhook. Anything sent
 *     before the migration+webhook were live is gone forever — no "import"
 *     button will ever recover it. The empty-state message says this.
 *   - Free-text replies are only allowed inside Meta's 24-hour customer
 *     service window. Outside it the compose bar auto-disables and the
 *     admin is redirected to the Broadcast page (template messages).
 *
 * A background poll (10s) keeps the list + open thread fresh.
 */

interface Conversation {
  phone: string;
  profile_name: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_direction: 'inbound' | 'outbound';
  unread_count: number;
  total_messages: number;
}

interface ThreadMessage {
  id: number;
  direction: 'inbound' | 'outbound';
  customer_phone: string;
  message_id: string | null;
  message_type: string;
  status: string;
  template_name: string | null;
  body_text: string | null;
  interactive_reply: string | null;
  is_read: boolean;
  read_at: string | null;
  profile_name: string | null;
  sent_at: string | null;
  created_at: string;
}

const POLL_MS = 10_000;

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [q, setQ] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ---- Load conversation list ------------------------------------------
  const loadConversations = useCallback(async () => {
    const url = new URL('/api/admin/whatsapp/conversations', window.location.origin);
    if (q) url.searchParams.set('q', q);
    if (unreadOnly) url.searchParams.set('unread', '1');
    try {
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setConversations(json.conversations || []);
      setTotalUnread(json.total_unread || 0);
    } catch {
      /* silent — poll again */
    }
  }, [q, unreadOnly]);

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, POLL_MS);
    return () => clearInterval(t);
  }, [loadConversations]);

  // ---- Load a single thread --------------------------------------------
  const loadThread = useCallback(async (phone: string) => {
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/thread?phone=${encodeURIComponent(phone)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setThread(json.messages || []);
      // Optimistically zero-out the unread badge on this thread
      setConversations((cs) => cs.map((c) => (c.phone === phone ? { ...c, unread_count: 0 } : c)));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedPhone) return;
    loadThread(selectedPhone);
    const t = setInterval(() => loadThread(selectedPhone), POLL_MS);
    return () => clearInterval(t);
  }, [selectedPhone, loadThread]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.phone === selectedPhone) || null,
    [conversations, selectedPhone],
  );

  // ---- 24h window check (client-side hint; server enforces) ------------
  const lastInboundAt = useMemo(() => {
    for (let i = thread.length - 1; i >= 0; i--) {
      if (thread[i].direction === 'inbound') return new Date(thread[i].created_at).getTime();
    }
    return 0;
  }, [thread]);
  const withinWindow = lastInboundAt > 0 && Date.now() - lastInboundAt < 24 * 60 * 60 * 1000;

  // ---- Send reply ------------------------------------------------------
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedPhone || !reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/whatsapp/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selectedPhone, text: reply }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFlash({ kind: 'err', msg: json.message || json.error || 'Failed to send' });
      } else {
        setReply('');
        await loadThread(selectedPhone);
        setFlash({ kind: 'ok', msg: 'Message sent' });
      }
    } catch (err) {
      setFlash({ kind: 'err', msg: (err as Error).message || 'Network error' });
    } finally {
      setSending(false);
      setTimeout(() => setFlash(null), 2500);
    }
  };

  return (
    <AdminLayoutWrapper pageTitle="WhatsApp Inbox">
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 90px)', padding: '16px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            WhatsApp Inbox {totalUnread > 0 ? <span style={{ background: '#25D366', color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 12, marginLeft: 8 }}>{totalUnread}</span> : null}
          </h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link href="/admin/whatsapp/broadcast" style={btnGhost}>Broadcast (templates)</Link>
            <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noreferrer" style={btnGhost}>Meta template manager ↗</a>
          </div>
        </div>

        {flash && (
          <div style={{ padding: 10, borderRadius: 8, background: flash.kind === 'ok' ? '#e7f9ee' : '#fdecea', color: flash.kind === 'ok' ? '#1b7f3d' : '#a11d1d', fontSize: 13 }}>{flash.msg}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 12, minHeight: 0, flex: 1 }}>
          <aside style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', gap: 8, flexDirection: 'column' }}>
              <input
                type="search"
                placeholder="Search by phone or name…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
              />
              <label style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
                Unread only
              </label>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              {conversations.length === 0 && (
                <EmptyState
                  title="No conversations yet"
                  body={
                    'The inbox fills up as customers message your WhatsApp Business number. Meta does not retain history; anything sent before your webhook went live is not recoverable. Once your webhook URL is registered in the Meta App Dashboard, every new inbound message lands here.'
                  }
                />
              )}
              {conversations.map((c) => (
                <button
                  key={c.phone}
                  onClick={() => setSelectedPhone(c.phone)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: c.phone === selectedPhone ? '#f0faf3' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f4f4f4',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{c.profile_name || `+${c.phone}`}</span>
                    <span style={{ fontSize: 11, color: '#888' }}>{formatTimeShort(c.last_message_at)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                      {c.last_direction === 'outbound' ? '↗ ' : ''}
                      {c.last_message_preview || <em style={{ opacity: 0.6 }}>(no preview)</em>}
                    </span>
                    {c.unread_count > 0 && (
                      <span style={{ background: '#25D366', color: '#fff', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  {c.profile_name && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>+{c.phone}</div>}
                </button>
              ))}
            </div>
          </aside>

          <section style={{ background: '#efeae2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {!selectedPhone ? (
              <EmptyState title="Select a conversation" body="Pick a chat on the left to see the message history and reply." />
            ) : (
              <>
                <header style={{ padding: '10px 16px', background: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{activeConversation?.profile_name || `+${selectedPhone}`}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    +{selectedPhone}
                    {withinWindow ? (
                      <span style={{ marginLeft: 8, background: '#d4edda', color: '#155724', padding: '1px 6px', borderRadius: 6, fontSize: 11 }}>Inside 24h reply window</span>
                    ) : (
                      <span style={{ marginLeft: 8, background: '#fff3cd', color: '#856404', padding: '1px 6px', borderRadius: 6, fontSize: 11 }}>Outside 24h window — use a template</span>
                    )}
                  </div>
                </header>

                <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {threadLoading && thread.length === 0 && <div style={{ opacity: 0.5, textAlign: 'center', padding: 20 }}>Loading…</div>}
                  {thread.map((m) => (
                    <MessageBubble key={m.id} m={m} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} style={{ padding: 12, borderTop: '1px solid #ddd', background: '#f7f7f7', display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={withinWindow ? 'Type a reply…' : 'Outside 24h — go to Broadcast to send a template'}
                    disabled={!withinWindow || sending}
                    maxLength={4000}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 22, border: '1px solid #ccc', fontSize: 14 }}
                  />
                  <button
                    type="submit"
                    disabled={!withinWindow || !reply.trim() || sending}
                    style={{ ...btnPrimary, opacity: !withinWindow || !reply.trim() || sending ? 0.5 : 1 }}
                  >
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </AdminLayoutWrapper>
  );
}

function MessageBubble({ m }: { m: ThreadMessage }) {
  const isOutbound = m.direction === 'outbound';
  const content = m.body_text || m.interactive_reply || m.template_name || '(no content)';
  const time = new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', justifyContent: isOutbound ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '70%',
          background: isOutbound ? '#dcf8c6' : '#fff',
          padding: '8px 12px',
          borderRadius: 10,
          fontSize: 14,
          boxShadow: '0 1px 1px rgba(0,0,0,.05)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <div>{content}</div>
        {m.template_name && !m.body_text && (
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Template: {m.template_name}</div>
        )}
        <div style={{ fontSize: 10, color: '#888', textAlign: 'right', marginTop: 4 }}>
          {time}
          {isOutbound && (
            <> · {m.status === 'read' ? '✓✓ read' : m.status === 'delivered' ? '✓✓' : m.status === 'sent' ? '✓' : m.status}</>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const btnPrimary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 22,
  background: '#25D366',
  color: '#fff',
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  background: '#fff',
  color: '#128C7E',
  border: '1px solid #128C7E',
  fontSize: 13,
  fontWeight: 500,
  textDecoration: 'none',
};
