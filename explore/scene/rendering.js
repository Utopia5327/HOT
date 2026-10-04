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
  // Courses are laid out in path space — metres across the ribbon by metres
  // travelled along it — so the bond turns with the path and stays square on a
  // grade. Keyed to world X/Z it ignored path direction and sheared at every bend.
  M.gardenPath.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vPavingUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPavingUV=uv*2.0;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vPavingUV;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float course=floor(vPavingUV.y/.49);
vec2 tileUV=vec2((vPavingUV.x+mod(course,2.0)*.345)/.69,vPavingUV.y/.49);
vec2 tileID=floor(tileUV),within=fract(tileUV);
float joint=min(min(within.x,1.0-within.x)*.69,min(within.y,1.0-within.y)*.49);
float stone=smoothstep(.004,.013,joint);
float variation=.93+.12*fract(sin(dot(tileID,vec2(12.9898,78.233)))*43758.5453);
diffuseColor.rgb*=mix(.74,variation,stone);`);
  };M.gardenPath.customProgramCacheKey=()=> 'warm-stone-courses-2';M.gardenPath.needsUpdate=true;
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
 // `dusk` is an amount from 0 (afternoon) to 1 (dusk); the old boolean callers
 // still read correctly. Fractions let the film hold the scene mid-evening
 // instead of cutting between two fixed states.
 const dayTint=new THREE.Color(),duskTint=new THREE.Color();
 const blend=(day,night,t)=>dayTint.set(day).lerp(duskTint.set(night),t).clone();
 function setAtmosphere(dusk){
  const t=THREE.MathUtils.clamp(Number(dusk)||0,0,1);
  M.soffit.emissiveIntensity=THREE.MathUtils.lerp(.60,.70,t);
  night=t>.5;
  scene.background=panorama||blend('#b9c6cc','#536977',t);
  scene.backgroundIntensity=THREE.MathUtils.lerp(.90,.28,t);scene.backgroundBlurriness=0;
  scene.environmentIntensity=THREE.MathUtils.lerp(.82,.38,t);
  scene.fog.color.copy(blend('#b0c1c8','#536977',t));
  scene.fog.density=THREE.MathUtils.lerp(.0022,.005,t);
  water.material.uniforms.sunColor.value.copy(blend('#ffedc9','#edc391',t));
  water.material.uniforms.waterColor.value.copy(blend('#779e9e','#35535b',t));
  water.material.uniforms.sunDirection.value.set(-55,THREE.MathUtils.lerp(38,16,t),56).normalize();lastReflection=-Infinity;
 }
 const details=[];campus.root.traverse(o=>{if(o.userData.detailDistance)details.push(o);});
 function update(delta,camera){water.material.uniforms.time.value+=delta*.32;if(camera)for(const o of details){const p=o.userData.lodCenter,d=Math.hypot(camera.position.x-p[0],camera.position.y-p[1],camera.position.z-p[2]);o.visible=d<o.userData.detailDistance;}}
 return {ready,setAtmosphere,update,water};
}
