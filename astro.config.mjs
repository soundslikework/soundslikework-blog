import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://soundslike.work',
  integrations: [mdx()],

  vite: {
    plugins: [tailwindcss()],
  },

  image: {
    quality: 80, // default WebP quality; raise to 85-90 for hero shots, lower to 70 for thumbnails
  },

  adapter: cloudflare(),
});