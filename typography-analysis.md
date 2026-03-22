# Typography Analysis — Manas Bhatia Portfolio Website

## Unified Type System (Post-Refactor)

Applied 2026-03-22. All pages now follow this single typographic specification.

### Font Families
| Role | Stack |
|------|-------|
| **Display** (hero/brand name only) | `'Asher Punk Demo Version', 'Asher Punk', Arial, sans-serif` |
| **Editorial** (all headings, nav, titles) | `'Inter', 'General Sans', Arial, sans-serif` |
| **Mono** (labels, metadata, captions, buttons, footer, scroll hint) | `'Fira Mono', 'Courier New', monospace` |

### Type Scale
| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| Hero (landing name) | — | `clamp(3rem, 8vw, 9rem)` | Asher Punk brand name on landing page only |
| Page title (h1 overview) | `--type-hero` | `clamp(3.5rem, 5.5vw, 6rem)` | All overview page h1s (Computational Design, Art, Exhibitions, Press, About name) |
| Project hero title | `--type-2xl` | `clamp(3rem, 6vw, 6rem)` | Project/art detail page hero h1 |
| Section heading | `--type-lg` | `clamp(1.6rem, 2.5vw, 2.4rem)` | h2 section titles inside project pages |
| Sub-heading | `--type-sub` | `1.1rem` | h3, strong headings |
| Body | `--type-base` | `clamp(0.95rem, 1.1vw, 1.1rem)` | All body paragraphs and descriptions |
| Label / meta value | `--type-label` | `0.75rem` | Fira Mono values (year, location, tools list) |
| Tag / UI label | `--type-tag` | `0.62rem` | Fira Mono uppercase tags, metadata keys, nav dock labels |
| Caption / footnote | `--type-xs` | `0.58rem` | Figcaptions, fine-print, footer copyright |

### Font Weights
| Weight | Usage |
|--------|-------|
| `900` | Page titles, project hero titles (Inter) |
| `700` | Gallery card titles, section headings within cards |
| `600` | Section headings (h2/h3 in body content) |
| `500` | Nav links, sub-labels |
| `400` | All body text, Fira Mono labels/metadata |

### Letter Spacing
| Value | CSS Variable | Usage |
|-------|-------------|-------|
| `-0.04em` | `--letter-tight` | All titles weight 900 |
| `-0.02em` | `--letter-heading` | Section headings weight 600–700 |
| `0` | — | Body text |
| `0.12em` | `--letter-wide` | Fira Mono UI labels (tag/UI label size) |
| `0.18em` | `--letter-fine` | Fira Mono fine labels (caption/footnote size) |

### Line Heights
| Value | Usage |
|-------|-------|
| `0.92` | Display/hero (weight 900, large sizes) |
| `1` | Sub-headings |
| `1.5` | Compact lists, metadata, mono labels |
| `1.75` | Body text everywhere |

### Files Updated
- `css/project.css` — CSS custom property scale updated to match unified tokens
- `header.html` — Logo and dock label fonts standardised
- `footer.html` — Email link and copyright standardised
- `landing.html` — Hero name, role label, subtitle, stats bar standardised
- `Computational Design.html` — Page title (clamp replaces raw 6vw), description, gallery, card overlay
- `art.html` — Page title, description, gallery, card overlay, scroll hint
- `exhibitions.html` — Page title, description, gallery, card overlay, modal text
- `press-media.html` — Page title (clamp replaces raw 6vw), description, news cards, stat labels
- `about.html` — Name header, role label, bio, press grid, footer
- `projects/project1.html` — Inline `.framer-text` replaced with CSS variable
- `art/art1.html` through `art/art5.html` — Hero title, subtitle, meta labels/values, buttons, section headings, body text, image grid titles

---

## 1. Global / Shared Fonts Loaded

### Google Fonts
- **Fira Mono** (weights: 400, 500)
  - Source: `https://fonts.googleapis.com/css2?family=Fira+Mono:wght@400;500&display=swap`
  - Used across: header.html, landing.html, css/project.css, about.html, art.html, exhibitions.html, press-media.html
  - Purpose: Monospace font for UI labels, metadata, code-like elements

- **Poppins** (weight: 300)
  - Source: `https://fonts.googleapis.com/css2?family=Poppins:wght@300&display=swap`
  - Used in: landing.html only
  - Purpose: Loaded but not prominently used in visible typography

### CDN Fonts
- **Asher Punk Demo Version** (weight: normal)
  - Source: `https://fonts.cdnfonts.com/css/asher-punk` + preloaded locally via `/fonts/AsherPunkDemoVersion.ttf`
  - Used in: header.html, landing.html, about.html
  - Purpose: Display/brand font for hero and name sections

### Fallback Stacks
| Role | Stack |
|------|-------|
| Body / UI | 'Inter', 'General Sans', Arial, sans-serif |
| Monospace | 'Fira Mono', 'Courier New', monospace |
| Display / Brand | 'Asher Punk Demo Version', 'Asher Punk', Arial, sans-serif |

---

## 2. Per-Page Typography Breakdown

### landing.html
| Element | Family | Size | Weight | Letter-spacing | Other |
|---------|--------|------|--------|----------------|-------|
| Name / Hero | Asher Punk | 8vw (12vw mobile) | 600 | -0.03em | uppercase, line-height 0.9 |
| Role label | Fira Mono | clamp(0.65rem, 0.9vw, 0.85rem) | 500 | 0.2em | uppercase, opacity 0.7 |
| Morphing subtitle | Fira Mono | clamp(0.6rem, 0.85vw, 0.82rem) | 400 | 0.22em | uppercase |
| Stats bar | Fira Mono | clamp(0.5rem, 0.65vw, 0.65rem) | 400 | 0.1em | opacity 0.45 |

### Computational Design.html
| Element | Family | Size | Weight | Letter-spacing | Other |
|---------|--------|------|--------|----------------|-------|
| Page title | Inter | 6vw | 900 | -0.04em | uppercase, line-height 1 |
| Description | Inter | clamp(0.95rem, 1.2vw + 0.3rem, 1.15rem) | 400 | 0.01em | line-height 1.65 |
| Nav links | Inter | 1.18rem | 500 | — | hover: #a3e635 |
| Gallery card index | Fira Mono | 0.55rem | 400 | 0.15em | uppercase, opacity 0.55 |
| Gallery card type | Fira Mono | 0.55rem | 400 | 0.08em | opacity 0.7 |
| Scroll hint | Fira Mono | 0.58rem | 400 | 0.18em | uppercase |

### about.html
| Element | Family | Size | Weight | Letter-spacing | Other |
|---------|--------|------|--------|----------------|-------|
| Name | Asher Punk | clamp(2.4rem, 5vw, 5.5rem) | 900 | -0.04em | uppercase, line-height 0.92 |
| Role label | Fira Mono | 0.65rem | 400 | 0.2em | uppercase, var(--text-muted) |
| Bio text | Inter | clamp(1rem, 1.1vw, 1.15rem) | 400 | — | line-height 1.8, max-width 80ch |
| Press labels | Fira Mono | 0.65rem | 400 | 0.24em | uppercase |
| Press items | Fira Mono | 0.7rem | 400 | 0.06em | uppercase, line-height 1.5 |

### art.html & exhibitions.html
| Element | Family | Size | Weight | Letter-spacing | Other |
|---------|--------|------|--------|----------------|-------|
| Page title | Inter | clamp(4rem, 6vw, 7rem) | 900 | -0.04em | uppercase, line-height 1 |
| Description | Inter | 0.9rem | 400 | 0.01em | line-height 1.7, opacity 0.85 |
| Card index | Fira Mono | 0.55rem | 400 | 0.15em | opacity 0.55 |
| Card title | Inter | 1rem | 700 | — | line-height 1.2 |
| Card type | Fira Mono | 0.55rem | 400 | 0.08em | opacity 0.7 |
| Scroll hint | Fira Mono | 0.58rem | 400 | 0.18em | uppercase |

### press-media.html
| Element | Family | Size | Weight | Letter-spacing |
|---------|--------|------|--------|----------------|
| Page title | Inter | 6vw | 900 | -0.04em |
| Nav links | Inter | 1.18rem | 500 | — |
| Metadata | Fira Mono | 0.7rem | 400 | varies |

### Project detail pages (projects/project1–9.html, art/art1–5.html)
| Element | Family | Size | Weight | Letter-spacing | Other |
|---------|--------|------|--------|----------------|-------|
| Hero title | Inter | clamp(3.5rem, 7vw, 6.5rem) | 900 | -0.04em | uppercase, line-height 0.92 |
| Hero description | Inter | var(--type-base) = 1rem | 400 | — | line-height 1.75 |
| Meta labels | Fira Mono | 0.65rem | 400 | 0.14em | uppercase |
| Meta values | Fira Mono | 0.85rem | 400 | — | line-height 1.5 |
| Body text | Inter | 1rem | 400 | — | line-height 1.75 |
| Sub-headings (strong) | Inter | var(--type-lg) = 1.8rem | 600 | -0.02em | — |
| Pull quotes (em) | Inter | var(--type-sm) = 0.875rem | 400 | — | var(--grey) |
| Section headings (h3) | Inter | 1.1rem | 600 | 0.08em | uppercase |
| Figcaptions | Fira Mono | var(--type-xs) = 0.7rem | 400 | 0.04em | — |
| CTA buttons | Fira Mono | 0.75rem | 400 | 0.14em | uppercase |

### header.html
| Element | Family | Size | Weight | Letter-spacing |
|---------|--------|------|--------|----------------|
| Logo text | Fira Mono | 0.7rem (0.65rem mobile) | 500 | 0.15em |
| Dock labels | Fira Mono | 0.6rem | 400 | 0.12em |

### footer.html
| Element | Family | Size | Weight | Letter-spacing |
|---------|--------|------|--------|----------------|
| Email link | Fira Mono | 0.75rem | 400 | 0.08em |
| Copyright | Fira Mono | 0.65rem | 400 | 0.1em |

### css/project.css (Shared CSS custom property scale)
```css
--type-xs:   0.7rem
--type-sm:   0.875rem
--type-base: 1rem
--type-md:   1.25rem
--type-lg:   1.8rem
--type-2xl:  clamp(2.5rem, 4vw, 3.5rem)
--type-hero: clamp(4rem, 8vw, 7rem)

--letter-tight: -0.04em
--letter-wide:  0.12em
```

---

## 3. Consolidated Summary

### All Unique Font Families
| Family | Role | Weights Used |
|--------|------|-------------|
| **Inter** | Primary body & editorial | 400, 500, 600, 700, 900 |
| **General Sans** | Fallback for Inter | — |
| **Fira Mono** | Metadata, labels, UI elements | 400, 500 |
| **Asher Punk Demo Version** | Brand / display headlines | normal (400) |
| **Poppins** | Loaded, minimal visible use | 300 |
| **Arial** | System fallback | — |
| **Courier New** | System monospace fallback | — |

### Size Scale
| Label | Value | Used For |
|-------|-------|----------|
| Extra small | 0.5rem – 0.65rem | Stats, footnotes |
| Small | 0.7rem – 0.875rem | Captions, metadata values |
| Base | 1rem | Body text, descriptions |
| Medium | 1.1rem – 1.25rem | Comfortable body text |
| Large | 1.8rem | Sub-headings |
| Heading (clamped) | clamp(2rem, 3vw, 2.8rem) | Section titles |
| Display (clamped) | clamp(3.5rem, 7vw, 6.5rem) | Project hero titles |
| Page headline | clamp(4rem, 6vw, 7rem) | Overview page titles |
| Hero | 8vw | Landing page name |

### Font Weights
| Weight | Usage |
|--------|-------|
| 300 | Poppins (unused visually) |
| 400 | Fira Mono body, Inter body, pull quotes |
| 500 | Fira Mono logo/dock, Inter nav links |
| 600 | Section headings, sub-headings |
| 700 | Gallery card titles |
| 900 | All major page/hero titles |

### Letter Spacing
| Range | Usage |
|-------|-------|
| -0.04em to -0.03em | Main titles (compression for editorial look) |
| -0.02em | Sub-headings |
| 0 – 0.01em | Body paragraphs |
| 0.06em – 0.1em | Monospace values and metadata |
| 0.12em – 0.18em | UI labels, nav, buttons |
| 0.2em – 0.24em | Fine-detail labels (role, press items) |

### Line Heights
| Value | Usage |
|-------|-------|
| 0.9 – 0.92 | Display / hero text |
| 1 | Section headings |
| 1.5 | Metadata lists |
| 1.65 – 1.7 | Descriptions on overview pages |
| 1.75 – 1.8 | Body text (projects, about) |

---

## 4. Inconsistencies

### Page Title Sizing Across Overview Pages
| Page | Size |
|------|------|
| Computational Design.html | `6vw` (bare vw, no clamp) |
| art.html | `clamp(4rem, 6vw, 7rem)` |
| exhibitions.html | `clamp(4rem, 6vw, 7rem)` |
| about.html (name) | `clamp(2.4rem, 5vw, 5.5rem)` |

> **Computational Design.html** uses a raw `6vw` without a clamp floor/ceiling — can become very small on narrow viewports.

### CSS Custom Property Adoption
- `css/project.css` defines a full typographic scale (`--type-xs` through `--type-hero`) that is only fully consumed by project/art detail pages.
- Overview pages (Computational Design, art, exhibitions) define typography inline without referencing the shared scale.

### Asher Punk Availability
- Loaded via CDN fonts AND preloaded locally in header.html
- Preload font is `.ttf`; if CDN is unavailable it falls back to Arial without a local web font backup for all pages (landing.html and about.html do not individually preload it).

---

## 5. Design System Notes

- **Three-tier typographic hierarchy**: Display (Asher Punk) → Editorial (Inter heavy/black) → UI/Metadata (Fira Mono)
- **Uppercase is the default**: 90%+ of visible text is `text-transform: uppercase`, reinforcing the computational/technical brand
- **Fluid sizing**: Heavy use of `clamp()` across all pages for device-agnostic scaling
- **Lime green (#a3e635)** is the only color accent, used exclusively on hover states — typography itself is monochromatic
- **OpenType features**: `font-feature-settings: "ss01", "cv01"` applied on landing and Computational Design pages for stylistic refinements
- **Fira Mono signal**: Its consistent use across all UI elements (labels, metadata, footers) creates a coding/precision aesthetic throughout
