import { EYE_HEIGHT, bridgeHalfWidth, GALLERY_LEVELS } from './navigation-config.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createFurnishings } from './furnishings.js';
import { terraceAt, roofElevation, roofHalfSpan, buildRoofscape, TERRACE_SPECS } from './roofscape.js';
import { buildGarden, gardenTerrain } from './garden.js';
import { buildSiteStructure } from './siteworks.js';
import { buildExhibitDisplay } from './exhibits.js';
import { buildArrivalSequence } from './architecture-detail.js';
import {createGardenAccesses} from './entrance-paths.js';
import {isFacadeOpening,facadeCuts} from './entry-config.js';
import {BALCONY_SPECS,balconyPoint,balconyGuardPoints} from './balcony-layout.js';
import {buildEntranceDetails} from './entrance-details.js';
import {COURTYARD_EXHIBITS,courtyardGrade} from './courtyard-layout.js';
import {createArrivalRoute,arrivalGround,arrivalHalfWidth} from './arrival-route.js';
import {weatherStairGeometry} from './stair-material.js';
import {createBridgeRoute,BRIDGE_GARDEN_LANDING,BRIDGE_GARDEN_CONNECTIONS,bridgeGardenOpening,bridgeGardenGround} from './bridge-route.js';

const PI=Math.PI,TAU=PI*2,V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const mix=(a,b,t)=>a+(b-a)*t,clamp=THREE.MathUtils.clamp,smooth=t=>t*t*(3-2*t);
let seed=83409;
const rnd=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
const spine=new THREE.CatmullRomCurve3([[1,0,26],[-15,0,22],[-28,0,9],[-29,0,-7],[-19,0,-22],[-1,0,-28],[19,0,-23],[31,0,-8],[31,0,9],[19,0,23]].map(p=>V(...p)),true,'catmullrom',.45);
const stations=[.066,.180,.300,.425,.55,.675,.800,.925];
const {lower,middle,upper}=GALLERY_LEVELS;
const levels=[lower,lower,middle,upper,upper,upper,middle,lower];
const galleryWidths=[17.8,13.6,15.2,19.2,13.2,16.4,14.3,10.2];
const gallerySpreads=[.047,.043,.060,.061,.044,.057,.049,.039];
const wrap=t=>(t%1+1)%1;
function level(t){
  t=wrap(t);for(let i=0;i<stations.length;i++){
    const a=stations[i],j=(i+1)%stations.length,b=j?stations[j]:stations[0]+1,tt=t<a?t+1:t;
    if(tt>=a&&tt<=b){const d=.025,s=clamp((tt-a-d)/(b-a-2*d),0,1);return mix(levels[i],levels[j],smooth(s));}
  }return levels[0];
}
function width(t){let w=4.6;for(let i=0;i<stations.length;i++){const d=Math.min(Math.abs(t-stations[i]),1-Math.abs(t-stations[i]));w+=(galleryWidths[i]-4.6)*Math.exp(-Math.pow(d/gallerySpreads[i],2.8));}return w;}
export function frameAt(t){t=wrap(t);const p=spine.getPointAt(t),d=spine.getTangentAt(t).setY(0).normalize(),n=V(-d.z,0,d.x);p.y=level(t);return {p,d,n,w:width(t),t};}
export function pitchedRoofPoint(t,u,underside=false){const f=frameAt(t);return f.p.clone().addScaledVector(f.n,u*roofHalfSpan(t,f.w)).setY(f.p.y+roofElevation(t,u,f.w)-(underside?.20:0));}
function roofPoint(t,u,underside=false){const terrace=terraceAt(t);if(!terrace)return pitchedRoofPoint(t,u,underside);const f=frameAt(t);return f.p.clone().addScaledVector(f.n,u*(f.w+2.8)*.5).setY(terrace.level-(underside?.24:0));}
// Deeper eaves must not drag the glazing into doors, stairs or balcony landings.
export function facadeRoofPoint(t,side){const f=frameAt(t),half=terraceAt(t)?(f.w+2.8)*.5:roofHalfSpan(t,f.w);return roofPoint(t,side*(f.w*.455+.35)/half,true);}
const fieldSamples=Array.from({length:240},(_,i)=>frameAt(i/240));
const crossing=createBridgeRoute(frameAt);
const approach=createArrivalRoute(frameAt);
const crossingSamples=crossing.getSpacedPoints(110);
export const gardenAccesses=createGardenAccesses(frameAt);
const gardenAccessSamples=gardenAccesses.flatMap(a=>a.samples);
const earthworkBenches=[];
for(const spec of BALCONY_SPECS){const f=frameAt(spec.t);earthworkBenches.push({p:balconyPoint(frameAt,spec,0,.5),radius:3.6,target:f.p.y-.38});}
for(const spec of TERRACE_SPECS){const f=frameAt(spec.t-.017);earthworkBenches.push({p:f.p.clone().addScaledVector(f.n,-f.w*.5-1.4),radius:1.4,target:spec.base-.30});}
const roofAccessSamples=[];
for(const spec of TERRACE_SPECS){
 for(let i=0;i<=40;i++){const f=i/40,fr=frameAt(spec.t-.017+.033*f);roofAccessSamples.push(fr.p.clone().addScaledVector(fr.n,-fr.w*.5-2.40).setY(spec.base+(spec.level-spec.base)*f));}
 const fr=frameAt(spec.t-.017);for(let i=0;i<=12;i++)roofAccessSamples.push(fr.p.clone().addScaledVector(fr.n,mix(-fr.w*.42,-fr.w*.5-3.15,i/12)).setY(spec.base));
}
export function nearestRoute(x,z){let bestIndex=0,dist=Infinity;const count=fieldSamples.length;for(let i=0;i<count;i++){const s=fieldSamples[i],r=(s.p.x-x)**2+(s.p.z-z)**2;if(r<dist){dist=r;bestIndex=i;}}let bestT=bestIndex/count;for(const i of [(bestIndex+count-1)%count,bestIndex]){const a=fieldSamples[i].p,b=fieldSamples[(i+1)%count].p,dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),dd=(x-a.x-dx*u)**2+(z-a.z-dz*u)**2;if(dd<dist){dist=dd;bestT=wrap((i+u)/count);}}const best=frameAt(bestT),dx=x-best.p.x,dz=z-best.p.z;return {...best,distance:Math.sqrt(dist),offset:dx*best.n.x+dz*best.n.z};}
export const isOpening=isFacadeOpening;
export function naturalGroundHeight(x,z){return 11.0-z*.27-Math.pow(Math.max(0,Math.abs(x)-19),1.13)*.20+Math.sin(x*.10+z*.06)*.5+Math.cos(z*.14)*.4-Math.max(0,z-28)*.21;}
export function groundHeight(x,z){
  let h=gardenTerrain(x,z,naturalGroundHeight(x,z));const r=nearestRoute(x,z);
  for(const bench of earthworkBenches){const d=Math.hypot(x-bench.p.x,z-bench.p.z);if(d<bench.radius+2.5)h=mix(h,bench.target,1-smooth(clamp((d-bench.radius)/2.5,0,1)));}
  if(r.distance<r.w*.61+2){const edge=clamp((r.distance-r.w*.54-1)/1.4,0,1);h=Math.min(h,mix(r.p.y-.32,h,edge));}
  let path=null,pathDistance=Infinity;for(const sample of gardenAccessSamples){const d=Math.hypot(x-sample.p.x,z-sample.p.z);if(d<pathDistance){pathDistance=d;path=sample;}}
  if(pathDistance<path.half+1.10)h=mix(h,path.p.y-.20,1-smooth(clamp((pathDistance-path.half-.15)/.95,0,1)));
  h=arrivalGround(x,z,h,approach);
  h=courtyardGrade(x,z,h);
  // Garden display pads must not refill the cleared approach to a doorway.
  if(pathDistance<path.half+1.10)h=Math.min(h,path.p.y-.16+Math.max(0,pathDistance-path.half-.15)*1.6);
  for(const p of crossingSamples){if(Math.abs(x-p.x)<2.65&&Math.abs(z-p.z)<2.65&&Math.hypot(x-p.x,z-p.z)<2.65)h=Math.min(h,p.y-.42);}
  h=bridgeGardenGround(x,z,h);
  for(const p of roofAccessSamples){if(Math.abs(x-p.x)>2.1||Math.abs(z-p.z)>2.1)continue;const d=Math.hypot(x-p.x,z-p.z);if(d<2.1)h=Math.min(h,p.y-.25+Math.max(0,d-1.05)*1.65);}
  return Math.max(-16.3,h);
}
function texture(kind){
  const s=256,a=new Uint8Array(s*s*4);for(let y=0;y<s;y++)for(let x=0;x<s;x++){
    const i=(y*s+x)*4,n=rnd()*14,grain=Math.sin(x*.23+Math.sin(y*.03)*5)*6;let rgb;
    if(kind==='wood')rgb=[154+n+grain,116+n+grain,78+n+grain];
    else if(kind==='grass')rgb=[91+n,106+n,65+n];
    else if(kind==='fabric')rgb=[218+n-(x%3?0:7),216+n-(y%3?0:7),208+n];
    else rgb=[205+n,205+n,195+n];
    a[i]=rgb[0];a[i+1]=rgb[1];a[i+2]=rgb[2];a[i+3]=255;
  }
  const t=new THREE.DataTexture(a,s,s,THREE.RGBAFormat);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.repeat.set(kind==='wood'?.45:.7,kind==='wood'?.18:.7);t.needsUpdate=true;return t;
}
function standard(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.72,...extra});}
function surfaceGeometry(pointFn,segments=480,across=20,reverse=false){
  const p=[],uv=[],indices=[];
  for(let i=0;i<=segments;i++)for(let j=0;j<=across;j++){const t=i/segments,u=j/across*2-1,v=pointFn(t,u);p.push(v.x,v.y,v.z);uv.push(v.x*.5,v.z*.5);}
  for(let i=0;i<segments;i++)for(let j=0;j<across;j++){const a=i*(across+1)+j,b=a+across+1;indices.push(...(reverse?[a,b,a+1,a+1,b,b+1]:[a,a+1,b,a+1,b+1,b]));}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function edgeGeometry(aFn,bFn,count=480){
  const p=[],uv=[],idx=[];for(let i=0;i<=count;i++){const t=i/count,a=aFn(t),b=bFn(t);p.push(a.x,a.y,a.z,b.x,b.y,b.z);uv.push(t*40,0,t*40,1);if(i<count){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

export function buildCampus(projects,{quality='high'}={}){
  seed=83409;
  const root=new THREE.Group(),architecture=new THREE.Group(),roofs=new THREE.Group(),landscape=new THREE.Group(),furniture=new THREE.Group(),media=new THREE.Group();
  root.name='Manas Bhatia — Spatial Portfolio';architecture.name='Continuous gallery promenade';roofs.name='Undulating tiled roofs and open terraces';landscape.name='Forest and water gardens';furniture.name='Gallery planting and exhibition walls';root.add(landscape,architecture,roofs,furniture,media);
  const groundTex=texture('grass'),concreteTex=texture('concrete'),fabricTex=texture('fabric'),woodTex=texture('wood');
  const M={
    tile:standard('#a66742',{roughness:.91}),roofBacking:standard('#594133',{roughness:.95}),deck:standard('#b19a73',{map:woodTex,roughness:.8}),bark:standard('#554835',{roughness:1,bumpMap:concreteTex,bumpScale:.14}),
    stairBrick:standard('#9e624b',{roughness:.94}),stairMortar:standard('#986e58',{roughness:1}),
    stairs:standard('#898b83',{vertexColors:true,roughness:.97}),stairEdge:standard('#85877e',{vertexColors:true,roughness:.98}),
    foundation:standard('#746d5b',{roughness:.98,bumpMap:concreteTex,bumpScale:.12}),terracotta:standard('#d5aa89',{roughness:.94,bumpMap:concreteTex,bumpScale:.025}),lawn:standard('#7c846d',{vertexColors:true,roughness:1}),gravel:standard('#b3a489',{roughness:1,bumpMap:concreteTex,bumpScale:.035}),
    shell:standard('#f1f1e9',{roughness:.56,bumpMap:concreteTex,bumpScale:.004}),concrete:standard('#d8d9ce',{roughness:.84,bumpMap:concreteTex,bumpScale:.012}),
    soffit:standard('#bda47c',{roughness:.72}),stone:standard('#e2ded2',{roughness:.67,bumpMap:concreteTex,bumpScale:.009}),
    wood:standard('#d9bd91',{map:woodTex,roughness:.63}),darkwood:standard('#796249',{map:woodTex}),bronze:standard('#5b6057',{metalness:.65,roughness:.35}),black:standard('#222c2b',{roughness:.42}),
    glass:new THREE.MeshPhysicalMaterial({color:'#c8dfd5',metalness:0,roughness:.07,ior:1.46,reflectivity:.55,transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false,envMapIntensity:1}),
    glassRail:new THREE.MeshPhysicalMaterial({color:'#bed4cc',metalness:.13,roughness:.18,transparent:true,opacity:.25,side:THREE.DoubleSide,depthWrite:false}),
    fabric:standard('#eee9dc',{roughness:1,bumpMap:fabricTex,bumpScale:.02}),olive:standard('#7b8260',{roughness:1,bumpMap:fabricTex,bumpScale:.02}),
    clay:standard('#b79479',{roughness:.88}),white:standard('#f0eee6',{roughness:.36}),soil:standard('#3f4837'),grass:standard('#787d62',{roughness:1}),rug:standard('#75805c',{bumpMap:fabricTex,bumpScale:.03}),leaf:standard('#506644',{roughness:1}),
    terrain:standard('#7f866e',{vertexColors:true,roughness:1}),light:standard('#fff4df',{emissive:'#ffe7ba',emissiveIntensity:1.1,roughness:.3}),water:standard('#6b9895',{metalness:.55,roughness:.15,transparent:true,opacity:.92}),mirror:standard('#bfcdca',{metalness:1,roughness:.055})
  };
  const walkSurfaces=[],artworks=[],artMaterials=[],videoScreens=[],spots=[],lamps=[],navigationBlocks=[];
  const mesh=(g,m,p=furniture,x=0,y=0,z=0)=>{if((m===M.stairs||m===M.stairEdge)&&!g.attributes.color)weatherStairGeometry(g);if(m.vertexColors&&!g.attributes.color)g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(1),3));const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent&&m!==M.light;o.receiveShadow=true;p.add(o);return o;};
  const box=(w,h,d,m,p,x=0,y=0,z=0,r=0)=>{const g=m===M.stairs?new RoundedBoxGeometry(w,h,d,2,Math.min(.012,h*.1,d*.04)):new THREE.BoxGeometry(w,h,d);const o=mesh(g,m,p,x,y,z);o.rotation.y=r;return o;};
  const soft=(w,h,d,m,p,x=0,y=0,z=0,r=0,rad=.10)=>{const o=mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(rad,h*.44,w*.25,d*.25)),m,p,x,y,z);o.rotation.y=r;return o;};
  const cyl=(r,h,m,p,x=0,y=0,z=0,rt=r)=>mesh(new THREE.CylinderGeometry(rt,r,h,40),m,p,x,y,z);
  const beam=(a,b,w,m,p=furniture)=>{const delta=b.clone().sub(a),o=mesh(new THREE.BoxGeometry(w,delta.length(),w),m,p);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return o;};
  const tube=(pts,r,m,p=furniture,closed=false,segments=pts.length*3)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,closed,'catmullrom',.35),segments,r,7,closed),m,p);
  const sphere=(x,y,z,sx,sy,sz,m,p)=>{const o=mesh(new THREE.SphereGeometry(1,20,14),m,p,x,y,z);o.scale.set(sx,sy,sz);return o;};
  const F=createFurnishings({M,mesh,box,soft,cyl,beam,tube,sphere,rnd});
  function addSurface(o,type='floor'){walkSurfaces.push({mesh:o,type});return o;}
  function buildSweep(pointFn,parent,material,depth=.25,steps=480,cross=20){
    const isRoof=parent===roofs||parent.parent===roofs;
    const top=addSurface(mesh(surfaceGeometry(pointFn,steps,cross),material,parent),isRoof?'roof':'floor');
    const bottomFn=(t,u)=>pointFn(t,u).add(V(0,-depth,0));mesh(surfaceGeometry(bottomFn,steps,cross,true),material===M.deck?M.darkwood:isRoof?M.soffit:M.concrete,parent);
    for(const edge of [-1,1])mesh(edgeGeometry(t=>pointFn(t,edge),t=>bottomFn(t,edge),steps),material===M.floor?M.stone:material,parent).material.side=THREE.DoubleSide;
    return top;
  }
  const floorPoint=(t,u)=>{const f=frameAt(t);return f.p.clone().addScaledVector(f.n,u*f.w*.5);};
  M.floor=M.stone.clone();M.floor.vertexColors=true;
  const floor=buildSweep(floorPoint,architecture,M.floor,.32,520,20);
  // Static contact shading along the perimeter and below the first gallery joinery.
  const floorColors=[];for(let i=0;i<=520;i++)for(let j=0;j<=20;j++){const t=i/520,u=j/20*2-1,edge=Math.pow(Math.abs(u),5),first=Math.exp(-(((t-.066)/.037)**2)),wall=Math.exp(-(((u-.57)/.11)**2));const shade=1-.16*edge-.22*first*wall;floorColors.push(shade,shade,shade);}
  floor.geometry.setAttribute('color',new THREE.Float32BufferAttribute(floorColors,3));
  const roofscape=buildRoofscape({roofs,architecture,frameAt,pitchedRoofPoint,roofPoint,surfaceGeometry,edgeGeometry,mesh,box,soft,tube,beam,buildSweep,addSurface,F,M,rnd,quality,artMaterials,terraceProjects:projects.filter(p=>p.region==='terrace')});
  // Three gallery levels form continuous wings, connected by four stair flights.
  const galleryFlights=[];
  for(let k=0;k<stations.length;k++){
    const a=stations[k]+.025,b=(k===7?stations[0]+1:stations[k+1])-.025,ya=levels[k],yb=levels[(k+1)%8],n=Math.ceil(Math.abs(yb-ya)/.145);
    if(!n)continue;
    galleryFlights.push({from:ya,to:yb,start:a,end:b,steps:n});
    function parameter(f){if(f<=0)return a;if(f>=1)return b;let lo=a,hi=b;for(let j=0;j<16;j++){const mid=(lo+hi)/2,v=(level(mid)-ya)/(yb-ya);if(v<f)lo=mid;else hi=mid;}return (lo+hi)/2;}
    for(let i=0;i<n;i++){const ta=parameter(i/n),tb=parameter((i+1)/n),pa=frameAt(ta).p,pb=frameAt(tb).p,f=frameAt((ta+tb)/2),length=Math.hypot(pb.x-pa.x,pb.z-pa.z),top=Math.max(pa.y,pb.y)+.023,height=Math.abs(pb.y-pa.y)+.10;
      const step=box(f.w*.87,height,length+.055,M.stairs,architecture,(pa.x+pb.x)/2,top-height/2,(pa.z+pb.z)/2,Math.atan2(pb.x-pa.x,pb.z-pa.z));addSurface(step,'promenade-stair');
    }
  }
  architecture.userData.galleryLevels={levels:[lower,middle,upper],flights:galleryFlights,pottedPlants:0};
  // Slender glazing stays on the gallery envelope beneath the enlarged canopy.
  const glazingCuts=facadeCuts();
  for(let i=0;i<glazingCuts.length-1;i++){
    const t0=glazingCuts[i],t1=glazingCuts[i+1];
    for(const side of [-1,1]){
      const opening=isOpening((t0+t1)/2,side);
      if(opening)continue;
      const b0=floorPoint(t0,side*.91),b1=floorPoint(t1,side*.91),a0=facadeRoofPoint(t0,side),a1=facadeRoofPoint(t1,side);
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...b0,...b1,...a0,...b1,...a1,...a0],3));g.computeVertexNormals();const pane=mesh(g,M.glass,architecture);pane.castShadow=false;
      if(i%2===0)beam(b0,a0,.046,M.bronze,architecture);
      beam(b0,b1,.041,M.bronze,architecture);beam(a0,a1,.048,M.bronze,architecture);
    }
  }
  // Tapered timber stems divide into canopy branches, recalling inhabitable growth.
  function taperedBranch(points,r0,r1,parent=furniture,material=M.wood){
    const curve=new THREE.CatmullRomCurve3(points),steps=22,sides=8,frames=curve.computeFrenetFrames(steps,false),pos=[],uv=[],ix=[];
    for(let i=0;i<=steps;i++){const t=i/steps,p=curve.getPointAt(t),r=mix(r0,r1,Math.pow(t,.72));for(let j=0;j<=sides;j++){const a=j/sides*TAU,v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);pos.push(v.x,v.y,v.z);uv.push(j/sides,t*4);if(i<steps&&j<sides){const n=i*(sides+1)+j,k=n+sides+1;ix.push(n,k,n+1,n+1,k,k+1);}}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return mesh(g,material,parent);
  }
  for(let k=0;k<8;k++)for(const side of [-1,1]){
    const t=stations[k]+side*.031,f=frameAt(t),foot=floorPoint(t,-.74).add(V(0,.03,0)),top=roofPoint(t,-.65,true).add(V(0,-.06,0)),fork=foot.clone().lerp(top,.57).addScaledVector(f.n,.15);
    taperedBranch([foot,foot.clone().lerp(top,.35),fork,top],.20,.07,architecture);
    for(const dt of [-.012,.012])taperedBranch([fork,fork.clone().lerp(roofPoint(t+dt,-.55,true),.55),roofPoint(t+dt,-.49,true)],.105,.027,architecture);
    for(const d of [-1,1])taperedBranch([foot.clone().addScaledVector(f.d,d*.60).add(V(0,-.025,0)),foot.clone().addScaledVector(f.d,d*.22).add(V(0,.12,0)),foot.clone().lerp(fork,.25)],.07,.13,architecture);
  }
  // Fine timber lamellae run under the flowing roof; each follows its actual section.
  for(let i=0;i<260;i++){const t=i/260;if(terraceAt(t,.002))continue;const pts=[];for(let j=0;j<=24;j++)pts.push(roofPoint(t,mix(-.81,.83,j/24),true).add(V(0,-.048,0)));tube(pts,.023,M.wood,roofs,false,28);}
  // Timber decking and exposed glulam stringers follow the courtyard crossing.
  const bridgeCurve=crossing;
  function bridgePoint(t,u){const p=bridgeCurve.getPointAt(t),d=bridgeCurve.getTangentAt(t),n=V(-d.z,0,d.x).normalize();return p.addScaledVector(n,u*bridgeHalfWidth(t));}
  const bridgeDeck=buildSweep((t,u)=>bridgePoint(t,u).add(V(0,.025,0)),architecture,M.deck,.18,190,10);
  bridgeDeck.name='Single timber bridge from arrival to upper gallery';bridgeDeck.userData.bridgeRoute={entranceT:0,gardenLanding:BRIDGE_GARDEN_LANDING};
  const bridgePlanks=260;
  for(let i=0;i<bridgePlanks;i++){
    const t=(i+.5)/bridgePlanks,p=bridgePoint(t,0),d=bridgeCurve.getTangentAt(t),run=bridgeCurve.getPointAt((i+1)/bridgePlanks).distanceTo(bridgeCurve.getPointAt(i/bridgePlanks));
    const plank=box(bridgeHalfWidth(t)*1.98,.055,run-.009,M.deck,architecture,p.x,p.y+.028,p.z);
    const across=V(d.z,0,-d.x).normalize(),up=V().crossVectors(d,across).normalize();plank.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,up,d));
  }
  for(const side of [-1,1]){
    for(let i=0;i<100;i++){
      const a=bridgePoint(i/100,side*.94),b=bridgePoint((i+1)/100,side*.94);
      beam(a.clone().add(V(0,-.32,0)),b.clone().add(V(0,-.32,0)),.25,M.darkwood,architecture);
      if(![i/100,(i+.5)/100,(i+1)/100].some(t=>bridgeGardenOpening(bridgeCurve,t,side))){
        beam(a.clone().add(V(0,1.10,0)),b.clone().add(V(0,1.10,0)),.105,M.wood,architecture);
        beam(a.clone().add(V(0,.55,0)),b.clone().add(V(0,.55,0)),.065,M.wood,architecture);
        navigationBlocks.push({a:[a.x,a.z],b:[b.x,b.z],radius:.06,bottom:Math.min(a.y,b.y),top:Math.max(a.y,b.y)+1.1,kind:'bridge-rail'});
        if(i%2===0)beam(a.clone().add(V(0,.02,0)),a.clone().add(V(0,1.10,0)),.095,M.wood,architecture);
      }
    }
    for(let i=0;i<=190;i++){if(bridgeGardenOpening(bridgeCurve,i/190,side))continue;const p=bridgePoint(i/190,side*.94);beam(p.clone().add(V(0,.12,0)),p.clone().add(V(0,1.04,0)),.043,M.wood,architecture);}
  }
  // Open, flush timber junctions connect the bridge to both exhibition loops.
  for(const landing of BRIDGE_GARDEN_CONNECTIONS){
   const exitGroup=new THREE.Group();exitGroup.name='Bridge landing — level courtyard exit';architecture.add(exitGroup);
   const exitPoint=(t,u)=>V(mix(landing.x,landing.exitX,t),landing.y+.025,landing.z+u*landing.width*.5*landing.side);
   buildSweep(exitPoint,exitGroup,M.deck,.18,24,6);
   for(let i=0;i<=30;i++){const x=mix(landing.x,landing.exitX,i/30);box(.018,.008,landing.width,M.darkwood,exitGroup,x,landing.y+.032,landing.z);}
   for(const side of [-1,1]){
    const a=V(landing.x+landing.side*2.0,landing.y,landing.z+side*landing.width*.5),b=V(landing.exitX,landing.y,landing.z+side*landing.width*.5);
    for(const rise of [.55,1.10])beam(a.clone().add(V(0,rise,0)),b.clone().add(V(0,rise,0)),rise===1.10?.105:.065,M.wood,exitGroup);
    for(let i=0;i<=10;i++){const p=a.clone().lerp(b,i/10);beam(p.clone().add(V(0,.05,0)),p.clone().add(V(0,1.07,0)),i%5===0?.095:.043,M.wood,exitGroup);}
    navigationBlocks.push({a:[a.x,a.z],b:[b.x,b.z],radius:.065,bottom:landing.y,top:landing.y+1.1,kind:'bridge-exit-rail'});
    const base=Math.min(groundHeight((a.x+b.x)/2,a.z)-.35,landing.y-.48),top=landing.y-.18;
    box(Math.abs(b.x-a.x),top-base,.32,M.stairBrick,exitGroup,(a.x+b.x)/2,(top+base)/2,a.z);
   }
   exitGroup.userData.bridgeGardenExit={level:landing.y,start:[landing.x,landing.y,landing.z],end:[landing.exitX,landing.y,landing.z],width:landing.width};
  }
  const bridgeFoundations=[];
  for(const t of [.16,.38,.65,.84]){
    const p=bridgePoint(t,0),earth=groundHeight(p.x,p.z),toe=Math.min(earth,...[-.675,.675].flatMap(dx=>[-.675,.675].map(dz=>groundHeight(p.x+dx,p.z+dz)))),top=Math.min(earth+.10,p.y-.55),bottom=Math.min(toe-.55,top-.5),base=V(p.x,top,p.z),fork=base.clone().lerp(p,.58);
    box(1.35,top-bottom,1.35,M.foundation,architecture,p.x,(top+bottom)/2,p.z);beam(base,fork,.28,M.darkwood,architecture);
    for(const side of [-1,1])beam(fork,bridgePoint(t,side*.85).add(V(0,-.33,0)),.22,M.darkwood,architecture);
    bridgeFoundations.push({position:p,ground:earth,bottom,top});
  }
  const arrivalCurve=approach.curve,arrivalFn=(t,u)=>arrivalCurve.getPointAt(t).addScaledVector(approach.across,u*arrivalHalfWidth(t));
  const arrivalDeck=buildSweep(arrivalFn,architecture,M.stone,.2,80,10);arrivalDeck.name='Axial approach to entrance foyer';
  architecture.userData.arrivalAxis={start:approach.start.toArray(),threshold:approach.end.toArray(),axis:approach.axis.toArray()};

  const garden=buildGarden({landscape,M,groundHeight,nearestRoute,bridgeCurve,accesses:gardenAccesses,quality,mesh,box,tube,beam,surfaceGeometry,edgeGeometry,addSurface,navigationBlocks});
  const water=garden.water,courtyardTree=garden.trees[0];
  lamps.push(...garden.lights);

  function groupAt(t,side=0){const f=frameAt(t),g=new THREE.Group();g.position.copy(f.p).addScaledVector(f.n,side);g.rotation.y=Math.atan2(f.n.x,f.n.z);furniture.add(g);return g;}
  const exhibits=projects.filter(p=>p.region==='gallery').slice(0,stations.length);
  const createDisplay=(project,position,rotation,options={})=>buildExhibitDisplay({project,position,rotation,...options,media,M,soft,box,mesh,artworks,artMaterials,videoScreens,groundHeight});
  for(let i=0;i<exhibits.length;i++){
    const project=exhibits[i],t=i===4?.590:i===6?.817:stations[i],f=frameAt(t),room=groupAt(t),half=f.w/2;
    // Keep the exhibition floor clear; planting belongs to the garden and roof beds.
    room.name=project.shortTitle+' — open gallery';room.userData.galleryFurniture=0;room.userData.pottedPlants=0;
    // Side-door galleries display their work on the outer side; the entire
    // approach from the promenade to each garden portal remains unobstructed.
    const displaySide=(i===2||i===6)?-1:1;
    const displayPosition=f.p.clone().addScaledVector(f.n,displaySide*half*.51).addScaledVector(f.d,-.2),rotation=Math.atan2(-displaySide*f.n.x,-displaySide*f.n.z);
    createDisplay(project,displayPosition,rotation);
    const eye=f.p.clone().addScaledVector(f.n,-displaySide*.24).addScaledVector(f.d,displaySide*1.0).add(V(0,EYE_HEIGHT,0));
    const target=displayPosition.clone().add(V(0,2.08,0));
    spots.push({id:project.id,region:'gallery',t,position:roofPoint(t,0).add(V(0,1.1,0)),eye,target,frame:f,display:displayPosition.clone().add(V(0,2.1,0))});
    if(i%2===0){const light=new THREE.PointLight('#ffdab0',14,18,2);light.position.copy(f.p).add(V(0,3.2,0));root.add(light);lamps.push(light);}
  }
  // The first roof terrace extends the computational collection; two terraces remain available for future work.
  for(const project of projects.filter(p=>p.region==='terrace')){
    const terrace=roofscape.terraces.find(t=>t.futureExhibit.projectId===project.id);if(!terrace)continue;
    const f=frameAt(terrace.t),position=terrace.futureExhibit.position.clone().setY(terrace.level+.025),rotation=Math.atan2(-f.n.x,-f.n.z);
    const exhibit=createDisplay(project,position,rotation,{outdoor:true,terrace:true});
    const eye=position.clone().addScaledVector(f.n,-4.0).addScaledVector(f.d,.55).setY(terrace.level+EYE_HEIGHT);
    spots.push({id:project.id,region:'terrace',terraceId:terrace.id,position:exhibit.target.clone().add(V(0,1.2,0)),eye,target:exhibit.target,frame:{...f,p:position.clone()},display:exhibit.target});
  }
  // Full frames, including secondary panels and footings, clear the trees and pond.
  const gardenPlaces=COURTYARD_EXHIBITS;
  const courtyardExhibits=[];
  for(const [i,project] of projects.filter(p=>p.region==='courtyard').entries()){
    const g=gardenPlaces[i];if(!g)continue;
    const position=V(g.x,groundHeight(g.x,g.z)+.035,g.z),eye=V(g.ex,groundHeight(g.ex,g.ez)+EYE_HEIGHT,g.ez),towardEye=eye.clone().sub(position).setY(0).normalize(),rotation=g.rotation??Math.atan2(towardEye.x,towardEye.z),facing=V(Math.sin(rotation),0,Math.cos(rotation));
    const exhibit=createDisplay(project,position,rotation,{outdoor:true});
    const f={p:position.clone(),n:facing,d:V(facing.z,0,-facing.x),w:5};
    const spot={id:project.id,region:'courtyard',position:exhibit.target.clone().add(V(0,1.0,0)),eye,target:exhibit.target,frame:f,display:exhibit.target};
    spots.push(spot);courtyardExhibits.push({...spot,group:exhibit.display,bounds:exhibit.bounds});
    const light=new THREE.PointLight('#ffd4a3',12,8,2);light.position.copy(position).add(V(0,3.2,0));light.userData.duskIntensity=12;light.userData.dayIntensity=2;root.add(light);lamps.push(light);
  }
  garden.exhibits=courtyardExhibits;
  // Open balconies extend the gallery circulation without loose pots or furniture.
  const loungePads=[];
  for(const spec of BALCONY_SPECS){
    const f=frameAt(spec.t),g=new THREE.Group();architecture.add(g);
    const deck=buildSweep((t,u)=>balconyPoint(frameAt,spec,t*2-1,(1-u)/2),g,M.floor,.32,64,12);
    deck.name=spec.id+' — continuous gallery extension';
    loungePads.push({spec,frame:f,group:g,deck,center:balconyPoint(frameAt,spec,0,.5),guardPoints:balconyGuardPoints(frameAt,spec)});
    g.name='Open gallery balcony';g.userData.terraceFurniture=0;g.userData.pottedPlants=0;
    g.userData.balcony={...spec,level:f.p.y,attachment:Array.from({length:33},(_,i)=>balconyPoint(frameAt,spec,-1+i/16,0).toArray()),perimeter:balconyGuardPoints(frameAt,spec).map(p=>p.toArray()),entryStart:f.p.toArray(),entryEnd:balconyPoint(frameAt,spec,0,.58).toArray()};
  }
  const siteStructure=buildSiteStructure({architecture,roofs,M,frameAt,groundHeight,naturalGroundHeight,roofTerraces:roofscape.terraces,loungePads,box,beam,tube,mesh,edgeGeometry,facadeRoofPoint,isOpening});

  const entrances=buildEntranceDetails({architecture,M,frameAt,floorPoint,facadeRoofPoint,loungePads,mesh,box,tube,beam,surfaceGeometry,addSurface,navigationBlocks});

  const arrivalSequence=buildArrivalSequence({architecture,roofs,landscape,furniture,M,frameAt,roofPoint,groundHeight,nearestRoute,arrivalCurve,bridgeCurve,mesh,box,tube,beam,soft,buildSweep,surfaceGeometry,addSurface,quality,lamps,artMaterials});

  // Terrain is lowered beneath the continuous promenade, preserving open interiors.
  const tg=new THREE.PlaneGeometry(260,270,165,175);tg.rotateX(-PI/2);const pa=tg.attributes.position,colors=[],c=new THREE.Color();
  for(let i=0;i<pa.count;i++){const x=pa.getX(i),z=pa.getZ(i),gardenCover=.62*(1-smooth(clamp((Math.hypot(x/18.8,(z-.4)/18)-.89)/.1,0,1)));pa.setY(i,groundHeight(x,z)-gardenCover);const q=.95+Math.sin(x*.04+z*.035)*.025+rnd()*.01;c.setRGB(q,q,q);tg.attributes.uv.setXY(i,x/2,z/2);colors.push(c.r,c.g,c.b);}tg.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));tg.computeVertexNormals();const terrain=mesh(tg,M.terrain,landscape);terrain.castShadow=false;
  // The distant mountain context is a continuous panorama supplied by rendering.js.
  const trees=[];
  for(let i=0;i<(quality==='high'?190:110);i++){
    const x=(rnd()-.5)*177,z=(rnd()-.5)*194;if(Math.abs(x)<44&&z>-37&&z<48)continue;if(z>24&&Math.abs(x)<53)continue;const h=groundHeight(x,z);if(h<-11)continue;trees.push({x,y:h,z,h:5.2+rnd()*9,a:rnd()*TAU});
  }
  for(const [x,z,h] of [[-39,-17,10],[-42,14,9],[42,4,10],[40,-22,12],[-23,-42,11],[18,-43,12],[-41,30,8]])trees.push({x,y:groundHeight(x,z),z,h,a:rnd()*TAU});

  const matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),color=new THREE.Color();
  function instances(geo,material,items,parent,layout){if(!items.length)return;const obj=new THREE.InstancedMesh(geo,material,items.length);obj.castShadow=true;obj.receiveShadow=true;items.forEach((it,i)=>{const v=layout(it);quat.setFromAxisAngle(V(0,1,0),it.a||0);matrix.compose(v.p,quat,v.s);obj.setMatrixAt(i,matrix);color.set(v.c||'#ffffff');obj.setColorAt(i,color);});obj.instanceMatrix.needsUpdate=true;obj.instanceColor.needsUpdate=true;parent.add(obj);return obj;}
  instances(new THREE.CylinderGeometry(.07,.15,1,7),standard('#6c6250'),trees,landscape,it=>({p:V(it.x,it.y+it.h*.47,it.z),s:V(1,it.h,1)}));
  const needles=[];for(const tree of trees)for(let j=0;j<7;j++){const f=j/6,r=tree.h*(.18*(1-f)+.024);for(let k=0;k<(j<4?5:3);k++){const a=tree.a+k*TAU/(j<4?5:3)+j*.8;needles.push({x:tree.x+Math.cos(a)*r*.44,y:tree.y+tree.h*(.32+f*.65),z:tree.z+Math.sin(a)*r*.44,a,sx:r*.86,sy:r*.46,sz:r*.60});}}
  const leafGeo=new THREE.IcosahedronGeometry(1,1),leafMat=standard('#ffffff',{roughness:1});
  const lp=leafGeo.attributes.position;for(let i=0;i<lp.count;i++){const x=lp.getX(i),y=lp.getY(i),z=lp.getZ(i),n=1+.11*Math.sin(x*11+y*9)*Math.cos(z*13-x*5);lp.setXYZ(i,x*n,y*n,z*n);}leafGeo.computeVertexNormals();
  instances(leafGeo,leafMat,needles,landscape,it=>({p:V(it.x,it.y,it.z),s:V(it.sx,it.sy,it.sz),c:new THREE.Color().setHSL(.23+rnd()*.025,.20+rnd()*.10,.20+rnd()*.085)}));
  const leafPositions=[],leafUV=[],leafIndices=[];
  for(let j=0;j<=8;j++){const t=j/8,w=Math.sin(t*PI)*.115;for(const sign of [-1,1]){leafPositions.push(sign*w,Math.sin(t*PI)*.045,t*.48);leafUV.push((sign+1)/2,t);}if(j<8){const a=j*2;leafIndices.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const fineLeaf=new THREE.BufferGeometry();fineLeaf.setAttribute('position',new THREE.Float32BufferAttribute(leafPositions,3));fineLeaf.setAttribute('uv',new THREE.Float32BufferAttribute(leafUV,2));fineLeaf.setIndex(leafIndices);fineLeaf.computeVertexNormals();
  const fineMat=standard('#ffffff',{side:THREE.DoubleSide,roughness:.8});
  const hangingLeaves=[];
  for(let k=0;k<8;k++)for(let j=0;j<12;j++){
    const t=stations[k]+(rnd()-.5)*.07;if(terraceAt(t,.005)||isOpening(t,1))continue;const p=roofPoint(t,.95),length=.35+rnd()*1.4,pts=[];
    for(let m=0;m<6;m++)pts.push(p.clone().add(V(Math.sin(m*1.4+j)*.06,-m/5*length,Math.cos(m*1.2+j)*.04)));
    tube(pts,.011,M.leaf,roofs,false,8);
    for(let m=0;m<12;m++)hangingLeaves.push({x:p.x+Math.sin(m*1.7+j)*.08,y:p.y-m/12*length,z:p.z+Math.cos(m*1.7+j)*.07,a:m*2.4+j,s:.36+rnd()*.25});
  }
  const fineLayout=it=>({p:V(it.x,it.y,it.z),s:V(it.s,it.s,it.s),c:new THREE.Color().setHSL(.22+rnd()*.055,.30+rnd()*.16,.21+rnd()*.16)});
  instances(fineLeaf,fineMat,hangingLeaves,roofs,fineLayout);
  // Soft contact darkening grounds furniture and timber stems between sunlit patches.
  const contactMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{opacity:{value:.23}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float opacity;varying vec2 vUv;void main(){float r=length((vUv-.5)*2.);gl_FragColor=vec4(.035,.05,.026,pow(max(0.,1.-r),2.)*opacity);}',side:THREE.DoubleSide});
  for(let k=0;k<8;k++){const f=frameAt(stations[k]),p=f.p.clone().addScaledVector(f.n,-1.5).addScaledVector(f.d,-2);const shadow=mesh(new THREE.PlaneGeometry(6,3.6),contactMat,landscape,p.x,p.y+.022,p.z);shadow.rotation.x=-PI/2;shadow.rotation.z=-Math.atan2(f.d.x,f.d.z);shadow.castShadow=false;}
  root.updateMatrixWorld(true);for(const s of walkSurfaces)s.mesh.updateWorldMatrix(true,false);
  function batch(group){
    group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert(),sets=new Map(),remove=[];
    group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.userData.projectId||o.userData.keepSeparate)return;
      let g=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(g.index){const n=g.toNonIndexed();g.dispose();g=n;}
      for(const key of Object.keys(g.attributes))if(!['position','normal','uv',...(o.material.vertexColors?['color']:[])].includes(key))g.deleteAttribute(key);
      if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      const key=o.material.uuid+':'+o.castShadow;if(!sets.has(key))sets.set(key,{m:o.material,cast:o.castShadow,g:[]});sets.get(key).g.push(g);remove.push(o);
    });for(const o of remove)o.removeFromParent();for(const bucket of sets.values()){const g=mergeGeometries(bucket.g,false);if(g){g.computeBoundingSphere();const o=mesh(g,bucket.m,group);o.castShadow=bucket.cast;}for(const g of bucket.g)g.dispose();}
  }
  batch(architecture);batch(roofs);batch(furniture);batch(garden.root);batch(media);
  return {root,architecture,roofs,landscape,furniture,media,walkSurfaces,navigationBlocks,entrances,artworks,artMaterials,videoScreens,spots,lamps,materials:M,bridgeCurve,bridgeSamples:crossingSamples,bridgeDeck,bridgeFoundations,siteStructure,earthworkBenches,garden,floorMesh:floor,waterSurface:water,roofTerraces:roofscape.terraces,roofTiles:roofscape.tiles,courtyardTree,
    overview:{eye:V(54,31,66),target:V(-2,9,1)},arrival:arrivalSequence.arrival,arrivalSequence,floorPoint,
    routeEye:t=>frameAt(t).p.add(V(0,EYE_HEIGHT,0)),routeLook:t=>frameAt(t+.012).p.add(V(0,EYE_HEIGHT,0))};
}
