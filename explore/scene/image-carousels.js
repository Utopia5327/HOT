import * as THREE from 'three';

export const SLIDE_SECONDS=5.5;
export function imageFit(imageAspect,screenAspect){return imageAspect>screenAspect?[1,screenAspect/imageAspect]:[imageAspect/screenAspect,1];}

// Existing project images rotate on the same screen. Load only the next image
// near a visitor and release the previous texture after its crossfade finishes.
export function createImageCarousels({artworks,reducedMotion=false,loadTexture}){
  const loader=new THREE.TextureLoader();
  loadTexture??=src=>loader.loadAsync(src);
  const entries=artworks.filter(b=>b.userData.imageCarousel).map(board=>({board,base:board.material,...board.userData.imageCarousel,index:0,elapsed:0,fade:0,current:null,next:null,loading:false,failed:new Set(),position:board.getWorldPosition(new THREE.Vector3()),normal:new THREE.Vector3(0,0,1).applyQuaternion(board.getWorldQuaternion(new THREE.Quaternion()))}));
  const projected=new THREE.Vector3(),toward=new THREE.Vector3();
  function start(e){
    if(!e.base.map?.image)return false;
    e.current=e.base.map;
    const fit=new THREE.Vector2(...imageFit(e.images[0].width/e.images[0].height,e.width/e.height));
    e.uniforms={currentImage:{value:e.current},nextImage:{value:e.current},currentFit:{value:fit},nextFit:{value:fit.clone()},blend:{value:0}};
    e.material=new THREE.ShaderMaterial({name:'Gallery image carousel',uniforms:e.uniforms,toneMapped:false,
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform sampler2D currentImage;uniform sampler2D nextImage;uniform vec2 currentFit;uniform vec2 nextFit;uniform float blend;varying vec2 vUv;
vec4 fittedImage(sampler2D source,vec2 fit){vec2 uv=(vUv-.5)/fit+.5;if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0)return vec4(.012,.017,.014,1.0);return texture2D(source,uv);}
void main(){gl_FragColor=mix(fittedImage(currentImage,currentFit),fittedImage(nextImage,nextFit),blend);gl_FragColor.a=1.0;
#include <colorspace_fragment>
}`});
    e.board.material=e.material;return true;
  }
  function prepare(e){
    if(e.loading||e.next)return;
    let next=(e.index+1)%e.images.length;
    while(e.failed.has(next)&&next!==e.index)next=(next+1)%e.images.length;
    if(next===e.index)return;
    e.loading=true;
    Promise.resolve().then(()=>loadTexture(e.images[next].src)).then(texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
      e.next={index:next,texture};e.loading=false;
      e.uniforms.nextImage.value=texture;e.uniforms.nextFit.value.set(...imageFit(e.images[next].width/e.images[next].height,e.width/e.height));
    }).catch(()=>{e.loading=false;e.failed.add(next);});
  }
  function update(camera,delta,{allowed=true}={}){
    if(!allowed)return;
    for(const e of entries){
      if(camera.position.distanceToSquared(e.position)>28*28||e.normal.dot(toward.copy(camera.position).sub(e.position))<=0)continue;
      projected.copy(e.position).project(camera);if(projected.z< -1||projected.z>1||Math.abs(projected.x)>1.3||Math.abs(projected.y)>1.3)continue;
      if(!e.current&&!start(e))continue;
      e.elapsed+=delta;if(e.elapsed>SLIDE_SECONDS-2)prepare(e);
      if(e.elapsed<SLIDE_SECONDS||!e.next)continue;
      e.fade=reducedMotion?1:Math.min(1,e.fade+delta/.8);e.uniforms.blend.value=e.fade*e.fade*(3-2*e.fade);
      if(e.fade<1)continue;
      const previous=e.current;e.current=e.next.texture;e.index=e.next.index;e.next=null;e.elapsed=0;e.fade=0;
      e.uniforms.currentImage.value=e.current;e.uniforms.nextImage.value=e.current;e.uniforms.currentFit.value.copy(e.uniforms.nextFit.value);e.uniforms.blend.value=0;
      if(e.base.map===previous){e.base.map=null;e.base.emissiveMap=null;}previous.dispose();
    }
  }
  return {entries,update};
}
