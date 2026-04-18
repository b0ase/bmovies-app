// ─── Skin cookie guard ───
//
// If the user has the bOOvies skin engaged (cookie set by middleware
// when they enter via /boovies/*), defer to boovies-nav.js — the
// pink-themed twin of this file — and bail out so we don't render
// both navbars on top of each other.
(function () {
  if (typeof document === 'undefined') return;
  const match = document.cookie.match(/(?:^|;\s*)skin=([^;]+)/);
  if (match && decodeURIComponent(match[1]) === 'boovies') {
    // Only swap if boovies-nav.js isn't already present.
    if (!document.querySelector('script[src*="boovies-nav.js"]')) {
      const s = document.createElement('script');
      s.src = '/js/boovies-nav.js';
      s.defer = true;
      document.head.appendChild(s);
    }
    // Throw to abort the rest of this file — top-level await isn't
    // available in a classic script, so we rely on the catch-less
    // throw bubbling up and halting execution.
    throw new Error('[nav] skin=boovies — handing off to boovies-nav.js');
  }
})();

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

const LOGO_HTML = '<a href="/" class="logo">b<span>Movies</span></a>';

// Five items, the full film lifecycle from pitch to release:
//
//   Pitch    → pay to have a film made ($0.99+). Primary market.
//   Produce  → the live production floor — films being made right now.
//   Raise    → cap table / investors — bring in capital against royalty shares.
//   Market   → film promotion and distribution (Phase 2 explainer today).
//   Release  → publish to the audience (workbench + Publish tool explainer).
//
// This IS the lifecycle of a film, left to right. Every label is a verb
// the user can perform or a stage the user can observe. The narrative
// logic — "pitch your idea, watch it produced, raise capital, market it,
// release to the audience" — is the site's whole thesis, so it belongs
// in the nav itself, not buried in About or a landing-page diagram.
//
// About and Judge moved to FOOTER_LINKS below so the primary nav is a
// clean five-item journey. About is secondary (most visitors don't click
// it — they land directly on a hero that explains the product); Judge
// is a scoped shortcut for BSVA reviewers that doesn't need top-billing
// for regular users.
//
// /market.html and /release.html are static explainer pages, both new:
//   - market.html documents the post-submission Phase 2 roadmap for
//     film promotion — spend from the cap table, vertical cuts, festival
//     submissions, publicist agent — because the marketing stage isn't
//     shippable before the BSVA review window closes.
//   - release.html documents the existing workbench + Publish tool flow
//     on /account, so a visitor can understand how a film goes from
//     "mid-production" to "audience-visible on /watch".
// Both are documentation pages, not new product functionality.
//
// All hrefs are ROOT-relative so this nav works everywhere including
// nested pages like /legal/*.html.
const NAV_LINKS = [
  // About promoted back to the primary nav (left of Pitch) on 2026-04-18 —
  // the five-verb lifecycle row alone left new visitors without a
  // "how does this work?" entry point, and the footer was doing too
  // much of that work.
  { href: '/about.html',       label: 'About' },
  { href: '/commission.html',  label: 'Pitch' },
  { href: '/exchange.html',    label: 'Raise' },
  { href: '/productions.html', label: 'Produce' },
  { href: '/market.html',      label: 'Market' },
  { href: '/release.html',     label: 'Release' },
  // Judge → footer. See FOOTER_LINKS below.
  // "My studio" used to live here as an external link to app.bmovies.online
  // but it went to exactly the same place as the Sign In CTA to its right,
  // so it was pulled to avoid two adjacent links pointing at the same URL.
  // The Sign In button is now the single entry point to the authenticated app.
];

// Secondary nav — rendered in the footer as a compact link row. These
// are pages that don't belong in the primary lifecycle:
//   - About is meta (how the site works)
//   - Watch, Studios, Agents, Leaderboard are directory/catalog deep-links
//   - Treasury, Invest, x402 are protocol/financial disclosure pages
//   - Judges + BSVA submission are scoped shortcuts for one audience
// Keeping them in the footer rather than the nav lets the primary nav
// stay a clean five-verb film-lifecycle journey.
const FOOTER_LINKS = [
  // About moved to the primary nav 2026-04-18; no longer duplicated here.
  { href: '/watch.html',           label: 'Watch catalog' },
  { href: '/studios.html',         label: 'Studios' },
  { href: '/agents.html',          label: 'Agents' },
  { href: '/jobboard.html',        label: 'Job board' },
  { href: '/leaderboard.html',     label: 'Leaderboard' },
  { href: '/treasury.html',        label: 'Treasury' },
  { href: '/invest.html',          label: 'Invest in $bMovies' },
  { href: '/x402.html',            label: 'x402 protocol' },
  { href: '/judges.html',          label: 'For BSVA judges' },
  { href: '/bsva-submission.html', label: 'BSVA submission' },
];

// Pages that should map to a specific active nav link (beyond the
// direct href match). E.g. /film.html should highlight "Watch".
// Marketplace is a soft-redirect to Watch — highlight Watch when
// the user lands on the old URL. Leaderboard lives under Studios.
// Map deep-link pages to the nav item they should highlight. Pages that
// live outside the consumer nav (agents, studios, jobboard, x402, etc.)
// intentionally have NO active nav item so nothing misleads.
const ACTIVE_ALIASES = {
  // Produce: live production floor. Deep-link views of specific films
  // or individual productions all highlight Produce.
  'film.html':             'productions.html',
  'marketplace.html':      'productions.html',
  'production.html':       'productions.html',
  'production-room.html':  'productions.html',
  'deck.html':             'productions.html',
  // Release: the watch catalog is the public face of released films,
  // so /watch.html highlights Release (the nav item is the explainer
  // page but the catalog itself is part of the Release stage).
  'watch.html':            'release.html',
  // Raise: the cap-table / equity pages all highlight Raise.
  'offer.html':            'exchange.html',
  'trade.html':            'exchange.html',
  // Pitch: the legacy pitch.html still aliases to Pitch (commission.html).
  'pitch.html':            'commission.html',
  // Pages that live in the footer (About, Studios, Agents, Jobboard,
  // x402, Treasury, Invest, Judges, BSVA submission, Leaderboard) are
  // intentionally unaliased — the primary nav has no item to highlight
  // when you're on a footer page, which is honest about where you are.
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
    // href is root-relative ("/about.html"); compare on the filename
    // portion only so the active-class match still works.
    const hrefPage = l.href.replace(/^\//, '');
    const isActive = !l.external && hrefPage === activeTarget;
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
  // $bMovies token icon — far right, after socials. Links to /invest.html
  // which has the platform token page. Uses a simple coin SVG with the
  // bMovies red fill so it stands out from the monochrome social icons.
  const tokenIcon = `
      <a class="nav-social nav-token" href="/invest.html" aria-label="$bMovies token" style="color:#E50914;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="12" y="16.5" text-anchor="middle" font-family="'Bebas Neue',sans-serif" font-size="13" font-weight="700" fill="currentColor">b</text></svg>
      </a>`;
  return `
    ${LOGO_HTML}
    ${HAMBURGER_HTML}
    <nav id="site-nav">
      ${linkTags}
      <a href="/account" class="signin-cta">Sign In</a>${socialTags}${tokenIcon}
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
  // Always inject the full nav — this ensures social icons, hamburger,
  // and invest token icon are present even on Next.js pages that pre-
  // render a basic nav in LayoutShell.tsx (which prevents the empty-
  // header flash but lacks the social/hamburger/invest elements).
  header.innerHTML = buildNavHtml();
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
 * Secondary page links row — About, directory pages, disclosure pages,
 * and the BSVA judge shortcut. This replaces the old solo "For BSVA
 * judges →" link and absorbs it into a broader footer index. Every page
 * that used to hide in a nav corner (Studios, Agents, Jobboard, x402,
 * Treasury, Invest, etc.) is now discoverable from the footer of any
 * page, while the primary nav stays a clean five-verb lifecycle.
 *
 * Suppressed on /legal/ pages because the legal footer is its own
 * self-contained thing and this row would be noise there.
 */
function mountFooterLinks() {
  const footer = document.querySelector('footer.site-footer .footer-inner');
  if (!footer) return;
  if (footer.querySelector('.footer-pages')) return;
  if (/\/legal\//.test(window.location.pathname)) return;
  const row = document.createElement('div');
  row.className = 'footer-pages';
  row.style.cssText = 'display:flex;gap:0.8rem;flex-wrap:wrap;justify-content:center;margin-top:1.2rem;font-size:0.72rem;line-height:1.8;';
  // Don't render the link for the page the user is already on — self-links
  // in a footer are footer clutter, and the visitor already knows they're here.
  const here = window.location.pathname.replace(/^\//, '').toLowerCase();
  row.innerHTML = FOOTER_LINKS
    .filter(l => l.href.replace(/^\//, '').toLowerCase() !== here)
    .map(l => `<a href="${l.href}" style="color:#888;text-decoration:none;">${l.label}</a>`)
    .join('<span style="color:#333;">·</span>');
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
  // + colour when a valid session exists, and show/hide Sign Out.
  const link = document.querySelector('.site-header nav a.signin-cta');
  if (!link) return;
  const nav = link.parentElement;
  let signOutBtn = nav?.querySelector('.signout-btn');

  // Clean up any stale elements from previous nav versions
  const oldDropdown = nav?.querySelector('.account-dropdown');
  if (oldDropdown) oldDropdown.remove();
  const oldBtn = nav?.querySelector('.signout-btn');
  if (oldBtn) oldBtn.remove();
  link.style.position = '';

  if (isSessionValid()) {
    link.textContent = 'Account';
    link.href = '/account';
    link.classList.add('signed-in');
  } else {
    link.textContent = 'Sign In';
    link.href = '/login';
    link.classList.remove('signed-in');
  }
}

// Mount the nav first, then the footer social + legal rows, then
// run the session flip on the nav's sign-in CTA.
mountNav();
mountSocialRow();
mountLegalRow();
mountFooterLinks();
updateNav();

// Load the floating bMovies agent chat widget on every page.
// The widget script is self-contained (IIFE, zero deps) and renders
// a red "bM" button bottom-right that expands to a chat panel.
(function loadAgentChat() {
  if (document.querySelector('script[src*="agent-chat"]')) return;
  const s = document.createElement('script');
  s.src = '/js/agent-chat.js';
  s.defer = true;
  document.body.appendChild(s);
})();

// Expose for in-page updates after the session flip runs
window.updateBmoviesNav = updateNav;

// Re-check on cross-tab localStorage changes (sign-in in another tab)
window.addEventListener('storage', (e) => {
  if (e.key === 'bmovies-auth') updateNav();
});

// Re-check on an in-page custom event fired after sign-in / sign-out.
window.addEventListener('bmovies:auth-changed', updateNav);

// On Next.js pages the Supabase client may write the session to
// localStorage AFTER this script runs. Multiple deferred checks
// catch late-arriving sessions (Google OAuth can take 1-2s to
// write the session after redirect).
setTimeout(updateNav, 500);
setTimeout(updateNav, 1500);
setTimeout(updateNav, 3000);
