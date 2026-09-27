import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import * as THREE from '../explore/scene/assets/three.module.js';
import {unpackCampus} from '../explore/scene/worker/campus-transfer.js';
import {frameAt,groundHeight} from '../explore/scene/worker/campus.js';
import {readCampusPayload} from '../explore/scene/scene-binary.js';
import {SCENE_ASSETS} from '../explore/scene/scene-assets.js';
import {PROJECTS} from '../explore/scene/projects.js';
import {COURTYARD_ROUTES,BANYAN,COURTYARD_POND,COURTYARD_BOULDERS,FIRE_CIRCLE} from '../explore/scene/worker/courtyard-layout.js';
import {masonryCollision} from '../explore/scene/navigation-collision.js';
import {EYE_HEIGHT} from '../explore/scene/navigation-config.js';
import {plantingClearance} from '../explore/scene/worker/landscape-beds.js';
for(const p of PROJECTS)if(!p.films?.length){
 assert.ok(p.images.length>=5,p.id+' needs five slides');
 assert.ok(new Set(p.images.map(i=>i.texture)).size>=5);
 for(const im of p.images)await access(new URL('../explore/scene/'+im.texture,import.meta.url));
}
console.log('PASS all non-film exhibits contain at least five available slides');
for(const [quality,file] of Object.entries(SCENE_ASSETS)){
 const bytes=await readFile(new URL('../explore/scene/'+file,import.meta.url));
 const data=await readCampusPayload(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),c=unpackCampus(data,frameAt);
 assert.ok(bytes.length<14*1024*1024,'Prepared model must remain compact');
 assert.equal(c.navigationBlocks.filter(b=>b.kind.startsWith('bridge')).length,0);
 let spine,planting,boulders=[],jaali=[];
 c.root.traverse(o=>{if(o.userData.contourGarden)planting=o.userData.contourGarden;if(o.userData.landscapeSpine)spine=o.userData.landscapeSpine;if(o.userData.boulder)boulders.push(o);if(o.userData.stairJaali)jaali.push(o);});
 assert.ok(spine?.bridgeRemoved);assert.equal(boulders.length,4);assert.ok(jaali.length>=11);
 assert.ok(planting?.plants.length>200);assert.ok(planting.plants.every(p=>plantingClearance(p.x,p.z)), 'Planting must clear walking routes and exhibit sightlines');assert.equal(planting.looseFurniture,0);
 assert.ok(spine.steps.every(s=>s.rise<=.15&&s.width>=3.7));
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),walk=c.walkSurfaces.filter(s=>s.type!=='roof').map(s=>s.mesh);
 const paths=[{id:'central landscape steps',points:c.bridgeCurve.getSpacedPoints(240)},...COURTYARD_ROUTES.map(r=>({id:r.id,points:r.curve.getSpacedPoints(150)}))];
 const failures=[];
 for(const route of paths)for(const p of route.points){
  ray.set(new THREE.Vector3(p.x,p.y+.4,p.z),down);const hits=ray.intersectObjects(walk,false);const floor=hits.find(h=>h.point.y>=p.y-.15&&h.point.y<=p.y+.35);
  if(!floor)failures.push({route:route.id,reason:'missing walking surface',p:p.toArray()});
  if(masonryCollision(new THREE.Vector3(p.x,(floor?.point.y??p.y)+EYE_HEIGHT,p.z),c.navigationBlocks))failures.push({route:route.id,reason:'collision',p:p.toArray()});
  if(groundHeight(p.x,p.z)>p.y+.20)failures.push({route:route.id,reason:'earth covers path',p:p.toArray()});
  if(Math.hypot(p.x-BANYAN.x,p.z-BANYAN.z)<3.2)failures.push({route:route.id,reason:'tree clearance',p:p.toArray()});
  const pond=COURTYARD_POND;if(Math.hypot((p.x-pond.x)/pond.rx,(p.z-pond.z)/pond.rz)<1.4)failures.push({route:route.id,reason:'pond clearance',p:p.toArray()});
 }
 assert.equal(failures.length,0,JSON.stringify(failures.slice(0,16)));
 // Every exhibit still has an unobstructed standing zone at its display level.
 for(const s of c.spots){assert.ok(!masonryCollision(s.eye,c.navigationBlocks),'Viewing zone blocked: '+s.id);}
 console.log(`PASS ${quality}: bridge removed; ${spine.steps.length} landscape steps, ${jaali.length} jaali runs, four outcrops; ${paths.reduce((n,r)=>n+r.points.length,0)} clear route samples; ${(bytes.length/1048576).toFixed(1)} MiB`);
}
