import {masonryCollision} from './navigation-collision.js';
import { EYE_HEIGHT } from './navigation-config.js';
import { PROJECTS } from './projects.js';
import { installIcons, setIcon } from './icons.js';
import { TERRACE_SPECS } from './navigation-config.js';
let THREE,OrbitControls,buildCampus,frameAt,nearestRoute,groundHeight,isOpening,createMuseumMedia,enhanceRendering,inGarden,createViewingZones,createImageCarousels,createViewCube,modelCamera,resizeModelCamera;
let scenePromise=null;

const $=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=i=>String(i+1).padStart(2,'0');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,mobile=matchMedia('(max-width:820px)').matches;
const page='explore';let externallyPaused=false;
let scene=null,renderer=null,camera=null,controls=null,campus=null,sun=null,sky=null,ambient=null,museum=null,realism=null,viewingAreas=null,imageCarousels=null,viewCube=null;
let soundEnabled=false;const mouseScreen={x:-10000,y:-10000};
let mode='orbit',cutaway=false,dusk=false,activeGallery=null,nearbyId=null,tour=null,transition=null;
let yaw=0,pitch=0,dragging=false,dragPointer=null,lastX=0,lastY=0,pointerStart=null;
const keys=new Set();let downRay,pickRay,pointer,clock;
let toastTimer,frameCount=0,slowFrames=0,pixelRatio=Math.min(devicePixelRatio||1,mobile?1.3:1.65);
const hotNodes=[],mapNodes=[];let requestNearbyArt=()=>{};
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function dismissLoading(){const el=$('loading');el.classList.add('loaded');el.hidden=true;}
function notifyHost(type,detail={}){if(parent!==window)parent.postMessage({type,...detail},location.origin);}
function openProject(id){
 if(!PROJECTS.some(p=>p.id===id))return;
 keys.clear();stopTour();museum?.suspend();
 if(parent!==window)notifyHost('spatial:open-project',{projectId:id});
 else location.assign(new URL(PROJECTS.find(p=>p.id===id).source).pathname);
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent)return;
 if(event.data?.type==='spatial:pause'){externallyPaused=!!event.data.paused;keys.clear();dragging=false;if(externallyPaused)museum?.suspend();}
 if(event.data?.type==='spatial:theme')document.documentElement.dataset.theme=event.data.theme==='dark'?'dark':'light';
});
window.addEventListener('pagehide',()=>{keys.clear();museum?.suspend();});
$('gallery-list').innerHTML=[['gallery','COMPUTATIONAL GALLERIES'],['terrace','TERRACE PROJECT'],['courtyard','ART & EXHIBITIONS / COURTYARD']].map(([region,title])=>`<div class="gallery-section-label eyebrow">${title}</div>`+PROJECTS.map((p,i)=>({p,i})).filter(o=>o.p.region===region).map(({p,i})=>`<button class="gallery-row" data-gallery="${esc(p.id)}"><span class="number">${number(i)}</span><img data-src="${esc(p.images[0].preview)}" alt="" loading="lazy"><span class="gallery-text">${esc(p.shortTitle)}<span>${esc(p.zone)}</span></span><span data-icon="arrow-up-right"></span></button>`).join('')).join('');
$('gallery-list').insertAdjacentHTML('beforeend','<div class="gallery-section-label eyebrow">GARDENS & TERRACES</div><button class="gallery-row terrace-row" data-garden="courtyard"><span data-icon="footprints"></span><span class="gallery-text">Courtyard garden<span>Art & exhibitions · Contour garden</span></span><span data-icon="arrow-up-right"></span></button>'+TERRACE_SPECS.map((t,i)=>`<button class="gallery-row terrace-row" data-terrace="${t.id}"><span data-icon="sun"></span><span class="gallery-text">${esc(t.name)}<span>${i===0?'EmotionEcho.exe · Roof garden':'Planted roof terrace · Future projects'}</span></span><span data-icon="arrow-up-right"></span></button>`).join(''));
document.querySelector('[data-garden]').onclick=()=>{$('gallery-dialog').close();goGarden();};
for(const b of document.querySelectorAll('[data-terrace]'))b.onclick=()=>{$('gallery-dialog').close();goTerrace(b.dataset.terrace);};
for(const b of document.querySelectorAll('[data-gallery]'))b.onclick=()=>{$('gallery-dialog').close();goGallery(b.dataset.gallery);};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)){d.close();}});
function closeMenu(){if($('menu-dialog')?.open)$('menu-dialog').close();}
$('menu-btn').onclick=()=>{keys.clear();museum?.suspend();$('menu-dialog').showModal();};
for(const link of document.querySelectorAll('.menu-links a'))link.addEventListener('click',closeMenu);
$('help-btn').onclick=()=>{closeMenu();keys.clear();$('help-dialog').showModal();};$('gallery-list-btn').onclick=()=>{closeMenu();keys.clear();for(const img of $('gallery-list').querySelectorAll('img[data-src]')){img.src=img.dataset.src;delete img.dataset.src;}$('gallery-dialog').showModal();};
$('nearby-open').onclick=()=>{if(nearbyId)openProject(nearbyId);};
installIcons();

function resize(){if(!camera||!renderer)return;camera.clearViewOffset();resizeModelCamera(camera,innerWidth/innerHeight);renderer.setSize(innerWidth,innerHeight);museum?.resize();}
function bindCamera(next,target=controls?.target.clone()||V()){
 controls?.dispose();camera=next;
 controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=3;controls.maxDistance=195;controls.minZoom=.5;controls.maxZoom=12;controls.maxPolarAngle=Math.PI*.999;controls.minPolarAngle=.00001;controls.rotateSpeed=.6;controls.zoomSpeed=.8;controls.panSpeed=.7;controls.enabled=mode==='orbit';controls.update();
 controls.addEventListener('start',()=>{transition=null;});
}
function perspectiveCamera(){
 if(camera.isOrthographicCamera){const next=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.07,750);next.position.copy(camera.position);next.quaternion.copy(camera.quaternion);bindCamera(next);}viewCube?.setActive('3d');
 campus.root.traverse(o=>{if(o.userData.tree?.banyan){const crown=o.getObjectByName('Broad forest-tree canopy');if(crown)crown.visible=true;}});
}
async function selectModelView(view){
 if(view==='3d'){setCutaway(false,false);return goOverview();}
 if(!await enterLandscape())return;closeMenu();stopTour();museum?.suspend();modeUI('orbit');activeGallery=null;transition=null;
 const next=modelCamera(view,innerWidth/innerHeight);bindCamera(next,V(...next.userData.viewTarget));camera.updateMatrixWorld();
 setCutaway(view==='plan',false);campus.root.traverse(o=>{if(o.userData.tree?.banyan){const crown=o.getObjectByName('Broad forest-tree canopy');if(crown)crown.visible=view!=='plan';}});renderer.shadowMap.needsUpdate=true;viewCube.setActive(view);setAngles();
}
function setAngles(){const d=V();camera.getWorldDirection(d);yaw=Math.atan2(-d.x,-d.z);pitch=Math.asin(THREE.MathUtils.clamp(d.y,-1,1));}
function look(){camera.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));}
function cameraTo(eye,target,duration=1.3){
  if(reduced){camera.position.copy(eye);controls.target.copy(target);camera.lookAt(target);setAngles();return;}
  const direction=V();camera.getWorldDirection(direction);
  transition={from:camera.position.clone(),to:eye.clone(),targetFrom:camera.position.clone().addScaledVector(direction,8),targetTo:target.clone(),start:performance.now(),duration:duration*1000};controls.enabled=false;
}
function modeUI(next){
  if(next==='walk'&&camera&&campus)perspectiveCamera();
  mode=next;document.body.classList.toggle('walking',next==='walk');$('walk-hud').hidden=next!=='walk';$('minimap').hidden=next!=='walk';$('location-chip').hidden=next!=='walk';
  for(const name of ['orbit','walk']){$(name+'-btn').classList.toggle('selected',name===next);$(name+'-btn').setAttribute('aria-pressed',String(name===next));}
  $('entry-label').textContent=next==='walk'?'Overview':'Explore on foot';setIcon($('enter-btn').querySelector('[data-icon]'),next==='walk'?'orbit':'footprints');
  $('nav-hint').textContent=next==='walk'?'Drag to look · W A S D to walk · E to open project':'Drag to orbit · Scroll to zoom';
  if(controls)controls.enabled=next==='orbit';keys.clear();dragging=false;
  if(next==='orbit'){$('nearby').hidden=true;nearbyId=null;}
}
async function goOverview(){
  if(!await enterLandscape())return;closeMenu();museum?.suspend();stopTour();perspectiveCamera();modeUI('orbit');activeGallery=null;cameraTo(campus.overview.eye,campus.overview.target,1.3);
}
async function goGallery(id){
  if(!await enterLandscape())return;
  closeMenu();const spot=campus.spots.find(p=>p.id===id);if(!spot)return;stopTour();activeGallery=id;setCutaway(false,false);modeUI('walk');
  cameraTo(spot.eye,spot.target,1.4);setNearby(id);$('location-number').textContent=number(PROJECTS.findIndex(p=>p.id===id))+' / '+PROJECTS.find(p=>p.id===id).category.toUpperCase();$('location-name').textContent=PROJECTS.find(p=>p.id===id).zone;
}
async function goTerrace(id){
 if(!await enterLandscape())return;
 const terrace=campus?.roofTerraces.find(t=>t.id===id);if(!terrace){toast('The landscape is still loading.');return;}
 closeMenu();stopTour();museum?.suspend();setCutaway(false,false);modeUI('walk');activeGallery=null;setNearby(null);cameraTo(terrace.eye,terrace.target,1.4);$('location-number').textContent='OPEN AIR / ROOFTOP';$('location-name').textContent=terrace.name;
}
async function goGarden(){
 if(!await enterLandscape())return;
 closeMenu();stopTour();museum?.suspend();setCutaway(false,false);modeUI('walk');activeGallery=null;setNearby(null);cameraTo(campus.garden.eye,campus.garden.target,1.4);$('location-number').textContent='PRIVATE GARDEN';$('location-name').textContent='Courtyard garden';
}
async function startTour(){
  if(!await enterLandscape())return;closeMenu();setCutaway(false,false);modeUI('walk');tour={t:0,next:0,pause:0,finished:false};
  camera.position.copy(campus.routeEye(0));controls.target.copy(campus.routeLook(0));camera.lookAt(controls.target);setAngles();transition=null;$('tour-strip').hidden=false;
  toast('Following the promenade. Open any project, or move to explore freely.');
}
function stopTour(){tour=null;$('tour-strip').hidden=true;}
function setCutaway(value,notify=true){
  cutaway=value;if(campus)campus.roofs.visible=!value;$('roof-btn').setAttribute('aria-pressed',String(value));if(renderer)renderer.shadowMap.needsUpdate=true;
  if(value&&mode==='walk'){const near=campus.spots.find(s=>s.id===nearbyId)||campus.spots[0];stopTour();modeUI('orbit');cameraTo(near.frame.p.clone().add(V(16,23,24)),near.frame.p.clone().add(V(0,1,0)));}
  if(value&&notify)toast('Canopy lifted. Explore the galleries from above.');
}
function setDusk(value){
  dusk=value;document.body.classList.toggle('dusk',value);$('time-btn').setAttribute('aria-pressed',String(value));$('time-label').textContent=value?'Dusk':'Afternoon';setIcon($('time-btn').querySelector('[data-icon]'),value?'moon':'sun');
  if(!scene)return;sky.intensity=value?.38:.65;sky.color.set(value?'#afc7e5':'#e2eadd');ambient.intensity=value?.065:.08;sun.intensity=value?.68:1.85;sun.color.set(value?'#f4bb83':'#ffead1');sun.position.set(-55,value?16:38,56);renderer.toneMappingExposure=value?1.03:.90;
  campus.materials.light.emissiveIntensity=value?3.4:.85;campus.materials.glass.opacity=value?.12:.20;for(const lamp of campus.lamps)lamp.intensity=value?(lamp.userData.duskIntensity??75):(lamp.userData.dayIntensity??24);realism?.setAtmosphere(value);renderer.shadowMap.needsUpdate=true;
}
$('orbit-btn').onclick=goOverview;$('walk-btn').onclick=()=>goGallery(activeGallery||PROJECTS[0].id);$('enter-btn').onclick=()=>mode==='walk'?goOverview():goGallery(activeGallery||PROJECTS[0].id);$('tour-start').onclick=startTour;$('tour-stop').onclick=stopTour;
$('roof-btn').onclick=async()=>{closeMenu();if(await enterLandscape())setCutaway(!cutaway);};$('time-btn').onclick=()=>{setDusk(!dusk);closeMenu();};
$('audio-btn').onclick=()=>{soundEnabled=!soundEnabled;museum?.setSound(soundEnabled);$('audio-btn').setAttribute('aria-pressed',String(soundEnabled));$('audio-label').textContent=soundEnabled?'Sound on':'Sound off';setIcon($('audio-btn').querySelector('[data-icon]'),soundEnabled?'volume-2':'volume-x');};
$('fullscreen-btn').onclick=async()=>{closeMenu();try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}};
document.addEventListener('fullscreenchange',()=>{setIcon($('fullscreen-btn').querySelector('[data-icon]'),document.fullscreenElement?'minimize':'maximize');resize();});window.addEventListener('resize',resize);

function setNearby(id){
  if(nearbyId===id)return;nearbyId=id;$('media-status').textContent='';const p=PROJECTS.find(p=>p.id===id);$('nearby').hidden=!p;if(!p)return;
  $('nearby-open').setAttribute('aria-label','Open '+p.title);$('nearby-img').src=p.images[0].preview;$('nearby-img').alt=p.images[0].alt;$('nearby-category').textContent=p.category.toUpperCase();$('nearby-title').textContent=p.shortTitle;
}
function updateLocation(){
  let best=null,d=Infinity;for(const s of campus.spots){const dd=Math.hypot(camera.position.x-s.eye.x,camera.position.z-s.eye.z)+Math.abs(camera.position.y-s.eye.y);if(dd<d){d=dd;best=s;}}
  const routePosition=nearestRoute(camera.position.x,camera.position.z),terrace=campus.roofTerraces.find(t=>Math.abs(camera.position.y-t.eye.y)<1.05&&Math.abs(routePosition.t-t.t)<t.half+.010&&routePosition.distance<t.width*.5+3.7);
  const atProject=best&&Math.abs(camera.position.y-best.eye.y)<1.5&&d<(best.region==='gallery'?13:6.2);
  if(atProject&&(!terrace||best.region==='terrace')){setNearby(best.id);activeGallery=best.id;const i=PROJECTS.findIndex(p=>p.id===best.id);$('location-number').textContent=number(i)+' / '+PROJECTS[i].category.toUpperCase();$('location-name').textContent=PROJECTS[i].zone;}
  else if(terrace){setNearby(null);activeGallery=null;$('location-number').textContent='OPEN AIR / ROOFTOP';$('location-name').textContent=terrace.name;}
  else if(campus.bridgeSamples.some(p=>Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<2.0&&Math.abs(camera.position.y-p.y-EYE_HEIGHT)<.35)){setNearby(null);activeGallery=null;$('location-number').textContent='THE GARDEN CROSSING';$('location-name').textContent='Timber bridge';}
  else if(inGarden(camera.position.x,camera.position.z)&&Math.abs(camera.position.y-groundHeight(camera.position.x,camera.position.z)-EYE_HEIGHT)<1.1){setNearby(null);activeGallery=null;$('location-number').textContent='ART & EXHIBITIONS';$('location-name').textContent='Courtyard garden';}
  else{setNearby(null);$('location-number').textContent='THE CONNECTING LANDSCAPE';$('location-name').textContent='Promenade & gardens';}
  const x=80+camera.position.x*1.70,y=70+camera.position.z*1.65;$('map-person').style.left=x+'px';$('map-person').style.top=y+'px';for(const node of mapNodes)node.button.classList.toggle('active',node.id===nearbyId);
}
function setupMap(){
  const point=p=>`${(80+p.x*1.7).toFixed(2)},${(70+p.z*1.65).toFixed(2)}`;
  $('map-route').setAttribute('d',Array.from({length:161},(_,i)=>(i?'L':'M')+point(frameAt(i/160).p)).join(' ')+' Z');
  $('map-crossing').setAttribute('d',campus.bridgeCurve.getPoints(50).map((p,i)=>(i?'L':'M')+point(p)).join(' '));
  for(let i=0;i<campus.spots.length;i++){
    const spot=campus.spots[i],p=PROJECTS.find(p=>p.id===spot.id),button=document.createElement('button');button.className='hotspot';button.setAttribute('aria-label',`Enter ${p.zone}: ${p.title}`);button.title=p.shortTitle;button.innerHTML=`<span class="pin">${number(i)}</span><span class="hotspot-title">${esc(p.shortTitle)}</span>`;button.onclick=()=>goGallery(p.id);$('hotspots').appendChild(button);hotNodes.push({button,spot});
    const mb=document.createElement('button');mb.textContent=String(i+1);mb.setAttribute('aria-label',p.zone+': '+p.shortTitle);mb.title=p.shortTitle;mb.style.left=(80+spot.frame.p.x*1.7)+'px';mb.style.top=(70+spot.frame.p.z*1.65)+'px';mb.onclick=()=>goGallery(p.id);$('map-stations').appendChild(mb);mapNodes.push({button:mb,id:p.id});
  }
}
function hotspots(){
  const occupied=[];for(const {button,spot} of hotNodes){
    if(mode!=='orbit'||page!=='explore'){button.hidden=true;continue;}
    const p=spot.position.clone().project(camera),x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;
    const visible=p.z>-1&&p.z<1&&x>25&&x<innerWidth-25&&y>100&&y<innerHeight-80;button.hidden=!visible;if(!visible)continue;
    button.classList.remove('compact');if(occupied.some(o=>Math.abs(x-o.x)<175&&Math.abs(y-o.y)<48))button.classList.add('compact');else occupied.push({x,y});
    button.classList.toggle('revealed',Math.hypot(mouseScreen.x-x,mouseScreen.y-y)<100);button.style.left=x+'px';button.style.top=y+'px';
  }
}
function floorAt(p){
  const max=p.y-EYE_HEIGHT+.44,near=nearestRoute(p.x,p.z);let floor=null;
  if(near.distance<=near.w*.5&&near.p.y<=max)floor=near.p.y;
  downRay.set(V(p.x,max,p.z),V(0,-1,0));
  const candidates=campus.walkSurfaces.filter(s=>s.type!=='roof'&&s.mesh!==campus.floorMesh).map(s=>s.mesh);
  for(const hit of downRay.intersectObjects(candidates,false)){if(hit.point.y<=max){floor=floor===null?hit.point.y:Math.max(floor,hit.point.y);break;}}
  const ground=groundHeight(p.x,p.z);if(ground<=max)floor=floor===null?ground:Math.max(floor,ground);return floor;
}
function glassCollision(p){const r=nearestRoute(p.x,p.z);if(p.y<r.p.y+.2||p.y>r.p.y+4.1||r.distance>r.w*.6+1)return false;return !isOpening(r.t,Math.sign(r.offset))&&Math.abs(Math.abs(r.offset)-r.w*.455)<.20;}
function walk(delta){
  let x=0,z=0;if(keys.has('KeyW')||keys.has('ArrowUp')||keys.has('forward'))z++;if(keys.has('KeyS')||keys.has('ArrowDown')||keys.has('back'))z--;if(keys.has('KeyA')||keys.has('ArrowLeft')||keys.has('left'))x--;if(keys.has('KeyD')||keys.has('ArrowRight')||keys.has('right'))x++;
  if(!x&&!z)return;const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?5.2:2.8)*delta;
  const move=V(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(z).addScaledVector(V(Math.cos(yaw),0,-Math.sin(yaw)),x).normalize().multiplyScalar(speed);
  for(const axis of ['x','z']){const next=camera.position.clone();next[axis]+=move[axis];if(Math.abs(next.x)>105||Math.abs(next.z)>110||glassCollision(next)||masonryCollision(next,campus.navigationBlocks,EYE_HEIGHT))continue;const y=floorAt(next);if(y!==null&&y>=camera.position.y-EYE_HEIGHT-.72){next.y=y+EYE_HEIGHT;camera.position.copy(next);}}
  look();
}
function moveTour(delta){
  if(!tour||document.querySelector('dialog[open]'))return;
  if(tour.pause>0){
    tour.pause-=delta;const spot=campus.spots[tour.next-1];
    if(spot){const desired=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position,spot.target,V(0,1,0)));camera.quaternion.slerp(desired,1-Math.exp(-delta*2.5));setAngles();$('tour-status').textContent=PROJECTS.find(p=>p.id===spot.id).shortTitle;}
    if(tour.pause<=0&&tour.next===campus.spots.length)tour.finished=true;return;
  }
  if(tour.finished){stopTour();toast('The collection ends in the courtyard. Stay and explore, or open the Work index.');return;}
  const next=campus.spots[tour.next];if(!next){stopTour();return;}
  if(next.region!=='gallery'){
    cameraTo(next.eye,next.target,2);tour.pause=7;tour.next++;$('tour-status').textContent=next.region==='courtyard'?'Entering the courtyard':'Up to the roof garden';return;
  }
  tour.t+=delta*.017;
  if(tour.t>=next.t){tour.t=next.t;tour.pause=7;tour.next++;}
  camera.position.copy(campus.routeEye(tour.t));camera.lookAt(campus.routeLook(tour.t));setAngles();$('tour-status').textContent='Following the promenade';
}
function environment(){
  const w=384,h=192,bytes=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const t=y/h,i=(y*w+x)*4;const sky=t<.49,k=sky?t/.49:(t-.49)/.51;bytes[i]=sky?135+k*75:191-k*113;bytes[i+1]=sky?169+k*47:201-k*106;bytes[i+2]=sky?185+k*29:170-k*107;bytes[i+3]=255;}
  const texture=new THREE.DataTexture(bytes,w,h,THREE.RGBAFormat);texture.colorSpace=THREE.SRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;const pmrem=new THREE.PMREMGenerator(renderer),result=pmrem.fromEquirectangular(texture);pmrem.dispose();texture.dispose();return result.texture;
}
async function enterLandscape(){return await ensureScene();}
function ensureScene(){
 if(scenePromise)return scenePromise;
 $('loading').hidden=false;$('loading').classList.remove('loaded');
 scenePromise=initScene().then(()=>true).catch(error=>{dismissLoading();scenePromise=null;renderer?.dispose();$('viewport').replaceChildren();notifyHost('spatial:error');toast('The gallery could not open. Return to the project index to browse the work.');console.error('Landscape unavailable',error);return false;});return scenePromise;
}
async function initScene(){
 [THREE,{OrbitControls},{buildCampus,frameAt,nearestRoute,groundHeight,isOpening},{createMuseumMedia},{enhanceRendering},{inGarden},{createViewingZones},{createImageCarousels},{createViewCube,modelCamera,resizeModelCamera}]=await Promise.all([import('three'),import('three/addons/controls/OrbitControls.js'),import('./campus.js'),import('./museum-media.js'),import('./rendering.js'),import('./garden.js'),import('./viewing-zones.js'),import('./image-carousels.js'),import('./view-cube.js')]);
 downRay=new THREE.Raycaster();pickRay=new THREE.Raycaster();pointer=new THREE.Vector2();clock=new THREE.Clock();
 await new Promise(requestAnimationFrame);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(pixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  $('viewport').appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D portfolio. Drag to orbit, or select a gallery to walk inside.');
  scene=new THREE.Scene();scene.background=new THREE.Color('#ccdcd8');scene.fog=new THREE.FogExp2('#ccdcd8',.0043);scene.environment=environment();scene.environmentIntensity=.58;
  camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.07,750);
  bindCamera(camera);
  sky=new THREE.HemisphereLight('#ecf3ed','#7d8c65',2.4);ambient=new THREE.AmbientLight('#eff0df',.29);sun=new THREE.DirectionalLight('#fff0d0',3.2);sun.position.set(-55,76,56);sun.target.position.set(0,9,0);sun.castShadow=true;sun.shadow.mapSize.set(mobile?2048:Math.min(4096,renderer.capabilities.maxTextureSize),mobile?2048:Math.min(4096,renderer.capabilities.maxTextureSize));Object.assign(sun.shadow.camera,{left:-68,right:68,top:57,bottom:-57,near:1,far:200});sun.shadow.normalBias=.035;sun.shadow.bias=-.000045;sun.shadow.radius=3;
  const fill=new THREE.DirectionalLight('#d4e8ea',.22);fill.position.set(45,32,-48);scene.add(sky,ambient,sun,sun.target,fill);
  const {buildCampusOffThread}=await import('./campus-transfer.js');
  campus=await buildCampusOffThread(PROJECTS,{quality:mobile?'medium':'high'},buildCampus,frameAt);scene.add(campus.root);camera.position.copy(campus.arrival.eye);controls.target.copy(campus.arrival.target);camera.lookAt(controls.target);setAngles();modeUI('walk');renderer.shadowMap.needsUpdate=true;
  realism=enhanceRendering({scene,renderer,campus,mobile});
  viewingAreas=createViewingZones({campus,groundHeight});
  museum=createMuseumMedia({screens:campus.videoScreens,viewingZones:viewingAreas.zones,viewport:$('viewport'),onStatus:(id,text)=>{if(id===nearbyId||!id)$('media-status').textContent=text;}});museum.setSound(soundEnabled);
  viewCube?.dispose();viewCube=createViewCube({parent:$('explore-view'),onSelect:selectModelView});
  setupMap();resize();
  const loader=new THREE.TextureLoader(),artQueue=campus.artMaterials.map(item=>{
    let object=null;campus.root.traverse(o=>{if(!object&&o.isMesh&&o.material===item.material)object=o;});
    if(!object)return {...item,position:V(0,9,0)};
    object.geometry.computeBoundingSphere();return {...item,position:object.geometry.boundingSphere.center.clone().applyMatrix4(object.matrixWorld)};
  });
  requestNearbyArt=()=>{for(const item of artQueue){if(item.requested||!item.src||camera.position.distanceTo(item.position)>32)continue;item.requested=true;loader.load(item.src,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());item.material.map=texture;item.material.emissiveMap=texture;item.material.needsUpdate=true;},undefined,()=>{item.requested=false;});}};
  requestNearbyArt();
  imageCarousels=createImageCarousels({artworks:campus.artworks,reducedMotion:reduced});
  renderer.domElement.addEventListener('pointerdown',e=>{document.body.classList.add('interacted');pointerStart={x:e.clientX,y:e.clientY};if(mode==='walk'){stopTour();dragging=true;dragPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);}});
  renderer.domElement.addEventListener('pointermove',e=>{if(mode==='walk'&&dragging&&e.pointerId===dragPointer){const s=e.pointerType==='touch'?.004:.003;yaw-=(e.clientX-lastX)*s;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-lastY)*s,-1.4,1.4);lastX=e.clientX;lastY=e.clientY;look();}});
  renderer.domElement.addEventListener('pointerup',e=>{dragging=false;dragPointer=null;if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<5){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);pickRay.setFromCamera(pointer,camera);const hit=pickRay.intersectObjects(campus.artworks,false)[0];if(hit)openProject(hit.object.userData.projectId);}pointerStart=null;});
  renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;pointerStart=null;});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();notifyHost('spatial:error');});renderer.domElement.addEventListener('webglcontextrestored',()=>{renderer.shadowMap.needsUpdate=true;});
  setDusk(dusk);dismissLoading();animate();notifyHost('spatial:ready');
}
function animate(){
  requestAnimationFrame(animate);const raw=clock.getDelta(),delta=Math.min(raw,.045);if(document.hidden||externallyPaused){if(museum?.active)museum.suspend();return;}
  if(transition){const t=Math.min(1,(performance.now()-transition.start)/transition.duration),e=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,e);camera.lookAt(controls.target);if(t>=1){transition=null;controls.enabled=mode==='orbit';setAngles();}}
  else if(mode==='walk'){if(tour)moveTour(delta);else{walk(delta);look();}if(frameCount%5===0)updateLocation();}
  else controls.update();
  if(frameCount%3===0)viewCube?.update(camera);
  realism?.update(delta,camera);viewingAreas?.update(camera,reduced?0:delta,{visible:mode==='walk'&&!cutaway});museum?.update(camera,delta,{walking:mode==='walk',allowed:!transition&&!document.querySelector('dialog[open]')&&!cutaway});museum?.render(camera);
  imageCarousels?.update(camera,delta,{allowed:!document.querySelector('dialog[open]')});
  renderer.render(scene,camera);if(frameCount%30===0)requestNearbyArt();if(frameCount%2===0)hotspots();frameCount++;if(frameCount===3)dismissLoading();
  if(frameCount>35&&frameCount<175&&raw>.045)slowFrames++;if(frameCount===175&&slowFrames>75&&pixelRatio>1){pixelRatio=1;renderer.setPixelRatio(1);resize();}
}
window.addEventListener('keydown',e=>{
  if(externallyPaused)return;
  if(document.querySelector('dialog[open]')||page!=='explore')return;
  if(e.code==='Escape'){goOverview();return;}if(e.code==='KeyE'&&nearbyId){openProject(nearbyId);return;}
  if(mode==='walk'&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();stopTour();keys.add(e.code);}
});
window.addEventListener('pointermove',e=>{mouseScreen.x=e.clientX;mouseScreen.y=e.clientY;});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;});document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();stopTour();keys.add(b.dataset.move);b.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.move));}

const requestedProject=new URLSearchParams(location.hash.slice(1)).get('project');
ensureScene().then(ready=>{if(ready&&PROJECTS.some(p=>p.id===requestedProject))goGallery(requestedProject);});
