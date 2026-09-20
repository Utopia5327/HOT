import * as THREE from 'three';
import {createCourtyardTree} from './courtyard-tree.js';
import {EYE_HEIGHT,bridgeHalfWidth} from './navigation-config.js';
import {arrivalHalfWidth} from './arrival-route.js';
import {bridgeGardenOpening} from './bridge-route.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),PI=Math.PI;
const mix=(a,b,t)=>a+(b-a)*t;

// The arrival is designed as a single sequence: forest threshold, gallery, crossing.
// All dimensions are metres. These surfaces share the building's actual roof edges.
export function buildArrivalSequence({architecture,roofs,landscape,furniture,M,frameAt,roofPoint,groundHeight,nearestRoute,arrivalCurve,bridgeCurve,mesh,box,tube,beam,soft,buildSweep,surfaceGeometry,addSurface,quality,lamps,artMaterials}){
  const detail=new THREE.Group();detail.name='Arrival — timber portico and Rethinking BIM gallery';architecture.add(detail);
  const canopy=new THREE.Group();canopy.name='Sweeping entrance roof with timber underside';roofs.add(canopy);
  const center=roofPoint(0,-1),f=frameAt(0),out=f.n.clone().negate();
  function portal(t,u){
    const end=roofPoint((u*.018+1)%1,-1);
    const start=center.clone().addScaledVector(out,8.6).addScaledVector(f.d,u*3.6);
    start.y=center.y-.85+.55*(1-u*u);
    const p=start.lerp(end,t);p.y+=.38*Math.sin(t*PI)*(1-u*u);return p;
  }
  const roof=buildSweep(portal,canopy,M.tile,.22,62,32);roof.name='Continuous curved tiled entrance canopy';
  for(const side of [-1,1]){
    const edge=Array.from({length:65},(_,i)=>portal(i/64,side).add(V(0,-.075,0)));
    tube(edge,.075,M.darkwood,canopy,false,90);
    const gutter=edge.map(p=>p.clone().add(V(0,.025,0)));tube(gutter,.029,M.bronze,canopy,false,90);
  }
  for(let i=0;i<=43;i++){
    const t=i/43,pts=Array.from({length:29},(_,j)=>portal(t,-.97+j/28*1.94).add(V(0,-.27,0)));
    tube(pts,.030,M.wood,canopy,false,40);
  }
  // Glulam forks meet the actual canopy; stone pads step down into the ground.
  const supports=[];
  for(const t of [.20,.78])for(const side of [-1,1]){
    const top=portal(t,side*.82).add(V(0,-.28,0)),foot=top.clone().setY(groundHeight(top.x,top.z)+.15);
    const fork=foot.clone().lerp(top,.64);
    box(.9,.68,.9,M.foundation,detail,foot.x,foot.y-.27,foot.z);
    const trunk=new THREE.CylinderGeometry(.13,.22,foot.distanceTo(fork),16);const post=mesh(trunk,M.wood,detail);post.position.copy(foot).lerp(fork,.5);post.quaternion.setFromUnitVectors(V(0,1,0),fork.clone().sub(foot).normalize());
    for(const dt of [-.11,.11])tube([fork,fork.clone().lerp(portal(t+dt,side*.83),.55),portal(t+dt,side*.83).add(V(0,-.25,0))],.09,M.wood,detail,false,24);
    supports.push({foot,top});
  }
  const glow=Array.from({length:51},(_,i)=>portal(i/50,.68).add(V(0,-.28,0)));tube(glow,.014,M.light,canopy,false,65);

  // Low coursed stone edges and recessed lights articulate the approach at eye level.
  const pathPoint=(t,side)=>{const p=arrivalCurve.getPointAt(t),d=arrivalCurve.getTangentAt(t);return p.addScaledVector(V(-d.z,0,d.x).normalize(),side*arrivalHalfWidth(t));};
  for(const side of [-1,1])for(let i=0;i<28;i++){
    const a=pathPoint(i/28,side),b=pathPoint((i+1)/28,side),mid=a.clone().lerp(b,.5),angle=Math.atan2(b.x-a.x,b.z-a.z);
    box(.22,.23,a.distanceTo(b)+.008,M.foundation,detail,mid.x,mid.y+.08,mid.z,angle);
    box(.28,.055,a.distanceTo(b)+.01,M.stone,detail,mid.x,mid.y+.215,mid.z,angle);
    if(i%6===2){const p=mid.clone().add(V(0,.17,0));box(.13,.035,.30,M.light,detail,p.x,p.y,p.z,angle);}
  }

  const first=frameAt(.066),room=new THREE.Group();room.position.copy(first.p);room.rotation.y=Math.atan2(first.n.x,first.n.z);furniture.add(room);room.name='Rethinking BIM — framed gallery interior';
  const displayZ=first.w*.255;
  // A curved limestone exhibition wall gives the work a substantial, quiet backdrop.
  const wallPoint=(t,u)=>{const x=mix(-3.5,6.1,t),z=displayZ+.43+.020*x*x;return V(x,(u+1)*1.94,z);};
  const wall=mesh(surfaceGeometry(wallPoint,70,12),M.shell,room);wall.material.side=THREE.DoubleSide;
  const coping=[],skirting=[],wallLight=[];
  for(let i=0;i<=70;i++){const p=wallPoint(i/70,1);coping.push(p.clone());skirting.push(p.clone().setY(.08));wallLight.push(p.clone().add(V(0,-.10,-.085)));}
  tube(coping,.075,M.stone,room,false,90);tube(skirting,.04,M.bronze,room,false,90);tube(wallLight,.014,M.light,room,false,90);
  // Joinery at the garden side, door reveals and stone floor joints retain human scale.
  for(let i=0;i<23;i++){
    const x=-3.3+i*.4,z=displayZ+.51+.020*x*x;
    box(.065,3.62,.14,M.wood,room,x,1.9,z+.09);
  }
  for(let x=-5.8;x<=5.8;x+=1.2){const pts=[];for(let j=0;j<=28;j++){const t=.066+x/230,p=frameAt(t).p.clone().addScaledVector(frameAt(t).n,mix(-.43,.43,j/28)*frameAt(t).w);p.y+=.014;pts.push(p);}tube(pts,.006,M.gravel,detail,false,30);}
  // Additional wall wash is restricted to the first gallery, avoiding many scene lights.
  const light=new THREE.PointLight('#ffdfb8',32,11,2);light.position.copy(first.p).addScaledVector(first.n,1).add(V(0,3.8,0));light.userData.dayIntensity=24;light.userData.duskIntensity=44;detail.add(light);lamps.push(light);

  // The first crossing has visible end-grain caps, pin connections and edge lighting.
  const pegs=[];
  for(let i=0;i<=36;i++){
    const t=i/36,p=bridgeCurve.getPointAt(t),d=bridgeCurve.getTangentAt(t),n=V(-d.z,0,d.x).normalize(),half=bridgeHalfWidth(t)*.94;
    for(const side of [-1,1]){
      if(bridgeGardenOpening(bridgeCurve,t,side))continue;
      const q=p.clone().addScaledVector(n,side*half).add(V(0,.55,0));
      const peg=mesh(new THREE.CylinderGeometry(.024,.024,.115,10),M.bronze,detail);peg.position.copy(q);peg.quaternion.setFromUnitVectors(V(0,1,0),n);pegs.push(peg);
    }
  }
  for(const side of [-1,1]){const line=Array.from({length:121},(_,i)=>{const t=i/120,p=bridgeCurve.getPointAt(t),d=bridgeCurve.getTangentAt(t);return p.addScaledVector(V(-d.z,0,d.x).normalize(),side*bridgeHalfWidth(t)*.89).add(V(0,-.055,0));});tube(line,.011,M.light,detail,false,150);}

  // Fine-leaf trees frame the entrance; the distant forest remains inexpensive.
  const trees=[];
  for(const [i,[x,z,scale]] of [[-10,43,1.30],[13,41,1.15],[-17,36,1.3],[19,34,1.12],[-28,29,1.2]].entries()){
    const near=nearestRoute(x,z);if(near.distance<near.w*.55+2.4)continue;
    trees.push(createCourtyardTree({landscape,M,position:V(x,groundHeight(x,z)+.02,z),scale,seed:5412+i*813,groundHeight,quality,leafBudget:quality==='high'?3200:1800}));
  }
  const arrival=arrivalCurve.getPointAt(.02);arrival.y+=EYE_HEIGHT;
  const target=V(2.5,8,4);
  return {arrival:{eye:arrival,target},portal,supports,trees,root:detail,canopy};
}
