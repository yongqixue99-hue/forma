import {populationId} from './data-identity.js';
import {labelInk} from './chart-readability.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import * as d3 from 'd3';
import {table9,normalized9,change9} from './volume9-data.js';
import {phase7 as phase,number7 as fmt,num7 as num,label7 as label,texture7 as texture} from './volume7-utils.js';
// Reuse pattern IDs within each scene.
const pattern=(s,name,color)=>{s.basicPatterns??=new Map();if(!s.basicPatterns.has(name))s.basicPatterns.set(name,texture(s,name,color));return s.basicPatterns.get(name);};
import {axes8,extent8,color8,legend8,point8} from './volume8-utils.js';

const color9=(s,i)=>s.theme.name==='mono'&&!s.theme.custom?s.theme.color([0,2,1,3,4][i%5]):color8(s,i);

function yAxis(s,values,{percent=false,zero=true,top=36,bottom=s.h-36,left=48,right=s.w-20}={}){
  const y=d3.scaleLinear(percent?[0,1]:s.linearDomain(values,zero),[bottom,top]).nice(4);
  y.ticks(4).forEach(v=>{s.line(left,y(v),right,y(v),{'stroke-width':.6,'stroke-dasharray':v===0?'':'1 5'});num(s,left-8,y(v)+3,percent?`${Math.round(v*100)}%`:fmt(v),{'text-anchor':'end','font-size':s.fs-2});});
  return{y,left,right,top,bottom};
}
function periods(s,items,x,bottom,{max=6}={}){
  if(!items.length)return;
  const indices=items.length===1?[0]:[...new Set(Array.from({length:Math.min(items.length,max)},(_,i)=>Math.round(i*(items.length-1)/(Math.min(items.length,max)-1))))];
  indices.forEach(i=>{const el=label(s,x(items[i]),bottom+19,items[i],{'text-anchor':'middle','font-size':s.fs-2},s.compact?5:9),field=s.doc.data[0]?.period!==undefined?'period':'label',matches=s.doc.data.filter(d=>d[field]===items[i]);if(matches.length===1)s.edit(el,matches[0],field);});
}
function titles(s,doc,left=48,right=s.w-20,top=14){
  s.editMeta(label(s,left,top,doc.axes?.y||doc.unit,{'font-size':s.fs-2},35),doc.axes?.y?'axes.y':'unit',uiText('Y 轴名称'));
  if(doc.axes?.x)s.editMeta(label(s,right,s.h-3,doc.axes.x,{'font-size':s.fs-2,'text-anchor':'end'},35),'axes.x',uiText('X 轴名称'));
}
function rising(s,rect,base,finish,delay=0){
  s.add(p=>{const value=base+(finish-base)*phase(p,delay,.65);rect.setAttribute('y',Math.min(base,value));rect.setAttribute('height',Math.abs(value-base));});
}
function horizontal(s,rect,start,end,delay=0){
  s.add(p=>{const value=start+(end-start)*phase(p,delay,.65);rect.setAttribute('x',Math.min(start,value));rect.setAttribute('width',Math.abs(value-start));});
}
function seriesLegend(s,names){legend8(s,names.map((name,i)=>({label:name,color:s.theme.groupColor(name,color9(s,i))})));}
function column(s,doc){
  const {theme:t}=s,f=yAxis(s,doc.data.map(d=>d.value),{top:40,bottom:s.h-49}),x=d3.scaleBand(doc.data.map(d=>d.label),[f.left,f.right]).padding(.36),max=d3.max(doc.data,d=>d.value);
  titles(s,doc,f.left,f.right);
  doc.data.forEach((d,i)=>{
    const col=t.objectColor(d,s.dataColor(i,d.value===max?t.accent:t.fg)),delay=i/doc.data.length*.22,w=Math.min(52,x.bandwidth()),px=x(d.label)+(x.bandwidth()-w)/2;
    const r=s.rect(px,0,w,0,{fill:col,'fill-opacity':d.value===max?.9:.78,'data-mark':'basic-column','data-value':d.value});rising(s,r,f.y(0),f.y(d.value),delay);s.edit(r,d);s.tip(r,`${d.label}\n${d.value} ${doc.unit}`);
    const txt=num(s,px+w/2,f.y(d.value)+(d.value<0?13:-7),fmt(d.value),{'text-anchor':'middle',fill:col,'font-size':s.fs-2});s.edit(txt,d,'value');s.reveal(txt,.44+delay,.3);if(x.bandwidth()<22)txt.setAttribute('display','none');
  });
  periods(s,doc.data.map(d=>d.label),v=>x(v)+x.bandwidth()/2,f.bottom+11,{max:s.compact?5:10});
}
function bar(s,doc){
  const {theme:t,w,h}=s,left=s.compact?57:92,right=w-42,top=20,bottom=h-(doc.axes?49:31),x=d3.scaleLinear(s.linearDomain(doc.data.map(d=>d.value),true),[left,right]).nice(4),y=d3.scaleBand(doc.data.map(d=>d.label),[top,bottom]).padding(.38),max=d3.max(doc.data,d=>d.value);
  x.ticks(4).forEach(v=>{s.line(x(v),top,x(v),bottom,{'stroke-width':.6,'stroke-dasharray':v===0?'':'1 5'});num(s,x(v),bottom+17,fmt(v),{'text-anchor':'middle','font-size':s.fs-2});});
  titles(s,doc,left,right);
  doc.data.forEach((d,i)=>{const py=y(d.label),col=t.objectColor(d,s.dataColor(i,d.value===max?t.accent:t.fg)),delay=i/doc.data.length*.24;s.edit(label(s,left-9,py+y.bandwidth()/2+3,d.label,{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1},s.compact?4:7),d,'label');
    const r=s.rect(0,py,0,y.bandwidth(),{fill:col,'fill-opacity':.83,'data-mark':'basic-bar','data-value':d.value});horizontal(s,r,x(0),x(d.value),delay);s.edit(r,d);s.tip(r,`${d.label}\n${d.value} ${doc.unit}`);
    // Negative labels stay at the zero side; category labels remain outside the plot.
    const txt=num(s,d.value<0?x(0)+6:x(d.value)+6,py+y.bandwidth()/2+3,fmt(d.value),{'font-size':s.fs-2,fill:col});s.edit(txt,d,'value');s.reveal(txt,.45+delay,.25);
  });
}
function trend(s,doc,filled=false){
  const {theme:t}=s,f=yAxis(s,doc.data.map(d=>d.value),{zero:filled,top:35,bottom:s.h-(doc.axes?49:35)}),x=d3.scalePoint(doc.data.map(d=>d.period),[f.left,f.right]),layer=s.group(),line=d3.line().defined(d=>d.value!==null).x(d=>x(d.period)).y(d=>f.y(d.value));
  titles(s,doc,f.left,f.right);
  if(filled){const area=d3.area().defined(d=>d.value!==null).x(d=>x(d.period)).y0(f.y(0)).y1(d=>f.y(d.value));s.path(area(doc.data),{fill:t.accent,'fill-opacity':.13,'data-mark':'basic-area'},layer);s.path(area(doc.data),{fill:pattern(s,'basic-area',t.accent),'fill-opacity':.34},layer);}
  s.path(line(doc.data),{stroke:t.accent,'stroke-width':1.65,'stroke-linejoin':'round','data-mark':'basic-line'},layer);
  const last=doc.data.filter(d=>d.value!==null).at(-1);
  doc.data.filter(d=>d.value!==null).forEach(d=>{const r=d===last?3.5:2.1,c=s.circle(x(d.period),f.y(d.value),r,{fill:d===last?t.accent:t.bg,stroke:t.accent,'stroke-width':1,'data-mark':'basic-trend-point','data-value':d.value},layer);s.edit(c,d);s.tip(c,`${d.period}\n${d.value} ${doc.unit}`);});
  s.clipReveal(layer,f.left-5,f.top-8,f.right-f.left+10,f.bottom-f.top+16,0,.78);
  const scan=s.line(f.left,f.top,f.left,f.bottom,{stroke:t.accent,'stroke-dasharray':'2 5','stroke-opacity':.3});s.add(p=>{const px=f.left+(f.right-f.left)*phase(p,0,.78);scan.setAttribute('x1',px);scan.setAttribute('x2',px);scan.setAttribute('opacity',p>=.78?0:1);});
  periods(s,doc.data.map(d=>d.period),x,f.bottom,{max:s.compact?4:6});
}
function xy(s,doc){
  const f=axes8(s,{xd:extent8(doc.data.map(d=>d.x)),yd:extent8(doc.data.map(d=>d.y)),xLabel:doc.axes.x,yLabel:doc.axes.y});
  doc.data.forEach((d,i)=>{const p=point8(s,f.x(d.x),f.y(d.y),{r:3,filled:false,delay:i/doc.data.length*.24,mark:'basic-scatter','data-x':d.x,'data-y':d.y});s.edit(p,d);s.tip(p,`${d.label}\n${doc.axes.x}：${d.x}\n${doc.axes.y}：${d.y}`);});
}
function groupedbarh(s,doc){
  const {w,h,theme:t}=s,table=table9(doc.data),left=s.compact?60:94,right=w-34,top=48,bottom=h-(doc.axes?47:30),x=d3.scaleLinear([0,d3.max(doc.data,d=>d.value)||1],[left,right]).nice(4),row=d3.scaleBand(table.columns,[top,bottom]).padding(.26),inner=d3.scaleBand(table.series,[0,row.bandwidth()]).padding(.22);
  seriesLegend(s,table.series);if(doc.axes)titles(s,doc,left,right,32);
  x.ticks(4).forEach(v=>{s.line(x(v),top,x(v),bottom,{'stroke-width':.6,'stroke-dasharray':'1 5'});num(s,x(v),bottom+17,fmt(v),{'text-anchor':'middle','font-size':s.fs-2});});
  table.rows.forEach((r,i)=>{label(s,left-10,row(r.label)+row.bandwidth()/2+3,r.label,{'text-anchor':'end','font-size':s.fs-2,fill:t.fg},s.compact?4:7);r.values.forEach((v,j)=>{const py=row(r.label)+inner(table.series[j]),col=s.theme.groupColor(table.series[j],color9(s,j)),delay=i/table.rows.length*.2+j*.04,rect=s.rect(left,py,0,inner.bandwidth(),{fill:j<2?col:pattern(s,`grouped-${j}`,col),'data-mark':'basic-grouped-bar','data-value':v});horizontal(s,rect,left,x(v),delay);s.edit(rect,doc.data.find(d=>d.label===r.label&&d.series===table.series[j]));s.tip(rect,`${r.label} · ${table.series[j]}\n${v} ${doc.unit}`);if(inner.bandwidth()>10){const tx=num(s,x(v)+5,py+inner.bandwidth()/2+3,fmt(v),{'font-size':s.fs-3,fill:col});s.reveal(tx,.5+delay,.25);}});});
}
function stackedbar(s,doc){
  const {w,h,theme:t}=s,table=table9(doc.data),left=s.compact?60:94,right=w-37,top=48,bottom=h-(doc.axes?47:30),x=d3.scaleLinear([0,d3.max(table.rows,r=>r.total)||1],[left,right]).nice(4),y=d3.scaleBand(table.columns,[top,bottom]).padding(.4);
  seriesLegend(s,table.series);if(doc.axes)titles(s,doc,left,right,32);
  x.ticks(4).forEach(v=>{s.line(x(v),top,x(v),bottom,{'stroke-width':.6,'stroke-dasharray':'1 5'});num(s,x(v),bottom+17,fmt(v),{'text-anchor':'middle','font-size':s.fs-2});});
  table.rows.forEach((r,i)=>{let start=0;const py=y(r.label),delay=i/table.rows.length*.23;label(s,left-10,py+y.bandwidth()/2+3,r.label,{'text-anchor':'end','font-size':s.fs-2,fill:t.fg},s.compact?4:7);
    r.values.forEach((v,j)=>{const lo=start;start+=v;const hi=start,col=s.theme.groupColor(table.series[j],color9(s,j)),rect=s.rect(x(lo),py,x(hi)-x(lo),y.bandwidth(),{fill:j<2?col:pattern(s,`stacked-${j}`,col),stroke:t.bg,'stroke-width':.8,'data-mark':'basic-stack','data-low':lo,'data-high':hi});s.add(p=>{const q=phase(p,delay,.68);rect.setAttribute('x',x(lo*q));rect.setAttribute('width',x(hi*q)-x(lo*q));});s.edit(rect,doc.data.find(d=>(d.label??d.period)===r.label&&d.series===table.series[j]));s.tip(rect,uiMessage`${r.label} · ${table.series[j]}\n${v} ${doc.unit} · 合计 ${r.total} ${doc.unit}`);});
    const tx=num(s,x(r.total)+5,py+y.bandwidth()/2+3,fmt(r.total),{'font-size':s.fs-2});s.reveal(tx,.5+delay,.25);
  });
}
function percentcolumn(s,doc){
  const table=normalized9(doc),f=yAxis(s,[],{percent:true,top:49,bottom:s.h-(doc.axes?49:36)}),x=d3.scaleBand(table.columns,[f.left,f.right]).padding(.33);seriesLegend(s,table.series);if(doc.axes)titles(s,doc,f.left,f.right,32);
  table.rows.forEach((r,i)=>{let start=0;r.shares.forEach((v,j)=>{const lo=start;start+=v;const hi=start,col=s.theme.groupColor(table.series[j],color9(s,j)),rect=s.rect(x(r.label),f.y(hi),x.bandwidth(),f.y(lo)-f.y(hi),{fill:j<2?col:pattern(s,`percent-${j}`,col),stroke:s.theme.bg,'stroke-width':.8,'data-mark':'basic-percent-column','data-share':v});s.add(p=>{const q=phase(p,i/table.rows.length*.2,.68);rect.setAttribute('y',f.y(hi*q));rect.setAttribute('height',f.y(lo*q)-f.y(hi*q));});s.edit(rect,doc.data.find(d=>(d.label??d.period)===r.label&&d.series===table.series[j]));s.tip(rect,uiMessage`${r.label} · ${table.series[j]}\n${fmt(v*100)}% · 原值 ${fmt(r.values[j])} ${doc.unit}\n当期合计 ${fmt(r.total)} ${doc.unit}`);if(x.bandwidth()>24&&v>.14){const text=num(s,x(r.label)+x.bandwidth()/2,f.y((lo+hi)/2)+3,`${Math.round(v*100)}%`,{'font-size':s.fs-3,'text-anchor':'middle',fill:j<2?(labelInk(col,s.theme.fg)):s.theme.fg});s.reveal(text,.6+i/table.rows.length*.2,.2);}});});
  periods(s,table.columns,v=>x(v)+x.bandwidth()/2,f.bottom,{max:s.compact?5:8});
}
function percentarea(s,doc){
  const table=normalized9(doc),f=yAxis(s,[],{percent:true,top:49}),x=d3.scalePoint(table.columns,[f.left,f.right]),layers=d3.stack().keys(table.series.map((_,i)=>i)).value((r,k)=>r.shares[k])(table.rows),g=s.group();seriesLegend(s,table.series);
  layers.forEach((layer,j)=>{const col=s.theme.groupColor(table.series[j],color9(s,j)),path=d3.area().x(d=>x(d.data.label)).y0(d=>f.y(d[0])).y1(d=>f.y(d[1]));s.path(path(layer),{fill:col,'fill-opacity':j===0?.85:j===1?.65:.22,stroke:s.theme.bg,'stroke-width':.8,'data-mark':'basic-percent-area'},g);if(j>=2)s.path(path(layer),{fill:pattern(s,`share-area-${j}`,col)},g);});
  table.rows.forEach(r=>{const hit=s.rect(x(r.label)-4,f.top,8,f.bottom-f.top,{fill:'transparent'},g);s.tip(hit,uiMessage`${r.label} · 合计 ${fmt(r.total)} ${doc.unit}\n${table.series.map((name,j)=>`${name}：${fmt(r.shares[j]*100)}% · ${fmt(r.values[j])} ${doc.unit}`).join('\n')}`);});
  s.clipReveal(g,f.left-1,f.top-1,f.right-f.left+2,f.bottom-f.top+2,0,.8);periods(s,table.columns,x,f.bottom,{max:s.compact?4:6});
}
function comboline(s,doc){
  const {theme:t}=s,colors=['bar','line'].map((field,i)=>t.objectColor(populationId('business-series:'+field,doc.data),i?t.accent:t.fg)),f=yAxis(s,doc.data.flatMap(d=>[d.bar,d.line]),{top:49,bottom:s.h-(doc.axes?49:36)}),x=d3.scaleBand(doc.data.map(d=>d.period),[f.left,f.right]).padding(.42),cx=v=>x(v)+x.bandwidth()/2;
  if(doc.axes)titles(s,doc,f.left,f.right,32);
  legend8(s,[{label:doc.seriesLabels[0],color:colors[0]},{label:doc.seriesLabels[1],color:colors[1],line:true}]);
  doc.data.forEach((d,i)=>{const rect=s.rect(x(d.period),f.bottom,x.bandwidth(),0,{fill:colors[0],'fill-opacity':.7,'data-mark':'basic-combo-bar','data-value':d.bar});rising(s,rect,f.y(0),f.y(d.bar),i/doc.data.length*.2);s.edit(rect,d,'bar');s.tip(rect,`${d.period} · ${doc.seriesLabels[0]}\n${d.bar} ${doc.unit}`);});
  const g=s.group();s.path(d3.line().defined(d=>d.line!==null).x(d=>cx(d.period)).y(d=>f.y(d.line))(doc.data),{stroke:colors[1],'stroke-width':1.6,'data-mark':'basic-combo-line'},g);
  doc.data.filter(d=>d.line!==null).forEach(d=>{const p=s.circle(cx(d.period),f.y(d.line),2.8,{fill:t.bg,stroke:colors[1],'stroke-width':1},g);s.edit(p,d,'line');s.tip(p,`${d.period} · ${doc.seriesLabels[1]}\n${d.line} ${doc.unit}`);});s.clipReveal(g,f.left-4,f.top-5,f.right-f.left+8,f.bottom-f.top+10,.16,.68);
  periods(s,doc.data.map(d=>d.period),cx,f.bottom,{max:s.compact?4:8});
}
function progress(s,doc){
  const {theme:t,w,h}=s,left=16,right=w-18,top=28,bottom=h-29,slot=(bottom-top)/doc.data.length,scale=d3.scaleLinear([0,Math.max(1,d3.max(doc.data,d=>d.value/d.target))],[left,right]).nice(4);
  label(s,left,12,uiText('完成率'),{'font-size':s.fs-2},10);
  scale.ticks(4).forEach(v=>num(s,scale(v),h-5,`${fmt(v*100)}%`,{'font-size':s.fs-3,'text-anchor':v===0?'start':Math.abs(scale(v)-right)<1?'end':'middle'}));
  doc.data.forEach((d,i)=>{const y=top+i*slot,ratio=d.value/d.target,col=t.objectColor(d,ratio>=1?t.accent:t.fg),delay=i/doc.data.length*.24,barY=y+Math.min(14,slot*.4),barH=Math.min(12,slot*.2),g=s.group({'data-mark':'basic-progress','data-ratio':ratio});
    label(s,left,y+4,d.label,{'font-size':s.fs-1,fill:t.fg},s.compact?8:16,g);
    if(!s.compact)num(s,right-80,y+4,`${fmt(d.value)} / ${fmt(d.target)} ${doc.unit}`,{'text-anchor':'end','font-size':s.fs-2},g);
    num(s,right,y+4,`${fmt(ratio*100)}%`,{'text-anchor':'end','font-size':s.fs-1,fill:col},g);
    s.rect(left,barY,scale(1)-left,barH,{fill:t.fg,'fill-opacity':.055},g);
    const rect=s.rect(left,barY,0,barH,{fill:col,'fill-opacity':.83},g);horizontal(s,rect,left,scale(ratio),delay);
    s.line(scale(1),barY-3,scale(1),barY+barH+3,{stroke:t.secondary,'stroke-width':1},g);
    s.edit(g,d);s.tip(g,uiMessage`${d.label}\n完成 ${d.value} / 目标 ${d.target} ${doc.unit}\n完成率 ${fmt(ratio*100)}%`);
  });
}
function kpi(s,doc){
  const {w,h,theme:t}=s,cols=Math.min(doc.data.length,w>=750||h<190?4:2),rows=Math.ceil(doc.data.length/cols),left=16,top=18,gap=22,cw=(w-left*2-gap*(cols-1))/cols,rh=(h-top*2)/rows;
  doc.data.forEach((d,i)=>{const x=left+(i%cols)*(cw+gap),y=top+Math.floor(i/cols)*rh,change=change9(d),col=t.objectColor(d,i===0?t.accent:t.fg),delay=i*.06;
    if(i%cols)s.line(x-gap/2,y,x-gap/2,y+rh-19,{'stroke-width':.7});
    label(s,x,y+10,d.label,{fill:t.fg,'font-size':s.fs},Math.max(4,Math.floor(cw/s.fs)));
    s.line(x,y+18,x+Math.min(18,cw),y+18,{stroke:col,'stroke-width':1.5,'data-mark':'metric-color','data-record-id':d._id});
    const fs=Math.min(s.compact?27:42,rh*.25,cw/Math.max(3,String(fmt(d.value)).length)*1.5),val=num(s,x,y+rh*.4,fmt(d.value),{'font-size':fs,fill:col,'data-mark':'basic-metric','data-value':d.value});
    s.add(p=>val.textContent=fmt(d.value*phase(p,delay,.62)));
    label(s,x,y+rh*.57,d.metricUnit,{'font-size':s.fs-2},Math.floor(cw/(s.fs-2)));
    const changeText=change.relative===null?uiMessage`差值 ${change.delta>=0?'+':''}${fmt(change.delta)}`:`${change.relative>=0?'+':''}${fmt(Math.round(change.relative*1000)/10)}%`;
    const details=s.group();num(s,x,y+rh*.78,changeText,{'font-size':s.fs-1,fill:col},details);label(s,x,y+rh*.95,uiMessage`前期 ${fmt(d.previous)}`,{'font-size':s.fs-2},Math.floor(cw/(s.fs-2)),details);s.reveal(details,.55+delay,.22);
    s.edit(val,d);s.tip(val,uiMessage`${d.label}\n本期 ${d.value} ${d.metricUnit}\n前期 ${d.previous} ${d.metricUnit}\n差值 ${change.delta.toPrecision(5)} ${d.metricUnit}`);
    if(rows>1&&Math.floor(i/cols)===0)s.line(x,y+rh-1,x+cw,y+rh-1,{'stroke-width':.7});
  });
}
export const volume9Renderers={column,bar,singleline:(s,d)=>trend(s,d),area:(s,d)=>trend(s,d,true),xy,groupedbarh,stackedbar,percentcolumn,percentarea,comboline,progress,kpi};
