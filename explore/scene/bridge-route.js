import * as THREE from 'three';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export const LANDSCAPE_FLIGHTS=[
 {fromZ:21,toZ:13,fromY:5.6,toY:7.08,steps:11},
 {fromZ:8.2,toZ:3.4,fromY:7.08,toY:8.5,steps:11},
 {fromZ:-2.2,toZ:-12,fromY:8.5,toY:10.3,steps:13},
 {fromZ:-17.1,toZ:-20,fromY:10.3,toY:11.2,steps:7}
];
export function spineElevation(z){
 let y=LANDSCAPE_FLIGHTS[0].fromY;
 for(const f of LANDSCAPE_FLIGHTS){
  if(z>=f.fromZ)return y;
  if(z>=f.toZ)return THREE.MathUtils.lerp(f.fromY,f.toY,(f.fromZ-z)/(f.fromZ-f.toZ));
  y=f.toY;
 }
 return y;
}
// The legacy serialized curve name is retained for existing prepared-model readers.
// This is now a route on a sculpted earth bank, with no bridge deck or supports.
export class BridgeCurve extends THREE.CatmullRomCurve3 {
 constructor(points){super(points,false,'centripetal');this.arcLengthDivisions=900;}
 getPoint(t,target=new THREE.Vector3()){
  const p=super.getPoint(t,target);p.y=spineElevation(p.z);return p;
 }
}
export function createGardenSpine(frameAt){
 const start=frameAt(0),end=frameAt(.548);
 return new BridgeCurve([
  start.p.clone().addScaledVector(start.n,start.w*.38),
  start.p.clone().addScaledVector(start.n,5.2),V(-1.0,5.7,17),
  V(-4.8,7.08,11.2),V(-5.1,7.08,8.2),V(-4.8,8.5,1.8),
  V(-2.5,8.8,-4.1),V(2.7,9.9,-10),V(7.4,10.3,-15),
  end.p.clone().addScaledVector(end.n,end.w*.5+.8),
  end.p.clone().addScaledVector(end.n,end.w*.38)
 ]);
}
// Compatibility exports for previously saved scene clients.
export const createBridgeRoute=createGardenSpine;
export const bridgeGardenOpening=()=>true;
export const bridgeGardenGround=(x,z,h)=>h;
export const BRIDGE_GARDEN_CONNECTIONS=[];
export const BRIDGE_GARDEN_LANDING={x:-4.8,y:7.08,z:11.2,width:3.8,exitX:-.5,side:1};
