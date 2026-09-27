import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep))throw 0;const info=await stat(p);res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Content-Length':info.size});createReadStream(p).pipe(res);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1536,height:864},reducedMotion:'reduce'}),base='http://localhost:'+server.address().port,errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 const p5=process.env.LANDING_P5_PATH?await readFile(process.env.LANDING_P5_PATH,'utf8'):'';
 await page.route('**/*',route=>{const u=route.request().url();if(u.startsWith(base))return route.continue();if(u.endsWith('/p5.js'))return route.fulfill({contentType:'text/javascript',body:p5});if(u.includes('fonts.googleapis.com'))return route.fulfill({contentType:'text/css',body:"@font-face{font-family:'Fira Mono';src:url('"+base+"/explore/scene/assets/fonts/fira-mono-1.ttf')}"});return route.fulfill({body:'',contentType:'text/css'});});
 await page.route(base+'/Computational%20Design.html',r=>r.fulfill({contentType:'text/html',body:'<title>Portfolio route</title>'}));
 await page.route(base+'/explore/',r=>r.fulfill({contentType:'text/html',body:'<title>3D entry route</title>'}));
 const shots=process.env.LANDING_SCREENSHOT_DIR;if(shots)await mkdir(shots,{recursive:true});
 for(const [width,height] of [[1536,864],[390,844],[360,640]])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height});await page.goto(base+'/landing.html',{waitUntil:'networkidle'});await page.evaluate(t=>{localStorage.setItem('theme',t);initializeTheme();},theme);await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.entry-choice').count(),2);
  for(const el of await page.locator('.entry-choice').all()){assert.ok(await el.isVisible());const r=await el.boundingBox();assert.ok(r.height>=44&&r.x>=0&&r.x+r.width<=width&&r.y+r.height<=height,'Entry choice fits initial viewport');}
  assert.equal(await page.locator('.spatial-entry').getAttribute('href'),'explore/');assert.equal(await page.locator('.portfolio-entry').getAttribute('href'),'Computational%20Design.html');
  assert.ok(await page.locator('.entry-prompt').isVisible());assert.equal(await page.locator('.name-short').textContent(),'MB');
  if(p5)assert.equal(await page.locator('#mycelium-canvas').count(),1,'Original animated landscape retained');
  assert.ok(!requests.some(u=>u.includes('scene-assets.js')||u.includes('.scene.gz')),'Landing does not preload the 3D scene');
  if(shots&&width!==360)await page.screenshot({path:path.join(shots,`landing-${width}-${theme}.png`)});
 }
 await page.locator('.portfolio-entry').focus();await page.keyboard.press('Enter');await page.waitForURL(base+'/Computational%20Design.html');
 await page.goto(base+'/landing.html');await page.locator('.spatial-entry').focus();await page.keyboard.press('Enter');await page.waitForURL(base+'/explore/');
 await page.goto(base+'/landing.html');await page.locator('.name').click();await page.waitForURL(base+'/Computational%20Design.html');
 assert.deepEqual(errors,[]);console.log('PASS clear 3D/portfolio choices on desktop and mobile in both themes; keyboard routes, name link, existing animation and no automatic model download');
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
