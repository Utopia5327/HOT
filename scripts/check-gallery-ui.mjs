// UI regression checks. Requires Playwright; CHROME_PATH can select an installed browser.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat, mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.UI_SCREENSHOT_DIR;
if(output)await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.mp4':'video/mp4'};
const server=createServer(async(req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://local').pathname);
    let file=path.resolve(root,'.'+name);
    if(!file.startsWith(root)){res.writeHead(403).end();return;}
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    const size=(await stat(file)).size;
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':size});
    createReadStream(file).pipe(res);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
const check=name=>console.log('PASS '+name);
const luminance=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);};
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1520,height:900},deviceScaleFactor:1});
  // All relevant UI styles and fonts are local. Keep the check independent of font CDNs.
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.fulfill({body:'',contentType:'text/css'}));
  await context.addInitScript(()=>localStorage.setItem('theme','dark'));
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  // Exercise the production menu, CSS and message handlers without drawing the full model.
  // Model decoding is covered separately by check-spatial-contract.mjs.
  let releaseScene;
  const sceneGate=new Promise(resolve=>{releaseScene=resolve;});
  const sceneSource=await readFile(path.join(root,'explore/scene/gallery.js'),'utf8');
  const startup="ensureScene().then(ready=>{if(ready&&PROJECTS.some(p=>p.id===requestedProject))goGallery(requestedProject);});";
  assert.ok(sceneSource.includes(startup));
  const uiSource=sceneSource.replace(startup,"import('./view-cube.js').then(({createViewCube})=>{createViewCube({parent:$('explore-view'),onSelect(){}});notifyHost('spatial:ready');});");
  await page.route('**/scene/gallery.js',async route=>{await sceneGate;await route.fulfill({body:uiSource,contentType:'text/javascript'});});
  await page.goto(base+'/explore/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#entry-loader',{state:'visible'});
  assert.equal(await page.locator('#entry-title').textContent(),'Loading the gallery.');
  assert.equal(await page.locator('.loading-ring').evaluate(el=>getComputedStyle(el).animationName),'gallery-spin');
  const first=await page.locator('.loading-ring').evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(170);
  assert.notEqual(await page.locator('.loading-ring').evaluate(el=>getComputedStyle(el).transform),first);
  if(output)await page.screenshot({path:path.join(output,'loading-dark.png')});
  check('Loading animation remains visible until the scene reports ready');
  releaseScene();
  await page.waitForSelector('body.gallery-ready');
  assert.equal(await page.locator('#entry-loader').isVisible(),false);
  const scene=page.frames().find(frame=>frame.url().includes('/scene/'));
  assert.ok(scene);
  await scene.waitForSelector('.view-cube');
  await page.locator('.dock-toggle').click();
  await scene.waitForSelector('html.site-navigation-open');
  assert.equal(await scene.locator('.view-cube').isVisible(),false);
  if(output)await page.screenshot({path:path.join(output,'navigation-open.png')});
  await page.keyboard.press('Escape');
  await scene.waitForSelector('.view-cube',{state:'visible'});
  assert.equal(await page.locator('#gallery-frame').evaluate(el=>el.inert),false);
  check('View cube hides for the website navigation and returns when it closes');

  await scene.locator('#menu-btn').click();
  await scene.waitForSelector('#menu-dialog[open]');
  for(const theme of ['dark','light']){
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-btn').click();
    await scene.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);
    const colors=await scene.locator('#menu-dialog').evaluate(panel=>{
      const selectors=['#orbit-btn','#walk-btn','#roof-btn','#time-btn','.menu-note','.eyebrow','[data-close="menu-dialog"]'];
      return {background:getComputedStyle(panel).backgroundColor,items:selectors.map(selector=>({selector,color:getComputedStyle(panel.querySelector(selector)).color})),top:panel.getBoundingClientRect().top};
    });
    assert.ok(colors.top>=82,'Controls must clear the website header');
    for(const item of colors.items)assert.ok(contrast(item.color,colors.background)>=4.5,theme+' '+item.selector+' contrast '+contrast(item.color,colors.background));
    if(output)await page.screenshot({path:path.join(output,'controls-'+theme+'.png')});
    check(theme+' controls, icons and explanatory text have at least 4.5:1 contrast');
  }
  await page.setViewportSize({width:433,height:760});
  const bounds=await scene.locator('#menu-dialog').boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=433);
  assert.ok(bounds.y>=82&&bounds.y+bounds.height<=760);
  if(output)await page.screenshot({path:path.join(output,'controls-mobile.png')});
  check('Controls fit a narrow screen and remain below the navigation');
  assert.deepEqual(errors,[]);
  await context.close();

  const reduced=await browser.newContext({viewport:{width:1200,height:800},reducedMotion:'reduce'});
  await reduced.route('**/scene/index.html*',route=>route.fulfill({body:'<p>Waiting for the model</p>',contentType:'text/html'}));
  const quiet=await reduced.newPage();
  await quiet.goto(base+'/explore/',{waitUntil:'domcontentloaded'});
  await quiet.waitForSelector('#entry-loader',{state:'visible'});
  assert.equal(await quiet.locator('.loading-ring').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await quiet.locator('.loading-track').evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
  check('Reduced-motion preference keeps a visible static loading indicator');
  await reduced.close();
}finally{
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
