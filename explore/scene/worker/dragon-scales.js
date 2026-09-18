import * as THREE from '../assets/three.module.js';

// A thin, convex fired-clay shield with rounded shoulders and a tapered tip.
// One shared mesh is instanced across the entire southwest facade.
export function dragonScaleGeometry(){
  const rows=10,columns=8,positions=[],uv=[],indices=[],stride=columns+1,face=(rows+1)*stride;
  for(const back of [false,true])for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const v=j/rows,u=i/columns*2-1;
    const shoulder=.84+.16*Math.sin(Math.min(1,v/.18)*Math.PI*.5);
    const taper=v<.57?1:Math.max(.025,Math.cos((v-.57)/.43*Math.PI*.5));
    const x=u*.5*shoulder*taper,y=.5-v;
    const z=.16*(1-u*u)*Math.sin(v*Math.PI)+.12*v-(back?.055:0);
    positions.push(x,y,z);uv.push(i/columns,v);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const a=j*stride+i,b=a+stride;
    indices.push(a,b,a+1,a+1,b,b+1,face+a,face+a+1,face+b,face+a+1,face+b+1,face+b);
  }
  const edge=[];for(let i=0;i<=columns;i++)edge.push(i);for(let j=1;j<=rows;j++)edge.push(j*stride+columns);for(let i=columns-1;i>=0;i--)edge.push(rows*stride+i);for(let j=rows-1;j>0;j--)edge.push(j*stride);
  for(let k=0;k<edge.length;k++){const a=edge[k],b=edge[(k+1)%edge.length];indices.push(a,face+a,b,b,face+a,face+b);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}
