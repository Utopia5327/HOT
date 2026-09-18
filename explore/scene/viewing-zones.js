import * as THREE from 'three';
import {EYE_HEIGHT} from './navigation-config.js';
import {VIEWING_RADIUS,viewingState} from './viewing-policy.js';
import {createMarkerSigns} from './marker-signs.js';

export function createViewingZones({campus,groundHeight}){
  const films=new Set(campus.videoScreens.map(s=>s.projectId));
  const zones=campus.spots.map((spot,index)=>({id:spot.id,index,hasFilm:films.has(spot.id),eye:spot.eye.clone(),target:spot.target.clone(),radius:VIEWING_RADIUS}));
  const root=new THREE.Group();root.name='Exhibit viewing areas';campus.root.add(root);
  const positions=[],local=[],indices=[],ids=[],walls=[],wallUV=[],wallIds=[],wallIndices=[],floorMeshes=campus.walkSurfaces.map(s=>s.mesh);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),point=new THREE.Vector3(),look=new THREE.Vector3();
  function elevation(x,z,eye){
    ray.set(new THREE.Vector3(x,eye.y+.08,z),down);
    const hit=ray.intersectObjects(floorMeshes,false).find(h=>h.point.y<eye.y-.25);
    return Math.max(groundHeight(x,z),hit?.point.y??-Infinity)+.028;
  }
  for(const zone of zones){
    const forward=zone.target.clone().sub(zone.eye).setY(0).normalize(),across=new THREE.Vector3(forward.z,0,-forward.x),extent=zone.radius*1.18;
    const heights=[];
    for(let j=0;j<3;j++)for(let i=0;i<3;i++){
      point.copy(zone.eye).addScaledVector(across,(i-1)*extent).addScaledVector(forward,(j-1)*extent);
      heights.push(elevation(point.x,point.z,zone.eye));
    }
    function sample(x,z){
      const u=THREE.MathUtils.clamp(x/extent+1,0,2),v=THREE.MathUtils.clamp(z/extent+1,0,2),i=Math.min(1,Math.floor(u)),j=Math.min(1,Math.floor(v)),a=u-i,b=v-j;
      return THREE.MathUtils.lerp(THREE.MathUtils.lerp(heights[j*3+i],heights[j*3+i+1],a),THREE.MathUtils.lerp(heights[(j+1)*3+i],heights[(j+1)*3+i+1],a),b);
    }
    const base=positions.length/3,rings=[0,.72,.95,1.03,1.18],segments=64;
    for(const r of rings)for(let i=0;i<=segments;i++){
      const angle=i/segments*Math.PI*2,x=Math.cos(angle)*r*zone.radius,z=Math.sin(angle)*r*zone.radius;
      point.copy(zone.eye).addScaledVector(across,x).addScaledVector(forward,z).setY(sample(x,z));
      positions.push(point.x,point.y,point.z);local.push(x/zone.radius,z/zone.radius);ids.push(zone.index);
    }
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
      const a=base+j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);
    }
    const wallBase=walls.length/3;
    for(let i=0;i<=48;i++)for(const height of [0,1]){
      const angle=i/48*Math.PI*2,r=zone.radius*(1-height*.045),x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      point.copy(zone.eye).addScaledVector(across,x).addScaledVector(forward,z).setY(sample(x,z)+height*.66);
      walls.push(point.x,point.y,point.z);wallUV.push(i/48,height);wallIds.push(zone.index);
      if(i<48&&height===0){const a=wallBase+i*2;wallIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    zone.floorY=heights[4];
    zone.height=zone.eye.y-EYE_HEIGHT;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('zoneLocal',new THREE.Float32BufferAttribute(local,2));geometry.setAttribute('zoneIndex',new THREE.Float32BufferAttribute(ids,1));geometry.setIndex(indices);geometry.computeBoundingSphere();
  const uniforms={time:{value:0},insideIndex:{value:-1},activeIndex:{value:-1},glowColor:{value:new THREE.Color('#ffcf3b')}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,
    vertexShader:`attribute vec2 zoneLocal;attribute float zoneIndex;varying vec2 vLocal;varying float vIndex;varying vec3 vWorld;void main(){vLocal=zoneLocal;vIndex=zoneIndex;vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}`,
    fragmentShader:`uniform float time;uniform float insideIndex;uniform float activeIndex;uniform vec3 glowColor;varying vec2 vLocal;varying float vIndex;varying vec3 vWorld;
float lineDistance(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.0,1.0));}
void main(){float r=length(vLocal);float proximity=1.0-smoothstep(17.0,28.0,distance(cameraPosition.xz,vWorld.xz));float sameLevel=1.0-smoothstep(2.7,5.0,abs(cameraPosition.y-vWorld.y));float inside=1.0-step(.4,abs(vIndex-insideIndex));float focused=1.0-step(.4,abs(vIndex-activeIndex));float pulse=.94+.06*sin(time*2.2+vIndex);float ring=1.0-smoothstep(.027,.068,abs(r-1.0));float innerRing=(1.0-smoothstep(.009,.025,abs(r-.87)))*.30;float halo=exp(-19.0*abs(r-1.0));float wash=(1.0-smoothstep(.78,1.04,r))*.20;float arrow=1.0-smoothstep(.020,.040,min(lineDistance(vLocal,vec2(-.18,.04),vec2(0,.25)),lineDistance(vLocal,vec2(0,.25),vec2(.18,.04))));float alpha=(ring*.91+innerRing+halo*.25+wash+arrow*.74)*pulse*proximity*sameLevel;if(alpha<.006)discard;gl_FragColor=vec4(mix(glowColor,vec3(1.0,.96,.78),focused*.55),min(.97,alpha));
#include <colorspace_fragment>
}`});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Bright gold viewing pads';mesh.renderOrder=2;mesh.frustumCulled=false;root.add(mesh);
  const wallGeometry=new THREE.BufferGeometry();wallGeometry.setAttribute('position',new THREE.Float32BufferAttribute(walls,3));wallGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(wallUV,2));wallGeometry.setAttribute('zoneIndex',new THREE.Float32BufferAttribute(wallIds,1));wallGeometry.setIndex(wallIndices);wallGeometry.computeBoundingSphere();
  const wallMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
    vertexShader:`attribute float zoneIndex;varying vec2 vUv;varying float vIndex;varying vec3 vWorld;void main(){vUv=uv;vIndex=zoneIndex;vWorld=(modelMatrix*vec4(position,1)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1);}`,
    fragmentShader:`uniform vec3 glowColor;uniform float time;uniform float insideIndex;varying vec2 vUv;varying float vIndex;varying vec3 vWorld;
void main(){float d=distance(cameraPosition.xz,vWorld.xz);float range=1.0-smoothstep(17.0,28.0,d);float level=1.0-smoothstep(2.7,4.7,abs(cameraPosition.y-vWorld.y));float inside=1.0-step(.4,abs(vIndex-insideIndex));float taper=pow(1.0-vUv.y,1.7);float pulse=.94+.06*sin(time*2.2+vIndex);float alpha=taper*(.28-inside*.15)*range*level*pulse;if(alpha<.005)discard;gl_FragColor=vec4(glowColor,alpha);
#include <colorspace_fragment>
}`});
  const wallMesh=new THREE.Mesh(wallGeometry,wallMaterial);wallMesh.name='Low translucent gold beacons';wallMesh.renderOrder=3;root.add(wallMesh);
  const signs=createMarkerSigns({root,zones,uniforms});
  function update(camera,delta,{visible=true}={}){
    root.visible=visible;if(!visible)return;uniforms.time.value+=delta;
    camera.getWorldDirection(look);let inside=null;const states=[];
    for(const zone of zones){const state=viewingState(zone,camera.position,look);states.push({zone,state});if(state.inside&&(!inside||state.distance<inside.state.distance))inside={zone,state};}
    uniforms.insideIndex.value=inside?.zone.index??-1;uniforms.activeIndex.value=inside?.state.facing?inside.zone.index:-1;
    signs.update(camera,states);
  }
  return {zones,root,signs,update};
}
