import {labelInk} from './chart-readability.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import * as d3 from 'd3';
import {fmt} from './data.js';
import {icicleLayout,polarAreaRadius} from './volume5-data.js';
const unique=a=>[...new Set(a)],short=(v,n=8)=>[...String(v)].length>n?[...String(v)].slice(0,n-1).join('')+'…':String(v);
const mono={'font-family':'ui-monospace, SFMono-Regular, Menlo, monospace','font-variant-numeric':'tabular-nums'};
const num=(s,x,y,v,a={},g)=>s.text(x,y,v,{...mono,'font-size':s.fs-1,...a},g);
const tick=v=>Math.abs(v)>=1e4?d3.format('.3~s')(v):fmt(v);
const phase=(p,d=0,len=.65)=>1-Math.pow(1-Math.max(0,Math.min(1,(p-d)/len)),3);
const set=(e,a)=>Object.entries(a).forEach(([k,v])=>e.setAttribute(k,String(v)));
function hatch(s,id,color,space=5){const p=s.el('pattern',{id:`${s.id}-${id}`,width:space,height:space,patternUnits:'userSpaceOnUse'},s.defs);s.path(`M-1,1 L1,-1 M0,${space} L${space},0 M${space-1},${space+1} L${space+1},${space-1}`,{stroke:color,'stroke-opacity':.4,'stroke-width':.55},p);return `url(#${s.id}-${id})`;}
function yGrid(s,y,left,right){y.ticks(4).forEach(v=>{s.line(left,y(v),right,y(v),{'stroke-dasharray':'1 5','stroke-width':.6});num(s,left-8,y(v)+3,tick(v),{'text-anchor':'end'});});}
function dateAxis(s,x,dates,bottom){const indexes=unique([0,Math.round((dates.length-1)/2),dates.length-1]);indexes.forEach((i,j)=>num(s,x(new Date(dates[i])),bottom+18,dates[i].slice(5).replace('-','.'),{'text-anchor':j===0?'start':j===indexes.length-1?'end':'middle'}));}

function groupedbar(s,doc){
  const {w,h,theme:t}=s,labels=unique(doc.data.map(r=>r.label)),series=unique(doc.data.map(r=>r.series)),left=42,right=w-16;
  const top=s.legend(series.map((label,i)=>({label:short(label,8),color:t.groupColor(label,t.color(i))})),left,13)+20,bottom=h-34;
  const x=d3.scaleBand(labels,[left,right]).padding(.22),sub=d3.scaleBand(series,[0,x.bandwidth()]).padding(.13),y=d3.scaleLinear(s.linearDomain(doc.data.map(r=>r.value),true),[bottom,top]).nice(4),zero=y(0);
  yGrid(s,y,left,right);s.line(left,zero,right,zero,{stroke:t.secondary,'stroke-width':.8});
  const textures=series.map((name,i)=>hatch(s,`bar-${i}`,t.groupColor(name,t.color(i)),4+i*2));
  labels.forEach(label=>{const e=s.text(x(label)+x.bandwidth()/2,bottom+20,short(label,s.compact?4:8),{'text-anchor':'middle','font-size':s.fs-1});s.tip(e,label);});
  doc.data.forEach(r=>{const i=labels.indexOf(r.label),j=series.indexOf(r.series),col=t.objectColor(r,t.color(j)),g=s.group({'data-mark':'grouped-bar','data-value':r.value,'data-zero':zero}),end=y(r.value),bar=s.rect(x(r.label)+sub(r.series),zero,sub.bandwidth(),0,{fill:j===0?col:textures[j],stroke:col,'stroke-width':.7},g);s.tip(g,`${r.label} · ${r.series}\n${r.value} ${doc.unit}`);s.add(p=>{const yy=zero+(end-zero)*phase(p,i*.03+j*.018,.57);set(bar,{y:Math.min(zero,yy),height:Math.abs(zero-yy)});});
    if(sub.bandwidth()>20){const text=num(s,x(r.label)+sub(r.series)+sub.bandwidth()/2,end+(r.value>=0?-7:13),tick(r.value),{'text-anchor':'middle','font-size':s.fs-2,fill:col},g);s.reveal(text,.62+i*.02,.17);}
  });
}
function ribbon(s,doc){
  const {w,h,theme:t}=s,rows=[...doc.data].sort((a,b)=>a.period.localeCompare(b.period)),left=44,right=w-18,top=34,bottom=h-43;
  const x=d3.scaleUtc(d3.extent(rows,r=>new Date(r.period)),[left,right]),y=d3.scaleLinear(s.linearDomain(rows.flatMap(r=>[r.low,r.high])),[bottom,top]).nice(4);
  yGrid(s,y,left,right);dateAxis(s,x,rows.map(r=>r.period),bottom);s.text(left,15,short(doc.intervalLabel,s.compact?18:48),{'font-size':s.fs-1});
  const g=s.group({'data-mark':'ribbon-series','data-domain-min':y.domain()[0],'data-domain-max':y.domain()[1]}),area=d3.area().defined(r=>r.estimate!==null).x(r=>x(new Date(r.period))).y0(r=>y(r.low)).y1(r=>y(r.high)),line=d3.line().defined(r=>r.estimate!==null).x(r=>x(new Date(r.period))).y(r=>y(r.estimate));
  s.path(area(rows),{fill:t.accent,'fill-opacity':.08,stroke:'none','data-mark':'ribbon-band'},g);s.path(area(rows),{fill:hatch(s,'interval',t.accent,6),'data-mark':'ribbon-texture'},g);s.path(line(rows),{stroke:t.accent,'stroke-width':1.6,'data-mark':'ribbon-line'},g);
  rows.forEach(r=>{if(r.estimate===null){s.edit(s.text(x(new Date(r.period)),bottom-4,'×',{'text-anchor':'middle','data-mark':'ribbon-missing'},g),r,'estimate');return;}const point=s.circle(x(new Date(r.period)),y(r.estimate),2.5,{fill:t.bg,stroke:t.accent,'stroke-width':1,'data-mark':'ribbon-observation'},g);s.edit(point,r,'estimate');s.tip(point,uiMessage`${r.period}\n估计 ${r.estimate} ${doc.unit}\n下界 ${r.low} · 上界 ${r.high}`);});
  s.clipReveal(g,left,top-8,right-left,bottom-top+12,0,.83);
}
function heatmap(s,doc){
  const {w,h,theme:t}=s,rows=unique(doc.data.map(r=>r.row)),cols=unique(doc.data.map(r=>r.column)),left=s.compact?37:64,right=w-16,top=29,bottom=h-46;
  const cw=(right-left)/cols.length,ch=(bottom-top)/rows.length,values=doc.data.filter(r=>r.value!==null).map(r=>r.value),lo=Math.min(...values),hi=Math.max(...values),signed=lo<0&&hi>0;
  let domain=lo===hi?[Math.min(0,lo),hi||1]:[lo,hi];if(signed){const max=Math.max(Math.abs(lo),hi);domain=[-max,max];}
  const baseColor=signed?d3.scaleLinear([domain[0],0,domain[1]],[t.fg,t.bg,t.accent]).interpolate(d3.interpolateRgb):d3.scaleLinear(domain,[t.soft,t.accent]).interpolate(d3.interpolateRgb);
  const color=value=>t.valueColor?.(value,domain,baseColor(value))??baseColor(value);
  rows.forEach((r,i)=>s.text(left-8,top+(i+.5)*ch+3,short(r,s.compact?3:6),{'text-anchor':'end','font-size':s.fs-1}));cols.forEach((c,j)=>s.text(left+(j+.5)*cw,top-12,short(c,Math.max(3,Math.min(10,Math.floor(cw/(s.fs*.9))))),{'text-anchor':'middle','font-size':s.fs-2}));
  const missing=hatch(s,'heat-missing',t.secondary,4);
  doc.data.forEach(r=>{const i=rows.indexOf(r.row),j=cols.indexOf(r.column),g=s.group({'data-mark':'heat-cell','data-value':r.value===null?'missing':r.value});const rect=s.rect(left+j*cw+.8,top+i*ch+.8,cw-1.6,ch-1.6,{fill:r.value===null?missing:color(r.value),stroke:t.line,'stroke-width':.35},g);s.tip(g,`${r.row} · ${r.column}\n${r.value===null?uiText('未采集'):`${r.value} ${doc.unit}`}`);
    if(cw>29&&ch>19){const fill=r.value===null?t.secondary:(labelInk(color(r.value),t.fg));num(s,left+(j+.5)*cw,top+(i+.5)*ch+3,r.value===null?'—':tick(r.value),{'text-anchor':'middle','font-size':s.fs-2,fill},g);}
    s.reveal(g,i*.04+j*.015,.5);
  });
  const ly=h-22,lw=Math.min(110,w*.29);for(let i=0;i<36;i++)s.rect(left+lw*i/36,ly,lw/36+.3,5,{fill:color(domain[0]+(domain[1]-domain[0])*i/35)});num(s,left,ly+16,tick(domain[0]));num(s,left+lw,ly+16,tick(domain[1]),{'text-anchor':'end'});s.rect(right-42,ly-1,9,9,{fill:missing,stroke:t.line});s.text(right-28,ly+7,uiText('缺失'),{'font-size':s.fs-2});
}
function pyramid(s,doc){
  const {w,h,theme:t}=s,compact=s.compact,left=compact?36:58,right=w-(compact?36:58),center=w/2,gap=compact?47:64,top=31,bottom=h-29;
  const max=d3.max(doc.data,r=>Math.max(r.left,r.right))||1,length=d3.scaleLinear([0,max],[0,(right-left-gap)/2]).nice(3),rowH=(bottom-top)/doc.data.length,barH=Math.min(22,rowH*.56),x1=center-gap/2,x2=center+gap/2;
  s.text((left+x1)/2,14,short(doc.sideLabels[0],compact?8:16),{'text-anchor':'middle',fill:t.fg,'font-size':s.fs-1});s.text((x2+right)/2,14,short(doc.sideLabels[1],compact?8:16),{'text-anchor':'middle',fill:t.accent,'font-size':s.fs-1});
  length.ticks(2).forEach(v=>{[x1-length(v),x2+length(v)].forEach(x=>{s.line(x,top,x,bottom,{'stroke-dasharray':'1 5'});num(s,x,bottom+18,tick(v),{'text-anchor':'middle','font-size':s.fs-2});});});
  const pattern=hatch(s,'pyramid',t.fg,4);
  doc.data.forEach((r,i)=>{const cy=top+(i+.5)*rowH,g=s.group({'data-mark':'pyramid-row'});s.text(center,cy+3,short(r.label,compact?6:9),{'text-anchor':'middle','font-size':s.fs-1});
    const l=s.rect(x1,cy-barH/2,0,barH,{fill:pattern,stroke:t.fg,'stroke-width':.65,'data-side':'left','data-value':r.left},g),rr=s.rect(x2,cy-barH/2,0,barH,{fill:t.accent,'fill-opacity':.72,'data-side':'right','data-value':r.right},g);
    s.add(p=>{const f=phase(p,i*.025,.65);set(l,{x:x1-length(r.left)*f,width:length(r.left)*f});rr.setAttribute('width',length(r.right)*f);});s.tip(g,`${r.label}\n${doc.sideLabels[0]} ${r.left} ${doc.unit}\n${doc.sideLabels[1]} ${r.right} ${doc.unit}`);
    if(!compact){const a=num(s,x1-length(r.left)-7,cy+3,tick(r.left),{'text-anchor':'end','font-size':s.fs-2},g),b=num(s,x2+length(r.right)+7,cy+3,tick(r.right),{'font-size':s.fs-2,fill:t.accent},g);s.reveal(a,.7,.15);s.reveal(b,.7,.15);}
  });
}
function rose(s,doc){
  const {w,h,theme:t}=s,annotated=!s.compact&&w>h*1.55,cx=annotated?w*.32:w/2,cy=h/2-5,radius=Math.min(annotated?w*.25:w*.33,h*.36),max=d3.max(doc.data,r=>r.value),angle=Math.PI*2/doc.data.length;
  const arc=d3.arc().innerRadius(0),g=s.group({transform:`translate(${cx},${cy})`}),pattern=hatch(s,'rose-area',t.fg,5);
  [max*.25,max*.5,max].forEach(v=>{const r=polarAreaRadius(v,max,radius);s.circle(0,0,r,{fill:'none',stroke:t.line,'stroke-dasharray':'1 4'},g);num(s,5,-r+11,tick(v),{'font-size':s.fs-2},g);});
  doc.data.forEach((r,i)=>{const start=-angle/2+i*angle+.012,end=start+angle-.024,mid=(start+end)/2,rad=polarAreaRadius(r.value,max,radius),emphasis=r.value===max,col=t.objectColor(r,emphasis?t.accent:t.fg);
    const path=s.path(arc({startAngle:start,endAngle:end,outerRadius:rad}),{fill:emphasis?col:t.objectColor(r)?hatch(s,`rose-${i}`,col,5):pattern,'fill-opacity':emphasis?.72:1,stroke:col,'stroke-width':.6,'data-mark':'rose-sector','data-record-id':r._id,'data-value':r.value,'data-radius':rad},g);s.tip(path,`${r.label}\n${r.value} ${doc.unit}`);s.add(p=>path.setAttribute('d',arc({startAngle:start,endAngle:end,outerRadius:rad*Math.sqrt(phase(p,i*.025,.63))})));
    const xx=Math.sin(mid)*(radius+13),yy=-Math.cos(mid)*(radius+13);s.text(xx,yy+3,short(r.label,7),{'font-size':s.fs-2,'text-anchor':Math.abs(xx)<8?'middle':xx>0?'start':'end'},g);
  });
  if(annotated){const lx=w*.65,rw=w-lx-17,step=Math.min(31,(h-55)/doc.data.length);s.text(lx,20,uiText('时段 / 数值'),{'font-size':s.fs-1});doc.data.forEach((r,i)=>{s.text(lx,48+i*step,r.label,{'font-size':s.fs-1});num(s,lx+rw,48+i*step,fmt(r.value),{'text-anchor':'end',fill:t.objectColor(r,r.value===max?t.accent:t.fg)});s.line(lx,56+i*step,lx+rw,56+i*step,{'stroke-width':.5});});}
  s.text(14,h-7,uiMessage`等角度 · 扇区面积 ∝ ${doc.unit}`,{'font-size':s.fs-2});
}
function icicle(s,doc){
  const {w,h,theme:t}=s,layout=icicleLayout(doc.data),left=15,width=w-30,top=38,rootH=22,rowH=(h-top-rootH-37)/2;
  s.text(left,17,uiMessage`合计 ${fmt(layout.total)} ${doc.unit}`,{fill:t.fg,'font-size':s.fs-1});const root=s.rect(left,top,width,rootH,{fill:t.fg,'fill-opacity':.85});s.reveal(root,0,.3);
  layout.groups.forEach((group,i)=>{const col=t.groupColor(group.parent,t.color(i)),g=s.group({'data-mark':'icicle-parent','data-group':group.parent,'data-value':group.value,'data-share':group.width}),x=left+group.x*width,gw=group.width*width;const parent=s.rect(x,top+rootH,gw,rowH,{fill:col,'fill-opacity':1,stroke:t.bg,'stroke-width':.7},g);s.tip(parent,`${group.parent}\n${group.value} ${doc.unit}`);
    if(gw>38){s.text(x+7,top+rootH+20,short(group.parent,Math.max(2,Math.floor(gw/(s.fs)-2))),{fill:labelInk(col,t.fg),'font-size':s.fs},g);num(s,x+7,top+rootH+39,fmt(group.value),{fill:labelInk(col,t.fg),'font-size':s.fs-1},g);}
    const texture=hatch(s,`icicle-${i}`,col,4+i*2);
    group.children.forEach(row=>{const xx=left+row.x*width,ww=row.width*width,yy=top+rootH+rowH,child=s.rect(xx,yy,ww,rowH,{fill:texture,stroke:col,'stroke-width':.65,'data-mark':'icicle-leaf','data-value':row.value},g);s.tip(child,`${group.parent} / ${row.label}\n${row.value} ${doc.unit}`);if(ww>25){const label=s.text(xx+ww/2,yy+rowH*.47,short(row.label,Math.max(2,Math.floor(ww/s.fs))),{'text-anchor':'middle',fill:col,'font-size':s.fs-1},g);s.tip(label,row.label);num(s,xx+ww/2,yy+rowH*.47+17,fmt(row.value),{'text-anchor':'middle',fill:col,'font-size':s.fs-2},g);}});
    s.clipReveal(g,x,top+rootH,gw,rowH*2,.1+i*.045,.72);
  });
  s.text(left,h-7,uiText('一级分类 → 子项 · 宽度代表数量'),{'font-size':s.fs-2});
}
function radar(s,doc){
  const {w,h,theme:t}=s,axes=unique(doc.data.map(r=>r.axis)),series=unique(doc.data.map(r=>r.series));
  const legendY=s.legend(series.map((label,i)=>({label:short(label,8),color:t.color(i)})),15,12),cx=w/2,top=legendY+22,bottom=h-32,cy=(top+bottom)/2,radius=Math.min(w*.31,(bottom-top)/2-17),angle=Math.PI*2/axes.length;
  const coord=(i,v)=>[cx+Math.sin(i*angle)*radius*v/doc.max,cy-Math.cos(i*angle)*radius*v/doc.max],closed=d3.line().curve(d3.curveLinearClosed);
  [.25,.5,.75,1].forEach(f=>s.path(closed(axes.map((_,i)=>coord(i,doc.max*f))),{stroke:t.line,'stroke-width':.65,'stroke-dasharray':f===1?null:'2 4'}));
  axes.forEach((axis,i)=>{const [x,y]=coord(i,doc.max);s.line(cx,cy,x,y,{'stroke-width':.6});const xx=cx+(x-cx)*1.16,yy=cy+(y-cy)*1.16;s.text(xx,yy+3,short(axis,s.compact?4:8),{'text-anchor':Math.abs(xx-cx)<8?'middle':xx>cx?'start':'end','font-size':s.fs-1});});
  [doc.max*.5,doc.max].forEach(v=>num(s,cx+5,coord(0,v)[1]+10,tick(v),{'font-size':s.fs-2}));
  series.forEach((name,j)=>{const rows=axes.map(axis=>doc.data.find(r=>r.series===name&&r.axis===axis)),g=s.group({'data-mark':'radar-series','data-series':name}),path=s.path('',{stroke:t.color(j),'stroke-width':j===0?1.5:1,fill:t.color(j),'fill-opacity':.035,'stroke-dasharray':j===2?'4 3':null},g),dots=rows.map(r=>s.circle(cx,cy,2.3,{fill:t.bg,stroke:t.color(j),'stroke-width':1,'data-mark':'radar-point','data-value':r.value},g));rows.forEach((r,i)=>s.tip(dots[i],`${name} · ${r.axis}\n${r.value} / ${doc.max} ${doc.unit}`));s.add(p=>{const f=phase(p,j*.065,.68);path.setAttribute('d',closed(rows.map((r,i)=>coord(i,r.value*f))));dots.forEach((dot,i)=>{const [x,y]=coord(i,rows[i].value*f);set(dot,{cx:x,cy:y,opacity:f});});});});
  s.text(15,h-7,uiText('逐轴比较 · 面积不代表总分'),{'font-size':s.fs-2});
}
function trajectory(s,doc){
  const {w,h,theme:t}=s,rows=[...doc.data].sort((a,b)=>a.period.localeCompare(b.period)),left=46,right=w-24,top=34,bottom=h-49,x=d3.scaleLinear(s.linearDomain(rows.map(r=>r.x)),[left,right]).nice(4),y=d3.scaleLinear(s.linearDomain(rows.map(r=>r.y)),[bottom,top]).nice(4);
  yGrid(s,y,left,right);x.ticks(s.compact?3:5).forEach(v=>num(s,x(v),bottom+18,tick(v),{'text-anchor':'middle'}));s.text(left,14,short(doc.axes.y,s.compact?22:60),{'font-size':s.fs-1});s.text(right,h-7,short(doc.axes.x,s.compact?22:60),{'text-anchor':'end','font-size':s.fs-1});
  const line=s.path(d3.line().x(r=>x(r.x)).y(r=>y(r.y))(rows),{stroke:t.fg,'stroke-width':1.3,'data-mark':'trajectory-line'});s.draw(line,0,.83);
  rows.forEach((r,i)=>{const end=i===rows.length-1,first=i===0,col=end?t.accent:t.fg,dot=s.circle(x(r.x),y(r.y),end?4:2.7,{fill:end?col:t.bg,stroke:col,'stroke-width':1,'data-mark':'trajectory-point','data-period':r.period});s.tip(dot,`${r.period}\n${doc.axes.x}：${r.x}\n${doc.axes.y}：${r.y}`);s.reveal(dot,i/rows.length*.7,.18);
    if(first||end){const label=s.text(x(r.x)+(end?-8:8),y(r.y)-10,`${first?uiText('起点'):uiText('终点')} ${r.period.slice(5).replace('-','.')}`,{'text-anchor':end?'end':'start',fill:col,'font-size':s.fs-2});s.reveal(label,end?.8:0,.17);}
  });
}
export const volume5Renderers={groupedbar,ribbon,heatmap,pyramid,rose,icicle,radar,trajectory};
