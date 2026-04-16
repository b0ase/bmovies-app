/**
 * bOOvies shared navbar — pink variant of the bMovies nav.
 *
 * Drop <script src="js/boovies-nav.js"></script> on any boovies page.
 * Injects a sticky pink nav bar with links to all bOOvies films +
 * a "Back to bMovies" escape hatch on the right.
 *
 * Highlights the active page automatically.
 */

(function () {
  var FILMS = [
    { href: 'boovies.html',              label: 'Home' },
    { href: 'boovies-boobfather.html',   label: 'The bOObfather' },
    { href: 'boovies-star.html',         label: 'Star Boors' },
    { href: 'boovies-jurassic.html',     label: 'Jurassic Pork' },
    { href: 'boovies-raiders.html',      label: 'Raiders' },
    { href: 'boovies-pulp.html',         label: 'Pulp Friction' },
    { href: 'boovies-booning.html',      label: 'The BOOning' },
  ];

  var page = location.pathname.split('/').pop() || 'boovies.html';

  // Build HTML
  var links = FILMS.map(function (f) {
    var active = f.href === page ? ' boovies-active' : '';
    return '<a class="bn-link' + active + '" href="' + f.href + '">' + f.label + '</a>';
  }).join('');

  var html =
    '<div class="bn-inner">' +
      '<a class="bn-logo" href="boovies.html">b<span>OO</span>vies</a>' +
      '<div class="bn-links">' + links + '</div>' +
      '<a class="bn-back" href="index.html">&larr; bMovies</a>' +
    '</div>';

  // Inject the nav
  var nav = document.createElement('nav');
  nav.className = 'boovies-nav';
  nav.innerHTML = html;

  // Insert as first child of body (before everything else)
  document.body.insertBefore(nav, document.body.firstChild);

  // Inject styles
  var css = document.createElement('style');
  css.textContent =
    '.boovies-nav {' +
      'position: sticky; top: 0; z-index: 100;' +
      'background: #08000a; border-bottom: 1px solid #FF69B4;' +
      'font-family: "Inter", -apple-system, sans-serif;' +
    '}' +
    '.bn-inner {' +
      'display: flex; align-items: center;' +
      'padding: 0 max(1rem, calc((100% - 1400px) / 2));' +
      'overflow-x: auto; -webkit-overflow-scrolling: touch;' +
      'scrollbar-width: none; gap: 0;' +
    '}' +
    '.bn-inner::-webkit-scrollbar { display: none; }' +
    '.bn-logo {' +
      'font-family: "Bebas Neue", sans-serif; font-size: 1.4rem;' +
      'color: #FF69B4; text-decoration: none; letter-spacing: 0.04em;' +
      'margin-right: 1rem; flex-shrink: 0; white-space: nowrap;' +
    '}' +
    '.bn-logo span { color: #fff; }' +
    '.bn-links { display: flex; align-items: center; gap: 0; flex: 1; min-width: 0; }' +
    '.bn-link {' +
      'padding: 0.6rem 0.7rem; font-size: 0.55rem; font-weight: 700;' +
      'letter-spacing: 0.1em; text-transform: uppercase;' +
      'color: #777; text-decoration: none; white-space: nowrap;' +
      'border-bottom: 2px solid transparent; transition: color 150ms;' +
    '}' +
    '.bn-link:hover { color: #FF69B4; }' +
    '.bn-link.boovies-active { color: #fff; border-bottom-color: #FF69B4; }' +
    '.bn-back {' +
      'margin-left: auto; flex-shrink: 0; padding: 0.35rem 0.65rem;' +
      'font-size: 0.5rem; font-weight: 700; letter-spacing: 0.06em;' +
      'text-transform: uppercase; color: #666; text-decoration: none;' +
      'border: 1px solid #333; white-space: nowrap; transition: all 150ms;' +
    '}' +
    '.bn-back:hover { color: #E50914; border-color: #E50914; }' +
    '@media (max-width: 768px) {' +
      '.bn-inner { padding: 0 0.75rem; }' +
      '.bn-logo { font-size: 1.1rem; margin-right: 0.5rem; }' +
      '.bn-link { padding: 0.5rem 0.45rem; font-size: 0.48rem; }' +
    '}';
  document.head.appendChild(css);
})();
