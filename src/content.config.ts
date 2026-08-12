import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Shapes here must match keystatic.config.ts. Keystatic writes the files; this
 * validates them at build time, so a bad entry fails the build instead of shipping.
 *
 * The singletons are modelled as collections holding exactly one file — Astro has no
 * separate singleton concept, and this way they get real schema validation too.
 */

const site = (file: string, schema: z.ZodRawShape) =>
  defineCollection({
    loader: glob({ pattern: file, base: './src/content/site' }),
    schema: z.object(schema),
  });

const projects = defineCollection({
  loader: glob({
    pattern: '*/index.yaml',
    base: './src/content/projects',
    // Without this the id would be "shape-of-time/index"; the folder name is the slug.
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    title: z.string(),
    hook: z.string(),
    // Stored as a string so the editor shows "2026" and not "2,026"; coerced here
    // because getProjectsSorted() falls back to sorting by year.
    year: z.coerce.number(),
    role: z.string(),
    tags: z.array(z.string()).default([]),
    accent: z.string(),
    heroImage: z.string().nullable().default(null),
    chapters: z
      .array(z.object({ title: z.string(), body: z.string() }))
      .default([]),
  }),
});

export const collections = {
  projects,

  home: site('home.yaml', {
    greeting: z.string(),
    nameLead: z.string(),
    nameRest: z.string(),
    nameSpoken: z.string(),
    pronunciation: z.string(),
    tagline: z.string(),
    dotHint: z.string(),
    workTitle: z.string(),
    workIntro: z.string(),
    workEmpty: z.string(),
    capabilitiesTitle: z.string(),
    capabilitiesIntro: z.string(),
    capabilities: z.array(z.object({ title: z.string(), note: z.string() })).default([]),
    bioText: z.string(),
    bioLinkLabel: z.string(),
  }),

  about: site('about.yaml', {
    title: z.string(),
    body: z.string(),
    ctaLabel: z.string(),
  }),

  contact: site('contact.yaml', {
    title: z.string(),
    intro: z.string(),
    email: z.string(),
    asidePrefix: z.string(),
    submitLabel: z.string(),
  }),

  thoughtProcess: site('thought-process.yaml', {
    beats: z
      .array(
        z.object({
          icon: z.enum(['read', 'empathize', 'define', 'shape', 'tell']),
          title: z.string(),
          body: z.string(),
        }),
      )
      .default([]),
  }),

  fireflyPhrases: site('firefly-phrases.yaml', {
    phrases: z.array(z.string()).default([]),
  }),

  workOrder: site('work-order.yaml', {
    order: z.array(z.string()).default([]),
  }),
};
