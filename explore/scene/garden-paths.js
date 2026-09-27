import * as THREE from 'three';
import {buildStairFlight,bowedStation,unbowedStation} from './stair-flight.js';
import {buildStairJaali} from './stair-jaali.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export function buildGardenPaths({root,accesses,M,mesh,box,tube,surfaceGeometry,edgeGeometry,addSurface,navigationBlocks}){
  const result=[];
  for(const route of accesses){
    const group=new THREE.Group();group.name=route.id+' — connected landing and landscape stair';root.add(group);
    const sidePoint=(t,side)=>{const p=route.point(t),d=route.plan.getTangentAt(t);return p.addScaledVector(V(-d.z,0,d.x).normalize(),side*route.halfWidth(t));};
    const bend=(route.last-route.first)*.05;
    const pathPoint=(t,u)=>{const p=sidePoint(t,u);if(route.stepCount&&t>route.first&&t<route.last)p.y=route.point(unbowedStation(t,u,route.first,route.last,bend)).y;return p.add(V(0,.016,0));};
    const path=mesh(surfaceGeometry(pathPoint,110,8),M.stairs,group);path.name='Weathered concrete garden landings';addSurface(path,'garden-path');
    for(const side of [-1,1])mesh(edgeGeometry(t=>pathPoint(t,side),t=>sidePoint(t,side).add(V(0,-.23,0)),110),M.foundation,group).material.side=THREE.DoubleSide;
    const stairPoint=(t,u)=>sidePoint(bowedStation(t,u,route.first,route.last,bend),u).setY(route.point(t).y);
    const steps=route.stepCount?buildStairFlight({id:route.id,parent:group,point:stairPoint,parameters:Array.from({length:route.stepCount+1},(_,i)=>THREE.MathUtils.lerp(route.first,route.last,i/route.stepCount)),material:M.stairs,riserMaterial:M.stairEdge,nosingMaterial:M.stairEdge,mesh,surfaceGeometry,edgeGeometry,addSurface,type:'garden-entry-stair'}).steps:[];
    if(route.stepCount>0)for(const side of [-1,1]){
      const points=[];
      for(let i=0;i<=64;i++){
        const t=route.first+(route.last-route.first)*i/64,p=sidePoint(t,side);
        points.push(p);
      }
      buildStairJaali({parent:group,points,M,box,navigationBlocks,name:route.id+' — garden stair jaali '+side});
    }
    // Rounded terminal paving meets the garden surface without an abrupt open edge.
    const end=route.point(1),capGeometry=new THREE.CircleGeometry(route.width*.5,48);capGeometry.rotateX(-Math.PI/2);const cap=mesh(capGeometry,M.stairs,group,end.x,end.y+.016,end.z);addSurface(cap,'garden-path');
    group.userData.gardenEntrance={id:route.id,t:route.t,width:route.width,steps,samples:Array.from({length:81},(_,i)=>route.point(i/80).toArray())};
    result.push({root:group,path,route,steps});
  }
  return result;
}
