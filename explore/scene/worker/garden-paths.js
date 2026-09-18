import * as THREE from '../assets/three.module.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export function buildGardenPaths({root,accesses,M,mesh,box,tube,surfaceGeometry,edgeGeometry,addSurface,navigationBlocks}){
  const result=[];
  for(const route of accesses){
    const group=new THREE.Group();group.name=route.id+' — connected landing and landscape stair';root.add(group);
    const sidePoint=(t,side)=>{const p=route.point(t),d=route.plan.getTangentAt(t);return p.addScaledVector(V(-d.z,0,d.x).normalize(),side*route.halfWidth(t));};
    const pathPoint=(t,u)=>sidePoint(t,u).add(V(0,.016,0));
    const path=mesh(surfaceGeometry(pathPoint,110,8),M.stairs,group);path.name='Weathered concrete garden landings';addSurface(path,'garden-path');
    for(const side of [-1,1])mesh(edgeGeometry(t=>pathPoint(t,side),t=>sidePoint(t,side).add(V(0,-.23,0)),110),M.foundation,group).material.side=THREE.DoubleSide;
    const steps=[];
    for(let i=0;i<route.stepCount;i++){
      const ta=route.first+(route.last-route.first)*i/route.stepCount,tb=route.first+(route.last-route.first)*(i+1)/route.stepCount,pa=route.point(ta),pb=route.point(tb),mid=pa.clone().lerp(pb,.5);
      const top=Math.max(pa.y,pb.y)+.032,run=Math.hypot(pb.x-pa.x,pb.z-pa.z),angle=Math.atan2(pb.x-pa.x,pb.z-pa.z),width=route.halfWidth((ta+tb)/2)*2;
      const step=box(width,.20,run+.018,M.stairs,group,mid.x,top-.10,mid.z,angle);addSurface(step,'garden-entry-stair');
      const nosing=box(width-.14,.009,.055,M.stairEdge,group,mid.x,top+.003,mid.z,angle);nosing.position.add(V(Math.sin(angle),0,Math.cos(angle)).multiplyScalar(run*(pa.y>pb.y?.38:-.38)));
      steps.push({center:[mid.x,top,mid.z],rise:Math.abs(pb.y-pa.y),width});
    }
    for(const side of [-1,1]){
      const rail=[];
      for(let i=0;i<=64;i++){
        const t=route.first+(route.last-route.first)*i/64,p=sidePoint(t,side);
        rail.push(p.clone().add(V(0,1.06,0)));
        if(i%8===0)box(.070,1.02,.070,M.darkwood,group,p.x,p.y+.53,p.z);
        if(i<64){
          const b=sidePoint(route.first+(route.last-route.first)*(i+1)/64,side),mid=p.clone().lerp(b,.5),angle=Math.atan2(b.x-p.x,b.z-p.z),length=p.distanceTo(b);
          box(.18,.16,length+.012,M.stairBrick,group,mid.x,mid.y+.025,mid.z,angle);
          if(i%4===0)box(.20,.014,length*.88,M.stairMortar,group,mid.x,mid.y+.112,mid.z,angle);
          navigationBlocks.push({a:[p.x,p.z],b:[b.x,b.z],radius:.095,bottom:Math.min(p.y,b.y)-.06,top:Math.max(p.y,b.y)+1.10,kind:'garden-stair-edge'});
        }
      }
      tube(rail,.044,M.wood,group,false,90);
      tube(rail.map(p=>p.clone().add(V(0,-.93,0))),.012,M.light,group,false,90);
    }
    // Rounded terminal paving meets the garden surface without an abrupt open edge.
    const end=route.point(1),capGeometry=new THREE.CircleGeometry(route.width*.5,48);capGeometry.rotateX(-Math.PI/2);const cap=mesh(capGeometry,M.stairs,group,end.x,end.y+.016,end.z);addSurface(cap,'garden-path');
    group.userData.gardenEntrance={id:route.id,t:route.t,width:route.width,steps,samples:Array.from({length:81},(_,i)=>route.point(i/80).toArray())};
    result.push({root:group,path,route,steps});
  }
  return result;
}
