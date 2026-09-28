import {labelInk} from './chart-readability.js';
import {chartTextWidth} from './text-wrap.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import * as d3 from 'd3';
import {fmt} from './data.js';
import {histogramBins,empiricalDistribution} from './atlas-data.js';

const unique = values => [...new Set(values)];
const short = (value,n=7) => [...String(value)].length>n?[...String(value)].slice(0,n-1).join('')+'…':String(value);
const phase = (p,delay=0,duration=.58) => 1-Math.pow(1-Math.max(0,Math.min(1,(p-delay)/duration)),3);
const mono = {'font-family':'ui-monospace, SFMono-Regular, Menlo, monospace','font-variant-numeric':'tabular-nums'};
const set = (element,attributes) => Object.entries(attributes).forEach(([key,value])=>element.setAttribute(key,String(value)));

function number(s,x,y,value,attrs={},parent) {
  return s.text(x,y,value,{...mono,'font-size':s.fs-1,...attrs},parent);
}
function hatch(s,name,color,spacing=5) {
  const id=`${s.id}-${name}`,pattern=s.el('pattern',{id,width:spacing,height:spacing,patternUnits:'userSpaceOnUse'},s.defs);
  s.path(`M-1,1 L1,-1 M0,${spacing} L${spacing},0 M${spacing-1},${spacing+1} L${spacing+1},${spacing-1}`,{stroke:color,'stroke-width':.55,'stroke-opacity':.35},pattern);
  return `url(#${id})`;
}
function horizontalAxis(s,x,y,{top=y,ticks=4,format=fmt,grid=true}={}) {
  x.ticks(ticks).forEach(value=>{
    const px=x(value);
    if(grid)s.line(px,top,px,y,{'stroke-width':.55,'stroke-dasharray':'1 4'});
    s.line(px,y,px,y+4,{stroke:s.theme.secondary,'stroke-width':.6});
    number(s,px,y+17,format(value),{'text-anchor':'middle'});
  });
  s.line(x.range()[0],y,x.range()[1],y,{stroke:s.theme.secondary,'stroke-width':.65});
}

function histogram(s,doc) {
  const {w,h,theme:t}=s,left=37,right=w-18,top=30,bottom=h-42;
  const values=doc.data.map(row=>row.value),distribution=histogramBins(values,doc.binCount??12);
  const x=d3.scaleLinear(distribution.domain,[left,right]);
  const y=d3.scaleLinear([0,d3.max(distribution.bins,bin=>bin.count)||1],[bottom,top]).nice(3);
  const highest=d3.max(distribution.bins,bin=>bin.count), texture=hatch(s,'histogram-hatch',t.fg,4);
  y.ticks(3).filter(Number.isInteger).forEach(value=>{
    s.line(left,y(value),right,y(value),{'stroke-width':.55,'stroke-dasharray':'1 5'});
    number(s,left-8,y(value)+3,fmt(value),{'text-anchor':'end'});
  });
  s.text(left,13,uiText('频数 / 个'),{'font-size':s.fs-1});
  number(s,right,13,`n = ${values.length}`,{'text-anchor':'end'});
  distribution.bins.forEach((bin,i)=>{
    const xx=x(bin.low)+.75,width=Math.max(.1,x(bin.high)-x(bin.low)-1.5),height=bottom-y(bin.count),highlight=bin.count===highest;
    const group=s.group({'data-mark':'histogram-bin','data-count':bin.count,'data-low':bin.low,'data-high':bin.high});
    const fill=s.rect(xx,bottom,width,0,{fill:highlight?t.accent:texture,stroke:highlight?t.accent:t.fg,'stroke-width':.6},group);
    const cap=s.line(xx,y(bin.count),xx+width,y(bin.count),{stroke:highlight?t.accent:t.fg,'stroke-width':1.2},group);
    s.tip(group,uiMessage`${fmt(bin.low)} ≤ 观测值 ${i===distribution.bins.length-1?'≤':'<'} ${fmt(bin.high)} ${doc.unit}\n${bin.count} 个样本 · ${fmt(bin.count/values.length*100)}%`);
    s.add(progress=>{const f=phase(progress,i/distribution.bins.length*.25,.48);set(fill,{y:bottom-height*f,height:height*f});set(cap,{y1:bottom-height*f,y2:bottom-height*f,opacity:bin.count?f:0});});
    if(highlight){const text=number(s,xx+width/2,y(bin.count)-7,fmt(bin.count),{'text-anchor':'middle',fill:t.accent});s.reveal(text,.64,.22);}
  });
  values.forEach((value,i)=>{
    const rug=s.line(x(value),bottom+4,x(value),bottom+8,{stroke:t.fg,'stroke-width':.5,opacity:.2,'data-mark':'histogram-observation'});
    s.add(progress=>rug.setAttribute('opacity',String(.3*phase(progress,.25+i/values.length*.18,.3))));
  });
  horizontalAxis(s,x,bottom,{top,grid:false});
  s.text(left,h-4,uiMessage`等宽 ${fmt(distribution.width)} ${doc.unit} / 区间`,{'font-size':s.fs-2});
}

function ecdf(s,doc) {
  const {w,h,theme:t}=s,left=40,right=w-20,top=25,bottom=h-39;
  const values=doc.data.map(row=>row.value),points=empiricalDistribution(values),domain=s.linearDomain(values);
  const pad=(domain[1]-domain[0])*.05, x=d3.scaleLinear([domain[0]-pad,domain[1]+pad],[left,right]);
  const y=d3.scaleLinear([0,1],[bottom,top]);
  [0,.25,.5,.75,1].forEach(value=>{
    s.line(left,y(value),right,y(value),{stroke:value===.5?t.secondary:t.line,'stroke-width':value===.5?.7:.55,'stroke-dasharray':value===.5?'3 4':'1 5'});
    number(s,left-8,y(value)+3,`${value*100}%`,{'text-anchor':'end','font-size':s.fs-2});
  });
  number(s,right,12,`n = ${values.length}`,{'text-anchor':'end'});
  const marks=s.group(), stairPoints=[{value:x.domain()[0],probability:0},...points,{value:x.domain()[1],probability:1}];
  const path=d3.line().x(row=>x(row.value)).y(row=>y(row.probability)).curve(d3.curveStepAfter)(stairPoints);
  s.path(path,{stroke:t.fg,'stroke-width':1.35,'stroke-linejoin':'miter','data-mark':'ecdf'},marks);
  for(const row of points){
    const dot=s.circle(x(row.value),y(row.probability),1.5,{fill:t.bg,stroke:t.fg,'stroke-width':.7,'data-mark':'ecdf-step','data-cumulative':row.probability},marks);
    s.tip(dot,uiMessage`≤ ${fmt(row.value)} ${doc.unit}\n${row.count} / ${values.length} 个样本 · ${fmt(row.probability*100)}%`);
  }
  const median=d3.median(values), atMedian=values.filter(value=>value<=median).length/values.length;
  s.line(x(median),y(atMedian),x(median),bottom,{stroke:t.accent,'stroke-width':.8,'stroke-dasharray':'2 4'},marks);
  s.circle(x(median),y(atMedian),3,{fill:t.accent,stroke:t.bg,'stroke-width':1.2},marks);
  const medianLabel=number(s,Math.min(right-3,Math.max(left+3,x(median)+7)),y(atMedian)-10,uiMessage`中位 ${fmt(median)}`,{fill:t.accent,'font-size':s.fs-2});
  s.reveal(medianLabel,.68,.2); s.clipReveal(marks,left-4,top-5,right-left+9,bottom-top+10,0,.78);
  horizontalAxis(s,x,bottom,{top,grid:false});
  s.text(left,h-3,uiMessage`观测值 / ${doc.unit} · 台阶为经验累计占比`,{'font-size':s.fs-2});
}

function cohort(s,doc) {
  const {w,h,theme:t}=s,compact=s.compact||w<420,left=compact?54:83,right=w-16,top=43,bottom=h-30;
  const cohorts=unique(doc.data.map(row=>row.cohort)), ages=d3.range(d3.max(doc.data,row=>row.age)+1);
  const cellW=(right-left)/ages.length, rowH=(bottom-top)/cohorts.length;
  const colors=d3.interpolateRgb(t.bg,t.fg),future=hatch(s,'cohort-future',t.secondary,5);
  s.text(12,14,uiText('同一批人的再次到访'),{'font-size':s.fs-1,fill:t.fg});
  number(s,right,14,'0 → 100%',{'text-anchor':'end','font-size':s.fs-2});
  ages.forEach(age=>number(s,left+(age+.5)*cellW,top-9,`M${age}`,{'text-anchor':'middle','font-size':s.fs-2}));
  cohorts.forEach((cohortName,i)=>{
    const rows=doc.data.filter(row=>row.cohort===cohortName),cy=top+i*rowH;
    number(s,left-8,cy+rowH*.55,cohortName.slice(2).replace('-','.'),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});
    if(!compact&&rowH>32)number(s,left-8,cy+rowH*.55+13,`n=${rows[0].size}`,{'text-anchor':'end','font-size':s.fs-3});
    ages.forEach(age=>{
      const row=rows.find(row=>row.age===age),xx=left+age*cellW+1,yy=cy+1,ww=cellW-2,hh=rowH-2;
      if(!row){s.rect(xx,yy,ww,hh,{fill:future,'fill-opacity':.33,stroke:t.line,'stroke-width':.4,'data-mark':'cohort-future'});return;}
      const ratio=row.active/row.size,g=s.group({'data-mark':'cohort-cell','data-ratio':ratio});
      s.rect(xx,yy,ww,hh,{fill:colors(ratio),stroke:t.bg,'stroke-width':.7},g);
      const value=number(s,xx+ww/2,yy+hh/2+3,compact?String(Math.round(ratio*100)):`${Math.round(ratio*1000)/10}%`,{'text-anchor':'middle','font-size':Math.min(s.fs-1,ww/(compact?2.1:4)),fill:labelInk(colors(ratio),t.fg)},g);
      if(age===rows.at(-1).age)s.line(xx+2,yy+hh-2,xx+ww-2,yy+hh-2,{stroke:t.accent,'stroke-width':1.8},g);
      s.tip(g,uiMessage`${cohortName} 加入 · 第 ${age} 月\n${fmt(row.active)} / ${fmt(row.size)} 人 = ${fmt(ratio*100)}%`);
      s.reveal(g,i*.04+age*.022,.42);
      value.setAttribute('data-ratio-label',String(ratio*100));
    });
  });
  s.line(left,bottom+10,left+12,bottom+10,{stroke:t.accent,'stroke-width':1.8});
  s.text(left+18,bottom+13,uiText('最近观察'),{'font-size':s.fs-2});
  const futureWidth=chartTextWidth(uiText('尚未发生'),Math.max(10,s.fs-2));s.rect(right-futureWidth-17,bottom+5,10,10,{fill:future});s.text(right,bottom+13,uiText('尚未发生'),{'font-size':s.fs-2,'text-anchor':'end'});
}

function bullet(s,doc) {
  const {w,h,theme:t}=s,compact=s.compact||w<420,left=compact?65:92,right=w-36,bottom=h-29;
  const x=d3.scaleLinear([0,d3.max(doc.data,row=>row.high)],[left,right]);
  const bandColors=[d3.interpolateRgb(t.bg,t.fg)(.055),d3.interpolateRgb(t.bg,t.fg)(.12),d3.interpolateRgb(t.bg,t.fg)(.21)];
  let lx=left,legendY=14;
  doc.bandLabels.forEach((label,i)=>{
    const display=short(label,compact?3:8),labelWidth=Math.max(50,display.length*(s.fs-2)+23);
    if(lx>left&&lx+labelWidth>right){lx=left;legendY+=18;}
    s.rect(lx,legendY-7,8,8,{fill:bandColors[i],stroke:t.line,'stroke-width':.4});s.text(lx+12,legendY,display,{'font-size':s.fs-2});lx+=labelWidth;
  });
  const top=Math.max(41,legendY+21),rowH=(bottom-top)/doc.data.length;
  doc.data.forEach((row,i)=>{
    const cy=top+(i+.5)*rowH,height=Math.min(25,rowH*.6),group=s.group();
    s.text(left-10,cy+3,short(row.label,compact?5:8),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});
    [0,row.low,row.mid].forEach((start,j)=>s.rect(x(start),cy-height/2,x([row.low,row.mid,row.high][j])-x(start),height,{fill:bandColors[j]},group));
    const achieved=row.value>=row.target,color=t.objectColor(row,achieved?t.accent:t.fg),bar=s.rect(left,cy-height*.16,0,height*.32,{fill:color,'data-mark':'bullet-value','data-value':row.value},group);
    s.add(progress=>bar.setAttribute('width',String((x(row.value)-left)*phase(progress,i*.055,.53))));
    const target=s.line(x(row.target),cy-height/2-4,x(row.target),cy+height/2+4,{stroke:t.objectColor(row,t.fg),'stroke-width':1.1,'data-mark':'bullet-target','data-target':row.target},group);s.reveal(target,.45+i*.03,.24);
    s.tip(group,uiMessage`${row.label}\n实际 ${fmt(row.value)} / 目标 ${fmt(row.target)} ${doc.unit}\n${doc.bandLabels.map((label,j)=>`${label} ${fmt([0,row.low,row.mid][j])}–${fmt([row.low,row.mid,row.high][j])}`).join('；')}`);
    number(s,w-13,cy+3,fmt(row.value),{'text-anchor':'end',fill:color});
  });
  horizontalAxis(s,x,bottom,{grid:false});
  s.line(12,h-9,12,h-1,{stroke:t.fg,'stroke-width':1.1});s.text(19,h-3,uiText('目标'),{'font-size':s.fs-2});
}

function funnel(s,doc) {
  const {w,h,theme:t}=s,compact=s.compact||w<420,left=compact?70:104,right=w-51,top=28,bottom=h-27;
  const x=d3.scaleLinear([0,doc.data[0].value],[left,right]),rowH=(bottom-top)/doc.data.length;
  const texture=hatch(s,'funnel',t.fg,4);
  x.ticks(compact?3:5).forEach(value=>{s.line(x(value),top-2,x(value),bottom,{'stroke-dasharray':'1 5','stroke-width':.5});number(s,x(value),top-10,fmt(value),{'text-anchor':'middle','font-size':s.fs-2});});
  doc.data.forEach((row,i)=>{
    const cy=top+(i+.39)*rowH,height=Math.min(17,rowH*.44),last=i===doc.data.length-1,color=t.objectColor(row,last?t.accent:t.fg);
    number(s,12,cy+3,String(row.step).padStart(2,'0'),{'font-size':s.fs-3});
    s.text(left-9,cy+3,short(row.label,compact?4:7),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});
    const group=s.group({'data-mark':'funnel-step','data-record-id':row._id,'data-value':row.value});
    const bar=s.rect(left,cy-height/2,0,height,{fill:last?color:t.objectColor(row)?hatch(s,`funnel-${i}`,color,4):texture,stroke:color,'stroke-width':.65},group);
    s.add(progress=>bar.setAttribute('width',String((x(row.value)-left)*phase(progress,i*.075,.39))));
    number(s,w-12,cy+3,fmt(row.value),{'text-anchor':'end',fill:color});
    const previous=i?doc.data[i-1].value:undefined,ratio=previous>0?row.value/previous*100:null;
    if(i>0)number(s,left,cy-height/2-5,ratio===null?uiText('上一步为零 · —'):`↓ ${fmt(ratio)}%`,{'font-size':s.fs-3,fill:last?t.accent:t.secondary});
    s.tip(group,uiMessage`${row.label}\n${fmt(row.value)} ${doc.unit}\n占首步 ${fmt(row.value/doc.data[0].value*100)}%${i?uiMessage` · 上一步转化 ${ratio===null?uiText('未定义'):`${fmt(ratio)}%`}`:''}`);
  });
  s.line(left,bottom,right,bottom,{'stroke-width':.6});
  s.text(12,h-4,uiText('所有条长共用从零开始的刻度'),{'font-size':s.fs-2});
}

function sunburst(s,doc) {
  const {w,h,theme:t}=s,compact=s.compact||w<420,annotated=!compact&&w>h*1.7;
  const cx=annotated?w*.32:w*.5,cy=h*.49,outer=Math.min(annotated?w*.26:w*.36,(h-51)/2),inner=outer*.38,middle=outer*.65;
  const parents=unique(doc.data.map(row=>row.parent)),total=d3.sum(doc.data,row=>row.value);
  const grouped=parents.map(parent=>({parent,value:d3.sum(doc.data.filter(row=>row.parent===parent),row=>row.value),children:doc.data.filter(row=>row.parent===parent)}));
  const highlight=grouped.reduce((a,b)=>a.value>=b.value?a:b).parent,group=s.group({transform:`translate(${cx},${cy})`});
  let angle=-Math.PI*.16;
  grouped.forEach((parent,i)=>{
    const start=angle,end=start+parent.value/total*Math.PI*2,col=t.groupColor(parent.parent,parent.parent===highlight?t.accent:t.fg);
    const parentPath=s.path('',{fill:col,'fill-opacity':parent.parent===highlight?.92:.76-i*.1,stroke:t.bg,'stroke-width':1.2,'data-mark':'sunburst-parent','data-group':parent.parent,'data-value':parent.value},group);
    s.tip(parentPath,uiMessage`${parent.parent} · 合计 ${fmt(parent.value)} ${doc.unit}\n占总量 ${fmt(parent.value/total*100)}%`);
    s.add(progress=>parentPath.setAttribute('d',d3.arc().innerRadius(inner).outerRadius(middle-1).startAngle(start).endAngle(start+(end-start)*phase(progress,i*.035,.5))()||''));
    let childAngle=start;
    parent.children.forEach((row,j)=>{
      const childStart=childAngle,childEnd=childStart+row.value/total*Math.PI*2;
      const base=s.path('',{fill:col,'fill-opacity':parent.parent===highlight?.17:.035,stroke:col,'stroke-width':.6,'data-mark':'sunburst-leaf','data-value':row.value},group);
      const cap=s.path('',{fill:'none',stroke:col,'stroke-width':1},group);
      const pattern=s.path('',{fill:hatch(s,`sunburst-${i}-${j}`,col,5+j),stroke:'none'},group);
      s.add(progress=>{const f=phase(progress,.2+i*.032+j*.017,.52),endAngle=childStart+(childEnd-childStart)*f;const arc=d3.arc().innerRadius(middle+1).outerRadius(outer).startAngle(childStart+.004).endAngle(Math.max(childStart+.004,endAngle-.004));const path=arc()||'';set(base,{d:path});set(pattern,{d:path});set(cap,{d:d3.arc().innerRadius(outer).outerRadius(outer).startAngle(childStart).endAngle(endAngle)()||''});});
      s.tip(base,uiMessage`${parent.parent} / ${row.label}\n${fmt(row.value)} ${doc.unit} · 总量的 ${fmt(row.value/total*100)}%`);
      s.tip(pattern,uiMessage`${parent.parent} / ${row.label}\n${fmt(row.value)} ${doc.unit} · 总量的 ${fmt(row.value/total*100)}%`);
      const mid=(childStart+childEnd)/2;
      if(!compact&&childEnd-childStart>.19){const label=s.text(Math.sin(mid)*(middle+outer)/2,-Math.cos(mid)*(middle+outer)/2+3,short(row.label,4),{'text-anchor':'middle',fill:col,'font-size':s.fs-2},group);s.reveal(label,.76,.2);}
      childAngle=childEnd;
    });
    const mid=(start+end)/2,labelRadius=outer+13;
    const label=s.text(Math.sin(mid)*labelRadius,-Math.cos(mid)*labelRadius+3,short(parent.parent,4),{'text-anchor':'middle',fill:col,'font-size':s.fs-1},group);s.reveal(label,.67,.22);
    angle=end;
  });
  s.text(cx,cy+3,fmt(total),{'text-anchor':'middle',fill:t.fg,'font-family':'Georgia,serif','font-size':Math.min(compact?28:40,inner*.85)});
  s.text(cx,cy+Math.min(22,inner*.6),uiMessage`合计 / ${doc.unit}`,{'text-anchor':'middle','font-size':Math.min(s.fs-2,inner*.26)});
  if(annotated){const lx=w*.65,yy=cy-grouped.length*21;
    s.text(lx,yy-14,uiText('分类 / 总量中的份额'),{'font-size':s.fs-2});
    grouped.forEach((row,i)=>{const y=yy+i*43,col=t.groupColor(row.parent,row.parent===highlight?t.accent:t.fg);s.line(lx,y+26,w-20,y+26,{'stroke-width':.6});s.text(lx,y+11,row.parent,{fill:col});number(s,w-20,y+11,`${fmt(row.value/total*100)}%`,{'text-anchor':'end',fill:col});number(s,lx,y+23,uiMessage`${row.children.length} 个子项 · ${fmt(row.value)} ${doc.unit}`,{'font-size':s.fs-3});});
  }
  s.text(12,h-3,uiText('内环 = 分类 · 外环 = 子项 · 角度 = 占比'),{'font-size':s.fs-2});
}

function gantt(s,doc) {
  const {w,h,theme:t}=s,compact=s.compact||w<420,left=compact?62:99,right=w-36,top=36,bottom=h-29;
  const domain=[d3.min(doc.data,row=>new Date(row.start)),d3.max(doc.data,row=>new Date(row.end))];
  const x=d3.scaleUtc(domain,[left,right]),rowH=(bottom-top)/doc.data.length;
  const longest=doc.data.reduce((a,b)=>Date.parse(a.end)-Date.parse(a.start)>=Date.parse(b.end)-Date.parse(b.start)?a:b).label;
  x.ticks(compact?3:6).forEach(date=>{s.line(x(date),top-4,x(date),bottom,{'stroke-dasharray':'1 5','stroke-width':.65});number(s,x(date),19,d3.utcFormat('%m.%d')(date),{'text-anchor':'middle','font-size':s.fs-2});});
  doc.data.forEach((row,i)=>{
    const cy=top+(i+.5)*rowH,xx=x(new Date(row.start)),width=x(new Date(row.end))-xx,height=Math.min(14,rowH*.43),col=row.label===longest?t.accent:t.fg;
    s.line(left,cy,right,cy,{'stroke-width':.5});
    s.text(left-9,cy+3,short(row.label,compact?4:8),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});
    const group=s.group({'data-mark':'gantt-task'}),base=s.rect(xx,cy-height/2,0,height,{fill:t.bg,stroke:col,'stroke-width':.8,'data-mark':'gantt-duration','data-days':(Date.parse(row.end)-Date.parse(row.start))/86400000},group);
    const completed=s.rect(xx,cy-height/2,0,height,{fill:col,'fill-opacity':.84,'data-mark':'gantt-progress','data-progress':row.progress},group);
    s.add(progress=>{base.setAttribute('width',String(width*phase(progress,i*.052,.49)));completed.setAttribute('width',String(width*row.progress/100*phase(progress,.2+i*.052,.45)));});
    s.tip(group,uiMessage`${row.label}\n${row.start} → ${row.end}（不含结束日）\n${(Date.parse(row.end)-Date.parse(row.start))/86400000} 天 · 完成 ${fmt(row.progress)}%`);
    number(s,w-12,cy+3,`${fmt(row.progress)}%`,{'text-anchor':'end','font-size':s.fs-2,fill:col});
  });
  s.line(left,bottom,right,bottom,{'stroke-width':.65});
  s.text(12,h-3,uiText('空框 = 计划区间 · 填充 = 完成进度'),{'font-size':s.fs-2});
}

function ledger(s,doc) {
  const {w,h,theme:t}=s,compact=s.compact||w<420,left=14,right=w-17,top=36,bottom=h-32;
  const labels=unique(doc.data.map(row=>row.label)),periods=unique(doc.data.map(row=>row.period));
  const valueX=w*.43,changeX=w*.66,trendLeft=w*.72,trendRight=right-4,rowH=(bottom-top)/labels.length;
  const maximum=d3.max(doc.data,row=>row.value)||1,latestValues=labels.map(label=>doc.data.filter(row=>row.label===label).at(-1).value),strongest=d3.max(latestValues);
  s.text(left,16,uiText('内容'),{'font-size':s.fs-2});
  s.text(valueX,16,uiText('最新值'),{'text-anchor':'end','font-size':s.fs-2});
  s.text(changeX,16,uiText('较期初'),{'text-anchor':'end','font-size':s.fs-2});
  s.text(trendLeft,16,uiText('月度轨迹'),{'font-size':s.fs-2});s.line(left,top-9,right,top-9,{stroke:t.secondary,'stroke-width':.7});
  labels.forEach((label,i)=>{
    const rows=periods.map(period=>doc.data.find(row=>row.label===label&&row.period===period));
    const first=rows[0].value,last=rows.at(-1).value,change=first===0?null:(last-first)/first*100,cy=top+(i+.5)*rowH;
    const col=last===strongest?t.accent:t.fg,group=s.group({'data-mark':'ledger-row'});
    s.text(left,cy+3,short(label,compact?4:8),{fill:col,'font-size':s.fs-1},group);
    number(s,valueX,cy+3,fmt(last),{'text-anchor':'end',fill:col},group);
    number(s,changeX,cy+3,change===null?'—':`${change>=0?'+':''}${fmt(change)}%`,{'text-anchor':'end','font-size':s.fs-2,fill:col},group);
    s.line(left,cy+rowH/2,right,cy+rowH/2,{'stroke-width':.5},group);
    const xx=d3.scaleLinear([0,rows.length-1],[trendLeft,trendRight]),yy=d3.scaleLinear([0,maximum],[cy+rowH*.28,cy-rowH*.28]);
    s.line(trendLeft,yy(0),trendRight,yy(0),{'stroke-width':.5,'stroke-dasharray':'1 3'},group);
    const marks=s.group({},group);
    s.path(d3.line().x((row,j)=>xx(j)).y(row=>yy(row.value))(rows),{stroke:col,'stroke-width':1,'stroke-linejoin':'round','data-mark':'ledger-trend','data-domain-max':maximum},marks);
    s.circle(trendRight,yy(last),2,{fill:col},marks);
    s.clipReveal(marks,trendLeft-3,cy-rowH*.35,trendRight-trendLeft+6,rowH*.7,.06+i*.045,.64);
    s.reveal(group,i*.045,.35);
    s.tip(group,uiMessage`${label}\n${rows.map(row=>`${row.period}  ${fmt(row.value)} ${doc.unit}`).join('\n')}\n期初变化 ${change===null?uiText('未定义（期初为零）'):`${change>=0?'+':''}${fmt(change)}%`}`);
  });
  number(s,left,h-10,`${periods[0]} — ${periods.at(-1)}`,{'font-size':s.fs-3});
  number(s,right,h-10,uiMessage`共同纵轴 0–${fmt(maximum)} ${doc.unit}`,{'text-anchor':'end','font-size':s.fs-3});
}

export const atlasRenderers = {histogram,ecdf,cohort,bullet,funnel,sunburst,gantt,ledger};
