#!/usr/bin/env node
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const postsDir = join(__dirname, '..', 'src', 'content', 'posts');

const rl = readline.createInterface({ input, output });

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const title = await rl.question('Title: ');
const description = await rl.question('Description: ');
const gearMake = await rl.question('Gear make (e.g. Boss) [optional]: ');
const gearModel = await rl.question('Gear model (e.g. DS-1) [optional]: ');
const tagsInput = await rl.question('Tags (comma-separated, e.g. distortion,boss) [optional]: ');

rl.close();

const slug = slugify(title);
const tags = tagsInput
  ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
  : [];

const gearBlock =
  gearMake && gearModel
    ? `gear:\n  make: ${gearMake}\n  model: ${gearModel}\n`
    : '';

const tagsBlock = tags.length > 0 ? `[${tags.join(', ')}]` : '[]';

const frontmatter = `---
title: "${title}"
date: ${today()}
description: "${description}"
${gearBlock}tags: ${tagsBlock}
---

`;

const filePath = join(postsDir, `${slug}.mdx`);

if (existsSync(filePath)) {
  console.error(`\nFile already exists: ${filePath}`);
  process.exit(1);
}

writeFileSync(filePath, frontmatter);
console.log(`\nCreated: src/content/posts/${slug}.mdx`);
