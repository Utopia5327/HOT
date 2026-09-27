import * as THREE from '../assets/three.module.js';
import {buildStairFlight,bowedStation,unbowedStation} from './stair-flight.js';
import {LANDSCAPE_FLIGHTS} from './bridge-route.js';
import {bridgeHalfWidth} from './navigation-config.js';
import {COURTYARD_BOULDERS,FIRE_CIRCLE,COURTYARD_ROUTES} from './courtyard-layout.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),TAU=Math.PI*2;

export function buildLandscapeSpine({root,curve,M,mesh,surfaceGeometry,edgeGeometry,addSurface}){
 const group=new THREE.Group();group.name='Terraced garden promenade — earth-supported landscape steps';root.add(group);
 const atZ=z=>{let lo=0,hi=1;for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(curve.getPointAt(mid).z>z)lo=mid;else hi=mid;}return (lo+hi)/2;};
 const ranges=LANDSCAPE_FLIGHTS.map(f=>{const a=atZ(f.fromZ),b=atZ(f.toZ);return {a,b,bend:(b-a)*.085};});
 const basePoint=(t,u)=>{const p=curve.getPointAt(t),d=curve.getTangentAt(t);return p.addScaledVector(V(-d.z,0,d.x).normalize(),u*bridgeHalfWidth(t));};
 const point=(t,u)=>{const p=basePoint(t,u),f=ranges.find(r=>t>r.a&&t<r.b);if(f&&Math.abs(u)<1)p.y=curve.getPointAt(unbowedStation(t,u,f.a,f.b,f.bend)).y;return p;};
 const path=mesh(surfaceGeometry((t,u)=>point(t,u).add(V(0,.026,0)),240,10),M.gardenPaving,group);addSurface(path,'landscape-path');
 for(const side of [-1,1])mesh(edgeGeometry(t=>point(t,side).add(V(0,.026,0)),t=>point(t,side).add(V(0,-.30,0)),240),M.foundation,group).material.side=THREE.DoubleSide;
 const steps=[];
 for(const [i,flight] of LANDSCAPE_FLIGHTS.entries()){
  const {a,b,bend}=ranges[i],stairPoint=(t,u)=>basePoint(bowedStation(t,u,a,b,bend),u).setY(curve.getPointAt(t).y);
  const stair=buildStairFlight({id:'Landscape flight '+(i+1),parent:group,point:stairPoint,parameters:Array.from({length:flight.steps+1},(_,j)=>atZ(THREE.MathUtils.lerp(flight.fromZ,flight.toZ,j/flight.steps))),material:M.gardenPaving,riserMaterial:M.stairEdge,nosingMaterial:M.stairEdge,mesh,surfaceGeometry,edgeGeometry,addSurface,type:'landscape-step'});
  steps.push(...stair.steps);
 }
 // Ground-level stone margins stop at every branch, so they never fence a junction.
 const others=COURTYARD_ROUTES.flatMap(r=>r.curve.getSpacedPoints(100).map(p=>({p,half:r.width/2})));
 for(const side of [-1,1])for(let i=0;i<240;i++){
  const t=(i+.5)/240,p=point(t,side);if(others.some(s=>Math.hypot(p.x-s.p.x,p.z-s.p.z)<s.half+.15))continue;
  mesh(surfaceGeometry((f,u)=>{const tt=(i+f)/240;return point(tt,side*(1+u*.075/bridgeHalfWidth(tt))).add(V(0,.047,0));},1,1),M.stairBrick,group);
 }
 group.userData.landscapeSpine={bridgeRemoved:true,steps,samples:curve.getSpacedPoints(180).map(p=>p.toArray()),minimumWidth:3.7};
 return {root:group,path,steps};
}

export function buildRockGarden({root,M,groundHeight,lawn,mesh,box,tube,addSurface,navigationBlocks}){
 const group=new THREE.Group();group.name='Retained rock outcrops and recessed fire garden';root.add(group);
 M.boulder=M.foundation.clone();M.boulder.vertexColors=true;M.boulder.color.set('#938b7c');M.boulder.roughness=1;
 const boulders=[],ray=new THREE.Raycaster(),down=V(0,-1,0);lawn.updateWorldMatrix(true,false);
 M.excavatedEarth=new THREE.MeshStandardMaterial({color:'#83765e',roughness:1});
 const visibleGround=(x,z)=>{ray.set(V(x,70,z),down);return Math.max(groundHeight(x,z),ray.intersectObject(lawn,false)[0]?.point.y??-Infinity);};
 for(const b of COURTYARD_BOULDERS){
  const y=groundHeight(b.x,b.z),geo=new THREE.SphereGeometry(1,28,20),p=geo.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),dy=p.getY(i),z=p.getZ(i),warp=1+.065*Math.sin(x*7+b.seed)*Math.cos(z*6-2*dy)+.045*Math.sin(dy*11+z*4);
   p.setXYZ(i,x*warp,dy*(.96+.05*Math.sin(x*9+z*6)),z*warp);
   const strata=.82+.12*Math.sin(dy*28+x*3+z*2)+.035*Math.sin(x*32+z*25);colors.push(strata,strata*.98,strata*.93);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const rock=mesh(geo,M.boulder,group,b.x,y+b.height*.35,b.z);rock.scale.set(b.rx,b.height*.65,b.rz);rock.name='Exposed retained boulder';rock.userData.keepSeparate=true;rock.userData.boulder={...b,ground:y};
  boulders.push(rock);
  // An irregular excavated seam is mostly concealed by groundcover. The stone
  // reads as an existing outcrop, rather than an object placed on a circular pad.
  const collar=new THREE.RingGeometry(1.00,1.28,64,3);collar.rotateX(-Math.PI/2);const cp=collar.attributes.position;
  for(let i=0;i<cp.count;i++){const a=Math.atan2(cp.getZ(i),cp.getX(i)),w=1+.06*Math.sin(a*5+b.seed),x=b.x+cp.getX(i)*b.rx*w,z=b.z+cp.getZ(i)*b.rz*w;cp.setXYZ(i,x,visibleGround(x,z)+.04,z);}collar.computeVertexNormals();mesh(collar,M.excavatedEarth,group).castShadow=false;
  for(let i=0;i<28;i++){const a=i/28*TAU,c=(i+1)/28*TAU;navigationBlocks.push({a:[b.x+Math.cos(a)*b.rx,b.z+Math.sin(a)*b.rz],b:[b.x+Math.cos(c)*b.rx,b.z+Math.sin(c)*b.rz],radius:.06,bottom:y-.5,top:y+b.height,kind:'retained-boulder'});}
 }
 const fire=FIRE_CIRCLE;
 function ring(inner,outer,y,material,walk=false){const g=inner?new THREE.RingGeometry(inner,outer,96,2):new THREE.CircleGeometry(outer,96);g.rotateX(-Math.PI/2);const o=mesh(g,material,group,fire.x,y,fire.z);if(walk)addSurface(o,'fire-garden');return o;}
 ring(0,3.44,fire.floor+.022,M.gravel,true);
 const stoneMaterial=M.gardenPaving,stonePlans=[];
 // Small Voronoi flagstones, clipped against the real fire-court perimeter.
 // Fine recessed joints create an irregular cut-stone surface without a texture.
 const sites=[];for(let x=-3.5;x<=3.5;x+=.9)for(let z=-3.5;z<=3.5;z+=.9){const j=Math.sin(x*48.7+z*27.1);sites.push([x+j*.20,z+Math.cos(x*29-z*38)*.19]);}
 const clip=(poly,nx,nz,c)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a[0]*nx+a[1]*nz-c,db=b[0]*nx+b[1]*nz-c;if(da<=0)out.push(a);if((da<0)!==(db<0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return out;};
 sites.forEach((s,k)=>{
  let poly=Array.from({length:96},(_,i)=>[Math.cos(i/96*TAU)*3.42,Math.sin(i/96*TAU)*3.42]);
  for(const o of sites){if(o===s)continue;poly=clip(poly,o[0]-s[0],o[1]-s[1],(o[0]*o[0]+o[1]*o[1]-s[0]*s[0]-s[1]*s[1])/2);if(!poly.length)break;}
  if(poly.length<3)return;
  const center=poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0]);poly=poly.map(p=>[center[0]+(p[0]-center[0])*.958,center[1]+(p[1]-center[1])*.958]);
  const shape=new THREE.Shape(poly.map(p=>new THREE.Vector2(p[0],-p[1]))),geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);
  const colors=new Float32Array(geo.attributes.position.count*3).fill(.80+(k%7)*.027);geo.setAttribute('color',new THREE.BufferAttribute(colors,3));mesh(geo,stoneMaterial,group,fire.x,fire.floor+.033,fire.z);stonePlans.push(poly.map(p=>[p[0]+fire.x,p[1]+fire.z]));
 });
 const openingStart=.98,openingEnd=2.16;
 for(const [inner,outer,y] of [[2.35,2.70,fire.floor+.14],[2.70,3.08,fire.floor+.28],[3.08,3.48,fire.level]]){
  const g=new THREE.RingGeometry(inner,outer,36,1,-openingEnd,openingEnd-openingStart);g.rotateX(-Math.PI/2);addSurface(mesh(g,M.gardenPaving,group,fire.x,y+.022,fire.z),'fire-garden');
  const riser=new THREE.CylinderGeometry(inner,inner,.14,48,1,true,Math.PI/2-openingEnd,openingEnd-openingStart);mesh(riser,M.foundation,group,fire.x,y-.05,fire.z).material.side=THREE.DoubleSide;
 }
 // One embracing retaining wall frames the fire court, opening to the path.
 M.fireWall=new THREE.MeshStandardMaterial({color:'#c8bcaa',roughness:1});
 const wallPoints=[];
 for(let i=0;i<100;i++){
  const a=openingEnd+i/100*(TAU+openingStart-openingEnd),b=openingEnd+(i+1)/100*(TAU+openingStart-openingEnd),mid=(a+b)/2,r=3.54,y=fire.floor+.45;
  const p=V(fire.x+Math.cos(a)*r,y,fire.z+Math.sin(a)*r),q=V(fire.x+Math.cos(b)*r,y,fire.z+Math.sin(b)*r),len=p.distanceTo(q),angle=Math.atan2(q.x-p.x,q.z-p.z);
  box(.27,.9,len+.018,M.fireWall,group,(p.x+q.x)/2,y,(p.z+q.z)/2,angle);
  box(.36,.07,len+.025,M.gardenPaving,group,(p.x+q.x)/2,fire.floor+.92,(p.z+q.z)/2,angle);
  wallPoints.push([p.x,p.z]);navigationBlocks.push({a:[p.x,p.z],b:[q.x,q.z],radius:.15,bottom:fire.floor,top:fire.floor+.95,kind:'fire-garden-wall'});
 }
 // Dark aggregate, charred logs and embers describe the bonfire place without a
 // particle system, extra media downloads or loose gallery furniture.
 ring(.76,1.01,fire.floor+.25,M.foundation);
 mesh(new THREE.CylinderGeometry(1.01,1.01,.25,64,1,true),M.foundation,group,fire.x,fire.floor+.125,fire.z);
 ring(0,.77,fire.floor+.035,M.soil);
 for(let i=0;i<5;i++){const a=i*Math.PI/5,p=V(fire.x+Math.cos(a)*.60,fire.floor+.13,fire.z+Math.sin(a)*.60),q=V(fire.x-Math.cos(a)*.60,fire.floor+.13,fire.z-Math.sin(a)*.60);tube([p,p.clone().lerp(q,.5).add(V(0,.045,0)),q],.08,M.darkwood,group,false,6);}
 const emberMaterial=new THREE.MeshStandardMaterial({color:'#662719',emissive:'#ee581a',emissiveIntensity:.65,roughness:1});
 for(let i=0;i<13;i++){const a=i*2.399,r=.12+(i%4)*.12;mesh(new THREE.IcosahedronGeometry(.07,0),emberMaterial,group,fire.x+Math.cos(a)*r,fire.floor+.095,fire.z+Math.sin(a)*r);}
 const glow=new THREE.PointLight('#ff994e',4,6,2);glow.position.set(fire.x,fire.floor+.6,fire.z);glow.userData.dayIntensity=1;glow.userData.duskIntensity=8;group.add(glow);
 for(let i=0;i<40;i++){const a=i/40*TAU,b=(i+1)/40*TAU;navigationBlocks.push({a:[fire.x+Math.cos(a)*1.02,fire.z+Math.sin(a)*1.02],b:[fire.x+Math.cos(b)*1.02,fire.z+Math.sin(b)*1.02],radius:.10,bottom:fire.floor-.1,top:fire.floor+.6,kind:'fire-pit'});}
 group.userData.fireGarden={...fire,looseFurniture:0,steps:3,stonePlans,wallPoints};
 return {root:group,boulders,light:glow};
}
