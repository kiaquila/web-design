/**
 * Cloudflare Worker entry point for the Misha CV stage.
 *
 * The page is fully static: Workers Static Assets serves everything out of
 * `dist/`, and this Worker exists only to attach security headers, which the
 * assets pipeline does not set on its own.
 */

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/** Applied to every response, whatever it is. */
const BASELINE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // No preload: that submission is effectively irreversible for the domain.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Frame-Options": "DENY"
};

/**
 * The page loads nothing from other origins: one local stylesheet, one local
 * script, one self-hosted font and one SVG. Unlike the other projects in this
 * repository this one also sets **no inline styles at all**, so `style-src`
 * does not need `'unsafe-inline'` — a test already asserts the markup carries
 * no `style` attribute, and this is where that property earns something.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests"
].join("; ");

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(BASELINE_HEADERS)) {
      headers.set(name, value);
    }
    if ((headers.get("content-type") ?? "").includes("text/html")) {
      headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
