import type { APIRoute } from 'astro';

export const prerender = false;

// Replace with the same address used in wrangler.jsonc send_email.destination_address
const CONTACT_TO = 'adampaulbrady@gmail.com';
const CONTACT_FROM = 'contact@soundslike.work';

interface CloudflareEnv {
  SEND_EMAIL?: { send(message: unknown): Promise<void> };
  TURNSTILE_SECRET_KEY?: string;
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Strip CR/LF to prevent CRLF header injection.
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim();
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = ((locals as any).runtime?.env ?? {}) as CloudflareEnv;

  let name: unknown, email: unknown, message: unknown, cfTurnstileResponse: unknown;
  try {
    ({ name, email, message, cfTurnstileResponse } = await request.json());
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string' || typeof cfTurnstileResponse !== 'string') {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Sanitize and trim once; use clean values throughout.
  const cleanName = sanitizeHeader(name);
  const cleanEmail = sanitizeHeader(email);
  const cleanMessage = message.trim();

  if (!cleanName || !cleanEmail || !cleanMessage) {
    return json({ error: 'All fields are required.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }
  if (cleanMessage.length > 5000) {
    return json({ error: 'Message is too long (max 5000 characters).' }, 400);
  }

  // Verify Turnstile. Skipped when secret is absent.
  // wrangler dev --remote returns 405 from challenges.cloudflare.com — log and continue.
  if (env.TURNSTILE_SECRET_KEY) {
    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v1/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: cfTurnstileResponse }),
      });
      if (res.ok) {
        const { success } = (await res.json()) as { success: boolean };
        if (!success) return json({ error: 'Verification failed. Please try again.' }, 400);
      } else {
        console.warn('[contact] Turnstile returned', res.status, '— skipping');
      }
    } catch (err) {
      console.warn('[contact] Turnstile unreachable:', err);
    }
  }

  // Build RFC 2822 MIME message (Message-ID and Date are required by Cloudflare).
  const rawEmail = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    `Message-ID: <${crypto.randomUUID()}@soundslike.work>`,
    `Date: ${new Date().toUTCString()}`,
    `From: Sounds Like Work <${CONTACT_FROM}>`,
    `To: ${CONTACT_TO}`,
    `Reply-To: ${cleanName} <${cleanEmail}>`,
    `Subject: New message from ${cleanName}`,
    '',
    `Name: ${cleanName}`,
    `Email: ${cleanEmail}`,
    '',
    cleanMessage,
  ].join('\r\n');

  // cloudflare:email is a Workers runtime module, not resolvable by Vite in dev.
  // Skip gracefully when the binding is absent (astro dev).
  if (!env.SEND_EMAIL) {
    console.log('[dev] No SEND_EMAIL binding — email not sent.');
    return json({ success: true });
  }

  const { EmailMessage } = await import('cloudflare:email');
  try {
    await env.SEND_EMAIL.send(new EmailMessage(CONTACT_FROM, CONTACT_TO, rawEmail));
  } catch (err) {
    console.error('[contact] SEND_EMAIL.send() failed:', err instanceof Error ? err.message : err);
    return json({ error: 'Could not send your message. Please try again later.' }, 500);
  }

  return json({ success: true });
};
