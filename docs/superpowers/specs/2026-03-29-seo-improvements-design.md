# SEO Improvements Design

**Goal:** Add robots.txt, Schema.org JSON-LD, og:type article, and optional seoTitle frontmatter field to improve gear review search visibility.

---

## 1. robots.txt

Static file at `public/robots.txt`. Allows all crawlers and declares the sitemap URL.

```
User-agent: *
Allow: /

Sitemap: https://soundslike.work/sitemap-index.xml
```

No dynamic generation needed — sitemap URL is stable.

---

## 2. og:type Fix

Posts currently emit `og:type = "website"`. Article pages should emit `"article"`.

- `PostLayout.astro` passes `ogType="article"` to `BaseLayout`
- `BaseLayout.astro` adds an optional `ogType` prop (type `string`, default `"website"`)
- The prop is forwarded to the `astro-seo` `<SEO>` component's `openGraph.basic.type`
- No other pages (index, about, contact, tags) are affected — they continue to emit `"website"`

---

## 3. seoTitle Frontmatter Field

An optional field that overrides the post title in the `<title>` tag and og/twitter title, without changing the visible `<h1>` heading.

### Schema change (`src/content.config.ts`)

Add to the posts collection schema:
```ts
seoTitle: z.string().optional(),
```

### Data flow

```
Post frontmatter (seoTitle?)
  → src/pages/posts/[...slug].astro   (reads from entry.data)
  → src/layouts/PostLayout.astro      (accepts seoTitle prop)
  → src/layouts/BaseLayout.astro      (uses seoTitle ?? title for <title> and og/twitter title)
```

### Behavior

- When `seoTitle` is present: used as `<title>`, `og:title`, and `twitter:title`
- When absent: falls back to `title` (current behavior unchanged)
- The `<h1>` in `PostLayout` always uses `title`

### Example usage

```yaml
title: "Ibanez DE7 - Oscillation Station"
seoTitle: "Ibanez DE7 Review: Delay Pedal Deep Dive"
```

---

## 4. Schema.org JSON-LD

Injected in `PostLayout.astro` as raw `<script type="application/ld+json" set:html={...}>` blocks. No separate component — the logic lives in `PostLayout` where all the data is available.

### BlogPosting (all posts)

Always emitted. Fields:

| Field | Source |
|---|---|
| `@type` | `"BlogPosting"` |
| `headline` | `seoTitle ?? title` |
| `description` | `description` |
| `datePublished` | `date` (ISO string) |
| `author` | `{ @type: "Person", name: author ?? "Adam Brady" }` |
| `image` | `ogImage` (absolute URL, only when coverImage present) |
| `url` | canonical URL (`new URL(slug, Astro.site)`) |
| `publisher` | `{ @type: "Organization", name: "Sounds Like Work", url: "https://soundslike.work" }` |

### Review (posts with `gear` frontmatter only)

Emitted as a second `<script>` block when `gear` is present. Fields:

| Field | Source |
|---|---|
| `@type` | `"Review"` |
| `itemReviewed` | `{ @type: "Product", name: "{make} {model}", brand: { @type: "Brand", name: make } }` |
| `author` | same as BlogPosting |
| `reviewBody` | `description` |
| `url` | canonical URL |

### Placement

Both script blocks are emitted inside the `<head>` via Astro's `<slot name="head">` pattern, or directly in `PostLayout` before the `BaseLayout` call. The simpler approach is to serialize to JSON in the frontmatter script block and emit inline in `PostLayout`'s template, since `PostLayout` wraps `BaseLayout`.

---

## Files Changed

| File | Change |
|---|---|
| `public/robots.txt` | Create |
| `src/content.config.ts` | Add `seoTitle: z.string().optional()` |
| `src/pages/posts/[...slug].astro` | Pass `seoTitle` to `PostLayout` |
| `src/layouts/PostLayout.astro` | Accept `seoTitle` prop, pass to `BaseLayout`, emit JSON-LD |
| `src/layouts/BaseLayout.astro` | Accept `ogType` and `seoTitle` props, use in SEO component |
