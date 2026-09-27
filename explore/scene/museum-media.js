import * as THREE from 'three';
import { CSS3DObject,CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { distanceGain } from './media-policy.js';
import {selectViewingFilm,viewingState} from './viewing-policy.js';

let ytPromise=null;
function youtubeAPI(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(ytPromise)return ytPromise;
 ytPromise=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady;
  const timeout=setTimeout(()=>reject(new Error('YouTube player unavailable')),15000);
  window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);previous?.();resolve(window.YT);};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
  script.onerror=()=>{clearTimeout(timeout);reject(new Error('YouTube player unavailable'));};document.head.appendChild(script);
 }).catch(error=>{ytPromise=null;throw error;});return ytPromise;
}
export { youtubeURL } from './film-url.js';
import { youtubeURL } from './film-url.js';
export function createMuseumMedia({screens,viewingZones,viewport,onStatus}){
 const cssScene=new THREE.Scene(),cssRenderer=new CSS3DRenderer();cssRenderer.setSize(innerWidth,innerHeight);cssRenderer.domElement.id='museum-css-layer';viewport.prepend(cssRenderer.domElement);
 const hole=new THREE.MeshBasicMaterial({color:0x000000,opacity:0,transparent:false,blending:THREE.NoBlending,depthWrite:true,side:THREE.FrontSide,toneMapped:false});
 const entries=screens.map(s=>({...s,id:s.projectId,zone:viewingZones.find(z=>z.id===s.projectId),position:s.board.getWorldPosition(new THREE.Vector3()),normal:new THREE.Vector3(0,0,1).applyQuaternion(s.board.getWorldQuaternion(new THREE.Quaternion())),poster:s.board.material,loading:false,ready:false,playing:false,failed:false,blocked:false,requested:false,volume:0}));
 const forward=new THREE.Vector3();
 let active=null,sound=false,enabled=false,elapsed=0,lastStatus='';
 function status(entry,text){const key=(entry?.id||'')+text;if(key===lastStatus)return;lastStatus=key;onStatus?.(entry?.id||null,text);}
 function showPoster(e){e.board.material=e.poster;if(e.object)e.object.element.style.opacity='0';}
 function clearStartTimer(e){clearTimeout(e.startTimer);e.startTimer=null;}
 function fail(e){clearTimeout(e.loadTimer);e.loadTimer=null;e.failed=true;e.loading=false;pause(e);}
 function pause(e){
  clearStartTimer(e);
  e.requested=false;e.volume=0;
  if(e.player&&e.ready){e.player.setVolume(0);e.player.mute();e.player.pauseVideo();}
  if(e.video){e.video.volume=0;e.video.pause();}
  e.playing=false;showPoster(e);
 }
 function expose(e){
  if(e.failed||!enabled||active!==e||!e.playing)return;
  if(e.film.type==='youtube'){e.object.element.style.opacity='1';e.board.material=hole;}
  else e.board.material=e.videoMaterial;
 }
 function play(e){
  if(!e.ready||e.failed||e.requested||!enabled||active!==e)return;
  e.requested=true;e.blocked=false;
  clearStartTimer(e);
  e.startTimer=setTimeout(()=>{if(active===e&&enabled&&!e.playing){e.requested=false;e.blocked=true;showPoster(e);}},12000);
  if(e.player){e.player.mute();e.player.playVideo();}
  else e.video.play().catch(()=>{clearStartTimer(e);e.requested=false;e.blocked=true;showPoster(e);});
 }
 function ensure(e,camera){
  if(e.loading||e.ready||e.failed)return;e.loading=true;
  e.loadTimer=setTimeout(()=>fail(e),20000);
  if(e.film.type==='video'){
   const video=document.createElement('video');video.playsInline=true;video.setAttribute('playsinline','');video.loop=true;video.muted=true;video.preload='metadata';video.crossOrigin='anonymous';video.poster=e.film.poster;video.src=e.film.src;e.video=video;
   const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
   e.videoMaterial=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
   video.addEventListener('canplay',()=>{if(e.failed)return;clearTimeout(e.loadTimer);e.ready=true;e.loading=false;play(e);});
   video.addEventListener('playing',()=>{clearStartTimer(e);e.playing=true;if(!e.failed&&enabled&&active===e)expose(e);else pause(e);});
   video.addEventListener('error',()=>fail(e));video.load();
   return;
  }
  youtubeAPI().then(YT=>{
   if(e.failed)return;
   const element=document.createElement('div');element.className='museum-screen';element.style.width='960px';element.style.height=(960*e.height/e.width)+'px';
   const iframe=document.createElement('iframe');iframe.title=e.film.title;iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.src=youtubeURL(e.film,{api:true});element.appendChild(iframe);
   const object=new CSS3DObject(element);element.style.pointerEvents='none';element.style.opacity='0';object.position.copy(e.position);object.quaternion.copy(e.board.getWorldQuaternion(new THREE.Quaternion()));object.scale.setScalar(e.width/960);cssScene.add(object);e.object=object;
   // CSS3DRenderer only mounts visible objects. Attach the transparent player in
   // its final DOM parent before YT.Player initializes; keep the poster until PLAYING.
   cssRenderer.render(cssScene,camera);
   e.player=new YT.Player(iframe,{events:{
    onReady:()=>{if(e.failed)return;clearTimeout(e.loadTimer);e.loading=false;e.ready=true;e.player.mute();e.player.setVolume(0);play(e);},
    onStateChange:event=>{
     e.playing=event.data===YT.PlayerState.PLAYING;
     if(e.playing){clearStartTimer(e);if(!e.failed&&enabled&&active===e)expose(e);else pause(e);}
     else if(event.data===YT.PlayerState.ENDED&&enabled&&active===e){e.player.seekTo(0);e.player.playVideo();}
    },
    onError:()=>fail(e),
    onAutoplayBlocked:()=>{clearStartTimer(e);e.blocked=true;e.requested=true;e.playing=false;showPoster(e);}
   }});
  }).catch(()=>fail(e));
 }
 function setSound(value){
  sound=Boolean(value);
  for(const e of entries){
   if(e.player&&e.ready){if(sound&&e===active){e.player.unMute();e.player.setVolume(Math.round(e.volume*80));if(e.blocked){e.requested=false;play(e);}}else{e.player.mute();e.player.setVolume(0);}}
   if(e.video){e.video.muted=!sound||e.film.audio===false||e!==active;if(e===active&&e.blocked){e.requested=false;play(e);}}
  }
  return sound;
 }
 function suspend(){enabled=false;for(const e of entries)pause(e);active=null;status(null,'');}
 function update(camera,delta,{walking=true,allowed=true}={}){
  enabled=allowed&&walking&&!document.hidden;
  if(!enabled){if(active)suspend();return;}
  elapsed+=delta;
  camera.getWorldDirection(forward);
  const nearest=selectViewingFilm(entries,camera.position,forward,active?.id);
  const next=nearest?.entry||null;
  if(next!==active){if(active)pause(active);active=next;if(active){active.requested=false;ensure(active,camera);}else status(null,'');}
  if(!active){
   const nearby=entries.map(entry=>({entry,state:entry.zone?viewingState(entry.zone,camera.position,forward):null})).filter(o=>o.state?.level&&o.state.distance<3.2).sort((a,b)=>a.state.distance-b.state.distance)[0];
   status(nearby?.entry,nearby?(nearby.state.inside?'Face the screen to watch':'Stand in the glowing area to watch'):'');return;
  }
  const e=active,d=nearest.distance,front=e.normal.dot(camera.position.clone().sub(e.position))>0;
  const projected=e.position.clone().project(camera),visible=front&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.15&&Math.abs(projected.y)<1.15;
  // The visible floor zone and facing direction govern every kind of film.
  if(!visible){if(e.playing||e.requested)pause(e);status(e,'Face the screen to watch');return;}
  if(!e.requested&&!e.blocked)play(e);expose(e);
  const gain=distanceGain(d);e.volume+=(gain-e.volume)*(1-Math.exp(-delta*4));
  if(elapsed>.18){elapsed=0;
   if(e.player&&e.ready&&e.playing){const v=sound?Math.round(e.volume*80):0;e.player.setVolume(v);if(sound&&v>0)e.player.unMute();else e.player.mute();}
   if(e.video){e.video.muted=!sound||e.film.audio===false;e.video.volume=sound&&e.film.audio!==false?e.volume*.8:0;}
  }
  status(e,e.failed?'Film available on the project page':e.blocked?'Open the project to play this film':!e.playing?'Loading film…':e.film.audio===false?'Process film · silent':sound&&gain>.02?'Film playing · sound nearby':'Film playing · sound off');
 }
 function render(camera){cssRenderer.render(cssScene,camera);}
 function resize(){cssRenderer.setSize(innerWidth,innerHeight);}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',suspend);
 return {update,render,resize,suspend,setSound,entries,get active(){return active;}};
}
