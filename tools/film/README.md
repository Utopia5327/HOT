# Film recorder

Renders a cinematic walkthrough of the 3D gallery to an MP4, offline.

This is a **development tool**. Nothing in `tools/` is linked from the site or
needed to serve it, and the recorder never runs in a visitor's browser.

## Recording

```bash
cd tools/film
npm install          # once — pulls an ffmpeg binary
cd ../..

node tools/film/record.mjs                     # the full 75s film at 1920×1080
```

The finished file lands in `tools/film/out/portfolio-film.mp4`. Expect the scene
to take about a minute to build, then roughly 12 frames a second — about six
minutes for the full 75 seconds.

The rendered JPEG frames are left in `out/frames/`, so a second encode at a
different weight costs seconds rather than another full render:

```bash
tools/film/node_modules/ffmpeg-static/ffmpeg.exe -framerate 30   -i tools/film/out/frames/%06d.jpg   -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -profile:v high   -movflags +faststart tools/film/out/portfolio-film-web.mp4
```

At CRF 20 the film is around 110 MB — an archival master. CRF 27 brings it to
roughly 28 MB with no visible loss at 1080p, which is the one to embed. The
foliage is what costs the bitrate.

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--width` / `--height` | `1920` / `1080` | Output resolution |
| `--fps` | `30` | Output frame rate |
| `--out` | `portfolio-film.mp4` | File name inside `out/` |
| `--crf` | `20` | x264 quality; lower is better and bigger |
| `--shot <n\|name>` | — | Record one shot only, e.g. `--shot fire-court` |
| `--contact-sheet` | — | Stills instead of video, for reviewing framing |
| `--every <n>` | `15` | With `--contact-sheet`, sample every nth frame |
| `--port` | `8791` | Local server port |

Review framing before committing to a full render — a mis-aimed shot is much
cheaper to find in stills than in a finished file:

```bash
node tools/film/record.mjs --contact-sheet --every 90 --width 960 --height 540
node tools/film/record.mjs --shot courtyard-dusk        # then re-cut one shot
```

## The cut

`shots.js` holds the whole film: nine shots, ~75 seconds, opening on an aerial
in afternoon light and closing over the lit fire court at dusk. Each shot
declares its duration, its lens, the dusk amount at its start and end, and a
`frame(u)` returning an eye and a target.

Camera positions resolve against anchors the scene exports — `campus.spots`,
`campus.bridgeCurve`, `campus.routeEye`, the banyan and fire-circle constants —
rather than hardcoded coordinates, so the film follows the model when the model
moves. To re-cut, edit `shots.js` and re-run; nothing else needs to change.

## How it works

`record.mjs` serves the repo, opens `film.html` in headless Chromium, and steps
it one frame at a time: set the camera and the daylight for frame *n*, render,
screenshot the canvas, repeat. ffmpeg then encodes the frames to H.264.

Nothing is tied to a wall clock. A frame that takes two seconds to render still
occupies 1/30s of film, so the result never stutters no matter how heavy the
scene gets. `realism.update()` is advanced by a fixed delta and the handheld
float is a function of frame index, so re-running produces the same film.

### Two things that are deliberate, not accidental

**Frames are captured one round trip at a time.** Batching the loop inside the
page is far faster on paper, and it reliably kills the renderer process at the
first batch boundary on this hardware. So does an in-page `VideoEncoder`
(WebCodecs), which was the original design — a hardware *or* software encoder
alongside a WebGL context this large does not survive here, and it dies without
a recoverable error. Capturing frames and encoding out of process is slower and
has never dropped one.

**The page is served from inside the scene's own URL space.** `film.html` lives
in `tools/film/` but is served at `/explore/scene/film.html`, with its own
modules under `/explore/scene/__film/` (see `serve.mjs`). The scene loads assets
with document-relative paths and several data modules bake those strings in, so
the recorder has to sit where the real gallery sits for `./assets/…` to resolve.

### Lighting

The rig lives in `explore/scene/lighting.js` and is shared with the live
gallery, so the film and the site cannot drift apart. `applyDaylight(amount)`
takes 0 (afternoon) to 1 (dusk); the gallery only ever passes 0 or 1, while the
film moves continuously through the evening across shots 3–7.

All artwork is loaded up front rather than streamed in on approach the way the
gallery does it — the camera crosses the whole site in 75 seconds, so every
board has to be populated before the first frame or the exhibits record blank.
