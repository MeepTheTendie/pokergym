// Rewrite a published page's absolute site links into the flat, offline
// filenames used by the itch build. The portable bundle is a self-contained
// demo: it must never reference the live origin for scripts or send analytics,
// so the first-party PostHog loader is stripped here. The shared site header,
// footer, stylesheet and font preloads (scripts/site-chrome.mjs) map to the
// bundled trainer files as well.
export const GUIDES = ['jacks-or-better', 'blackjack', 'holdem-best-five', 'baccarat'];

export function localLinks(html, guides = GUIDES) {
  return html
    .replace(/href="\/sitemap.xml"/g, 'href="index.html"')
    .replace(/href="\/guides\/"/g, 'href="index.html#portableGuides"')
    .replace(/href="\/guides\/weekly-01\/"/g, 'href="weekly-sample.html"')
    .replace(/href="\/guides\/([a-z-]+)\/"/g, (_, guide) => {
      if (!guides.includes(guide)) throw new Error(`Unbundled guide: ${guide}`);
      return `href="guide-${guide}.html"`;
    })
    .replace(/href="\/web\/\?practice=([a-z]+)"/g, 'href="index.html?practice=$1"')
    .replace(/href="\/web\/\?daily=1"/g, 'href="index.html?daily=1"')
    .replace(/href="\/web\/"/g, 'href="index.html"')
    .replace(/href="\/web\/site\.css"/g, 'href="site.css"')
    .replace(/href="\/web\/fonts\/([A-Za-z0-9-]+\.woff2)"/g, 'href="fonts/$1"')
    .replace(/href="\/web\/privacy(?:\.html)?"/g, 'href="privacy.html"')
    .replace(/href="\/web\/icon.svg"/g, 'href="icon.svg"')
    .replace(/href="\/"/g, 'href="index.html"')
    .replace(/<script src="\/web\/posthog-loader\.js"><\/script>/g, '');
}

// site.css lives next to fonts/ in the bundle; its absolute font URLs would
// point at the host's root inside an itch.io upload.
export function localStylesheet(css) {
  return css.replace(/url\(\/web\/fonts\//g, 'url(fonts/');
}
