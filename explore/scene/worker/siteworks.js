import * as THREE from '../assets/three.module.js';
import {buildStairStructure} from './stair-structure.js';
import {dragonScaleGeometry} from './dragon-scales.js';
import {balconyPoint} from './balcony-layout.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),PI=Math.PI;

export function buildSiteStructure({architecture,roofs,M,frameAt,groundHeight,naturalGroundHeight,roofTerraces,loungePads,box,beam,tube,mesh,edgeGeometry,facadeRoofPoint,isOpening}){
 const foundations=[],bents=[],retainingWalls=[],shadeSamples=[],southwest=V(-1,0,1).normalize();
 function pier(top,{width=.22,spread=0,dir=V(1,0,0),parent=architecture,kind='floor'}={}){
  const earth=groundHeight(top.x,top.z),underside=top.y;
  // Every footing penetrates the finished ground; the post ends at the actual soffit.
  const toe=Math.min(earth,...[-.59,.59].flatMap(dx=>[-.59,.59].map(dz=>groundHeight(top.x+dx,top.z+dz))));
  const bottom=Math.min(toe-.55,underside-.56),padTop=Math.min(earth+.12,underside-.08),height=padTop-bottom;
  const pad=box(1.18,height,1.18,M.foundation,parent,top.x,bottom+height*.5,top.z);pad.name='Buried stone foundation pad';
  const foot=V(top.x,padTop,top.z),end=top.clone();
  if(end.y-foot.y>.12)beam(foot,end,width,M.darkwood,parent);
  if(spread>0&&end.y-foot.y>.70){const fork=foot.clone().lerp(end,.55);for(const side of [-1,1])beam(fork,end.clone().addScaledVector(dir,spread*side),width*.75,M.darkwood,parent);}
  foundations.push({kind,top:end,ground:earth,bottom,padTop,pad});return {foot,end};
 }
 // Paired subfloor frames carry the wide gallery plates and their projecting edges.
 for(let i=0;i<35;i++){
  const t=(i+.35)/35,f=frameAt(t),ends=[];
  for(const side of [-1,1]){
   const top=f.p.clone().addScaledVector(f.n,side*f.w*.29).add(V(0,-.40,0));
   const p=pier(top,{spread:f.w*.17,dir:f.n,kind:'gallery'});ends.push(p.end);
  }
  beam(ends[0].clone().addScaledVector(f.n,-f.w*.16),ends[1].clone().addScaledVector(f.n,f.w*.16),.25,M.darkwood,architecture);bents.push({t,ends});
 }
 // Six masonry abutments replace thirty-six stair and landing support points.
 const stairStructure=buildStairStructure({roofs,M,frameAt,groundHeight,roofTerraces,mesh,box});
 for(const pad of loungePads){
  const ends=[];for(const s of [-.52,.52]){
   const top=balconyPoint(frameAt,pad.spec,s,.65).add(V(0,-.37,0));
   pier(top,{spread:.60,dir:pad.frame.d,kind:'balcony'});ends.push(top);
   beam(balconyPoint(frameAt,pad.spec,s,0).add(V(0,-.38,0)),balconyPoint(frameAt,pad.spec,s,.96).add(V(0,-.38,0)),.22,M.darkwood,architecture);
  }
  beam(ends[0],ends[1],.22,M.darkwood,architecture);
 }
 // Stone faces retain the uphill cuts. Gaps preserve all stair and gallery openings.
 for(let i=0;i<95;i++){
  const t=.24+i*.0048;if(isOpening(t,-1))continue;const f=frameAt(t),p=f.p.clone().addScaledVector(f.n,-f.w*.5-1.70),finished=groundHeight(p.x,p.z),natural=naturalGroundHeight(p.x,p.z),top=Math.min(natural,f.p.y+1.35);
  if(top-finished<.38)continue;
  const bottom=finished-.24,d=frameAt(t+.0046).p.distanceTo(f.p),wall=box(d+.045,top-bottom,.42,M.foundation,architecture,p.x,(top+bottom)/2,p.z,Math.atan2(-f.d.z,f.d.x));wall.name='Stone retaining face at hillside cut';
  for(let y=bottom+.25;y<top;y+=.28){const a=p.clone().addScaledVector(f.d,-d*.47).setY(y),b=p.clone().addScaledVector(f.d,d*.47).setY(y);beam(a,b,.019,M.soil,architecture);}
  retainingWalls.push({position:p,bottom,top});
 }
 // Convex clay scales overlap vertically and stagger by half a module each row.
 const records=[],matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color(),pitch=.74,columns=280;
 for(let row=0;row<10;row++)for(let i=0;i<columns;i++){
  const t=(i+(row%2)*.5)/columns,f=frameAt(t),out=f.n.clone().negate();
  if(f.p.x>4||f.p.z<-10||out.dot(southwest)<.40||[-.0028,0,.0028].some(dt=>isOpening(t+dt,-1)))continue;
  const top=facadeRoofPoint(t,-1).y-.18,bottom=f.p.y+.20+row*pitch,height=Math.min(1.10,top-bottom);if(height<.36)continue;
  const p=f.p.clone().addScaledVector(out,f.w*.50+.30+row*.014).setY(bottom+height/2);
  q.setFromAxisAngle(V(0,1,0),Math.atan2(out.x,out.z)+.08*Math.sin(t*PI*2));
  matrix.compose(p,q,V(.93,height,1));records.push({matrix:matrix.clone(),row,t,hue:.039+((i+row)%7)*.002,light:.55+((i+row*3)%5)*.018});
  if(row===0){
   shadeSamples.push({t,position:p.clone(),bottom:f.p.y+.20,top,orientation:out.dot(southwest)});
   if(i%4===0){const a=p.clone().setY(f.p.y+.18),b=a.clone().setY(top);beam(a,b,.045,M.bronze,architecture);for(const end of [a,b])beam(end,end.clone().addScaledVector(f.n,.48),.045,M.bronze,architecture);}
  }
 }
 const screens=new THREE.InstancedMesh(dragonScaleGeometry(),M.terracotta,records.length);screens.name='Southwest terracotta solar screens';screens.castShadow=true;screens.receiveShadow=true;
 screens.userData.facade={pattern:'Overlapping dragon scales',stagger:'Half-module alternate rows',moduleWidth:.93,verticalPitch:pitch,shape:'Convex shield with tapered tip',modules:records.length};
 records.forEach((r,i)=>{screens.setMatrixAt(i,r.matrix);color.setHSL(r.hue,.36,r.light);screens.setColorAt(i,color);});screens.instanceMatrix.needsUpdate=true;screens.instanceColor.needsUpdate=true;architecture.add(screens);
 return {foundations,bents,retainingWalls,shadeSamples,screens,stairStructure};
}
