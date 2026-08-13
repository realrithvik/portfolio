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
  isn't in range. In this repo that means `src/styles/global.css` (2.2k lines),
  `src/lib/fireflies.ts`, `src/lib/thoughtProcess.ts`, `src/lib/backgroundDots.ts`,
  `src/pages/index.astro`, `keystatic.config.ts`. Everything else is small — just read it.
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
- Shared: `lib/imageFallback.ts` — every project `<img>` pairs with a sibling placeholder
- Ambient: `lib/fireflies.ts`, `lib/backgroundDots.ts`

## Content is CMS-owned — do not hardcode copy

All words and images live in YAML under `src/content/`, edited via Keystatic at `/keystatic`.
**Never put user-facing copy in `.astro` files.** Adding a field means touching three places:

1. `keystatic.config.ts` — the editing UI (root of repo)
2. `src/content.config.ts` — the Zod schema Astro validates at build time
3. `src/content/**.yaml` — the value itself

Read content through `src/lib/content.ts` (`getHome`, `getProjectsSorted`, `getProject`,
`getThoughtBeats`, `renderInline`, `paragraphs`). All are async — Astro frontmatter only.

- Prose fields support `**bold**` via `renderInline()`, which escapes HTML first. Use with
  `set:html`.
- `src/lib/fireflies.ts` runs in the browser and **cannot** import `astro:content`. Its phrases
  arrive as a `data-phrases` JSON attribute set by `Fireflies.astro`. Same pattern for any other
  client-side content.
- Thought beats pick an icon by `select`; the five values map to SVGs in `ThoughtIcons.astro`.
  A sixth beat needs a new SVG in code.
- Project order comes from `src/content/site/work-order.yaml`; anything absent is appended by
  year descending, so a new project can never silently disappear.
- Keystatic uses local mode in dev and GitHub mode in production, switched on
  `import.meta.env.DEV`. The repo is hardcoded in `keystatic.config.ts`: local mode 500s on
  Workers (no filesystem), and `/keystatic/setup` only exists in GitHub mode, so gating that
  mode behind an env var configured *during* setup is circular.

### Deployment gotchas (all cost real time once)

- **The GitHub App must have user-to-server token expiration ENABLED**
  (Optional Features tab). Keystatic validates the token response against a schema requiring
  `refresh_token` and `refresh_token_expires_in`, which GitHub omits when expiry is off.
  Validation throws and surfaces as a generic `Authorization failed` — the *same* string it
  uses for genuinely bad credentials, so the message is not diagnostic.
- **Secrets changed in the Cloudflare dashboard do not reach the serving Worker until the
  next deploy**, because the Worker is published by CI. Force one with
  `git commit --allow-empty -m redeploy && git push`.
- Keystatic reads credentials from `locals.runtime.env` first, so they belong in
  **Settings → Variables and Secrets** (runtime), not Build variables. `PUBLIC_*` vars are the
  opposite — inlined at build time — which is why the app slug is baked into
  `astro.config.mjs` via a vite `define` instead.
- To distinguish bad credentials from other OAuth failures, POST to
  `https://github.com/login/oauth/access_token` with the real id/secret and a junk code:
  `bad_verification_code` means the pair is valid, `incorrect_client_credentials` means it is not.

Astro is pinned to 5.x: `@astrojs/cloudflare` 12.x and `@astrojs/react` 4.x are the last
Astro 5–compatible lines. Do not bump them without upgrading Astro itself.

## Known open items

- Contact form posts to `mailto:` — silently blocked by modern browsers; needs a real handler
  (Cloudflare has no built-in forms)
- No og:/twitter meta tags, so shared links preview blank
- `npm audit` reports 7 high advisories, all requiring Astro 7 (`@astrojs/cloudflare` 14.x)
