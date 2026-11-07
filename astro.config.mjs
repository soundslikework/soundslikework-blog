import { SITE } from './src/site.ts';
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: SITE.url,
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/tags/') })],

  redirects: {
    '/posts/ibanez-de7---oscillation-station': '/posts/ibanez-de7-oscillation-station',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  // Self-hosted at build time, with size-matched fallbacks so text doesn't reflow when the font arrives.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      weights: ['400 700'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
      display: 'optional', // no swap: use the font if it's ready at first paint, else the fallback for this view
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Courier New', 'monospace'],
      display: 'optional',
    },
  ],

  image: {
    quality: 80, // default WebP quality; raise to 85-90 for hero shots, lower to 70 for thumbnails
  },

  adapter: cloudflare(),
});