import * as THREE from 'three';

export const TERRACE_STAIR={start:-.017,end:.016,entry:-.024,width:1.95,offset:2.90,landingDepth:2.80,slab:.26};

// One layout drives the stair, guards, grading, walking route and structural bearings.
export function terraceStairLayout(spec,frameAt){
 const {start,end,width,offset,landingDepth,slab}=TERRACE_STAIR;
 const startStair=spec.t+start,endStair=spec.t+end,first=frameAt(startStair),last=frameAt(endStair);
 const stairPoint=(f,u=0)=>{const fr=frameAt(startStair+(endStair-startStair)*f);return fr.p.clone().addScaledVector(fr.n,-fr.w*.5-offset+u*width/2).setY(THREE.MathUtils.lerp(spec.base,spec.level,f));};
 function landing(fr,upper){
  const inner=upper?-fr.w*.5-.85:-fr.w*.42,outer=-fr.w*.5-offset-width/2-.32;
  const from=upper?-.025:-landingDepth,to=upper?landingDepth:.025,y=upper?spec.level:spec.base;
  const point=(n,d)=>fr.p.clone().addScaledVector(fr.n,n).addScaledVector(fr.d,d).setY(y);
  const center=point((inner+outer)/2,(from+to)/2),mouth=upper?from:to,back=upper?to-.14:from+.14;
  const innerGuard=upper?-fr.w*.5-1.32:-fr.w*.455-.18,outerGuard=outer+.14;
  const stairOuter=-fr.w*.5-offset-width/2+.02,stairInner=-fr.w*.5-offset+width/2-.02;
  // Keep the building side open; guard the exposed perimeter and join the stair guards.
  const guards=[[[stairOuter,0],[outerGuard,mouth],[outerGuard,back],[innerGuard,back]],[[stairInner,0],[innerGuard,upper?.14:-.14]]].map(points=>points.map(([n,d])=>point(n,d)));
  const route=[point(inner+.35,(from+to)/2),point(-fr.w*.5-offset,(from+to)/2),point(-fr.w*.5-offset,0)];
  if(upper)route.reverse();
  return {upper,frame:fr,inner,outer,from,to,y,center,point,guards,route,width:inner-outer,depth:to-from,slab,outline:[[outer,from],[inner,from],[inner,to],[outer,to]].map(([n,d])=>point(n,d))};
 }
 return {startStair,endStair,stairWidth:width,stairPoint,lower:landing(first,false),upper:landing(last,true)};
}
