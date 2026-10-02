'use client';

import React, { useState, useEffect, useRef } from 'react';
import AdminLayoutWrapper from '../components/AdminLayoutWrapper';
import { Spinner, Badge, Button } from 'react-bootstrap';

interface ChatThread {
  phone_number: string;
  customer_name?: string;
  state: string;
  last_updated: string;
  last_message: string;
  messages_count?: number;
}

interface ChatMessage {
  id: number;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  sender_name?: string;
  message_type: string;
  body: string;
  created_at: string;
}

export default function WhatsAppLiveChatsPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [search, setSearch] = useState('');
  
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch conversation threads
  const fetchThreads = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/chats');
      const data = await res.json();
      if (data.success && Array.isArray(data.threads)) {
        setThreads(data.threads);
        // Default select first thread if none selected
        if (!activePhone && data.threads.length > 0) {
          setActivePhone(data.threads[0].phone_number);
        }
      }
    } catch (e) {
      console.error('Failed to load threads:', e);
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 10000); // Polling threads every 10s
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch messages for active thread
  const fetchActiveMessages = async (phone: string, showSpinner = false) => {
    if (showSpinner) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/whatsapp/chats?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setActiveCustomer(data.customer || null);
        setActiveSession(data.session || null);
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    } finally {
      if (showSpinner) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activePhone) {
      fetchActiveMessages(activePhone, true);
      const interval = setInterval(() => fetchActiveMessages(activePhone, false), 4000); // Poll active chat every 4s
      return () => clearInterval(interval);
    }
  }, [activePhone]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activePhone || !inputMessage.trim() || sending) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const res = await fetch('/api/admin/whatsapp/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activePhone,
          message: textToSend,
          action: 'send'
        })
      });
      const data = await res.json();
      if (data.success) {
        // Immediate local append
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            phone_number: activePhone,
            direction: 'outbound',
            sender_name: 'Admin',
            message_type: 'text',
            body: textToSend,
            created_at: new Date().toISOString()
          }
        ]);
      } else {
        alert(data.error || 'Failed to send WhatsApp message');
        setInputMessage(textToSend); // restore
      }
    } catch (err: any) {
      alert('Error sending message: ' + err.message);
      setInputMessage(textToSend);
    } finally {
      setSending(false);
    }
  };

  // 4. Toggle Bot vs Human Takeover
  const handleToggleTakeover = async () => {
    if (!activePhone || !activeSession) return;
    const isHuman = activeSession.state === 'HUMAN_HANDOFF';
    const nextAction = isHuman ? 'release' : 'takeover';

    try {
      const res = await fetch('/api/admin/whatsapp/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activePhone,
          action: nextAction
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession((prev: any) => ({ ...prev, state: data.state }));
        fetchThreads();
        fetchActiveMessages(activePhone, false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredThreads = threads.filter(t => 
    t.phone_number.includes(search) || 
    (t.customer_name && t.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'HUMAN_HANDOFF':
        return <Badge bg="danger">👨‍💼 Human Agent</Badge>;
      case 'ORDER_CONFIRMED':
        return <Badge bg="success">✅ Order Placed</Badge>;
      case 'AWAITING_PAYMENT':
        return <Badge bg="warning" text="dark">💳 Payment Link</Badge>;
      case 'AWAITING_ADDRESS':
      case 'CONFIRMING_ADDRESS':
        return <Badge bg="info" text="dark">📍 Address</Badge>;
      case 'BUILDING_CART':
      case 'VIEWING_PRODUCT':
      case 'BROWSING':
        return <Badge bg="primary">🛒 Shopping</Badge>;
      default:
        return <Badge bg="secondary">🤖 Bot Idle</Badge>;
    }
  };

  return (
    <AdminLayoutWrapper>
      <div className="container-fluid py-3" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="m-0 fw-bold">WhatsApp Live Chats</h4>
            <small className="text-muted">Real-time customer conversations & live agent takeover</small>
          </div>
          <Button variant="outline-primary" size="sm" onClick={() => fetchThreads()}>
            🔄 Refresh Chats
          </Button>
        </div>

        {/* --- MAIN CHAT CONTAINER (WHATSAPP WEB STYLE) --- */}
        <div className="card shadow-sm border-0 flex-grow-1 overflow-hidden" style={{ display: 'flex', flexDirection: 'row', borderRadius: '12px' }}>
          
          {/* LEFT PANEL: CONVERSATION LIST */}
          <div style={{ width: '360px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            {/* Search Header */}
            <div className="p-3 border-bottom bg-light">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by name or number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ borderRadius: '20px' }}
              />
            </div>

            {/* Conversation List */}
            <div className="flex-grow-1 overflow-auto">
              {loadingThreads ? (
                <div className="p-4 text-center text-muted">
                  <Spinner animation="border" size="sm" /> Loading chats...
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-4 text-center text-muted small">
                  No WhatsApp conversations found yet.
                </div>
              ) : (
                filteredThreads.map(thread => {
                  const isSelected = thread.phone_number === activePhone;
                  return (
                    <div
                      key={thread.phone_number}
                      onClick={() => setActivePhone(thread.phone_number)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: isSelected ? '#f0fdf4' : 'transparent',
                        borderLeft: isSelected ? '4px solid #16a34a' : '4px solid transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-bold text-dark text-truncate" style={{ maxWidth: '170px' }}>
                          {thread.customer_name && thread.customer_name !== 'Customer' ? thread.customer_name : thread.phone_number}
                        </span>
                        <small className="text-muted" style={{ fontSize: '11px' }}>
                          {new Date(thread.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <div className="text-muted text-truncate small" style={{ maxWidth: '190px' }}>
                          {thread.last_message || 'Active conversation'}
                        </div>
                        <div>
                          {getStateBadge(thread.state)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: CHAT THREAD */}
          <div className="flex-grow-1 d-flex flex-column" style={{ background: '#efeae2' }}>
            {activePhone ? (
              <>
                {/* Chat Top Header */}
                <div className="p-3 bg-white border-bottom d-flex justify-content-between align-items-center shadow-sm" style={{ zIndex: 5 }}>
                  <div className="d-flex align-items-center gap-3">
                    <div 
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '50%', 
                        background: '#075e54', 
                        color: '#fff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}
                    >
                      {(activeCustomer?.name?.[0] || 'C').toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-bold text-dark">
                        {activeCustomer?.name && activeCustomer?.name !== 'Customer' ? activeCustomer.name : activePhone}
                      </div>
                      <small className="text-muted">
                        +{activePhone} • {activeCustomer?.email || 'Guest shopper'}
                      </small>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    {activeSession && getStateBadge(activeSession.state)}
                    <Button 
                      variant={activeSession?.state === 'HUMAN_HANDOFF' ? 'success' : 'outline-danger'}
                      size="sm"
                      className="fw-bold"
                      onClick={handleToggleTakeover}
                    >
                      {activeSession?.state === 'HUMAN_HANDOFF' ? '🤖 Resume Bot' : '👨‍💼 Take Over (Pause Bot)'}
                    </Button>
                  </div>
                </div>

                {/* Messages Bubbles Area */}
                <div 
                  className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2"
                  style={{ 
                    backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
                    backgroundSize: '16px 16px' 
                  }}
                >
                  {loadingMessages ? (
                    <div className="m-auto text-center text-muted">
                      <Spinner animation="border" size="sm" /> Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="m-auto text-center p-4 bg-white rounded shadow-sm" style={{ maxWidth: '380px' }}>
                      <h6 className="fw-bold mb-1">No past chat logs found for this customer</h6>
                      <p className="text-muted small m-0">
                        Messages sent and received from now on will automatically appear in this thread in real time.
                      </p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isCustomer = msg.direction === 'inbound';
                      return (
                        <div
                          key={msg.id}
                          className={`d-flex ${isCustomer ? 'justify-content-start' : 'justify-content-end'}`}
                        >
                          <div
                            style={{
                              maxWidth: '75%',
                              padding: '8px 14px',
                              borderRadius: isCustomer ? '0px 14px 14px 14px' : '14px 0px 14px 14px',
                              background: isCustomer ? '#ffffff' : '#d9fdd3',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              fontSize: '14px',
                              position: 'relative'
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center gap-2 mb-1" style={{ fontSize: '11px', color: isCustomer ? '#075e54' : '#15803d', fontWeight: 600 }}>
                              <span>{isCustomer ? (activeCustomer?.name || 'Customer') : (msg.sender_name || 'Vyra Bot')}</span>
                              <span className="text-muted fw-normal">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#111827' }}>
                              {msg.body}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-white border-top">
                  {activeSession?.state !== 'HUMAN_HANDOFF' && (
                    <div className="mb-2 p-1 px-2 rounded bg-light text-muted small d-flex justify-content-between align-items-center">
                      <span>🤖 Bot is currently answering this customer. You can send an immediate reply or click <strong>Take Over</strong> to pause the bot.</span>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="d-flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type a message to customer on WhatsApp..."
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      disabled={sending}
                      style={{ borderRadius: '24px', paddingLeft: '16px' }}
                    />
                    <Button 
                      type="submit" 
                      variant="success" 
                      disabled={sending || !inputMessage.trim()}
                      style={{ borderRadius: '24px', padding: '0 24px', background: '#075e54', borderColor: '#075e54' }}
                    >
                      {sending ? <Spinner animation="border" size="sm" /> : 'Send'}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="m-auto text-center text-muted">
                <h5>Select a conversation to start chatting</h5>
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayoutWrapper>
  );
}
