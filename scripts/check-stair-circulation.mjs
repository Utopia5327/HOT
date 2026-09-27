// Check the prepared production geometry, including its collision and plan data.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../explore/scene/assets/three.module.js';
import {unpackCampus} from '../explore/scene/worker/campus-transfer.js';
import {frameAt,nearestRoute,galleryFloorHeight} from '../explore/scene/worker/campus.js';
import {readCampusPayload} from '../explore/scene/scene-binary.js';
import {SCENE_ASSETS} from '../explore/scene/scene-assets.js';
import {COURTYARD_ROUTES} from '../explore/scene/worker/courtyard-layout.js';
const V=(...p)=>new THREE.Vector3(...p);
for(const [quality,file] of Object.entries(SCENE_ASSETS)){
 const bytes=await readFile(new URL('../explore/scene/'+file,import.meta.url));
 const c=unpackCampus(await readCampusPayload(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),frameAt);
 const flights=[],exhibits=[];let foyer;
 c.root.traverse(o=>{if(o.userData.stairFlight)flights.push(o.userData.stairFlight);if(o.userData.exhibitFootprint)exhibits.push(o);if(o.userData.foyerAxis)foyer=o.userData.foyerAxis;});
 assert.equal(flights.length,9);assert.equal(flights.reduce((n,f)=>n+f.steps.length,0),132);
 for(const f of flights){
  assert.ok(f.centerline.at(-1)[1]>f.centerline[0][1],f.id+' UP arrow');
  assert.equal(f.boundaries.length,f.steps.length+1);
  const rise=Math.abs(f.to-f.from)/f.steps.length;
  for(const s of f.steps)assert.ok(Math.abs(s.rise-rise)<.002,f.id+' equal risers');
 }
 const stairTypes=new Set(['promenade-stair','garden-entry-stair','landscape-step']),a=V(),b=V(),d=V(),ab=V(),ad=V();let faces=0;
 for(const s of c.walkSurfaces.filter(s=>stairTypes.has(s.type)||s.type==='foyer')){
  const g=s.mesh.geometry,p=g.attributes.position,ix=g.index;
  for(let i=0;i<(ix?.count??p.count);i+=3){
   a.fromBufferAttribute(p,ix?ix.getX(i):i).applyMatrix4(s.mesh.matrixWorld);b.fromBufferAttribute(p,ix?ix.getX(i+1):i+1).applyMatrix4(s.mesh.matrixWorld);d.fromBufferAttribute(p,ix?ix.getX(i+2):i+2).applyMatrix4(s.mesh.matrixWorld);
   assert.ok(ab.subVectors(b,a).cross(ad.subVectors(d,a)).y>1e-7,s.type+' folded face');
   assert.ok(Math.max(a.y,b.y,d.y)-Math.min(a.y,b.y,d.y)<.001,s.type+' tread not flat');
   if(stairTypes.has(s.type))faces++;
  }
 }
 assert.equal(faces,12672);
 const ray=new THREE.Raycaster(),walk=c.walkSurfaces.filter(s=>stairTypes.has(s.type)).map(s=>s.mesh);
 for(const f of flights.filter(f=>f.type==='promenade-stair'))for(const step of f.steps){
  const p=V(...step.a).lerp(V(...step.b),.5);ray.set(V(p.x,step.top+.1,p.z),V(0,-1,0));
  const hit=ray.intersectObjects(walk,false)[0];assert.ok(hit&&Math.abs(hit.point.y-step.top)<.001);
  assert.ok(Math.abs(galleryFloorHeight(nearestRoute(p.x,p.z))-step.top)<.012,'walking height matches tread');
 }
 assert.ok(foyer?.outline.length===4);
 const courtyardPaths=COURTYARD_ROUTES.flatMap(r=>r.curve.getSpacedPoints(300).map(p=>({p,half:r.width/2})));
 const project05=exhibits.find(o=>o.userData.exhibitFootprint.projectId==='manav');assert.ok(project05,'project 05 exists');
 for(const o of exhibits){const f=o.userData.exhibitFootprint;if(f.terrace)continue;
  for(let i=0;i<=40;i++)for(const z of [f.back,f.front]){
   const p=V(THREE.MathUtils.lerp(f.left,f.right,i/40),0,z).applyMatrix4(o.matrixWorld);
   if(f.outdoor)assert.ok(!courtyardPaths.some(s=>Math.hypot(p.x-s.p.x,p.z-s.p.z)<s.half),f.projectId+' frame crosses circulation');
   if(o===project05){const r=nearestRoute(p.x,p.z);assert.ok(r.offset<0&&Math.abs(r.offset)<=r.w*.455-.25,'project 05 clears outer glazing');}
  }
 }
 console.log(`PASS ${quality}: 9 curved flights, 132 flat treads, 12,672 upward faces; walking heights, foyer and full exhibit frames clear`);
}
