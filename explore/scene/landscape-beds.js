import * as THREE from 'three';
import {COURTYARD_EXHIBITS,COURTYARD_BOULDERS,COURTYARD_POND,FIRE_CIRCLE,BANYAN,courtyardPathDistance} from './courtyard-layout.js';
import {LANDSCAPE_FLIGHTS} from './bridge-route.js';
import {bridgeHalfWidth} from './navigation-config.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),TAU=Math.PI*2;

// The beds follow the walking contours. The low edge is a retaining ribbon;
// foliage occupies the uphill side, with deliberate openings at every route.
export const LANDSCAPE_BEDS=[
 {id:'lower-garden',points:[[-14,14],[-11,16],[-7.7,16.8]],width:2.7,lift:.50,palette:0},
 {id:'western-terrace',points:[[-14.8,9],[-14.2,5.5],[-13.6,3.4]],width:2.4,lift:.65,palette:1},
 {id:'upper-rock-garden',points:[[-15.2,-13.6],[-11.7,-16.5],[-7.2,-18.3],[-2.4,-18.7]],width:2.8,lift:.70,palette:0},
 {id:'northern-terrace',points:[[-5.0,-21.6],[.3,-22.1],[4.7,-20.1]],width:2.2,lift:.50,palette:1},
 {id:'water-garden',points:[[14.5,-17],[16.4,-13.3],[16.6,-10.1]],width:2.1,lift:.55,palette:0},
 {id:'fire-garden',points:[[14.8,-8.5],[14.6,-5.8],[13.8,-2.5]],width:2.4,lift:.45,palette:1},
 {id:'banyan-understory',points:[[-.7,4.6],[1.2,6.4],[3.9,6.8],[5.8,4.2]],width:2.0,lift:.16,palette:1},
 {id:'western-understory',points:[[-7.5,-4.7],[-5.7,-5.7],[-3.3,-5.8]],width:1.8,lift:.18,palette:0},
 {id:'lower-east-terrace',points:[[7.8,17.5],[12.6,15.4],[14.6,11.8],[12.1,10.0]],width:3.0,lift:.55,palette:0},
 {id:'water-edge',points:[[9.2,-16.7],[11.1,-16.5],[13,-15.6]],width:1.7,lift:.18,palette:1}
];

function segmentDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
export function plantingClearance(x,z,margin=.0){
 const path=courtyardPathDistance(x,z);if(path.distance<path.half+.42+margin)return false;
 if(Math.hypot(x-FIRE_CIRCLE.x,z-FIRE_CIRCLE.z)<4.32+margin)return false;
 if(Math.hypot((x-COURTYARD_POND.x)/COURTYARD_POND.rx,(z-COURTYARD_POND.z)/COURTYARD_POND.rz)<1.4+margin)return false;
 for(const e of COURTYARD_EXHIBITS){
  if(segmentDistance(x,z,{x:e.ex,z:e.ez},e)<2.45+margin||Math.hypot(x-e.x,z-e.z)<3.15+margin)return false;
 }
 return true;
}

export function buildLandscapeBeds({root,M,groundHeight,nearestRoute,bridgeCurve,mesh,box,surfaceGeometry,edgeGeometry,quality,navigationBlocks}){
 const group=new THREE.Group();group.name='Layered contour gardens';root.add(group);
 M.gardenWall=new THREE.MeshStandardMaterial({color:'#c5bcaa',roughness:.96});
 M.gardenCoping=new THREE.MeshStandardMaterial({color:'#d3c9b7',roughness:.92});
 M.gardenMulch=new THREE.MeshStandardMaterial({color:'#515042',roughness:1});
 const points=[],walls=[],bedPlans=[];let seed=744927;
 const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const clear=(x,z,m=0)=>plantingClearance(x,z,m)&&(()=>{const r=nearestRoute(x,z);return r.distance>r.w*.5+.7+m;})();
 for(const bed of LANDSCAPE_BEDS){
  const curve=new THREE.CatmullRomCurve3(bed.points.map(p=>V(p[0],0,p[1])),false,'centripetal'),n=75;
  const point=(t,u)=>{const p=curve.getPointAt(t),d=curve.getTangentAt(t);p.addScaledVector(V(-d.z,0,d.x),u*bed.width/2);p.y=groundHeight(p.x,p.z)+.045+bed.lift*(1-u*u)*.40;return p;};
  const outline=[];for(let i=0;i<=n;i++)outline.push(point(i/n,-1).toArray());for(let i=n;i>=0;i--)outline.push(point(i/n,1).toArray());
  bedPlans.push({id:bed.id,outline});
  for(let i=0;i<n;i++){
   const t=(i+.5)/n,p=point(t,0);if(!clear(p.x,p.z,.15))continue;
   // Mulched planting soil and a gently rounded limestone coping follow one curve.
   const patch=mesh(surfaceGeometry((v,u)=>point((i+v)/n,u),1,5),M.gardenMulch,group);patch.castShadow=false;
   if(bed.lift>.25){
    const a=point(i/n,1),b=point((i+1)/n,1);if(!clear(a.x,a.z,.12)||!clear(b.x,b.z,.12))continue;
    const top=t=>point((i+t)/n,1).add(V(0,bed.lift,0));
    mesh(edgeGeometry(top,t=>point((i+t)/n,1).add(V(0,-.28,0)),1),M.gardenWall,group).material.side=THREE.DoubleSide;
    mesh(surfaceGeometry((t,u)=>{const p=top(t),d=curve.getTangentAt((i+t)/n);return p.addScaledVector(V(-d.z,0,d.x),u*.15);},1,1),M.gardenCoping,group);
    walls.push([a.toArray(),b.toArray(),bed.lift]);
    navigationBlocks.push({a:[a.x,a.z],b:[b.x,b.z],radius:.16,bottom:Math.min(a.y,b.y)-.3,top:Math.max(a.y,b.y)+bed.lift,kind:'garden-retaining-wall'});
   }
  }
  const length=curve.getLength(),count=Math.ceil(length*bed.width*2.3);
  for(let i=0;i<count;i++){
   const t=rnd(),u=(rnd()*2-1)*.91,p=point(t,u),height=.34+rnd()*.64,radius=.40+rnd()*.25;
   if(!clear(p.x,p.z,radius*.4))continue;
   if(COURTYARD_BOULDERS.some(b=>Math.hypot((p.x-b.x)/(b.rx+.30),(p.z-b.z)/(b.rz+.30))<1))continue;
   if(Math.hypot(p.x-BANYAN.x,p.z-BANYAN.z)<1.65)continue;
   points.push({x:p.x,y:p.y,z:p.z,r:radius,h:height,palette:bed.palette,flower:rnd()<.14});
  }
 }
 // Low silver-green drifts stitch the boulders into the garden, instead of
 // presenting them in four isolated circular gravel collars.
 for(const b of COURTYARD_BOULDERS)for(let i=0;i<32;i++){
  const a=rnd()*TAU,r=1.15+rnd()*.7,x=b.x+Math.cos(a)*b.rx*r,z=b.z+Math.sin(a)*b.rz*r;
  if(!clear(x,z,.24))continue;points.push({x,y:groundHeight(x,z)+.05,z,r:.30+rnd()*.17,h:.22+rnd()*.24,palette:1,flower:i%9===0});
 }
 // Retaining ribbons and planted shoulders tie the separate beds to the long
 // landscape stair. Level junctions stay completely open between the flights.
 const shoulder=t=>{const p=bridgeCurve.getPointAt(t),d=bridgeCurve.getTangentAt(t);return p.addScaledVector(V(-d.z,0,d.x).normalize(),bridgeHalfWidth(t)+.32);};
 for(let i=1;i<220;i++){
  const t=(i+.5)/220,p=bridgeCurve.getPointAt(t);
  if(!LANDSCAPE_FLIGHTS.slice(0,3).some(f=>p.z<f.fromZ-.65&&p.z>f.toZ+.65))continue;
  const a=shoulder(i/220),b=shoulder((i+1)/220),middle=a.clone().lerp(b,.5),height=.48;
  if(!plantingClearance(middle.x,middle.z,-.22))continue;
  const top=s=>shoulder((i+s)/220).add(V(0,height,0));
  mesh(edgeGeometry(top,s=>shoulder((i+s)/220).add(V(0,-.30,0)),1),M.gardenWall,group).material.side=THREE.DoubleSide;
  mesh(surfaceGeometry((s,u)=>{const tt=(i+s)/220,p=top(s),d=bridgeCurve.getTangentAt(tt);return p.addScaledVector(V(-d.z,0,d.x),u*.15);},1,1),M.gardenCoping,group);
  walls.push([a.toArray(),b.toArray(),height]);navigationBlocks.push({a:[a.x,a.z],b:[b.x,b.z],radius:.16,bottom:Math.min(a.y,b.y)-.3,top:Math.max(a.y,b.y)+height,kind:'garden-retaining-wall'});
  if(i%3===0){const d=bridgeCurve.getTangentAt(t),p=middle.addScaledVector(V(-d.z,0,d.x),.9);if(clear(p.x,p.z,.25))points.push({x:p.x,y:groundHeight(p.x,p.z)+.06,z:p.z,r:.53,h:.5+rnd()*.32,palette:i%2,flower:i%5===0});}
 }
 // One small reusable leaf, instanced across all shrubs. No alpha textures,
 // grass particles, per-plant meshes or additional asset downloads.
 const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.43,.08,.46,0,.16,.50,.43,.08,.46,0,0,1],3));leaf.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);leaf.computeVertexNormals();
 const perPlant=quality==='high'?92:60;
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,side:THREE.DoubleSide});
 const foliage=new THREE.InstancedMesh(leaf,material,points.length*perPlant);foliage.name='Layered broadleaf and silver garden planting';foliage.castShadow=true;foliage.receiveShadow=true;
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color();
 points.forEach((p,i)=>{for(let j=0;j<perPlant;j++){
  const a=j*2.399+rnd()*.35,r=p.r*Math.sqrt(rnd()),y=p.h*Math.sqrt(Math.max(0,1-r*r/(p.r*p.r)))*(.60+rnd()*.40),s=.29+rnd()*.20;
  q.setFromEuler(new THREE.Euler(-.15-rnd()*.85,a,rnd()*.5-.25));
  matrix.compose(V(p.x+Math.cos(a)*r,p.y+y,p.z+Math.sin(a)*r),q,V(s*.78,s,s));matrix.elements=matrix.elements.map(n=>Math.round(n*1000)/1000);foliage.setMatrixAt(i*perPlant+j,matrix);
  color.setHSL(p.palette?.23+rnd()*.03:.23+rnd()*.09,p.palette?.10+rnd()*.10:.27+rnd()*.22,p.palette?.22+rnd()*.12:.12+rnd()*.12);color.r=Math.round(color.r*63)/63;color.g=Math.round(color.g*63)/63;color.b=Math.round(color.b*63)/63;foliage.setColorAt(i*perPlant+j,color);
 }});group.add(foliage);
 const flowers=points.filter(p=>p.flower),flowerGeo=new THREE.SphereGeometry(1,5,3),flowerMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}),flowerMesh=new THREE.InstancedMesh(flowerGeo,flowerMat,flowers.length*7);
 flowers.forEach((p,i)=>{for(let j=0;j<7;j++){
  const a=j*2.399,r=p.r*.7*rnd();matrix.compose(V(p.x+Math.cos(a)*r,p.y+p.h*.7+.15,p.z+Math.sin(a)*r),q.identity(),V(.055,.07,.055));flowerMesh.setMatrixAt(i*7+j,matrix);flowerMesh.setColorAt(i*7+j,color.set(j%3?'#e9e2c6':'#a9a2c0'));
 }});flowerMesh.name='Small seasonal flower accents';group.add(flowerMesh);
 // Recessed lights in the retaining ribbons are emissive details, not another
 // set of expensive real-time lights.
 for(let i=9;i<walls.length;i+=29){const [a,b,h]=walls[i],x=(a[0]+b[0])/2,z=(a[2]+b[2])/2,y=(a[1]+b[1])/2+h*.65,angle=Math.atan2(b[0]-a[0],b[2]-a[2]);box(.045,.09,.26,M.light,group,x,y,z,angle);}
 group.userData.contourGarden={plants:points,walls,beds:bedPlans,leafInstances:foliage.count,looseFurniture:0};
 return {root:group,plants:points,walls};
}
