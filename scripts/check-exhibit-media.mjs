// Exercise the real CSS3D mount and media state machine with a deterministic provider.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const fixture=`<!doctype html><script type="importmap">{"imports":{"three":"/explore/scene/assets/three.module.js","three/addons/":"/explore/scene/assets/addons/"}}</script><div id="view"></div><script type="module">
import * as THREE from 'three';
import {createMuseumMedia} from '/explore/scene/museum-media.js';
import {createImageCarousels,SLIDE_SECONDS} from '/explore/scene/image-carousels.js';
window.THREE=THREE;window.createImageCarousels=createImageCarousels;window.SLIDE_SECONDS=SLIDE_SECONDS;
const originalTimeout=window.setTimeout;window.timers=[];
window.setTimeout=(fn,delay,...args)=>{if(delay>=12000){const id=originalTimeout(()=>{},3600000);timers.push({fn,delay,id});return id;}return originalTimeout(fn,delay,...args);};
window.providerMode='playing';window.providerCalls=[];
window.YT={PlayerState:{PLAYING:1,ENDED:0},Player:class{
 constructor(iframe,{events}){if(!iframe.isConnected)throw new Error('YouTube iframe initialized before DOM mount');this.events=events;this.connected=true;this.volume=0;this.muted=true;providerCalls.push(['mounted',iframe.src]);if(providerMode!=='stalled')queueMicrotask(()=>events.onReady());}
 mute(){this.muted=true;}unMute(){this.muted=false;}setVolume(v){this.volume=v;}
 playVideo(){providerCalls.push(['play']);if(providerMode==='blocked'){this.events.onAutoplayBlocked();return;}queueMicrotask(()=>this.events.onStateChange({data:1}));}
 pauseVideo(){providerCalls.push(['pause']);}seekTo(){}
 }};
window.camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.set(0,2,4);camera.lookAt(0,2,0);camera.updateMatrixWorld();
window.makeMedia=(id='tensilebloom',film={type:'youtube',videoId:'YNv2QMJPHVA',title:'TensileBloom'})=>{
 const board=new THREE.Mesh(new THREE.PlaneGeometry(4,2.25),new THREE.MeshBasicMaterial());board.position.set(0,2,0);board.updateMatrixWorld();
 const statuses=[];const media=createMuseumMedia({screens:[{projectId:id,board,width:4,height:2.25,film}],viewingZones:[{id,eye:new THREE.Vector3(0,2,4),target:new THREE.Vector3(0,2,0),radius:.95}],viewport:document.querySelector('#view'),onStatus:(id,text)=>statuses.push(text)});media.statuses=statuses;return media;
};
window.ready=true;
</script>`;
const server=createServer(async(req,res)=>{try{if(req.url==='/fixture'){res.writeHead(200,{'Content-Type':'text/html'}).end(fixture);return;}const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))throw 0;await stat(file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.mp4')?'video/mp4':'application/octet-stream'});createReadStream(file).pipe(res);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.fulfill({contentType:'text/html',body:'<!doctype html><title>Provider test</title>'}));
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});await page.goto(base+'/fixture');await page.waitForFunction(()=>window.ready,null,{timeout:10000});
 await page.evaluate(()=>{window.media=makeMedia();media.update(camera,.25);});
 await page.waitForFunction(()=>media.entries[0].playing);
 assert.deepEqual(await page.evaluate(()=>{media.update(camera,.25);const e=media.entries[0];return [e.player.connected,e.object.element.isConnected,e.object.element.style.opacity,e.board.material===e.poster,media.statuses.at(-1)];}),[true,true,'1',false,'Film playing · sound off']);
 await page.evaluate(()=>{media.setSound(true);media.update(camera,.5);});assert.ok(await page.evaluate(()=>media.entries[0].player.volume>0&&!media.entries[0].player.muted));
 assert.deepEqual(await page.evaluate(()=>{camera.position.x=10;camera.updateMatrixWorld();media.update(camera,.1);const e=media.entries[0];return [e.playing,e.object.element.style.opacity,e.board.material===e.poster,e.player.volume];}),[false,'0',true,0]);
 await page.evaluate(()=>{camera.position.x=0;camera.lookAt(0,2,0);camera.updateMatrixWorld();media.update(camera,.1);});await page.waitForFunction(()=>media.entries[0].playing);
 await page.evaluate(()=>{camera.lookAt(0,2,10);camera.updateMatrixWorld();media.update(camera,.1);});assert.equal(await page.evaluate(()=>media.entries[0].playing),false);
 console.log('PASS TensileBloom iframe mounts before initialization; play, proximity pause, facing, return and sound behavior');
 await page.evaluate(()=>{media.suspend();providerMode='stalled';camera.lookAt(0,2,0);camera.updateMatrixWorld();window.failedMedia=makeMedia('stalled-film');failedMedia.update(camera,.1);});
 await page.evaluate(()=>{timers.filter(t=>t.delay===20000).at(-1).fn();failedMedia.update(camera,.1);});assert.equal(await page.evaluate(()=>failedMedia.statuses.at(-1)),'Film available on the project page');
 await page.evaluate(()=>{providerMode='blocked';window.blockedMedia=makeMedia('blocked-film');blockedMedia.update(camera,.1);});await page.waitForFunction(()=>blockedMedia.entries[0].blocked);
 assert.equal(await page.evaluate(()=>{blockedMedia.update(camera,.1);return blockedMedia.statuses.at(-1);}), 'Open the project to play this film');
 console.log('PASS loading timeout and autoplay refusal restore the poster with a useful fallback');
 const carousel=await page.evaluate(async()=>{
  const texture=()=>{const t=new THREE.Texture({width:400,height:225});return t;};
  const board=new THREE.Mesh(new THREE.PlaneGeometry(4,2.25),new THREE.MeshBasicMaterial({map:texture()}));board.position.set(0,2,0);board.updateMatrixWorld();board.userData.imageCarousel={width:4,height:2.25,images:Array.from({length:5},(_,i)=>({src:'slide-'+i,width:400,height:225}))};
  const loads=[];let disposed=0;board.material.map.addEventListener('dispose',()=>disposed++);
  const slides=createImageCarousels({artworks:[board],loadTexture:async src=>{loads.push(src);if(src==='slide-2')throw Error('Missing test slide');const t=texture();t.addEventListener('dispose',()=>disposed++);return t;}});
  camera.position.set(100,2,4);camera.lookAt(0,2,0);camera.updateMatrixWorld();slides.update(camera,.5);const distant=loads.length;
  camera.position.set(0,2,4);camera.lookAt(0,2,0);camera.updateMatrixWorld();slides.update(camera,0);await new Promise(r=>setTimeout(r,0));
  for(let i=0;i<28;i++)slides.update(camera,.1);
  const first=slides.entries[0].index;
  for(let i=0;i<31;i++){slides.update(camera,.1);await new Promise(r=>setTimeout(r,0));}
  const afterFailure=slides.entries[0].index;
  return {seconds:SLIDE_SECONDS,distant,first,afterFailure,disposed,loads};
 });
 assert.equal(carousel.seconds,2.5);assert.equal(carousel.distant,0);assert.equal(carousel.first,1);assert.equal(carousel.afterFailure,3);assert.equal(carousel.disposed,2);
 console.log('PASS 2.5-second carousel, lazy next-image loading, missing-image skip and texture release');
 // Verify a real local MP4 decodes and advances in the browser as well.
 await page.evaluate(()=>{blockedMedia.suspend();window.localMedia=makeMedia('local-film',{type:'video',src:'/explore/scene/assets/films/google-unfold-wildframe.mp4',audio:false});localMedia.update(camera,.25);});
 await page.waitForFunction(()=>localMedia.entries[0].video.currentTime>.1,{timeout:15000});
 assert.equal(await page.evaluate(()=>localMedia.entries[0].playing),true);console.log('PASS real local MP4 decodes and advances');
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
