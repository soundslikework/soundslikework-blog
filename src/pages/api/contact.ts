import type { APIRoute } from 'astro';

export const prerender = false;

// Replace with the same address used in wrangler.jsonc send_email.destination_address
const CONTACT_TO = 'YOUR_EMAIL@example.com';
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

  // Verify Turnstile (skipped in local dev when secret is absent)
  if (env.TURNSTILE_SECRET_KEY) {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v1/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: cfTurnstileResponse,
      }),
    });
    const { success } = (await verify.json()) as { success: boolean };
    if (!success) {
      return json({ error: 'Verification failed. Please try again.' }, 400);
    }
  }

  // Build RFC 2822 MIME message
  const rawEmail = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
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
  const emailMessage = new EmailMessage(CONTACT_FROM, CONTACT_TO, new Response(rawEmail));
  await env.SEND_EMAIL.send(emailMessage);

  return json({ success: true });
};
