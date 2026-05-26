// pages/index.jsx
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Halo! Saya adalah AI Agent Customer Support yang dilengkapi dengan PII Guardrail. Tuliskan keluhan atau pertanyaan Anda di sini. Data sensitif Anda (seperti NIK, Nama, Alamat, Email, atau No. Telepon) akan otomatis disensor sebelum diproses oleh AI.',
      debug: null
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDebug, setActiveDebug] = useState(null);
  const [nerStatus, setNerStatus] = useState('checking');

  const messagesEndRef = useRef(null);

  // Check NER service health
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('http://localhost:5000/health');
        if (res.ok) {
          setNerStatus('connected');
        } else {
          setNerStatus('disconnected');
        }
      } catch {
        setNerStatus('disconnected');
      }
    }
    checkHealth();
    // Check every 10 seconds
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    
    const userMsgText = input;
    const userMsg = { role: 'user', text: userMsgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsgText }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const assistantMsg = { 
          role: 'assistant', 
          text: data.reply,
          debug: data.debug 
        };
        setMessages((prev) => [...prev, assistantMsg]);
        // Set the debug pane to this message
        if (data.debug) {
          setActiveDebug(data.debug);
        }
      } else {
        setMessages((prev) => [
          ...prev, 
          { 
            role: 'assistant', 
            text: `Error: ${data.error || 'Terjadi kesalahan pada server.'}`,
            debug: data.debug 
          }
        ]);
        if (data.debug) {
          setActiveDebug(data.debug);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', text: 'Gagal terhubung dengan server API.' }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <Head>
        <title>AI Agent dengan PII Guardrail</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <header className="header">
        <div className="logo-section">
          <div className="logo-badge">PII</div>
          <div className="title-area">
            <h1>ShieldSupport AI</h1>
            <p>Customer Support Agent dengan Real-time PII Anonymization</p>
          </div>
        </div>
        <div className="status-section">
          <div className={`status-indicator ${nerStatus}`}>
            <span className="dot"></span>
            <span className="status-text">
              NER Service: {nerStatus === 'connected' ? 'Connected' : nerStatus === 'disconnected' ? 'Offline' : 'Checking...'}
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="chat-section">
          <div className="chat-container">
            <div className="chat-header">
              <span className="dot-active"></span>
              <span>Secure Chat Assistant</span>
            </div>
            
            <div className="messages-area">
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role}`}>
                  <div className="avatar">
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="message-bubble-container">
                    <div className="message-bubble">
                      <p>{msg.text}</p>
                    </div>
                    {msg.debug && (
                      <button 
                        className={`debug-btn ${activeDebug === msg.debug ? 'active' : ''}`}
                        onClick={() => setActiveDebug(msg.debug)}
                      >
                        🔎 View Shield Logs
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="message-row assistant loading">
                  <div className="avatar">AI</div>
                  <div className="message-bubble-container">
                    <div className="message-bubble">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ketik pesan dengan aman (contoh: Nama saya Budi, NIK 1234567890123456...)"
                disabled={loading}
              />
              <button onClick={sendMessage} disabled={loading || !input.trim()}>
                {loading ? 'Sending...' : 'Kirim'}
              </button>
            </div>
          </div>
        </section>

        <section className="debug-section">
          <div className="debug-card">
            <div className="debug-header">
              <h3>🛡️ PII Shield Logs</h3>
              <span className="subtitle">Real-time Redaction Inspector</span>
            </div>
            
            {activeDebug ? (
              <div className="debug-body">
                <div className="debug-item">
                  <span className="debug-label">Original User Input:</span>
                  <div className="debug-value original">{activeDebug.originalMessage}</div>
                </div>

                <div className="debug-item">
                  <span className="debug-label">Step 1: Regex Guardrail Output:</span>
                  <div className="debug-value regex-filtered">{activeDebug.afterRegex}</div>
                  {activeDebug.regexFound && activeDebug.regexFound.length > 0 ? (
                    <div className="badges-list">
                      {activeDebug.regexFound.map((item, idx) => {
                        const [label, val] = item.split(': ');
                        return (
                          <span key={idx} className={`badge regex ${label.toLowerCase()}`}>
                            {label}: {val}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="no-entities">No regex entities detected.</span>
                  )}
                </div>

                <div className="debug-item">
                  <span className="debug-label">Step 2: NER Guardrail Output (Sent to Gemini):</span>
                  <div className="debug-value ner-filtered">{activeDebug.afterNer}</div>
                  {activeDebug.nerEntities && activeDebug.nerEntities.length > 0 ? (
                    <div className="badges-list">
                      {activeDebug.nerEntities.map((item, idx) => (
                        <span key={idx} className={`badge ner ${item.label.toLowerCase()}`}>
                          {item.label}: {item.text}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="no-entities">No NER entities (PERSON/ADDRESS) detected.</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="debug-placeholder">
                <div className="placeholder-icon">🛡️</div>
                <p>Kirim pesan berisi PII (Nama, NIK, No. Telepon, Email, Alamat) dan klik <strong>"View Shield Logs"</strong> untuk memantau proses redaksi di panel ini.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          color: #f1f5f9;
          font-family: 'Plus Jakarta Sans', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .container {
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 24px;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo-badge {
          background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%);
          color: white;
          font-weight: 700;
          font-size: 20px;
          padding: 10px 14px;
          border-radius: 12px;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);
        }

        .title-area h1 {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
          background: linear-gradient(to right, #a78bfa, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .title-area p {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 2px;
        }

        .status-section {
          background: rgba(30, 41, 59, 0.5);
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-indicator .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-indicator.connected .dot {
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .status-indicator.disconnected .dot {
          background-color: #ef4444;
          box-shadow: 0 0 8px #ef4444;
        }

        .status-indicator.checking .dot {
          background-color: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
        }

        .main-content {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          flex: 1;
        }

        @media (max-width: 968px) {
          .main-content {
            grid-template-columns: 1fr;
          }
        }

        .chat-section {
          display: flex;
          flex-direction: column;
        }

        .chat-container {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          height: 600px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .chat-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(15, 23, 42, 0.2);
        }

        .dot-active {
          width: 6px;
          height: 6px;
          background-color: #60a5fa;
          border-radius: 50%;
          box-shadow: 0 0 6px #60a5fa;
        }

        .messages-area {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Custom scrollbar */
        .messages-area::-webkit-scrollbar {
          width: 6px;
        }
        .messages-area::-webkit-scrollbar-track {
          background: transparent;
        }
        .messages-area::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
        }

        .message-row {
          display: flex;
          gap: 12px;
          max-width: 85%;
        }

        .message-row.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message-row.assistant {
          align-self: flex-start;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          flex-shrink: 0;
        }

        .user .avatar {
          background: #3b82f6;
          color: white;
        }

        .assistant .avatar {
          background: #7c3aed;
          color: white;
        }

        .message-bubble-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .message-bubble {
          padding: 12px 18px;
          border-radius: 16px;
          font-size: 14.5px;
          line-height: 1.5;
        }

        .user .message-bubble {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .assistant .message-bubble {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-bottom-left-radius: 4px;
        }

        .debug-btn {
          align-self: flex-start;
          background: rgba(124, 58, 237, 0.15);
          border: 1px solid rgba(124, 58, 237, 0.3);
          color: #a78bfa;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .debug-btn:hover, .debug-btn.active {
          background: #7c3aed;
          color: white;
          border-color: #7c3aed;
        }

        .input-area {
          padding: 16px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          gap: 12px;
          background: rgba(15, 23, 42, 0.2);
        }

        .input-area input {
          flex: 1;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          color: white;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .input-area input:focus {
          border-color: #3b82f6;
        }

        .input-area button {
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 0 24px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .input-area button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .input-area button:disabled {
          background: #334155;
          color: #64748b;
          cursor: not-allowed;
        }

        /* Typing Indicator */
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 4px 0;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #94a3b8;
          border-radius: 50%;
          animation: bounce 1.3s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }

        /* Debug Section */
        .debug-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          height: 600px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .debug-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(15, 23, 42, 0.2);
        }

        .debug-header h3 {
          font-size: 15px;
          font-weight: 700;
          color: #a78bfa;
        }

        .debug-header .subtitle {
          font-size: 11px;
          color: #64748b;
        }

        .debug-placeholder {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          color: #64748b;
        }

        .placeholder-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .debug-placeholder p {
          font-size: 13px;
          line-height: 1.6;
          max-width: 280px;
        }

        .debug-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .debug-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .debug-label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .debug-value {
          padding: 12px;
          border-radius: 8px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.5;
          word-break: break-all;
        }

        .debug-value.original {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }

        .debug-value.regex-filtered {
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.15);
          color: #fde047;
        }

        .debug-value.ner-filtered {
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.15);
          color: #6ee7b7;
        }

        .badges-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }

        .badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .badge.regex {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .badge.ner {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .no-entities {
          font-size: 11px;
          color: #475569;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
