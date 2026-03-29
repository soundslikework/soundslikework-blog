# SEO Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add robots.txt, Schema.org JSON-LD structured data, og:type=article for posts, and an optional `seoTitle` frontmatter field to improve gear review search visibility.

**Architecture:** Four independent changes to an Astro static site: a static public file, a content schema addition, a layout prop threading change, and inline JSON-LD script injection in PostLayout. No new components needed — all changes are in existing files.

**Tech Stack:** Astro 5, astro-seo, TypeScript, Zod (content schema validation), Cloudflare Pages

---

## File Map

| File | Change |
|---|---|
| `public/robots.txt` | Create — allow all crawlers, declare sitemap |
| `src/content.config.ts` | Add `seoTitle: z.string().optional()` to posts schema |
| `src/layouts/BaseLayout.astro` | Add `seoTitle` and `ogType` props; use them in SEO component |
| `src/layouts/PostLayout.astro` | Destructure `seoTitle`, pass new props to BaseLayout, emit JSON-LD |

Note: `src/pages/posts/[...slug].astro` does **not** need changes — it passes the whole `post` object to `PostLayout`, which reads `post.data` directly.

---

### Task 1: robots.txt

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Create the file**

Create `public/robots.txt` with this exact content:

```
User-agent: *
Allow: /

Sitemap: https://soundslike.work/sitemap-index.xml
```

- [ ] **Step 2: Verify it builds and is included**

```bash
npm run build && ls dist/robots.txt
```

Expected output: `dist/robots.txt` (file exists, no build errors)

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat: add robots.txt with sitemap declaration"
```

---

### Task 2: Add seoTitle to content schema

**Files:**
- Modify: `src/content.config.ts`

- [ ] **Step 1: Add the field**

In `src/content.config.ts`, add `seoTitle` after the `title` field:

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/posts",
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, ""),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      seoTitle: z.string().optional(),
      date: z.coerce.date(),
      description: z.string(),
      author: z.string().optional(),
      coverImage: image().optional(),
      gear: z
        .object({
          make: z.string(),
          model: z.string(),
        })
        .optional(),
      tags: z.array(z.string()).default([]),
    }),
});

export const collections = { posts };
```

- [ ] **Step 2: Verify schema compiles**

```bash
npm run build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat: add optional seoTitle field to posts schema"
```

---

### Task 3: Thread seoTitle and ogType through BaseLayout

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Update BaseLayout**

Replace the entire frontmatter block in `src/layouts/BaseLayout.astro` (lines 1–40):

```astro
---
import "../styles/global.css";
import { SEO } from 'astro-seo';
import type { TwitterCardType } from 'astro-seo';

interface Props {
  title: string;
  description?: string;
  ogImage?: string; // absolute URL for og:image; omit for non-post pages
  seoTitle?: string; // overrides title in <title> tag and og/twitter title
  ogType?: string;   // defaults to "website"; pass "article" for posts
}

const {
  title,
  description = "Sounds Like Work — music gear reviews and thoughts",
  ogImage,
  seoTitle,
  ogType = "website",
} = Astro.props;
const canonicalURL = new URL(Astro.url.pathname, Astro.site ?? Astro.url);
const grainStyle = `background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); background-size: 256px 256px;`;

const displayTitle = seoTitle ?? title;

const seoProps = {
  title: `${displayTitle} — Sounds Like Work`,
  description: description,
  canonical: canonicalURL.toString(),
  ...(ogImage && {
    openGraph: {
      basic: {
        title: `${displayTitle} — Sounds Like Work`,
        type: ogType,
        image: ogImage,
        url: canonicalURL.toString(),
      },
    },
  }),
  twitter: {
    card: (ogImage ? "summary_large_image" : "summary") as TwitterCardType,
    title: `${displayTitle} — Sounds Like Work`,
    description: description,
    ...(ogImage && { image: ogImage }),
  },
};
---
```

The rest of the template (lines 43–66) is unchanged.

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: add seoTitle and ogType props to BaseLayout"
```

---

### Task 4: Pass new props from PostLayout + emit JSON-LD

**Files:**
- Modify: `src/layouts/PostLayout.astro`

- [ ] **Step 1: Replace the full PostLayout file**

```astro
---
import BaseLayout from "./BaseLayout.astro";
import Header from "../components/Header.astro";
import Footer from "../components/Footer.astro";
import Comments from "../components/Comments.astro";
import { Image } from "astro:assets";
import type { CollectionEntry } from "astro:content";

interface Props {
  post: CollectionEntry<"posts">;
}

const { post } = Astro.props;
const { title, seoTitle, date, description, coverImage, gear, tags, author } = post.data;

const formattedDate = date.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

// Build an absolute URL for og:image if the post has a cover image.
// Astro's image optimizer resolves `coverImage` to a final URL at build time;
// cast via `as any` because the type reflects the import, not the built output.
const ogImage =
  coverImage && Astro.site
    ? new URL((coverImage as any).src, Astro.site).href
    : undefined;

const canonicalURL = new URL(Astro.url.pathname, Astro.site ?? Astro.url);
const displayTitle = seoTitle ?? title;
const postAuthor = author ?? "Adam Brady";

const blogPostingSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: displayTitle,
  description,
  datePublished: date.toISOString(),
  author: { "@type": "Person", name: postAuthor },
  url: canonicalURL.toString(),
  publisher: {
    "@type": "Organization",
    name: "Sounds Like Work",
    url: "https://soundslike.work",
  },
  ...(ogImage && { image: ogImage }),
};

const reviewSchema = gear
  ? {
      "@context": "https://schema.org",
      "@type": "Review",
      itemReviewed: {
        "@type": "Product",
        name: `${gear.make} ${gear.model}`,
        brand: { "@type": "Brand", name: gear.make },
      },
      author: { "@type": "Person", name: postAuthor },
      reviewBody: description,
      url: canonicalURL.toString(),
    }
  : null;
---

<BaseLayout
  title={title}
  seoTitle={seoTitle}
  description={description}
  ogImage={ogImage}
  ogType="article"
>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify(blogPostingSchema)} />
    {reviewSchema && <script type="application/ld+json" set:html={JSON.stringify(reviewSchema)} />}
  </Fragment>
  <Header />
  <main class="max-w-2xl mx-auto px-6 md:px-8 py-12">
    <article>
      <header class="mb-10">
        {
          gear && (
            <p class="font-mono text-accent text-[10px] uppercase tracking-[0.25em] font-medium mb-3 flex items-center gap-2">
              <span class="inline-block w-3 h-px bg-accent opacity-60" />
              {gear.make} / {gear.model}
              <span class="inline-block w-3 h-px bg-accent opacity-60" />
            </p>
          )
        }
        <h1 class="font-serif text-4xl font-bold text-ink mb-4 leading-tight">
          {title}
        </h1>
        <p class="font-body text-ink/60 text-lg mb-6 leading-relaxed">
          {description}
        </p>
        <div class="flex items-center gap-4 text-sm text-ink/50 mb-6">
          <time class="font-mono uppercase tracking-[0.15em] text-[10px]"
            >{formattedDate}</time
          >
          {author && <span class="font-mono text-[10px]">by {author}</span>}
          {
            tags.length > 0 && (
              <div class="flex gap-2">
                {tags.map((tag) => (
                  <a
                    href={`/tags/${tag}`}
                    class="font-mono text-accent/80 hover:text-accent uppercase tracking-[0.15em] text-[10px] transition-colors"
                  >
                    #{tag}
                  </a>
                ))}
              </div>
            )
          }
        </div>
        {
          coverImage && (
            <Image
              src={coverImage}
              alt={`${gear?.make ?? ""} ${gear?.model ?? title}`}
              width={680}
              height={400}
              class="w-full rounded-sm object-cover"
            />
          )
        }
        <div class="post-divider" role="separator" aria-hidden="true"></div>
      </header>
      <div class="prose prose-retro max-w-none leading-relaxed">
        <slot />
      </div>
    </article>
    <Comments />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: Add the head slot to BaseLayout**

The `<Fragment slot="head">` above requires BaseLayout to expose a `head` slot inside `<head>`. Open `src/layouts/BaseLayout.astro` and add `<slot name="head" />` immediately after the `<SEO>` line:

```astro
    <SEO {...seoProps} />
    <slot name="head" />
  </head>
```

(This is a one-line addition at line 56, after `<SEO {...seoProps} />`.)

- [ ] **Step 3: Build and inspect output**

```bash
npm run build && grep -l "application/ld+json" dist/posts/*/index.html
```

Expected: lists one or more post HTML files.

Then spot-check one:

```bash
grep -A 5 "application/ld+json" dist/posts/ibanez-de7---oscillation-station/index.html
```

Expected: two JSON-LD blocks — one with `"@type":"BlogPosting"` and one with `"@type":"Review"`.

Also verify og:type:

```bash
grep 'og:type' dist/posts/ibanez-de7---oscillation-station/index.html
```

Expected: `<meta property="og:type" content="article">`

- [ ] **Step 4: Commit**

```bash
git add src/layouts/PostLayout.astro src/layouts/BaseLayout.astro
git commit -m "feat: add Schema.org JSON-LD, og:type=article, seoTitle threading"
```

---

### Task 5: Smoke test seoTitle end-to-end

This task verifies the `seoTitle` field works without modifying production posts — uses a temporary change to one post.

**Files:**
- Modify temporarily: `src/content/posts/ibanez-de7---oscillation-station.mdx`

- [ ] **Step 1: Add a test seoTitle to a post frontmatter**

Open `src/content/posts/ibanez-de7---oscillation-station.mdx` and add one line to frontmatter:

```yaml
seoTitle: "Ibanez DE7 Review: Delay Pedal Deep Dive"
```

- [ ] **Step 2: Build and verify**

```bash
npm run build && grep '<title>' dist/posts/ibanez-de7---oscillation-station/index.html
```

Expected: `<title>Ibanez DE7 Review: Delay Pedal Deep Dive — Sounds Like Work</title>`

Also check the h1 is unchanged:

```bash
grep -A 1 '<h1' dist/posts/ibanez-de7---oscillation-station/index.html
```

Expected: contains `Ibanez DE7 - Oscillation Station` (original title, not seoTitle).

- [ ] **Step 3: Revert the test change**

Remove the `seoTitle` line you added — this was just a smoke test. Production posts get `seoTitle` added deliberately when needed.

```bash
git checkout src/content/posts/ibanez-de7---oscillation-station.mdx
```

- [ ] **Step 4: Final build check**

```bash
npm run build
```

Expected: clean build, no errors.
