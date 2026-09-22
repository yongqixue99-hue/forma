import {labelInk,drawSectorLabels} from './chart-readability.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import * as d3 from 'd3';
import {hexbin as makeHexbin} from 'd3-hexbin';
import {fmt} from './data.js';
import {regularGrid,ternaryPosition,hexbinLayout,orderedDates,differenceSegments} from './volume6-data.js';
const unique=a=>[...new Set(a)];
const short=(s,n=8)=>[...String(s)].length>n?[...String(s)].slice(0,n-1).join('')+'…':String(s);
const phase=(p,delay=0,duration=.7)=>1-(1-Math.max(0,Math.min(1,(p-delay)/duration)))**3;
const num=(s,x,y,v,a={},g)=>s.text(x,y,v,{'font-family':'ui-monospace,monospace','font-size':s.fs-1,...a},g);
function texture(s,name,color){const id=`${s.id}-${name}`,p=s.el('pattern',{id,width:5,height:5,patternUnits:'userSpaceOnUse'},s.defs);s.path('M-1,1L1,-1M0,5L5,0M4,6L6,4',{stroke:color,'stroke-width':.55,'stroke-opacity':.45},p);return `url(#${id})`;}
function axes(s,x,y,{left,right,top,bottom,xLabel,yLabel,date=false}){
  y.ticks(4).forEach(v=>{s.line(left,y(v),right,y(v),{'stroke-dasharray':'1 5','stroke-width':.6});num(s,left-7,y(v)+3,fmt(v),{'text-anchor':'end'});});
  x.ticks(date?3:4).forEach(v=>num(s,x(v),bottom+18,date?d3.utcFormat('%m.%d')(v):fmt(v),{'text-anchor':'middle'}));
  if(yLabel)s.text(left,13,short(yLabel,s.compact?23:55),{'font-size':s.fs-2});
  if(xLabel)s.text(right,s.h-5,short(xLabel,s.compact?23:55),{'text-anchor':'end','font-size':s.fs-2});
}
function donut(s,doc){
  const {w,h,theme:t}=s,total=d3.sum(doc.data,r=>r.value),cx=w/2,cy=h/2,radius=Math.min(w*.24,(h-70)/2),inner=radius*.64;
  const arc=d3.arc().innerRadius(inner),g=s.group({transform:`translate(${cx},${cy})`}),marks=[];let a=0;
  doc.data.forEach((r,i)=>{const start=a,end=a+r.value/(total||1)*Math.PI*2;a=end;const col=t.objectColor(r,t.colors[i%t.colors.length]),filled=i<2||t.categorical||t.custom,path=s.path('',{fill:filled?col:texture(s,`donut-${i}`,col),stroke:col,'stroke-width':.6,'data-mark':'donut-sector','data-angle':end-start,'data-value':r.value},g);s.edit(path,r);s.tip(path,`${r.label}\n${r.value} ${doc.unit} · ${fmt(r.value/(total||1)*100)}%`);s.add(p=>path.setAttribute('d',arc({startAngle:start,endAngle:start+(end-start)*phase(p,i*.025,.63),outerRadius:radius})));marks.push({index:i,value:r.value,geometry:{cx,cy,r1:radius,a0:start-Math.PI/2,a1:end-Math.PI/2},label:{visible:false}});});
  const size=Math.min(s.compact?22:28,inner*1.5/(fmt(total).length*.64));
  s.text(cx,cy-3,fmt(total),{'text-anchor':'middle','font-size':size,fill:t.fg});s.text(cx,cy+20,uiText('合计'),{'text-anchor':'middle','font-size':s.fs-1});
  drawSectorLabels(s,marks,doc,{x:14,y:20,w:w-28,h:h-50});s.text(w-14,h-5,doc.unit,{'text-anchor':'end','font-size':s.fs-1});
}

function circlepack(s,doc){
  const {w,h,theme:t}=s,root=d3.hierarchy({children:doc.data}).sum(r=>r.value||0);d3.pack().size([w-36,h-22]).padding(4)(root);
  for(const [i,node]of root.leaves().entries()){const col=t.objectColor(node.data,t.colors[i%t.colors.length]),cx=node.x+18,cy=node.y+7,g=s.group({'data-mark':'packed-circle','data-record-id':node.data._id,'data-value':node.value}),circle=s.circle(cx,cy,node.r,{fill:i<2?col:texture(s,`packed-${i}`,col),stroke:col,'stroke-width':.65},g);s.tip(g,uiMessage`${node.data.label}\n${node.value} ${doc.unit}\n圆面积与数量成正比`);s.growCircle(circle,node.r,i*.025,.65);if(node.r>18){const fg=i<2?(labelInk(col,t.fg)):t.fg;s.text(cx,cy-3,short(node.data.label,Math.max(2,Math.floor(node.r/6))),{'text-anchor':'middle','font-size':s.fs-1,fill:fg},g);num(s,cx,cy+14,fmt(node.value),{'text-anchor':'middle',fill:fg},g);}}
}
function dendrogram(s,doc){
  const {w,h,theme:t}=s,left=20,right=w-(s.compact?77:110),top=18,bottom=h-20;
  const parents=unique(doc.data.map(r=>r.parent)),root=d3.hierarchy({name:uiText('合计'),children:parents.map(parent=>({name:parent,children:doc.data.filter(r=>r.parent===parent).map(r=>({...r,name:r.label}))}))}).sum(r=>r.value||0);
  d3.cluster().size([bottom-top,right-left])(root);const layer=s.group(),max=d3.max(doc.data,r=>r.value);
  root.links().forEach((link,i)=>{const x1=left+link.source.y,y1=top+link.source.x,x2=left+link.target.y,y2=top+link.target.x,path=s.path(`M${x1},${y1}C${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}`,{stroke:t.line,'stroke-width':.8},layer);s.draw(path,link.target.depth*.12+i*.009,.52);});
  root.descendants().forEach((node,i)=>{const x=left+node.y,y=top+node.x,color=node.depth===2?t.colors[parents.indexOf(node.parent.data.name)%t.colors.length]:t.fg,r=node.depth===2?Math.sqrt(node.value/max)*(s.compact?5:7):2.8,dot=s.circle(x,y,r,{fill:node.depth===2?t.bg:color,stroke:color,'stroke-width':1,'data-mark':node.depth===2?'tree-leaf':'tree-node','data-value':node.value},layer);s.growCircle(dot,r,node.depth*.16,.45);s.tip(dot,`${node.data.name}\n${node.value} ${doc.unit}`);if(node.depth===2){s.text(x+11,y+3,short(node.data.name,s.compact?3:5),{fill:t.fg,'font-size':s.fs-2});num(s,w-10,y+3,fmt(node.value),{'text-anchor':'end','font-size':s.fs-2});}else if(node.depth===1){const label=s.text(x,y-10,short(node.data.name,8),{'text-anchor':'middle','font-size':s.fs-1,fill:t.fg});s.tip(label,node.data.name);}});
}
function ternary(s,doc){
  const {w,h,theme:t}=s,groups=unique(doc.data.map(r=>r.group));s.legend(groups.map((label,i)=>({label:short(label,7),color:t.color(i)})),18,12);
  const side=Math.min(w-102,(h-85)*2/Math.sqrt(3)),high=side*Math.sqrt(3)/2,top=42,bottom=top+high,vertices=[[w/2,top],[w/2-side/2,bottom],[w/2+side/2,bottom]],point=row=>ternaryPosition(row,vertices);
  s.path('M'+vertices.map(p=>p.join(',')).join('L')+'Z',{stroke:t.secondary,'stroke-width':.8});
  for(const v of [20,40,60,80]){for(let axis=0;axis<3;axis++){const row1={a:0,b:0,c:0},row2={a:0,b:0,c:0},keys=['a','b','c'];row1[keys[axis]]=row2[keys[axis]]=v;row1[keys[(axis+1)%3]]=100-v;row2[keys[(axis+2)%3]]=100-v;const a=point(row1),b=point(row2);s.line(...a,...b,{'stroke-dasharray':'1 4','stroke-width':.6});}const [x,y]=point({a:v,b:100-v,c:0}),[bx,by]=point({a:0,b:v,c:100-v}),[cx,cy]=point({a:100-v,b:0,c:v});num(s,x-7,y+3,String(v),{'text-anchor':'end','font-size':s.fs-3});num(s,bx,by+13,String(v),{'text-anchor':'middle','font-size':s.fs-3});num(s,cx+7,cy+3,String(v),{'font-size':s.fs-3});}
  ['a','b','c'].forEach((k,i)=>{const [x,y]=vertices[i];const label=s.text(x,y+(i?29:-12),short(doc.axes[k],i?Math.max(4,Math.min(s.compact?7:15,Math.floor((w-side)/(s.fs-1))-2)):s.compact?7:15),{'text-anchor':'middle',fill:t.fg,'font-size':s.fs-1});s.tip(label,doc.axes[k]);});
  doc.data.forEach((r,i)=>{const [x,y]=point(r),col=t.color(groups.indexOf(r.group)),p=s.circle(x,y,s.compact?2.7:3.7,{fill:t.bg,stroke:col,'stroke-width':1,'data-mark':'ternary-point','data-a':r.a,'data-b':r.b,'data-c':r.c});s.tip(p,`${r.label} · ${r.group}\n${doc.axes.a} ${r.a}%\n${doc.axes.b} ${r.b}%\n${doc.axes.c} ${r.c}%`);s.growCircle(p,s.compact?2.7:3.7,i/doc.data.length*.4,.45);});
  s.text(12,h-4,uiText('三成分合计 100%'),{'font-size':s.fs-2});
}
function contour(s,doc){
  const {w,h,theme:t}=s,grid=regularGrid(doc.data),left=44,right=w-20,top=31,bottom=h-42,x=d3.scaleLinear(d3.extent(grid.xs),[left,right]),y=d3.scaleLinear(d3.extent(grid.ys),[bottom,top]);
  axes(s,x,y,{left,right,top,bottom,xLabel:doc.axes.x,yLabel:doc.axes.y});
  const values=grid.rows.map(r=>r.value),lo=d3.min(values),hi=d3.max(values),levels=lo===hi?[lo]:d3.ticks(lo,hi,7).filter(v=>v>lo),color=d3.scaleLinear([lo,lo===hi?lo+1:hi],[t.bg,t.accent]);
  const clip=s.el('clipPath',{id:`${s.id}-contour-bounds`},s.defs);s.rect(left,top,right-left,bottom-top,{},clip);const layer=s.group({'clip-path':`url(#${s.id}-contour-bounds)`});
  const project=d3.geoTransform({point(gx,gy){this.stream.point(left+(gx-.5)/(grid.xs.length-1)*(right-left),bottom-(gy-.5)/(grid.ys.length-1)*(bottom-top));}}),path=d3.geoPath(project);
  const shapes=d3.contours().size([grid.xs.length,grid.ys.length]).thresholds(levels)(values);
  shapes.forEach((shape,i)=>{const p=s.path(path(shape),{fill:color(shape.value),'fill-opacity':.24,stroke:t.accent,'stroke-opacity':.65,'stroke-width':.75,'data-mark':'contour-level','data-value':shape.value},layer);s.tip(p,uiMessage`等值区域 ≥ ${shape.value} ${doc.unit}\n采样点间线性插值`);s.reveal(p,i*.045,.56);});
  grid.rows.forEach(r=>{const p=s.circle(x(r.x),y(r.y),s.compact?.8:1.2,{fill:t.fg,'fill-opacity':.25,'data-mark':'contour-sample'},layer);s.tip(p,`${doc.axes.x}：${r.x}\n${doc.axes.y}：${r.y}\n${r.value} ${doc.unit}`);});
  const legend=s.text(right,14,`${fmt(lo)} — ${fmt(hi)} ${short(doc.unit,6)}`,{'text-anchor':'end','font-size':s.fs-2});s.tip(legend,uiText('等值线之间的区域为插值；采样点可查看原值'));
}
function hexbin(s,doc){
  const {w,h,theme:t}=s,layout=hexbinLayout(doc),pw=Math.min(w-70,(h-76)*1.6),ph=pw/1.6,left=(w-pw)/2+10,right=left+pw,top=28,bottom=top+ph,x=d3.scaleLinear(layout.xd,[left,right]),y=d3.scaleLinear(layout.yd,[bottom,top]);
  axes(s,x,y,{left,right,top,bottom,xLabel:doc.axes.x,yLabel:doc.axes.y});const max=d3.max(layout.bins,b=>b.length),color=d3.scaleLinear([1,max],[t.soft,t.accent]),shape=makeHexbin().radius(doc.binRadius*pw/320).hexagon();
  layout.bins.forEach((bin,i)=>{const col=color(bin.length),g=s.group({transform:`translate(${left+bin.x*pw/320},${top+bin.y*ph/200})`,'data-mark':'hex-bin','data-count':bin.length});const path=s.path(shape,{fill:col,stroke:t.bg,'stroke-width':.7},g);s.tip(path,uiMessage`${bin.length} 个原始样本\n${bin.slice(0,4).map(r=>r.label).join('、')}${bin.length>4?'…':''}`);s.reveal(g,i/layout.bins.length*.3,.6);if(!s.compact&&bin.length>1)num(s,0,3,bin.length,{'text-anchor':'middle',fill:labelInk(col,t.fg),'font-size':8},g);});
  num(s,right,13,`n = ${doc.data.length}`,{'text-anchor':'end','font-size':s.fs-2});s.text(left,h-5,uiMessage`色阶 1–${max} 样本 / 格`,{'font-size':s.fs-2});
}
function step(s,doc){
  const {w,h,theme:t}=s,rows=orderedDates(doc.data),left=43,right=w-22,top=28,bottom=h-38,x=d3.scaleUtc(d3.extent(rows,r=>new Date(r.period)),[left,right]),y=d3.scaleLinear(s.linearDomain(rows.map(r=>r.value),true),[bottom,top]).nice(4);
  axes(s,x,y,{left,right,top,bottom,date:true});const layer=s.group(),line=d3.line().defined(r=>r.value!==null).x(r=>x(new Date(r.period))).y(r=>y(r.value)).curve(d3.curveStepAfter),area=d3.area().defined(r=>r.value!==null).x(r=>x(new Date(r.period))).y0(y(0)).y1(r=>y(r.value)).curve(d3.curveStepAfter);
  s.path(area(rows),{fill:texture(s,'step-fill',t.fg),'fill-opacity':.32},layer);s.path(line(rows),{stroke:t.fg,'stroke-width':1.4,'data-mark':'step-line'},layer);
  rows.forEach(r=>{if(r.value===null)return;const dot=s.circle(x(new Date(r.period)),y(r.value),2.3,{fill:t.bg,stroke:t.accent,'stroke-width':.9,'data-mark':'step-point'} ,layer);s.edit(dot,r,'value');s.tip(dot,`${r.period}\n${r.value} ${doc.unit}`);});s.clipReveal(layer,left-3,top-8,right-left+8,bottom-top+10,0,.82);
  s.text(left,13,uiText('变更后保持'),{'font-size':s.fs-2});
}
function difference(s,doc){
  const {w,h,theme:t}=s,rows=orderedDates(doc.data),left=44,right=w-20,top=35,bottom=h-37,x=d3.scaleUtc(d3.extent(rows,r=>new Date(r.period)),[left,right]),y=d3.scaleLinear(s.linearDomain(rows.flatMap(r=>[r.a,r.b])),[bottom,top]).nice(4);
  s.legend(doc.seriesLabels.map((label,i)=>({label:short(label,8),color:i?t.secondary:t.accent})),left,13);axes(s,x,y,{left,right,top,bottom,date:true});const layer=s.group(),area=d3.area().x(r=>x(r.x)).y0(r=>y(r.a)).y1(r=>y(r.b));
  differenceSegments(rows).forEach(segment=>s.path(area(segment.points),{fill:segment.positive?t.accent:t.fg,'fill-opacity':segment.positive?.18:.09,'data-mark':'difference-area','data-sign':segment.positive?'positive':'negative'},layer));
  ['a','b'].forEach((key,j)=>{s.path(d3.line().x(r=>x(new Date(r.period))).y(r=>y(r[key]))(rows),{stroke:j?t.secondary:t.accent,'stroke-width':j?1:1.5,'stroke-dasharray':j?'4 3':null},layer);rows.forEach(r=>{const p=s.circle(x(new Date(r.period)),y(r[key]),2,{fill:t.bg,stroke:j?t.secondary:t.accent,'stroke-width':.8},layer);s.edit(p,r,key);s.tip(p,uiMessage`${r.period}\n${doc.seriesLabels[j]} ${r[key]} ${doc.unit}\n差值 ${fmt(r.a-r.b)} ${doc.unit}`);});});s.clipReveal(layer,left-4,top-8,right-left+9,bottom-top+12,0,.84);
}
export const volume6Renderers={donut,circlepack,dendrogram,ternary,contour,hexbin,step,difference};
