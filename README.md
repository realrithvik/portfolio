# Rithvik Portfolio

A warm, story-driven design portfolio built with [Astro](https://astro.build).

## Run the site locally

Open **PowerShell** or **Command Prompt**, then:

```powershell
cd "E:\Portfolio website"
npm install
npm run dev
```

Open the URL shown in the terminal (usually **http://localhost:4321**).

## Edit your content

Most of what you'll change lives in one file:

```
src/data/projects.ts
```

Each project has:
- `title`, `hook`, `year`, `role`, `tags`
- `chapters` — five story sections (problem → insight → process → outcome → dot)

Save the file and the site updates automatically while `npm run dev` is running.

## Add images

1. Create a folder: `public/images/shape-of-time/` (or your project slug)
2. Add images named by chapter: `problem.jpg`, `insight.jpg`, etc.
3. Update `StoryChapter.astro` later to show them (or ask for help)

## Pages

| URL | Page |
|-----|------|
| `/` | Home + selected work |
| `/projects/shape-of-time` | Master's project story |
| `/projects/line-of-control` | Line of Control story |
| `/projects/interactive-brochure` | HTML Brochure story |
| `/about` | About the dot |
| `/contact` | Contact |

## Listen buttons

Each chapter has a **Listen** button that uses your browser's text-to-speech. Works on Chrome, Edge, and Safari. Voices vary by device.

## Build for production

```powershell
npm run build
npm run preview
```

## Deploy later

Push to GitHub, then connect to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) for a free live URL.
