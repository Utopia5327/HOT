import * as THREE from 'three';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

// Shared exhibit construction keeps project identity, picking and film playback together.
export function buildExhibitDisplay({project,position,rotation,outdoor=false,terrace=false,media,M,soft,box,mesh,artworks,artMaterials,videoScreens,groundHeight}){
 const display=new THREE.Group();display.name=project.shortTitle+' exhibit';display.position.copy(position);display.rotation.y=rotation;media.add(display);
 const images=project.images||[],film=project.films?.[0],primary=film||images[0],aspect=primary?primary.width/primary.height:1.3;
 const h=Math.min(outdoor?2.25:3.12,(outdoor?3.15:4.7)/aspect),w=h*aspect,center=outdoor?1.94:2.15;
 soft(w+.20,h+.20,.13,outdoor?M.darkwood:M.shell,display,0,center,0,0,.048);
 const panelMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.76,emissive:'#ffffff',emissiveIntensity:.18});
 const board=mesh(new THREE.PlaneGeometry(w,h),panelMaterial,display,0,center,.078);board.castShadow=false;board.userData.projectId=project.id;artworks.push(board);artMaterials.push({material:panelMaterial,src:film?.poster||primary?.texture||primary?.src});
 if(film)videoScreens.push({projectId:project.id,board,film,width:w,height:h});
 else if(images.length>1)board.userData.imageCarousel={width:w,height:h,images:images.map(im=>({src:im.texture||im.preview||im.src,width:im.width,height:im.height}))};
 let left=-w/2-.1,right=w/2+.1;
 if(images[1]&&!terrace){
  const im=images[1],a=im.width/im.height,hh=Math.min(outdoor?1.6:1.9,(outdoor?1.65:2.2)/a),ww=a*hh,sx=-(w/2+ww/2+.45);
  soft(ww+.12,hh+.12,.085,outdoor?M.darkwood:M.shell,display,sx,center-.20,-.02,0,.025);
  const mm=panelMaterial.clone(),board2=mesh(new THREE.PlaneGeometry(ww,hh),mm,display,sx,center-.20,.028);board2.userData.projectId=project.id;board2.castShadow=false;artworks.push(board2);artMaterials.push({material:mm,src:im.texture||im.src});left=sx-ww/2-.08;
 }
 const posts=[];
 if(outdoor){
  // Timber frames root directly into the garden; roof exhibits sit on the reserved plinth.
  const top=center+h/2+.34;
  for(const x of [left+.08,right-.08]){
   const world=V(x,0,-.09).applyAxisAngle(V(0,1,0),rotation).add(position),base=terrace?0:groundHeight(world.x,world.z)-position.y-.18;
   box(.12,top-base,.13,M.wood,display,x,(top+base)/2,-.09);
   if(!terrace)box(.35,.38,.35,M.foundation,display,x,base+.04,-.09);
   posts.push({local:[x,base+.04,-.09],world:[world.x,position.y+base+.04,world.z],footingHalf:terrace?0:.175});
  }
  box(right-left+.28,.12,.95,M.darkwood,display,(left+right)/2,top,-.08);
  for(let x=left-.08;x<right+.10;x+=.17)box(.10,.08,1.1,M.wood,display,x,top+.075,-.08);
 }else{
  box(w+.14,.055,.25,M.bronze,display,0,.38,.035);
  for(const x of [-w*.38,w*.38])box(.045,.34,.07,M.bronze,display,x,.18,0);
 }
 // This small caption carries the original monospace identity into the physical displays.
 const labelMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,emissive:'#ffffff',emissiveIntensity:.08});
 const label=mesh(new THREE.PlaneGeometry(Math.min(w,2.6),.25),labelMat,display,0,Math.max(.47,center-h/2-.27),.09);label.castShadow=false;
 artMaterials.push({material:labelMat,src:`./assets/labels/${project.id}.svg`});
 display.userData.exhibitFootprint={projectId:project.id,outdoor,terrace,left:left-.22,right:right+.22,back:-.68,front:.52,bottom:Math.min(0,...posts.map(p=>p.local[1]-.19)),top:center+h/2+.48,posts};
 return {display,board,target:position.clone().add(V(0,center,0)),bounds:{left,right,top:center+h/2+.42}};
}
