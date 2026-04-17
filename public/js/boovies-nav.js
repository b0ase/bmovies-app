/**
 * bOOvies shared navbar — structural twin of bMovies site-header.
 *
 * The only material differences from bMovies are:
 *   • Brand:        b<span>OO</span>vies   (pink OO, not red "Movies")
 *   • Accent color: #FF69B4 pink (not #E50914 red)
 *
 * Same link set, same hamburger, same social icons, same Sign In CTA,
 * same token coin — this is the drive-in "re-skin" of the main site.
 *
 * Pages that want this nav just need:
 *     <header class="site-header"></header>
 * near the top of <body> (or let this script prepend one if missing).
 * CSS for .site-header lives in css/theme.css; this file injects a
 * small <style> block at the end to repaint the red accents pink
 * without touching theme.css itself.
 */

(function () {

  // ─── 1. Brand + link model ───

  const LOGO_HTML =
    '<a href="boovies.html" class="logo">b<span>OO</span>vies</a>';

  // Mirror of NAV_LINKS in nav-session.js, but with two bOOvies
  // additions at the start so visitors can browse the film catalog
  // without needing to type "boovies.html" by hand.
  const NAV_LINKS = [
    { href: 'boovies.html',      label: 'Drive-In' },
    { href: 'about.html',        label: 'About' },
    { href: 'commission.html',   label: 'Commission' },
    { href: 'exchange.html',     label: 'Exchange' },
    { href: 'productions.html',  label: 'Live' },
    { href: 'studios.html',      label: 'Studios' },
    { href: 'watch.html',        label: 'Watch' },
    { href: 'judges.html',       label: 'Judges' },
  ];

  const ACTIVE_ALIASES = {
    'boovies-star.html':       'boovies.html',
    'boovies-boobfather.html': 'boovies.html',
    'boovies-jurassic.html':   'boovies.html',
    'boovies-raiders.html':    'boovies.html',
    'boovies-pulp.html':       'boovies.html',
    'boovies-booning.html':    'boovies.html',
    'boovies-star-preview.html':       'boovies.html',
    'boovies-boobfather-preview.html': 'boovies.html',
    'boovies-jurassic-preview.html':   'boovies.html',
    'boovies-raiders-preview.html':    'boovies.html',
    'boovies-pulp-preview.html':       'boovies.html',
    'boovies-booning-preview.html':    'boovies.html',
    'film.html':        'watch.html',
    'marketplace.html': 'watch.html',
    'offer.html':       'exchange.html',
    'pitch.html':       'commission.html',
    'studio.html':      'studios.html',
    'agents.html':      'studios.html',
    'production.html':       'productions.html',
    'production-room.html':  'productions.html',
  };

  function currentPageFile() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || 'boovies.html';
  }

  const HAMBURGER_HTML = `
    <button type="button" class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="site-nav">
      <svg class="icon-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
      <svg class="icon-close" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
    </button>`;

  // Same four socials bMovies uses — keeps the two sites visually tied.
  const SOCIAL_LINKS = [
    { href: 'https://x.com/bMovies_Online',
      label: 'bMovies on X',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    { href: 'https://www.instagram.com/bmovies.online/',
      label: 'bMovies on Instagram',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608C4.516 2.567 5.783 2.295 7.15 2.233 8.416 2.175 8.796 2.163 12 2.163zm0 1.802c-3.141 0-3.495.011-4.72.067-1.003.046-1.55.214-1.913.357-.48.187-.823.41-1.183.77-.36.36-.583.703-.77 1.183-.143.363-.311.91-.357 1.913-.056 1.225-.067 1.579-.067 4.72s.011 3.495.067 4.72c.046 1.003.214 1.55.357 1.913.187.48.41.823.77 1.183.36.36.703.583 1.183.77.363.143.91.311 1.913.357 1.225.056 1.579.067 4.72.067s3.495-.011 4.72-.067c1.003-.046 1.55-.214 1.913-.357.48-.187.823-.41 1.183-.77.36-.36.583-.703.77-1.183.143-.363.311-.91.357-1.913.056-1.225.067-1.579.067-4.72s-.011-3.495-.067-4.72c-.046-1.003-.214-1.55-.357-1.913-.187-.48-.41-.823-.77-1.183-.36-.36-.703-.583-1.183-.77-.363-.143-.91-.311-1.913-.357-1.225-.056-1.579-.067-4.72-.067zM12 6.865a5.135 5.135 0 1 0 0 10.27 5.135 5.135 0 0 0 0-10.27zm0 8.468a3.333 3.333 0 1 1 0-6.666 3.333 3.333 0 0 1 0 6.666zm5.338-8.669a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>' },
    { href: 'https://www.youtube.com/@bMovies--Youtube',
      label: 'bMovies on YouTube',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
    { href: 'https://www.tiktok.com/@onlinebmovies',
      label: 'bMovies on TikTok',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/></svg>' },
  ];

  // ─── 2. Build the markup ───

  function buildNavHtml() {
    const page = currentPageFile();
    const activeTarget = ACTIVE_ALIASES[page] || page;
    const linkTags = NAV_LINKS.map(l => {
      const isActive = l.href === activeTarget;
      return `<a ${isActive ? 'class="active" ' : ''}href="${l.href}">${l.label}</a>`;
    }).join('\n      ');
    const socialTags = SOCIAL_LINKS.map(s => `
      <a class="nav-social" href="${s.href}" target="_blank" rel="noopener noreferrer" aria-label="${s.label}">${s.svg}</a>`).join('');
    // $bOOvies token — same coin silhouette as $bMovies, pink ink.
    const tokenIcon = `
      <a class="nav-social nav-token" href="invest.html" aria-label="$bOOvies token" style="color:#FF69B4;">
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
    header.querySelectorAll('nav a').forEach(a => {
      a.addEventListener('click', () => {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('nav-open')) {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ─── 3. Mount ───

  // If the page is an older bOOvies page (no <header class="site-header">),
  // create one at the top of <body>. Otherwise reuse the existing one.
  function ensureHeader() {
    let header = document.querySelector('header.site-header');
    if (!header) {
      header = document.createElement('header');
      header.className = 'site-header';
      document.body.insertBefore(header, document.body.firstChild);
    }
    return header;
  }

  // Legacy: remove any previously-injected .boovies-nav so we don't
  // show two nav bars after this file is updated in place.
  function removeLegacyNav() {
    document.querySelectorAll('.boovies-nav').forEach(n => n.remove());
  }

  // ─── 4. Pink theme overrides for .site-header ───
  //
  // theme.css paints .site-header red (#E50914). On bOOvies pages we
  // add a body class so a scoped rule block repaints those same
  // elements pink — no change to theme.css itself.
  const PINK_CSS = `
    body.boovies-theme .site-header .logo { border-color: #FF69B4 !important; text-shadow: 1px 2px 4px rgba(255,105,180,0.35) !important; }
    body.boovies-theme .site-header .logo span { color: #FF69B4 !important; }
    body.boovies-theme .site-header nav a.active { border-bottom-color: #FF69B4 !important; }
    body.boovies-theme .site-header nav a.signin-cta {
      border: 1px solid #FF69B4;
      color: #FF69B4 !important;
      padding: 0.35rem 0.9rem;
      margin-left: 0.5rem;
      transition: background 0.15s, color 0.15s;
    }
    body.boovies-theme .site-header nav a.signin-cta:hover { background: #FF69B4; color: #000 !important; border-bottom-color: transparent !important; }
    body.boovies-theme .site-header nav a.nav-social { color: #FF69B4 !important; }
    body.boovies-theme .site-header nav a.nav-social:hover { color: #ff8ec9 !important; }
    body.boovies-theme .site-header .nav-toggle:hover { border-color: #FF69B4; color: #FF69B4; }
    body.boovies-theme .site-footer { border-top-color: #FF69B4 !important; }
    body.boovies-theme .footer-social a:hover { color: #FF69B4 !important; border-color: #FF69B4 !important; background: rgba(255,105,180,0.1) !important; }
    @media (max-width: 860px) {
      body.boovies-theme .site-header.nav-open { border-bottom-color: #FF69B4 !important; }
    }
  `;

  function injectTheme() {
    if (document.getElementById('boovies-theme-css')) return;
    const style = document.createElement('style');
    style.id = 'boovies-theme-css';
    style.textContent = PINK_CSS;
    document.head.appendChild(style);
    document.body.classList.add('boovies-theme');
  }

  // ─── 5. Boot ───

  removeLegacyNav();
  injectTheme();
  const header = ensureHeader();
  header.innerHTML = buildNavHtml();
  wireHamburger(header);

})();
