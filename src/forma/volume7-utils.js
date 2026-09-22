import {isEnglish} from './locale.js';
import {equalUnitDomains,measurementDomain} from './axis-policy.js';
import * as d3 from 'd3';
export const clamp7=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const phase7=(p,d=0,len=.72)=>1-(1-clamp7((p-d)/len))**3;
export function short7(v,n=8){
  const chars=[...String(v)];
  if(!isEnglish())return chars.length>n?chars.slice(0,n-1).join('')+'…':String(v);
  // Existing label slots are sized for full-width characters. Latin glyphs
  // can use that same space without losing most of an English category name.
  const width=c=>/[\u0000-\u007f]/.test(c)?(/[MW@]/.test(c)?.85:/[il., :']/.test(c)?.3:.56):1;
  if(chars.reduce((total,c)=>total+width(c),0)<=n)return String(v);
  let text='',used=0;for(const c of chars){if(used+width(c)>n-1)break;text+=c;used+=width(c);}return text+'…';
}
export {formatNumber as number7} from './number-format.js';
import {formatNumber as number7} from './number-format.js';
export const num7=(s,x,y,v,attrs={},parent)=>s.text(x,y,v,{'font-family':'ui-monospace,monospace','font-size':s.fs-1,...attrs},parent);
export function texture7(s,name,color){const id=`${s.id}-${name}`,p=s.el('pattern',{id,width:5,height:5,patternUnits:'userSpaceOnUse'},s.defs);s.path('M-1,1L1,-1M0,5L5,0M4,6L6,4',{stroke:color,'stroke-width':.55,'stroke-opacity':.42},p);return `url(#${id})`;}
export function label7(s,x,y,value,attrs={},limit=8,parent){const el=s.text(x,y,short7(value,limit),attrs,parent);s.tip(el,value);return el;}
export function frame7(s,doc,{date=false,zero=false,values=doc.data.map(d=>d.value),xs=doc.data.map(d=>date?new Date(d.period):d.x),bottom=s.h-36,top=32,left=48,right=s.w-22}={}){
  const xd=d3.extent(xs),yd=s.linearDomain(values,zero),x=(date?d3.scaleUtc():d3.scaleLinear()).domain(date?(+xd[0]===+xd[1]?[+xd[0]-43200000,+xd[1]+43200000]:xd):measurementDomain(xs,{padding:0})).range([left,right]),y=d3.scaleLinear(yd,[bottom,top]).nice(4);
  y.ticks(4).forEach(v=>{s.line(left,y(v),right,y(v),{'stroke-width':.6,'stroke-dasharray':'1 5'});num7(s,left-7,y(v)+3,number7(v),{'text-anchor':'end'});});
  x.ticks(s.w<380?3:4).forEach(v=>num7(s,x(v),bottom+18,date?d3.utcFormat('%m.%d')(v):number7(v),{'text-anchor':'middle'}));return{x,y,left,right,top,bottom};
}
export function spatialScale7(s,rows,{left=46,right=s.w-22,top=28,bottom=s.h-37}={}){
  const domains=equalUnitDomains(rows,{width:right-left,height:bottom-top});
  const x=d3.scaleLinear(domains.x,[left,right]),y=d3.scaleLinear(domains.y,[bottom,top]),scale=(right-left)/(domains.x[1]-domains.x[0]);
  return{x,y,scale,left,right,top,bottom};
}
export function spatialAxes7(s,doc,f){const {x,y,left,right,top,bottom}=f;x.ticks(4).forEach(v=>{s.line(x(v),top,x(v),bottom,{'stroke-width':.5,'stroke-dasharray':'1 5'});num7(s,x(v),bottom+17,number7(v),{'text-anchor':'middle'});});y.ticks(3).forEach(v=>{s.line(left,y(v),right,y(v),{'stroke-width':.5,'stroke-dasharray':'1 5'});num7(s,left-8,y(v)+3,number7(v),{'text-anchor':'end'});});label7(s,left,12,doc.axes.y,{'font-size':s.fs-2},s.compact?21:50);label7(s,right,s.h-3,doc.axes.x,{'font-size':s.fs-2,'text-anchor':'end'},s.compact?21:50);}
