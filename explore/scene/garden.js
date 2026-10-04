import { EYE_HEIGHT, bridgeHalfWidth } from './navigation-config.js';
import * as THREE from 'three';
import {createCourtyardTree} from './courtyard-tree.js';
import {COURTYARD_ROUTES,COURTYARD_POND,BANYAN,COURTYARD_EXHIBITS,FIRE_CIRCLE} from './courtyard-layout.js';
import {buildGardenPaths} from './garden-paths.js';
import {buildLandscapeSpine,buildRockGarden} from './landscape-courtyard.js';
import {buildLandscapeBeds} from './landscape-beds.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),PI=Math.PI,TAU=2*PI;
const clamp=THREE.MathUtils.clamp,smooth=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
export const GARDEN={x:-4,z:1,level:6.55,inner:3.50,rowWidth:1.65,rows:4,rise:.42,start:PI*.72,end:PI*1.55,aisles:[PI,PI*1.35]};
export const GARDEN_POND=COURTYARD_POND;
export function gardenPolar(x,z){return {r:Math.hypot(x-GARDEN.x,z-GARDEN.z),a:(Math.atan2(z-GARDEN.z,x-GARDEN.x)+TAU)%TAU};}
export function inGarden(x,z){return Math.hypot(x/18.8,(z-.4)/18)<1.04;}
export function inGardenAisle(a,r){return GARDEN.aisles.some(v=>Math.abs(a-v)*r<.63);}
export function gardenTerrain(x,z,original){
 const envelope=Math.hypot(x/18.8,(z-.4)/18);if(envelope>1.28)return original;
 // A continuous planted grade replaces the stepped seating landform.
 let h=7.04+.055*Math.max(0,-x-4)+.11*Math.max(0,-z-2)+.04*Math.sin(x*.34)*Math.cos(z*.35);
 const pond=GARDEN_POND,pr=Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz);
 if(pr<1.3)h=mix(h,pond.level-.34,1-smooth(clamp((pr-.90)/.4,0,1)));
 return mix(original,h,1-smooth(clamp((envelope-.98)/.30,0,1)));
}
export function buildGarden({landscape,M,groundHeight,nearestRoute,bridgeCurve,accesses,quality,mesh,box,tube,beam,surfaceGeometry,edgeGeometry,addSurface,navigationBlocks}){
 const root=new THREE.Group();root.name='Private courtyard garden and planted contours';landscape.add(root);
 M.gardenPath=new THREE.MeshStandardMaterial({color:'#c2b49b',roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
 M.gardenPaving=new THREE.MeshStandardMaterial({color:'#c6bdaa',roughness:.98,vertexColors:true});
 const g=GARDEN,bridgeSamples=bridgeCurve.getSpacedPoints(220),bridgeDistance=p=>Math.min(...bridgeSamples.map(q=>Math.hypot(p.x-q.x,p.z-q.z)));
 let seed=94307;const rnd=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 // The detailed garden surface follows the actual cut-and-fill terrain function.
 const pos=[],uv=[],colors=[],indices=[],radial=80,rings=70;
 for(let i=0;i<=rings;i++)for(let j=0;j<=radial;j++){
  const r=i/rings,a=j/radial*TAU,x=Math.cos(a)*18.8*r,z=.4+Math.sin(a)*18*r,y=groundHeight(x,z)+.014;
  pos.push(x,y,z);uv.push(x*.45,z*.45);const q=.96+rnd()*.03;colors.push(q,q,q);
  if(i<rings&&j<radial){const k=i*(radial+1)+j,n=k+radial+1;indices.push(k,k+1,n,k+1,n+1,n);}
 }
 const lawnGeo=new THREE.BufferGeometry();lawnGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));lawnGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));lawnGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));lawnGeo.setIndex(indices);lawnGeo.computeVertexNormals();const lawn=mesh(lawnGeo,M.lawn,root);lawn.name='Simple courtyard terrain';lawn.castShadow=false;root.userData.groundCover={grass:0,ferns:0};
 function arcPoint(a,r,y){return V(g.x+Math.cos(a)*r,y,g.z+Math.sin(a)*r);}
 const tiers=[],seats=[],stairs=[];
 const paths=buildGardenPaths({root,accesses,M,mesh,box,tube,surfaceGeometry,edgeGeometry,addSurface,navigationBlocks});
 const access=paths[0].path;
 const spine=buildLandscapeSpine({root,curve:bridgeCurve,M,mesh,surfaceGeometry,edgeGeometry,addSurface});
 // Every paved surface already on the ground is recorded as a footprint of discs.
 // A branch path is then cut back to the edge of whatever it joins, so two
 // ribbons never cover the same ground — coincident paving is what produced the
 // flickering patches and hard notches at the junctions.
 const footprint=[];
 bridgeCurve.getSpacedPoints(260).forEach((p,i)=>footprint.push({x:p.x,z:p.z,r:bridgeHalfWidth(i/260)}));
 for(const a of accesses){
  for(const s of a.samples)footprint.push({x:s.p.x,z:s.p.z,r:s.half});
  const e=a.point(1);footprint.push({x:e.x,z:e.z,r:a.width*.5});
 }
 footprint.push({x:FIRE_CIRCLE.x,z:FIRE_CIRCLE.z,r:3.48});
 const viewingPad=COURTYARD_EXHIBITS[0];footprint.push({x:viewingPad.ex,z:viewingPad.ez,r:1.6});
 const paved=p=>footprint.some(d=>Math.hypot(p.x-d.x,p.z-d.z)<d.r);
 // A short tuck keeps the trimmed end just under its neighbour, so the join
 // closes without leaving a hairline of bare terrain showing through.
 function trimRoute(route){
  const steps=400,tuck=.09/Math.max(route.curve.getLength(),.01);
  let t0=0,t1=1;
  while(t0<1&&paved(route.curve.getPointAt(t0)))t0+=1/steps;
  while(t1>t0&&paved(route.curve.getPointAt(t1)))t1-=1/steps;
  return [Math.max(0,t0-tuck),Math.min(1,t1+tuck)];
 }
 // A direct cross-garden walk, upper exhibition route and short lower spur meet the level landings.
 for(const route of COURTYARD_ROUTES){
  const group=new THREE.Group();group.name=route.id+' — courtyard exhibition path';root.add(group);
  group.userData.courtyardCirculation={id:route.id,width:route.width,samples:route.curve.getSpacedPoints(160).map(p=>p.toArray())};
  const [t0,t1]=trimRoute(route),at=t=>t0+(t1-t0)*t;
  const edge=(t,u)=>{const tt=at(t),p=route.curve.getPointAt(tt),d=route.curve.getTangentAt(tt);return p.addScaledVector(V(-d.z,0,d.x).normalize(),u*route.width/2).add(V(0,.025,0));};
  for(let i=0;i<=120;i++){const p=edge(i/120,0);footprint.push({x:p.x,z:p.z,r:route.width/2});}
  if(t1-t0<.02)continue;
  const path=mesh(surfaceGeometry(edge,160,6,false,'path'),M.gardenPath,group);path.name='Warm fine-aggregate exhibition path';addSurface(path,'courtyard-circulation');
  for(const side of [-1,1]){
   mesh(edgeGeometry(t=>edge(t,side),t=>edge(t,side).add(V(0,-.28,0)),160),M.stairEdge,group);
   // Flush brick inlay replaces raised edging at the flowing path junctions. It
   // is set inboard of the edge: overhanging the kerb left it floating wherever
   // the ground fell away from the path.
   for(let i=0;i<100;i++){
    const p=edge((i+.5)/100,side);
    const crossing=bridgeSamples.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<2.2);
    const junction=COURTYARD_ROUTES.some(other=>other!==route&&other.curve.getSpacedPoints(70).some(q=>Math.hypot(q.x-p.x,q.z-p.z)<other.width/2+.15));
    if(crossing||junction)continue;
    mesh(surfaceGeometry((f,u)=>edge((i+f)/100,side*(1-.05*(u*.5+.5)/(route.width/2))).add(V(0,.004,0)),1,1),M.bronze,group);
   }
  }
 }
 for(const e of COURTYARD_EXHIBITS.slice(0,1)){
  const geo=new THREE.CircleGeometry(1.6,48);geo.rotateX(-PI/2);const p=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++){const x=e.ex+p.getX(i),z=e.ez+p.getZ(i);uv.setXY(i,p.getX(i)*.5,p.getZ(i)*.5);p.setXYZ(i,x,e.level+.025,z);}geo.computeVertexNormals();addSurface(mesh(geo,M.gardenPath,root),'courtyard-viewing');
  mesh(new THREE.CylinderGeometry(1.6,1.6,.25,48,1,true),M.stairEdge,root,e.ex,e.level-.10,e.ez);
 }
 const trees=[createCourtyardTree({landscape:root,M,bridgeCurve,quality,position:V(BANYAN.x,groundHeight(BANYAN.x,BANYAN.z)+.025,BANYAN.z),scale:BANYAN.scale,seed:45108,groundHeight,banyan:true,leafBudget:quality==='high'?14500:8500})];
 // A small natural pond replaces the former concrete reflecting basin.
 const pond=GARDEN_POND,water=mesh(new THREE.CircleGeometry(1,70),M.water,root,pond.x,pond.level,pond.z);water.rotation.x=-PI/2;water.scale.set(pond.rx,pond.rz,1);water.castShadow=false;water.userData.keepSeparate=true;
 for(let i=0;i<32;i++){const a=i/32*TAU,p=V(pond.x+Math.cos(a)*pond.rx*1.10,0,pond.z+Math.sin(a)*pond.rz*1.10);p.y=groundHeight(p.x,p.z);const rock=mesh(new THREE.IcosahedronGeometry(.25+rnd()*.13,1),M.foundation,root,p.x,p.y+.04,p.z);rock.scale.set(1.2,.48,.8);rock.rotation.y=a;}
 const rockGarden=buildRockGarden({root,M,groundHeight,lawn,mesh,box,tube,addSurface,navigationBlocks});
 const contourGarden=buildLandscapeBeds({root,M,groundHeight,nearestRoute,bridgeCurve,mesh,box,surfaceGeometry,edgeGeometry,quality,navigationBlocks});
 const lights=[rockGarden.light];
 for(const [x,z] of [[-13.1,-2.0],[12.4,9.0]]){const y=groundHeight(x,z);box(.16,.46,.16,M.darkwood,root,x,y+.23,z);box(.19,.075,.19,M.light,root,x,y+.50,z);const light=new THREE.PointLight('#ffdcad',20,15,2);light.position.set(x,y+.72,z);light.userData.duskIntensity=26;light.userData.dayIntensity=3;root.add(light);lights.push(light);}
 const first=COURTYARD_EXHIBITS[0],eye=V(first.ex,first.level+EYE_HEIGHT,first.ez),target=V(first.x,first.level+1.94,first.z);
 return {root,lawn,tiers,seats,stairs,access,paths,spine,rockGarden,trees,water,eye,target,lights,fernCount:0,grassCount:0};
}
