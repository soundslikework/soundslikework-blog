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
