import * as THREE from 'three';
const PI=Math.PI,TAU=PI*2;
const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
const mix=(a,b,t)=>a+(b-a)*t;
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.8});
export function createFurnishings({M,mesh,box,soft,cyl,beam,tube,sphere,rnd}){
  function vase(p,x,y,z,s=1,material=M.clay){
    const pts=[[.12,0],[.19,.07],[.23,.21],[.21,.34],[.1,.47],[.095,.58]].map(a=>new THREE.Vector2(a[0]*s,a[1]*s));return mesh(new THREE.LatheGeometry(pts,24),material,p,x,y,z);
  }
  function book(p,x,y,z,w=.34,color='#728173',rot=0){return soft(w,.045,.24,mat(color),p,x,y,z,rot,.008);}
  function plant(p,x,y,z,scale=1,tree=false){
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);p.add(g);
    cyl(.27,.43,M.clay,g,0,.215,0,.34);cyl(.30,.035,M.soil,g,0,.43,0);
    if(tree){beam(vec(0,.45,0),vec(.03,2.4,0),.06,M.darkwood,g);for(let i=0;i<21;i++){const a=rnd()*TAU,h=1.1+rnd()*1.5,r=.3+rnd()*.5;beam(vec(0,h-.3,0),vec(Math.cos(a)*r,h,Math.sin(a)*r),.014,M.darkwood,g);const leaf=sphere(Math.cos(a)*r,h,Math.sin(a)*r,.32,.27,.31,M.leaf,g);leaf.rotation.y=a;}}
    else for(let i=0;i<11;i++){const a=i*2.399,r=.2+rnd()*.25,h=.7+rnd()*.6;const leaf=mesh(new THREE.SphereGeometry(1,10,7),M.leaf,g,Math.sin(a)*r,h,Math.cos(a)*r);leaf.scale.set(.12,.41,.047);leaf.rotation.z=Math.sin(a)*.6;leaf.rotation.x=Math.cos(a)*.6;beam(vec(0,.4,0),leaf.position,.013,M.leaf,g);}
    return g;
  }
  function rug(p,x,z,rx,rz,m=M.rug){const o=cyl(1,.025,m,p,x,.055,z);o.scale.x=rx;o.scale.z=rz;return o;}
  function table(p,x,z,r=.75,height=.43,material=M.wood){cyl(r,.075,material,p,x,height,z);cyl(r*.32,height-.08,M.darkwood,p,x,height*.5-.02,z,r*.22);}
  function chair(p,x,z,turn=0,material=M.fabric){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=turn;p.add(g);
    soft(.58,.12,.57,material,g,0,.48,0,0,.08);soft(.6,.52,.13,material,g,0,.78,-.235,0,.09);
    for(const dx of [-.22,.22])for(const dz of [-.2,.2])beam(vec(dx,.43,dz),vec(dx*1.14,.03,dz*1.2),.035,M.darkwood,g);
    return g;
  }
  function loungeChair(p,x,z,turn=0){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=turn;p.add(g);
    const positions=[],uvs=[],indices=[],nu=16,nv=20;
    for(let j=0;j<=nv;j++){const t=j/nv;for(let i=0;i<=nu;i++){const u=i/nu*2-1;positions.push(u*(.57+.10*Math.sin(t*PI)),.44+.69*Math.pow(1-t,3)+u*u*.1,-.53+t*1.3);uvs.push(i/nu,t);}}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;indices.push(a,b,a+1,a+1,b,b+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
    const fabric=M.olive.clone();fabric.side=THREE.DoubleSide;mesh(geo,fabric,g);cyl(.065,.4,M.bronze,g,0,.22,0);for(let i=0;i<4;i++){const a=i*PI/2+.5;beam(vec(0,.14,0),vec(Math.cos(a)*.48,.045,Math.sin(a)*.48),.035,M.bronze,g);}
    soft(.58,.19,.17,M.fabric,g,0,1.05,-.41,0,.08);return g;
  }
  function arcSofa(p,cx,cz,r,start,end,material=M.fabric){
    const n=8;
    for(let i=0;i<n;i++){const a=mix(start,end,(i+.5)/n),w=r*(end-start)/n+.06;const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,turn=-a+PI/2;
      soft(w,.16,1.02,M.darkwood,p,x,.22,z,turn,.07);soft(w-.04,.25,.96,material,p,x,.40,z,turn,.12);
      soft(w,.52,.26,material,p,cx+Math.cos(a)*(r+.39),.73,cz+Math.sin(a)*(r+.39),turn,.12);
      if(i%2===0){soft(.46,.43,.16,i===2?M.olive:material,p,cx+Math.cos(a)*(r+.20),.75,cz+Math.sin(a)*(r+.20),turn+.1,.075);}
      beam(vec(x-.16,.04,z),vec(x-.16,.21,z),.035,M.bronze,p);
    }
  }
  function floorLamp(p,x,z){cyl(.24,.045,M.bronze,p,x,.03,z);beam(vec(x,.04,z),vec(x,1.87,z),.026,M.bronze,p);const shade=mesh(new THREE.ConeGeometry(.28,.34,32,1,true),M.fabric,p,x,1.87,z);shade.material=M.fabric; sphere(x,1.75,z,.12,.075,.12,M.light,p);}
  function shelf(p,x,z,width=5){
    box(width,2.65,.10,M.darkwood,p,x,1.34,z-.18);
    for(let i=0;i<5;i++)box(width,.06,.46,M.wood,p,x,.2+i*.56,z);
    for(let i=0;i<=4;i++)box(.065,2.6,.46,M.wood,p,x-width*.5+i*width/4,1.32,z);
    const colors=['#928871','#5c695a','#aca18c','#535c5d','#c2bba6','#977759'];const materials=colors.map(c=>mat(c));
    for(let row=0;row<4;row++){let bx=x-width/2+.16;while(bx<x+width/2-.14){const w=.045+rnd()*.09,h=.23+rnd()*.20;box(w,h,.23,materials[Math.floor(rnd()*materials.length)],p,bx,.24+row*.56+h*.5,z+.04,rnd()*.05);bx+=w+.027;if(rnd()<.1)bx+=.24;}}
  }
  function ovalLight(p,x,y,z,rx,rz){const pts=[];for(let i=0;i<80;i++){const t=i/80*TAU;pts.push(vec(x+Math.cos(t)*rx,y,z+Math.sin(t)*rz));}tube(pts,.022,M.light,p,true,160);}
  function bedding(p){
    rug(p,-2,.5,3.25,2.2);
    soft(3.35,.24,2.7,M.wood,p,-2,.25,.2,0,.12);soft(3.02,.29,2.45,M.fabric,p,-2,.51,.15,0,.13);
    soft(3.5,1.05,.25,M.fabric,p,-2,.64,-1.28,0,.11);
    for(const x of [-2.77,-1.23]){soft(1.18,.2,.63,M.fabric,p,x,.79,-.55,.05*(x+2),.09);soft(.64,.22,.5,M.olive,p,x,.87,-.79,-.06,.09);}
    const pos=[],uv=[],ind=[],nx=40,nz=32;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/nz,x=(u-.5)*3.13,z=v*1.87-.37;let y=.685+.026*Math.sin(x*16+v*13)+.022*Math.sin(v*22+x*5);y-=Math.pow(Math.max(0,Math.abs(x)-1.38)/.185,1.6)*.20;pos.push(x-2,y,z+.22);uv.push(u*3,v*2);}
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;ind.push(a,b,a+1,a+1,b,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();const m=M.fabric.clone();m.side=THREE.DoubleSide;mesh(g,m,p);
    const throwGeo=g.clone();const at=throwGeo.attributes.position;for(let i=0;i<at.count;i++){at.setZ(i,.72+(at.getZ(i)+.15)*.39);at.setY(i,at.getY(i)+.025);}throwGeo.computeVertexNormals();const tm=M.olive.clone();tm.side=THREE.DoubleSide;mesh(throwGeo,tm,p);
    for(const x of [-4.15,.15]){table(p,x,-.52,.46,.47,M.darkwood);vase(p,x,.52,-.52,.55,M.white);cyl(.15,.015,M.bronze,p,x,.87,-.53);}
    table(p,.55,1.45,.51,.45);book(p,.5,.51,1.38,.30,'#969071');loungeChair(p,1.65,.55,-.4);plant(p,-6,-.01,.65,.9,true);
    const tub=new THREE.Group();tub.position.set(5.2,.10,.4);tub.scale.set(1.38,1,.77);p.add(tub);
    const tp=[[0,0],[.8,0],[.99,.15],[1.02,.53],[1,.67],[.90,.69],[.82,.57],[.78,.2],[0,.16]].map(a=>new THREE.Vector2(...a));mesh(new THREE.LatheGeometry(tp,56),M.white,tub);cyl(.79,.015,M.water,tub,0,.43,0);
    beam(vec(6.68,.05,.35),vec(6.68,.93,.35),.04,M.bronze,p);beam(vec(6.68,.93,.35),vec(6.25,.93,.35),.04,M.bronze,p);
    soft(2.6,.09,.65,M.stone,p,5.1,.92,-2.04);box(2.45,.65,.55,M.wood,p,5.1,.53,-2.04);cyl(.29,.1,M.white,p,5.0,1.00,-2.03);
    const mirror=cyl(.62,.018,M.mirror,p,5.0,1.9,-2.39);mirror.rotation.x=PI/2;
    const partition=soft(.17,2.55,2.1,M.soffit,p,3.22,1.3,-1.8,0,.06);plant(p,6.9,0,.65,.8);
  }

return {vase,plant,rug,table,chair,loungeChair,arcSofa,floorLamp,shelf,ovalLight,bedding,book};
}
