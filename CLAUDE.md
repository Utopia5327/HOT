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

- [css/project.css](css/project.css) — Shared styles for project detail and grid pages; also defines the unified typographic scale and design tokens used across the whole site
- Page-specific styles are in `<style>` blocks inline in each HTML file

### Design System

The file **[website-style-guide.txt](website-style-guide.txt)** documents the full design system. A detailed typography audit lives in **[typography-analysis.md](typography-analysis.md)**.

**Type scale** (defined as CSS custom properties in `css/project.css`):
- `--type-tag: 0.62rem` — Fira Mono, uppercase, `letter-spacing: 0.12em` — metadata labels
- `--type-label: 0.75rem` — Fira Mono — metadata values, buttons
- `--type-base: clamp(0.95rem, 1.1vw, 1.1rem)` — body text
- `--type-lg: clamp(1.6rem, 2.5vw, 2.4rem)` — section/page titles (gallery overviews, press page)
- `--type-2xl: clamp(3rem, 6vw, 6rem)` — project hero titles
- `--type-hero: clamp(3.5rem, 5.5vw, 6rem)` — landing display

**Font families**: Inter/General Sans for all prose and headings; Fira Mono for all metadata labels, values, and CTA buttons; Asher Punk for display-only accent text.

**Accent color**: `#a3e635` (lime green). Appears **only on hover states** — never as always-on decoration.

**CTA button standard** (applies to all detail pages):
- `border: 1px solid currentColor`, `border-radius: 2px`, `padding: 0.75rem 2rem`
- Fira Mono, `0.75rem`, `letter-spacing: 0.12em`, uppercase
- Hover: `background: #a3e635; color: #000`

**Metadata block standard** (YEAR / LOCATION / CATEGORY etc.):
- Label: Fira Mono, `0.62rem`, uppercase, `letter-spacing: 0.12em`, muted color
- Value: Fira Mono, `0.75rem`, normal color
- Layout: `flex-direction: column`, label above value

Key layout patterns:
- Project cards: CSS Grid (3 cols desktop → 2 tablet → 1 mobile), square aspect ratio, hover lift
- Nav: rounded glassmorphism bar with blur, fixed position
- Gallery pages (`Computational Design.html`, `art.html`, `exhibitions.html`): coverflow 3D carousel with `requestAnimationFrame`, `AUTO_SPEED: 0.002`, scroll-to-rotate interaction; scroll hint pill sits as a flex sibling **below** `.gallery-stage` (not inside it)
- Breakpoints: 700px (mobile), 1200px (tablet)

### Exhibitions Modal

`exhibitions.html` uses an in-page fullscreen modal (not a separate page). When a card is clicked, the modal opens with a carousel of images and metadata injected via JS. The modal title should be uppercase, weight 900, `clamp(2rem, 4vw, 3.5rem)`. Metadata uses Fira Mono label+value columns — no Font Awesome icon elements.

## Important Conventions

- The `architecture/` directory contains pages that are intentionally **hidden** from navigation. Do not re-expose these without confirmation.
- Each HTML page manually includes `<script src="js/theme.js">` and applies the saved theme in an inline script to prevent FOUC.
- Images live under [img/](img/) organized by project name — add new project images to a matching subfolder.
- When editing gallery pages, always read the file first — CSS and JS are inline and scroll-hint positioning is sensitive (must be a flex sibling of `.gallery-stage`, not a child).
