import { defineConfig } from "astro/config";

import playformCompress from "@playform/compress";

export default defineConfig({
  site: "https://astro-smallworld.pages.dev/",
  integrations: [playformCompress()],
});