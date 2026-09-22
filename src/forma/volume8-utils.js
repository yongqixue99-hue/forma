import {uiText,uiMarkup,uiMessage} from './locale.js';
import * as d3 from 'd3';
import {phase7,number7,label7,short7} from './volume7-utils.js';
export {phase7 as phase8,number7 as fmt8,label7 as label8,short7 as short8};
export function extent8(values,{zero=false,pad=.09}={}){let [a,b]=d3.extent(values.filter(Number.isFinite));if(a===undefined)return[0,1];if(zero){a=Math.min(a,0);b=Math.max(b,0);}if(a===b){const d=Math.abs(a)*.1||1;return zero&&pad===0?[0,d]:[a-d,b+d];}const delta=(b-a)*pad;return[a-delta,b+delta];}
export const color8=(s,i)=>s.theme.custom||s.theme.categorical?s.theme.color(i):[s.theme.accent,s.theme.fg,s.theme.color(2),s.theme.color(4),s.theme.secondary][i%5];
export function annotation8(s,text){label7(s,54,33,text,{'font-size':s.fs-2},Math.floor((s.w-72)/(s.fs-2)*1.35));}
export function point8(s,x,y,{color=s.theme.accent,shape=0,r=2.8,delay=0,filled=true,mark='science-observation',...attrs}={}){
  const g=s.group({transform:`translate(${x},${y})`}),symbol=[d3.symbolCircle,d3.symbolSquare,d3.symbolTriangle,d3.symbolDiamond,d3.symbolCross][shape%5],p=s.path(d3.symbol(symbol,Math.PI*r*r)(),{fill:filled?color:s.theme.bg,stroke:color,'stroke-width':.9,'data-mark':mark,...attrs},g);
  s.add(progress=>{const q=phase7(progress,delay,.55);p.setAttribute('transform',`scale(${Math.sqrt(q)})`);p.setAttribute('opacity',q);});return p;
}
export function legend8(s,items){const left=54,slot=(s.w-left-10)/items.length;items.forEach((item,i)=>{const color=item.color||color8(s,i);if(item.line)s.line(left+i*slot,30,left+i*slot+14,30,{stroke:color,'stroke-width':1.4,'stroke-dasharray':item.dash||''});else point8(s,left+i*slot+2,30,{color,shape:i,r:2.5,filled:i%2===0,mark:'science-legend'});label7(s,left+i*slot+(item.line?20:10),33,item.label,{'font-size':s.fs-2,fill:color},Math.max(4,Math.floor((slot-(item.line?25:15))/(s.fs-2))));});}
export function axes8(s,{xd,yd,xLabel='',yLabel='',logX=false,percentX=false,percentY=false,left=54,right=s.w-18,top=53,bottom=s.h-47,xTicks,yTicks,invertY=false}={}){
  const x=(logX?d3.scaleLog():d3.scaleLinear()).domain(xd).range([left,right]),y=d3.scaleLinear(yd,invertY?[top,bottom]:[bottom,top]);
  const xt=xTicks||(logX?x.ticks().filter(v=>Math.abs(Math.log10(v)-Math.round(Math.log10(v)))<1e-8):x.ticks(s.w<390?3:5));let ticks=xTicks!==undefined?xTicks:xt.length?xt:[xd[0],xd[1]];if(ticks.length>6)ticks=ticks.filter((_,i)=>i%Math.ceil(ticks.length/6)===0);
  (yTicks||y.ticks(4)).forEach(v=>{s.line(left,y(v),right,y(v),{'stroke-width':.6,'stroke-dasharray':'1 5'});s.text(left-8,y(v)+3,percentY?`${number7(v*100)}%`:number7(v),{'text-anchor':'end','font-size':s.fs-2,'font-family':'ui-monospace,monospace'});});
  ticks.forEach(v=>{s.line(x(v),bottom,x(v),bottom+4,{'stroke-width':.7});s.text(x(v),bottom+17,percentX?`${number7(v*100)}%`:number7(v),{'text-anchor':'middle','font-size':s.fs-2,'font-family':'ui-monospace,monospace'});});
  s.line(left,bottom,right,bottom,{'stroke-width':.8});const yl=label7(s,left,13,yLabel,{'font-size':s.fs-2},Math.floor((s.w-72)/(s.fs-2)));const xl=label7(s,right,s.h-4,xLabel,{'font-size':s.fs-2,'text-anchor':'end'},Math.floor((s.w-28)/(s.fs-2)));
  if(s.doc.axes?.x===xLabel)s.editMeta(xl,'axes.x',uiText('X 轴名称'));if(s.doc.axes?.y===yLabel)s.editMeta(yl,'axes.y',uiText('Y 轴名称'));
  return{x,y,left,right,top,bottom};
}
export function ref8(s,f,value,{vertical=false,color=s.theme.secondary,dash='3 4',mark='science-reference'}={}){return vertical?s.line(f.x(value),f.top,f.x(value),f.bottom,{stroke:color,'stroke-dasharray':dash,'stroke-width':.9,'data-mark':mark}):s.line(f.left,f.y(value),f.right,f.y(value),{stroke:color,'stroke-dasharray':dash,'stroke-width':.9,'data-mark':mark});}
export function interval8(s,x,y1,y2,{color=s.theme.accent,delay=0,cap=4,mark='science-interval'}={}){const g=s.group({'data-mark':mark});s.line(x,y1,x,y2,{stroke:color,'stroke-width':1.2},g);s.line(x-cap,y1,x+cap,y1,{stroke:color,'stroke-width':1.2},g);s.line(x-cap,y2,x+cap,y2,{stroke:color,'stroke-width':1.2},g);s.add(p=>{const q=phase7(p,delay,.6),mid=(y1+y2)/2;g.setAttribute('transform',`translate(0,${mid*(1-q)}) scale(1,${q})`);g.setAttribute('opacity',q);});return g;}
