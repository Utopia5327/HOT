import * as THREE from '../assets/three.module.js';
import {encodeScene,decodeScene} from './scene-transfer.js';
import {BridgeCurve} from './bridge-route.js';
import {EYE_HEIGHT} from './navigation-config.js';

const encode=v=>v?.isVector3?v.toArray():v;
// Geometry is built away from the UI thread. UUIDs preserve shared materials,
// picking, collision surfaces and museum screens when the scene returns.
export function packCampus(c){
  const collisions=new THREE.Group();collisions.name='Navigation surfaces';collisions.visible=false;
  const surfaces=c.walkSurfaces.map(s=>{
    const o=new THREE.Mesh(s.mesh.geometry,s.mesh.material);o.matrix.copy(s.mesh.matrixWorld);o.matrixAutoUpdate=false;collisions.add(o);return {id:o.uuid,type:s.type};
  });c.root.add(collisions);
  const vectorRecord=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined).map(([k,v])=>[k,encode(v)]));
  const packed={
    model:encodeScene(c.root),surfaces,navigationBlocks:c.navigationBlocks,
    groups:Object.fromEntries(['architecture','roofs','landscape','furniture','media'].map(k=>[k,c[k].uuid])),
    materials:Object.fromEntries(Object.entries(c.materials).map(([k,v])=>[k,v.uuid])),
    artworks:c.artworks.map(o=>o.uuid),artMaterials:c.artMaterials.map(a=>({material:a.material.uuid,src:a.src})),
    lamps:c.lamps.map(o=>o.uuid),water:c.waterSurface.uuid,
    videoScreens:c.videoScreens.map(s=>({...s,board:s.board.uuid})),
    spots:c.spots.map(s=>({...vectorRecord(s),frame:vectorRecord(s.frame)})),
    bridgePoints:c.bridgeCurve.points.map(encode),bridgeSamples:c.bridgeSamples.map(encode),
    roofTerraces:c.roofTerraces.map(({id,name,t,half,level,width,eye,target})=>({id,name,t,half,level,width,eye:encode(eye),target:encode(target)})),
    garden:{eye:encode(c.garden.eye),target:encode(c.garden.target)},
    arrival:{eye:encode(c.arrival.eye),target:encode(c.arrival.target)},overview:{eye:encode(c.overview.eye),target:encode(c.overview.target)}
  };
  c.root.remove(collisions);return packed;
}
export function unpackCampus(data,frameAt){
  const root=decodeScene(data.model),objects=new Map(),materials=new Map();
  root.traverse(o=>{objects.set(o.uuid,o);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.uuid,m);});
  const vec=a=>new THREE.Vector3(...a),view=o=>({eye:vec(o.eye),target:vec(o.target)});
  const spots=data.spots.map(s=>({...s,position:vec(s.position),eye:vec(s.eye),target:vec(s.target),display:vec(s.display),frame:{...s.frame,p:vec(s.frame.p),n:vec(s.frame.n),d:vec(s.frame.d)}}));
  const c={root,navigationBlocks:data.navigationBlocks||[],...Object.fromEntries(Object.entries(data.groups).map(([k,id])=>[k,objects.get(id)])),
    materials:Object.fromEntries(Object.entries(data.materials).map(([k,id])=>[k,materials.get(id)])),
    walkSurfaces:data.surfaces.map(s=>({mesh:objects.get(s.id),type:s.type})),
    artworks:data.artworks.map(id=>objects.get(id)),artMaterials:data.artMaterials.map(s=>({...s,material:materials.get(s.material)})),
    lamps:data.lamps.map(id=>objects.get(id)),waterSurface:objects.get(data.water),
    videoScreens:data.videoScreens.map(s=>({...s,board:objects.get(s.board)})),spots,
    bridgeCurve:new BridgeCurve(data.bridgePoints.map(vec)),bridgeSamples:data.bridgeSamples.map(vec),
    roofTerraces:data.roofTerraces.map(t=>({...t,...view(t)})),garden:view(data.garden),arrival:view(data.arrival),overview:view(data.overview),
    routeEye:t=>frameAt(t).p.add(vec([0,EYE_HEIGHT,0])),routeLook:t=>frameAt(t+.012).p.add(vec([0,EYE_HEIGHT,0]))
  };
  // The first collision surface is the continuous promenade floor.
  c.floorMesh=c.walkSurfaces[0].mesh;root.updateMatrixWorld(true);return c;
}

export async function buildCampusOffThread(projects,options,buildCampus,frameAt){
  if(typeof Worker==='undefined')return buildCampus(projects,options);
  return await new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./worker/scene-worker.js',import.meta.url),{type:'module'});
    const end=()=>{clearTimeout(timer);worker.terminate();};
    const timer=setTimeout(()=>{end();reject(new Error('Landscape preparation timed out'));},90000);
    worker.onerror=error=>{end();reject(new Error(error.message||'Landscape worker failed'));};
    worker.onmessage=({data})=>{end();if(data.error){reject(new Error(data.error));return;}try{resolve(unpackCampus(data,frameAt));}catch(error){reject(error);}};
    worker.postMessage({projects,options});
  });
}
