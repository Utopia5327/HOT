import * as THREE from '../assets/three.module.js';

// Transfer typed geometry buffers directly. Object3D JSON expands them into millions
// of ordinary numbers and then copies them again on the receiving thread.
export function encodeScene(root){
  const geometries=new Map(),materials=new Map(),meta={textures:{},images:{}};
  function geometry(g){
    if(geometries.has(g.uuid))return g.uuid;
    if(!g.boundingSphere)g.computeBoundingSphere();
    geometries.set(g.uuid,{id:g.uuid,attributes:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,{array:a.array,itemSize:a.itemSize,normalized:a.normalized}])),index:g.index?.array,groups:g.groups,bounds:{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius}});return g.uuid;
  }
  function material(m){if(!materials.has(m.uuid))materials.set(m.uuid,m.toJSON(meta));return m.uuid;}
  function node(o){
    if(o.matrixAutoUpdate)o.updateMatrix();
    const n={id:o.uuid,type:o.isInstancedMesh?'InstancedMesh':o.type,name:o.name,matrix:o.matrix.toArray(),visible:o.visible,castShadow:o.castShadow,receiveShadow:o.receiveShadow,renderOrder:o.renderOrder,frustumCulled:o.frustumCulled,userData:o.userData,children:o.children.map(node)};
    if(o.geometry)n.geometry=geometry(o.geometry);
    if(o.material)n.material=Array.isArray(o.material)?o.material.map(material):material(o.material);
    if(o.isInstancedMesh){n.count=o.count;n.instanceMatrix=o.instanceMatrix.array;n.instanceColor=o.instanceColor?.array;}
    if(o.isLight){n.color=o.color.toArray();n.intensity=o.intensity;n.distance=o.distance;n.decay=o.decay;}
    return n;
  }
  const object=node(root);
  return {object,geometries:[...geometries.values()],materials:[...materials.values()],textures:Object.values(meta.textures),images:Object.values(meta.images)};
}
export function sceneBuffers(model){
  const buffers=new Set();
  for(const g of model.geometries){for(const a of Object.values(g.attributes))buffers.add(a.array.buffer);if(g.index)buffers.add(g.index.buffer);}
  function visit(n){if(n.instanceMatrix)buffers.add(n.instanceMatrix.buffer);if(n.instanceColor)buffers.add(n.instanceColor.buffer);n.children.forEach(visit);}visit(model.object);
  for(const image of model.images)if(ArrayBuffer.isView(image.url?.data))buffers.add(image.url.data.buffer);
  return [...buffers];
}
export function decodeScene(model){
  const geometries=new Map(),materials=new Map(),loader=new THREE.ObjectLoader();
  const textures=loader.parseTextures(model.textures,loader.parseImages(model.images));
  const materialLoader=new THREE.MaterialLoader().setTextures(textures);
  for(const m of model.materials)materials.set(m.uuid,materialLoader.parse(m));
  for(const data of model.geometries){
    const g=new THREE.BufferGeometry();g.uuid=data.id;
    for(const [name,a] of Object.entries(data.attributes))g.setAttribute(name,new THREE.BufferAttribute(a.array,a.itemSize,a.normalized));
    if(data.index)g.setIndex(new THREE.BufferAttribute(data.index,1));g.groups=data.groups;
    g.boundingSphere=new THREE.Sphere(new THREE.Vector3(...data.bounds.center),data.bounds.radius);geometries.set(data.id,g);
  }
  function node(n){
    const g=geometries.get(n.geometry),m=Array.isArray(n.material)?n.material.map(id=>materials.get(id)):materials.get(n.material);
    let o;
    if(n.type==='InstancedMesh'||n.instanceMatrix){o=new THREE.InstancedMesh(g,m,n.count);o.instanceMatrix=new THREE.InstancedBufferAttribute(n.instanceMatrix,16);if(n.instanceColor)o.instanceColor=new THREE.InstancedBufferAttribute(n.instanceColor,3);o.computeBoundingSphere();}
    else if(n.type==='Mesh')o=new THREE.Mesh(g,m);
    else if(n.type==='PointLight')o=new THREE.PointLight(new THREE.Color(...n.color),n.intensity,n.distance,n.decay);
    else o=new THREE.Group();
    o.uuid=n.id;o.name=n.name;o.matrix.fromArray(n.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale);o.visible=n.visible;o.castShadow=n.castShadow;o.receiveShadow=n.receiveShadow;o.renderOrder=n.renderOrder;o.frustumCulled=n.frustumCulled;o.userData=n.userData;
    for(const child of n.children)o.add(node(child));return o;
  }
  return node(model.object);
}
