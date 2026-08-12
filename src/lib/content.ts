import { getCollection } from 'astro:content';

/**
 * Every singleton is a collection holding one file, so reading one is always
 * "take the only entry". Throws rather than rendering a half-empty page.
 */
async function singleton<T extends 'home' | 'about' | 'contact' | 'thoughtProcess' | 'fireflyPhrases' | 'workOrder'>(
  name: T,
) {
  const entries = await getCollection(name);
  if (!entries.length) {
    throw new Error(`Missing content file for "${name}" — expected one in src/content/site/.`);
  }
  return entries[0].data;
}

export const getHome = () => singleton('home');
export const getAbout = () => singleton('about');
export const getContact = () => singleton('contact');
export const getThoughtBeats = async () => (await singleton('thoughtProcess')).beats;
export const getFireflyPhrases = async () => (await singleton('fireflyPhrases')).phrases;

export type Project = Awaited<ReturnType<typeof getProjectsSorted>>[number];

/**
 * Ordered by the drag-and-drop Work order list. Anything missing from that list
 * still appears — newest first, after the ordered ones — so a project added in the
 * CMS can never silently vanish because someone forgot to drag it in.
 */
export async function getProjectsSorted() {
  const [entries, { order }] = await Promise.all([
    getCollection('projects'),
    singleton('workOrder'),
  ]);

  const projects = entries.map((entry) => ({ slug: entry.id, ...entry.data }));
  const rank = new Map(order.map((slug, i) => [slug, i]));

  return projects.sort((a, b) => {
    const ra = rank.get(a.slug);
    const rb = rank.get(b.slug);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return b.year - a.year;
  });
}

export async function getProject(slug: string) {
  return (await getProjectsSorted()).find((p) => p.slug === slug);
}

/** Chapter anchors are derived, so nobody has to invent an id in the CMS. */
export function chapterId(title: string, index: number) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `chapter-${index + 1}`;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Minimal inline formatting for prose written in the CMS: **bold** only.
 * Escapes first, so the output is safe to pass to set:html.
 */
export function renderInline(text: string) {
  return text
    .replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** Splits CMS prose into paragraphs on blank lines, matching the old rendering. */
export const paragraphs = (text: string) =>
  text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
