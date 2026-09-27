export const MINI_MAP={width:220,height:190,cx:110,cy:95,scale:2.2};
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const northArrow='<svg class="plan-north" viewBox="0 0 28 49" role="img" aria-label="North arrow"><text x="14" y="9" text-anchor="middle">N</text><path d="M14 15 6 38 14 33 22 38Z" fill="none" stroke="currentColor"/><path d="M14 15 14 33 6 38Z" fill="currentColor"/></svg>';

export function createMapLegend({projects,plan=false,onSelect}){
 const details=document.createElement('details');details.className='map-legend';
 const symbols=plan?[['cut','Walls / screens'],['gallery','Gallery floor'],['path','Garden path'],['stair','Stairs · arrow up'],['planting','Planting'],['tree','Tree canopy'],['water','Water']]:[['route','Gallery route'],['garden','Garden paths / steps'],['person','Your position on foot']];
 details.innerHTML='<summary>Legend</summary><div class="map-legend-content"><ul class="map-symbols">'+symbols.map(([kind,label])=>'<li><span class="map-symbol symbol-'+kind+'" aria-hidden="true"></span><span>'+label+'</span></li>').join('')+'</ul><p class="map-project-heading">NUMBERED PROJECTS</p><ol class="map-project-legend">'+projects.map((p,i)=>({p,i})).filter(({p})=>!plan||p.region!=='terrace').map(({p,i})=>'<li><button type="button" data-project="'+esc(p.id)+'"><span class="map-project-number">'+String(i+1).padStart(2,'0')+'</span><span>'+esc(p.shortTitle)+(p.region==='terrace'?'<small>Roof terrace</small>':'')+'</span></button></li>').join('')+'</ol></div>';
 details.addEventListener('click',event=>{const button=event.target.closest('[data-project]');if(button)onSelect?.(button.dataset.project);});
 return details;
}
export function createMiniMapKey(parent,projects,onSelect){
 const key=document.createElement('div');key.className='mini-map-key';
 key.innerHTML='<div class="map-key-orientation">'+northArrow+'<div class="mini-map-scale" aria-label="Map scale: 50 metres" style="width:'+50*MINI_MAP.scale+'px"><div class="plan-scale-labels"><span>0</span><span>25</span><span>50 m</span></div><div class="plan-scale-bar"></div></div></div>';
 key.append(createMapLegend({projects,onSelect}));parent.append(key);return key;
}
