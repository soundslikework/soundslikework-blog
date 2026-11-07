import { getCollection } from "astro:content";

export const getPosts = async () =>
  (await getCollection("posts")).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

export const tagUrl = (tag: string) => `/tags/${encodeURIComponent(tag)}`;
