import {TERRACE_SPECS} from './navigation-config.js';
import {BALCONY_SPECS} from './balcony-layout.js';

export const LOUNGE_STATIONS=BALCONY_SPECS.map(s=>s.t);
export const DEFINED_ENTRIES=[
  {id:'arrival',name:'Main entrance',t:0,side:-1,half:.020,kind:'arrival'},
  {id:'bridge-south',name:'Courtyard bridge entrance',t:0,side:1,half:.016,kind:'bridge'},
  {id:'garden-west',name:'West garden entrance',t:.29,side:1,half:.012,kind:'garden'},
  {id:'bridge-north',name:'Upper timber bridge entrance',t:.548,side:1,half:.016,kind:'bridge'},
  {id:'garden-east',name:'East garden entrance',t:.79,side:1,half:.012,kind:'garden'},
  ...TERRACE_SPECS.map(s=>({id:s.id+'-entry',name:s.name+' entrance',t:s.t-.017,side:-1,half:.006,kind:'stair'}))
];
export const FACADE_OPENINGS=[...DEFINED_ENTRIES,...BALCONY_SPECS.map(s=>({id:s.id,t:s.t,side:-1,half:s.half,kind:'lounge'}))];
const wrap=t=>(t%1+1)%1;
export function isFacadeOpening(t,side){t=wrap(t);return FACADE_OPENINGS.some(e=>e.side===side&&Math.min(Math.abs(t-e.t),1-Math.abs(t-e.t))<e.half+1e-8);}
export function facadeCuts(count=260){return [...new Set([0,1,...Array.from({length:count-1},(_,i)=>(i+1)/count),...FACADE_OPENINGS.flatMap(e=>[wrap(e.t-e.half),wrap(e.t+e.half)])])].sort((a,b)=>a-b);}
