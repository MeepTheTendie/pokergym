// Shared header and footer for generated pages (guides, hub). One source so
// every page carries the same navigation and the trainer is always one click away.

const MARK = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C9 6 4 9 4 13.5a4 4 0 0 0 7 2.6L10 21h4l-1-4.9a4 4 0 0 0 7-2.6C20 9 15 6 12 2z" fill="#E8B53A"/></svg>';

export const HEAD_ASSETS = `<link rel="preload" href="/web/fonts/InterTight-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/web/fonts/Inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/web/site.css">
<meta name="theme-color" content="#0F3D2E">`;

export function header(current = '') {
  const item = (key, href, label) => `<a href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<a class="skip" href="#main">Skip to content</a>
<header class="pg-header"><div class="wrap">
<a class="pg-brand" href="/"><span class="pg-mark">${MARK}</span>Play Poker Gym</a>
<nav class="pg-nav" aria-label="Main">
${item('trainer', '/web/', 'Trainer')}
${item('guides', '/guides/', 'Guides')}
${item('drill', '/web/?daily=1', 'Daily Drill')}
</nav>
<a class="pg-cta" href="/web/?daily=1">Today’s 5 hands</a>
</div></header>`;
}

export function footer() {
  return `<footer class="pg-footer"><div class="wrap">
<span>Play Poker Gym · free blackjack, video poker, baccarat and Hold’em practice. No real money. Learning the best play lowers the house edge; it never beats it.</span>
<nav aria-label="Footer"><a href="/guides/">Guides</a><a href="/web/">Trainer</a><a href="/web/privacy">Privacy</a><a href="https://ko-fi.com/playpokergym">Tip on Ko-fi</a></nav>
</div></footer>`;
}
