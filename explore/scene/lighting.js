import * as THREE from 'three';

// The key light rig and the day/dusk grade, shared by the live gallery and the
// offline film recorder. Both read from one table, so a change to the afternoon
// or the dusk look follows into the film without being transcribed twice.
//
// Every entry is [day, dusk]. `applyDaylight` interpolates between them, so the
// recorder can hold the scene part-way through the evening; the gallery only
// ever asks for 0 or 1.
const GRADE={
 skyIntensity:[.65,.38],
 skyColor:['#e2eadd','#afc7e5'],
 ambientIntensity:[.08,.065],
 sunIntensity:[1.85,.68],
 sunColor:['#ffead1','#f4bb83'],
 sunElevation:[38,16],
 exposure:[.90,1.03],
 emissive:[.85,3.4],
 glassOpacity:[.20,.12]
};
const mix=(pair,t)=>THREE.MathUtils.lerp(pair[0],pair[1],t);

export function createSceneLighting({scene,renderer,mobile=false}){
 const sky=new THREE.HemisphereLight('#ecf3ed','#7d8c65',2.4);
 const ambient=new THREE.AmbientLight('#eff0df',.29);
 const sun=new THREE.DirectionalLight('#fff0d0',3.2);
 sun.position.set(-55,76,56);sun.target.position.set(0,9,0);sun.castShadow=true;
 const shadowSize=mobile?2048:Math.min(4096,renderer.capabilities.maxTextureSize);
 sun.shadow.mapSize.set(shadowSize,shadowSize);
 Object.assign(sun.shadow.camera,{left:-68,right:68,top:57,bottom:-57,near:1,far:200});
 sun.shadow.normalBias=.035;sun.shadow.bias=-.000045;sun.shadow.radius=3;
 const fill=new THREE.DirectionalLight('#d4e8ea',.22);fill.position.set(45,32,-48);
 scene.add(sky,ambient,sun,sun.target,fill);

 const dayColor=new THREE.Color(),duskColor=new THREE.Color();
 // amount: 0 is full afternoon, 1 is full dusk. Fractions are legitimate — the
 // film crossfades through them rather than cutting.
 function applyDaylight(amount,{campus,realism}={}){
  const t=THREE.MathUtils.clamp(Number(amount)||0,0,1);
  sky.intensity=mix(GRADE.skyIntensity,t);
  sky.color.copy(dayColor.set(GRADE.skyColor[0]).lerp(duskColor.set(GRADE.skyColor[1]),t));
  ambient.intensity=mix(GRADE.ambientIntensity,t);
  sun.intensity=mix(GRADE.sunIntensity,t);
  sun.color.copy(dayColor.set(GRADE.sunColor[0]).lerp(duskColor.set(GRADE.sunColor[1]),t));
  sun.position.set(-55,mix(GRADE.sunElevation,t),56);
  renderer.toneMappingExposure=mix(GRADE.exposure,t);
  if(campus){
   campus.materials.light.emissiveIntensity=mix(GRADE.emissive,t);
   campus.materials.glass.opacity=mix(GRADE.glassOpacity,t);
   for(const lamp of campus.lamps)lamp.intensity=THREE.MathUtils.lerp(lamp.userData.dayIntensity??24,lamp.userData.duskIntensity??75,t);
  }
  realism?.setAtmosphere(t);
  renderer.shadowMap.needsUpdate=true;
 }
 return {sky,ambient,sun,fill,applyDaylight};
}
