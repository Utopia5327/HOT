import * as THREE from '../assets/three.module.js';
import {ARRIVAL_HALF_WIDTH} from './arrival-route.js';
import {DEFINED_ENTRIES} from './entry-config.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),PI=Math.PI;

export function buildEntranceDetails({architecture,M,frameAt,floorPoint,facadeRoofPoint,loungePads,mesh,box,tube,beam,surfaceGeometry,addSurface,navigationBlocks}){
  const root=new THREE.Group();root.name='Defined entrances and brick jaali garden rooms';architecture.add(root);
  const unitBrick=new THREE.BoxGeometry(1,1,1),portals=[],parapets=[];
  M.threshold=M.stone.clone();M.threshold.color.set('#ceb89b');M.threshold.side=THREE.DoubleSide;
  const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color();
  function brickwork(records,parent,name){
    const o=new THREE.InstancedMesh(unitBrick,M.stairBrick,records.length);o.name=name;o.castShadow=true;o.receiveShadow=true;
    records.forEach((r,i)=>{q.setFromAxisAngle(V(0,1,0),r.angle||0);matrix.compose(r.p,q,r.scale);o.setMatrixAt(i,matrix);color.setHSL(.038+(i%5)*.002,.24+(i%3)*.025,.74+(i%9)*.017);o.setColorAt(i,color);});
    o.instanceMatrix.needsUpdate=true;o.instanceColor.needsUpdate=true;o.computeBoundingSphere();parent.add(o);return o;
  }
  function block(a,b,radius,bottom,top,kind){navigationBlocks.push({a:[a.x,a.z],b:[b.x,b.z],radius,bottom,top,kind});}
  function column(position,along,out,height,parent,records){
    const angle=Math.atan2(-along.z,along.x),body=box(.44,height,.80,M.stairMortar,parent,position.x,position.y+height/2,position.z,angle);body.name='Brick entrance return';
    const local=(x,y,z)=>position.clone().addScaledVector(along,x).addScaledVector(out,z).add(V(0,y,0));
    for(let row=0,y=.047;y<height-.025;row++,y+=.09){
      for(const face of [-1,1]){
        const pieces=row%2?[[-.172,.088],[0,.242],[.172,.088]]:[[-.111,.210],[.111,.210]];
        for(const [x,width] of pieces)records.push({p:local(x,y,face*.410),scale:V(width,.078,.042),angle});
        for(const z of [-.270,0,.270])records.push({p:local(face*.228,y,z),scale:V(.040,.078,.252),angle});
      }
    }
    box(.51,.09,.89,M.stone,parent,position.x,position.y+height+.045,position.z,angle);
    block(local(0,0,-.40),local(0,0,.40),.25,position.y,position.y+height+.09,'entrance-jamb');
    // A narrow timber reveal gives the masonry a visible depth and a warm inner edge.
    const inner=local(0,0,-.44);beam(inner.clone().add(V(0,.10,0)),inner.clone().add(V(0,height+.05,0)),.065,M.wood,parent);
  }
  for(const entry of DEFINED_ENTRIES){
    const f=frameAt(entry.t),out=f.n.clone().multiplyScalar(entry.side),curvedA=floorPoint(entry.t-entry.half,entry.side*.91),curvedB=floorPoint(entry.t+entry.half,entry.side*.91),center=f.p.clone().addScaledVector(f.n,entry.side*f.w*.455);
    const a=entry.kind==='arrival'?center.clone().addScaledVector(f.d,-ARRIVAL_HALF_WIDTH):curvedA,b=entry.kind==='arrival'?center.clone().addScaledVector(f.d,ARRIVAL_HALF_WIDTH):curvedB;
    const portal=new THREE.Group();portal.name=entry.name+' — brick and timber portal';root.add(portal);
    const minRoof=Math.min(...Array.from({length:9},(_,i)=>{const t=entry.t-entry.half+i/8*entry.half*2;return facadeRoofPoint(t,entry.side).y-frameAt(t).p.y;}));
    const head=Math.max(2.42,Math.min(3.02,minRoof-.48)),records=[];
    column(a,f.d,out,head-.09,portal,records);column(b,f.d,out,head-.09,portal,records);
    // Paired curved glulam lintels form a deep portal rather than an isolated gap.
    for(const face of [-1,1]){
      const line=Array.from({length:33},(_,i)=>a.clone().lerp(b,i/32).addScaledVector(out,face*.39).add(V(0,head+.15*Math.sin(i/32*PI),0)));
      tube(line,.105,M.darkwood,portal,false,44);
      if(face<0)tube(line.map(p=>p.clone().add(V(0,-.115,0))),.012,M.light,portal,false,44);
    }
    for(let i=0;i<=18;i++){
      const p=a.clone().lerp(b,i/18).add(V(0,head+.15*Math.sin(i/18*PI),0));
      beam(p.clone().addScaledVector(out,-.43),p.clone().addScaledVector(out,.43),.043,M.wood,portal);
    }
    const depth=entry.kind==='garden'?1.25:entry.kind==='stair'?.65:.80;
    const thresholdPoint=(t,u)=>{if(entry.kind==='arrival')return center.clone().addScaledVector(f.d,u*(ARRIVAL_HALF_WIDTH-.25)).addScaledVector(out,-.85+t*(.85+depth)).add(V(0,.018,0));const tt=entry.t+entry.half*.91*u,fr=frameAt(tt);return floorPoint(tt,entry.side*.91).addScaledVector(fr.n,entry.side*(-.85+t*(.85+depth))).add(V(0,.018,0));};
    const threshold=mesh(surfaceGeometry(thresholdPoint,8,28),entry.kind==='bridge'?M.deck:M.threshold,portal);threshold.name=entry.name+' connected threshold';addSurface(threshold,'entrance');
    if(entry.kind==='arrival'){
      // Short glazed returns connect the straight foyer to the curved envelope.
      for(const [aligned,curved] of [[a,curvedA],[b,curvedB]]){
        const g=new THREE.BufferGeometry(),at=aligned.clone().add(V(0,head,0)),ct=curved.clone().add(V(0,head,0));
        g.setAttribute('position',new THREE.Float32BufferAttribute([...aligned,...curved,...at,...curved,...ct,...at],3));g.computeVertexNormals();mesh(g,M.glass,portal).castShadow=false;
        beam(aligned,curved,.055,M.bronze,portal);beam(at,ct,.065,M.darkwood,portal);
      }
      const apron=(t,u)=>{const straight=center.clone().addScaledVector(f.d,u*ARRIVAL_HALF_WIDTH),curved=floorPoint(entry.t+entry.half*u,entry.side*.91);return straight.lerp(curved,t).add(V(0,.016,0));};
      const pad=mesh(surfaceGeometry(apron,12,32),M.threshold,portal);addSurface(pad,'foyer');
      portal.userData.foyerAxis={center:center.toArray(),direction:f.n.toArray(),jambs:[a.toArray(),b.toArray()]};
    }
    const count=Math.max(6,Math.floor(a.distanceTo(b)/.245));
    for(let i=0;i<count;i++){
      const u=-.87+(i+.5)/count*1.74,p=thresholdPoint(.88,u).add(V(0,.009,0)),fr=frameAt(entry.t+entry.half*.91*u);
      records.push({p,scale:V(a.distanceTo(b)*.79/count,.018,.14),angle:Math.atan2(-fr.d.z,fr.d.x)});
    }
    for(const p of [a,b]){const light=p.clone().addScaledVector(out,-.60).add(V(0,.031,0));box(.07,.023,.38,M.light,portal,light.x,light.y,light.z,Math.atan2(-f.d.z,f.d.x));}
    brickwork(records,portal,'Coursed brick entrance cheeks and threshold inlay');
    portal.userData.entrance={id:entry.id,t:entry.t,side:entry.side,kind:entry.kind,clearWidth:a.distanceTo(b)-.50,headroom:head-.12,center:f.p.clone().addScaledVector(f.n,entry.side*f.w*.455).toArray()};
    portals.push(portal);
  }

  for(const [index,pad] of loungePads.entries()){
    const g=new THREE.Group();g.name='Open balcony '+(index+1)+' — integrated brick jaali parapet';pad.group.add(g);
    const start=0,end=1,base=pad.frame.p.y+.012,plinth=.12,rows=10,pitchY=.089;
    const point=a=>{const t=THREE.MathUtils.clamp(a,0,1)*(pad.guardPoints.length-1),i=Math.min(pad.guardPoints.length-2,Math.floor(t));return pad.guardPoints[i].clone().lerp(pad.guardPoints[i+1],t-i).setY(base);};
    const tangent=a=>point(a+.001).sub(point(a-.001)).normalize();
    const outward=a=>{const d=tangent(a);return V(-d.z,0,d.x);};
    const samples=240,angles=[start],lengths=[0];
    for(let i=1;i<=samples;i++){const a=start+(end-start)*i/samples;angles.push(a);lengths.push(lengths.at(-1)+point(a).distanceTo(point(angles[i-1])));}
    const length=lengths.at(-1),angleAt=d=>{const k=lengths.findIndex(v=>v>=d);if(k<=0)return start;return angles[k-1]+(angles[k]-angles[k-1])*(d-lengths[k-1])/(lengths[k]-lengths[k-1]);};
    const records=[];
    for(let row=0;row<rows;row++)for(let d=.24+(row%2)*.195;d<length-.24;d+=.390){
      const a=angleAt(d),dir=tangent(a),p=point(a).add(V(0,plinth+.039+row*pitchY,0));
      records.push({p,scale:V(.274,.078,.240),angle:Math.atan2(-dir.z,dir.x)});
    }
    // Open stretcher-bond brickwork: the gaps continue through the full wall thickness.
    const screen=brickwork(records,g,'Perforated curved brick jaali');
    const top=base+plinth+rows*pitchY;
    for(let i=0;i<72;i++){
      const a=start+(end-start)*i/72,b=start+(end-start)*(i+1)/72,pa=point(a),pb=point(b),mid=pa.clone().lerp(pb,.5),dir=pb.clone().sub(pa),angle=Math.atan2(-dir.z,dir.x);
      box(dir.length()+.010,plinth,.29,M.stairMortar,g,mid.x,base+plinth/2,mid.z,angle);
      box(dir.length()+.011,.07,.32,M.stone,g,mid.x,top+.035,mid.z,angle);
    }
    for(const a of [start,end]){
      const p=point(a),dir=tangent(a),angle=Math.atan2(-dir.z,dir.x);
      box(.34,top-base+.06,.34,M.stairMortar,g,p.x,(base+top+.06)/2,p.z,angle);
      box(.40,.085,.40,M.stone,g,p.x,top+.065,p.z,angle);
      for(let row=0;row<rows+1;row++)for(const face of [-1,1])records.push({p:p.clone().addScaledVector(outward(a),face*.175).add(V(0,.049+row*.091,0)),scale:V(.324,.078,.035),angle});
    }
    // Add end-pier courses separately; the main screen's instance count stays exact.
    brickwork(records.slice(screen.count),g,'Brick jaali end-pier courses');
    pad.group.updateWorldMatrix(true,true);
    for(let i=0;i<72;i++){
      const a=point(start+(end-start)*i/72).applyMatrix4(pad.group.matrixWorld),b=point(start+(end-start)*(i+1)/72).applyMatrix4(pad.group.matrixWorld);
      block(a,b,.16,a.y,a.y+top-base+.11,'jaali-parapet');
    }
    // A flush sill marks the wide opening, following the existing floor edge.
    const apron=(t,u)=>{
      const tt=pad.spec.t+pad.spec.half*.95*u,fr=frameAt(tt);
      return fr.p.clone().addScaledVector(fr.n,-fr.w*(.452+.048*t)).add(V(0,.008,0));
    };
    const threshold=mesh(surfaceGeometry(apron,8,32),M.threshold,root);threshold.name='Open balcony threshold';addSurface(threshold,'lounge-entry');
    g.userData.jaali={index,t:pad.frame.t,height:top-base+.07,brickCount:screen.count,openBond:true,entryWidth:point(start).distanceTo(point(end))-.50,start:point(start).toArray(),end:point(end).toArray()};parapets.push(g);
  }
  return {root,portals,parapets};
}
