import { CONTACT_CHANNELS, CONTACT_NAME } from '../content/contact';

/**
 * vCard 3.0 generator — pure function, ContactChannel[] in, vCard source
 * text out. Same "model in, source text out" discipline as
 * shellRenderer.ts: reads CONTACT_CHANNELS directly rather than taking its
 * own copy of any value, and only emits a channel whose `exportable` flag
 * is true (phone is already excluded from ContactChannel entirely — see
 * content/contact.ts — so it can never reach here regardless).
 *
 * No REV property: vCard's REV is a "this record was last revised at"
 * timestamp, and there is no such fact to state — Date.now() at click time
 * would be a fabricated revision history (a fresh timestamp on every
 * download of unchanged data), and a hardcoded build date would be a
 * meaningless one. REV is optional per RFC 2426 §3.6.4; omitting an
 * unknowable fact is the honest choice, not a missing feature.
 */

const CRLF = '\r\n';

/** RFC 2426 §5.8.4 value escaping — backslash, comma, semicolon, then real newlines. Order matters: backslash first, or the escapes added below would themselves get re-escaped. */
function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function vCardLine(property: string, value: string): string {
  return `${property}:${escapeVCardValue(value)}${CRLF}`;
}

function nameParts(fullName: string): { family: string; given: string } {
  const [given = '', ...rest] = fullName.trim().split(/\s+/);
  return { family: rest.join(' '), given };
}

export function toVCard(): string {
  const { family, given } = nameParts(CONTACT_NAME);

  let lines = 'BEGIN:VCARD' + CRLF;
  lines += vCardLine('VERSION', '3.0');
  lines += vCardLine('N', `${family};${given};;;`);
  lines += vCardLine('FN', CONTACT_NAME);

  for (const channel of CONTACT_CHANNELS) {
    if (!channel.exportable) continue;
    if (channel.id === 'email') {
      lines += vCardLine('EMAIL;TYPE=INTERNET', channel.value);
    } else {
      lines += vCardLine(`URL;TYPE=${channel.label}`, channel.href);
    }
  }

  lines += 'END:VCARD' + CRLF;
  return lines;
}
