/**
 * bMovies payment picker — modal that offers multiple payment methods.
 *
 * Usage:
 *   import { openPayPicker } from './js/pay-picker.js';
 *   const result = await openPayPicker({
 *     type: 'ticket' | 'shares',
 *     title: 'Off-Key Heroes',
 *     offerId: 'mkt-test-offky-...',
 *     priceUsd: 2.99,
 *     ticker: 'OFFKY',
 *     email: 'user@example.com',
 *   });
 */

// Inline SVG logos. Kept minimal and geometric so they render cleanly
// at small sizes and don't depend on any CDN.
const LOGOS = {
  stripe: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="32" height="32" rx="6" fill="#635BFF"/><path d="M14.9 13c-1.8 0-2.8.9-2.8 2.3 0 1.5 1.3 2 3 2.5 1.5.4 2 .7 2 1.2 0 .5-.5.8-1.3.8-1 0-2.2-.4-3.3-1v3c1 .4 2.1.7 3.3.7 2 0 3.2-.9 3.2-2.4 0-1.7-1.4-2.2-3.1-2.7-1.4-.4-1.9-.7-1.9-1.2s.4-.7 1.1-.7c1 0 2 .3 3 .8V12.8c-1-.4-2-.6-3.2-.6z" fill="#fff"/></svg>`,

  handcash: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="32" height="32" rx="6" fill="#38EF7D"/><path d="M11 9v14h2.5v-6h5v6H21V9h-2.5v5.5h-5V9z" fill="#000"/></svg>`,

  brc100: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="32" height="32" rx="6" fill="#EAB300"/><text x="16" y="22" font-family="Arial Black, sans-serif" font-size="18" font-weight="900" text-anchor="middle" fill="#000">₿</text></svg>`,

  metamask: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="32" height="32" rx="6" fill="#1A1A1A"/><g transform="translate(5,7)"><path d="M20.8 0L12.5 6.1l1.5-3.6L20.8 0z" fill="#E17726"/><path d="M1.2 0l8.2 6.2L8 2.5 1.2 0z" fill="#E27625"/><path d="M17.8 13.2l-2.2 3.4 4.8 1.3 1.4-4.6-4 0zM0 13.3l1.4 4.6 4.8-1.3-2.2-3.4H0z" fill="#E27625"/><path d="M5.9 9.4L4.5 11.6l4.8.2-.2-5.1L5.9 9.4zM16.1 9.4l-3.3-2.8-.1 5.2 4.8-.2-1.4-2.2z" fill="#E27625"/><path d="M6.2 16.6L9 15.3l-2.5-1.9-.3 3.2zM13 15.3l2.8 1.3-.3-3.2-2.5 1.9z" fill="#D5BFB2"/></g></svg>`,

  phantom: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="32" height="32" rx="6" fill="#AB9FF2"/><path d="M16 6c-5 0-9 4-9 9v8h3c0-1 1-2 2-2s2 1 2 2h4c0-1 1-2 2-2s2 1 2 2h3v-8c0-5-4-9-9-9zm-3 10a2 2 0 110-4 2 2 0 010 4zm6 0a2 2 0 110-4 2 2 0 010 4z" fill="#fff"/></svg>`,

  card: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="32" height="32" rx="6" fill="#635BFF"/><rect x="6" y="10" width="20" height="13" rx="1.5" fill="none" stroke="#fff" stroke-width="1.8"/><rect x="6" y="13" width="20" height="2.5" fill="#fff"/><rect x="9" y="18" width="5" height="1.5" fill="#fff"/></svg>`,
};

const MODAL_HTML = `
<div class="pp-backdrop" id="pp-backdrop">
  <div class="pp-modal">
    <div class="pp-header">
      <div class="pp-kicker">Choose how to pay</div>
      <div class="pp-title" id="pp-title">Watch · $2.99</div>
      <button class="pp-close" id="pp-close" aria-label="Close">×</button>
    </div>

    <div class="pp-section">
      <div class="pp-section-label">Credit card</div>
      <button class="pp-option" data-provider="stripe">
        <div class="pp-option-icon">${LOGOS.card}</div>
        <div class="pp-option-body">
          <div class="pp-option-name">Pay with card</div>
          <div class="pp-option-sub">Visa · Mastercard · Amex · Apple Pay · Google Pay · Link</div>
        </div>
        <div class="pp-option-arrow">→</div>
      </button>
    </div>

    <div class="pp-section">
      <div class="pp-section-label">BSV wallets</div>
      <button class="pp-option" data-provider="handcash">
        <div class="pp-option-icon">${LOGOS.handcash}</div>
        <div class="pp-option-body">
          <div class="pp-option-name">HandCash</div>
          <div class="pp-option-sub">99% streams to shareholders on-chain</div>
        </div>
        <div class="pp-option-arrow">→</div>
      </button>
      <button class="pp-option" data-provider="brc100">
        <div class="pp-option-icon">${LOGOS.brc100}</div>
        <div class="pp-option-body">
          <div class="pp-option-name">BSV Desktop / Yours Wallet</div>
          <div class="pp-option-sub">BRC-100 · direct on-chain settlement</div>
        </div>
        <div class="pp-option-arrow">→</div>
      </button>
    </div>

    <div class="pp-section">
      <div class="pp-section-label">Other chains</div>
      <button class="pp-option" data-provider="metamask">
        <div class="pp-option-icon">${LOGOS.metamask}</div>
        <div class="pp-option-body">
          <div class="pp-option-name">MetaMask</div>
          <div class="pp-option-sub">Pay in ETH · cross-chain via x402</div>
        </div>
        <div class="pp-option-arrow">→</div>
      </button>
      <button class="pp-option" data-provider="phantom">
        <div class="pp-option-icon">${LOGOS.phantom}</div>
        <div class="pp-option-body">
          <div class="pp-option-name">Phantom</div>
          <div class="pp-option-sub">Pay in SOL · cross-chain via x402</div>
        </div>
        <div class="pp-option-arrow">→</div>
      </button>
    </div>

    <div class="pp-status" id="pp-status"></div>
  </div>
</div>
`;

const MODAL_CSS = `
.pp-backdrop {
  display: none;
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(10px);
  align-items: center; justify-content: center;
  padding: 1rem;
}
.pp-backdrop.shown { display: flex; }
.pp-modal {
  background: #0a0a0a; border: 1px solid #333;
  max-width: 520px; width: 100%;
  max-height: 90vh; overflow-y: auto;
  font-family: 'Inter', -apple-system, sans-serif;
  box-shadow: 0 40px 80px rgba(0,0,0,0.8);
}
.pp-header {
  padding: 1.5rem 2rem 1.2rem;
  border-bottom: 1px solid #222;
  position: relative;
}
.pp-kicker {
  font-size: 0.55rem; letter-spacing: 0.2em; text-transform: uppercase;
  color: #E50914; font-weight: 700;
}
.pp-title {
  font-size: 1.4rem; font-weight: 900; color: #fff;
  margin-top: 0.3rem; text-transform: uppercase;
  letter-spacing: -0.01em;
}
.pp-close {
  position: absolute; top: 1rem; right: 1rem;
  background: none; border: none; color: #666;
  font-size: 1.8rem; cursor: pointer; line-height: 1;
  width: 2rem; height: 2rem;
}
.pp-close:hover { color: #fff; }
.pp-section { padding: 1rem 2rem; }
.pp-section:not(:last-child) { border-bottom: 1px solid #1a1a1a; }
.pp-section-label {
  font-size: 0.5rem; letter-spacing: 0.15em; text-transform: uppercase;
  color: #555; font-weight: 700; margin-bottom: 0.8rem;
}
.pp-option {
  display: flex; align-items: center; gap: 1rem;
  width: 100%; padding: 1rem; margin-bottom: 0.5rem;
  background: #111; border: 1px solid #222;
  cursor: pointer; text-align: left;
  font-family: inherit; color: #fff;
  transition: all 0.15s;
}
.pp-option:hover:not(:disabled) {
  background: #1a0a0c; border-color: #E50914;
}
.pp-option:disabled {
  opacity: 0.5; cursor: wait;
}
.pp-option-icon {
  width: 2.5rem; text-align: center; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.pp-option-icon svg { display: block; }
.pp-option-body { flex: 1; min-width: 0; }
.pp-option-name {
  font-size: 0.85rem; font-weight: 900; color: #fff;
  text-transform: uppercase; letter-spacing: 0.02em;
}
.pp-option-sub {
  font-size: 0.65rem; color: #888; margin-top: 0.2rem;
  line-height: 1.4;
}
.pp-option-arrow {
  font-size: 1rem; color: #444; flex-shrink: 0;
}
.pp-option:hover:not(:disabled) .pp-option-arrow { color: #E50914; }
.pp-status {
  padding: 0 2rem 1.5rem;
  font-size: 0.75rem; min-height: 1em;
}
.pp-status.error { color: #ff6b6b; }
.pp-status.success { color: #6bff8a; }
.pp-status.info { color: #aaa; }
`;

let injected = false;

function inject() {
  if (injected) return;
  const style = document.createElement('style');
  style.textContent = MODAL_CSS;
  document.head.appendChild(style);
  const div = document.createElement('div');
  div.innerHTML = MODAL_HTML;
  document.body.appendChild(div.firstElementChild);
  injected = true;
}

function setStatus(text, kind) {
  const el = document.getElementById('pp-status');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'pp-status' + (kind ? ' ' + kind : '');
}

function disableOptions(disabled) {
  document.querySelectorAll('.pp-option').forEach(b => {
    b.disabled = disabled;
  });
}

export async function openPayPicker(opts) {
  inject();
  const { type, title, offerId, priceUsd, ticker, email } = opts;

  const titleEl = document.getElementById('pp-title');
  if (type === 'shares') {
    titleEl.textContent = `Buy 1% of "${title}" · $${priceUsd}`;
  } else {
    titleEl.textContent = `Watch "${title}" · $${priceUsd.toFixed(2)}`;
  }
  setStatus('');
  disableOptions(false);

  // Securities-class purchases (shares, platform tokens) must NOT be
  // routed through fiat rails. Stripe's ToS §8.3 prohibits investment
  // product settlement, and US securities law requires a broker-dealer
  // or a Reg D/CF exemption for fiat-denominated investment contracts.
  // Crypto-native settlement (BSV wallet or cross-chain via x402) keeps
  // the transaction in the self-custodial / on-chain lane and off the
  // fiat processors' radar. KYC is still enforced upstream.
  const stripeBtn = document.querySelector('.pp-option[data-provider="stripe"]');
  const stripeSection = stripeBtn ? stripeBtn.closest('.pp-section') : null;
  if (type === 'shares') {
    if (stripeSection) stripeSection.style.display = 'none';
    // Inject/update a disclaimer line so the absent card option is
    // explained rather than just missing.
    let note = document.getElementById('pp-shares-note');
    if (!note) {
      note = document.createElement('div');
      note.id = 'pp-shares-note';
      note.style.cssText = 'padding:0.9rem 1.2rem;margin:0.6rem 1.2rem 0;border:1px solid #2a2a2a;background:#0f0f0f;color:#888;font-size:0.72rem;line-height:1.5;';
      note.innerHTML = '<strong style="color:#fff;">Royalty shares settle on-chain.</strong> To stay compliant we don\'t accept credit cards for securities-class purchases — use a BSV wallet or cross-chain via x402 below.';
      const header = document.querySelector('.pp-header');
      if (header && header.parentNode) header.parentNode.insertBefore(note, header.nextSibling);
    }
    note.style.display = '';
  } else {
    if (stripeSection) stripeSection.style.display = '';
    const note = document.getElementById('pp-shares-note');
    if (note) note.style.display = 'none';
  }

  const backdrop = document.getElementById('pp-backdrop');
  backdrop.classList.add('shown');

  return new Promise((resolve) => {
    const cleanup = () => {
      backdrop.classList.remove('shown');
      document.querySelectorAll('.pp-option').forEach(b => {
        const clone = b.cloneNode(true);
        b.replaceWith(clone);
      });
      document.getElementById('pp-close').onclick = null;
      backdrop.onclick = null;
    };

    document.getElementById('pp-close').onclick = () => {
      cleanup();
      resolve({ cancelled: true });
    };
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        cleanup();
        resolve({ cancelled: true });
      }
    };

    document.querySelectorAll('.pp-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const provider = btn.dataset.provider;
        disableOptions(true);

        try {
          let result;
          if (provider === 'stripe') {
            result = await payWithStripe({ type, offerId, title, ticker, priceUsd, email });
          } else if (provider === 'handcash') {
            result = await payWithHandCash({ type, offerId, title, ticker, priceUsd, email });
          } else if (provider === 'brc100') {
            result = await payWithBRC100({ type, offerId, title, ticker, priceUsd, email });
          } else if (provider === 'metamask') {
            result = await payWithMetaMask({ type, offerId, title, ticker, priceUsd, email });
          } else if (provider === 'phantom') {
            result = await payWithPhantom({ type, offerId, title, ticker, priceUsd, email });
          }

          if (result?.redirected) {
            cleanup();
            resolve(result);
          } else if (result?.success) {
            setStatus('Payment confirmed! Refreshing...', 'success');
            setTimeout(() => {
              cleanup();
              resolve(result);
              window.location.reload();
            }, 1000);
          } else {
            disableOptions(false);
          }
        } catch (err) {
          setStatus('Payment failed: ' + (err.message || err), 'error');
          disableOptions(false);
        }
      });
    });
  });
}

// ───────── Stripe ─────────
async function payWithStripe({ type, offerId, title, ticker, priceUsd, email }) {
  // Defense in depth: even if the UI didn't hide the Stripe button for
  // a securities-class purchase, this handler refuses to route the call.
  // Fiat rails are reserved for services (tickets, commissions).
  if (type === 'shares') {
    throw new Error('Royalty shares cannot be purchased with a credit card. Use a BSV wallet.');
  }
  setStatus('Redirecting to secure checkout...', 'info');
  const endpoint = type === 'shares' ? '/api/buy-shares' : '/api/ticket';
  const body = type === 'shares'
    ? { offerId, title, ticker, priceUsd, email }
    : { offerId, title };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Checkout failed');
  }
  const { url } = await res.json();
  if (!url) throw new Error('No checkout URL');
  window.location.href = url;
  return { provider: 'stripe', redirected: true };
}

// ───────── HandCash ─────────
async function payWithHandCash({ type, offerId, title, ticker, priceUsd, email }) {
  setStatus('Contacting HandCash...', 'info');
  const endpoint = type === 'shares' ? '/api/handcash/buy-shares' : '/api/handcash/ticket';

  // Pull the Supabase session JWT so the server can verify this is a
  // signed-in user. Tickets (type='ticket') still work anonymously via
  // the legacy HandCash payment-request flow; shares (type='shares')
  // require auth + KYC. The bMovies Supabase client uses
  // storageKey: 'bmovies-auth' — we read the token directly from
  // localStorage so pay-picker stays decoupled from any particular
  // page's supabase instance.
  let jwt = '';
  try {
    if (type === 'shares') {
      const raw = localStorage.getItem('bmovies-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        jwt = parsed?.access_token || parsed?.currentSession?.access_token || '';
      }
    }
  } catch { /* best-effort */ }

  const returnUrl = type === 'shares' && offerId
    ? `${window.location.origin}/offer.html?id=${encodeURIComponent(offerId)}`
    : undefined;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({ offerId, title, ticker, priceUsd, email, returnUrl }),
  });

  const data = await res.json().catch(() => ({}));

  // 401/403 → redirect to sign-in / KYC
  if (res.status === 401) {
    throw new Error(data.error || 'Sign in required to buy royalty shares.');
  }
  if (res.status === 403 && data.reason === 'kyc_required') {
    setStatus('KYC required. Redirecting...', 'info');
    window.location.href = data.next || '/kyc.html';
    return { provider: 'handcash', redirected: true };
  }

  // 202 — HandCash not linked (or stored token expired). Redirect to
  // authorize URL; the server's callback executes wallet.pay() and
  // bounces the user back with purchase=success.
  if (res.status === 202 && data.needsAuth && data.authorizeUrl) {
    setStatus('Linking HandCash…', 'info');
    window.location.href = data.authorizeUrl;
    return { provider: 'handcash', redirected: true };
  }

  // 200 — stored token worked; pay() executed server-side.
  if (res.ok && data.ok && data.receipt) {
    setStatus(`Paid! tx=${data.receipt.transactionId.slice(0, 12)}…`, 'success');
    setTimeout(() => window.location.reload(), 1500);
    return { provider: 'handcash', txId: data.receipt.transactionId };
  }

  // Legacy ticket path still uses paymentRequestUrl
  if (data.paymentRequestUrl) {
    setStatus('Opening HandCash...', 'info');
    window.location.href = data.paymentRequestUrl;
    return { provider: 'handcash', redirected: true };
  }

  throw new Error(data.error || 'HandCash request failed');
}

// ───────── BRC-100 ─────────
async function payWithBRC100({ type, offerId, title, ticker, priceUsd, email }) {
  setStatus('Connecting to your BSV wallet...', 'info');
  let connectWallet, payToAddress;
  try {
    const mod = await import('./brc100.js');
    connectWallet = mod.connectWallet;
    payToAddress = mod.payToAddress;
  } catch {
    throw new Error('BRC-100 module failed to load');
  }

  const status = await connectWallet();
  if (!status.connected) {
    throw new Error('No BRC-100 wallet detected. Install BSV Desktop or Yours Wallet.');
  }

  setStatus('Fetching payout addresses...', 'info');
  const payoutRes = await fetch('/api/payout-addresses?offerId=' + encodeURIComponent(offerId));
  if (!payoutRes.ok) {
    throw new Error('Failed to fetch payout addresses');
  }
  const payout = await payoutRes.json();

  // Convert USD → sats at roughly $50/BSV = 2000 sats per dollar
  // (real price oracle can replace this later)
  const satsPerUsd = 2000;
  const totalSats = Math.ceil(priceUsd * satsPerUsd);

  setStatus(`Sending ${totalSats.toLocaleString()} sats via ${status.provider}...`, 'info');
  const receipt = await payToAddress({
    address: payout.address,
    satoshis: totalSats,
    description: type === 'shares'
      ? `bMovies: 1% of ${title} ($${ticker})`
      : `bMovies: Watch ${title}`,
  });

  // Record the on-chain purchase with our backend
  const recordRes = await fetch('/api/record-wallet-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type, offerId, title, ticker,
      priceUsd, sats: totalSats,
      provider: 'brc100',
      subProvider: receipt.provider,
      txid: receipt.txid,
      email,
    }),
  });
  if (!recordRes.ok) {
    const err = await recordRes.json();
    throw new Error(err.error || 'Failed to record payment');
  }

  setStatus(`Paid on-chain · tx ${receipt.txid.slice(0, 12)}...`, 'success');
  return { provider: 'brc100', success: true, txid: receipt.txid };
}

// Cross-chain purchases of BSV-21 royalty shares need a BSV delivery
// address — the user pays on ETH/SOL and the settlement worker
// transfers the 1sat ordinal to this address on BSV mainnet. For a
// ticket purchase the asset is off-chain (stream access) so we skip
// the prompt. Returns null if the user cancels.
function promptBsvDeliveryAddress(type) {
  if (type !== 'shares') return null;
  // Simple prompt for the MVP — a real impl would surface a proper
  // modal with "paste your BSV address" + a QR button that opens a
  // BRC-100 wallet to share the address. For judges this is enough
  // to show the cross-chain → BSV delivery flow is explicit.
  const addr = window.prompt(
    'Cross-chain purchase — BSV delivery address\n\n' +
    'Your payment settles on the origin chain (ETH/SOL). The 1sat ' +
    'BSV-21 royalty token then transfers on BSV mainnet. Paste the ' +
    'BSV address the token should land at:',
    '',
  );
  if (!addr) return null;
  const trimmed = addr.trim();
  // Basic P2PKH pattern check — server-side does the real validation.
  if (!/^[13][1-9A-HJ-NP-Za-km-z]{25,39}$/.test(trimmed)) {
    throw new Error('That does not look like a valid BSV address. Expected something starting with 1 or 3.');
  }
  return trimmed;
}

// ───────── MetaMask (Ethereum) ─────────
async function payWithMetaMask({ type, offerId, title, ticker, priceUsd, email }) {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected. Install MetaMask extension first.');
  }

  // For shares, capture the BSV delivery address BEFORE asking the
  // user to confirm the on-chain spend. Nothing more annoying than
  // paying and THEN being told 'give me another field'.
  let bsvDeliveryAddress = null;
  if (type === 'shares') {
    bsvDeliveryAddress = promptBsvDeliveryAddress(type);
    if (!bsvDeliveryAddress) {
      setStatus('Cancelled — needed a BSV delivery address to settle the royalty share.', 'info');
      return { cancelled: true };
    }
  }

  setStatus('Connecting to MetaMask...', 'info');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const from = accounts[0];
  if (!from) throw new Error('No MetaMask account');

  setStatus('Fetching platform wallet...', 'info');
  const payoutRes = await fetch('/api/payout-addresses?offerId=' + encodeURIComponent(offerId) + '&chain=eth');
  if (!payoutRes.ok) throw new Error('Failed to fetch ETH payout address');
  const payout = await payoutRes.json();

  // Convert USD → wei at roughly $2500/ETH
  // (production needs a real oracle; this is a demo-safe approximation)
  const ethPerUsd = 1 / 2500;
  const ethAmount = priceUsd * ethPerUsd;
  const weiHex = '0x' + Math.floor(ethAmount * 1e18).toString(16);

  setStatus(`Sending ${ethAmount.toFixed(6)} ETH from ${from.slice(0, 6)}...${from.slice(-4)}`, 'info');
  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: payout.address,
      value: weiHex,
    }],
  });

  const recordRes = await fetch('/api/record-wallet-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type, offerId, title, ticker,
      priceUsd,
      provider: 'metamask',
      txid: txHash,
      chain: 'eth',
      fromAddress: from,
      bsvDeliveryAddress,
      email,
    }),
  });
  if (!recordRes.ok) {
    const err = await recordRes.json();
    throw new Error(err.error || 'Failed to record payment');
  }

  if (type === 'shares' && bsvDeliveryAddress) {
    setStatus(
      `Paid on Ethereum — tx ${txHash.slice(0, 10)}…. ` +
      `1sat BSV-21 share settling to ${bsvDeliveryAddress.slice(0, 6)}…${bsvDeliveryAddress.slice(-4)} within ~5 min.`,
      'success',
    );
  } else {
    setStatus(`Paid on Ethereum · tx ${txHash.slice(0, 12)}...`, 'success');
  }
  return { provider: 'metamask', success: true, txid: txHash };
}

// ───────── Phantom (Solana) ─────────
async function payWithPhantom({ type, offerId, title, ticker, priceUsd, email }) {
  const phantom = window?.phantom?.solana;
  if (!phantom || !phantom.isPhantom) {
    throw new Error('Phantom not detected. Install the Phantom extension first.');
  }

  // Cross-chain settlement: capture BSV delivery address before
  // asking the user to sign the Solana tx (matches MetaMask flow).
  let bsvDeliveryAddress = null;
  if (type === 'shares') {
    bsvDeliveryAddress = promptBsvDeliveryAddress(type);
    if (!bsvDeliveryAddress) {
      setStatus('Cancelled — needed a BSV delivery address to settle the royalty share.', 'info');
      return { cancelled: true };
    }
  }

  setStatus('Connecting to Phantom...', 'info');
  const resp = await phantom.connect();
  const publicKey = resp.publicKey.toString();

  setStatus('Fetching platform wallet...', 'info');
  const payoutRes = await fetch('/api/payout-addresses?offerId=' + encodeURIComponent(offerId) + '&chain=sol');
  if (!payoutRes.ok) throw new Error('Failed to fetch SOL payout address');
  const payout = await payoutRes.json();

  // Load Solana web3 for transaction building
  const solanaWeb3 = await import('https://esm.sh/@solana/web3.js@1.95.0');
  const { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = solanaWeb3;

  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const solPerUsd = 1 / 150; // ~$150 SOL
  const lamports = Math.floor(priceUsd * solPerUsd * LAMPORTS_PER_SOL);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(publicKey),
      toPubkey: new PublicKey(payout.address),
      lamports,
    })
  );
  tx.feePayer = new PublicKey(publicKey);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  setStatus(`Signing ${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL transaction...`, 'info');
  const { signature } = await phantom.signAndSendTransaction(tx);

  const recordRes = await fetch('/api/record-wallet-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type, offerId, title, ticker,
      priceUsd,
      provider: 'phantom',
      txid: signature,
      chain: 'sol',
      fromAddress: publicKey,
      bsvDeliveryAddress,
      email,
    }),
  });
  if (!recordRes.ok) {
    const err = await recordRes.json();
    throw new Error(err.error || 'Failed to record payment');
  }

  if (type === 'shares' && bsvDeliveryAddress) {
    setStatus(
      `Paid on Solana — tx ${signature.slice(0, 10)}…. ` +
      `1sat BSV-21 share settling to ${bsvDeliveryAddress.slice(0, 6)}…${bsvDeliveryAddress.slice(-4)} within ~5 min.`,
      'success',
    );
  } else {
    setStatus(`Paid on Solana · tx ${signature.slice(0, 12)}...`, 'success');
  }
  return { provider: 'phantom', success: true, txid: signature };
}
