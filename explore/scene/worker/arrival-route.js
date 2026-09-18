import * as THREE from '../assets/three.module.js';
export const ARRIVAL_HALF_WIDTH=3.6;
export const arrivalHalfWidth=t=>2.6+(ARRIVAL_HALF_WIDTH-2.6)*THREE.MathUtils.smoothstep(t,.35,.92);
// Path, threshold and foyer share the same centre line and transverse datum.
export function createArrivalRoute(frameAt){
 const f=frameAt(0),end=f.p.clone().addScaledVector(f.n,-f.w*.455),start=end.clone().addScaledVector(f.n,-44).setY(2.3),curve=new THREE.Curve();
 curve.getPoint=(t,target=new THREE.Vector3())=>target.copy(start).lerp(end,t).setY(THREE.MathUtils.lerp(start.y,end.y,Math.min(1,t/.94)));
 curve.arcLengthDivisions=300;
 return {curve,start,end,axis:f.n.clone(),across:f.d.clone().negate()};
}
export function arrivalGround(x,z,h,route){
 const dx=x-route.end.x,dz=z-route.end.z,along=dx*route.axis.x+dz*route.axis.z,across=dx*route.across.x+dz*route.across.z;
 if(along>1.5||along< -72)return h;
 const t=THREE.MathUtils.clamp(1+along/44,0,1),grade=route.curve.getPoint(t).y-.24,half=arrivalHalfWidth(t),slope=Math.max(3.2,(grade-h)*1.6);
 const side=1-THREE.MathUtils.smoothstep(Math.abs(across),half+.15,half+.15+slope),end=1-THREE.MathUtils.smoothstep(-along,44,72);
 return THREE.MathUtils.lerp(h,grade,side*end);
}
