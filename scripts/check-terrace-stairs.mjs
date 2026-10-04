import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../explore/scene/assets/three.module.js';
import {unpackCampus} from '../explore/scene/worker/campus-transfer.js';
import {frameAt,nearestRoute,groundHeight,isOpening} from '../explore/scene/worker/campus.js';
import {readCampusPayload} from '../explore/scene/scene-binary.js';
import {SCENE_ASSETS} from '../explore/scene/scene-assets.js';
import {masonryCollision} from '../explore/scene/navigation-collision.js';
import {EYE_HEIGHT} from '../explore/scene/navigation-config.js';

const V=(...p)=>new THREE.Vector3(...p);
for(const [quality,file] of Object.entries(SCENE_ASSETS)){
 const c=unpackCampus(await readCampusPayload(await readFile(new URL('../explore/scene/'+file,import.meta.url))),frameAt);
 const stairs=[],landings=[],bearings=[];c.root.traverse(o=>{if(o.userData.terraceStair)stairs.push(o.userData.terraceStair);if(o.userData.terraceLanding)landings.push(o.userData.terraceLanding);if(o.userData.stairAbutment)bearings.push(o.userData.stairAbutment);});
 assert.equal(stairs.length,3);assert.equal(landings.length,6);assert.equal(stairs.reduce((n,s)=>n+s.steps.length,0),78);
 for(const l of landings){assert.ok(l.depth>=2.8&&l.width>3);assert.equal(l.slab,.26);}
 for(const b of bearings){assert.ok(b.footingTop<Math.min(...b.ground)-.25,b.terrace+' footing buried across its width');assert.ok(b.width>2);}
 assert.equal(bearings.filter(b=>b.kind.endsWith('landing')).length,6);
 const ray=new THREE.Raycaster(),down=V(0,-1,0),walk=c.walkSurfaces.filter(s=>s.type!=='roof').map(s=>s.mesh),failures=[];
 const terrain=c.landscape.children.filter(o=>o.isMesh&&o.material===c.materials.terrain);
 let samples=0;
 for(const stair of stairs){
  const route=[...stair.lowerRoute,...stair.centerline.slice(1),...stair.upperRoute.slice(1)];
  for(let i=1;i<route.length;i++){
   const a=V(...route[i-1]),b=V(...route[i]),count=Math.max(1,Math.ceil(a.distanceTo(b)/.10));
   for(let j=0;j<=count;j++){
    const p=a.clone().lerp(b,j/count);samples++;ray.set(p.clone().add(V(0,.22,0)),down);
    const hit=ray.intersectObjects(walk,false).find(h=>h.point.y>=p.y-.06&&h.point.y<=p.y+.20);
    if(!hit)failures.push([stair.id,'missing tread/landing',p.toArray()]);
    const eye=p.clone().setY((hit?.point.y??p.y)+EYE_HEIGHT);
    if(masonryCollision(eye,c.navigationBlocks))failures.push([stair.id,'parapet/bearing blocks route',p.toArray()]);
    ray.set(V(p.x,100,p.z),down);const earth=ray.intersectObjects(terrain,false)[0];
    if(earth&&earth.point.y>p.y-.02)failures.push([stair.id,'terrain mesh crosses stair',p.toArray()]);
    if(groundHeight(p.x,p.z)>p.y-.05)failures.push([stair.id,'ground crosses stair',p.toArray()]);
    const r=nearestRoute(p.x,p.z);
    if(eye.y>=r.p.y+.2&&eye.y<=r.p.y+4.1&&r.distance<r.w*.6+1&&!isOpening(r.t,Math.sign(r.offset))&&Math.abs(Math.abs(r.offset)-r.w*.455)<.20)failures.push([stair.id,'glazing blocks landing entry',p.toArray()]);
   }
  }
 }
 assert.equal(failures.length,0,JSON.stringify(failures.slice(0,20)));
 console.log(`PASS ${quality}: 6 generous landings; 78 terrace treads; ${bearings.length} founded masonry bearings; ${samples} clear walking samples`);
}
