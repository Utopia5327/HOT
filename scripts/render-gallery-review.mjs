// Static browser renders of the prepared production model for geometry/material review.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),out=process.env.MODEL_SCREENSHOT_DIR||'/tmp/gallery-review';await mkdir(out,{recursive:true});
const fixture=`<!doctype html><style>html,body{margin:0;overflow:hidden;background:#d0d5cd}canvas{display:block}</style><script type="importmap">{"imports":{"three":"./assets/three.module.js","three/addons/":"./assets/addons/"}}</script><script type="module">
import * as THREE from 'three';
import {unpackCampus} from './campus-transfer.js';
import {frameAt} from './campus.js';
import {SCENE_ASSETS} from './scene-assets.js';
import {readCampusPayload} from './scene-binary.js';
import {enhanceRendering} from './rendering.js';
import {createArchitecturalPlan} from './architectural-plan.js';
import {createElevationSite} from './elevation-site.js';
import {modelCamera} from './view-cube.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.90;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#b0c1c8',.0022);
const campus=unpackCampus(await readCampusPayload(await (await fetch('./'+SCENE_ASSETS.medium)).arrayBuffer()),frameAt);scene.add(campus.root);
const sky=new THREE.HemisphereLight('#e2eadd','#7d8c65',.65),ambient=new THREE.AmbientLight('#eff0df',.08),sun=new THREE.DirectionalLight('#ffead1',1.85);sun.position.set(-55,38,56);sun.target.position.set(0,9,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-50,right:50,top:48,bottom:-48,near:1,far:200});sun.shadow.normalBias=.035;sun.shadow.bias=-.000045;const fill=new THREE.DirectionalLight('#d4e8ea',.22);fill.position.set(45,32,-48);scene.add(sky,ambient,sun,sun.target,fill);
const realism=enhanceRendering({scene,renderer,campus});await realism.ready;
await Promise.all(campus.artMaterials.filter(a=>a.src).map(async a=>{try{const t=await new THREE.TextureLoader().loadAsync(a.src);t.colorSpace=THREE.SRGBColorSpace;a.material.map=t;a.material.emissiveMap=t;a.material.needsUpdate=true;}catch{}}));
const camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,600);
const plan=createArchitecturalPlan(campus);
const elevationSite=createElevationSite(campus);
let garden;campus.root.traverse(o=>{if(o.name==='Private courtyard garden and planted contours')garden=o;});
// Context trees outside the court are irrelevant to these close-up reviews.
for(const child of campus.landscape.children)if(child!==garden&&child.isInstancedMesh)child.visible=false;
window.review=(view)=>{
 const elevation=['north','south','east','west'].includes(view);elevationSite.setVisible(elevation);
 campus.roofs.visible=!['plan','courtyard'].includes(view);
 campus.root.traverse(o=>{if(o.userData.tree?.banyan){o.getObjectByName('Broad forest-tree canopy').visible=view!=='plan';}});
 const dusk=view==='ceiling-dusk';realism.setAtmosphere(dusk);sky.intensity=dusk?.38:.65;ambient.intensity=dusk?.065:.08;sun.intensity=dusk?.68:1.85;sun.position.set(-55,dusk?16:38,56);sun.color.set(dusk?'#f4bb83':'#ffead1');renderer.toneMappingExposure=dusk?1.03:.90;for(const lamp of campus.lamps)lamp.intensity=dusk?(lamp.userData.duskIntensity??75):(lamp.userData.dayIntensity??24);
 let active=camera;
 if(view==='plan'){
  active=new THREE.OrthographicCamera(-51,51,38.25,-38.25,.1,300);active.position.set(0,100,0);active.up.set(0,0,-1);active.lookAt(0,0,0);
 }else if(elevation){active=modelCamera(view,innerWidth/innerHeight);}
 else if(view==='courtyard'){camera.position.set(25,28,32);camera.lookAt(0,8,-5);}
 else if(view==='stairs'){const f=frameAt(.18);camera.position.copy(f.p).addScaledVector(f.n,-15).addScaledVector(f.d,-11).add(new THREE.Vector3(0,8,0));camera.lookAt(f.p.clone().addScaledVector(f.n,-f.w*.5-1.8).add(new THREE.Vector3(0,2.6,0)));}
 else {const f=frameAt(.066);camera.position.copy(f.p).addScaledVector(f.n,-2).addScaledVector(f.d,-2).add(new THREE.Vector3(0,1.95,0));camera.lookAt(f.p.clone().addScaledVector(f.n,2).addScaledVector(f.d,4).add(new THREE.Vector3(0,5.6,0)));}
 active.updateMatrixWorld();realism.update(0,active);renderer.shadowMap.needsUpdate=true;const background=scene.background;if(elevation)scene.background=elevationSite.background;renderer.render(view==='plan'?plan.scene:scene,active);scene.background=background;
 return {soffit:campus.materials.soffit.emissiveIntensity,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
};window.ready=true;
</script>`;
const types={'.js':'text/javascript','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.css':'text/css'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local');if(url.pathname==='/explore/scene/__qa__'){res.writeHead(200,{'Content-Type':'text/html'}).end(fixture);return;}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw 0;const s=await stat(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':s.size});createReadStream(file).pipe(res);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1200,height:900}});page.on('pageerror',e=>console.error('BROWSER',e.message));page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
 await page.goto(base+'/explore/scene/__qa__');await page.waitForFunction(()=>window.ready,null,{timeout:120000});
 for(const view of (process.env.MODEL_VIEWS?.split(',')||['plan','courtyard','stairs','ceiling-day','ceiling-dusk'])){const result=await page.evaluate(view=>review(view),view);await page.screenshot({path:path.join(out,view+'.png')});console.log(view,JSON.stringify(result));}
}finally{await browser?.close();await new Promise(r=>server.close(r));}
