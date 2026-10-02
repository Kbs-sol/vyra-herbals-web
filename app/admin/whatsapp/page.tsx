'use client';

import React, { useState, useEffect } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';

export default function WhatsAppMarketingPage() {
  const [activeTab, setActiveTab] = useState<'send' | 'manual' | 'history' | 'bot'>('send');

  // --- Tab 1: Send Campaign ---
  const [templateName, setTemplateName] = useState('welcome_promo_3hr');
  const [audienceSegment, setAudienceSegment] = useState('all_customers');
  const [param1, setParam1] = useState('Customer Name');
  const [param2, setParam2] = useState('');
  
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const params = templateName === 'abandoned_cart' ? [param1, param2] : [param1];
      const res = await fetch('/api/admin/broadcast/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: templateName,
          audience_segment: audienceSegment,
          parameters: params,
          idempotency_key: `preview_${Date.now()}`
        }),
      });
      const data = await res.json();
      setPreviewData(data);
    } catch (e) {
      alert('Error fetching preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!previewData) return;
    const confirmed = window.confirm(`Send to ${previewData.eligible_count} eligible recipients?`);
    if (!confirmed) return;

    setIsSending(true);
    try {
      const params = templateName === 'abandoned_cart' ? [param1, param2] : [param1];
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_name: `${templateName} - ${new Date().toISOString().split('T')[0]}`,
          template_name: templateName,
          audience_segment: audienceSegment,
          parameters: params,
          idempotency_key: `camp_${Date.now()}`
        }),
      });
      const data = await res.json();
      setSendResult(data);
    } catch (e) {
      alert('Error sending campaign');
    } finally {
      setIsSending(false);
      setPreviewData(null);
      fetchData(); // refresh history
    }
  };

  // --- Tab 2: Manual Send (Legacy) ---
  const [manualTemplateName, setManualTemplateName] = useState('welcome_promo_3hr');
  const [manualParamKey, setManualParamKey] = useState('customer_name');
  const [manualParamValue, setManualParamValue] = useState('Valued Customer');
  const [parsedNumbers, setParsedNumbers] = useState<string[]>([]);
  const [manualResults, setManualResults] = useState<{ total: number; success: number; failed: number; log: string[] } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      const extracted: string[] = [];

      for (const line of lines) {
        const cleaned = line.replace(/[^0-9+]/g, '');
        if (cleaned.length >= 10) extracted.push(cleaned);
      }
      setParsedNumbers(Array.from(new Set(extracted)));
    };
    reader.readAsText(file);
  };

  const handleManualBroadcast = async () => {
    if (parsedNumbers.length === 0) return;
    setIsSending(true);
    const logs: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const phone of parsedNumbers) {
      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: Math.floor(Math.random() * 899999) + 100000,
            customer_phone: phone,
            template_name: manualTemplateName,
            parameters: manualParamKey ? { [manualParamKey]: manualParamValue } : {},
          }),
        });

        const data = await res.json();
        if (res.ok && data.outcome === 'sent') {
          successCount++;
          logs.push(`✓ Sent to ${phone}`);
        } else {
          failedCount++;
          logs.push(`✗ Failed for ${phone}: ${data.error || data.outcome}`);
        }
      } catch (err: any) {
        failedCount++;
        logs.push(`✗ Error for ${phone}: ${err.message}`);
      }
    }
    setIsSending(false);
    setManualResults({ total: parsedNumbers.length, success: successCount, failed: failedCount, log: logs });
  };

  // --- Data Fetching ---
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/data');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setSessions(data.sessions || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExpandCampaign = async (id: string) => {
    if (expandedCampaign === id) {
      setExpandedCampaign(null);
      return;
    }
    setExpandedCampaign(id);
    const res = await fetch(`/api/admin/broadcast/${id}/recipients`);
    const data = await res.json();
    setCampaignRecipients(data.recipients || []);
  };

  const handleResetSession = async (phone: string) => {
    try {
      await fetch(`/api/admin/bot-sessions/${phone}/reset`, { method: 'PATCH' });
      fetchData();
    } catch (e) {
      alert('Failed to reset session');
    }
  };

  return (
    <AdminLayoutWrapper pageTitle="WhatsApp Dual Broadcast Center">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {['send', 'manual', 'history', 'bot'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '10px 20px',
                background: activeTab === tab ? '#1e293b' : '#f1f5f9',
                color: activeTab === tab ? '#fff' : '#334155',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}
            >
              {tab === 'send' ? 'Send Campaign' : tab === 'manual' ? 'Manual Message' : tab === 'history' ? 'Campaign History' : 'Bot Conversations'}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          
          {activeTab === 'send' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Template Broadcast</h2>
              
              <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Select Template:</label>
                  <select 
                    value={templateName} 
                    onChange={e => setTemplateName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                  >
                    <option value="welcome_promo_3hr">Welcome Promo (3hr)</option>
                    <option value="abandoned_cart">Abandoned Cart</option>
                    <option value="feedback_request">Feedback Request</option>
                    <option value="reorder_reminder">Reorder Reminder</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Audience Segment:</label>
                  <select 
                    value={audienceSegment} 
                    onChange={e => setAudienceSegment(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                  >
                    <option value="all_customers">All Customers (Opt-in only)</option>
                    <option value="vip_repeat">VIP & Repeat Customers (&gt;= 2 orders)</option>
                    <option value="win_back">Win-back Leads</option>
                    <option value="delivered_last_30">Delivered Last 30 Days</option>
                    <option value="historical_leads">All Historical Leads</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Param 1 (Customer Name):</label>
                    <input type="text" value={param1} onChange={e => setParam1(e.target.value)} disabled style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5' }} />
                  </div>
                  {templateName === 'abandoned_cart' && (
                    <div>
                      <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Param 2 (Cart Total):</label>
                      <input type="text" value={param2} onChange={e => setParam2(e.target.value)} placeholder="e.g. 1999" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handlePreview}
                disabled={isPreviewLoading}
                style={{ background: '#3b82f6', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px' }}
              >
                {isPreviewLoading ? 'Loading Preview...' : 'Preview Campaign'}
              </button>

              {previewData && (
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <h3 style={{ marginTop: 0 }}>Campaign Preview</h3>
                  <p><strong>Total Audience:</strong> {previewData.total_audience}</p>
                  <p><strong>Excluded (Opt-out):</strong> <span style={{ color: '#ef4444' }}>{previewData.opt_out_excluded}</span></p>
                  <p><strong>Excluded (14d Freq Cap):</strong> <span style={{ color: '#f59e0b' }}>{previewData.freq_cap_excluded}</span></p>
                  <p><strong>Eligible to Send:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{previewData.eligible_count}</span></p>
                  <p><strong>Estimated Cost:</strong> ₹{previewData.estimated_cost?.toFixed(2)}</p>
                  
                  <div style={{ marginTop: '16px' }}>
                    <strong>Sample Phones:</strong>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{previewData.sample_phones?.join(', ') || 'None'}</div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <strong>Sample Message text:</strong>
                    <div style={{ fontSize: '13px', background: '#e2e8f0', padding: '10px', borderRadius: '6px' }}>{previewData.sample_message}</div>
                  </div>

                  {previewData.eligible_count > 0 && (
                    <button
                      onClick={handleSendCampaign}
                      disabled={isSending}
                      style={{ marginTop: '20px', background: isSending ? '#9ca3af' : '#22c55e', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: isSending ? 'not-allowed' : 'pointer' }}
                    >
                      {isSending ? 'Sending Broadcast...' : `Send to ${previewData.eligible_count} Recipients`}
                    </button>
                  )}
                </div>
              )}

              {sendResult && (
                <div style={{ padding: '16px', background: '#dcfce7', color: '#166534', borderRadius: '8px' }}>
                  ✓ Campaign sent! (Sent: {sendResult.sent_count}, Failed: {sendResult.failed_count})
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <div>
              {/* Legacy manual send UI exactly as it was */}
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Bulk WhatsApp Manual Upload</h2>
              
              <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Template Name:</label>
                  <input type="text" value={manualTemplateName} onChange={e => setManualTemplateName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Parameter Name:</label>
                    <input type="text" value={manualParamKey} onChange={e => setManualParamKey(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Parameter Fallback:</label>
                    <input type="text" value={manualParamValue} onChange={e => setManualParamValue(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Upload Excel/CSV:</label>
                  <input type="file" accept=".csv,.txt" onChange={handleFileUpload} />
                </div>
              </div>

              {parsedNumbers.length > 0 && (
                <button onClick={handleManualBroadcast} disabled={isSending} style={{ background: isSending ? '#9ca3af' : '#22c55e', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '6px', fontWeight: 600 }}>
                  {isSending ? 'Sending...' : `Send Manual Broadcast (${parsedNumbers.length})`}
                </button>
              )}

              {manualResults && (
                <div style={{ marginTop: '20px' }}>
                  Success: {manualResults.success}, Failed: {manualResults.failed}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Campaign History</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px' }}>Name</th>
                    <th style={{ padding: '12px' }}>Template</th>
                    <th style={{ padding: '12px' }}>Audience</th>
                    <th style={{ padding: '12px' }}>Sent/Failed</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(camp => (
                    <React.Fragment key={camp.id}>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => handleExpandCampaign(camp.id)}>
                        <td style={{ padding: '12px' }}>{camp.name}</td>
                        <td style={{ padding: '12px' }}>{camp.template_name}</td>
                        <td style={{ padding: '12px' }}>{camp.audience_segment}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: '#16a34a' }}>{camp.sent_count}</span> / <span style={{ color: '#dc2626' }}>{camp.failed_count}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: camp.status === 'sent' ? '#dcfce7' : '#fef08a' }}>
                            {camp.status}
                          </span>
                        </td>
                      </tr>
                      {expandedCampaign === camp.id && (
                        <tr>
                          <td colSpan={5} style={{ padding: '16px', background: '#f8fafc' }}>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              <table style={{ width: '100%', fontSize: '13px' }}>
                                <tbody>
                                  {campaignRecipients.map(r => (
                                    <tr key={r.id}>
                                      <td style={{ padding: '4px' }}>{r.customer_phone}</td>
                                      <td style={{ padding: '4px' }}>{r.send_status}</td>
                                      <td style={{ padding: '4px' }}>{new Date(r.created_at).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'bot' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Active Bot Conversations</h2>
                <a href="/admin/chats" style={{ padding: '8px 16px', background: '#075e54', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px' }}>
                  💬 Open WhatsApp Live Chat Window &rarr;
                </a>
              </div>
              {sessions.filter(s => s.state === 'HUMAN_HANDOFF').length > 0 && (
                <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>
                  <strong>Needs Attention:</strong> Some customers are waiting for a human agent.
                </div>
              )}
              
              <div style={{ display: 'grid', gap: '12px' }}>
                {sessions.map(session => (
                  <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: session.state === 'HUMAN_HANDOFF' ? '4px solid #ef4444' : '4px solid #3b82f6' }}>
                    <div>
                      <strong>{session.phone_number}</strong>
                      <span style={{ margin: '0 12px', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: session.state === 'HUMAN_HANDOFF' ? '#fecaca' : '#bfdbfe' }}>
                        {session.state}
                      </span>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Last updated: {new Date(session.updated_at).toLocaleString()}
                      </div>
                    </div>
                    {session.state === 'HUMAN_HANDOFF' && (
                      <button 
                        onClick={() => handleResetSession(session.phone_number)}
                        style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Reset to Menu
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayoutWrapper>
  );
}
