# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **static portfolio website** for architect/designer Manas Bhatia (manasbhatia.com), hosted on GitHub Pages. There is no build process — all files are plain HTML, CSS, and JavaScript deployed directly.

## Development

Since there is no build toolchain, development is done by editing files directly and previewing in a browser. There are no commands to run, no package manager, and no test suite.

To preview locally, open any HTML file in a browser or use a simple static server:
```
python -m http.server 8000
# or
npx serve .
```

## Architecture

### Page Structure

- **[index.html](index.html)** — Redirects to `landing.html`
- **[landing.html](landing.html)** — Hero/splash page with animated canvas background
- **[Computational Design.html](Computational%20Design.html)** — Main portfolio grid (primary work)
- **[art.html](art.html)** — Art projects overview
- **[about.html](about.html)** — Bio, clients, credentials
- **[exhibitions.html](exhibitions.html)**, **[press-media.html](press-media.html)** — Supporting content
- **[projects/](projects/)** — Individual project detail pages (project1–9, plus `eda/` subdirectory)
- **[art/](art/)** — Individual art piece pages (art1–5)
- **[architecture/](architecture/)** — Older/hidden architecture pages (not shown in nav)

Shared layout components live at the root: **[header.html](header.html)** and **[footer.html](footer.html)**. These are loaded into each page via `fetch()` calls in inline `<script>` blocks.

### JavaScript

| File | Role |
|------|------|
| [js/theme.js](js/theme.js) | Dark/light theme toggle using `localStorage`; exposes global `toggleDarkMode()` |
| [js/https-redirect.js](js/https-redirect.js) | Redirects HTTP → HTTPS (skips localhost) |
| [sketch.js](sketch.js) | P5.js mycelium/branch animation for the landing page (6 initial branches, max 200) |
| [sketch-projects.js](sketch-projects.js) | P5.js animation variant for project pages (12 initial branches, max 400) |

### Theming

The site uses CSS custom properties for all colors. Light theme is on `:root`, dark theme on `[data-theme="dark"]`. Theme state is persisted in `localStorage` and applied via `js/theme.js`. All pages include this script and set the theme attribute on `<html>` before first paint to avoid flash.

### CSS

- [css/project.css](css/project.css) — Shared styles for project detail and grid pages
- Page-specific styles are in `<style>` blocks inline in each HTML file

### Design System

The file **[website-style-guide.txt](website-style-guide.txt)** documents the full design system: color tokens, typography (Inter, General Sans, Asher Punk, Poppins, Fira Mono), spacing, component patterns, and animation specs. Refer to it when making visual changes.

Key layout patterns:
- Project cards: CSS Grid (3 cols desktop → 2 tablet → 1 mobile), square aspect ratio, hover lift
- Nav: rounded glassmorphism bar with blur, fixed position
- Breakpoints: 700px (mobile), 1200px (tablet)

## Important Conventions

- The `architecture/` directory contains pages that are intentionally **hidden** from navigation (see recent commits). Do not re-expose these without confirmation.
- Each HTML page manually includes `<script src="js/theme.js">` and applies the saved theme in an inline script to prevent FOUC.
- Images live under [img/](img/) organized by project name — add new project images to a matching subfolder.
