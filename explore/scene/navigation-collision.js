// Capsule segments keep walking clear of the new masonry without expensive mesh raycasts.
export function masonryCollision(position,blocks,eyeHeight=1.95,radius=.22){
  const feet=position.y-eyeHeight;
  return blocks.some(b=>{
    if(feet>=b.top-.04||position.y<=b.bottom+.12)return false;
    const dx=b.b[0]-b.a[0],dz=b.b[1]-b.a[1],length=dx*dx+dz*dz;
    const t=length?Math.max(0,Math.min(1,((position.x-b.a[0])*dx+(position.z-b.a[1])*dz)/length)):0;
    return Math.hypot(position.x-b.a[0]-dx*t,position.z-b.a[1]-dz*t)<b.radius+radius;
  });
}
