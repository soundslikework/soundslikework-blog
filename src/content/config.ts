import { z, defineCollection } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      description: z.string(),
      author: z.string().optional(),
      coverImage: image().optional(),
      pedal: z
        .object({
          brand: z.string(),
          model: z.string(),
        })
        .optional(),
      tags: z.array(z.string()).default([]),
    }),
});

export const collections = { posts };
