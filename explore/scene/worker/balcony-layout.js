// Each balcony grows from a level gallery wing. Its slab and jaali share one
// perimeter, so no circular slab or parapet is buried in the gallery envelope.
export const BALCONY_SPECS=[
 {id:'valley-balcony',t:.118,half:.016,depth:3.2},
 {id:'west-balcony',t:.425,half:.016,depth:3.2},
 {id:'forest-balcony',t:.675,half:.016,depth:3.2},
 {id:'east-balcony',t:.925,half:.016,depth:3.2}
];
export function balconyPoint(frameAt,spec,s,across=1){
 const f=frameAt(spec.t+s*spec.half),projection=spec.depth*Math.max(0,Math.cos(s*Math.PI/2));
 return f.p.clone().addScaledVector(f.n,-f.w*.5-projection*across);
}
export function balconyGuardPoints(frameAt,spec){
 const points=[];
 // The short end returns close against the jambs, inside the existing slab edge.
 for(let i=0;i<=96;i++){
  const s=-1+2*i/96,f=frameAt(spec.t+s*spec.half),p=balconyPoint(frameAt,spec,s);
  const returnIn=.16+(f.w*.045-.16)*Math.exp(-(((1-Math.abs(s))/.055)**2));
  points.push(p.addScaledVector(f.n,returnIn));
 }
 return points;
}
