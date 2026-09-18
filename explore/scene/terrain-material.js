import * as THREE from 'three';

// One shared 1K colour texture provides both grass colour and restrained relief.
// World-aligned UVs keep the courtyard, hill and tree mounds at the same scale.
export function applyGrassTerrain({campus,texture}){
  texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;texture.needsUpdate=true;
  const materials=new Set([campus.materials.terrain,campus.materials.lawn,campus.materials.grass]);
  campus.root.updateMatrixWorld(true);
  const point=new THREE.Vector3();
  campus.root.traverse(o=>{
    if(!o.isMesh||!materials.has(o.material))return;
    const p=o.geometry.attributes.position,uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){
      point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
      uv[i*2]=point.x*.5;uv[i*2+1]=point.z*.5;
    }
    o.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  });
  for(const material of materials){
    material.color.set('#c7cfb6');material.map=texture;material.bumpMap=texture;material.bumpScale=.018;
    material.normalMap=null;material.roughnessMap=null;material.roughness=1;material.metalness=0;material.envMapIntensity=.36;
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTerrainPosition;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrainPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vTerrainPosition;
float terrainHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float terrainNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(terrainHash(i),terrainHash(i+vec2(1,0)),f.x),mix(terrainHash(i+vec2(0,1)),terrainHash(i+vec2(1,1)),f.x),f.y);}`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float meadowPatch=.65*terrainNoise(vTerrainPosition.xz*.13)+.35*terrainNoise(vTerrainPosition.xz*.037+vec2(13.4,7.2));
diffuseColor.rgb*=mix(vec3(.70,.83,.62),vec3(1.06,1.04,.94),meadowPatch);`);
    };
    material.customProgramCacheKey=()=> 'continuous-meadow-1';material.needsUpdate=true;
  }
}
