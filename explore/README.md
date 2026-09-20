# Spatial gallery integration

The existing portfolio remains the primary site. `index.html`, the landing animation,
the computational design carousel, the Art / Exhibitions / Press / About pages,
project pages, shared theme and footer are retained. The shared navigation dock has
one additional destination, **Explore in 3D**. The landing has a small desktop link.

## Hosting

This is a static GitHub Pages directory; no server, build process, service worker or
additional hosting provider is required. `/explore/` loads the existing `header.html`
and `js/theme.js`. The tested v16 gallery is self-hosted in an isolated same-origin
iframe at `/explore/scene/`, so its CSS cannot restyle the portfolio.

No existing page imports Three.js or downloads scene assets. Mobile screens (up to
820 CSS pixels) and data-saving connections see a project-index link and an explicit
3D opt-in. Unsupported WebGL or scene failures offer the original portfolio. High
and medium prebuilt models are separate: each visit loads only the selected quality.
Videos remain proximity / gaze controlled, with sound off until explicitly enabled.
The heavy assets total roughly 43 MB on disk; a visit does not download all of them.
The initial compressed model is about 13 MB on desktop, so first load depends on the
connection; no image-quality reduction was introduced by this integration.

## Project navigation

`project-links.js` is the allowlist of the thirteen original project-page URLs.
The frame sends a project ID; the host validates both the message source and origin
and navigates to that original page with `?gallery=<id>`. The shared dock then labels
its gallery link **Return to 3D**, opening `/explore/?project=<id>` at that exhibit.
Direct visits to native project URLs keep their usual behavior. The existing project
pages remain the single source for detailed text, galleries and video embeds.

The existing theme is passed into the frame. Opening the website dock, hiding the
page or leaving the gallery pauses scene movement and media. The original website
navigation stays above the scene while 3D controls stay inside it.

## Updating the building or media

`scene/` contains the approved Contour gallery from source commit
`b8c319c106d0b78ba5cf73d647a4393120036888`. `scene/gallery.js` is its adapted entry point;
keep the host messaging contract when updating it. Runtime project metadata is in
`scene/projects.js` and `scene/media-catalog.js`. Prebuilt geometry is in
`scene/assets/campus/`; it includes the v16 roof, entrance and balcony corrections.
If geometry changes, regenerate the prebuilt scene assets from the Contour source
and update its campus manifest together. Editing a procedural fallback alone does
not update the prebuilt scene. Third-party licenses and material-source attributions
are retained next to the assets.

## Verification

From the repository root, run `python -m http.server 8765`. With Playwright and its
Chromium browser installed, run `node scripts/check-spatial-integration.mjs`.
`PLAYWRIGHT_MODULE` may point to an existing Playwright package and `SITE_URL` may
point to a different local server. `CHROME_PATH` can select an existing Chromium binary. The check covers native routes, mobile/no-WebGL
fallbacks, message validation, project return links, theme and menu synchronization,
and an actual full model load with all thirteen exhibit destinations.

DOM/asset checks can also run without a browser. With jsdom installed, run
`node --experimental-vm-modules scripts/check-spatial-contract.mjs`.
`JSDOM_MODULE` can point to an existing jsdom installation. These checks exercise
the real host module and shared header, but are not a substitute for the visual
browser check above.
