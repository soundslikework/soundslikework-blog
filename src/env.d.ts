/// <reference types="astro/client" />

// Cloudflare Workers runtime module — not an npm package, not resolvable by Vite.
// Only available inside a Workers runtime (wrangler dev, Cloudflare Pages).
declare module 'cloudflare:email' {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string | ReadableStream);
  }
}
