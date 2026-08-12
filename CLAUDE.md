# Portfolio (Rithvik) — Astro 5 + TypeScript + vanilla JS

Designer-owned. Prefer direct code iteration. Project rules also live in `.cursor/rules/portfolio.mdc`.

Run: `npm run dev` (http://localhost:4321) · Build: `npm run build`

## Context discipline

The goal is fewer tokens read, not fewer tool calls. A wrong narrow read costs more than
one correct wide read, because it buys a second round trip *and* a wrong answer.

### Reading files

- **Locate before reading.** Grep for the symbol, then `Read` with `offset` ~30 lines above
  the hit and a `limit` that covers it. Do not scroll a file looking for something.
- Files over ~200 lines: always pass `offset`/`limit`. Widen only if the symbol you need
  isn't in range. In this repo that means `src/styles/global.css` (1.8k lines),
  `src/lib/fireflies.ts`, `src/lib/thoughtProcess.ts`, `src/lib/backgroundDots.ts`,
  `src/pages/index.astro`. Everything else is small — just read it.
- **Exception — read whole files** when correctness depends on absence: dead-code hunts,
  "is this class/var/prop used anywhere", refactor audits, cleanup passes. Partial reads
  produce confidently wrong answers here. Grep for usage counts first; read fully only the
  file you're about to edit.
- Never re-read a file to verify your own edit. Edit/Write errors if it didn't apply.

### Searching

- Default to `output_mode: "files_with_matches"` (paths only). Escalate to `"content"` only
  when you need the line itself.
- With `"content"`, always set `head_limit` (~30–50) and narrow with `glob`/`type`.
  Use `-C` context sparingly — it multiplies output by the context window size.
- To answer "is X used?", get a **count**, not the lines:
  `grep -rIn "X" src/ | wc -l`. Cheapest possible signal.
- Batch independent lookups into one message; one loop over many patterns beats many calls.

### Commands

- Always trim noisy output: `npm run build 2>&1 | grep -Ei "error|warning" | tail -20`.
  Never let a full build/install log into context.
- Don't run `npx astro check` — it prompts to install `@astrojs/check` and hangs. Use
  `npm run build` for type/template errors.

### Browser verification

- **Screenshots are the most expensive tool here.** One image can cost more than every
  file read in a task. Take them to judge *visual design* — never to check a fact.
- To verify facts (layout order, computed styles, visibility, element counts, load state),
  assert with `javascript_tool` and return a small JSON blob. Example: compare
  `getBoundingClientRect().top` of two elements instead of screenshotting to see which is
  on top.
- Prefer `read_page` over `screenshot` for text and structure.
- The `/images/<slug>/*.jpg` 404s in console are expected — project imagery isn't added yet.

### Subagents

Don't spawn them unless asked. Each starts cold and re-derives context this session already
has. A multi-part task is not a reason to spawn.

## Brand

- Navy `#15173D`, purple `#982598`, pink `#E491C9`, cream `#F1E9E9`, yellow `#E8C96B`
- Fonts: Erode (display) / Recia (body) — `--font-serif` / `--font-sans`, loaded via
  `<link>` in `BaseLayout.astro`
- Avoid generic AI looks (purple-on-white, cream+terracotta, broadsheet)

## Structure

- Hero + dot trigger: `src/pages/index.astro`; all styling in `src/styles/global.css`
- Thought overlay: `ThoughtProcess.astro`, `lib/thoughtProcess.ts`, `lib/thoughtLine.ts`
- Projects: `src/data/projects.ts` (content source of truth) → `pages/projects/[slug].astro`
- Shared: `lib/imageFallback.ts` — every project `<img>` pairs with a sibling placeholder
- Ambient: `lib/fireflies.ts`, `lib/backgroundDots.ts`

## Known open items

- Hero dot should sit tight under the **R** in "Rithvik" (currently under the following gap)
- Contact form posts to `mailto:` — silently blocked by modern browsers; needs a real handler
- `/about` exists but isn't linked from nav
- `astro.config.mjs` `site` is a placeholder domain
