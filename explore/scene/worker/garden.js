import { EYE_HEIGHT } from './navigation-config.js';
import * as THREE from '../assets/three.module.js';
import {createCourtyardTree} from './courtyard-tree.js';
import {COURTYARD_ROUTES,COURTYARD_POND,BANYAN,COURTYARD_EXHIBITS} from './courtyard-layout.js';
import {buildGardenPaths} from './garden-paths.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),PI=Math.PI,TAU=2*PI;
const clamp=THREE.MathUtils.clamp,smooth=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
export const GARDEN={x:-4,z:1,level:6.55,inner:3.50,rowWidth:1.65,rows:4,rise:.42,start:PI*.72,end:PI*1.55,aisles:[PI,PI*1.35]};
export const GARDEN_POND=COURTYARD_POND;
export function gardenPolar(x,z){return {r:Math.hypot(x-GARDEN.x,z-GARDEN.z),a:(Math.atan2(z-GARDEN.z,x-GARDEN.x)+TAU)%TAU};}
export function inGarden(x,z){return Math.hypot(x/18.8,(z-.4)/18)<1.04;}
export function inGardenAisle(a,r){return GARDEN.aisles.some(v=>Math.abs(a-v)*r<.63);}
export function gardenTerrain(x,z,original){
 const envelope=Math.hypot(x/18.8,(z-.4)/18);if(envelope>1.10)return original;
 // A continuous planted grade replaces the stepped seating landform.
 let h=7.04+.055*Math.max(0,-x-4)+.11*Math.max(0,-z-2)+.04*Math.sin(x*.34)*Math.cos(z*.35);
 const pond=GARDEN_POND,pr=Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz);
 if(pr<1.3)h=mix(h,pond.level-.34,1-smooth(clamp((pr-.90)/.4,0,1)));
 return mix(original,h,1-smooth(clamp((envelope-.83)/.27,0,1)));
}
export function buildGarden({landscape,M,groundHeight,nearestRoute,bridgeCurve,accesses,quality,mesh,box,tube,beam,surfaceGeometry,edgeGeometry,addSurface,navigationBlocks}){
 const root=new THREE.Group();root.name='Private courtyard garden and planted contours';landscape.add(root);
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
 // A clearly legible pair of paths joins the four level bridge exits.
 for(const route of COURTYARD_ROUTES){
  const group=new THREE.Group();group.name=route.id+' — courtyard exhibition path';root.add(group);
  const edge=(t,u)=>{const p=route.curve.getPointAt(t),d=route.curve.getTangentAt(t);return p.addScaledVector(V(-d.z,0,d.x).normalize(),u*route.width/2).add(V(0,.025,0));};
  const path=mesh(surfaceGeometry(edge,160,6),M.stairs,group);path.name='Continuous worn-concrete garden path';addSurface(path,'courtyard-circulation');
  for(const side of [-1,1]){
   mesh(edgeGeometry(t=>edge(t,side),t=>edge(t,side).add(V(0,-.14,0)),160),M.stairEdge,group);
   tube(Array.from({length:100},(_,i)=>edge(i/99,side)),.032,M.stairBrick,group,false,140);
  }
  group.userData.courtyardCirculation={id:route.id,width:route.width,samples:route.curve.getSpacedPoints(160).map(p=>p.toArray())};
 }
 for(const e of COURTYARD_EXHIBITS){
  const geo=new THREE.CircleGeometry(1.6,48);geo.rotateX(-PI/2);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=e.ex+p.getX(i),z=e.ez+p.getZ(i);p.setXYZ(i,x,groundHeight(x,z)+.022,z);}geo.computeVertexNormals();addSurface(mesh(geo,M.stairs,root),'courtyard-viewing');
 }
 const trees=[createCourtyardTree({landscape:root,M,bridgeCurve,quality,position:V(BANYAN.x,groundHeight(BANYAN.x,BANYAN.z)+.025,BANYAN.z),scale:BANYAN.scale,seed:45108,groundHeight,banyan:true,leafBudget:quality==='high'?14500:8500})];
 // A small natural pond replaces the former concrete reflecting basin.
 const pond=GARDEN_POND,water=mesh(new THREE.CircleGeometry(1,70),M.water,root,pond.x,pond.level,pond.z);water.rotation.x=-PI/2;water.scale.set(pond.rx,pond.rz,1);water.castShadow=false;water.userData.keepSeparate=true;
 for(let i=0;i<32;i++){const a=i/32*TAU,p=V(pond.x+Math.cos(a)*pond.rx*1.10,0,pond.z+Math.sin(a)*pond.rz*1.10);p.y=groundHeight(p.x,p.z);const rock=mesh(new THREE.IcosahedronGeometry(.25+rnd()*.13,1),M.foundation,root,p.x,p.y+.04,p.z);rock.scale.set(1.2,.48,.8);rock.rotation.y=a;}
 const lights=[];
 for(const [x,z] of [[-13.1,-2.0],[12.4,9.0]]){const y=groundHeight(x,z);box(.16,.46,.16,M.darkwood,root,x,y+.23,z);box(.19,.075,.19,M.light,root,x,y+.50,z);const light=new THREE.PointLight('#ffdcad',20,15,2);light.position.set(x,y+.72,z);light.userData.duskIntensity=26;light.userData.dayIntensity=3;root.add(light);lights.push(light);}
 const eye=V(-.5,7.08+EYE_HEIGHT,10.5),target=V(5,8.6,13.5);
 return {root,lawn,tiers,seats,stairs,access,paths,trees,water,eye,target,lights,fernCount:0,grassCount:0};
}
