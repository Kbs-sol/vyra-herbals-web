'use client';

/**
 * WhatsApp Bulk — outbound template broadcast.
 *
 * Two tabs:
 *   1. "CSV Bulk Send"    — upload a CSV of phone numbers + parameter, blast
 *      a WhatsApp template to each row via /api/whatsapp/send (single-send
 *      loop, client-side with 250 ms throttle).
 *   2. "History"          — every batch is logged to localStorage under
 *      `vh_bulk_history` so the admin can see what went where without a
 *      dedicated `campaigns` DB table.
 *
 * NOTE: This is deliberately self-contained. The richer campaign engine
 * (audience segments, dry-run, /api/admin/broadcast, `campaigns` table)
 * lives in the vyraherbals-ux/vyra-herbals reference repo and would need
 * Supabase migrations before it can ship here. That work is documented in
 * IMPROVEMENTS_AND_COMPARISON.md §8 as a follow-up.
 */

import React, { useEffect, useMemo, useState } from 'react';
import AdminLayoutWrapper from '../../components/AdminLayoutWrapper';

// -------------------------------------------------------------- history
interface BatchLog {
  id: string;
  started_at: string;   // ISO
  finished_at?: string; // ISO
  template_name: string;
  param_key: string;
  param_value: string;
  total: number;
  success: number;
  failed: number;
  log: Array<{ phone: string; ok: boolean; note?: string }>;
}
const HISTORY_KEY = 'vh_bulk_history';
const HISTORY_MAX = 25;
function loadHistory(): BatchLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as BatchLog[]) : [];
  } catch {
    return [];
  }
}
function saveHistoryBatch(batch: BatchLog) {
  if (typeof window === 'undefined') return;
  try {
    const cur = loadHistory();
    const next = [batch, ...cur.filter((b) => b.id !== batch.id)].slice(0, HISTORY_MAX);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* localStorage may be blocked — silent */
  }
}

// -------------------------------------------------------------- helpers
function parsePhoneNumbers(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const cleaned = line.replace(/[^0-9+]/g, '');
    const digits = cleaned.replace(/^\+/, '');
    if (digits.length >= 10 && digits.length <= 15) {
      const normalised = digits.length === 10 ? `+91${digits}` : (cleaned.startsWith('+') ? cleaned : `+${digits}`);
      if (!seen.has(normalised)) {
        seen.add(normalised);
        out.push(normalised);
      }
    }
  }
  return out;
}

const TEMPLATE_PRESETS = [
  { value: 'welcome_promo_3hr', label: 'Welcome promo — 3-hour follow-up' },
  { value: 'welcome_promo_24hr', label: 'Welcome promo — 24-hour follow-up' },
  { value: 'order_placed_v2', label: 'Order placed — confirmation' },
  { value: 'shipment_created', label: 'Shipment created — tracking link' },
  { value: 'reorder_60day', label: 'Reorder nudge — 60 days later' },
  { value: 'feedback_request', label: 'Feedback request' },
  { value: 'campaign_new_launch', label: 'Campaign — new product launch' },
];

// -------------------------------------------------------------- page
export default function WhatsAppBulkPage() {
  const [tab, setTab] = useState<'send' | 'history'>('send');

  const [templateName, setTemplateName] = useState('welcome_promo_24hr');
  const [customTemplate, setCustomTemplate] = useState('');
  const [paramKey, setParamKey] = useState('customer_name');
  const [paramValue, setParamValue] = useState('Valued Customer');
  const [csvContent, setCsvContent] = useState('');
  const [parsedNumbers, setParsedNumbers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastResult, setLastResult] = useState<BatchLog | null>(null);

  const [history, setHistory] = useState<BatchLog[]>([]);
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const effectiveTemplate = customTemplate.trim() || templateName;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setCsvContent(text);
      setParsedNumbers(parsePhoneNumbers(text));
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setCsvContent(text);
    setParsedNumbers(parsePhoneNumbers(text));
  };

  const runBroadcast = async () => {
    if (!parsedNumbers.length) {
      alert('Paste or upload a CSV with at least one valid phone number.');
      return;
    }
    if (!effectiveTemplate) {
      alert('Pick a template or type a custom template name.');
      return;
    }
    const ok = window.confirm(
      `Send template "${effectiveTemplate}" to ${parsedNumbers.length} recipient(s)?`,
    );
    if (!ok) return;

    setIsSending(true);
    setProgress({ done: 0, total: parsedNumbers.length });

    const batch: BatchLog = {
      id: `batch_${Date.now().toString(36)}`,
      started_at: new Date().toISOString(),
      template_name: effectiveTemplate,
      param_key: paramKey,
      param_value: paramValue,
      total: parsedNumbers.length,
      success: 0,
      failed: 0,
      log: [],
    };

    for (const phone of parsedNumbers) {
      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            template: effectiveTemplate,
            variables: paramValue ? { [paramKey]: paramValue } : {},
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.success !== false) {
          batch.success += 1;
          batch.log.push({ phone, ok: true });
        } else {
          batch.failed += 1;
          batch.log.push({ phone, ok: false, note: data?.error || `HTTP ${res.status}` });
        }
      } catch (err: any) {
        batch.failed += 1;
        batch.log.push({ phone, ok: false, note: err.message || 'Network error' });
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 250));
    }

    batch.finished_at = new Date().toISOString();
    saveHistoryBatch(batch);
    setLastResult(batch);
    setHistory(loadHistory());
    setIsSending(false);
  };

  const _historyByTemplate = useMemo(() => {
    const g: Record<string, BatchLog[]> = {};
    for (const b of history) (g[b.template_name] ||= []).push(b);
    return g;
  }, [history]);

  return (
    <AdminLayoutWrapper pageTitle="WhatsApp Bulk">
      <div className="wrap">
        <header className="head">
          <div>
            <h1 className="title">WhatsApp Bulk</h1>
            <p className="sub">
              Outbound template broadcasts. For live 1-to-1 replies use{' '}
              <a href="/admin/whatsapp" className="link">WhatsApp Inbox</a>.
              Templates must already be approved in Meta Business Manager.
            </p>
          </div>
          <div className="tabs" role="tablist">
            <button
              role="tab"
              className={`tab ${tab === 'send' ? 'tab-active' : ''}`}
              onClick={() => setTab('send')}
            >
              CSV Bulk Send
            </button>
            <button
              role="tab"
              className={`tab ${tab === 'history' ? 'tab-active' : ''}`}
              onClick={() => setTab('history')}
            >
              History ({history.length})
            </button>
          </div>
        </header>

        {tab === 'send' && (
          <div className="grid">
            <div className="card">
              <div className="field">
                <label className="lbl">Template</label>
                <select
                  className="input"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  disabled={isSending}
                >
                  {TEMPLATE_PRESETS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  className="input input-sub"
                  placeholder="Or type a custom approved template name…"
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  disabled={isSending}
                />
                <p className="hint">Effective template: <code>{effectiveTemplate}</code></p>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="lbl">Parameter key</label>
                  <input
                    className="input"
                    value={paramKey}
                    onChange={(e) => setParamKey(e.target.value)}
                    disabled={isSending}
                  />
                </div>
                <div className="field">
                  <label className="lbl">Parameter value</label>
                  <input
                    className="input"
                    value={paramValue}
                    onChange={(e) => setParamValue(e.target.value)}
                    disabled={isSending}
                  />
                </div>
              </div>

              <div className="field">
                <label className="lbl">CSV or line-separated phone numbers</label>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileUpload}
                  disabled={isSending}
                  className="file-input"
                />
                <textarea
                  className="textarea"
                  placeholder="Paste numbers here — one per line. Bare 10-digit Indian numbers auto-normalise to +91…"
                  value={csvContent}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  disabled={isSending}
                  rows={7}
                />
                <p className="hint">
                  <b>{parsedNumbers.length}</b> unique valid phone number{parsedNumbers.length === 1 ? '' : 's'} detected.
                </p>
              </div>

              <button
                className="btn btn-primary btn-lg"
                onClick={runBroadcast}
                disabled={isSending || parsedNumbers.length === 0}
              >
                {isSending
                  ? `Sending… ${progress.done} / ${progress.total}`
                  : `Send to ${parsedNumbers.length || '—'} recipient(s)`}
              </button>

              {isSending && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                  />
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="card-title">Recipients preview</h3>
              {parsedNumbers.length === 0 ? (
                <p className="hint">Numbers will appear here as you paste / upload.</p>
              ) : (
                <ul className="phones">
                  {parsedNumbers.slice(0, 50).map((p) => (
                    <li key={p}><code>{p}</code></li>
                  ))}
                  {parsedNumbers.length > 50 && (
                    <li className="hint">…and {parsedNumbers.length - 50} more</li>
                  )}
                </ul>
              )}

              {lastResult && (
                <div className="last-result">
                  <div className="result-head">
                    <span className="chip chip-ok">{lastResult.success} sent</span>
                    <span className="chip chip-err">{lastResult.failed} failed</span>
                    <span className="chip">{lastResult.total} total</span>
                  </div>
                  <details>
                    <summary>Show per-number log ({lastResult.log.length})</summary>
                    <ul className="log">
                      {lastResult.log.map((entry, i) => (
                        <li key={i} className={entry.ok ? 'log-ok' : 'log-err'}>
                          <code>{entry.phone}</code>{' — '}{entry.ok ? 'sent' : entry.note}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="card">
            <h3 className="card-title">Recent batches (stored in this browser)</h3>
            {history.length === 0 ? (
              <p className="hint">No batches yet. Run one from the CSV Bulk Send tab.</p>
            ) : (
              <div className="history-list">
                {history.map((b) => (
                  <details key={b.id} className="history-item">
                    <summary>
                      <span className="hi-time">{new Date(b.started_at).toLocaleString('en-IN')}</span>
                      <span className="hi-template"><code>{b.template_name}</code></span>
                      <span className="chip chip-ok">{b.success}</span>
                      <span className="chip chip-err">{b.failed}</span>
                      <span className="chip">{b.total}</span>
                    </summary>
                    <ul className="log">
                      {b.log.map((entry, i) => (
                        <li key={i} className={entry.ok ? 'log-ok' : 'log-err'}>
                          <code>{entry.phone}</code>{' — '}{entry.ok ? 'sent' : entry.note}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      if (confirm('Clear local batch history? (Does not un-send anything.)')) {
                        localStorage.removeItem(HISTORY_KEY);
                        setHistory([]);
                      }
                    }}
                  >
                    Clear history
                  </button>
                  <p className="hint" style={{ margin: 0 }}>
                    History lives in <code>localStorage</code> (this browser only). Server-side campaigns table is a follow-up.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <style jsx>{`
          .wrap { max-width: 1200px; margin: 0 auto; padding-bottom: 120px; }
          .head {
            display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end;
            gap: 16px; margin-bottom: 20px;
          }
          .title { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: #0f172a; letter-spacing: -0.3px; }
          .sub { margin: 0; color: #64748b; font-size: 13px; max-width: 620px; line-height: 1.5; }
          .sub .link { color: #059669; text-decoration: none; }
          .sub .link:hover { text-decoration: underline; }

          .tabs { display: inline-flex; background: #f1f5f9; border-radius: 10px; padding: 4px; }
          .tab {
            border: 0; background: transparent; padding: 8px 14px; border-radius: 8px;
            font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer;
          }
          .tab-active { background: #fff; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

          .grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
          @media (min-width: 900px) { .grid { grid-template-columns: 3fr 2fr; } }

          .card {
            background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px;
          }
          .card-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0f172a; }

          .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
          .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
          .lbl { font-size: 12px; font-weight: 600; color: #334155; letter-spacing: 0.2px; }
          .input, .textarea, .file-input {
            border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px;
            font-size: 13px; background: #fff; color: #0f172a; width: 100%;
          }
          .input:focus, .textarea:focus {
            outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
          }
          .input-sub { margin-top: 6px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; }
          .textarea { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; margin-top: 6px; }
          .file-input { padding: 7px 10px; font-size: 12px; background: #f8fafc; cursor: pointer; }
          .hint { margin: 4px 0 0; font-size: 12px; color: #64748b; }
          .hint code {
            background: #f1f5f9; padding: 1px 6px; border-radius: 3px;
            font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11.5px; color: #0f172a;
          }

          .btn {
            border: 0; border-radius: 8px; font-size: 13px; font-weight: 600;
            padding: 10px 16px; cursor: pointer; transition: box-shadow 0.15s, transform 0.1s;
            display: inline-flex; align-items: center; gap: 6px;
          }
          .btn:disabled { opacity: 0.55; cursor: not-allowed; }
          .btn-primary {
            background: linear-gradient(135deg, #10b981, #059669); color: #fff;
            box-shadow: 0 4px 10px rgba(16, 185, 129, 0.28);
          }
          .btn-primary:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(16, 185, 129, 0.38); }
          .btn-ghost { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
          .btn-ghost:not(:disabled):hover { background: #f8fafc; }
          .btn-lg { font-size: 14px; padding: 12px 20px; }

          .progress-bar { margin-top: 10px; height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
          .progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #059669); transition: width 0.2s; }

          .phones { list-style: none; padding: 0; margin: 0; max-height: 260px; overflow: auto; }
          .phones li { padding: 4px 0; font-size: 12.5px; color: #334155; border-bottom: 1px dashed #e2e8f0; }
          .phones code { font-family: ui-monospace, SFMono-Regular, monospace; }

          .last-result { margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          .result-head { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
          .chip {
            font-size: 11px; padding: 3px 8px; border-radius: 999px;
            background: #f1f5f9; color: #334155; font-weight: 600;
          }
          .chip-ok  { background: #d1fae5; color: #065f46; }
          .chip-err { background: #fee2e2; color: #991b1b; }
          .log { max-height: 300px; overflow: auto; padding-left: 20px; margin: 6px 0; font-size: 12px; }
          .log li { padding: 2px 0; }
          .log-ok { color: #065f46; }
          .log-err { color: #991b1b; }

          .history-list { display: flex; flex-direction: column; gap: 8px; }
          .history-item {
            border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; background: #f8fafc;
          }
          .history-item summary {
            cursor: pointer; display: flex; gap: 10px; align-items: center; font-size: 12.5px;
            list-style: none;
          }
          .history-item summary::-webkit-details-marker { display: none; }
          .hi-time { color: #64748b; min-width: 160px; }
          .hi-template { flex: 1; }
          .hi-template code {
            background: #e2e8f0; padding: 2px 6px; border-radius: 3px; font-size: 11.5px;
          }
        `}</style>
      </div>
    </AdminLayoutWrapper>
  );
}
