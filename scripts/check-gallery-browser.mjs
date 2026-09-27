import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif'};
const server=createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep))throw 0;const info=await stat(p);res.writeHead(200,{'Content-Type':mime[path.extname(p).toLowerCase()]||'application/octet-stream','Content-Length':info.size});createReadStream(p).pipe(res);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const base='http://localhost:'+server.address().port,errors=[],p5=process.env.LANDING_P5_PATH?await readFile(process.env.LANDING_P5_PATH,'utf8'):'';
const shots=process.env.GALLERY_SCREENSHOT_DIR;if(shots)await mkdir(shots,{recursive:true});
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=route.request().url();if(u.startsWith(base))return route.continue();if(u.includes('/p5.')&&u.endsWith('.js'))return route.fulfill({contentType:'text/javascript',body:p5});if(u.includes('fonts.googleapis.com'))return route.fulfill({contentType:'text/css',body:"@font-face{font-family:'Fira Mono';src:url('"+base+"/explore/scene/assets/fonts/fira-mono-1.ttf')}"});return route.fulfill({body:'',contentType:'text/css'});});
  for(const name of ['Computational Design.html','art.html','exhibitions.html']){
   await page.goto(base+'/'+encodeURI(name),{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelectorAll('.gallery-card').length>0&&parseFloat(getComputedStyle(document.querySelector('.gallery-stage')).getPropertyValue('--gallery-card-size'))>0);
   if(p5)await page.evaluate(()=>noLoop());
   const hint=page.locator('.gallery-gesture .'+(mobile?'input-touch':'input-mouse')).filter({hasText:/browse projects/});
   assert.equal((await hint.textContent()).trim(),mobile?'Swipe to browse projects':'Scroll to browse projects');assert.ok(await hint.isVisible());
   const stage=page.locator('.gallery-stage');
   for(const size of mobile?[[390,844],[360,640],[844,390]]:[[1280,720],[1100,660]]){
    await page.setViewportSize({width:size[0],height:size[1]});
    await page.waitForFunction(()=>{const s=document.querySelector('.gallery-stage');return Math.abs(parseFloat(s.style.getPropertyValue('--gallery-card-size'))-Math.max(120,Math.min(460,s.clientHeight-56,s.clientWidth*.78)))<1;});
    for(const theme of ['light','dark']){
     await page.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
     await stage.focus();
     // Sample fractional positions throughout a full circuit, not just face-on cards.
     const geometry=await page.evaluate(async()=>{
      const stage=document.querySelector('.gallery-stage'),desc=document.querySelector('.gallery-description'),hint=document.querySelector('.scroll-hint');
      let violation=null;
      for(let i=0;i<32;i++){
       stage.dispatchEvent(new WheelEvent('wheel',{deltaY:93,bubbles:true,cancelable:true}));
       await new Promise(requestAnimationFrame);
       const d=desc.getBoundingClientRect(),s=stage.getBoundingClientRect(),h=hint.getBoundingClientRect();
       for(const c of stage.querySelectorAll('.gallery-card')){if(+c.style.opacity<.05)continue;const r=c.getBoundingClientRect();if(r.top<d.bottom+12||r.top<s.top||r.bottom>s.bottom||r.bottom>h.top-5)violation={desc:d.toJSON(),stage:s.toJSON(),hint:h.toJSON(),card:r.toJSON()};}
      }
      return violation;
     });
     assert.equal(geometry,null,`${name} ${size} ${theme}: cards clear introduction and hint: ${JSON.stringify(geometry)}`);
    }
   }
   await page.setViewportSize(mobile?{width:390,height:844}:{width:1280,height:720});await page.evaluate(()=>{document.documentElement.setAttribute('data-theme','dark');document.querySelector('.gallery-card').focus();window.scrollTo(0,0);});
   if(shots)await page.screenshot({path:path.join(shots,name.replace('.html','').replaceAll(' ','-')+(mobile?'-mobile':'-desktop')+'.png')});
   if(mobile){
    // A native horizontal swipe must rotate without activating a project link/modal.
    const box=await stage.boundingBox(),session=await context.newCDPSession(page),y=box.y+box.height*.45,x=box.x+box.width*.78;
    const before=await page.locator('.gallery-card').first().evaluate(e=>e.style.transform);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*23,y}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.evaluate(()=>new Promise(requestAnimationFrame));
    assert.notEqual(await page.locator('.gallery-card').first().evaluate(e=>e.style.transform),before,'Horizontal swipe changes the gallery');assert.equal(new URL(page.url()).pathname,'/'+encodeURI(name));
    if(name==='exhibitions.html')assert.equal(await page.locator('#exhibitionModal').isVisible(),false);
   }else{
    await page.locator('.gallery-card').nth(1).click();assert.equal(new URL(page.url()).pathname,'/'+encodeURI(name),'Clicking a side card centers it before opening');
    if(name==='exhibitions.html')assert.equal(await page.locator('#exhibitionModal').isVisible(),false);
    const before=await page.locator('.gallery-card').first().evaluate(e=>e.style.transform);await stage.focus();await page.keyboard.press('ArrowRight');await page.evaluate(()=>new Promise(requestAnimationFrame));assert.notEqual(await page.locator('.gallery-card').first().evaluate(e=>e.style.transform),before,'Arrow keys browse cards');
   }
   const first=page.locator('.gallery-card').first();await first.focus();
   if(name==='exhibitions.html'){
    await page.keyboard.press('Enter');assert.ok(await page.locator('#exhibitionModal').isVisible());assert.equal(await page.locator('#modalTitle').textContent(),'The New Real, Designonat Graz 2025');
    const modal=page.locator('#exhibitionModal');await page.mouse.move(150,450);await page.mouse.wheel(0,350);await page.waitForFunction(()=>document.querySelector('#exhibitionModal').scrollTop>0);await page.keyboard.press('Escape');assert.equal(await modal.isVisible(),false);
   }else{
    const href=await first.getAttribute('href');await page.route(base+href.replace(/^\.\//,'/'),r=>r.fulfill({contentType:'text/html',body:'<title>Project opened</title>'}));await page.keyboard.press('Enter');await page.waitForURL(base+href.replace(/^\.\//,'/'));
   }
   console.log('PASS',name,mobile?'touch layout, swipe and project opening':'desktop layout, keyboard and project opening');
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS all three coverflows keep cards below descriptions across rotation, both themes and short/mobile viewports; exhibition modal still scrolls');
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
