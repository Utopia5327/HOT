import * as THREE from '../assets/three.module.js';

// Meter-scaled concrete grain, with darker risers and weathering along the edges.
// Projection follows each face so long, shallow treads do not stretch the texture.
export function weatherStairGeometry(geometry){
  geometry.computeBoundingBox();
  const bounds=geometry.boundingBox,p=geometry.attributes.position,n=geometry.attributes.normal;
  const uv=[],colors=[],tile=1.23,span=bounds.getSize(new THREE.Vector3());
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
    const horizontal=ny>nx&&ny>nz;
    const a=horizontal?x:nx>nz?z:x,b=horizontal?z:y;
    uv.push(a/tile,b/tile);
    const edge=horizontal?Math.min(x-bounds.min.x,bounds.max.x-x,z-bounds.min.z,bounds.max.z-z):Math.min(y-bounds.min.y,bounds.max.y-y);
    const mottling=.020*Math.sin(a*2.7+b*1.3)+.012*Math.cos(a*6.1-b*3.2);
    const exposed=horizontal&&n.getY(i)>0;
    const wear=exposed?.94:.79,stain=.065*Math.exp(-Math.max(0,edge)/Math.min(.16,Math.max(.04,span.y*.5)));
    const shade=THREE.MathUtils.clamp(wear-stain+mottling,.70,.98);
    colors.push(shade,shade,shade);
  }
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  return geometry;
}
