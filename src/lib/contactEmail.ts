// Display names go into headers: drop line breaks and address punctuation.
export const cleanName = (s: string) => s.replace(/[\r\n,<>"]/g, ' ').replace(/\s+/g, ' ').trim();

export const EMAIL_RE = /^[^\s@<>,"]+@[^\s@<>,"]+\.[^\s@<>,"]+$/;

// RFC 2047: non-ASCII header text must be encoded or mail clients garble it.
const encodeWord = (s: string) =>
  /^[\x20-\x7e]*$/.test(s)
    ? s
    : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(s)))}?=`;

interface Mail {
  fromName: string;
  from: string;
  to: string;
  domain: string;
  name: string; // already passed through cleanName
  email: string; // already validated against EMAIL_RE
  message: string;
}

export function buildRawEmail(m: Mail): string {
  return [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    `Message-ID: <${crypto.randomUUID()}@${m.domain}>`,
    `Date: ${new Date().toUTCString()}`,
    `From: ${m.fromName} <${m.from}>`,
    `To: ${m.to}`,
    `Reply-To: ${encodeWord(m.name)} <${m.email}>`,
    `Subject: ${encodeWord(`New message from ${m.name}`)}`,
    '',
    `Name: ${m.name}`,
    `Email: ${m.email}`,
    '',
    m.message,
  ].join('\r\n');
}
