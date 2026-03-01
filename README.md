# [soundslikework](https://www.soundslike.work)

Music blog built with Astro, Tailwind CSS, and deployed to Cloudflare.

## Commands

```sh
npm install       # install dependencies
npm run dev       # start dev server at localhost:4321
npm run build     # build to ./dist/
npm run new-post  # start a new post
npm run preview   # preview production build locally
```

## Stack

- **Astro** — static site framework
- **Tailwind CSS v4** — styling via `@tailwindcss/vite`
- **Cloudflare** — deployment target via `@astrojs/cloudflare`

## Structure

```
src/
  assets/      # images, etc.
  content/     # posts
  pages/       # routes (file-based)
  components/  # reusable components
public/        # static assets
```
