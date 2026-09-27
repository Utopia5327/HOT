# Navigation and portfolio browsing update

This update builds on the complete courtyard/plan/media update already published. It does not rebuild or replace the prepared campus models, project images, videos or project-detail pages.

## Changes

- Landing has two explicit routes: **Explore in 3D — Walk through the gallery** and **Browse portfolio — Open project pages**. The name still opens the portfolio. The original animated background, typography, theme control and name transition remain. The existing local logo font is now declared on the landing page too. The landing does not preload the 3D model.
- Computational Design, Art and Exhibitions reserve separate layout rows for their introduction, rotating cards and instructions. Card size and spacing adapt to the actual available stage, with the stage clipped to keep perspective transforms and shadows clear of text. Short screens can scroll normally.
- Desktop instructions read **Scroll to browse projects**, with a center-card opening hint; touch devices read **Swipe to browse projects / Tap the center card to open**, with a horizontal swipe icon. Horizontal touch swipes and arrow keys browse the carousel. Vertical touch movement remains available for page scrolling. Gestures are scoped to the gallery rather than intercepting the whole page or the exhibition detail window. Side-card clicks continue to center the card first. Swiping does not open a project accidentally. Existing card content, links, automatic motion and page backgrounds are retained; reduced-motion users get a stationary carousel they can browse manually.
- Dragging the view cube rotates the model with mouse or touch, including after selecting Plan or an elevation. Releasing a drag does not snap to a face. Face/compass clicks still align the view, Plan retains its separate architectural drawing, and the 3D shortcut returns to the overall perspective.
- Elevations now show a local site cut with a continuous soil profile instead of looking through the underside of a one-sided uphill terrain sheet. Peripheral hillside/forest objects outside that cut are hidden for these model views. This is a presentation cut, not a survey or a change to the walkable terrain. Returning to perspective or walking restores the complete original hillside and context. The section surface reuses the existing terrain material and needs no new image/model downloads.

## Verification

- Current live landing and all three category pages matched the repository baseline before editing.
- Landing routes tested with mouse/keyboard at 1536 × 864, 390 × 844 and 360 × 640 in both themes; original animation retained and no automatic scene download.
- All three coverflows checked throughout a full rotation at desktop, short laptop, phone and landscape-phone sizes, in both themes. Cards stay below descriptions and above the instructions.
- Native touch swipes rotate without triggering a project. Keyboard opening, side-card centering, original project destinations and exhibition-modal opening/scrolling/closing pass in Chromium.
- View-cube mouse/touch drag, pointer capture outside the cube, release without snapping, immediate compass selection, rotation from Plan and restoration of full terrain on walking pass in Chromium. Plan pan/zoom, scale/legend behavior and themes continue to pass.
- North and east elevation renders, desktop/mobile landing and carousel renders reviewed.

Focused checks: `scripts/check-gallery-browser.mjs`, `scripts/check-landing-entry.mjs`, `scripts/check-architectural-plan.mjs`. Set `PLAYWRIGHT_MODULE` and optionally `CHROME_PATH` for the installed browser runtime. The first two can use `LANDING_P5_PATH` for an offline copy of the existing p5 dependency. Screenshots are optional via `GALLERY_SCREENSHOT_DIR` / `LANDING_SCREENSHOT_DIR`; elevation review uses `scripts/render-gallery-review.mjs` with `MODEL_VIEWS=north,east`.

No changes are published automatically by this package. The earlier remote-video playback limitations and provider-dependent fallback behavior remain as documented in `gallery-update-2026-09.md`.
