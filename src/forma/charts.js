import {volume14Renderers} from './volume14-charts.js';
import {volume15Renderers} from './volume15-charts.js';
import {volume16Renderers} from './volume16-charts.js';
import {labelFont,labelInk,areaDataLabel} from './chart-readability.js';
import {chartTheme} from './color-semantics.js';
import {volume10Renderers} from './volume10-charts.js';
import {volume11Renderers} from './volume11-charts.js';
import {volume12Renderers} from './volume12-charts.js';
import {volume13Renderers} from './volume13-charts.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {measurementDomain} from './axis-policy.js';
import {renderAnnotations} from './annotation-view.js';
import { volume9Renderers } from './volume9-charts.js';
import { volume8Renderers } from './volume8-charts.js';
import { volume7Renderers } from './volume7-charts.js';
import { spatialRenderers } from './spatial-charts.js';
import { volume6Renderers } from './volume6-charts.js';
import { volume5Renderers } from './volume5-charts.js';
import { volume4Renderers } from './volume4-charts.js';
import { atlasRenderers } from './atlas-charts.js';
import * as d3 from 'd3';
import { sankey, sankeyJustify, sankeyLinkHorizontal } from 'd3-sankey';
import { fmt, validateDocument } from './data.js';
import { findTemplate } from './catalog.js';
import { ridgeDensity } from './density.js';
import { editorialRenderers } from './editorial-charts.js';

const NS='http://www.w3.org/2000/svg';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>1-Math.pow(1-clamp(t),3);
const phase=(p,delay=0,duration=.72)=>ease((p-delay)/duration);
const short=(s,n=10)=>String(s).length>n?String(s).slice(0,n-1)+'…':s;
const uniq=a=>[...new Set(a)];
let instance=0;

export class ChartScene {
  constructor(host,doc,options={}) {
    const report=validateDocument(doc);
    if(!report.valid) throw new Error(report.errors.join('\n'));
    this.host=host;this.doc=doc;this.options=options;this.tracks=[];this.cleanups=[];this.annotationMarks=[];this.p=1;
    this.theme=chartTheme(doc,options);
    this.w=options.width||Math.max(280,host.clientWidth||800);
    this.h=options.height||Math.max(140,host.clientHeight||420);
    this.compact=options.compact??false;this.fs=this.compact?10:12;this.id=`forma-${++instance}`;
    host.replaceChildren();
    this.svg=this.el('svg',{xmlns:NS,viewBox:`0 0 ${this.w} ${this.h}`,width:'100%',height:'100%',role:options.editable?'group':'img','aria-label':uiMessage`${doc.title}。${findTemplate(doc.template).type}。来源：${doc.source.name}`});
    this.svg.setAttribute('style',`display:block;overflow:visible;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;font-size:${this.fs}px;color:${this.theme.fg}`);
    host.append(this.svg);this.el('desc',{},this.svg,`${doc.title} · ${doc.source.name}`);this.defs=this.el('defs');
    this.renderers=renderers;
    renderers[doc.template](this,doc);
    this.render(options.progress??1);
    if(options.interactive!==false) this.installTooltips();
  }
  el(tag,attrs={},parent,content) { const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs)){if(v!==undefined&&v!==null)e.setAttribute(k,String(v));}if(content!==undefined)e.textContent=content;(parent||this.svg)?.append(e);return e; }
  text(x,y,value,attrs={},parent) {
    const numeric=/^[−+\-]?[\d.,%\s]+$/.test(String(value)),size=Math.max(this.compact?8:10,Number(attrs['font-size']??this.fs));
    return this.el('text',{x,y,fill:this.theme.secondary,'font-family':labelFont,...attrs,'font-size':size,...(numeric?{'font-family':labelFont,'font-variant-numeric':'tabular-nums'}:{})},parent,value);
  }
  dataColor(index,fallback=this.theme.fg){return this.options.colorMode==='categorical'||this.options.colorMode!=='emphasis'&&(this.theme.custom||this.theme.categorical)?this.theme.color(index):fallback;}
  line(x1,y1,x2,y2,attrs={},parent) {return this.el('line',{x1,y1,x2,y2,stroke:this.theme.line,'stroke-width':1,...attrs},parent);}
  path(d,attrs={},parent) {return this.el('path',{d,fill:'none',...attrs},parent);}
  circle(cx,cy,r,attrs={},parent) {return this.el('circle',{cx,cy,r,...attrs},parent);}
  rect(x,y,width,height,attrs={},parent) {return this.el('rect',{x,y,width:Math.max(0,width),height:Math.max(0,height),...attrs},parent);}
  group(attrs={},parent) {return this.el('g',attrs,parent);}
  tip(el,text){el.setAttribute('data-tip',text);return el;}
  edit(el,row,field){
    const index=typeof row==='number'?row:row?._id?this.doc.data.findIndex(d=>d._id===row._id):this.doc.data.indexOf(row);
    if(index>=0&&this.doc.data[index]?._id)this.annotationMarks.push({recordId:this.doc.data[index]._id,field:field||(this.doc.data[index].value!==undefined?'value':null),node:el});
    if(this.options.editable&&index>=0&&index<this.doc.data.length){
      el.setAttribute('data-edit-row',index);if(this.doc.data[index]._id)el.setAttribute('data-record-id',this.doc.data[index]._id);if(field)el.setAttribute('data-edit-field',field);
      el.setAttribute('role','button');el.setAttribute('tabindex','0');
      el.setAttribute('aria-label',uiMessage`编辑第 ${index+1} 行${field?' '+(findTemplate(this.doc.template).fields.find(f=>f[0]===field)?.[2]||field):uiText(' 数据')}`);
    }
    return el;
  }
  editMeta(el,path,label){
    if(this.options.editable){el.setAttribute('data-edit-meta',path);el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',uiMessage`编辑${label}`);}
    return el;
  }
  add(fn){this.tracks.push(fn);return fn;}
  draw(el,delay=0,duration=.72){el.setAttribute('pathLength','1');el.setAttribute('stroke-dasharray','1');this.add(p=>{el.setAttribute('stroke-dashoffset',String(1-phase(p,delay,duration)));});}
  reveal(el,delay=0,duration=.35){this.add(p=>el.setAttribute('opacity',String(phase(p,delay,duration))));}
  growCircle(el,r,delay=0,duration=.5){this.add(p=>el.setAttribute('r',String(r*Math.sqrt(phase(p,delay,duration)))));}
  clipReveal(group,x,y,w,h,delay=0,duration=.75){const id=`${this.id}-clip-${this.tracks.length}`;const clip=this.el('clipPath',{id},this.defs);const r=this.rect(x,y,0,h,{},clip);group.setAttribute('clip-path',`url(#${id})`);this.add(p=>r.setAttribute('width',String(w*phase(p,delay,duration))));}
  legend(items,x=18,y=15){let cursor=x,cy=y;items.forEach((it,i)=>{const color=it.color||this.theme.colors[i%this.theme.colors.length];const size=[...String(it.label)].reduce((v,c)=>v+(/[\u2e80-\uffff]/.test(c)?1:.58),0)*this.fs+29;if(cursor>x&&cursor+size>this.w-12){cursor=x;cy+=this.fs+8;}this.circle(cursor,cy-3,3,{fill:color});this.text(cursor+9,cy,it.label);cursor+=size;});return cy+5;}
  linearDomain(values,zero=false){return measurementDomain(values,{zero,padding:0});}
  render(p){this.p=clamp(p);for(const track of this.tracks)track(this.p);if(this.options.annotationAuto!==false)renderAnnotations(this,{doc:this.doc,options:this.options},{fraction:this.p,staticFrame:this.options.annotationStatic===true,interactive:this.options.editable===true});}
  serialize(){return new XMLSerializer().serializeToString(this.svg);}
  installTooltips(){
    const tip=document.createElement('div');tip.className='chart-tooltip';tip.setAttribute('role','tooltip');tip.style.cssText='position:fixed;z-index:1000;pointer-events:none;white-space:pre-line;background:#242424;color:#f8f7f2;padding:10px 13px;border:1px solid #ffffff30;border-radius:2px;box-shadow:0 8px 28px #0002;font:12px/1.7 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;max-width:280px;display:none';(this.host.closest('dialog')||document.body).append(tip);this.tooltip=tip;
    this.move=e=>{const n=e.target.closest('[data-tip]');if(!n){tip.style.display='none';return;}tip.textContent=n.getAttribute('data-tip');tip.style.display='block';tip.style.left=Math.max(8,Math.min(e.clientX+14,window.innerWidth-tip.offsetWidth-12))+'px';tip.style.top=Math.max(8,Math.min(e.clientY+14,window.innerHeight-tip.offsetHeight-12))+'px';};
    this.leave=()=>{tip.style.display='none';};this.svg.addEventListener('pointermove',this.move);this.svg.addEventListener('pointerleave',this.leave);
  }
  destroy(){this.cleanups.forEach(fn=>fn());this.cleanups=[];this.svg.removeEventListener('pointermove',this.move);this.svg.removeEventListener('pointerleave',this.leave);this.tooltip?.remove();this.host.replaceChildren();this.tracks=[];}
}

function cartesian(s,x,y,{bottom,left=42,right=s.w-25,top=30,xTicks,yTicks=4,xFormat=fmt,yFormat=fmt}={}){
  bottom??=s.h-35;
  for(const v of y.ticks(yTicks)){const py=y(v);s.line(left,py,right,py,{'stroke-dasharray':'2 5'});s.text(left-10,py+3,yFormat(v),{'text-anchor':'end'});}
  s.line(left,bottom,right,bottom);
  for(const v of xTicks||x.ticks(5)){s.text(x(v),bottom+22,xFormat(v),{'text-anchor':'middle'});}
}

function tide(s,doc){
  const{w,h,theme:t}=s;const names=uniq(doc.data.map(r=>r.series)),periods=uniq(doc.data.map(r=>r.period));
  const left=43,right=w-(s.compact?28:36),bottom=h-35;
  const legendBottom=s.legend(names.map((label,i)=>({label:short(label,9),color:t.groupColor(label,t.color(i))})),left,12);const top=Math.max(s.compact?32:36,legendBottom+10);
  const x=d3.scalePoint(periods,[left,right]),y=d3.scaleLinear(s.linearDomain(doc.data.map(r=>r.value),true),[bottom,top]).nice(4);
  const pIndices=uniq([0,Math.round((periods.length-1)*.25),Math.round((periods.length-1)*.5),Math.round((periods.length-1)*.75),periods.length-1]);
  cartesian(s,x,y,{left,right,top,bottom,xTicks:pIndices.map(i=>periods[i]),xFormat:p=>short(p,8)});
  const dataMap=new Map(doc.data.map(r=>[JSON.stringify([r.series,r.period]),r]));
  const layer=s.group();
  const area=d3.area().defined(d=>d.value!==null).x(d=>x(d.period)).y0(bottom).y1(d=>y(d.value)).curve(d3.curveMonotoneX);
  const line=d3.line().defined(d=>d.value!==null).x(d=>x(d.period)).y(d=>y(d.value)).curve(d3.curveMonotoneX);
  const grad=s.el('linearGradient',{id:`${s.id}-fill`,x1:0,y1:0,x2:0,y2:1},s.defs);s.el('stop',{offset:'0%','stop-color':t.groupColor(names[0],t.color(0)),'stop-opacity':.045},grad);s.el('stop',{offset:'100%','stop-color':t.groupColor(names[0],t.color(0)),'stop-opacity':0},grad);
  const stripe=s.el('pattern',{id:`${s.id}-stripe`,width:4,height:4,patternUnits:'userSpaceOnUse'},s.defs);s.line(0,0,0,5,{stroke:t.groupColor(names[0],t.color(0)),'stroke-width':.55,opacity:.24},stripe);
  names.forEach((name,i)=>{
    const values=periods.map(period=>dataMap.get(JSON.stringify([name,period]))||{period,value:null});const col=t.groupColor(name,t.color(i));
    if(i===0){s.path(area(values),{fill:`url(#${s.id}-fill)`},layer);s.path(area(values),{fill:`url(#${s.id}-stripe)`},layer);}
    s.path(line(values),{stroke:col,'data-mark':'series-line','stroke-width':i===0?1.55:1,'stroke-linejoin':'round'},layer);
    values.forEach((d,j)=>{if(d.value===null)return;const c=s.circle(x(d.period),y(d.value),s.compact?1.65:2.2,{fill:t.bg,stroke:col,'stroke-width':.85},layer);s.tip(c,`${name} · ${d.period}\n${fmt(d.value)} ${doc.unit}`);if(j===values.length-1){s.circle(x(d.period),y(d.value),4,{fill:col,stroke:t.bg,'stroke-width':2},layer);}});
  });
  s.clipReveal(layer,left-5,top-12,right-left+18,bottom-top+20,0,.78);
  const scan=s.line(left,top-3,left,bottom,{stroke:t.groupColor(names[0],t.color(0)),opacity:.35,'stroke-dasharray':'3 5'});s.add(p=>{const px=left+(right-left)*phase(p,0,.78);scan.setAttribute('x1',px);scan.setAttribute('x2',px);scan.setAttribute('opacity',p>.78?0:.4);});
}

function orbit(s,doc){
  const{w,h,theme:t}=s,annotated=!s.compact&&w>h*1.65,cx=annotated?w*.34:w/2,cy=h/2-5;
  const outer=Math.min(w*.35,(h-74)/2),inner=outer*.42,max=d3.max(doc.data,r=>r.value)||1;
  const radial=d3.scaleLinear([0,max],[inner,outer]),step=Math.PI*2/doc.data.length,g=s.group({transform:`translate(${cx},${cy})`});
  const ticks=uniq([0,...d3.ticks(0,max,4).filter(v=>v>0&&v<max),max]);
  ticks.forEach((v,j)=>{s.circle(0,0,radial(v),{fill:'none',stroke:t.line,'stroke-width':j===0?.75:.5,'stroke-dasharray':j===0?'none':'1 3'},g);});
  s.circle(0,0,outer+7,{fill:'none',stroke:t.line,'stroke-width':.6},g);
  doc.data.forEach((r,i)=>{
    const a=i*step,b=(i+1)*step,mid=(a+b)/2,gap=Math.min(.024,step*.19),col=t.objectColor(r,r.value===max?t.accent:t.fg);
    s.line(Math.sin(mid)*inner,-Math.cos(mid)*inner,Math.sin(mid)*(outer+7),-Math.cos(mid)*(outer+7),{stroke:t.line,'stroke-width':.45},g);
    const arc=d3.arc().innerRadius(inner).outerRadius(radial(r.value)).startAngle(a+gap).endAngle(b-gap);
    const bar=s.path(arc(),{fill:col,'fill-opacity':r.value===max?.45:.11,stroke:col,'stroke-opacity':.78,'stroke-width':.6},g);
    s.tip(bar,`${r.period}\n${fmt(r.value)} ${doc.unit}`);
    const stem=s.line(Math.sin(mid)*inner,-Math.cos(mid)*inner,Math.sin(mid)*radial(r.value),-Math.cos(mid)*radial(r.value),{stroke:col,'stroke-width':.65,'stroke-opacity':.65,'pointer-events':'none'},g);
    const cap=s.circle(Math.sin(mid)*radial(r.value),-Math.cos(mid)*radial(r.value),r.value===max?1.8:.95,{fill:col,'pointer-events':'none'},g);
    s.add(p=>{const f=phase(p,i/doc.data.length*.4,.36),rr=inner+(radial(r.value)-inner)*f;bar.setAttribute('d',arc.outerRadius(rr)());stem.setAttribute('x2',Math.sin(mid)*rr);stem.setAttribute('y2',-Math.cos(mid)*rr);cap.setAttribute('cx',Math.sin(mid)*rr);cap.setAttribute('cy',-Math.cos(mid)*rr);cap.setAttribute('opacity',r.value>0?f:0);});
  });
  [0,.25,.5,.75].forEach(f=>{const a=f*Math.PI*2,idx=Math.min(doc.data.length-1,Math.floor(f*doc.data.length));s.text(cx+Math.sin(a)*(outer+20),cy-Math.cos(a)*(outer+20)+3,short(doc.data[idx].period,7),{'text-anchor':'middle','font-size':s.fs-1});});
  const total=d3.sum(doc.data,r=>r.value);s.text(cx,cy-3,fmt(total),{'text-anchor':'middle',fill:t.fg,'font-size':Math.min(s.compact?27:39,inner*.88),'font-weight':400,'font-family':'Georgia,serif'});
  s.text(cx,cy+24,uiMessage`合计 / ${doc.unit}`,{'text-anchor':'middle','font-size':Math.min(s.fs-1,inner*.3)});
  if(annotated){
    const lx=w*.66,ly=Math.max(28,cy-78),rw=w-18-lx,quarters=Array.from({length:4},(_,q)=>{const a=Math.ceil(q*doc.data.length/4),b=Math.ceil((q+1)*doc.data.length/4);return{a,b,value:d3.sum(doc.data.slice(a,b),r=>r.value)};});
    s.text(lx,ly,uiText('周期区间 / 合计'),{'font-size':s.fs-2});
    quarters.forEach((q,i)=>{const yy=ly+29+i*37;s.text(lx,yy,`${String(q.a+1).padStart(2,'0')} — ${String(q.b).padStart(2,'0')}`,{'font-size':s.fs-1});s.text(w-18,yy,`${fmt(q.value)} ${doc.unit}`,{'text-anchor':'end',fill:t.fg,'font-size':s.fs});s.line(lx,yy+10,w-18,yy+10,{stroke:t.line,'stroke-width':.6});const l=s.line(lx,yy+10,lx+rw*q.value/total,yy+10,{stroke:t.fg,'stroke-width':1.5});s.reveal(l,.3+i*.06,.3);});
    s.circle(lx,ly+192,2,{fill:t.objectColor(doc.data.find(r=>r.value===max),t.accent)});s.text(lx+8,ly+195,uiMessage`峰值 ${fmt(max)} ${doc.unit}`,{'font-size':s.fs-1});
  }
  s.text(12,h-4,uiMessage`径向长度 0 → ${fmt(max)} ${doc.unit} · 强调峰值`,{'font-size':s.fs-1});
}

function alluvial(s,doc){
  const{w,h,theme:t}=s;const names=uniq(doc.data.flatMap(r=>[r.source,r.target]));const layout=sankey().nodeId(d=>d.name).nodeWidth(4).nodePadding(s.compact?14:24).nodeAlign(sankeyJustify).nodeSort(null).extent([[s.compact?55:62,34],[w-(s.compact?55:62),h-36]]);
  const graph=layout({nodes:names.map(name=>({name})),links:doc.data.map(r=>({...r}))});
  const colors=new Map(names.map((name,i)=>[name,t.colors[i%t.colors.length]]));
  const linkPath=sankeyLinkHorizontal();const flows=s.group();
  graph.links.forEach((l,i)=>{
    const color=colors.get(l.source.name),path=linkPath(l);
    const base=s.path(path,{stroke:color,'stroke-width':Math.max(.5,l.width),'stroke-opacity':.085,fill:'none'},flows);s.tip(base,`${l.source.name} → ${l.target.name}\n${fmt(l.value)} ${doc.unit}`);
    const strands=Math.max(2,Math.ceil(l.width/3.7));
    for(let j=0;j<strands;j++){const offset=(j+.5)/strands*l.width-l.width/2,mid=(l.source.x1+l.target.x0)/2; s.path(`M${l.source.x1},${l.y0+offset} C${mid},${l.y0+offset} ${mid},${l.y1+offset} ${l.target.x0},${l.y1+offset}`,{stroke:color,'stroke-width':.45,'stroke-opacity':.38},flows);}
    const border=s.path(path,{stroke:color,'stroke-width':.7,'stroke-opacity':.65},flows);
    const tracer=s.path(path,{stroke:color,'stroke-width':1.2,'stroke-opacity':.7,'stroke-dasharray':'3 70','stroke-linecap':'round'},flows);
    s.add(p=>tracer.setAttribute('stroke-dashoffset',String(-p*260-i*11)));
    s.reveal(border,.05+i*.007,.35);
  });
  s.clipReveal(flows,0,0,w,h,0,.7);
  graph.nodes.forEach((n,i)=>{
    const rect=s.rect(n.x0,n.y0,4,n.y1-n.y0,{fill:colors.get(n.name)});s.tip(rect,uiMessage`${n.name}\n节点流量 ${fmt(n.value)} ${doc.unit}`);s.reveal(rect,.03+i*.018,.3);
    const isLeft=n.depth===0,isRight=n.depth===d3.max(graph.nodes,r=>r.depth);
    const tx=isLeft?n.x0-7:isRight?n.x1+7:n.x0+2;const ty=isLeft||isRight?(n.y0+n.y1)/2:n.y0-8;
    s.text(tx,ty+3,short(n.name,s.compact?5:9),{'text-anchor':isLeft?'end':isRight?'start':'middle',fill:t.fg,'font-size':s.fs-1});
  });
  s.text(10,h-5,uiMessage`带宽 = ${doc.unit} · 中间节点流量守恒`,{'font-size':s.fs-1});
}

function ridges(s,doc){
  const{w,h,theme:t}=s,groups=uniq(doc.data.map(r=>r.group)),annotated=!s.compact&&w>h*1.65;
  const left=s.compact?54:86,right=annotated?w*.78:w-20,top=33,bottom=h-34;
  const distribution=ridgeDensity(groups.map(group=>({group,values:doc.data.filter(r=>r.group===group).map(r=>r.value)})));
  const x=d3.scaleLinear(distribution.domain,[left,right]),max=d3.max(distribution.series,g=>d3.max(g.points,p=>p.density)),step=(bottom-top)/(groups.length+.35),amp=Math.min(step*1.36,top+step-22);
  x.ticks(s.compact?4:6).forEach(v=>{s.line(x(v),top-12,x(v),bottom,{stroke:t.line,'stroke-dasharray':'1 4','stroke-width':.6});s.text(x(v),bottom+20,fmt(v),{'text-anchor':'middle','font-size':s.fs-1});});
  if(annotated)s.text(w-19,12,uiText('中位数 / 四分位区间'),{'text-anchor':'end','font-size':s.fs-2});
  distribution.series.forEach((g,i)=>{
    const baseline=top+(i+1)*step,col=i===0?t.accent:t.fg,group=s.group(),points=g.points.map(p=>({x:p.x,v:p.density}));
    const area=s.path('',{fill:t.bg},group),wash=s.path('',{fill:col,'fill-opacity':.025,'pointer-events':'none'},group);
    const strands=g.points.filter((_,j)=>j%2===0).map(pt=>({pt,line:s.line(x(pt.x),baseline,x(pt.x),baseline,{stroke:col,'stroke-width':.45,'stroke-opacity':.28,'pointer-events':'none'},group)}));
    const outline=s.path('',{stroke:col,'stroke-width':i===0?1.05:.85},group);
    s.line(left,baseline,right,baseline,{stroke:t.line,'stroke-width':.7},group);
    const sorted=[...g.values].sort(d3.ascending),med=d3.quantileSorted(sorted,.5),q1=d3.quantileSorted(sorted,.25),q3=d3.quantileSorted(sorted,.75);
    const peak=g.points.reduce((a,b)=>Math.abs(a.x-med)<Math.abs(b.x-med)?a:b);
    const median=s.line(x(med),baseline,x(med),baseline,{stroke:col,'stroke-width':.8,'stroke-dasharray':'2 2'},group);
    const marker=s.circle(x(med),baseline,2.2,{fill:col,stroke:t.bg,'stroke-width':.8},group);
    s.add(p=>{const f=phase(p,i*.075,.43),shape=d3.area().x(d=>x(d.x)).y0(baseline).y1(d=>baseline-d.v/max*amp*f).curve(d3.curveMonotoneX)(points);area.setAttribute('d',shape);wash.setAttribute('d',shape);outline.setAttribute('d',d3.line().x(d=>x(d.x)).y(d=>baseline-d.v/max*amp*f).curve(d3.curveMonotoneX)(points));strands.forEach(({pt,line})=>line.setAttribute('y2',baseline-pt.density/max*amp*f));const yy=baseline-peak.density/max*amp*f;median.setAttribute('y2',yy);marker.setAttribute('cy',yy);marker.setAttribute('opacity',f);});
    g.values.forEach((v,j)=>{const l=s.line(x(v),baseline+1.5,x(v),baseline+4,{stroke:col,opacity:.4,'stroke-width':.65},group);s.tip(l,`${g.group}\n${fmt(v)} ${doc.unit}`);});
    s.tip(area,uiMessage`${g.group} · ${g.values.length} 个样本\n中位数 ${fmt(med)} ${doc.unit}\n高斯核密度估计 · 共享带宽 ${fmt(distribution.bandwidth)} ${doc.unit}`);
    s.tip(marker,uiMessage`${g.group}\n中位数 ${fmt(med)} ${doc.unit}\n四分位区间 ${fmt(q1)} — ${fmt(q3)} ${doc.unit}`);
    s.text(left-9,baseline-1,short(g.group,s.compact?5:9),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});
    if(step>30)s.text(left-9,baseline+12,`n = ${g.values.length}`,{'text-anchor':'end','font-size':s.fs-3});
    if(annotated){s.text(w-19,baseline-3,fmt(med),{'text-anchor':'end',fill:col,'font-size':s.fs+5,'font-family':'Georgia,serif'});s.text(w-19,baseline+12,`${fmt(q1)} — ${fmt(q3)}`,{'text-anchor':'end','font-size':s.fs-2});}
  });
  s.text(left,12,uiMessage`核密度 · 横轴 / ${doc.unit}`,{'font-size':s.fs-1});
}

function race(s,doc){
  const{w,h,theme:t}=s;const names=uniq(doc.data.map(r=>r.series)),periods=uniq(doc.data.map(r=>r.period));const left=s.compact?52:76,right=w-(s.compact?55:82),top=26,bottom=h-35;
  const x=d3.scalePoint(periods,[left,right]),y=d3.scaleLinear([1,names.length],[top,bottom-12]);
  const frames=periods.map(period=>{const sorted=doc.data.filter(r=>r.period===period).sort((a,b)=>b.value-a.value);return new Map(sorted.map(r=>[r.series,{...r,rank:sorted.findIndex(a=>a.value===r.value)+1}]))});
  const labelPositions=frame=>{const list=names.map(name=>({name,y:y(frame.get(name).rank)})).sort((a,b)=>a.y-b.y);const gap=s.fs+5;for(let i=1;i<list.length;i++)list[i].y=Math.max(list[i].y,list[i-1].y+gap);if(list.at(-1).y>bottom-8){list.at(-1).y=bottom-8;for(let i=list.length-2;i>=0;i--)list[i].y=Math.min(list[i].y,list[i+1].y-gap);}return new Map(list.map(r=>[r.name,r.y]));};
  const leftLabels=labelPositions(frames[0]),rightLabels=labelPositions(frames.at(-1));
  for(let i=1;i<=names.length;i++){s.line(left, y(i),right,y(i),{stroke:t.line,'stroke-dasharray':'2 5'});}
  const lines=s.group();
  names.forEach((name,i)=>{
    const points=frames.map((frame,j)=>({...frame.get(name),x:x(periods[j])}));const color=t.objectColor(points[0],t.color(i));
    const line=d3.line().x(d=>d.x).y(d=>y(d.rank)).curve(d3.curveMonotoneX);
    s.path(line(points),{stroke:color,'stroke-width':s.compact?1.2:1.65,opacity:.9,'data-mark':'race-line','data-series-id':points[0]._seriesId},lines);
    points.forEach(d=>{const c=s.circle(d.x,y(d.rank),s.compact?2.7:3.4,{fill:t.bg,stroke:color,'stroke-width':1,'data-mark':'race-observation','data-series-id':d._seriesId,'data-record-id':d._id},lines);s.tip(c,uiMessage`${name} · ${d.period}\n第 ${d.rank} 名 · ${fmt(d.value)} ${doc.unit}`);});
    const first=points[0],last=points.at(-1);
    if(Math.abs(leftLabels.get(name)-y(first.rank))>1)s.line(left-7,leftLabels.get(name),left,y(first.rank),{stroke:color,'stroke-width':.6});
    if(Math.abs(rightLabels.get(name)-y(last.rank))>1)s.line(right,y(last.rank),right+7,rightLabels.get(name),{stroke:color,'stroke-width':.6});
    s.text(left-9,leftLabels.get(name)+3,short(name,6),{'text-anchor':'end',fill:color});
    const l=s.text(right+9,rightLabels.get(name)+3,`${last.rank}  ${short(name,6)}`,{fill:color});s.reveal(l,.55,.3);
  });
  s.clipReveal(lines,left-6,top-8,right-left+12,bottom-top+20,0,.78);
  periods.forEach(p=>s.text(x(p),bottom+23,short(p,5),{'text-anchor':'middle'}));
  s.text(left,10,uiText('名次 ↑'),{'font-size':s.fs-1});
}

function scatter(s,doc){
  const{w,h,theme:t}=s,annotated=!s.compact&&w>h*1.65,left=43,right=annotated?w*.75:w-25,bottom=h-45;
  const names=uniq(doc.data.map(r=>r.group)),legendBottom=s.legend(names.map(label=>({label:short(label,7)})),left,12),top=Math.max(48,legendBottom+20);
  const padded=values=>{const [a,b]=s.linearDomain(values,true),span=b-a;return[a<0?a-span*.08:a,b>0?b+span*.1:b];};
  const x=d3.scaleLinear(padded(doc.data.map(r=>r.x)),[left,right]).nice(4),y=d3.scaleLinear(padded(doc.data.map(r=>r.y)),[bottom,top]).nice(4);
  const max=d3.max(doc.data,r=>r.size),radius=d3.scaleSqrt([0,max],[0,s.compact?18:30]),colors=new Map(names.map((n,i)=>[n,t.color(i)]));
  cartesian(s,x,y,{left,right,top,bottom,yTicks:3});
  names.forEach((name,i)=>{const pattern=s.el('pattern',{id:`${s.id}-bubble-${i}`,width:4.5,height:4.5,patternUnits:'userSpaceOnUse',patternTransform:`rotate(${i%2?35:-35})`},s.defs);s.line(0,0,0,4.5,{stroke:colors.get(name),'stroke-width':.45,opacity:.27},pattern);});
  const ordered=[...doc.data].sort((a,b)=>b.size-a.size);
  ordered.forEach((d,i)=>{
    const r=radius(d.size),col=colors.get(d.group),delay=i/doc.data.length*.32,c=s.circle(x(d.x),y(d.y),r,{fill:col,'fill-opacity':.025,stroke:col,'stroke-width':.75});
    s.tip(c,`${d.label} · ${d.group}\n${doc.axes.x}：${fmt(d.x)}\n${doc.axes.y}：${fmt(d.y)}\n${doc.axes.size}：${fmt(d.size)}`);s.growCircle(c,r,delay,.42);
    const texture=s.circle(x(d.x),y(d.y),r,{fill:`url(#${s.id}-bubble-${names.indexOf(d.group)})`,'pointer-events':'none'});s.growCircle(texture,r,delay,.42);
    const cross=s.group({'pointer-events':'none'});s.line(x(d.x)-2.5,y(d.y),x(d.x)+2.5,y(d.y),{stroke:col,'stroke-width':.7},cross);s.line(x(d.x),y(d.y)-2.5,x(d.x),y(d.y)+2.5,{stroke:col,'stroke-width':.7},cross);s.reveal(cross,delay,.3);
  });
  if(annotated){
    const lx=w*.81,rw=w-20-lx; s.text(lx,top-8,uiText('面积最大的对象'),{'font-size':s.fs-2});
    ordered.slice(0,Math.max(1,Math.min(3,Math.floor((bottom-top-84)/62)))).forEach((d,i)=>{const yy=top+28+i*62,col=colors.get(d.group);s.text(lx,yy,`${String(i+1).padStart(2,'0')}  ${short(d.label,8)}`,{fill:col,'font-size':s.fs-1});s.text(lx,yy+25,fmt(d.size),{fill:t.fg,'font-family':'Georgia,serif','font-size':23});s.line(lx,yy+37,lx+rw,yy+37,{stroke:t.line,'stroke-width':.6});});
    const keyY=bottom-8,keyX=lx+30;[max,max/4].forEach(v=>{const rr=radius(v);s.circle(keyX,keyY-rr,rr,{fill:'none',stroke:t.secondary,'stroke-width':.65});s.line(keyX,keyY-rr*2,lx+rw,keyY-rr*2,{stroke:t.line,'stroke-width':.5,'stroke-dasharray':'1 3'});s.text(lx+rw,keyY-rr*2-3,fmt(v),{'text-anchor':'end','font-size':s.fs-2});});
  }
  s.text(right,h-3,short(doc.axes.x,s.compact?16:36),{'text-anchor':'end','font-size':s.fs-1});
  s.text(left,top-12,short(doc.axes.y,24),{'font-size':s.fs-1});
  s.text(left,h-3,uiMessage`面积 / ${short(doc.axes.size,s.compact?9:20)}`,{'font-size':s.fs-2});
}

function calendar(s,doc){
  const{w,h,theme:t}=s;const sorted=[...doc.data].sort((a,b)=>a.date.localeCompare(b.date));const start=d3.utcMonday.floor(new Date(sorted[0].date)),end=d3.utcDay.offset(new Date(sorted.at(-1).date),1);const days=d3.utcDay.range(start,end);const nWeeks=Math.ceil(days.length/7);const x0=32;const cell=Math.min((w-x0-10)/nWeeks,(h-65)/7);const gap=cell>10?3:1.5;const y0=(h-cell*7)/2-7;
  const vals=new Map(doc.data.map(r=>[r.date,r.value]));const max=d3.max(doc.data,r=>r.value)||1;
  const color=d3.scaleLinear([0,max],[t.soft,t.color(0)]).interpolate(d3.interpolateLab);
  const pattern=s.el('pattern',{id:`${s.id}-missing`,width:4,height:4,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'},s.defs);s.line(0,0,0,4,{stroke:t.secondary,'stroke-width':1,opacity:.5},pattern);
  let prevMonth=-1;
  days.forEach((date,i)=>{
    const key=date.toISOString().slice(0,10),col=Math.floor(i/7),row=i%7,value=vals.get(key),missing=value==null;
    const inside=key>=sorted[0].date&&key<=sorted.at(-1).date;
    if(!inside)return;
    const r=s.rect(x0+col*cell,y0+row*cell,cell-gap,cell-gap,{rx:.3,fill:missing?`url(#${s.id}-missing)`:color(value),stroke:missing?t.line:'none','stroke-width':.5});
    s.tip(r,`${key}\n${missing?uiText('未采集'):fmt(value)+' '+doc.unit}`);s.reveal(r,col/nWeeks*.55+row*.012,.22);
    if(date.getUTCMonth()!==prevMonth){if(cell*nWeeks>330 || date.getUTCMonth()%2===0)s.text(x0+col*cell,y0-10,uiMessage`${date.getUTCMonth()+1}月`,{'font-size':s.fs-1});prevMonth=date.getUTCMonth();}
  });
  [0,2,4,6].forEach((r,i)=>s.text(x0-10,y0+r*cell+cell*.7,[uiText('一'),uiText('三'),uiText('五'),uiText('日')][i],{'text-anchor':'end','font-size':s.fs-1}));
  const ly=y0+cell*7+22;s.text(x0,ly,`0 ${doc.unit}`,{'font-size':s.fs-1});
  Array.from({length:7},(_,i)=>s.rect(x0+48+i*11,ly-8,9,9,{rx:1,fill:color(max*i/6)}));s.text(x0+132,ly,`${fmt(max)} ${doc.unit}`,{'font-size':s.fs-1});
}

function waterfall(s,doc){
  const{w,h,theme:t}=s;let acc=0;const rows=doc.data.map((r,i)=>{const before=acc;if(r.kind==='total'){if(i===0)acc=r.value;return {...r,start:0,end:r.value};}acc+=r.value;return {...r,start:before,end:acc};});
  const left=40,right=w-16,top=23,bottom=h-34;const x=d3.scaleBand(rows.map(r=>r.label),[left,right]).padding(.3);const y=d3.scaleLinear(s.linearDomain(rows.flatMap(r=>[r.start,r.end]),true),[bottom,top]).nice(4);
  for(const v of y.ticks(4)){s.line(left,y(v),right,y(v),{'stroke-dasharray':'2 5'});s.text(left-8,y(v)+3,fmt(v),{'text-anchor':'end'});}
  rows.forEach((d,i)=>{
    const xx=x(d.label),bw=x.bandwidth(),yy=Math.min(y(d.start),y(d.end)),hh=Math.abs(y(d.start)-y(d.end));const color=d.kind==='total'?t.fg:d.value>=0?t.color(2):t.accent;
    const r=s.rect(xx,yy,bw,hh,{fill:color,rx:0});s.tip(r,uiMessage`${d.label}\n${d.kind==='total'?uiText('总计'):d.value>=0?uiText('增加'):uiText('减少')} ${fmt(Math.abs(d.value))} ${doc.unit}\n累计 ${fmt(d.end)} ${doc.unit}`);
    s.add(p=>{const f=phase(p,i/rows.length*.5,.33);const end=d.start+(d.end-d.start)*f;r.setAttribute('y',Math.min(y(d.start),y(end)));r.setAttribute('height',Math.abs(y(d.start)-y(end)));});
    if(i<rows.length-1){const l=s.line(xx+bw,y(d.end),x(rows[i+1].label),y(d.end),{stroke:t.secondary,'stroke-dasharray':'2 3',opacity:.65});s.reveal(l,i/rows.length*.5+.1,.2);}
    const label=s.text(xx+bw/2,yy-8,`${d.kind==='change'&&d.value>0?'+':''}${fmt(d.value)}`,{'text-anchor':'middle',fill:t.fg,'font-size':s.fs-1});s.reveal(label,i/rows.length*.5+.1,.25);
    s.text(xx+bw/2,bottom+23,short(d.label,4),{'text-anchor':'middle','font-size':s.fs-1});
  });
}

function mosaic(s,doc){
  const{w,h,theme:t}=s,total=d3.sum(doc.data,r=>r.value),root=d3.hierarchy({children:doc.data}).sum(r=>r.value||0).sort((a,b)=>b.value-a.value);
  d3.treemap().size([w-24,h-29]).paddingInner(4).round(true)(root);
  root.leaves().forEach((d,i)=>{
    const x=d.x0+12,y=d.y0+8,ww=d.x1-d.x0,hh=d.y1-d.y0,g=s.group({'data-mark':'mosaic-tile','data-record-id':d.data._id}),col=t.objectColor(d.data,i===1?t.accent:t.fg),reverse=i===0,ink=reverse?(labelInk(col,t.fg)):col;
    const rect=s.rect(x,y,ww,hh,{fill:reverse?col:t.bg,stroke:col,'stroke-width':.65},g);s.tip(rect,`${d.data.label}\n${fmt(d.value)} ${doc.unit} · ${fmt(d.value/total*100)}%`);
    const pattern=s.el('pattern',{id:`${s.id}-tile-${i}`,width:5,height:5,patternUnits:'userSpaceOnUse',patternTransform:`rotate(${i%3===0?0:i%3===1?35:-35})`},s.defs);s.line(0,0,0,5,{stroke:ink,'stroke-width':.45,opacity:reverse?.19:.23},pattern);
    s.rect(x,y,ww,hh,{fill:`url(#${s.id}-tile-${i})`,'pointer-events':'none'},g);
    const content=areaDataLabel(d.data.label,d.value,{x,y,width:ww,height:hh},{share:d.value/total,center:false});
    if(content.visible!==false){const attrs={fill:ink,'font-family':labelFont,stroke:reverse?col:t.bg,'stroke-width':3,'paint-order':'stroke','stroke-linejoin':'round'};content.heading.forEach((line,j)=>s.text(content.x,content.y+j*content.headingLineHeight,line,{...attrs,'font-size':content.headingSize,'font-weight':600},g));s.text(content.x,content.y+content.bodyOffset,content.text,{...attrs,'font-size':content.fontSize},g);}

    s.add(p=>{const f=phase(p,i*.039,.43);g.setAttribute('opacity',f);g.setAttribute('transform',`translate(${x*(1-f)} ${y*(1-f)}) scale(${f||.001})`);});
  });
  s.text(12,h-3,uiMessage`面积 = ${doc.unit} · 标注为占比`,{'font-size':s.fs-1});
}

function chord(s,doc){
  const{w,h,theme:t}=s,names=uniq(doc.data.flatMap(r=>[r.source,r.target])),matrix=names.map(()=>names.map(()=>0));
  doc.data.forEach(r=>{const a=names.indexOf(r.source),b=names.indexOf(r.target);matrix[a][b]=r.value;matrix[b][a]=r.value;});
  const annotated=!s.compact&&w>h*1.65,radius=Math.min(w*(s.compact?.255:.34),h*(s.compact?.32:.36)),cx=annotated?w*.34:w/2,cy=h/2-4;
  const chords=d3.chord().padAngle(.075).sortSubgroups(d3.descending)(matrix),arc=d3.arc().innerRadius(radius).outerRadius(radius+3),ribbon=d3.ribbon().radius(radius-4),g=s.group({transform:`translate(${cx},${cy})`});
  const maxEdge=d3.max(chords,c=>c.source.value),maxNode=d3.max(chords.groups,c=>c.value),tick=d3.tickStep(0,maxNode,5),rr=radius-4;
  chords.forEach((c,i)=>{
    const col=c.source.value===maxEdge?t.accent:t.fg,path=s.path(ribbon(c),{fill:col,'fill-opacity':.025,stroke:col,'stroke-width':.45,'stroke-opacity':.35},g);
    s.tip(path,`${names[c.source.index]} ↔ ${names[c.target.index]}\n${fmt(c.source.value)} ${doc.unit}`);s.reveal(path,.12+i/chords.length*.28,.32);
    const count=Math.max(2,Math.min(26,Math.ceil((c.source.endAngle-c.source.startAngle)*rr/(s.compact?3.5:3))));
    for(let j=0;j<count;j++){const f=(j+.5)/count,a=c.source.startAngle+(c.source.endAngle-c.source.startAngle)*f,b=c.target.endAngle-(c.target.endAngle-c.target.startAngle)*f,line=s.path(`M${Math.sin(a)*rr},${-Math.cos(a)*rr} Q0,0 ${Math.sin(b)*rr},${-Math.cos(b)*rr}`,{stroke:col,'stroke-width':.45,'stroke-opacity':c.source.value===maxEdge?.72:.38,'pointer-events':'none'},g);s.draw(line,.12+i/chords.length*.28+j/count*.08,.4);}
  });
  chords.groups.forEach((c,i)=>{
    const col=t.colors[i%t.colors.length],path=s.path(arc(c),{fill:col},g);s.add(p=>path.setAttribute('d',arc({...c,endAngle:c.startAngle+(c.endAngle-c.startAngle)*phase(p,i*.04,.36)})));
    const outer=s.path(d3.arc().innerRadius(radius+9).outerRadius(radius+9).startAngle(c.startAngle).endAngle(c.endAngle)(),{stroke:col,'stroke-width':.4,opacity:.5},g);
    for(let v=0;v<c.value;v+=tick){const a=c.startAngle+v/c.value*(c.endAngle-c.startAngle);s.line(Math.sin(a)*(radius+6),-Math.cos(a)*(radius+6),Math.sin(a)*(radius+12),-Math.cos(a)*(radius+12),{stroke:col,'stroke-width':.65,opacity:.65},g);}
    const a=(c.startAngle+c.endAngle)/2,x=Math.sin(a)*(radius+23),y=-Math.cos(a)*(radius+23);s.text(x,y+3,short(names[i],s.compact?4:6),{'text-anchor':Math.abs(x)<12?'middle':x<0?'end':'start',fill:col,'font-size':s.fs-1},g);
    s.tip(path,uiMessage`${names[i]}\n节点关联量 ${fmt(c.value)} ${doc.unit}`);
  });
  if(annotated){const lx=w*.67,rw=w-18-lx,step=Math.min(39,(h-72)/names.length),ly=Math.max(22,(h-names.length*step)/2-12);s.text(lx,ly-4,uiMessage`节点关联量 / ${doc.unit}`,{'font-size':s.fs-2});names.forEach((name,i)=>{const yy=ly+23+i*step,col=t.colors[i%t.colors.length],value=d3.sum(matrix[i]);s.circle(lx+2,yy-3,2,{fill:col});s.text(lx+13,yy,short(name,7),{'font-size':s.fs-1});s.text(w-18,yy,fmt(value),{'text-anchor':'end',fill:col,'font-size':s.fs+2,'font-family':'Georgia,serif'});s.line(lx,yy+10,w-18,yy+10,{stroke:t.line,'stroke-width':.5});s.line(lx,yy+10,lx+rw*value/maxNode,yy+10,{stroke:col,'stroke-width':1.2});});}
  s.text(12,h-4,uiMessage`带宽 = ${doc.unit} · 强调最强连接`,{'font-size':s.fs-1});
}

function waffle(s,doc){
  const{w,h,theme:t}=s,size=Math.min((w*.56-23)/10,(h-48)/10),r=size*.31,startX=19+(w*.54-size*10)/2+r,startY=(h-size*10)/2+r;
  const lx=w*.615,rw=w-16-lx,step=Math.min(s.compact?32:51,(h-55)/doc.data.length),ly=(h-doc.data.length*step)/2+13;
  const bands=[];let sum=0;doc.data.forEach((d,i)=>{bands.push({...d,start:sum,end:sum+d.value,color:t.objectColor(d,t.color(i))});sum+=d.value;});
  for(let row=0;row<10;row++){const yy=startY+row*size;s.line(startX-r-4,yy,startX+9*size+r+4,yy,{stroke:t.line,'stroke-width':.45,opacity:.55});if(row===0||row===4||row===9)s.text(startX-r-8,yy+2.5,String((row+1)*10),{'text-anchor':'end','font-size':s.fs-3});}
  for(let i=0;i<100;i++){
    const x=startX+(i%10)*size,y=startY+Math.floor(i/10)*size,g=s.group({transform:`translate(${x},${y})`});
    for(const b of bands){const overlap=Math.min(i+1,b.end)-Math.max(i,b.start);if(overlap<=0)continue;const offset=Math.max(0,b.start-i),sector=d3.arc().innerRadius(0).outerRadius(r).startAngle(offset*Math.PI*2).endAngle((offset+overlap)*Math.PI*2),mark=s.path(sector(),{fill:b.color},g);s.tip(mark,uiMessage`${b.label}\n${fmt(b.value)}%\n每个圆点代表 1 个百分点；小数按扇形面积分色`);}
    s.reveal(g,Math.floor(i/10)*.041+(i%10)*.008,.32);
  }
  bands.forEach((d,i)=>{const yy=ly+i*step;s.circle(lx,yy-2,2.4,{fill:d.color});s.text(lx+9,yy+1,short(d.label,s.compact?4:9),{fill:t.fg,'font-size':s.fs-1});s.text(w-16,yy+1,`${fmt(d.value)}%`,{'text-anchor':'end',fill:d.color,'font-family':'Georgia,serif','font-size':s.compact?13:19});s.line(lx,yy+11,lx+rw,yy+11,{stroke:t.line,'stroke-width':.6});const l=s.line(lx,yy+11,lx+rw*d.value/100,yy+11,{stroke:d.color,'stroke-width':1.6});s.reveal(l,i*.07,.4);});
  s.text(16,h-3,uiText('每点 1% · 100 个百分点'),{'font-size':s.fs-1});
}

function dumbbell(s,doc){
  const{w,h,theme:t}=s;const left=s.compact?78:114,right=w-58,top=32,bottom=h-32;const x=d3.scaleLinear(s.linearDomain(doc.data.flatMap(r=>[r.before,r.after]),true),[left,right]).nice();const y=d3.scalePoint(doc.data.map(r=>r.label),[top+10,bottom-14]);
  x.ticks(4).forEach(v=>{s.line(x(v),top,x(v),bottom,{stroke:t.line,'stroke-dasharray':'2 5'});s.text(x(v),bottom+21,fmt(v),{'text-anchor':'middle'});});
  s.circle(left+3,10,3,{fill:t.bg,stroke:t.color(0)});s.text(left+12,14,uiText('改变前'));s.circle(left+76,10,3,{fill:t.color(0)});s.text(left+85,14,uiText('改变后'));
  doc.data.forEach((d,i)=>{
    const yy=y(d.label),a=x(d.before),b=x(d.after),color=d.after>=d.before?t.color(0):t.accent;
    s.text(left-10,yy+3,short(d.label,s.compact?6:10),{'text-anchor':'end',fill:t.fg});
    const line=s.line(a,yy,b,yy,{stroke:color,'stroke-width':1.1,'stroke-opacity':.7});const before=s.circle(a,yy,3.5,{fill:t.bg,stroke:color,'stroke-width':1});const after=s.circle(b,yy,3.5,{fill:color});
    s.text(w-9,yy+3,`${d.after-d.before>=0?'+':''}${fmt(d.after-d.before)}`,{'text-anchor':'end',fill:color,'font-size':s.fs-1,'font-family':'ui-monospace,monospace'});
    [line,before,after].forEach(e=>s.tip(e,uiMessage`${d.label}\n改变前 ${fmt(d.before)} ${doc.unit}\n改变后 ${fmt(d.after)} ${doc.unit}\n变化 ${d.after-d.before>=0?'+':''}${fmt(d.after-d.before)} ${doc.unit}`));
    s.add(p=>{const f=phase(p,i*.05,.5);const bx=a+(b-a)*f;line.setAttribute('x2',bx);after.setAttribute('cx',bx);});
  });
}

const renderers={tide,orbit,alluvial,ridges,race,scatter,calendar,waterfall,mosaic,chord,waffle,dumbbell,...editorialRenderers,...atlasRenderers,...volume4Renderers,...volume5Renderers,...volume6Renderers,...volume7Renderers,...volume8Renderers,...volume9Renderers,...volume10Renderers,...volume11Renderers,...volume12Renderers,...volume13Renderers,...volume14Renderers,...volume15Renderers,...volume16Renderers,...spatialRenderers};
export const createChart=(host,doc,options)=>new ChartScene(host,doc,options);
