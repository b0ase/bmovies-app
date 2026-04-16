/**
 * Shared site-header + session-aware Sign In button.
 *
 * Two jobs:
 *
 *   1. Inject the canonical navbar markup into <header class="site-header">
 *      if the header is empty or if it still has the legacy hardcoded
 *      copy. This way every page can ship with just
 *          <header class="site-header"></header>
 *      and this file is the single source of truth for nav links +
 *      logo + signin CTA.
 *
 *   2. Flip the Sign In CTA to "Account" when the user is signed in.
 *      Reads the Supabase session directly from localStorage rather
 *      than creating a new Supabase client, which would fight the
 *      canonical client in js/auth.js for the same storageKey lock.
 *
 * To add a nav link: edit the NAV_LINKS array below. That's the whole
 * change — all pages pick it up on next load.
 */

// ─── 1. Canonical nav structure ───

const LOGO_HTML = '<a href="index.html" class="logo">b<span>Movies</span></a>';

// Alphabetical left→right with About on the far left, evenly spread.
// The page journey is carried by the logo → hero copy; the nav is just
// a flat directory so visitors can teleport anywhere.
//
// Protocol (x402) and Jobs (jobboard) are in the main nav because they
// ARE the platform — the micropayment protocol and the agent-to-agent
// job market are the defining features, not technical easter eggs.
// Earlier versions had them as hidden "judges + developers" pages but
// they deserve to be first-class.
const NAV_LINKS = [
  { href: 'about.html',       label: 'About' },
  { href: 'commission.html',  label: 'Commission' },
  { href: 'exchange.html',    label: 'Exchange' },
  // jobboard.html — surfaced on /judges.html tour, not in consumer nav.
  // { href: 'jobboard.html',    label: 'Jobs' },
  // { href: 'invest.html',   label: 'Invest' },  // $bMovies — temporarily
  //   removed from nav until the platform-token mechanics (on-chain
  //   mint, tranche schedule, legal disclosures, non-custodial payout
  //   rail) are ready to ship. Page still exists at /invest.html for
  //   direct-link access; add back to NAV_LINKS when ready.
  { href: 'productions.html', label: 'Live' },          // renamed from "Productions"
  // x402.html — surfaced on /judges.html tour, not in consumer nav.
  // { href: 'x402.html',        label: 'Protocol' },
  { href: 'studios.html',     label: 'Studios' },
  { href: 'watch.html',       label: 'Watch' },
  { href: 'judges.html',      label: 'Judges' },
  // "My studio" used to live here as an external link to app.bmovies.online
  // but it went to exactly the same place as the Sign In CTA to its right,
  // so it was pulled to avoid two adjacent links pointing at the same URL.
  // The Sign In button is now the single entry point to the authenticated app.
];

// Pages that should map to a specific active nav link (beyond the
// direct href match). E.g. /film.html should highlight "Watch".
// Marketplace is a soft-redirect to Watch — highlight Watch when
// the user lands on the old URL. Leaderboard lives under Studios.
const ACTIVE_ALIASES = {
  'film.html':        'watch.html',
  'marketplace.html': 'watch.html',
  'offer.html':       'exchange.html',
  'pitch.html':       'commission.html',
  'trade.html':       'exchange.html',
  'studio.html':      'studios.html',
  'agents.html':      'studios.html',
  // jobboard.html now has its own top-level Jobs link — no alias needed.
  'leaderboard.html': 'studios.html',
  'production.html':  'productions.html',
  'deck.html':        'productions.html',
};

function currentPageFile() {
  const path = window.location.pathname;
  // /foo/bar.html → bar.html, / → index.html
  const parts = path.split('/');
  const last = parts[parts.length - 1] || 'index.html';
  return last || 'index.html';
}

// Hamburger button sits between the logo and <nav>. CSS hides it on
// desktop and reveals it below 860px. The two SVG icons share a button;
// CSS swaps which one is visible based on the `.nav-open` state class
// on the parent header.
const HAMBURGER_HTML = `
    <button type="button" class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="site-nav">
      <svg class="icon-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
      <svg class="icon-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
    </button>`;

function buildNavHtml() {
  const page = currentPageFile();
  const activeTarget = ACTIVE_ALIASES[page] || page;
  const linkTags = NAV_LINKS.map(l => {
    const isActive = !l.external && l.href === activeTarget;
    // External links (e.g. /app.bmovies.online/account) get a small
    // ↗ arrow suffix so users know they're leaving the public site.
    const label = l.external ? `${l.label} ↗` : l.label;
    const target = l.external ? ' target="_blank" rel="noopener"' : '';
    return `<a ${isActive ? 'class="active" ' : ''}href="${l.href}"${target}>${label}</a>`;
  }).join('\n      ');
  const socialTags = SOCIAL_LINKS.map(s => `
      <a class="nav-social" href="${s.href}" target="_blank" rel="noopener noreferrer" aria-label="${s.label}">${s.svg}</a>`).join('');
  // Sign In routes to the /account Next.js route on the same origin.
  // Since brochure + app live on one domain now, the session is visible
  // here and updateNav() below flips the CTA to "Account" once signed in.
  return `
    ${LOGO_HTML}
    ${HAMBURGER_HTML}
    <nav id="site-nav">
      ${linkTags}
      <a href="/account" class="signin-cta">Sign In</a>${socialTags}
    </nav>
  `;
}

function wireHamburger(header) {
  const toggle = header.querySelector('.nav-toggle');
  if (!toggle || toggle.dataset.wired) return;
  toggle.dataset.wired = '1';
  toggle.addEventListener('click', () => {
    const isOpen = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  // Tapping a nav link on mobile collapses the panel again.
  header.querySelectorAll('nav a').forEach(a => {
    a.addEventListener('click', () => {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
  // Escape closes the panel.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('nav-open')) {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function mountNav() {
  const header = document.querySelector('header.site-header');
  if (!header) return;
  // Only inject if the header is empty (or only contains whitespace).
  // This way pages that still have the legacy hardcoded markup aren't
  // double-rendered. Once every page is migrated to the empty stub,
  // this check becomes a no-op.
  const hasContent = header.querySelector('a.logo') && header.querySelector('nav a.signin-cta');
  if (!hasContent) {
    header.innerHTML = buildNavHtml();
  }
  wireHamburger(header);
}

// ─── Social row (footer) ───
//
// Injected into every page that has a <footer class="site-footer">.
// Single source of truth for all social links — to add a new one,
// append to SOCIAL_LINKS below and it appears everywhere on next load.
const SOCIAL_LINKS = [
  {
    href: 'https://x.com/bMovies_Online',
    label: 'bMovies on X',
    // Official X glyph
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  },
  {
    href: 'https://www.instagram.com/bmovies.online/',
    label: 'bMovies on Instagram',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608C4.516 2.567 5.783 2.295 7.15 2.233 8.416 2.175 8.796 2.163 12 2.163zm0 1.802c-3.141 0-3.495.011-4.72.067-1.003.046-1.55.214-1.913.357-.48.187-.823.41-1.183.77-.36.36-.583.703-.77 1.183-.143.363-.311.91-.357 1.913-.056 1.225-.067 1.579-.067 4.72s.011 3.495.067 4.72c.046 1.003.214 1.55.357 1.913.187.48.41.823.77 1.183.36.36.703.583 1.183.77.363.143.91.311 1.913.357 1.225.056 1.579.067 4.72.067s3.495-.011 4.72-.067c1.003-.046 1.55-.214 1.913-.357.48-.187.823-.41 1.183-.77.36-.36.583-.703.77-1.183.143-.363.311-.91.357-1.913.056-1.225.067-1.579.067-4.72s-.011-3.495-.067-4.72c-.046-1.003-.214-1.55-.357-1.913-.187-.48-.41-.823-.77-1.183-.36-.36-.703-.583-1.183-.77-.363-.143-.91-.311-1.913-.357-1.225-.056-1.579-.067-4.72-.067zM12 6.865a5.135 5.135 0 1 0 0 10.27 5.135 5.135 0 0 0 0-10.27zm0 8.468a3.333 3.333 0 1 1 0-6.666 3.333 3.333 0 0 1 0 6.666zm5.338-8.669a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>',
  },
  {
    href: 'https://www.youtube.com/@bMovies--Youtube',
    label: 'bMovies on YouTube',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  },
  {
    href: 'https://www.tiktok.com/@onlinebmovies',
    label: 'bMovies on TikTok',
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/></svg>',
  },
];

function mountSocialRow() {
  const footer = document.querySelector('footer.site-footer .footer-inner');
  if (!footer) return;
  // Skip if already mounted (hot-reload / double-call protection)
  if (footer.querySelector('.footer-social')) return;
  const row = document.createElement('div');
  row.className = 'footer-social';
  row.innerHTML = SOCIAL_LINKS.map(s => `
    <a href="${s.href}" target="_blank" rel="noopener noreferrer" aria-label="${s.label}">
      ${s.svg}
    </a>
  `).join('');
  // Insert before the copyright line
  const copy = footer.querySelector('.footer-copy');
  if (copy) {
    footer.insertBefore(row, copy);
  } else {
    footer.appendChild(row);
  }
}

// ─── Legal row (footer) ───
//
// Every consumer page needs discoverable links to the legal
// documents — prospectus, risk disclosure, non-custodial disclosure,
// privacy, terms. Injected the same way as social icons so a single
// source of truth (here) drives every footer.
//
// Path-aware: pages at the site root use relative paths like
// "legal/*.html", but /legal/*.html itself is one level deep and
// needs "platform-token-prospectus.html" (no prefix). The inject
// function below picks the right prefix based on window.location.
const LEGAL_LINKS = [
  { href: 'platform-token-prospectus.html',  label: '$bMovies prospectus' },
  { href: 'film-token-risk-disclosure.html', label: 'Film token risk' },
  { href: 'non-custodial-disclosure.html',   label: 'Non-custodial' },
  { href: 'runar-covenant-design.html',      label: 'Runar design' },
];

function mountLegalRow() {
  const footer = document.querySelector('footer.site-footer .footer-inner');
  if (!footer) return;
  if (footer.querySelector('.footer-legal')) return;
  // Detect if we're already inside /legal/ so the prefix is bare,
  // otherwise prepend 'legal/'.
  const insideLegal = /\/legal\//.test(window.location.pathname);
  const prefix = insideLegal ? '' : 'legal/';
  const row = document.createElement('div');
  row.className = 'footer-legal';
  row.style.cssText = 'display:flex;gap:0.8rem;flex-wrap:wrap;justify-content:center;margin-top:0.8rem;font-size:0.7rem;';
  row.innerHTML = LEGAL_LINKS.map(l => `
    <a href="${prefix}${l.href}" style="color:#555;text-decoration:none;">${l.label}</a>
  `).join('<span style="color:#333;">·</span>');
  // Append at the end of the footer inner (after social row + copy)
  footer.appendChild(row);
}

/**
 * Discreet "For BSVA judges →" link mounted under the legal row.
 * Not in any primary nav — this page is linked from the BSVA
 * submission form as the "start here" URL for reviewers. Regular
 * visitors won't notice it; judges who land here from the submission
 * packet can still find it from the footer of any page.
 */
function mountJudgesLink() {
  const footer = document.querySelector('footer.site-footer .footer-inner');
  if (!footer) return;
  if (footer.querySelector('.footer-judges')) return;
  // Don't render on /judges.html itself — the page already has its
  // own header + BSVA coupon CTA, the extra link would be noise.
  if (/\/judges\.html$/.test(window.location.pathname)) return;
  // Also hide when we're on a legal page — the legal footer is its
  // own thing and this link doesn't belong there.
  if (/\/legal\//.test(window.location.pathname)) return;
  const insideLegal = /\/legal\//.test(window.location.pathname);
  const prefix = insideLegal ? '../' : '';
  const row = document.createElement('div');
  row.className = 'footer-judges';
  row.style.cssText = 'text-align:center;margin-top:1rem;font-size:0.7rem;';
  row.innerHTML = `
    <a href="${prefix}judges.html" style="color:#666;text-decoration:none;">
      For BSVA judges <span style="color:#E50914;">→</span>
    </a>
  `;
  footer.appendChild(row);
}

// ─── 2. Session state flip ───

function isSessionValid() {
  try {
    const raw = localStorage.getItem('bmovies-auth');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const expiresAt = parsed?.expires_at || parsed?.currentSession?.expires_at;
    if (!expiresAt) return false;
    return Date.now() / 1000 < Number(expiresAt);
  } catch {
    return false;
  }
}

function updateNav() {
  // Brochure and app are now on one origin, so the session blob at
  // localStorage['bmovies-auth'] is visible here. Flip the CTA text
  // + colour when a valid session exists.
  const link = document.querySelector('.site-header nav a.signin-cta');
  if (!link) return;
  if (isSessionValid()) {
    link.textContent = 'Account';
    link.classList.add('signed-in');
  } else {
    link.textContent = 'Sign In';
    link.classList.remove('signed-in');
  }
}

// Mount the nav first, then the footer social + legal rows, then
// run the session flip on the nav's sign-in CTA.
mountNav();
mountSocialRow();
mountLegalRow();
mountJudgesLink();
updateNav();

// Expose for in-page updates after the session flip runs
window.updateBmoviesNav = updateNav;

// Re-check on cross-tab localStorage changes (sign-in in another tab)
window.addEventListener('storage', (e) => {
  if (e.key === 'bmovies-auth') updateNav();
});

// Re-check on an in-page custom event fired after sign-in / sign-out.
window.addEventListener('bmovies:auth-changed', updateNav);
