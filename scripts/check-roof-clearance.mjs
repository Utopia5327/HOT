// Check the prepared meshes, including curved roof triangulation and tile thickness.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import * as THREE from '../explore/scene/assets/three.module.js';
import {frameAt} from '../explore/scene/worker/campus.js';
import {unpackCampus} from '../explore/scene/worker/campus-transfer.js';
import {readCampusPayload} from '../explore/scene/scene-binary.js';
import {SCENE_ASSETS} from '../explore/scene/scene-assets.js';

export function roofSampler(campus){
  const cells=new Map(),size=2;
  campus.root.updateMatrixWorld(true);
  for(const {mesh:o,type} of campus.walkSurfaces){
    if(!['roof','terrace'].includes(type))continue;
    const p=o.geometry.attributes.position,index=o.geometry.index;
    for(let i=0;i<(index?.count??p.count);i+=3){
      const [a,b,c]=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(o.matrixWorld).add(new THREE.Vector3(0,type==='terrace'?-.24:-.20,0)));
      const denominator=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
      if(Math.abs(denominator)<1e-9)continue;
      const triangle={a,b,c,denominator};
      for(let x=Math.floor(Math.min(a.x,b.x,c.x)/size);x<=Math.floor(Math.max(a.x,b.x,c.x)/size);x++){
        for(let z=Math.floor(Math.min(a.z,b.z,c.z)/size);z<=Math.floor(Math.max(a.z,b.z,c.z)/size);z++){
          const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(triangle);
        }
      }
    }
  }
  return (x,z)=>{
    let ceiling=Infinity;
    for(const {a,b,c,denominator:d} of cells.get(Math.floor(x/size)+','+Math.floor(z/size))||[]){
      const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d;
      if(u>=-1e-6&&v>=-1e-6&&u+v<=1+1e-6)ceiling=Math.min(ceiling,a.y*u+b.y*v+c.y*(1-u-v));
    }
    return ceiling;
  };
}

export function auditFacade(campus){
  const ceiling=roofSampler(campus),screens=campus.root.getObjectByName('Southwest terracotta solar screens');
  assert.ok(screens?.isInstancedMesh,'Terracotta scales must remain instanced');
  const p=screens.geometry.attributes.position,matrix=new THREE.Matrix4(),point=new THREE.Vector3();
  let minimum=Infinity,violations=0,uncovered=0,worst=null;
  for(let i=0;i<screens.count;i++){
    screens.getMatrixAt(i,matrix);matrix.premultiply(screens.matrixWorld);
    for(let j=0;j<p.count;j++){
      point.fromBufferAttribute(p,j).applyMatrix4(matrix);
      const gap=ceiling(point.x,point.z)-point.y;
      if(!Number.isFinite(gap))uncovered++;
      if(gap<0)violations++;
      if(gap<minimum){minimum=gap;worst={instance:i,vertex:j,position:point.toArray()};}
    }
  }
  return {modules:screens.count,vertices:screens.count*p.count,minimumGap:minimum,violations,uncovered,worst};
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
  for(const [quality,file] of Object.entries(SCENE_ASSETS)){
    const bytes=await readFile(new URL('../explore/scene/'+file,import.meta.url));
    const campus=unpackCampus(await readCampusPayload(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),frameAt);
    const result=auditFacade(campus);console.log(JSON.stringify({quality,...result}));
    if(!process.argv.includes('--report-only')){
      assert.equal(result.violations,0,'Facade scales cross the roof');
      assert.equal(result.uncovered,0,'Facade scales extend outside the roof');
      assert.ok(result.minimumGap>=.08,'Retain a visible gap below the roof underside');
    }
  }
}
