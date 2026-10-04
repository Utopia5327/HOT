import * as THREE from 'three';
import {EYE_HEIGHT} from '../navigation-config.js';
import {BANYAN,FIRE_CIRCLE} from '../courtyard-layout.js';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
export const FPS=30;

// Easing. Shots open and close on a slow curve so no move starts or stops with a
// jolt; `glide` is the workhorse, `settle` is for shots that drift to a stop.
const ease={
 glide:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
 settle:t=>1-Math.pow(1-t,3),
 lead:t=>t*t*(3-2*t),
 linear:t=>t
};

// A little hand-held float, sampled from summed sines rather than noise so the
// same frame index always produces the same offset — a re-render matches
// frame for frame. Only the eye-level shots ask for it.
function handheld(frame,scale){
 const t=frame/FPS;
 return V(
  Math.sin(t*1.7)*.018+Math.sin(t*.61)*.030,
  Math.sin(t*2.3+1.1)*.014+Math.sin(t*.83+.4)*.021,
  Math.sin(t*1.3+2.2)*.018+Math.sin(t*.47+1.7)*.026
 ).multiplyScalar(scale);
}

// Each shot declares its duration in seconds, the dusk amount at its start and
// end, and a `frame(u, ctx)` that returns {eye, target, fov} for u in 0..1.
// Anchors come off the built campus rather than being hardcoded, so the film
// follows the model when the model moves.
export function buildShots(campus){
 const spots=campus.spots,gallerySpots=spots.filter(s=>s.region==='gallery');
 const courtyardSpot=spots.find(s=>s.region==='courtyard')||spots.at(-1);
 const spine=campus.bridgeCurve;
 const banyan=V(BANYAN.x,0,BANYAN.z);
 const fire=V(FIRE_CIRCLE.x,FIRE_CIRCLE.level,FIRE_CIRCLE.z);
 const centre=V(-2,9,1);

 // An orbit helper: sweep an arc at a radius and height about a pivot.
 const orbit=(pivot,radius,height,fromDeg,toDeg,u,eased)=>{
  const a=THREE.MathUtils.degToRad(THREE.MathUtils.lerp(fromDeg,toDeg,eased(u)));
  return V(pivot.x+Math.cos(a)*radius,pivot.y+height,pivot.z+Math.sin(a)*radius);
 };
 const between=(a,b,u,eased)=>a.clone().lerp(b,eased(u));

 // The courtyard orbit is declared once: the descent ends on its first frame,
 // so the two shots meet without a jump and the cut reads as continuous.
 //
 // The radius is what keeps the camera in open air — the courtyard is ringed by
 // roofs, and much past 14m the lens ends up under a soffit. It rises through
 // the move instead, which also carries it clear of the banyan's trunks rather
 // than orbiting straight through them.
 const ORBIT={pivot:V(banyan.x,8.2,banyan.z),radius:13.2,from:150,to:92};
 const courtyardOrbit=(u,eased)=>orbit(ORBIT.pivot,ORBIT.radius,THREE.MathUtils.lerp(4.4,10.2,eased(u)),ORBIT.from,ORBIT.to,u,eased);
 const orbitLook=u=>V(fire.x,fire.y+.9,fire.z).lerp(V(banyan.x+2.4,9.2,banyan.z-1.2),ease.glide(u ?? 0));

 // Walk the stretch of promenade that actually passes the exhibits, rather
 // than a fixed span that can land in an empty bay when the route changes.
 const walk=gallerySpots.map(s=>s.t).filter(t=>typeof t==='number').sort((a,b)=>a-b);
 const walkFrom=walk.length?Math.max(0,walk[0]-.035):.30;
 const walkTo=walk.length>1?Math.min(1,walk[1]+.025):.46;

 return [
  {
   name:'establishing-crane',seconds:9,dusk:[0,0],fov:[38,44],
   // High and wide, swinging slowly round the campus while losing height. The
   // whole scheme reads before anything else happens.
   frame:(u)=>({
    eye:orbit(centre,78,34,28,-6,u,ease.glide).setY(THREE.MathUtils.lerp(41,27,ease.glide(u))),
    target:centre.clone().setY(THREE.MathUtils.lerp(10,9,u))
   })
  },
  {
   name:'roofscape-glide',seconds:9,dusk:[0,.06],fov:[40,40],
   // Lower and tracking, so the undulating tiled roofs pass across frame.
   frame:(u)=>({
    eye:between(V(44,22,40),V(6,15,30),u,ease.glide),
    target:between(V(4,11,6),V(-3,9,2),u,ease.glide)
   })
  },
  {
   name:'descent-to-garden',seconds:10,dusk:[.06,.22],fov:[40,46],
   // Crane down past the banyan and into the courtyard.
   frame:(u)=>({
    eye:between(V(6,15,30),courtyardOrbit(0,ease.linear),u,ease.glide),
    target:between(V(-3,9,2),orbitLook(0),u,ease.lead)
   })
  },
  {
   name:'promenade',seconds:10,dusk:[.22,.40],fov:[46,46],handheld:1,
   // Eye level on the landscape spine, walking up through the garden steps.
   frame:(u)=>{
    const t=THREE.MathUtils.lerp(.72,.40,ease.linear(u));
    const eye=spine.getPointAt(t).add(V(0,EYE_HEIGHT,0));
    const ahead=spine.getPointAt(Math.max(0,t-.045)).add(V(0,EYE_HEIGHT-.12,0));
    return {eye,target:ahead};
   }
  },
  {
   name:'gallery-interior',seconds:9,dusk:[.40,.55],fov:[50,50],handheld:1,
   // Through the gallery promenade itself, using the route the walk mode uses.
   frame:(u)=>{
    const t=THREE.MathUtils.lerp(walkFrom,walkTo,ease.lead(u));
    return {eye:campus.routeEye(t),target:campus.routeLook(t)};
   }
  },
  {
   name:'exhibit-reveal',seconds:8,dusk:[.55,.70],fov:[44,34],
   // A slow push onto one of the project displays; the narrowing lens does the
   // work so the camera barely has to move.
   frame:(u)=>{
    const spot=gallerySpots[1]||gallerySpots[0]||spots[0];
    const back=spot.eye.clone().sub(spot.target).setY(0).normalize();
    return {
     eye:spot.eye.clone().addScaledVector(back,THREE.MathUtils.lerp(2.6,.2,ease.glide(u))),
     target:spot.target.clone()
    };
   }
  },
  {
   name:'courtyard-dusk',seconds:8,dusk:[.70,.86],fov:[44,44],
   // Orbiting the banyan as the lamps come up.
   frame:(u)=>({
    eye:courtyardOrbit(u,ease.glide),
    target:orbitLook(u)
   })
  },
  {
   name:'fire-court',seconds:8,dusk:[.86,.97],fov:[46,46],handheld:.8,
   // Low and close, walking in on the fire circle.
   frame:(u)=>({
    eye:between(V(fire.x+1.2,fire.y+EYE_HEIGHT,fire.z+9.4),V(fire.x+.4,fire.y+1.45,fire.z+4.6),u,ease.settle),
    target:between(V(fire.x,fire.y+.5,fire.z),V(fire.x,fire.y+.15,fire.z),u,ease.lead)
   })
  },
  {
   name:'final-rise',seconds:4,dusk:[.97,1],fov:[46,40],
   // Pull up and off, the lit gallery behind the fire court.
   frame:(u)=>({
    eye:between(V(fire.x+.4,fire.y+1.45,fire.z+4.6),V(fire.x+6,fire.y+17,fire.z-9),u,ease.glide),
    target:between(V(fire.x,fire.y+.15,fire.z),V(fire.x,fire.y+.3,fire.z),u,ease.glide)
   })
  }
 ].map((shot,i)=>({...shot,index:i,frames:Math.round(shot.seconds*FPS),handheld:shot.handheld||0,courtyardSpot}));
}

// Flatten the shot list into an absolute frame timeline, so the recorder can
// address any frame — or any single shot — without re-deriving the cut.
export function buildTimeline(campus){
 const shots=buildShots(campus);
 let start=0;
 const entries=shots.map(shot=>{const e={...shot,start,end:start+shot.frames};start+=shot.frames;return e;});
 return {shots:entries,totalFrames:start,fps:FPS,seconds:start/FPS};
}

export function cameraAt(timeline,frame){
 const shot=timeline.shots.find(s=>frame>=s.start&&frame<s.end)||timeline.shots.at(-1);
 const local=Math.min(shot.frames-1,frame-shot.start);
 const u=shot.frames>1?local/(shot.frames-1):0;
 const {eye,target}=shot.frame(u,{campus:null});
 const fov=THREE.MathUtils.lerp(shot.fov[0],shot.fov[1],ease.glide(u));
 const dusk=THREE.MathUtils.lerp(shot.dusk[0],shot.dusk[1],u);
 if(shot.handheld){const wobble=handheld(frame,shot.handheld);eye.add(wobble);target.add(wobble.clone().multiplyScalar(.35));}
 return {eye,target,fov,dusk,shot:shot.name,shotIndex:shot.index};
}
