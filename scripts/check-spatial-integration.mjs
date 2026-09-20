// Run against `python -m http.server 8765` with Playwright installed.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {PROJECT_LINKS, projectURL} from '../explore/project-links.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8765';
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const check = (name, details = '') => console.log(`PASS ${name} ${details}`);
try {
  for (const [id,path] of Object.entries(PROJECT_LINKS)) {
    assert.equal((await fetch(base + path)).status,200, path);
    assert.equal(projectURL(id,base).pathname,path);
    assert.equal(projectURL(id,base).searchParams.get('gallery'),id);
  }
  assert.equal(projectURL('__proto__',base),null);
  assert.equal(projectURL('https://example.com',base),null);
  check('All 13 original project routes and allowlist');

  const mobile = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const m = await mobile.newPage();
  const sceneRequests = [];
  m.on('request', r => {if (/scene\/(?:index|gallery|assets\/(?:campus|three|films))/.test(r.url())) sceneRequests.push(r.url());});
  await m.goto(base+'/explore/');
  await m.waitForSelector('#fluidDock');
  assert.equal(await m.locator('iframe').count(),0);
  assert.equal(await m.locator('#launch-gallery').isVisible(),true);
  await m.locator('.dock-toggle').click();
  await m.waitForFunction(() => document.querySelector('#fluidDock').dataset.expanded==='true');
  assert.equal(await m.locator('#spatial-gallery-link').getAttribute('href'),'/explore/');
  assert.equal(await m.locator('.dock-secondary').count(),6);
  assert.equal(sceneRequests.length,0);
  check('Mobile keeps original portfolio available and downloads no 3D runtime/model/media');
  await m.screenshot({path:'/tmp/hot-mobile.png'});
  await mobile.close();

  const unavailable = await browser.newPage({viewport:{width:1360,height:900}});
  await unavailable.addInitScript(() => {HTMLCanvasElement.prototype.getContext=()=>null;});
  await unavailable.goto(base+'/explore/');
  await unavailable.waitForFunction(()=>document.querySelector('#entry-message').textContent.includes('unavailable'));
  assert.equal(await unavailable.locator('iframe').count(),0);
  check('WebGL unavailable fallback');
  await unavailable.close();

  // Simulate the small messaging contract before loading the real model below.
  const contract = await browser.newPage({viewport:{width:1360,height:900}});
  await contract.route('**/explore/scene/index.html*', route => route.fulfill({contentType:'text/html',body:`<script>parent.postMessage({type:'spatial:ready'},location.origin);addEventListener('message',e=>{window.lastMessage=e.data;window.messages=(window.messages||[]).concat([e.data]);});</script>`}));
  await contract.goto(base+'/explore/?project=tensilebloom');
  await contract.waitForSelector('body.gallery-ready');
  await contract.waitForSelector('#fluidDock');
  assert.match(await contract.locator('#gallery-frame').getAttribute('src'),/#project=tensilebloom$/);
  const child = contract.frames().find(f=>f.url().includes('/scene/'));
  await contract.locator('.theme-btn').click();
  await child.waitForFunction(()=>window.messages?.some(m=>m.type==='spatial:theme'&&m.theme==='dark'));
  await contract.locator('.dock-toggle').click();
  await child.waitForFunction(()=>window.lastMessage?.type==='spatial:pause'&&window.lastMessage.paused);
  assert.equal(await contract.locator('#gallery-frame').evaluate(el=>el.inert),true);
  await contract.keyboard.press('Escape');
  await child.waitForFunction(()=>window.lastMessage?.type==='spatial:pause'&&!window.lastMessage.paused);
  const previous = contract.url();
  await contract.evaluate(()=>window.postMessage({type:'spatial:open-project',projectId:'tensilebloom'},location.origin));
  assert.equal(contract.url(),previous,'Ignore messages not sent by the gallery iframe');
  await child.evaluate(()=>parent.postMessage({type:'spatial:open-project',projectId:'https://evil.invalid/'},location.origin));
  assert.equal(contract.url(),previous,'Ignore unknown project identifiers');
  // Avoid loading large original-page media: navigation itself is what is under test.
  await contract.route('**/projects/project5.html*', async route => {
    const original = await readFile(new URL('../projects/project5.html',import.meta.url),'utf8');
    assert.ok(original.includes('<html'));
    await route.fulfill({contentType:'text/html',body:'<div id="header-container"></div><script>fetch("/header.html").then(r=>r.text()).then(h=>{const c=document.querySelector("#header-container");c.innerHTML=h;for(const s of c.querySelectorAll("script:not([src])")){const n=document.createElement("script");n.textContent=s.textContent;s.replaceWith(n);}})</script>'});
  });
  await child.evaluate(()=>parent.postMessage({type:'spatial:open-project',projectId:'tensilebloom'},location.origin));
  await contract.waitForURL('**/projects/project5.html?gallery=tensilebloom');
  await contract.waitForSelector('#spatial-gallery-link');
  assert.equal(await contract.locator('#spatial-gallery-link').getAttribute('href'),'/explore/?project=tensilebloom');
  check('Shared theme, menu pause/resume, trusted native navigation, return to exhibit');
  await contract.close();

  const failed = await browser.newPage();
  await failed.route('**/explore/scene/index.html*', route=>route.fulfill({contentType:'text/html',body:`<script>parent.postMessage({type:'spatial:error'},location.origin)</script>`}));
  await failed.goto(base+'/explore/');
  await failed.waitForFunction(()=>document.querySelector('#entry-message').textContent.includes('could not load'));
  assert.equal(await failed.locator('iframe').count(),0);
  assert.equal(await failed.locator('#launch-gallery').isVisible(),true);
  check('Failed scene offers project index and retry');
  await failed.close();

  const desktop = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];const missing=[];
  desktop.on('pageerror', e=>errors.push(e.message));
  desktop.on('response', r=>{if(r.url().startsWith(base+'/explore/')&&r.status()>=400)missing.push(r.url());});
  await desktop.goto(base+'/explore/?project=tensilebloom');
  await desktop.waitForSelector('body.gallery-ready',{timeout:180000});
  const scene = desktop.frames().find(f=>f.url().includes('/scene/'));
  await scene.waitForFunction(()=>document.querySelector('#nearby-title')?.textContent==='TensileBloom',{timeout:30000});
  assert.equal(await scene.locator('#viewport canvas').count(),1);
  assert.equal(await scene.locator('.view-cube').count(),1);
  await desktop.screenshot({path:'/tmp/hot-gallery.png'});
  await scene.locator('#menu-btn').click();
  await scene.locator('#gallery-list-btn').click();
  assert.equal(await scene.locator('[data-gallery]').count(),13);
  await scene.locator('[data-gallery="google-unfold"]').click();
  await scene.waitForFunction(()=>document.querySelector('#nearby-title')?.textContent==='Google UnFold');
  assert.deepEqual(missing,[]);
  assert.deepEqual(errors,[]);
  check('Real Three.js scene, compressed model, 13 exhibits, gallery controls, project jump');
  await desktop.close();
} finally {await browser.close();}
