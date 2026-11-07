import { SITE } from '../../site';
import type { APIRoute } from 'astro';
import { env as workerEnv } from 'cloudflare:workers';
import { buildRawEmail, cleanName, EMAIL_RE } from '../../lib/contactEmail';

export const prerender = false;

const CONTACT_FROM = SITE.contactEmail;

interface CloudflareEnv {
  SEND_EMAIL?: { send(message: unknown): Promise<void> };
  TURNSTILE_SECRET_KEY?: string;
  CONTACT_TO?: string;
  TURNSTILE_SKIP_ON_ERROR?: string; // .dev.vars only: wrangler dev --remote gets 405 from siteverify
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const env = workerEnv as unknown as CloudflareEnv;
  const CONTACT_TO = env.CONTACT_TO ?? '';

  let name: unknown, email: unknown, message: unknown, cfTurnstileResponse: unknown;
  try {
    ({ name, email, message, cfTurnstileResponse } = (await request.json()) as Record<string, unknown>);
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string' || typeof cfTurnstileResponse !== 'string') {
    return json({ error: 'Invalid request.' }, 400);
  }

  const safeName = cleanName(name);
  const cleanEmail = email.trim();
  const cleanMessage = message.trim();

  if (!safeName || !cleanEmail || !cleanMessage) {
    return json({ error: 'All fields are required.' }, 400);
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }
  if (cleanMessage.length > 5000) {
    return json({ error: 'Message is too long (max 5000 characters).' }, 400);
  }

  // Verify Turnstile. Fails closed: only `astro dev` (no secret) skips it.
  if (env.TURNSTILE_SECRET_KEY) {
    const skipOnError = env.TURNSTILE_SKIP_ON_ERROR === 'true';
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
        console.warn('[contact] Turnstile returned', res.status);
        if (!skipOnError) return json({ error: 'Verification unavailable. Please try again later.' }, 503);
      }
    } catch (err) {
      console.warn('[contact] Turnstile unreachable:', err);
      if (!skipOnError) return json({ error: 'Verification unavailable. Please try again later.' }, 503);
    }
  } else if (!import.meta.env.DEV) {
    console.error('[contact] TURNSTILE_SECRET_KEY is not set — refusing to send.');
    return json({ error: 'Contact form is unavailable.' }, 503);
  }

  const rawEmail = buildRawEmail({
    fromName: SITE.name,
    from: CONTACT_FROM,
    to: CONTACT_TO,
    domain: new URL(SITE.url).hostname,
    name: safeName,
    email: cleanEmail,
    message: cleanMessage,
  });

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
