import * as THREE from '../assets/three.module.js';
import {bridgeHalfWidth} from './navigation-config.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export const BRIDGE_GARDEN_LANDING={x:-4.8,y:7.08,z:10.5,width:3,exitX:-.5,side:1};
export const BRIDGE_GARDEN_CONNECTIONS=[
 BRIDGE_GARDEN_LANDING,
 {x:-4.8,y:8.5,z:1.8,width:3,exitX:-.5,side:1},
 {x:-4.8,y:8.5,z:1.8,width:3,exitX:-9,side:-1},
 {x:7.4,y:10.3,z:-15,width:2.6,exitX:3.8,side:-1}
];
// Monotone plan and explicitly level junctions prevent return bends, twisted
// balustrades and Catmull-Rom height overshoot at the garden connections.
export class BridgeCurve extends THREE.CatmullRomCurve3 {
 constructor(points){super(points,false,'catmullrom',.25);this.arcLengthDivisions=900;}
 getPoint(t,target=new THREE.Vector3()){
  const p=super.getPoint(t,target),stops=[[this.points[0].z,this.points[0].y],[21,this.points[0].y],[17,5.7],[12.2,7.08],[8.8,7.08],[3.5,8.5],[.1,8.5],[-6,9.9],[-13.5,10.3],[-16.5,10.3],[-19.1,this.points.at(-1).y],[this.points.at(-1).z,this.points.at(-1).y]];
  for(let i=0;i<stops.length-1;i++){const [za,ya]=stops[i],[zb,yb]=stops[i+1];if(p.z<=za&&p.z>=zb){p.y=THREE.MathUtils.lerp(ya,yb,THREE.MathUtils.smoothstep((za-p.z)/(za-zb),0,1));break;}}
  return p;
 }
}
export function createBridgeRoute(frameAt){
 const start=frameAt(0),end=frameAt(.548);
 return new BridgeCurve([
  start.p.clone().addScaledVector(start.n,start.w*.38),
  start.p.clone().addScaledVector(start.n,5.2),V(.5,5.7,17),
  V(-4.8,7.08,12.2),V(-4.8,7.08,8.8),
  V(-4.8,8.5,3.5),V(-4.8,8.5,.1),V(1.5,9.9,-6),
  V(7.4,10.3,-13.5),V(7.4,10.3,-16.5),
  end.p.clone().addScaledVector(end.n,end.w*.5+.8),
  end.p.clone().addScaledVector(end.n,end.w*.38)
 ]);
}
export function bridgeGardenOpening(curve,t,side){
 const p=curve.getPointAt(t),d=curve.getTangentAt(t),edge=p.addScaledVector(V(-d.z,0,d.x).normalize(),side*bridgeHalfWidth(t)*.94);
 return BRIDGE_GARDEN_CONNECTIONS.some(l=>side===l.side&&Math.abs(edge.z-l.z)<l.width*.5+.28&&edge.x>Math.min(l.x,l.exitX)-.3&&edge.x<Math.max(l.x,l.exitX)+.3);
}
export function bridgeGardenGround(x,z,h){
 for(const l of BRIDGE_GARDEN_CONNECTIONS){const a=l.x+l.side*1.6,b=l.exitX,lx=Math.min(a,b),rx=Math.max(a,b);if(x<lx-1.2||x>rx+1.2||Math.abs(z-l.z)>l.width*.5+1.2)continue;const edge=Math.max(0,Math.abs(z-l.z)-l.width*.5,lx-x,x-rx);h=THREE.MathUtils.lerp(h,l.y-.035,1-THREE.MathUtils.smoothstep(edge,0,1.2));}return h;
}
