import * as THREE from 'three';
import {courtyardPathDistance} from './courtyard-layout.js';
import {bridgeHalfWidth} from './navigation-config.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),PI=Math.PI,TAU=PI*2;
export function createCourtyardTree({landscape,M,bridgeCurve,quality='high',position=V(5.2,7.13,5.3),scale=1,seed:treeSeed=45108,groundHeight=null,mound:showMound=true,leafBudget=null,banyan=false}){
 let seed=treeSeed;const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 const root=new THREE.Group();root.name=banyan?'Courtyard banyan — raised canopy and aerial roots':'Rooted broad-leaved garden tree';root.userData.tree={base:position.toArray(),scale,banyan};landscape.add(root);
 const base=V(5.2,7.13,5.3),wood=[],bridge=bridgeCurve?Array.from({length:240},(_,i)=>({p:bridgeCurve.getPointAt(i/239),half:bridgeHalfWidth(i/239)})):[];
 const verticalScale=banyan?1.55:scale;
 const world=p=>position.clone().add(p.clone().sub(base).multiply(V(scale,verticalScale,scale)));
 function clear(p,r=.2){if(!bridge.length)return true;const q=world(p);let near=null,d=Infinity;for(const s of bridge){const dd=Math.hypot(q.x-s.p.x,q.z-s.p.z);if(dd<d){d=dd;near=s;}}r*=scale;return !(d<near.half+r+.65&&q.y>near.p.y-.35-r&&q.y<near.p.y+2.75+r);}
 function safePoint(p,r=.2){if(clear(p,r))return p;const q=world(p);let near=bridge[0],d=Infinity;for(const s of bridge){const dd=Math.hypot(q.x-s.p.x,q.z-s.p.z);if(dd<d){d=dd;near=s;}}p.y=Math.max(p.y,base.y+(near.p.y+2.8+r*scale-position.y)/verticalScale);return p;}
 function branch(points,r0,r1,segments=17,sides=9){
  const curve=new THREE.CatmullRomCurve3(points),frames=curve.computeFrenetFrames(segments,false),pos=[],uv=[],idx=[];
  for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPointAt(t),radius=r0+(r1-r0)*Math.pow(t,.65);
   for(let j=0;j<=sides;j++){const a=j/sides*TAU,r=radius*(1+.11*Math.sin(a*5+t*3)+.06*Math.cos(a*9-t*4)),q=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);safePoint(q,.04);const w=world(q);pos.push(w.x,w.y,w.z);uv.push(j/sides,t*3);if(i<segments&&j<sides){const n=i*(sides+1)+j,k=n+sides+1;idx.push(n,k,n+1,n+1,k,k+1);}}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();wood.push(g);
 }
 // The island is a low irregular earth mound, rather than a container or planting pot.
 const soilPos=[],soilUV=[],soilIdx=[],rings=12,sides=80;
 for(let i=0;i<=rings;i++)for(let j=0;j<=sides;j++){
  const r=i/rings,a=j/sides*TAU,edge=1+.08*Math.sin(a*3+.7)+.045*Math.cos(a*5),x=base.x+Math.cos(a)*r*2.65*edge*(banyan?.45:1),z=base.z+Math.sin(a)*r*1.92*edge*(banyan?.55:1),y=6.855+.29*Math.pow(1-r,1.5)+.04*Math.sin(a*3)*Math.sin(r*PI);
  const q=world(V(x,y,z));if(groundHeight)q.y=groundHeight(q.x,q.z)+.012+.10*scale*Math.pow(1-r,1.5);soilPos.push(q.x,q.y,q.z);soilUV.push(x*.55,z*.55);if(i<rings&&j<sides){const n=i*(sides+1)+j,k=n+sides+1;soilIdx.push(n,n+1,k,n+1,k+1,k);}
 }
 const soilGeometry=new THREE.BufferGeometry();soilGeometry.setAttribute('position',new THREE.Float32BufferAttribute(soilPos,3));soilGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(soilUV,2));soilGeometry.setIndex(soilIdx);soilGeometry.computeVertexNormals();
 const mound=new THREE.Mesh(soilGeometry,M.grass);mound.receiveShadow=true;if(showMound)root.add(mound);
 branch([base,base.clone().add(V(.12,1.7,.03)),base.clone().add(V(-.20,3.7,.16)),base.clone().add(V(.08,5.8,.32))],.52,.15,27,14);
 for(let i=0;i<9;i++){
  const a=i*TAU/9+.3,r=banyan?.95:1.7,end=base.clone().add(V(Math.cos(a)*r,-.03,Math.sin(a)*r*.85)),q=world(end),path=courtyardPathDistance(q.x,q.z);
  if(banyan&&path.distance<path.half+.8)continue;
  if(groundHeight)end.y=base.y+(groundHeight(q.x,q.z)-position.y)/verticalScale;
  branch([base.clone().add(V(0,.58,0)),base.clone().lerp(end,.5).add(V(0,.06,0)),end],.21,.025,13,8);
 }
 if(banyan){
  for(let i=0;i<11;i++){
   const a=i*TAU/11+.15,r=.62+random()*.4,foot=base.clone().add(V(Math.cos(a)*r,0,Math.sin(a)*r)),q=world(foot),path=courtyardPathDistance(q.x,q.z);
   if(path.distance<path.half+.75)continue;
   foot.y=base.y+(groundHeight(q.x,q.z)-position.y)/verticalScale;
   const top=foot.clone().add(V(.1,5+random()*.7,.12));branch([foot,foot.clone().lerp(top,.45).add(V(-.07,0,.02)),top],.105,.045,22,9);
  }
 }

 const tips=[];
 for(let i=0;i<13;i++){
  const a=i*2.399+.25,h=3.45+(i%4)*.48,start=base.clone().add(V(-.13,h,.12)),r=2.2+random()*1.2,tip=base.clone().add(V(Math.cos(a)*r,6.4+random()*1.7,Math.sin(a)*r+.35));safePoint(tip,.3);
  const elbow=start.clone().lerp(tip,.6).add(V(0,.50,0));branch([start,elbow,tip],.17-(i%3)*.024,.035,18,8);tips.push(tip);
  for(let j=0;j<3;j++){const angle=a+(j-1)*.52,from=start.clone().lerp(tip,.58),end=tip.clone().add(V(Math.cos(angle)*(.6+random()*.5),.35+random()*.7,Math.sin(angle)*(.6+random()*.5)));safePoint(end,.28);branch([from,from.clone().lerp(end,.55).add(V(0,.2,0)),end],.065,.012,11,6);tips.push(end);}
 }
 const timber=new THREE.Mesh(mergeGeometries(wood,false),M.bark);timber.name='Flared trunk, exposed roots and branching limbs';timber.userData.treeWood=true;timber.userData.keepSeparate=true;timber.castShadow=true;timber.receiveShadow=true;root.add(timber);wood.forEach(g=>g.dispose());
 // Individual irregularly oriented leaves preserve a tree canopy with visible branching.
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.13,.025,.19,0,.054,.22,.13,.025,.19,0,0,.43],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([.5,0,0,.5,.5,.5,1,.5,.5,1],2));geo.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);geo.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.87,side:THREE.DoubleSide});
 const leaves=[],max=leafBudget||(quality==='high'?6300:3800);
 for(let i=0;i<max*1.35&&leaves.length<max;i++){
  let p;
  if(i%3===0){const t=tips[Math.floor(random()*tips.length)];p=t.clone().add(V((random()-.5)*1.5,(random()-.5)*1.3,(random()-.5)*1.4));}
  else{const a=random()*TAU,r=Math.sqrt(random()),y=(random()-.5)*2,spread=Math.sqrt(Math.max(.08,1-y*y*.24));p=base.clone().add(V(Math.cos(a)*r*4.05*spread,7.25+y*1.18,Math.sin(a)*r*3.55*spread+.45));}
  if(!clear(p,.60))continue;
  leaves.push({p:world(p),rx:random()*PI,ry:random()*TAU,rz:random()*PI,s:(1.05+random()*.65)*(banyan?1.2:scale)});
 }
 const crown=new THREE.InstancedMesh(geo,material,leaves.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color();crown.name='Broad forest-tree canopy';crown.castShadow=true;crown.receiveShadow=true;
 leaves.forEach((leaf,i)=>{q.setFromEuler(new THREE.Euler(leaf.rx,leaf.ry,leaf.rz));matrix.compose(leaf.p,q,V(leaf.s,leaf.s,leaf.s));crown.setMatrixAt(i,matrix);color.setHSL(.19+random()*.065,.24+random()*.20,.20+random()*.15);crown.setColorAt(i,color);});crown.instanceMatrix.needsUpdate=true;crown.instanceColor.needsUpdate=true;root.add(crown);
 return {root,base:position.clone(),scale,trunk:timber,crown,mound,branchCount:wood.length,leafCount:leaves.length};
}
