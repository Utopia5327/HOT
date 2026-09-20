// DOM and asset checks without a browser/GPU. Install jsdom separately to run.
// JSDOM_MODULE may point to an existing installation.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,access} from 'node:fs/promises';
import {SourceTextModule} from 'node:vm';
import {PROJECT_LINKS,projectURL} from '../explore/project-links.js';
import {PROJECTS} from '../explore/scene/projects.js';
import {SCENE_ASSETS} from '../explore/scene/scene-assets.js';
import {readCampusPayload} from '../explore/scene/scene-binary.js';
const require=createRequire(import.meta.url);
const {JSDOM,VirtualConsole}=require(process.env.JSDOM_MODULE||'jsdom');
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const entryHTML=await read('explore/index.html');
const headerHTML=await read('header.html');
const entrySource=await read('explore/entry.js');
const linkSource=await read('explore/project-links.js');
const themeSource=await read('js/theme.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const check=name=>console.log('PASS '+name);

async function host({mobile=false,saveData=false,webgl=true,query=''}={}){
  const calls=[];const errors=[];
  const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(entryHTML,{url:'https://manasbhatia.com/explore/'+query,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole});
  const w=dom.window;
  w.matchMedia=query=>({matches:query.includes('820px')?mobile:saveData});
  w.IntersectionObserver=class{observe(){}unobserve(){}};
  w.HTMLCanvasElement.prototype.getContext=()=>{calls.push('webgl');return webgl?{getExtension:()=>({loseContext(){}})}:null;};
  w.fetch=async url=>{calls.push(String(url));assert.equal(url,'../header.html');return {ok:true,text:async()=>headerHTML};};
  w.eval(themeSource);
  const context=dom.getInternalVMContext();
  const links=new SourceTextModule(linkSource,{context});
  const mod=new SourceTextModule(entrySource,{context,initializeImportMeta:meta=>{meta.url='https://manasbhatia.com/explore/entry.js';}});
  await mod.link(()=>links);await mod.evaluate();await tick();
  const emit=(type,detail={},source=w.document.querySelector('iframe')?.contentWindow)=>w.dispatchEvent(new w.MessageEvent('message',{origin:w.location.origin,source,data:{type,...detail}}));
  return {dom,w,calls,errors,emit};
}

assert.equal(PROJECTS.length,13);
assert.deepEqual(Object.keys(PROJECT_LINKS).sort(),PROJECTS.map(p=>p.id).sort());
for(const p of PROJECTS){
  const url=projectURL(p.id,'https://manasbhatia.com');
  assert.equal(url.pathname,new URL(p.source).pathname);
  assert.equal(url.searchParams.get('gallery'),p.id);
  await access(new URL('..'+url.pathname,import.meta.url));
}
for(const id of ['__proto__','constructor','https://evil.invalid/',null])assert.equal(projectURL(id,'https://manasbhatia.com'),null);
check('13 original project routes, source mapping, rejected unknown IDs');

for(const options of [{mobile:true},{saveData:true}]){
  const h=await host(options);
  assert.equal(h.w.document.querySelector('iframe'),null);
  assert.ok(h.w.document.querySelector('#entry-loader').hidden);
  assert.equal(h.w.document.querySelector('#entry-title').textContent,'Explore in 3D.');
  assert.ok(!h.w.document.querySelector('#launch-gallery').hidden);
  assert.deepEqual(h.calls,['../header.html']);
  assert.equal(h.w.document.querySelectorAll('.dock-secondary').length,6);
  h.dom.window.close();
}
check('Mobile and data saving do not initialize WebGL or request the scene');

const unavailable=await host({webgl:false});
assert.equal(unavailable.w.document.querySelector('iframe'),null);
assert.match(unavailable.w.document.querySelector('#entry-message').textContent,/unavailable/);
assert.ok(unavailable.w.document.querySelector('#launch-gallery').hidden);
assert.ok(unavailable.w.document.querySelector('#entry-loader').hidden);
unavailable.dom.window.close();
check('Unsupported WebGL falls back to original project index');

const h=await host({query:'?project=tensilebloom'});
const frame=h.w.document.querySelector('iframe');
assert.ok(!h.w.document.querySelector('#entry-loader').hidden);
assert.equal(h.w.document.querySelector('#entry-title').textContent,'Loading the gallery.');
assert.equal(frame.src,'https://manasbhatia.com/explore/scene/index.html#project=tensilebloom');
const messages=[];frame.contentWindow.postMessage=(data,origin)=>{assert.equal(origin,'https://manasbhatia.com');messages.push(data);};
h.emit('spatial:ready',{},h.w);assert.ok(!h.w.document.querySelector('#gallery-entry').hidden);
h.w.dispatchEvent(new h.w.MessageEvent('message',{source:frame.contentWindow,origin:'https://evil.invalid',data:{type:'spatial:ready'}}));
assert.ok(!h.w.document.querySelector('#gallery-entry').hidden);
h.emit('spatial:ready');assert.ok(h.w.document.querySelector('#gallery-entry').hidden);
assert.ok(h.w.document.querySelector('#entry-loader').hidden);
h.w.document.querySelector('.theme-btn').click();assert.ok(messages.some(m=>m.type==='spatial:theme'&&m.theme==='dark'));
h.w.document.querySelector('.dock-toggle').click();await tick();assert.equal(messages.at(-1).paused,true);assert.equal(frame.inert,true);
assert.equal(messages.at(-1).navigationOpen,true);
h.w.document.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape'}));await tick();assert.equal(messages.at(-1).paused,false);
assert.equal(messages.at(-1).navigationOpen,false);
h.w.dispatchEvent(new h.w.Event('pagehide'));assert.equal(messages.at(-1).paused,true);
h.w.dispatchEvent(new h.w.Event('pageshow'));assert.equal(messages.at(-1).paused,false);
h.emit('spatial:error');assert.equal(h.w.document.querySelector('iframe'),null);assert.ok(!h.w.document.querySelector('#launch-gallery').hidden);
assert.ok(h.w.document.querySelector('#entry-loader').hidden);
h.w.document.querySelector('#launch-gallery').click();assert.ok(h.w.document.querySelector('iframe'));assert.equal(h.errors.length,0,h.errors.join('\n'));
assert.ok(!h.w.document.querySelector('#entry-loader').hidden);
h.dom.window.close();
check('Same-origin frame validation, project deep link, shared theme, pause/resume, error and retry');

const original=new JSDOM('<div id="header"></div>',{url:'https://manasbhatia.com/projects/project5.html?gallery=tensilebloom',runScripts:'outside-only'});
original.window.document.querySelector('#header').innerHTML=headerHTML;
for(const script of original.window.document.querySelectorAll('script:not([src])'))original.window.eval(script.textContent);
assert.equal(original.window.document.querySelector('#spatial-gallery-link').getAttribute('href'),'/explore/?project=tensilebloom');
assert.deepEqual(Array.from(original.window.document.querySelectorAll('.dock-secondary')).slice(0,5).map(a=>a.getAttribute('href')),['/Computational%20Design.html','/art.html','/exhibitions.html','/press-media.html','/about.html']);
original.window.close();
check('Original five navigation destinations retained; return link selects the exhibit');

const html=await read('explore/scene/index.html');const source=await read('explore/scene/gallery.js');
const ids=new Set(Array.from(html.matchAll(/id="([^"]+)"/g),m=>m[1]));
for(const match of source.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(match[1]),'Missing gallery UI: '+match[1]);
for(const [quality,path] of Object.entries(SCENE_ASSETS)){
  const bytes=await readFile(new URL('../explore/scene/'+path,import.meta.url));
  const data=await readCampusPayload(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  assert.equal(data.spots.length,13);
  assert.deepEqual(data.spots.map(s=>s.id).sort(),Object.keys(PROJECT_LINKS).sort());
  for(const art of data.artMaterials)if(art.src)await access(new URL('../explore/scene/'+art.src,import.meta.url));
  assert.ok(data.bridgeSamples.length>10);
  assert.ok(data.navigationBlocks.length>0);
  check(quality+' compressed model decodes, project art paths resolve, bridge and collision data retained');
}
check('Gallery UI contract');
