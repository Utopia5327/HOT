import * as THREE from 'three';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

// Masonry landing bearings carry each stair through continuous curved glulam ribs.
// Brick coursing and segmental openings belong to the wall, rather than a field of posts.
export function buildStairStructure({roofs,M,frameAt,groundHeight,roofTerraces,mesh,box,navigationBlocks}){
  const group=new THREE.Group();group.name='Terrace stairs — brick abutments and curved glulam';roofs.add(group);
  const abutments=[],stringers=[];let intermediate=0;
  M.stairBrick??=new THREE.MeshStandardMaterial({color:'#9e624b',roughness:.94});
  M.stairMortar??=new THREE.MeshStandardMaterial({color:'#986e58',roughness:1});
  const brickGeometry=new THREE.BoxGeometry(.294,.076,.065);

  function rib(points){
    const p=[],indices=[],uv=[];
    for(let i=0;i<points.length;i++){
      const tangent=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]).normalize();
      const across=V(-tangent.z,0,tangent.x).normalize(),up=across.clone().cross(tangent).normalize();
      for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
        const q=points[i].clone().addScaledVector(across,x*.115).addScaledVector(up,y*.23);p.push(...q);uv.push(i*.3,x*.5+.5);
      }
      if(i<points.length-1)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=a+4,d=b+4;indices.push(a,c,b,b,c,d);}
    }
    const end=(points.length-1)*4;indices.push(0,1,2,0,2,3,end,end+2,end+1,end,end+3,end+2);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    const o=mesh(g,M.darkwood,group);o.name='Continuous curved glulam stair stringer';o.userData.keepSeparate=true;stringers.push(o);
  }

  function abutment(terrace,landing,fr,width,kind){
    const wall=new THREE.Group();wall.name=`${terrace.name} — ${kind} brick bearing`;
    wall.position.copy(landing);wall.rotation.y=Math.atan2(-fr.n.z,fr.n.x);group.add(wall);
    const half=width/2,depth=.72,top=-.88;
    const terrain=[];
    for(let i=0;i<=16;i++)for(const d of [-.70,0,.70]){
      const p=landing.clone().addScaledVector(fr.n,(i/16-.5)*(width+.60)).addScaledVector(fr.d,d);
      terrain.push(groundHeight(p.x,p.z)-landing.y);
    }
    const bottom=Math.min(...terrain,top-.32)-.58,exposed=top-Math.max(...terrain),height=top-bottom;
    const shape=new THREE.Shape();
    shape.moveTo(-half-.18,bottom);shape.lineTo(half+.18,bottom);
    shape.quadraticCurveTo(half+.16,bottom+height*.56,half-.10,top-.20);
    shape.quadraticCurveTo(half-.13,top,half-.35,top);shape.lineTo(-half+.35,top);
    shape.quadraticCurveTo(-half+.13,top,-half+.10,top-.20);
    shape.quadraticCurveTo(-half-.16,bottom+height*.56,-half-.18,bottom);
    // A shallow arch opens the taller abutments while retaining generous brick shoulders.
    let arch=null;
    if(exposed>2.65){
      const r=Math.min(.72,width*.255),crown=top-.70,spring=crown-.42,hole=new THREE.Path();
      const floor=bottom+.30;hole.moveTo(-r,floor);hole.lineTo(-r,spring);
      hole.absellipse(0,spring,r,.42,Math.PI,0,true,0);hole.lineTo(r,floor);hole.closePath();shape.holes.push(hole);arch={r,spring,crown,floor};
    }
    shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelThickness:.022,bevelSize:.025,bevelSegments:2,curveSegments:14});geometry.translate(0,0,-depth/2);
    const body=mesh(geometry,M.stairMortar,wall);body.name='Tapered masonry abutment';body.userData.keepSeparate=true;
    // A continuous buried spread footing follows the wall instead of separate pads.
    const footing=box(width+.60,.38,1.40,M.foundation,wall,0,bottom+.08,0);
    footing.name=terrace.name+' '+kind+' continuous buried footing';
    box(width-.20,.14,.72,M.stone,wall,0,top+.07,0);
    box(width-.32,.04,.42,M.bronze,wall,0,top+.16,0);
    box(width-.40,.29,.32,M.darkwood,wall,0,top+.325,0);
    const bricks=[],q=new THREE.Quaternion(),matrix=new THREE.Matrix4(),color=new THREE.Color();
    const edgeAt=y=>half+.18-.43*Math.pow(THREE.MathUtils.clamp((y-bottom)/height,0,1),2);
    const inOpening=(x,y,margin=0)=>arch&&y>arch.floor-margin&&Math.abs(x)<arch.r+margin&&y<(y<=arch.spring?arch.spring:arch.spring+.42*Math.sqrt(Math.max(0,1-(x/(arch.r+margin))**2)))+margin;
    for(let row=0,y=bottom+.07;y<top-.04;row++,y+=.088){
      for(let x=-half-.12+(row%2)*.156;x<half+.1;x+=.312){
        if(Math.abs(x)+.16>edgeAt(y)||inOpening(x,y,.16))continue;
        for(const side of [-1,1])bricks.push({x,y,z:side*(depth/2+.016),angle:0,scaleX:1,scaleY:1});
      }
    }
    if(arch)for(let i=0;i<=14;i++){
      const a=Math.PI*i/14,x=(arch.r+.10)*Math.cos(a),y=arch.spring+(.42+.10)*Math.sin(a);
      for(const side of [-1,1])bricks.push({x,y,z:side*(depth/2+.025),angle:Math.atan2(.42*Math.cos(a),-arch.r*Math.sin(a)),scaleX:.43,scaleY:2.8});
    }
    const veneer=new THREE.InstancedMesh(brickGeometry,M.stairBrick,bricks.length);veneer.name='Running bond brickwork with arched opening';veneer.castShadow=false;veneer.receiveShadow=true;
    bricks.forEach((b,i)=>{q.setFromAxisAngle(V(0,0,1),b.angle);matrix.compose(V(b.x,b.y,b.z),q,V(b.scaleX,b.scaleY,1));veneer.setMatrixAt(i,matrix);color.setHSL(.035+(i%7)*.002,.23+(i%3)*.028,.69+(i%11)*.017);veneer.setColorAt(i,color);});
    veneer.instanceMatrix.needsUpdate=true;veneer.instanceColor.needsUpdate=true;veneer.userData.detailDistance=54;veneer.userData.lodCenter=landing.toArray();wall.add(veneer);
    wall.userData.stairAbutment={terrace:terrace.id,kind,upper:kind==='upper landing',width,depth,bottom:bottom+landing.y,footingTop:bottom+.27+landing.y,top:top+landing.y,bearingTop:top+.47+landing.y,center:landing.toArray(),ground:terrain.map(y=>y+landing.y),arch:!!arch};
    function block(a,b,lo,hi){
      const pa=landing.clone().addScaledVector(fr.n,a),pb=landing.clone().addScaledVector(fr.n,b);
      navigationBlocks?.push({a:[pa.x,pa.z],b:[pb.x,pb.z],radius:.40,bottom:landing.y+lo,top:landing.y+hi,kind:'stair-bearing'});
    }
    if(arch){
      block(-half-.08,-arch.r-.12,bottom,top);block(arch.r+.12,half+.08,bottom,top);block(-arch.r,arch.r,arch.crown,top);
    }else block(-half-.08,half+.08,bottom,top);
    abutments.push(wall.userData.stairAbutment);
  }
  for(const terrace of roofTerraces){
    const {layout,stairWidth}=terrace;
    for(const side of [-1,1]){
      const points=[],offset=side*stairWidth*.32,first=layout.lower,last=layout.upper;
      points.push(terrace.stairPoint(0).addScaledVector(first.frame.n,offset).addScaledVector(first.frame.d,(first.from+first.to)/2).add(V(0,-.29,0)));
      for(let i=0;i<=52;i++){
        const f=i/52,fr=frameAt(terrace.startStair+(terrace.endStair-terrace.startStair)*f);
        points.push(terrace.stairPoint(f).addScaledVector(fr.n,offset).add(V(0,-.29,0)));
      }
      points.push(terrace.stairPoint(1).addScaledVector(last.frame.n,offset).addScaledVector(last.frame.d,(last.from+last.to)/2).add(V(0,-.29,0)));rib(points);
    }
    for(const l of [layout.lower,layout.upper]){
      const kind=l.upper?'upper landing':'lower landing';abutment(terrace,l.center,l.frame,l.width-.24,kind);
      for(const n of [l.outer+.34,l.inner-.34]){
        const p=l.point(n,(l.from+l.to)/2);
        const joist=box(.20,.30,l.depth-.08,M.darkwood,group,p.x,p.y-.38,p.z,Math.atan2(-l.frame.n.z,l.frame.n.x));
        joist.name=terrace.name+' '+kind+' edge joist';
      }
    }
    const f=.53,p=terrace.stairPoint(f),fr=frameAt(terrace.startStair+(terrace.endStair-terrace.startStair)*f);
    if(p.y-groundHeight(p.x,p.z)>1.9){abutment(terrace,p,fr,stairWidth+.20,'mid-flight');intermediate++;}
  }
  group.userData.stairStructure={abutments:abutments.length,stringers:stringers.length,intermediateBents:intermediate,intermediatePosts:0,system:'Continuous stair ribs, landing joists, masonry bearings and buried strip footings'};
  return {abutments,stringers,root:group};
}
