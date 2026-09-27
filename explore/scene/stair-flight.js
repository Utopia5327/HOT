import * as THREE from 'three';

export function bowedStation(t,u,a,b,bend){return t+Math.sin(Math.PI*(t-a)/(b-a))*bend*Math.max(0,1-u*u);}
export function unbowedStation(t,u,a,b,bend){let lo=a,hi=b;for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(bowedStation(mid,u,a,b,bend)<t)lo=mid;else hi=mid;}return (lo+hi)/2;}

// The model, walking heights and plan drawing share the same curved treads.
export function buildStairFlight({id,parent,point,parameters,material,riserMaterial,nosingMaterial,mesh,surfaceGeometry,edgeGeometry,addSurface,type,range}){
 const group=new THREE.Group();group.name=id+' — continuous curved stair';parent.add(group);
 const ascending=point(parameters.at(-1),0).y>point(parameters[0],0).y;
 const steps=[],left=[],right=[],boundaries=[];
 for(const t of parameters)boundaries.push(Array.from({length:13},(_,i)=>point(t,i/6-1).toArray()));
 for(let i=0;i<parameters.length-1;i++){
  const a=parameters[i],b=parameters[i+1],pa=point(a,0),pb=point(b,0),top=Math.max(pa.y,pb.y)+.026,low=Math.min(pa.y,pb.y)+.026;
  const edge=(t,u)=>point(THREE.MathUtils.lerp(a,b,t),u).setY(top);
  const tread=mesh(surfaceGeometry(edge,4,12),material,group);tread.name=id+' tread '+(i+1);addSurface(tread,type);
  const nose=ascending?0:1;
  mesh(edgeGeometry(u=>edge(nose,u*2-1),u=>edge(nose,u*2-1).setY(low-.025),12),riserMaterial,group).material.side=THREE.DoubleSide;
  for(const side of [-1,1])mesh(edgeGeometry(t=>edge(t,side),t=>point(THREE.MathUtils.lerp(a,b,t),side).add(new THREE.Vector3(0,-.18,0)),4),riserMaterial,group).material.side=THREE.DoubleSide;
  const run=Math.hypot(pb.x-pa.x,pb.z-pa.z),band=Math.min(.16,.045/Math.max(.01,run));
  const nosing=mesh(surfaceGeometry((t,u)=>edge(ascending?t*band:1-t*band,u).setY(top+.003),1,12,!ascending),nosingMaterial,group);nosing.castShadow=false;
  for(let j=0;j<4;j++){left.push(edge(j/4,-1).toArray());right.push(edge(j/4,1).toArray());}
  steps.push({a:pa.toArray(),b:pb.toArray(),top,rise:Math.abs(pb.y-pa.y),width:point((a+b)/2,-1).distanceTo(point((a+b)/2,1)),nosing:boundaries[ascending?i:i+1]});
 }
 const end=parameters.at(-1);left.push(point(end,-1).toArray());right.push(point(end,1).toArray());
 const first=parameters[0],last=parameters.at(-1),centerline=Array.from({length:33},(_,i)=>point(THREE.MathUtils.lerp(first,last,ascending?i/32:1-i/32),0).toArray());
 const flight={id,type,from:point(first,0).y,to:point(last,0).y,ascending,range,steps,left,right,boundaries,centerline};
 group.userData.stairFlight=flight;
 return flight;
}
