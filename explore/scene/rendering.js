import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import {applyGrassTerrain} from './terrain-material.js';
import {createMountainPanorama} from './mountain-panorama.js';

export function enhanceRendering({scene,renderer,campus,mobile=false}){
 const loader=new THREE.TextureLoader(),anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()),M=campus.materials;
 const textureCache=new Map();
 function map(file,color=false){
  if(textureCache.has(file))return textureCache.get(file);
  const texture=loader.load('./assets/materials/'+file);textureCache.set(file,texture);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;if(color)texture.colorSpace=THREE.SRGBColorSpace;return texture;
 }
 function surface(material,prefix,{color='#ffffff',roughness=.72,normal=.25}={}){
  material.color.set(color);material.map=map(prefix+'_diff_1k.webp',true);material.normalMap=map(prefix+'_nor_gl_1k.webp');material.roughnessMap=map(prefix+'_rough_1k.webp');material.bumpMap=null;material.normalScale.set(normal,normal);material.roughness=roughness;material.needsUpdate=true;
 }
 // Request the terrain first so the new ground cover appears promptly.
 applyGrassTerrain({campus,texture:map('meadow-grass-1k.webp',true)});
 campus.root.traverse(o=>{if(o.name==='Broad forest-tree canopy')o.material.color.set('#b4c5a2');});
 surface(M.tile,'clay_roof_tiles_02',{color:'#dcb998',roughness:.96,normal:.20});
 surface(M.roofBacking,'clay_roof_tiles_02',{color:'#c5a282',roughness:.92,normal:.50});
 surface(M.shell,'rough_concrete',{color:'#fffdf1',roughness:.79,normal:.14});
 surface(M.concrete,'rough_concrete',{color:'#e6e4da',roughness:.87,normal:.33});
 surface(M.stone,'concrete_wall_009',{color:'#eee7da',roughness:.59,normal:.13});
 surface(M.floor,'concrete_wall_009',{color:'#eee7da',roughness:.57,normal:.13});
 surface(M.stairs,'rough_concrete',{color:'#bab5a6',roughness:.97,normal:.31});
 surface(M.stairEdge,'rough_concrete',{color:'#a5a18f',roughness:.98,normal:.28});
 surface(M.foundation,'rough_concrete',{color:'#8b826f',roughness:1,normal:.75});
 if(M.boulder)surface(M.boulder,'rough_concrete',{color:'#b4afa3',roughness:1,normal:.65});
 if(M.gardenPath)surface(M.gardenPath,'rough_concrete',{color:'#e1d8c4',roughness:1,normal:.20});
 if(M.gardenPath){
  M.gardenPath.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPavingPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPavingPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPavingPosition;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float course=floor(vPavingPosition.z/.49);
vec2 tileUV=vec2((vPavingPosition.x+mod(course,2.0)*.345)/.69,vPavingPosition.z/.49);
vec2 tileID=floor(tileUV),within=fract(tileUV);
float joint=min(min(within.x,1.0-within.x)*.69,min(within.y,1.0-within.y)*.49);
float stone=smoothstep(.005,.015,joint);
float variation=.93+.12*fract(sin(dot(tileID,vec2(12.9898,78.233)))*43758.5453);
diffuseColor.rgb*=mix(.72,variation,stone);`);
  };M.gardenPath.customProgramCacheKey=()=> 'warm-stone-courses-1';M.gardenPath.needsUpdate=true;
 }
 if(M.gardenPaving)surface(M.gardenPaving,'concrete_wall_009',{color:'#e0d6bd',roughness:.96,normal:.26});
 for(const name of ['gardenWall','gardenCoping','fireWall'])if(M[name])surface(M[name],'rough_concrete',{color:name==='gardenCoping'?'#e7dfce':'#d9d0bf',roughness:.97,normal:.30});
 M.terracotta.normalMap=map('rough_concrete_nor_gl_1k.webp');M.terracotta.normalScale.set(.18,.18);M.terracotta.bumpMap=null;M.terracotta.roughness=.94;M.terracotta.needsUpdate=true;
 for(const m of [M.wood,M.darkwood,M.soffit,M.deck]){
  m.map=map('fine_grained_wood_col_1k.webp',true);m.normalMap=map('fine_grained_wood_nor_gl_1k.webp');m.roughnessMap=map('fine_grained_wood_rough_1k.webp');m.normalScale.set(.20,.20);m.bumpMap=null;m.roughness=.63;m.color.set(m===M.darkwood?'#96826a':m===M.soffit?'#ecd4b2':m===M.deck?'#e2c49c':'#f9d8a3');m.needsUpdate=true;
 }
 // A subtle baked-style bounce term keeps every ceiling readable without
 // adding shadow-casting lights. Reuse the timber map so the grain is preserved.
 M.soffit.emissive.set('#e1cbae');M.soffit.emissiveMap=M.soffit.map;M.soffit.emissiveIntensity=.60;
 M.bronze.color.set('#766848');M.bronze.metalness=.75;M.bronze.roughness=.29;
 M.glass.envMapIntensity=1.65;M.glass.roughness=.115;M.glass.color.set('#e7eee7');
 // Angle-dependent reflection gives curved glazing depth without a second scene render.
 M.glass.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', 'float edgeReflection=pow(1.0-abs(dot(normal,normalize(vViewPosition))),4.0); diffuseColor.a=mix(0.08,0.64,edgeReflection);\n#include <opaque_fragment>');};M.glass.customProgramCacheKey=()=> 'architectural-fresnel-1';M.glass.needsUpdate=true;
 // A low-frequency analytical wave normal field keeps the courtyard water calm.
 const size=128,bytes=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*Math.PI*2,v=y/size*Math.PI*2,dx=.16*Math.cos(3*u+2*v)+.10*Math.cos(7*u-3*v),dy=.13*Math.cos(3*u+2*v)-.08*Math.cos(7*u-3*v),n=new THREE.Vector3(dx,dy,1).normalize(),i=(y*size+x)*4;
  bytes[i]=Math.round((n.x*.5+.5)*255);bytes[i+1]=Math.round((n.y*.5+.5)*255);bytes[i+2]=Math.round((n.z*.5+.5)*255);bytes[i+3]=255;
 }
 const normals=new THREE.DataTexture(bytes,size,size,THREE.RGBAFormat);normals.wrapS=normals.wrapT=THREE.RepeatWrapping;normals.magFilter=THREE.LinearFilter;normals.minFilter=THREE.LinearFilter;normals.needsUpdate=true;
 const original=campus.waterSurface,water=new Water(original.geometry.clone(),{textureWidth:mobile?256:512,textureHeight:mobile?256:512,waterNormals:normals,sunDirection:new THREE.Vector3(-55,38,56).normalize(),sunColor:0xffeed0,waterColor:0x355f55,distortionScale:.8,alpha:.96,fog:true});
 water.position.copy(original.position);water.rotation.copy(original.rotation);water.scale.copy(original.scale);original.parent.add(water);original.removeFromParent();water.material.uniforms.size.value=3.2;
 const reflection=water.onBeforeRender;let lastReflection=-Infinity;
 water.onBeforeRender=function(...args){const now=performance.now();if(now-lastReflection<(mobile?120:65))return;lastReflection=now;reflection.apply(this,args);};
 let panorama=null,night=false;
 const ready=new THREE.TextureLoader().loadAsync('./assets/materials/mountain-panorama.webp').then(texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;
  texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.needsUpdate=true;
  const sky=createMountainPanorama(renderer,texture),old=scene.environment;panorama=sky.background;scene.environment=sky.environment;old?.dispose();scene.environmentRotation.set(0,-.8,0);scene.backgroundRotation.set(0,-.8,0);setAtmosphere(night);renderer.shadowMap.needsUpdate=true;
 }).catch(()=>{ /* The existing sky remains usable if the background cannot load. */ });
 function setAtmosphere(dusk){
  M.soffit.emissiveIntensity=dusk?.70:.60;
  night=dusk;scene.background=panorama||new THREE.Color(dusk?'#536977':'#b9c6cc');scene.backgroundIntensity=dusk?.28:.90;scene.backgroundBlurriness=0;scene.environmentIntensity=dusk?.38:.82;scene.fog.color.set(dusk?'#536977':'#b0c1c8');scene.fog.density=dusk?.005:.0022;
  water.material.uniforms.sunColor.value.set(dusk?'#edc391':'#ffedc9');water.material.uniforms.waterColor.value.set(dusk?'#35535b':'#779e9e');
  water.material.uniforms.sunDirection.value.set(-55,dusk?16:38,56).normalize();lastReflection=-Infinity;
 }
 const details=[];campus.root.traverse(o=>{if(o.userData.detailDistance)details.push(o);});
 function update(delta,camera){water.material.uniforms.time.value+=delta*.32;if(camera)for(const o of details){const p=o.userData.lodCenter,d=Math.hypot(camera.position.x-p[0],camera.position.y-p[1],camera.position.z-p[2]);o.visible=d<o.userData.detailDistance;}}
 return {ready,setAtmosphere,update,water};
}
