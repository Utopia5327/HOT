export const VIEWING_RADIUS=.95;

export function viewingState(zone,eye,forward,active=false){
  const distance=Math.hypot(eye.x-zone.eye.x,eye.z-zone.eye.z);
  const level=Math.abs(eye.y-zone.eye.y)<.65;
  const inside=level&&distance<=zone.radius+(active?.06:0);
  const x=zone.target.x-eye.x,y=zone.target.y-eye.y,z=zone.target.z-eye.z,length=Math.hypot(x,y,z);
  const dot=(x*forward.x+y*forward.y+z*forward.z)/Math.max(.001,length);
  return {distance,level,inside,facing:dot>=Math.cos((active?46:40)*Math.PI/180)};
}

// Every film uses the visible standing area, including direct video files.
export function selectViewingFilm(entries,eye,forward,currentId=null){
  let selected=null;
  for(const entry of entries){
    if(entry.failed||!entry.zone)continue;
    const state=viewingState(entry.zone,eye,forward,entry.id===currentId);
    if(!state.inside||!state.facing)continue;
    if(!selected||state.distance<selected.zoneDistance)selected={entry,zoneDistance:state.distance,distance:Math.hypot(eye.x-entry.position.x,eye.y-entry.position.y,eye.z-entry.position.z)};
  }
  return selected;
}
