import * as THREE from 'three';
export const MODEL_VIEWS={
 plan:{label:'Plan',eye:[0,130,0],target:[0,8,0],up:[0,0,-1],span:84},
 north:{label:'North elevation',eye:[0,10,-135],target:[0,10,0],up:[0,1,0],span:38},
 east:{label:'East elevation',eye:[135,10,0],target:[0,10,0],up:[0,1,0],span:38},
 south:{label:'South elevation',eye:[0,10,135],target:[0,10,0],up:[0,1,0],span:38},
 west:{label:'West elevation',eye:[-135,10,0],target:[0,10,0],up:[0,1,0],span:38}
};
export function resizeModelCamera(camera,aspect){
 if(camera.isOrthographicCamera){const height=Math.max(camera.userData.viewSpan||84,94/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;}
 else camera.aspect=aspect;
 camera.updateProjectionMatrix();
}
export function modelCamera(view,aspect){
 const v=MODEL_VIEWS[view],camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,650);camera.userData.viewSpan=v.span;camera.userData.viewTarget=v.target.slice();camera.position.fromArray(v.eye);camera.up.fromArray(v.up);camera.lookAt(new THREE.Vector3(...v.target));resizeModelCamera(camera,aspect);camera.updateMatrixWorld();return camera;
}
export function createViewCube({parent,onSelect}){
 const root=document.createElement('nav');root.className='view-cube';root.setAttribute('aria-label','Model orientation');
 root.innerHTML=`<div class="cube-compass"><button data-view="north" class="cube-n" title="North elevation" aria-label="North elevation">N</button><button data-view="east" class="cube-e" title="East elevation" aria-label="East elevation">E</button><button data-view="south" class="cube-s" title="South elevation" aria-label="South elevation">S</button><button data-view="west" class="cube-w" title="West elevation" aria-label="West elevation">W</button></div><div class="cube-stage"><div class="cube-object"><button class="cube-face cube-top" data-view="plan" aria-label="Plan view">PLAN</button><button class="cube-face cube-front" data-view="south" aria-label="South elevation">S</button><button class="cube-face cube-back" data-view="north" aria-label="North elevation">N</button><button class="cube-face cube-right" data-view="east" aria-label="East elevation">E</button><button class="cube-face cube-left" data-view="west" aria-label="West elevation">W</button><button class="cube-face cube-bottom" data-view="3d" aria-label="Return to 3D">3D</button></div></div><button class="cube-home" data-view="3d" title="Return to overall 3D view">3D ↗</button><span class="cube-caption" aria-live="polite">Perspective</span>`;
 parent.append(root);const object=root.querySelector('.cube-object'),caption=root.querySelector('.cube-caption'),matrix=new THREE.Matrix4();let last='';
 root.addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button){event.stopPropagation();onSelect(button.dataset.view);}});
 return {setActive(view){caption.textContent=view==='plan'?'Plan · roof off':MODEL_VIEWS[view]?.label||'Perspective';root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));},update(camera){matrix.makeRotationFromQuaternion(camera.quaternion).invert();const e=matrix.elements,css=[e[0],-e[1],e[2],0,-e[4],e[5],-e[6],0,e[8],-e[9],e[10],0,0,0,0,1].map(n=>+n.toFixed(5)).join(',');if(css!==last){object.style.transform=`matrix3d(${css})`;last=css;}},dispose(){root.remove();}};
}
