import * as THREE from 'three';
import {frameAt,groundHeight} from './campus.js';
import {TERRACE_SPECS} from './navigation-config.js';
import {BALCONY_SPECS} from './balcony-layout.js';

// Horizontal elevations look from inside the uphill terrain. Give model views
// a local site cut with a solid soil edge, rather than looking through a one-sided
// landscape sheet. Walking and perspective views keep the complete hillside.
export function createElevationSite(campus){
 const root=new THREE.Group();root.name='Elevation site — finished grade and solid earth';root.visible=false;
 const segments=240,rings=32,base=-18,outline=[],terrain=[],context=[],paper=new THREE.Color('#f6f5f1');
 let arrival;
 campus.root.traverse(o=>{if(o.userData.arrivalAxis)arrival=o.userData.arrivalAxis;if(o.isMesh&&o.material===campus.materials.terrain)terrain.push(o);});
 const end=frameAt(0),start=arrival?new THREE.Vector3(...arrival.start):end.p.clone().addScaledVector(end.n,-25);
 const extension=Math.max(0,start.clone().sub(end.p).dot(end.n.clone().negate())-end.w*.455+3);
 for(let i=0;i<segments;i++){
  const t=i/segments,f=frameAt(t),distance=s=>Math.min(Math.abs(t-s),1-Math.abs(t-s));
  const stairMargin=Math.max(0,...TERRACE_SPECS.map(s=>5.7*Math.exp(-Math.pow(distance(s.t)/.037,4))));
  const balconyMargin=Math.max(0,...BALCONY_SPECS.map(s=>3.2*Math.exp(-Math.pow(distance(s.t)/(s.half*1.1),4))));
  const p=f.p.addScaledVector(f.n,-(f.w*.455+.65+Math.max(stairMargin,balconyMargin)));
  const nearEntry=Math.min(t,1-t);p.addScaledVector(end.n,-extension*Math.exp(-Math.pow(nearEntry/.038,4)));
  // Section the peripheral uphill context at the finished platform datum. This
  // reveals the elevation without bringing distant hills in front of the roof.
  p.y=Math.min(groundHeight(p.x,p.z),f.p.y-.32);
  outline.push(p);
 }
 const inside=(x,z)=>{let inSite=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],b=outline[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inSite=!inSite;}return inSite;};
 // The distant forest belongs to the full hillside, outside this local site cut.
 for(const o of campus.landscape.children)if(o.isInstancedMesh)context.push(o);
 campus.root.traverse(o=>{if(o.userData.tree){const p=o.userData.tree.base;if(!inside(p[0],p[2]))context.push(o);}});
 const positions=[],uv=[],colors=[],indices=[];
 for(let j=0;j<=rings;j++)for(let i=0;i<segments;i++){
  const r=j/rings,x=outline[i].x*r,z=outline[i].z*r;
  const cover=.62*(1-THREE.MathUtils.smoothstep(Math.hypot(x/18.8,(z-.4)/18),.89,.99));
  const natural=groundHeight(x,z)-cover,height=THREE.MathUtils.lerp(natural,Math.min(natural,outline[i].y),THREE.MathUtils.smoothstep(r,.82,1));
  positions.push(x,height,z);uv.push(x*.5,z*.5);colors.push(.97,.97,.97);
  if(j<rings){const a=j*segments+i,b=j*segments+(i+1)%segments,c=a+segments,d=b+segments;if(j>0)indices.push(a,b,c);indices.push(b,d,c);}
 }
 const top=new THREE.BufferGeometry();top.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));top.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));top.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));top.setIndex(indices);top.computeVertexNormals();
 // Keep the same textured grass material and UV scale as the full terrain.
 const surface=new THREE.Mesh(top,campus.materials.terrain);surface.name='Elevation finished terrain';surface.receiveShadow=true;root.add(surface);
 const sides=[],sideColors=[],sideIndices=[],earthTop=new THREE.Color('#a4ab91');
 for(let i=0;i<=segments;i++){
  const p=outline[i%segments],y=p.y;
  sides.push(p.x,y,p.z,p.x,y-7,p.z,p.x,base,p.z);sideColors.push(...earthTop.toArray(),...paper.toArray(),...paper.toArray());
  if(i<segments)for(let j=0;j<2;j++){const a=i*3+j;sideIndices.push(a,a+3,a+1,a+1,a+3,a+4);}
 }
 const sideGeometry=new THREE.BufferGeometry();sideGeometry.setAttribute('position',new THREE.Float32BufferAttribute(sides,3));sideGeometry.setAttribute('color',new THREE.Float32BufferAttribute(sideColors,3));sideGeometry.setIndex(sideIndices);sideGeometry.computeVertexNormals();
 const soil=new THREE.MeshBasicMaterial({color:'#ffffff',vertexColors:true,side:THREE.DoubleSide,toneMapped:false,fog:false});
 const edge=new THREE.Mesh(sideGeometry,soil);edge.name='Continuous soil profile';edge.receiveShadow=true;root.add(edge);
 const bottomGeometry=new THREE.ShapeGeometry(new THREE.Shape(outline.map(p=>new THREE.Vector2(p.x,p.z))));bottomGeometry.rotateX(Math.PI/2);
 const bottom=new THREE.Mesh(bottomGeometry,new THREE.MeshBasicMaterial({color:paper,side:THREE.DoubleSide,toneMapped:false,fog:false}));bottom.position.y=base;root.add(bottom);
 root.userData.elevationSite={base,outline:outline.map(p=>p.toArray()),contextTreesHidden:context.length};
 campus.root.add(root);
 const previous=new Map();
 return {root,background:paper,setVisible(visible){
  if(root.visible===visible)return;
  root.visible=visible;
  for(const o of [...terrain,...context]){if(visible){previous.set(o,o.visible);o.visible=false;}else{o.visible=previous.get(o)??true;}}
  if(!visible)previous.clear();
 },dispose(){this.setVisible(false);root.removeFromParent();top.dispose();sideGeometry.dispose();bottomGeometry.dispose();soil.dispose();bottom.material.dispose();}};
}
