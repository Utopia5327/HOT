import {createMapLegend,northArrow} from './map-key.js';
import * as THREE from 'three';
import {frameAt,groundHeight,nearestRoute,pitchedRoofPoint} from './campus.js';
import {facadeCuts,isFacadeOpening} from './entry-config.js';
import {BALCONY_SPECS,balconyGuardPoints} from './balcony-layout.js';
import {BANYAN,COURTYARD_POND,FIRE_CIRCLE} from './courtyard-layout.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),TAU=Math.PI*2;

// A separate, unlit drawing scene: plan view never changes the model's materials,
// lighting, tree visibility, or geometry. Everything is derived from the model.
export function createArchitecturalPlan(campus){
 const scene=new THREE.Scene();scene.name='Architectural gallery plan';scene.background=new THREE.Color('#fbfaf7');
 const lines=new Map(),fills=new Map(),pathCells=new Map(),pathEdges=[];
 const segment=(a,b,color='#757571',height=1)=>{const key=color+'|'+height;if(!lines.has(key))lines.set(key,[]);lines.get(key).push(a[0],height,a[1],b[0],height,b[1]);};
 const line=(pts,color='#777772',height=1,closed=false)=>{for(let i=1;i<pts.length;i++)segment(pts[i-1],pts[i],color,height);if(closed&&pts.length>2)segment(pts.at(-1),pts[0],color,height);};
 const triangle=(a,b,c,color,height)=>{const key=color+'|'+height;if(!fills.has(key))fills.set(key,[]);fills.get(key).push(a[0],height,a[1],b[0],height,b[1],c[0],height,c[1]);};
 const polygon=(pts,color,height=.05)=>{const shape=new THREE.Shape(pts.map(p=>new THREE.Vector2(p[0],-p[1]))),geo=new THREE.ShapeGeometry(shape),p=geo.attributes.position,ix=geo.index;
  for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2);triangle([p.getX(a),-p.getY(a)],[p.getX(b),-p.getY(b)],[p.getX(c),-p.getY(c)],color,height);}geo.dispose();};
 const circle=(x,z,r,color='#777772',height=1,fill=null,stretch=1)=>{const pts=Array.from({length:65},(_,i)=>[x+Math.cos(i/64*TAU)*r,z+Math.sin(i/64*TAU)*r*stretch]);if(fill)polygon(pts,fill,height-.01);line(pts,color,height);return pts;};
 const ribbon=(pts,width,color='#333430',height=1.3)=>{for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz);if(!d)continue;const nx=-dz/d*width/2,nz=dx/d*width/2;polygon([[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]],color,height);}};
 let randomSeed=7413;const rnd=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
 const gardenOutline=Array.from({length:361},(_,i)=>{const f=frameAt(i/360),p=f.p.addScaledVector(f.n,f.w*.455);return [p.x,p.z];});polygon(gardenOutline,'#e1e6d5',-.08);
 // Light survey contours stop at the building and approach, allowing the plan's
 // walls and circulation to remain the dominant information.
 for(let level=-2;level<24;level+=2)for(let x=-55;x<55;x+=2)for(let z=-47;z<47;z+=2){
  const route=nearestRoute(x+1,z+1);if(route.distance<route.w*.5+3||Math.hypot(x/34,z/31)<1||Math.abs(x)<5&&z>24)continue;
  const cells=[[x,z],[x+2,z],[x+2,z+2],[x,z+2]],cross=[];
  for(let i=0;i<4;i++){const a=cells[i],b=cells[(i+1)%4],ha=groundHeight(...a)-level,hb=groundHeight(...b)-level;if((ha<0)===(hb<0))continue;const t=ha/(ha-hb);cross.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  if(cross.length===2)line(cross,'#deddd6',-.2);
 }
 let contourGarden,fireGarden,foyer,arrival;const flights=[],entries=[];
 campus.root.traverse(o=>{if(o.userData.contourGarden)contourGarden=o.userData.contourGarden;if(o.userData.fireGarden)fireGarden=o.userData.fireGarden;if(o.userData.stairFlight)flights.push(o.userData.stairFlight);if(o.userData.entrance)entries.push(o.userData.entrance);if(o.userData.foyerAxis)foyer=o.userData.foyerAxis;if(o.userData.arrivalAxis)arrival=o.userData.arrivalAxis;});
 for(const bed of contourGarden?.beds||[]){const pts=bed.outline.map(p=>[p[0],p[2]]);polygon(pts,'#cdd6b7',0);line(pts,'#98a583',.1,true);}
 // Orthogonal projection of upward-facing walking surfaces preserves every
 // actual landing, balcony and tread, including irregular curved boundaries.
 function surface(object,color,height,outline,joinPaths=false,paving=false){
  const g=object.geometry,p=g.attributes.position,ix=g.index,edges=new Map(),positions=new Map(),a=V(),b=V(),c=V(),ab=V(),ac=V();
  const key=p=>`${p.x.toFixed(3)},${p.z.toFixed(3)}`;
  for(let i=0;i<(ix?.count??p.count);i+=3){
   a.fromBufferAttribute(p,ix?ix.getX(i):i).applyMatrix4(object.matrixWorld);b.fromBufferAttribute(p,ix?ix.getX(i+1):i+1).applyMatrix4(object.matrixWorld);c.fromBufferAttribute(p,ix?ix.getX(i+2):i+2).applyMatrix4(object.matrixWorld);
   if(ab.subVectors(b,a).cross(ac.subVectors(c,a)).y<.00001)continue;
   triangle([a.x,a.z],[b.x,b.z],[c.x,c.z],color,height);
   if(joinPaths){const face={owner:object.uuid,paving,p:[[a.x,a.z],[b.x,b.z],[c.x,c.z]]};for(let x=Math.floor(Math.min(a.x,b.x,c.x)/2);x<=Math.floor(Math.max(a.x,b.x,c.x)/2);x++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/2);z<=Math.floor(Math.max(a.z,b.z,c.z)/2);z++){const key=x+','+z;if(!pathCells.has(key))pathCells.set(key,[]);pathCells.get(key).push(face);}}
   if(!outline)continue;
   for(const [u,v] of [[a,b],[b,c],[c,a]]){const ku=key(u),kv=key(v);if(ku===kv)continue;positions.set(ku,[u.x,u.z]);positions.set(kv,[v.x,v.z]);const k=ku<kv?ku+'|'+kv:kv+'|'+ku;edges.set(k,(edges.get(k)||0)+1);}
  }
  if(outline)for(const [edge,count] of edges){if(count!==1)continue;const [a,b]=edge.split('|');if(joinPaths)pathEdges.push({a:positions.get(a),b:positions.get(b),owner:object.uuid,color:outline,height:height+.01});else segment(positions.get(a),positions.get(b),outline,height+.01);}
 }
 const topTypes=new Set(['roof','terrace','terrace-stair','terrace-landing','promenade-stair','garden-entry-stair','landscape-step']);
 for(const {mesh,type} of campus.walkSurfaces){if(topTypes.has(type))continue;
  const garden=type.startsWith('courtyard')||type.startsWith('garden')||type.startsWith('landscape')||type==='fire-garden',threshold=['entrance','foyer','lounge-entry'].includes(type);
  surface(mesh,garden?'#eee9dd':'#f3f1e8',garden?.32:.25,threshold?null:garden?'#858b78':'#545c4d',type!=='fire-garden',garden);
 }
 for(const e of pathEdges){const x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2,faces=pathCells.get(Math.floor(x/2)+','+Math.floor(z/2))||[];
  const covered=faces.some(f=>{if(f.owner===e.owner)return false;const [a,b,c]=f.p,ab=(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]),bc=(c[0]-b[0])*(z-b[1])-(c[1]-b[1])*(x-b[0]),ca=(a[0]-c[0])*(z-c[1])-(a[1]-c[1])*(x-c[0]);return ab>1e-7&&bc>1e-7&&ca>1e-7||ab< -1e-7&&bc< -1e-7&&ca< -1e-7;});
  if(!covered)segment(e.a,e.b,e.color,e.height);
 }
 // Stone courses are clipped to the union of the actual garden paving.
 const onPaving=(x,z)=>(pathCells.get(Math.floor(x/2)+','+Math.floor(z/2))||[]).some(f=>{if(!f.paving)return false;const [a,b,c]=f.p,ab=(b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]),bc=(c[0]-b[0])*(z-b[1])-(c[1]-b[1])*(x-b[0]),ca=(a[0]-c[0])*(z-c[1])-(a[1]-c[1])*(x-c[0]);return ab>=0&&bc>=0&&ca>=0||ab<=0&&bc<=0&&ca<=0;});
 for(let row=0,z=-25;z<24;row++,z+=.49)for(let x=-24+(row%2)*.34;x<24;x+=.69){
  const j=.05*Math.sin(x*17+z*29),pts=[[x+.04,z+.03],[x+.64+j,z+.045],[x+.63,z+.43],[x+.055-j,z+.45]];
  if(pts.every(p=>onPaving(...p))){if((row+Math.round(x*3))%4===0)polygon(pts,'#e2dccd',.39);line(pts,'#c2bcad',.40,true);}
 }
 const galleryFlights=flights.filter(f=>f.type==='promenade-stair');
 const onStair=t=>galleryFlights.some(f=>t>=f.range[0]-.0001&&t<=f.range[1]+.0001);
 const inFoyer=p=>foyer&&Math.abs((p[0]-foyer.center[0])*foyer.direction[2]-(p[1]-foyer.center[2])*foyer.direction[0])<3.65&&(()=>{const s=(p[0]-foyer.center[0])*foyer.direction[0]+(p[1]-foyer.center[2])*foyer.direction[2];return s>-.85&&s<2.3;})();
 const hatch=(a,b)=>{if(!inFoyer([(a[0]+b[0])/2,(a[1]+b[1])/2]))segment(a,b,'#dfdcd1',.60);};
 for(let i=0;i<140;i++){
  const t=i/140,f=frameAt(t);if(onStair(t))continue;
  for(let j=0;j<24;j++){const a=f.p.clone().addScaledVector(f.n,(-.45+.90*j/24)*f.w),b=f.p.clone().addScaledVector(f.n,(-.45+.90*(j+1)/24)*f.w);hatch([a.x,a.z],[b.x,b.z]);}
 }
 for(const u of [-.28,0,.28])for(let i=0;i<640;i++){if(onStair(i/640)||onStair((i+1)/640))continue;const pts=[i/640,(i+1)/640].map(t=>{const f=frameAt(t),p=f.p.addScaledVector(f.n,u*f.w);return [p.x,p.z];});hatch(...pts);}
 const toPlan=p=>[p[0],p[2]];
 function note(text,p,width=1.8){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const context=canvas.getContext('2d');context.font='500 48px monospace';context.textAlign='center';context.textBaseline='middle';context.fillStyle='#f6f4ee';context.fillRect(128-context.measureText(text).width/2-9,18,context.measureText(text).width+18,60);context.fillStyle='#51564a';context.fillText(text,128,49);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Mesh(new THREE.PlaneGeometry(width,width*96/256),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));label.rotation.x=-Math.PI/2;label.position.set(p[0],1.48,p[1]);scene.add(label);
 }
 function riseArrow(points,label='UP'){
  const a=points[0],b=points.at(-1),prev=points.at(-2),dx=b[0]-prev[0],dz=b[1]-prev[1],d=Math.hypot(dx,dz);if(d<.001)return;
  ribbon(points,.075,'#f6f4ee',1.40);line(points,'#555c4c',1.41);circle(a[0],a[1],.085,'#555c4c',1.42,'#f6f4ee');
  polygon([b,[b[0]-dx/d*.55-dz/d*.20,b[1]-dz/d*.55+dx/d*.20],[b[0]-dx/d*.55+dz/d*.20,b[1]-dz/d*.55-dx/d*.20]],'#555c4c',1.42);
  const next=points[1],sx=next[0]-a[0],sz=next[1]-a[1],sd=Math.hypot(sx,sz);note(label,[a[0]-sz/sd*.90,a[1]+sx/sd*.90],label==='UP'?1.8:3.2);
 }
 for(const flight of flights){
  polygon([...flight.left,...flight.right.slice().reverse()].map(toPlan),'#e9e3d4',.75);
  line(flight.left.map(toPlan),'#70746b',.85);line(flight.right.map(toPlan),'#70746b',.85);
  flight.boundaries.forEach((points,i)=>line(points.map(toPlan),i===0||i===flight.boundaries.length-1?'#73766e':'#8c8e85',.86));
  riseArrow(flight.centerline.slice(5,29).map(toPlan));
 }
 const cuts=facadeCuts(360);
 for(const side of [-1,1])for(let i=0;i<cuts.length-1;i++){
  const a=cuts[i],b=cuts[i+1],mid=(a+b)/2;if(isFacadeOpening(mid,side))continue;
  for(const offset of [-.07,.07]){const pts=[a,b].map(t=>{const f=frameAt(t),p=f.p.addScaledVector(f.n,side*f.w*.455+offset);return [p.x,p.z];});line(pts,'#777a72',1.2);}
  if(i%2===0){const f=frameAt(a),p=f.p.clone().addScaledVector(f.n,side*f.w*.455),q=p.clone().addScaledVector(f.n,.16);ribbon([[p.x,p.z],[q.x,q.z]],.10,'#30332e',1.35);}
 }
 // Cut masonry jambs and structural columns use a stronger poche.
 for(const entry of entries){
  for(const jamb of entry.jambs){const p=V(...jamb),out=V(...entry.out),a=p.clone().addScaledVector(out,-.4),b=p.clone().addScaledVector(out,.4);ribbon([[a.x,a.z],[b.x,b.z]],.44,'#252823',1.5);}
  line(entry.jambs.map(toPlan),'#84867c',.94);
 }
 if(foyer)for(const pair of foyer.returns)line(pair.map(toPlan),'#777a72',1.2);
 if(arrival){const end=V(...arrival.threshold),axis=V(...arrival.axis),p=end.clone().addScaledVector(axis,-13),q=end.clone().addScaledVector(axis,-4);riseArrow([toPlan(p.toArray()),toPlan(q.toArray())],'RAMP UP');}
 for(let k=0;k<8;k++)for(const sign of [-1,1]){const t=[.066,.18,.3,.425,.55,.675,.8,.925][k]+sign*.031,f=frameAt(t),p=f.p.addScaledVector(f.n,-.37*f.w);circle(p.x,p.z,.20,'#282b25',1.5,'#282b25');}
 for(const spec of BALCONY_SPECS){const pts=balconyGuardPoints(frameAt,spec).map(p=>[p.x,p.z]);ribbon(pts,.24,'#555850',1.2);for(let i=1;i<pts.length;i+=3)circle(pts[i][0],pts[i][1],.055,'#fbfaf7',1.3,'#fbfaf7');}
 // Roof outline is a light dashed projection, not a filled mass hiding rooms.
 for(const side of [-1,1])for(let i=0;i<520;i+=3){const p=pitchedRoofPoint(i/520,side),q=pitchedRoofPoint((i+1.6)/520,side);line([[p.x,p.z],[q.x,q.z]],'#b6b6ae',1);}
 for(const [a,b] of contourGarden?.walls||[])ribbon([[a[0],a[2]],[b[0],b[2]]],.23,'#75786e',1.1);
 for(const p of contourGarden?.plants||[]){
  const pts=Array.from({length:19},(_,i)=>{const a=i/18*TAU,r=p.r*(.87+.13*Math.cos(a*5));return [p.x+Math.cos(a)*r,p.z+Math.sin(a)*r];});polygon(pts,rnd()>.55?'#c0cda5':'#d4ddc3',.68);line(pts,'#93a17d',.7,true);
  for(let i=0;i<3;i++){const a=rnd()*TAU,r=p.r*rnd();circle(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r,.035,'#979d8e',.72);}
 }
 campus.root.traverse(o=>{if(o.userData.boulder){const b=o.userData.boulder,pts=Array.from({length:81},(_,i)=>{const a=i/80*TAU,w=1+.06*Math.sin(a*5+b.seed);return [b.x+Math.cos(a)*b.rx*w,b.z+Math.sin(a)*b.rz*w];});polygon(pts,'#d5cdbc',.7);line(pts,'#777767',.8,true);for(const s of [.65,.82])line(pts.map(p=>[b.x+(p[0]-b.x)*s,b.z+(p[1]-b.z)*s]),'#aaa18d',.81);}});
 const pond=COURTYARD_POND;circle(pond.x,pond.z,pond.rx,'#718f8d',.6,'#aec7c7',pond.rz/pond.rx);
 for(let z=-pond.rz+.18;z<pond.rz;z+=.28){const x=pond.rx*Math.sqrt(1-z*z/(pond.rz*pond.rz))*.92;line([[pond.x-x,pond.z+z],[pond.x+x,pond.z+z]],'#d4e3dc',.65);}
 if(fireGarden){for(const [i,poly] of (fireGarden.stonePlans||[]).entries()){polygon(poly,i%3?'#dcc8a5':'#e6d6b9',.60);line(poly,'#b09e83',.62,true);}ribbon(fireGarden.wallPoints,.27,'#6c725d',1.1);circle(FIRE_CIRCLE.x,FIRE_CIRCLE.z,1.02,'#6c5949',.9,'#b59c7c');circle(FIRE_CIRCLE.x,FIRE_CIRCLE.z,.76,'#806b53',1,'#e6ceb1');}
 // Exhibition screens project as thin dark panels, using their true world
 // transforms. Project pins remain interactive in the existing interface.
 for(const board of campus.artworks){if(board.userData.projectId&&campus.spots.find(s=>s.id===board.userData.projectId)?.region!=='terrace'){
  board.geometry.computeBoundingBox();const box=board.geometry.boundingBox,a=V(box.min.x,0,0).applyMatrix4(board.matrixWorld),b=V(box.max.x,0,0).applyMatrix4(board.matrixWorld);ribbon([[a.x,a.z],[b.x,b.z]],.18,'#1f241d',1.5);
 }}
 // Tree symbols have soft overlapping crown lobes and branch strokes, never the
 // bare radial spokes of a roofless 3D tree. Context trees use actual locations.
 function tree(x,z,r,detail=1){
  const pts=Array.from({length:121},(_,i)=>{const a=i/120*TAU,s=1+.05*Math.sin(a*11)+.025*Math.sin(a*23);return [x+Math.cos(a)*r*s,z+Math.sin(a)*r*s];});polygon(pts,detail===2?'#d2ddc1':'#edf0e5',.12);line(pts,detail===2?'#81877c':'#b8bdb2',1.6,true);
  for(let j=0;j<(detail===2?145:48);j++){const a=j*2.399,rr=r*Math.sqrt(rnd())*.86,cx=x+Math.cos(a)*rr,cz=z+Math.sin(a)*rr,rad=r*(.045+rnd()*.12);const pp=Array.from({length:17},(_,i)=>{const aa=i/16*TAU,w=1+.18*Math.cos(aa*5);return [cx+Math.cos(aa)*rad*w,cz+Math.sin(aa)*rad*w];});line(pp,detail===2?'#afb4a9':'#d0d3ca',1.6,true);}
  for(let i=0;i<9;i++){const a=i*TAU/9,rr=r*(.55+rnd()*.28),p=[x+Math.cos(a)*rr,z+Math.sin(a)*rr];line([[x,z],[x+(p[0]-x)*.34+.15,z+(p[1]-z)*.42],p],detail===2?'#878d80':'#c0c6b8',1.61);}
  circle(x,z,detail===2?.44:.17,'#59604f',1.7);
 }
 const seenTrees=[];
 campus.root.traverse(o=>{if(o.userData.tree){const {base,scale,banyan}=o.userData.tree;seenTrees.push([base[0],base[2]]);tree(base[0],base[2],banyan?7.1:2.8*scale,banyan?2:1);}});
 for(const o of campus.landscape.children)if(o===campus.landscape.children.find(c=>c.isInstancedMesh)){
  const matrix=new THREE.Matrix4(),p=V(),q=new THREE.Quaternion(),s=V();
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,s);if(Math.abs(p.x)>54||Math.abs(p.z)>46||seenTrees.some(a=>Math.hypot(p.x-a[0],p.z-a[1])<3))continue;tree(p.x,p.z,s.y*.19,1);}
 }
 for(const [key,positions] of fills){const [color]=key.split('|'),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));scene.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,toneMapped:false})));}
 for(const [key,positions] of lines){const [color]=key.split('|'),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));scene.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,toneMapped:false})));}
 scene.userData={architecturalPlan:true,source:'model geometry',exhibits:campus.spots.filter(s=>s.region!=='terrace').length,plants:contourGarden?.plants.length||0,stairFlights:flights.length,stairTreads:flights.reduce((n,f)=>n+f.steps.length,0),arrival:arrival?'RAMP UP':null};
 return {scene,dispose(){scene.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});}};
}

export function createPlanKey(parent,projects=[],onSelect){
 const key=document.createElement('aside');key.className='plan-key';key.hidden=true;key.setAttribute('aria-label','Architectural plan legend');
 key.innerHTML='<span class="plan-title">GALLERY / LANDSCAPE PLAN</span><span class="plan-subtitle">Terraced levels · Select a number to enter</span><div class="plan-key-bottom">'+northArrow+'<div class="plan-scale"><div class="plan-scale-labels"><span>0</span><span>5</span><span>10 m</span></div><div class="plan-scale-bar"></div></div></div>';
 key.append(createMapLegend({projects,plan:true,onSelect}));parent.append(key);const scale=key.querySelector('.plan-scale'),labels=key.querySelectorAll('.plan-scale-labels span');
 return {setVisible(v){key.hidden=!v;},update(camera,width){if(key.hidden)return;const pixels=width/(camera.right-camera.left)*camera.zoom,target=140/pixels,base=10**Math.floor(Math.log10(target)),length=[1,2,5,10].map(n=>n*base).filter(n=>n<=target).at(-1);scale.style.width=(length*pixels)+'px';labels[1].textContent=+(length/2).toPrecision(3);labels[2].textContent=+length.toPrecision(3)+' m';},dispose(){key.remove();}};
}
