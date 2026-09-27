# Courtyard and architectural plan update

The courtyard timber bridge is replaced by a ground-supported, curved promenade with 42 shallow landscape steps and level junctions to a direct west–east crossing, upper exhibition walk and short lower viewing spur. Redundant southeast circulation is removed. The screens face their viewing zones and clear the full path width. Project 05 moves to the outer edge of its gallery. The revised landscape adds warm aggregate paths, stone steps, curved retaining ribbons, layered planting beds and planted shoulders. Four rock outcrops emerge from irregular excavated seams and groundcover. A recessed flagstone fire court has an embracing retaining wall and a three-step entrance from the walking route. The banyan and pond sit clear of the circulation. These outcrops are conceptual landscape elements, not a claim about surveyed site conditions. No loose furniture or potted gallery plants are added.

Plan view is a dedicated architectural drawing generated from the prepared model: gallery floors, entrances, actual treads, balconies and display panels are projected into a separate unlit scene. Wall poche, fine glazing and paving lines, dashed roof projections, contour lines, tree-canopy symbols and planting symbols form the drawing. Path edges are joined at intersections so separate route meshes do not show as overlapping circular pads. This is a combined plan of the terraced gallery and garden; roof-level exhibits remain in the 3D view.

All nine main gallery and garden flights now use continuous bowed tread boundaries, with 132 actual flat treads and equal risers within each flight. The plan draws these same boundaries and gives each flight one uphill arrow. The main foyer is flat and aligned to the approach; the approach is correctly drawn as a ramp.

Plan keeps a warm white paper background in both afternoon and dusk. Dragging pans without rotating, scrolling zooms, and the north arrow and metric scale accompany the view. The scale selects a readable distance as zoom changes. Both the architectural plan and the Controls map include expandable project/symbol legends, a north arrow and a metric scale. The Controls map uses equal X/Z scaling (2.2 pixels per metre, a 50 m bar); its legend includes the roof exhibit. Project pins in Plan sit beside their real display panels. The twelve gallery/courtyard project numbers stay visible and take visitors into the matching exhibit. Switching to elevations or walking restores the normal 3D scene. The drawing module loads on the first Plan selection and is reused afterward; it needs no texture downloads, lighting or shadow rendering.

Warm ivory gallery floors, sage planting, stone-course garden paving, ochre fire-court flagstones and muted blue water form the shared drawing/material palette. Lightweight analytical paving joints add texture without another asset download.

The planting shares one small instanced leaf geometry, with compact transforms and a restrained color palette. The added landscape lights reuse emissive materials rather than adding a new set of real-time lights.

Terrace and courtyard stair guards now use instanced brick jaali matching the existing balcony material, with stone coping. Brick courses follow the incline and retain their perforations. The shared navigation collision data includes these guards, the rock outcrops and the fire bowl.

Façade dragon scales fit to the roof at their actual position, including the outward row offset. The top row keeps a 120 mm modeled clearance. All pitched and flat roof undersides share a textured ceiling bounce treatment, adjusted for afternoon and dusk without adding ceiling point lights.

YouTube players attach to their final CSS3D DOM parent before the IFrame API initializes. Posters stay visible until playback starts. Load and playback watchdogs replace endless loading with an actionable fallback. Film playback still requires standing in the viewing zone and facing the screen; sound remains opt-in and proximity-controlled.

All seven exhibits without films have five slides. Slides advance every 2.5 seconds with a 0.3-second fade, using wall-clock time rather than the movement simulation's capped delta. Only nearby, visible boards request the next slide. The 19 added optimized images total about 3.4 MB; they are not all loaded at startup. NYC Carbon Atlas uses its complete presentation boards plus two detailed crops. Source image paths and crop bounds are in `explore/scene/assets/projects/carousel-sources.json`.

The earlier controls update is included: Exploded view and Afternoon/Dusk switches, no repeated name at the top of Controls, and two-way synchronization with the main navigation's theme button. Existing pages, navigation markup, branding and project links are retained.

## Verification

- Both prepared model qualities decode and retain all 13 project routes.
- 360 façade modules / 71,280 tested vertices: no roof crossings, minimum clearance 120 mm.
- 996 route samples per model quality: continuous walking surfaces and no masonry, tree or pond conflicts; all project standing zones clear.
- Eleven jaali runs, four outcrops and 42 central landscape steps confirmed in the prepared models.
- Nine bowed stair flights: 132 flat treads / 12,672 upward-facing triangles with no folds. Walking heights match the gallery treads. All full courtyard exhibit frames clear the circulation and project 05 clears the outer glazing by at least 0.25 m.
- New planting centers clear the circulation, pond, fire-court approach and exhibit sightlines; retaining walls are included in the navigation collision checks.
- Actual browser navigation checked: Plan pan without tilt, zoom and scale updates, theme changes, elevation selection, project entry, narrow-screen legend and restoration of the 3D materials and roof. No browser errors.
- Browser checks: iframe connected before player initialization, start/pause/return/facing behavior, opt-in sound, stalled loading and autoplay fallback.
- A real local MP4 decoded and advanced in Chromium. The remote YouTube service was mocked for deterministic startup tests; live provider playback should be checked after publication.
- Browser carousel checks: 2.5-second advance, failed-image skip, nearby loading and texture disposal.
- Desktop and narrow-screen controls, saved theme, navigation/view cube behavior, keyboard switches, reduced-motion loader and 4.5:1 text contrast checked.
- Rendered and reviewed the courtyard plan, courtyard perspective, stair jaali and ceilings in both lighting modes.

Prepared download sizes: high 14,667,263 bytes (14.0 MiB); medium 13,273,052 bytes (12.7 MiB). The existing mobile/data-saving fallback remains in place. These are model sizes, not the whole page transfer size.

## Rebuilding and checking

Run `node scripts/prepare-campus.mjs` after changing procedural geometry or exhibit metadata. It synchronizes worker sources, builds both model qualities, compacts shared geometry and updates the content-addressed model manifest. Browser source files alone do not update the normally loaded prepared model.

Geometry checks: `node scripts/check-roof-clearance.mjs` and `node scripts/check-courtyard-layout.mjs`, plus `node scripts/check-stair-circulation.mjs`.

The DOM contract check requires jsdom (`JSDOM_MODULE`) and `node --experimental-vm-modules scripts/check-spatial-contract.mjs`. Browser checks use Playwright (`PLAYWRIGHT_MODULE`) and optionally `CHROME_PATH`: `scripts/check-exhibit-media.mjs`, `scripts/check-gallery-ui.mjs` and `scripts/check-architectural-plan.mjs`. Static review renders are generated by `scripts/render-gallery-review.mjs` (`MODEL_SCREENSHOT_DIR`, optional comma-separated `MODEL_VIEWS`).
