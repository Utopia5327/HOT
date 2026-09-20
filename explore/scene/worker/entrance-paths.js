import * as THREE from '../assets/three.module.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),mix=(a,b,t)=>a+(b-a)*t;

// Shared by the cut-and-fill terrain, visible stairs and walking surfaces.
export function createGardenAccesses(frameAt){
  const specs=[
    {id:'garden-west',t:.29,endY:8.23,points:[[-18.2,-4.6],[-15.8,-1.8],[-14.65,1]],width:2.20},
    {id:'garden-east',t:.79,endY:7.08,points:[[22.6,5.5],[18.2,6.0],[14.8,7.3]],width:2.30}
  ];
  return specs.map(s=>{
    const f=frameAt(s.t),start=f.p.clone().addScaledVector(f.n,f.w*.39),threshold=f.p.clone().addScaledVector(f.n,f.w*.5+.65);
    const plan=new THREE.CatmullRomCurve3([start,threshold,...s.points.map(([x,z])=>V(x,0,z))].map(p=>p.clone().setY(0)),false,'catmullrom',.25);
    const first=.19,last=.80,startY=f.p.y,stepCount=Math.abs(startY-s.endY)<.35?0:Math.ceil(Math.abs(startY-s.endY)/.14);
    const elevation=t=>mix(startY,s.endY,THREE.MathUtils.clamp((t-first)/(last-first),0,1));
    const point=t=>plan.getPointAt(t).setY(elevation(t));
    const halfWidth=t=>s.width*.5+.35*(1-THREE.MathUtils.clamp(t/.20,0,1));
    return {...s,plan,point,halfWidth,first,last,startY,stepCount,samples:Array.from({length:101},(_,i)=>({p:point(i/100),half:halfWidth(i/100)}))};
  });
}
