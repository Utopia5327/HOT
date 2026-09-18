import * as THREE from 'three';

// Convert the single photograph once, smoothing a narrow strip at the wrap.
// The finished cube is reused for the background and reflected environment;
// no mountains, sky sphere, or extra per-frame pass are added to the scene.
export function createMountainPanorama(renderer,texture){
  const target=new THREE.WebGLCubeRenderTarget(512,{type:texture.type,colorSpace:texture.colorSpace,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter,depthBuffer:false});
  const geometry=new THREE.BoxGeometry(5,5,5);
  const material=new THREE.ShaderMaterial({name:'Mountain panorama wrap',side:THREE.BackSide,blending:THREE.NoBlending,toneMapped:false,
    uniforms:{panoramaMap:{value:texture}},
    vertexShader:`varying vec3 vDirection;
void main(){vDirection=(modelMatrix*vec4(position,0.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D panoramaMap;varying vec3 vDirection;
#include <common>
void main(){
  vec2 uv=equirectUv(normalize(vDirection));
  vec4 color=texture2D(panoramaMap,uv);
  float edge=min(uv.x,1.0-uv.x);
  if(edge<.018){
    vec4 opposite=texture2D(panoramaMap,vec2(1.0-uv.x,uv.y));
    color=mix(color,opposite,.5*(1.0-smoothstep(0.0,.018,edge)));
  }
  gl_FragColor=color;
}`});
  const minFilter=texture.minFilter;texture.minFilter=THREE.LinearFilter;
  new THREE.CubeCamera(1,10,target).update(renderer,new THREE.Mesh(geometry,material));
  texture.minFilter=minFilter;geometry.dispose();material.dispose();texture.dispose();
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromCubemap(target.texture);pmrem.dispose();
  target.texture.name='360 mountain and forest panorama';
  return {background:target.texture,environment:environment.texture};
}
