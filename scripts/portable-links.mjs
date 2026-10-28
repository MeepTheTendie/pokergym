// Rewrite a published page's absolute site links into the flat, offline
// filenames used by the itch build. The portable bundle is a self-contained
// demo: it must never reference the live origin for scripts or send analytics,
// so the first-party PostHog loader is stripped here.
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
    .replace(/href="\/web\/privacy(?:\.html)?"/g, 'href="privacy.html"')
    .replace(/href="\/web\/icon.svg"/g, 'href="icon.svg"')
    .replace(/href="\/"/g, 'href="index.html"')
    .replace(/<script src="\/web\/posthog-loader\.js"><\/script>/g, '');
}
