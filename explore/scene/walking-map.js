import {MINI_MAP} from './map-key.js';

// DOM-only overlay: no extra canvas, render pass, texture or animation loop.
export function createWalkingMap(root){
 const toggle=root.querySelector('#map-toggle'),content=root.querySelector('#map-content');
 const person=root.querySelector('#map-person'),status=root.querySelector('#map-status');
 let collapsed=matchMedia('(max-height:520px)').matches;
 function setCollapsed(value){
  collapsed=value;content.hidden=value;root.classList.toggle('is-collapsed',value);
  toggle.setAttribute('aria-expanded',String(!value));
  toggle.setAttribute('aria-label',value?'Expand gallery map':'Collapse gallery map');
 }
 toggle.onclick=()=>setCollapsed(!collapsed);setCollapsed(collapsed);
 return {
  update({x,z,heading,walking,location}){
   const px=MINI_MAP.cx+x*MINI_MAP.scale,py=MINI_MAP.cy+z*MINI_MAP.scale;
   const offsite=px<8||px>MINI_MAP.width-8||py<8||py>MINI_MAP.height-8;
   person.hidden=!walking;root.classList.toggle('is-walking',walking);
   person.classList.toggle('off-map',offsite);
   person.style.left=Math.max(8,Math.min(MINI_MAP.width-8,px))+'px';
   person.style.top=Math.max(8,Math.min(MINI_MAP.height-8,py))+'px';
   person.style.setProperty('--heading',heading+'rad');
   status.textContent=walking?(offsite?'Beyond site edge':'You are here'):'Choose a project';
   person.setAttribute('aria-label','Your position'+(location?' · '+location:''));
  }
 };
}
