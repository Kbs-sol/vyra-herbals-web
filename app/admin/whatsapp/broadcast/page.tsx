'use client';

import React, { useState } from 'react';
import AdminLayoutWrapper from '../../components/AdminLayoutWrapper';

export default function WhatsAppMarketingPage() {
  const [templateName, setTemplateName] = useState('welcome_promo_24hr');
  const [paramKey, setParamKey] = useState('customer_name');
  const [paramValue, setParamValue] = useState('Valued Customer');
  const [csvContent, setCsvContent] = useState('');
  const [parsedNumbers, setParsedNumbers] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<{ total: number; success: number; failed: number; log: string[] } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      parsePhoneNumbers(text);
    };
    reader.readAsText(file);
  };

  const parsePhoneNumbers = (text: string) => {
    // Extract phone numbers (10 to 12 digits, ignoring punctuation)
    const lines = text.split(/\r?\n/);
    const extracted: string[] = [];

    for (const line of lines) {
      const cleaned = line.replace(/[^0-9+]/g, '');
      if (cleaned.length >= 10) {
        extracted.push(cleaned);
      }
    }
    setParsedNumbers(Array.from(new Set(extracted)));
  };

  const handleBroadcast = async () => {
    if (parsedNumbers.length === 0) {
      alert('Please upload a CSV file with valid phone numbers.');
      return;
    }

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
            template_name: templateName,
            parameters: paramKey ? { [paramKey]: paramValue } : {},
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
    setResults({
      total: parsedNumbers.length,
      success: successCount,
      failed: failedCount,
      log: logs,
    });
  };

  return (
    <AdminLayoutWrapper pageTitle="WhatsApp Bulk Marketing & Broadcast">
      <div style={{ maxWidth: '900px', margin: '0 auto', background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Bulk WhatsApp Campaign Broadcast</h2>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Upload an Excel / CSV customer file containing phone numbers to send bulk promotional updates or custom campaign templates.
        </p>

        <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Template Name (from Meta WhatsApp Manager):</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. welcome_promo_24hr or festival_offer"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Parameter Name (optional):</label>
              <input
                type="text"
                value={paramKey}
                onChange={(e) => setParamKey(e.target.value)}
                placeholder="customer_name"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Parameter Fallback Value:</label>
              <input
                type="text"
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
                placeholder="Valued Customer"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '6px' }}>Upload Excel / CSV File:</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              style={{ padding: '8px 0' }}
            />
          </div>
        </div>

        {parsedNumbers.length > 0 && (
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Parsed Recipient Phone Numbers ({parsedNumbers.length} unique):</h4>
            <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '13px', color: '#444' }}>
              {parsedNumbers.join(', ')}
            </div>
          </div>
        )}

        <button
          onClick={handleBroadcast}
          disabled={isSending || parsedNumbers.length === 0}
          style={{
            background: isSending ? '#9E9E9E' : '#2e7d32',
            color: '#fff',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: isSending ? 'not-allowed' : 'pointer',
          }}
        >
          {isSending ? 'Sending WhatsApp Broadcast...' : `Send Broadcast to ${parsedNumbers.length} Recipients`}
        </button>

        {results && (
          <div style={{ marginTop: '32px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h3>Broadcast Results</h3>
            <p><strong>Total:</strong> {results.total} | <span style={{ color: 'green' }}><strong>Success:</strong> {results.success}</span> | <span style={{ color: 'red' }}><strong>Failed:</strong> {results.failed}</span></p>

            <div style={{ background: '#111', color: '#00ff00', padding: '12px', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
              {results.log.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayoutWrapper>
  );
}
