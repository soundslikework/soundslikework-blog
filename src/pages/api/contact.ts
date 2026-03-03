import type { APIRoute } from 'astro';

export const prerender = false;

// Replace with the same address used in wrangler.jsonc send_email.destination_address
const CONTACT_TO = 'adampaulbrady@gmail.com';
const CONTACT_FROM = 'contact@soundslike.work';

interface CloudflareEnv {
  SEND_EMAIL?: {
    send(message: unknown): Promise<void>;
  };
  TURNSTILE_SECRET_KEY?: string;
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = ((locals as any).runtime?.env ?? {}) as CloudflareEnv;

  // Parse body
  let name: string, email: string, message: string, cfTurnstileResponse: string;
  try {
    ({ name, email, message, cfTurnstileResponse } = await request.json());
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Validate
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return json({ error: 'All fields are required.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  // Verify Turnstile. Skipped when secret is absent (e.g. local npm run preview).
  // wrangler dev --remote cannot reach challenges.cloudflare.com — Turnstile only enforces
  // in production. If the API is unreachable, we log and continue rather than crash.
  if (env.TURNSTILE_SECRET_KEY) {
    try {
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v1/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: cfTurnstileResponse }),
      });
      const body = await verify.text();
      if (verify.ok) {
        const { success } = JSON.parse(body) as { success: boolean };
        if (!success) return json({ error: 'Verification failed. Please try again.' }, 400);
      } else {
        console.warn('[contact] Turnstile returned', verify.status, '— skipping in non-production env');
      }
    } catch (err) {
      console.warn('[contact] Turnstile unreachable:', err);
    }
  }

  // Build RFC 2822 MIME message (Message-ID and Date are required by Cloudflare)
  const rawEmail = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    `Message-ID: <${crypto.randomUUID()}@soundslike.work>`,
    `Date: ${new Date().toUTCString()}`,
    `From: Sounds Like Work <${CONTACT_FROM}>`,
    `To: ${CONTACT_TO}`,
    `Reply-To: ${name.trim()} <${email.trim()}>`,
    `Subject: New message from ${name.trim()}`,
    '',
    `Name: ${name.trim()}`,
    `Email: ${email.trim()}`,
    '',
    message.trim(),
  ].join('\r\n');

  // Send via Cloudflare Email Workers binding
  // SEND_EMAIL is unavailable in `astro dev`; use `npm run preview` to test email delivery.
  if (!env.SEND_EMAIL) {
    console.log('[dev] No SEND_EMAIL binding — email not sent. Use `npm run preview` for full testing.');
    return json({ success: true });
  }

  // cloudflare:email is a Cloudflare Workers runtime module, not an npm package.
  // It is not resolvable by Vite in dev, so we import it only when the binding is present.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { EmailMessage } = await import('cloudflare:email');
  const emailMessage = new EmailMessage(CONTACT_FROM, CONTACT_TO, rawEmail);
  try {
    await env.SEND_EMAIL.send(emailMessage);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[contact] SEND_EMAIL.send() failed:', msg);
    return json({ error: `Email send failed: ${msg}` }, 500);
  }

  return json({ success: true });
};
