// Hand-rolled rather than a `cookie-parser` dependency — this app reads/sets
// exactly two cookies (the visitor ID, the owner claim), both simple opaque
// tokens with no encoding edge cases worth a library for. Same "smallest
// sufficient" reasoning already applied to the visitor counter's own
// persistence choice (Upstash over a full database).

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: { maxAgeSeconds: number; secure: boolean },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${opts.maxAgeSeconds}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  // Secure is conditional, not always-on: a plain-HTTP local dev server
  // (no TLS) silently drops any cookie marked Secure — this would make the
  // whole visitor-counter/owner-claim flow untestable locally. Vercel
  // production serves HTTPS unconditionally, so config.nodeEnv is exactly
  // the right signal for this, not a request-inspection heuristic.
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}
