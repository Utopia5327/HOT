// Distances are meters in the gallery model. Sound has a smooth edge, not a switch.
export function distanceGain(distance,near=3.0,far=11.5){
 if(!Number.isFinite(distance)||distance>=far)return 0;
 if(distance<=near)return 1;
 const t=(distance-near)/(far-near);return 1-t*t*(3-2*t);
}
export function selectNearestFilm(entries,eye,currentId=null){
 let best=null,bestDistance=Infinity;
 for(const entry of entries){
  if(entry.failed||Math.abs(eye.y-entry.position.y)>4.2)continue;
  const d=Math.hypot(eye.x-entry.position.x,eye.y-entry.position.y,eye.z-entry.position.z);
  if(d<(entry.id===currentId?16:13.5)&&d<bestDistance){best=entry;bestDistance=d;}
 }
 const current=entries.find(e=>e.id===currentId&&!e.failed);
 if(current&&best&&best.id!==currentId){const d=Math.hypot(eye.x-current.position.x,eye.y-current.position.y,eye.z-current.position.z);if(d<bestDistance+1.3&&d<16&&Math.abs(eye.y-current.position.y)<=4.2)return {entry:current,distance:d};}
 return best?{entry:best,distance:bestDistance}:null;
}
