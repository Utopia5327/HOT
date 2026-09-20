import { EYE_HEIGHT } from './navigation-config.js';
import * as THREE from 'three';
import {createCourtyardTree} from './courtyard-tree.js';
import {plantUnderstory} from './planting.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),PI=Math.PI,TAU=PI*2;
import { TERRACE_SPECS } from './navigation-config.js';
export { TERRACE_SPECS } from './navigation-config.js';
export function terraceAt(t,margin=0){t=(t%1+1)%1;return TERRACE_SPECS.find(r=>Math.abs(t-r.t)<r.half+margin)||null;}
export function roofHalfSpan(t,width){return width*.5+2.45+.18*Math.sin(t*TAU*3);}
export function roofElevation(t,u,width){
 const bump=(center,spread)=>{const d=Math.min(Math.abs(t-center),1-Math.abs(t-center));return Math.exp(-((d/spread)**2));};
 const eave=3.68+.62*bump(.066,.078)+.88*bump(.425,.10)-.20*bump(.925,.05);
 const rise=roofHalfSpan(t,width)*(.46+.070*bump(.066,.10)+.085*bump(.425,.10));
 // Broad convex sections create a flowing crest and a consistent, constructible eave.
 const section=(1-u*u)*(.76+.24*Math.cos(u*PI*.5));
 return eave+rise*section;
}
export function buildRoofscape({roofs,architecture,frameAt,pitchedRoofPoint,roofPoint,surfaceGeometry,edgeGeometry,mesh,box,soft,tube,beam,buildSweep,addSurface,F,M,rnd,quality,artMaterials,terraceProjects=[]}){
 const terraces=[],tileRecords=[],tiledIntervals=[];let last=0;
 for(const terrace of TERRACE_SPECS){tiledIntervals.push([last,terrace.t-terrace.half]);last=terrace.t+terrace.half;}tiledIntervals.push([last,1]);
 for(const [a,b] of tiledIntervals){
  const steps=Math.ceil((b-a)*550),fn=(t,u)=>pitchedRoofPoint(a+(b-a)*t,u);
  buildSweep(fn,roofs,M.roofBacking,.20,steps,22);
  for(const side of [-1,1]){
   const edge=[],glow=[];for(let i=0;i<=steps;i++){const t=a+(b-a)*i/steps;edge.push(pitchedRoofPoint(t,side).add(V(0,-.07,0)));glow.push(pitchedRoofPoint(t,side*.87).add(V(0,-.24,0)));}
   tube(edge,.075,M.darkwood,roofs,false,steps*2);tube(glow,.019,M.light,roofs,false,steps*2);
  }
  // A row of curved ridge caps follows the changing roof crest.
  const ridge=[];for(let i=0;i<=steps;i++)ridge.push(pitchedRoofPoint(a+(b-a)*i/steps,0).add(V(0,.08,0)));tube(ridge,.085,M.tile,roofs,false,steps*2);
 }
 // Interlocking clay tiles have modeled channels, overlaps and a turned-down leading lip.
 const pos=[],uv=[],idx=[],columns=5;
 for(let z=0;z<2;z++)for(let j=0;j<=columns;j++){
  const u=j/columns,h=.018+.020*Math.cos(u*PI*4)+.010*Math.cos(u*PI*2);
  pos.push((u-.5)*.246,h+z*.008,(z-.5)*.43);uv.push(.206+u*.024,.598+z*.058);
 }
 for(let j=0;j<columns;j++){const b=j+columns+1;idx.push(j,b,j+1,j+1,b,b+1);}
 const lipStart=pos.length/3;for(let j=0;j<=columns;j++){const u=j/columns;pos.push((u-.5)*.246,-.012,.215);uv.push(.206+u*.024,.656);}
 for(let j=0;j<columns;j++){const a=columns+1+j,b=lipStart+j;idx.push(a,b,a+1,a+1,b,b+1);}
 const tileGeo=new THREE.BufferGeometry();tileGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));tileGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));tileGeo.setIndex(idx);tileGeo.computeVertexNormals();
 const stepT=.00130;
 for(let t=stepT*.5;t<1;t+=stepT){
  if(terraceAt(t,.001))continue;
  for(const side of [-1,1]){
   const a=pitchedRoofPoint(t,0),b=pitchedRoofPoint(t,side),slopeLength=Array.from({length:12},(_,n)=>pitchedRoofPoint(t,side*n/12).distanceTo(pitchedRoofPoint(t,side*(n+1)/12))).reduce((s,n)=>s+n,0),courses=Math.max(5,Math.round(slopeLength/.37));
   for(let j=0;j<courses;j++){
    const u=side*(j+.5)/courses,p=pitchedRoofPoint(t,u),x=pitchedRoofPoint(t+.00025,u).sub(pitchedRoofPoint(t-.00025,u)).normalize().multiplyScalar(side),z=pitchedRoofPoint(t,u+side*.005).sub(pitchedRoofPoint(t,u-side*.005)).normalize(),y=z.clone().cross(x).normalize();x.copy(y).cross(z).normalize();
    const matrix=new THREE.Matrix4().makeBasis(x,y,z);p.addScaledVector(y,.032);matrix.setPosition(p);
    tileRecords.push({t,matrix,color:new THREE.Color().setHSL(.055+rnd()*.025,.27+rnd()*.13,.66+rnd()*.20)});
   }
  }
 }
 const tiles=new THREE.Group();tiles.name='Detailed overlapping roof tiles';tiles.count=tileRecords.length;
 for(let zone=0;zone<8;zone++){
  const records=tileRecords.filter(r=>Math.floor(r.t*8)===zone),part=new THREE.InstancedMesh(tileGeo,M.tile,records.length);
  part.name='Terracotta tile courses '+(zone+1);part.castShadow=true;part.receiveShadow=true;
  part.userData.detailDistance=44;part.userData.lodCenter=frameAt((zone+.5)/8).p.toArray();
  records.forEach((r,i)=>{part.setMatrixAt(i,r.matrix);part.setColorAt(i,r.color);});part.instanceMatrix.needsUpdate=true;part.instanceColor.needsUpdate=true;part.computeBoundingSphere();tiles.add(part);
 }
 roofs.add(tiles);
 // Each roof terrace is an actual flat occupied roof with its own external stair.
 for(let k=0;k<TERRACE_SPECS.length;k++){
  const spec=TERRACE_SPECS[k],a=spec.t-spec.half,b=spec.t+spec.half,center=frameAt(spec.t),deckFn=(t,u)=>{const tt=a+(b-a)*t,f=frameAt(tt);return f.p.clone().addScaledVector(f.n,u*(f.w+2.8)*.5).setY(spec.level);};
  const deck=buildSweep(deckFn,roofs,M.deck,.24,46,16);const walkEntry=addSurface(deck,'terrace');
  deck.name=spec.name;deck.userData.roofTerraceId=spec.id;
  // Fine decking joints define the scale without turning the terrace into a ramp.
  for(let j=1;j<36;j++){const t=j/36,points=[];for(let l=0;l<=12;l++)points.push(deckFn(t,-1+l/6).add(V(0,.008,0)));tube(points,.009,M.darkwood,roofs,false,13);}
  const endStair=spec.t+.016,startStair=spec.t-.017,stairWidth=1.55;
  const stairPoint=f=>{const t=startStair+(endStair-startStair)*f,fr=frameAt(t);return fr.p.clone().addScaledVector(fr.n,-fr.w*.5-2.40).setY(spec.base+(spec.level-spec.base)*f);};
  const count=26,steps=[];
  for(let i=0;i<count;i++){
   const pa=stairPoint(i/count),pb=stairPoint((i+1)/count),mid=pa.clone().lerp(pb,.5),rise=pb.y-pa.y,run=Math.hypot(pb.x-pa.x,pb.z-pa.z),angle=Math.atan2(pb.x-pa.x,pb.z-pa.z);
   const step=box(stairWidth,rise+.09,run+.055,M.stairs,roofs,mid.x,pb.y-(rise+.09)/2,mid.z,angle);addSurface(step,'terrace-stair');steps.push({center:mid.clone().setY(pb.y),top:pb.y});
  }
  function landing(t,y,from,to,along=0){const f=frameAt(t),length=Math.abs(to-from),p=f.p.clone().addScaledVector(f.n,(from+to)/2).addScaledVector(f.d,along).setY(y-.09),o=box(length,.18,1.70,M.stairs,roofs,p.x,p.y,p.z,Math.atan2(-f.n.z,f.n.x));addSurface(o,'terrace-landing');return p.clone().setY(y);}
  const first=frameAt(startStair),last=frameAt(endStair);
  const lowerLanding=landing(startStair,spec.base,-first.w*.42,-first.w*.5-3.15),upperLanding=landing(endStair,spec.level,-last.w*.5-.55,-last.w*.5-3.15,.75);
  // Rails are continuous along both stair sides and stop at the roof entry.
  for(const side of [-1,1]){
   const points=[];for(let i=0;i<=count;i++){const f=i/count,p=stairPoint(f),fr=frameAt(startStair+(endStair-startStair)*f);p.addScaledVector(fr.n,side*stairWidth*.48);points.push(p.clone().add(V(0,1.05,0)));if(i%3===0)beam(p,p.clone().add(V(0,1.05,0)),.042,M.bronze,roofs);}
   tube(points,.035,M.wood,roofs,false,65);
  }
  const landingGuard=[[-last.w*.5-3.15,-.10],[-last.w*.5-3.15,1.60],[-last.w*.5-.55,1.60]].map(([n,d])=>last.p.clone().addScaledVector(last.n,n).addScaledVector(last.d,d).setY(spec.level));
  for(const p of landingGuard)beam(p,p.clone().add(V(0,1.06,0)),.042,M.bronze,roofs);
  tube(landingGuard.map(p=>p.clone().add(V(0,1.06,0))),.038,M.wood,roofs,false,10);
  function rail(points){tube(points.map(p=>p.clone().add(V(0,1.06,0))),.046,M.wood,roofs,false,points.length*2);tube(points.map(p=>p.clone().add(V(0,.55,0))),.020,M.bronze,roofs,false,points.length*2);for(let j=0;j<points.length;j+=2)beam(points[j],points[j].clone().add(V(0,1.06,0)),.040,M.bronze,roofs);}
  for(const side of [-1,1]){let pts=[];for(let j=0;j<=44;j++){const tt=a+(b-a)*j/44;if(side===-1&&Math.abs(tt-endStair)<.0057){if(pts.length>1)rail(pts);pts=[];continue;}pts.push(deckFn(j/44,side*.985));}if(pts.length>1)rail(pts);}
  for(const end of [0,1]){
   const points=[];for(let j=0;j<=24;j++)points.push(deckFn(end,-.985+j/24*1.97));rail(points);
   // Glazed gable clerestories close the rooms where tiled roof and open deck meet.
   const t=end?b:a,geometry=edgeGeometry(u=>{const v=u*2-1;return deckFn(end,v).add(V(0,-.22,0));},u=>pitchedRoofPoint(t,u*2-1).add(V(0,-.20,0)),50);
   mesh(geometry,M.glass,roofs).castShadow=false;
   const gable=[];for(let j=0;j<=24;j++)gable.push(pitchedRoofPoint(t,-1+j/12).add(V(0,-.10,0)));tube(gable,.070,M.wood,roofs,false,32);
  }
  const room=new THREE.Group();room.position.copy(center.p).setY(spec.level+.025);room.rotation.y=Math.atan2(center.n.x,center.n.z);roofs.add(room);
  room.name=spec.name+' — open project terrace';room.userData.terraceFurniture=0;
  // Long curved beds sit inside the timber guards, with a clear gap at the stair entry.
  const terracePlants=[],terraceTrees=[],plantingBeds=[];
  for(const [side,from,to] of [[1,.07,.94],[-1,.07,.48]]){
   const low=side>0?.77:-.945,high=side>0?.945:-.77;
   const bedFn=(t,u)=>deckFn(from+(to-from)*t,(low+high)/2+u*(high-low)/2).setY(spec.level+.43);
   buildSweep(bedFn,roofs,M.terracotta,.43,32,3);mesh(surfaceGeometry((t,u)=>bedFn(t,u).add(V(0,.025,0)),32,3),M.soil,roofs);
   for(const u of [-1,1]){const points=[];for(let j=0;j<=28;j++)points.push(bedFn(j/28,u).add(V(0,.055,0)));tube(points,.035,M.darkwood,roofs,false,40);}
   for(let j=0;j<68;j++){const p=bedFn(rnd(),rnd()*1.6-.8);terracePlants.push({x:p.x,y:p.y+.035,z:p.z,s:.75+rnd()*.70});}
   plantingBeds.push({side,from,to});
  }
  plantUnderstory({parent:roofs,points:terracePlants,seed:7841+k*130});
  for(const t of [.17,.83]){
   const p=deckFn(t,.855).setY(spec.level+.48);
   terraceTrees.push(createCourtyardTree({landscape:roofs,M,position:p,scale:.33,seed:14809+k*47+t*100,quality,mound:false,leafBudget:quality==='high'?1000:650}));
  }
  // Quiet, unassigned display space can hold future work without inventing projects.
  soft(1.90,.66,.88,M.terracotta,room,.20,.33,3.10,0,.08);box(1.97,.075,.95,M.darkwood,room,.20,.70,3.10);
  const futureMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.93});
  const futureSign=mesh(new THREE.PlaneGeometry(1.45,.32),futureMaterial,room,.20,.40,2.65);futureSign.rotation.y=PI;futureSign.castShadow=false;
  const assignedProject=k===0?terraceProjects[0]:null;
  artMaterials.push({material:futureMaterial,src:assignedProject?`./assets/labels/${assignedProject.id}.svg`:'./assets/future-projects.svg'});
  const futureExhibit={status:assignedProject?'assigned':'reserved',title:assignedProject?.shortTitle||'Future projects',projectId:assignedProject?.id||null,position:center.p.clone().addScaledVector(center.n,3.10).addScaledVector(center.d,.20).setY(spec.level+.72)};
  const eye=center.p.clone().addScaledVector(center.n,-1.2).addScaledVector(center.d,-1.8).setY(spec.level+EYE_HEIGHT),target=center.p.clone().addScaledVector(center.n,5).setY(spec.level+1.35);
  terraces.push({...spec,eye,target,position:center.p.clone().setY(spec.level),width:center.w+2.8,deck,steps,stairPoint,lowerLanding,upperLanding,startStair,endStair,plantingBeds,trees:terraceTrees,plantCount:terracePlants.length,futureExhibit});
 }
 return {terraces,tiles,tiledIntervals};
}
