import * as THREE from '../assets/three.module.js';

// A small shared botanical kit: curved leaves and grass blades, instanced in rosettes.
export function plantUnderstory({parent,points,seed=7604,grass=false}){
 let state=seed;const rnd=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 const positions=[],uv=[],indices=[],segments=9;
 for(let j=0;j<=segments;j++){
  const t=j/segments,w=Math.sin(t*Math.PI)*(grass?.018:.10)*(grass?1:.72+.28*Math.cos(t*Math.PI*12));
  for(const side of [-1,1]){positions.push(side*w,grass?t*.67:Math.sin(t*Math.PI*.80)*.38,t*t*(grass?.19:.64));uv.push((side+1)/2,t);}
  if(j<segments){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const perPlant=grass?5:11,material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.94,side:THREE.DoubleSide});
 const plants=new THREE.InstancedMesh(geometry,material,points.length*perPlant),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color();
 plants.name=grass?'Meadow grasses':'Fern and broad-leaf understory';plants.castShadow=!grass;plants.receiveShadow=true;
 points.forEach((p,i)=>{for(let j=0;j<perPlant;j++){
  const s=(p.s||1)*(.64+rnd()*.65),angle=j*2.399+rnd()*.35;
  q.setFromEuler(new THREE.Euler((rnd()-.5)*.24,angle,(rnd()-.5)*.18));matrix.compose(new THREE.Vector3(p.x,p.y+.025,p.z),q,new THREE.Vector3(s,s,s));plants.setMatrixAt(i*perPlant+j,matrix);
  color.setHSL(.20+rnd()*.09,.26+rnd()*.24,(grass?.24:.19)+rnd()*.15);plants.setColorAt(i*perPlant+j,color);
 }});
 plants.instanceMatrix.needsUpdate=true;plants.instanceColor.needsUpdate=true;parent.add(plants);return plants;
}
