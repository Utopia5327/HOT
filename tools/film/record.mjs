import path from 'node:path';
import {mkdir, writeFile, rm, stat} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {existsSync, readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {startServer} from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');

// Borrow whatever Chromium is already on the machine rather than installing a
// second copy: the CodeGPT extension ships patchright, and a plain playwright
// install works too. Nothing here is specific to this repo.
function loadBrowser() {
  const roots = [];
  for (const base of [join(homedir(), '.vscode-server/extensions'), join(homedir(), '.vscode/extensions')]) {
    if (!existsSync(base)) continue;
    const newest = readdirSync(base)
      .filter(d => d.startsWith('danielsanmedium.dscodegpt-'))
      .sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}))
      .pop();
    if (newest) roots.push(join(base, newest, 'standalone') + '/');
  }
  roots.push(process.cwd() + '/', HERE + '/');
  for (const root of roots) {
    for (const id of ['patchright', 'playwright']) {
      try {
        const mod = createRequire(root)(id);
        const chromium = mod?.chromium ?? mod?.default?.chromium;
        if (chromium) return {chromium, root, id};
      } catch { /* try the next root */ }
    }
  }
  throw new Error('Could not resolve patchright or playwright. Checked:\n  ' + roots.join('\n  '));
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i === -1 ? fallback : (args[i + 1] ?? true);
};
const has = name => args.includes('--' + name);

const WIDTH = +flag('width', 1920), HEIGHT = +flag('height', 1080);
const PORT = +flag('port', 8791);
const BATCH = +flag('batch', 30);
const FPS_OUT = +flag('fps', 30);
const CRF = String(flag('crf', 20));

async function main() {
  await mkdir(OUT, {recursive: true});
  const outFile = path.join(OUT, flag('out', 'portfolio-film.mp4'));
  const server = await startServer({port: PORT, outFile});
  const {chromium, id} = loadBrowser();
  console.log('Using ' + id + '.');
  // Same launch profile the browser-automation skill uses, which is known to
  // bring up a real ANGLE context on this machine.
  const browser = await chromium.launch({
    headless: true,
    channel: 'chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']
  });
  // The viewport must match the render size. An element screenshot is clipped to
  // the viewport, so a canvas larger than it comes back with the overflow as
  // black bars — which is exactly what a 1920x1080 render in a 1280x720 window
  // produced.
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: {width: WIDTH, height: HEIGHT},
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', e => problems.push(String(e)));
  page.on('crash', () => problems.push('renderer process crashed'));

  const url = `http://localhost:${PORT}/explore/scene/film.html?w=${WIDTH}&h=${HEIGHT}`;
  console.log('Loading scene (this takes a minute) …');
  await page.goto(url, {waitUntil: 'load', timeout: 180000});
  await page.waitForSelector('html[data-ready]', {timeout: 600000});
  const ready = await page.getAttribute('html', 'data-ready');
  if (ready !== '1') throw new Error('Scene failed to build: ' + await page.getAttribute('html', 'data-error'));

  const timeline = JSON.parse(await page.getAttribute('html', 'data-timeline'));
  console.log(`Timeline: ${timeline.shots.length} shots, ${timeline.totalFrames} frames, ${timeline.seconds.toFixed(1)}s @ ${timeline.fps}fps`);

  if (has('contact-sheet')) { await contactSheet(page, timeline, +flag('every', 15)); }
  else { await record(page, timeline); }

  await browser.close();
  server.close();
  if (problems.length) console.log('Page reported:\n  ' + problems.slice(0, 10).join('\n  '));
}

// Stills for review, so a mis-framed shot is caught before a full render.
async function contactSheet(page, timeline, every) {
  const dir = path.join(OUT, 'contact');
  await mkdir(dir, {recursive: true});
  const wanted = [];
  for (const shot of timeline.shots) {
    for (let f = shot.start; f < shot.end; f += every) wanted.push(f);
    wanted.push(shot.end - 1);
  }
  console.log(`Contact sheet: ${wanted.length} stills …`);
  for (const frame of wanted) {
    await page.evaluate(f => {
      document.documentElement.dataset.still = String(f);
      document.dispatchEvent(new CustomEvent('film-still'));
    }, frame);
    const url = await page.getAttribute('html', 'data-stillurl');
    const name = await page.getAttribute('html', 'data-stillshot');
    await writeFile(path.join(dir, `${String(frame).padStart(5, '0')}-${name}.png`),
      Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('Stills written to ' + dir);
}

async function record(page, timeline) {
  const only = flag('shot', null);
  let from = 0, to = timeline.totalFrames;
  let name = flag('out', 'portfolio-film.mp4');
  if (only !== null) {
    const shot = timeline.shots[+only] || timeline.shots.find(s => s.name === only);
    if (!shot) throw new Error('No such shot: ' + only);
    from = shot.start; to = shot.end;
    if (!args.includes('--out')) name = `shot-${shot.name}.mp4`;
    console.log(`Recording shot "${shot.name}" only (frames ${from}–${to}).`);
  }

  const frameDir = path.join(OUT, 'frames');
  await rm(frameDir, {recursive: true, force: true});
  await mkdir(frameDir, {recursive: true});

  // One frame at a time, each its own round trip. A batched in-page loop is
  // faster on paper and reliably crashes the renderer on this machine; this
  // path has never dropped a frame.
  const canvas = page.locator('canvas');
  const started = Date.now();
  for (let frame = from; frame < to; frame++) {
    await page.evaluate(f => {
      document.documentElement.dataset.frame = String(f);
      document.dispatchEvent(new CustomEvent('film-render'));
    }, frame);
    const error = await page.getAttribute('html', 'data-error');
    if (error) throw new Error('Render failed at frame ' + frame + ': ' + error);
    await canvas.screenshot({
      path: path.join(frameDir, String(frame - from).padStart(6, '0') + '.jpg'),
      type: 'jpeg', quality: 95
    });
    const done = frame - from + 1, elapsed = (Date.now() - started) / 1000, rate = done / elapsed;
    if (done % 5 === 0 || done === to - from) {
      process.stdout.write(`\r  ${done}/${to - from} frames · ${rate.toFixed(1)} fps · eta ${Math.round((to - from - done) / Math.max(rate, .01))}s   `);
    }
  }
  process.stdout.write('\n');
  return encode(frameDir, path.join(OUT, name));
}

// H.264 High, yuv420p, faststart: plays everywhere and streams from a web
// server without downloading the whole file first.
function encode(frameDir, outFile) {
  console.log('Encoding with ffmpeg …');
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      '-y', '-framerate', String(FPS_OUT),
      '-i', path.join(frameDir, '%06d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF,
      '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-movflags', '+faststart',
      outFile
    ], {stdio: ['ignore', 'ignore', 'pipe']});
    let err = '';
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', async code => {
      if (code !== 0) return reject(new Error('ffmpeg exited ' + code + '\n' + err.slice(-1500)));
      const {size} = await stat(outFile);
      console.log(`Wrote ${outFile} — ${(size / 1e6).toFixed(1)} MB.`);
      resolve();
    });
  });
}

main().catch(e => { console.error(e); process.exit(1); });
