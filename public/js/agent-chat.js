/**
 * agent-chat.js — Floating chat widget for bMovies brochure pages.
 *
 * Renders a floating red circle (bottom-right) with "bM" text.
 * On click, expands to a 400x500 chat panel. Posts to /api/agent/chat.
 * Persists conversationId in sessionStorage.
 * If the user is signed in (check localStorage bmovies-auth), sends
 * the auth token; otherwise sends anonymously (rate-limited).
 */

(function () {
  'use strict';

  const API_URL = '/api/agent/chat';
  const SESSION_KEY = 'bmovies-agent-conversation';
  const AUTH_KEY = 'bmovies-auth';

  /* ── State ── */
  let isOpen = false;
  let messages = [];
  let conversationId = sessionStorage.getItem(SESSION_KEY) || null;
  let loading = false;

  /* ── Auth helper ── */
  function getAuthToken() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Supabase stores { access_token, ... } or nested under a key
      if (parsed?.access_token) return parsed.access_token;
      // Try the nested structure supabase-js uses
      const sessions = parsed?.['sb-' + location.hostname + '-auth-token'];
      if (sessions?.access_token) return sessions.access_token;
      // Walk one level deep
      for (const key of Object.keys(parsed)) {
        if (parsed[key]?.access_token) return parsed[key].access_token;
      }
      return null;
    } catch {
      return null;
    }
  }

  /* ── DOM creation ── */

  // Floating button
  const btn = document.createElement('div');
  btn.id = 'bm-agent-btn';
  btn.innerHTML = 'bM';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#E50914',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Bebas Neue', 'Inter', sans-serif",
    fontSize: '20px',
    fontWeight: '900',
    cursor: 'pointer',
    zIndex: '99999',
    boxShadow: '0 4px 20px rgba(229,9,20,0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    userSelect: 'none',
  });
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 6px 28px rgba(229,9,20,0.6)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 20px rgba(229,9,20,0.4)';
  });

  // Chat panel
  const panel = document.createElement('div');
  panel.id = 'bm-agent-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '92px',
    right: '24px',
    width: '400px',
    maxWidth: 'calc(100vw - 48px)',
    height: '500px',
    maxHeight: 'calc(100vh - 120px)',
    background: '#0a0a0a',
    border: '1px solid #222',
    display: 'none',
    flexDirection: 'column',
    zIndex: '99998',
    fontFamily: "'Inter', -apple-system, sans-serif",
    overflow: 'hidden',
  });

  // Panel header
  const header = document.createElement('div');
  Object.assign(header.style, {
    padding: '14px 16px',
    borderBottom: '1px solid #222',
    background: 'linear-gradient(135deg, #1a0003, #0a0000)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: '0',
  });
  header.innerHTML = `
    <div>
      <div style="font-size:0.55rem;color:#E50914;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:2px">Grand orchestrator</div>
      <div style="font-size:1rem;font-weight:900;color:#fff;font-family:'Bebas Neue','Inter',sans-serif">bMovies Agent</div>
    </div>
    <div id="bm-agent-close" style="cursor:pointer;color:#666;font-size:18px;padding:4px 8px;line-height:1">&times;</div>
  `;

  // Messages container
  const messagesEl = document.createElement('div');
  messagesEl.id = 'bm-agent-messages';
  Object.assign(messagesEl.style, {
    flex: '1',
    overflowY: 'auto',
    padding: '16px',
  });

  // Input row
  const inputRow = document.createElement('div');
  Object.assign(inputRow.style, {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    borderTop: '1px solid #222',
    flexShrink: '0',
  });

  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.placeholder = 'Talk to the bMovies agent...';
  Object.assign(inputEl.style, {
    flex: '1',
    background: '#1a1a1a',
    border: '1px solid #333',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    fontFamily: "'Inter', -apple-system, sans-serif",
  });
  inputEl.addEventListener('focus', () => {
    inputEl.style.borderColor = '#E50914';
  });
  inputEl.addEventListener('blur', () => {
    inputEl.style.borderColor = '#333';
  });

  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send';
  Object.assign(sendBtn.style, {
    background: '#E50914',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    fontSize: '11px',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, sans-serif",
  });

  inputRow.appendChild(inputEl);
  inputRow.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(inputRow);

  document.body.appendChild(panel);
  document.body.appendChild(btn);

  /* ── Render ── */

  function renderMessages() {
    if (messages.length === 0) {
      messagesEl.innerHTML = `
        <div style="text-align:center;padding:48px 16px">
          <div style="color:#333;font-size:36px;font-family:'Bebas Neue','Inter',sans-serif;margin-bottom:8px">bM</div>
          <div style="color:#666;font-size:13px;margin-bottom:16px">Ask me anything. I'm your creative partner on bMovies.</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center" id="bm-prompts">
            <button class="bm-prompt-btn" data-q="Help me name my studio">Help me name my studio</button>
            <button class="bm-prompt-btn" data-q="Brainstorm a sci-fi film">Brainstorm a sci-fi film</button>
            <button class="bm-prompt-btn" data-q="How does the bonding curve work?">How does the bonding curve work?</button>
            <button class="bm-prompt-btn" data-q="What can my agents do?">What can my agents do?</button>
          </div>
        </div>
      `;
      // Style + wire prompt buttons
      messagesEl.querySelectorAll('.bm-prompt-btn').forEach((b) => {
        Object.assign(b.style, {
          fontSize: '11px',
          padding: '6px 12px',
          border: '1px solid #333',
          background: 'none',
          color: '#888',
          cursor: 'pointer',
          fontFamily: "'Inter', -apple-system, sans-serif",
        });
        b.addEventListener('mouseenter', () => {
          b.style.borderColor = '#E50914';
          b.style.color = '#fff';
        });
        b.addEventListener('mouseleave', () => {
          b.style.borderColor = '#333';
          b.style.color = '#888';
        });
        b.addEventListener('click', () => {
          inputEl.value = b.getAttribute('data-q') || '';
          inputEl.focus();
        });
      });
      return;
    }

    let html = '';
    for (const msg of messages) {
      const isUser = msg.role === 'user';
      const align = isUser ? 'flex-end' : 'flex-start';
      const bg = isUser ? '#E50914' : '#1a1a1a';
      const color = isUser ? '#fff' : '#ccc';
      const border = isUser ? '' : 'border:1px solid #222;';
      const lines = msg.content
        .split('\n')
        .map((l) => `<p style="margin:0${l ? '' : ';height:0.5em'}">${escapeHtml(l)}</p>`)
        .join('');
      html += `<div style="display:flex;justify-content:${align};margin-bottom:12px">
        <div style="max-width:85%;padding:10px 14px;font-size:13px;line-height:1.5;background:${bg};color:${color};${border}">
          ${lines}
        </div>
      </div>`;
    }
    if (loading) {
      html += `<div style="display:flex;justify-content:flex-start;margin-bottom:12px">
        <div style="background:#1a1a1a;border:1px solid #222;padding:10px 14px;font-size:13px;color:#666">
          <span style="animation:bmPulse 1.5s infinite">Thinking...</span>
        </div>
      </div>`;
    }
    messagesEl.innerHTML = html;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ── Send message ── */

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || loading) return;
    inputEl.value = '';
    messages.push({ role: 'user', content: text });
    loading = true;
    renderMessages();

    try {
      const hdrs = { 'Content-Type': 'application/json' };
      const token = getAuthToken();
      if (token) hdrs['Authorization'] = 'Bearer ' + token;

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ message: text, conversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      conversationId = data.conversationId;
      sessionStorage.setItem(SESSION_KEY, conversationId);
      messages.push({ role: 'assistant', content: data.message.content });
    } catch (err) {
      messages.push({
        role: 'assistant',
        content: 'Sorry, I hit an error: ' + (err.message || 'unknown') + '. Try again?',
      });
    } finally {
      loading = false;
      renderMessages();
    }
  }

  /* ── Events ── */

  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) {
      renderMessages();
      inputEl.focus();
    }
  });

  header.querySelector('#bm-agent-close').addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen = false;
    panel.style.display = 'none';
  });

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  /* ── Pulse animation (injected once) ── */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bmPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);

  /* ── Public API: window.bmoviesChat ── */
  window.bmoviesChat = {
    /** Open the chat panel. If message is provided, send it immediately. */
    open(message) {
      if (!isOpen) {
        isOpen = true;
        panel.style.display = 'flex';
      }
      if (message) {
        inputEl.value = message;
        sendMessage();
      }
    },
    /** Close the chat panel. */
    close() {
      isOpen = false;
      panel.style.display = 'none';
    },
    /** Check if the chat is open. */
    get isOpen() { return isOpen; },
  };
})();
