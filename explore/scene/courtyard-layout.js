import * as THREE from 'three';
const V=p=>new THREE.Vector3(...p);
export const COURTYARD_EXHIBITS=[
 {x:5,z:15.2,ex:5,ez:11.2,level:7.08},
 {x:15,z:4.5,ex:10.8,ez:4.5,level:7.20},
 {x:-14.4,z:-8.2,ex:-10.3,ez:-4.6,level:8.65},
 {x:-3.5,z:-14,ex:-3.5,ez:-9.7,level:9.45}
];
export const BANYAN={x:1.2,z:4.8,scale:2.35};
export const COURTYARD_POND={x:3.6,z:-3.8,rx:1.9,rz:1.3,level:7.22};
export const COURTYARD_ROUTES=[
 {id:'south-east-loop',width:2.4,points:[[-.5,7.08,10.5],[2.5,7.08,11.5],[5,7.08,11.2],[8.4,7.12,8.6],[10.8,7.2,4.5],[10.6,7.7,.4],[6.2,8.15,.1],[2.8,8.4,1.8],[-.5,8.5,1.8]]},
 {id:'north-west-loop',width:2.4,points:[[-9,8.5,1.8],[-11.1,8.55,-1],[-10.3,8.65,-4.6],[-7.6,9,-7.7],[-3.5,9.45,-9.7],[.5,9.9,-11.4],[2.4,10.15,-14.3],[3.8,10.3,-15]]},
 {id:'west-garden-link',width:2.2,points:[[-14.65,8.23,1],[-13.3,8.38,.8],[-11.1,8.55,-1]]},
 {id:'east-garden-link',width:2.3,points:[[14.8,7.08,7.3],[12.7,7.13,6.3],[10.8,7.2,4.5]]}
].map(r=>({...r,curve:new THREE.CatmullRomCurve3(r.points.map(V),false,'catmullrom',.25)}));
const segments=COURTYARD_ROUTES.flatMap(r=>{const p=r.curve.getSpacedPoints(110);return p.slice(1).map((b,i)=>({a:p[i],b,half:r.width/2}));});
export function courtyardPathDistance(x,z){let best={distance:Infinity,y:0,half:0};for(const {a,b,half} of segments){const dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),distance=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);if(distance<best.distance)best={distance,y:THREE.MathUtils.lerp(a.y,b.y,t),half};}return best;}
export function courtyardGrade(x,z,h){
 if(Math.abs(x)>23||z>20||z< -21)return h;
 const p=courtyardPathDistance(x,z),weight=1-THREE.MathUtils.smoothstep(p.distance,p.half+.16,p.half+1.5);h=THREE.MathUtils.lerp(h,p.y-.035,weight);
 for(const e of COURTYARD_EXHIBITS){const r=Math.hypot((x-e.x)/4.5,(z-e.z)/2.5);if(r<1.25)h=THREE.MathUtils.lerp(h,e.level-.035,1-THREE.MathUtils.smoothstep(r,.9,1.25));}
 return h;
}
