import * as THREE from 'three';

// Two labels share a small atlas drawn with the site's existing font. No image
// downloads, bloom pass, point lights, or individual text meshes are required.
export function createMarkerLabelTexture(){
  if(typeof document==='undefined')return new THREE.Texture();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  const ctx=canvas.getContext('2d');
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    for(let row=0;row<2;row++){
      const y=row*256;
      ctx.font='500 82px "Fira Mono", monospace';ctx.strokeStyle='#142018';ctx.lineWidth=13;
      ctx.strokeText('STAND HERE',512,y+96);ctx.fillStyle='#fff7d5';ctx.fillText('STAND HERE',512,y+96);
      ctx.font='500 35px "Fira Mono", monospace';ctx.lineWidth=9;
      const subtitle=row===0?'FACE THE SCREEN TO WATCH':'EXPLORE THIS PROJECT';
      ctx.strokeText(subtitle,512,y+177);ctx.fillStyle='#ffcf48';ctx.fillText(subtitle,512,y+177);
    }
    texture.needsUpdate=true;
  }
  draw();document.fonts?.load('500 82px "Fira Mono"').then(draw).catch(()=>{});
  return texture;
}

export function createMarkerSigns({root,zones,uniforms,labelTexture=createMarkerLabelTexture()}){
  const count=zones.length,ids=new Float32Array(zones.map(z=>z.index)),film=new Float32Array(zones.map(z=>z.hasFilm?1:0));
  const shape=new THREE.Shape();shape.moveTo(-.16,.50);shape.lineTo(.16,.50);shape.lineTo(.16,.04);shape.lineTo(.42,.04);shape.lineTo(0,-.48);shape.lineTo(-.42,.04);shape.lineTo(-.16,.04);shape.closePath();
  const arrowGeometry=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.022,bevelThickness:.018});arrowGeometry.translate(0,0,-.08);
  arrowGeometry.setAttribute('markerIndex',new THREE.InstancedBufferAttribute(ids,1));
  const arrowMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,toneMapped:false,
    vertexShader:`attribute float markerIndex;varying float vIndex;varying vec3 vCenter;varying vec3 vNormal;
void main(){vIndex=markerIndex;vCenter=(modelMatrix*instanceMatrix*vec4(0,0,0,1)).xyz;vNormal=normalize(normal);gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1);}`,
    fragmentShader:`uniform vec3 glowColor;uniform float time;varying float vIndex;varying vec3 vCenter;varying vec3 vNormal;
void main(){float d=distance(cameraPosition.xz,vCenter.xz);float arrival=smoothstep(1.10,2.35,d);float range=1.0-smoothstep(17.0,30.0,d);float level=1.0-smoothstep(1.9,3.0,abs(cameraPosition.y-vCenter.y-.66));float alpha=arrival*range*level;if(alpha<.01)discard;float facet=.69+.31*abs(vNormal.z);gl_FragColor=vec4(glowColor*facet,alpha);
#include <colorspace_fragment>
}`});
  const arrows=new THREE.InstancedMesh(arrowGeometry,arrowMaterial,count);arrows.name='Floating gold destination arrows';arrows.frustumCulled=false;arrows.renderOrder=4;arrows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(arrows);
  const labelGeometry=new THREE.PlaneGeometry(1,.25);labelGeometry.setAttribute('hasFilm',new THREE.InstancedBufferAttribute(film,1));
  const labelMaterial=new THREE.ShaderMaterial({uniforms:{...uniforms,labelMap:{value:labelTexture}},transparent:true,depthWrite:false,toneMapped:false,
    vertexShader:`attribute float hasFilm;varying vec2 vUv;varying vec3 vCenter;
void main(){vUv=vec2(uv.x,(uv.y+hasFilm)*.5);vCenter=(modelMatrix*instanceMatrix*vec4(0,0,0,1)).xyz;gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1);}`,
    fragmentShader:`uniform sampler2D labelMap;varying vec2 vUv;varying vec3 vCenter;
void main(){float d=distance(cameraPosition.xz,vCenter.xz);float fade=smoothstep(1.12,2.35,d)*(1.0-smoothstep(12.0,20.0,d));vec4 textColor=texture2D(labelMap,vUv);textColor.a*=fade;if(textColor.a<.012)discard;gl_FragColor=textColor;
#include <colorspace_fragment>
}`});
  const labels=new THREE.InstancedMesh(labelGeometry,labelMaterial,count);labels.name='Floating stand-here instructions';labels.frustumCulled=false;labels.renderOrder=5;labels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(labels);
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),toZone=new THREE.Vector3();
  function update(camera,states){
    camera.getWorldDirection(direction);
    // At most three labels can be visible, all on the visitor's current level.
    const candidates=states.filter(s=>s.state.level&&s.state.distance>1.1&&s.state.distance<20&&toZone.copy(s.zone.eye).sub(camera.position).setY(0).normalize().dot(direction)>.20).sort((a,b)=>a.state.distance-b.state.distance).slice(0,3);
    const visibleLabels=new Set(candidates.map(s=>s.zone.index));
    for(const zone of zones){
      const bob=Math.sin(uniforms.time.value*1.9+zone.index*.65)*.075;
      position.set(zone.eye.x,zone.floorY+1.24+bob,zone.eye.z);
      const yaw=Math.atan2(camera.position.x-zone.eye.x,camera.position.z-zone.eye.z)+Math.sin(uniforms.time.value*.9+zone.index)*.12;
      rotation.setFromAxisAngle(up,yaw);scale.setScalar(1);matrix.compose(position,rotation,scale);arrows.setMatrixAt(zone.index,matrix);
      position.y=zone.floorY+2.12+bob*.4;scale.setScalar(visibleLabels.has(zone.index)?2.8:0);matrix.compose(position,camera.quaternion,scale);labels.setMatrixAt(zone.index,matrix);
    }
    arrows.instanceMatrix.needsUpdate=true;labels.instanceMatrix.needsUpdate=true;
  }
  return {arrows,labels,update};
}
