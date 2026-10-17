// Security response headers, shared by the edge worker and the build's _headers
// file. The worker runs first for the HTML entry pages (assets.run_worker_first)
// and Cloudflare does NOT apply _headers rules to worker-generated responses, so
// both places attach the same set and every response is covered.
//
// The content policy is intentionally strict: the app is a self-contained,
// same-origin static bundle with no inline scripts, no third-party requests and
// no network calls at all. 'unsafe-inline' is only allowed for styles because
// the markup uses style="" attributes.
export const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  // Modern guidance: disable the buggy legacy XSS auditor; CSP supersedes it.
  'x-xss-protection': '0',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy':
    'geolocation=(), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; " +
    "base-uri 'none'; object-src 'none'; form-action 'self'; frame-ancestors 'self'",
};

// The plain-text _headers file Cloudflare applies to static-asset responses.
export function headersFileText() {
  const lines = Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${value}`);
  return `/*\n${lines.join('\n')}\n`;
}
