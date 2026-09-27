import * as THREE from 'three';
const V=p=>new THREE.Vector3(...p);
export const COURTYARD_EXHIBITS=[
 {x:3.6,z:15.1,ex:1.8,ez:11.2,level:7.08},
 {x:13.6,z:2.0,ex:9.6,ez:3.5,level:7.75},
 {x:-12.9,z:-8.6,ex:-10.6,ez:-4.3,level:8.75},
 {x:-5.4,z:-14.2,ex:-4.15,ez:-9.35,level:9.40}
];
export const BANYAN={x:2.2,z:5.2,scale:2.2};
export const COURTYARD_POND={x:12.4,z:-12.1,rx:1.65,rz:1.15,level:9.12};
export const FIRE_CIRCLE={x:9.4,z:-5.2,radius:3.3,level:8.30,floor:7.88};
// Conceptual retained outcrops; their positions leave the exhibition paths clear.
export const COURTYARD_BOULDERS=[
 {x:15.1,z:-4.8,rx:1.75,rz:1.40,height:2.8,seed:7},
 {x:14.6,z:-7.9,rx:1.08,rz:.92,height:1.7,seed:19},
 {x:-6.9,z:-3.1,rx:1.2,rz:1.05,height:2.15,seed:31},
 {x:-11.5,z:-12.5,rx:1.6,rz:1.5,height:2.45,seed:43}
];
export const COURTYARD_ROUTES=[
 {id:'west-crossing',width:2.6,points:[[-14.65,8.23,1],[-11.6,8.36,1.7],[-8.4,8.5,1.8],[-4.8,8.5,1.8]]},
 {id:'east-crossing',width:2.6,points:[[-4.8,8.5,1.8],[-1,8.5,1.6],[3.6,8.5,-.1],[7.3,8.3,0],[9.6,7.75,3.5],[11.7,7.3,6.6],[14.8,7.08,7.3]]},
 {id:'upper-exhibition-walk',width:2.6,points:[[-11.6,8.36,1.7],[-12.3,8.5,-1.8],[-10.6,8.75,-4.3],[-7.2,9.1,-7],[-4.15,9.4,-9.35],[.5,9.95,-11.8],[4.3,10.3,-14.7],[7.4,10.3,-15]]},
 {id:'lower-viewing-spur',width:2.8,points:[[-4.8,7.08,11.2],[-1.5,7.08,11.2],[1.8,7.08,11.2],[2.8,7.08,11.3]]},
 {id:'fire-circle-link',width:2.1,points:[[7.3,8.3,0],[8.4,8.3,-.5],[9.4,8.3,-1.85]]}
].map(r=>({...r,curve:new THREE.CatmullRomCurve3(r.points.map(V),false,'centripetal')}));
const routeSegments=COURTYARD_ROUTES.flatMap(r=>{const p=r.curve.getSpacedPoints(160);return p.slice(1).map((b,i)=>({a:p[i],b,half:r.width/2,depth:.22}));});
let segments=routeSegments;
export function registerGardenSpine(curve,halfWidth){
 const p=curve.getSpacedPoints(220);
 segments=[...routeSegments,...p.slice(1).map((b,i)=>({a:p[i],b,half:halfWidth((i+.5)/220),depth:.24}))];
}
export function courtyardPathDistance(x,z){let best={distance:Infinity,y:0,half:0};for(const {a,b,half,depth=.055} of segments){const dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),distance=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);if(distance<best.distance)best={distance,y:THREE.MathUtils.lerp(a.y,b.y,t),half,depth};}return best;}
export function courtyardGrade(x,z,h){
 if(Math.abs(x)>24||z>26||z< -26)return h;
 for(const b of COURTYARD_BOULDERS){const r=Math.hypot((x-b.x)/b.rx,(z-b.z)/b.rz);h-=.48*(1-THREE.MathUtils.smoothstep(r,1.04,1.7));}
 const fire=FIRE_CIRCLE,r=Math.hypot(x-fire.x,z-fire.z);
 if(r<fire.radius+1.4){const target=r<2.48?fire.floor:r<2.89?fire.floor+.14:r<3.30?fire.floor+.28:fire.level;h=THREE.MathUtils.lerp(h,target-.05,1-THREE.MathUtils.smoothstep(r,fire.radius,fire.radius+1.4));}
 const p=courtyardPathDistance(x,z),weight=1-THREE.MathUtils.smoothstep(p.distance,p.half+.40,p.half+1.5);h=THREE.MathUtils.lerp(h,p.y-p.depth,weight);
 for(const e of COURTYARD_EXHIBITS){const angle=Math.atan2(e.ex-e.x,e.ez-e.z),dx=x-e.x,dz=z-e.z,r=Math.hypot((dx*Math.cos(angle)-dz*Math.sin(angle))/4.5,(dx*Math.sin(angle)+dz*Math.cos(angle))/2.5);if(r<1.25)h=THREE.MathUtils.lerp(h,e.level-.035,1-THREE.MathUtils.smoothstep(r,.9,1.25));}
 // Cut the soil beneath the entire fire-court slab, including its approach.
 // This prevents the coarse terrain triangles from showing through the steps.
 if(r<3.90)h=Math.min(h,fire.floor-.18);
 else if(r<4.40)h=THREE.MathUtils.lerp(Math.min(h,fire.floor-.18),h,THREE.MathUtils.smoothstep(r,3.90,4.40));
 const pond=COURTYARD_POND,pr=Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz);
 if(pr<1.5)h=THREE.MathUtils.lerp(h,pond.level-.32,1-THREE.MathUtils.smoothstep(pr,1.05,1.5));
 return h;
}
