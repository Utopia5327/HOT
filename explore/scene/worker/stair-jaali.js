import * as THREE from '../assets/three.module.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const unitBrick=new THREE.BoxGeometry(1,1,1);

// The same open stretcher bond, warm brick and pale coping as the balcony screens.
export function buildStairJaali({parent,points,M,box,navigationBlocks,name='Stair brick jaali',startPost=true,endPost=true}){
 const root=new THREE.Group();root.name=name;parent.add(root);
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+points[i].distanceTo(points[i-1]));
 const length=lengths.at(-1),plinth=.12;
 let minimumUp=1;for(let i=1;i<points.length;i++){const d=points[i].clone().sub(points[i-1]);minimumUp=Math.min(minimumUp,Math.hypot(d.x,d.z)/d.length());}
 // Lay the bricks along the incline. Increase course spacing on steep flights
 // so adjacent courses cannot overlap and close the jaali perforations.
 const rows=Math.max(6,Math.floor(10*minimumUp)),pitch=.89/rows,top=plinth+.89;
 const point=d=>{
  d=THREE.MathUtils.clamp(d,0,length);let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;
  return points[i-1].clone().lerp(points[i],(d-lengths[i-1])/Math.max(.0001,lengths[i]-lengths[i-1]));
 };
 const records=[];
 for(let row=0;row<rows;row++)for(let d=.20+(row%2)*.195;d<length-.16;d+=.390){
  const p=point(d).add(V(0,plinth+.039+row*pitch,0)),dir=point(d+.03).sub(point(d-.03));
  const along=dir.normalize(),across=V(-along.z,0,along.x).normalize(),up=across.clone().cross(along).normalize();
  records.push({p,q:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(along,up,across))});
 }
 const screen=new THREE.InstancedMesh(unitBrick,M.stairBrick,records.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color();
 screen.name='Perforated stair brick jaali';screen.castShadow=true;screen.receiveShadow=true;
 records.forEach((r,i)=>{matrix.compose(r.p,r.q,V(.274,.078,.240));screen.setMatrixAt(i,matrix);color.setHSL(.038+(i%5)*.002,.24+(i%3)*.025,.74+(i%9)*.017);screen.setColorAt(i,color);});
 screen.instanceMatrix.needsUpdate=true;screen.instanceColor.needsUpdate=true;screen.computeBoundingSphere();root.add(screen);
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],dir=b.clone().sub(a),mid=a.clone().lerp(b,.5),across=V(-dir.z,0,dir.x).normalize(),along=dir.clone().normalize(),up=across.clone().cross(along).normalize();
  q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(along,up,across));
  for(const [rise,height,width,material] of [[plinth/2,plinth,.29,M.stairMortar],[top+.035,.07,.32,M.stone]]){
   const beam=box(dir.length()+.02,height,width,material,root,mid.x,mid.y+rise,mid.z);beam.quaternion.copy(q);
  }
  navigationBlocks?.push({a:[a.x,a.z],b:[b.x,b.z],radius:.16,bottom:Math.min(a.y,b.y)-.08,top:Math.max(a.y,b.y)+top+.10,kind:'stair-jaali'});
 }
 for(const end of [...(startPost?[0]:[]),...(endPost?[length]:[])]){
  const p=point(end),dir=point(Math.min(length,end+.03)).sub(point(Math.max(0,end-.03))),angle=Math.atan2(-dir.z,dir.x);
  box(.30,top+.035,.30,M.stairBrick,root,p.x,p.y+(top+.035)/2,p.z,angle);
  box(.34,.075,.34,M.stone,root,p.x,p.y+top+.05,p.z,angle);
 }
 root.userData.stairJaali={height:top+.09,thickness:.24,brickCount:records.length,openBond:true,points:points.map(p=>p.toArray())};
 return root;
}
