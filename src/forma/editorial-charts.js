import {labelInk} from './chart-readability.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import * as d3 from 'd3';
import { fmt } from './data.js';
import { boxStatistics, packSwarm } from './editorial-data.js';

const uniq=a=>[...new Set(a)];
const short=(v,n=6)=>String(v).length>n?String(v).slice(0,n-1)+'…':String(v);
const phase=(p,delay=0,duration=.55)=>1-Math.pow(1-Math.max(0,Math.min(1,(p-delay)/duration)),3);
const mono={'font-family':'ui-monospace, SFMono-Regular, Menlo, monospace'};
function xAxis(s,x,bottom,top,ticks=4){
  for(const value of x.ticks(ticks)){const px=x(value);s.line(px,top,px,bottom,{'stroke-dasharray':'1 5','stroke-width':.65});s.text(px,bottom+19,fmt(value),{'text-anchor':'middle','font-size':s.fs-1,...mono});}
}
function hatch(s,id,color,spacing=4){const p=s.el('pattern',{id:`${s.id}-${id}`,width:spacing,height:spacing,patternUnits:'userSpaceOnUse'},s.defs);s.line(0,0,0,spacing,{stroke:color,'stroke-width':.65,opacity:.38},p);return `url(#${s.id}-${id})`;}

function barcode(s,doc){
  const{w,h,theme:t}=s,left=35,right=w-19,top=26,bottom=h-31;
  const data=[...doc.data].sort((a,b)=>a.date.localeCompare(b.date)),valid=data.filter(d=>d.value!==null);
  const x=d3.scaleUtc(d3.extent(data,d=>new Date(d.date)),[left,right]);
  const y=d3.scaleLinear([0,d3.max(valid,d=>d.value)||1],[bottom,top]).nice(3);
  const threshold=d3.quantile(valid.map(d=>d.value).sort(d3.ascending),.85),dayMap=new Map(data.map(d=>[d.date,d]));
  y.ticks(3).forEach(v=>{s.text(left-9,y(v)+3,fmt(v),{'text-anchor':'end','font-size':s.fs-1,...mono});s.line(left,y(v),right,y(v),{'stroke-width':.55,'stroke-dasharray':'1 5'});});
  const dates=d3.utcDays(new Date(data[0].date),d3.utcDay.offset(new Date(data.at(-1).date),1));
  dates.forEach((date,i)=>{
    const key=d3.utcFormat('%Y-%m-%d')(date),d=dayMap.get(key),px=x(date);
    s.line(px,top,px,bottom,{stroke:t.line,'stroke-width':.6,opacity:.6});
    if(!d||d.value===null){const cross=s.path(`M${px-2},${bottom-2}l4,4m-4,0l4,-4`,{stroke:t.secondary,'stroke-width':.7});s.tip(cross,uiMessage`${key}\n缺失记录，不代表 0`);return;}
    const emphasized=d.value>=threshold&&d.value>0,color=emphasized?t.accent:t.fg,py=y(d.value),r=emphasized?2.7:1.75;
    const stem=s.line(px,bottom,px,py,{stroke:color,'stroke-width':emphasized?1.25:.8,'stroke-opacity':emphasized?1:.72,'data-mark':'stem'});
    const dot=s.circle(px,py,r,{fill:[0,6].includes(date.getUTCDay())?t.bg:color,stroke:color,'stroke-width':1});
    [stem,dot].forEach(el=>s.tip(el,`${key}\n${fmt(d.value)} ${doc.unit}`));
    s.add(p=>{const f=phase(p,i/dates.length*.34,.4),cy=bottom+(py-bottom)*f;stem.setAttribute('y2',cy);dot.setAttribute('cy',cy);dot.setAttribute('r',r*Math.sqrt(f));});
  });
  const chosen=[];
  for(const d of [...valid].sort((a,b)=>b.value-a.value)){if(chosen.length<3&&chosen.every(c=>Math.abs(x(new Date(c.date))-x(new Date(d.date)))>(right-left)/(s.compact?3:5)))chosen.push(d);}
  chosen.forEach(d=>{const px=x(new Date(d.date)),py=y(d.value);const g=s.group();s.line(px,py-5,px,py-12,{stroke:t.accent,'stroke-width':.7},g);s.text(px,py-17,fmt(d.value),{'text-anchor':'middle',fill:t.fg,'font-size':s.fs-1,'font-weight':600,...mono},g);s.reveal(g,.7,.18);});
  const ticks=x.ticks(d3.utcMonth.every(1));for(const date of ticks)s.text(x(date),bottom+20,d3.utcFormat('%m / %d')(date),{'text-anchor':+date===+new Date(data[0].date)?'start':'middle','font-size':s.fs-1,...mono});
  s.text(left,12,uiText('空心：周末'),{'font-size':s.fs-2});
  s.text(right,12,uiText('强调：≥ 85 分位数'),{'text-anchor':'end','font-size':s.fs-2});
}

function fan(s,doc){
  const{w,h,theme:t}=s,annotated=!s.compact&&w>h*1.85,cx=annotated?w*.33:w/2,cy=h/2-5,r=Math.max(25,Math.min((w-83)/2,(h-68)/2)),inner=r*.18;
  const angle=d3.scalePoint(doc.data.map(d=>d.label),[-Math.PI*.72,Math.PI*.72]),at=(a,len)=>[cx+Math.sin(a)*len,cy-Math.cos(a)*len];
  [.25,.5,.75,1].forEach(f=>{const arc=d3.arc().innerRadius(inner+(r-inner)*f).outerRadius(inner+(r-inner)*f).startAngle(-Math.PI*.72).endAngle(Math.PI*.72);s.path(arc(),{transform:`translate(${cx},${cy})`,stroke:t.line,'stroke-dasharray':f===1?'none':'1 4','stroke-width':.65});});
  doc.data.forEach((d,i)=>{
    const a=angle(d.label),ratio=d.value/d.target,color=t.objectColor(d,ratio>=.8?t.accent:t.fg),p0=at(a,inner),p1=at(a,r);
    s.line(...p0,...p1,{stroke:t.line,'stroke-width':.8});
    for(let j=1;j<=10;j++){const p=at(a,inner+(r-inner)*j/10);s.circle(...p,.85,{fill:t.secondary,opacity:.5});}
    const stem=s.line(...p0,...p0,{stroke:color,'stroke-width':1.05}),dot=s.circle(...p0,3.2,{fill:color,stroke:t.bg,'stroke-width':1});
    [stem,dot].forEach(el=>s.tip(el,uiMessage`${d.label}\n已完成 ${fmt(d.value)} / 目标 ${fmt(d.target)} ${doc.unit}\n完成率 ${fmt(ratio*100)}%`));
    s.add(p=>{const f=phase(p,i/doc.data.length*.3,.44),point=at(a,inner+(r-inner)*ratio*f);stem.setAttribute('x2',point[0]);stem.setAttribute('y2',point[1]);dot.setAttribute('cx',point[0]);dot.setAttribute('cy',point[1]);dot.setAttribute('r',3.2*Math.sqrt(f));});
    const pos=at(a,r+14),anchor=Math.abs(Math.sin(a))<.2?'middle':Math.sin(a)<0?'end':'start';
    s.text(pos[0],pos[1]+3,short(d.label,s.compact?3:5),{'text-anchor':anchor,'font-size':s.fs-1,fill:ratio>=.8?t.accent:t.secondary});
  });
  const average=d3.mean(doc.data,d=>d.value/d.target)*100;
  s.text(cx,cy+r*.54,`${fmt(average)}%`,{'text-anchor':'middle',fill:t.fg,'font-size':Math.min(25,r*.28),'font-family':'Georgia,serif'});
  s.text(cx,cy+r*.75,uiText('平均完成率'),{'text-anchor':'middle','font-size':s.fs-2});
  if(annotated){const lx=w*.66,top=Math.max(26,cy-65);s.text(lx,top,uiText('完成率 TOP 4'),{'font-size':s.fs-2});[...doc.data].sort((a,b)=>b.value/b.target-a.value/a.target).slice(0,4).forEach((d,i)=>{const yy=top+28+i*28,rate=d.value/d.target;s.text(lx,yy,short(d.label,7),{fill:t.fg,'font-size':s.fs-1});s.text(w-20,yy,`${fmt(rate*100)}%`,{'text-anchor':'end',fill:t.accent,...mono});s.line(lx,yy+9,w-20,yy+9,{'stroke-width':.6});});}
  s.text(12,h-2,uiText('刻度 0 → 100% · 强调 ≥ 80%'),{'font-size':s.fs-2});
}

function unit(s,doc){
  const{w,h,theme:t}=s,data=[...doc.data].sort((a,b)=>a.value-b.value),left=15,right=w-15,top=24,bottom=h-38;
  const max=d3.max(data,d=>d.value)||1,step=Math.min(8,(bottom-top-15)/max),x=d3.scaleBand(data.map(d=>d.label),[left,right]).padding(.38),r=Math.max(.25,Math.min(step*.30,x.bandwidth()*.17,2.6));
  [0,10,20,30,40,50].filter(v=>v<=max).forEach(v=>s.line(left,bottom-v*step,right,bottom-v*step,{'stroke-width':.6,'stroke-dasharray':'1 5'}));
  data.forEach((d,i)=>{
    const px=x(d.label)+x.bandwidth()/2,color=t.objectColor(d,i>=data.length-2?t.accent:t.color(0)),alpha=.4+.6*i/Math.max(1,data.length-1),g=s.group({'data-count':d.value,'data-record-id':d._id});
    s.tip(g,uiMessage`${d.label}\n${fmt(d.value)} ${doc.unit}\n每个圆点代表 1 ${doc.unit}`);
    for(let j=0;j<d.value;j++){const dot=s.circle(px,bottom-(j+.5)*step,j===d.value-1?r*1.35:r,{fill:color,opacity:alpha,'data-mark':'unit'},g);s.growCircle(dot,j===d.value-1?r*1.35:r,i*.02+j/max*.35,.3);}
    if(d.value===0)s.line(px-3,bottom,px+3,bottom,{stroke:t.secondary},g);
    const label=s.text(px,bottom-d.value*step-9,fmt(d.value),{'text-anchor':'middle',fill:color,'font-size':s.fs+1,...mono},g);s.reveal(label,.56+i*.012,.2);
    s.text(px,bottom+20,short(d.label,s.compact?3:6),{'text-anchor':'middle','font-size':s.fs-1});
  });
  s.text(15,12,uiMessage`1 点 = 1 ${doc.unit}`,{'font-size':s.fs-1});s.text(right,12,uiText('升序排列 · 最高两类强调'),{'text-anchor':'end','font-size':s.fs-2});
}

function matrix(s,doc){
  const{w,h,theme:t}=s,rows=uniq(doc.data.map(d=>d.row)),columns=uniq(doc.data.map(d=>d.column)),left=s.compact?47:76,right=w-20,top=37,bottom=h-31;
  const x=d3.scaleBand(columns,[left,right]).padding(.35),y=d3.scaleBand(rows,[top,bottom]).padding(.37),max=d3.max(doc.data,d=>d.value),rad=d3.scaleSqrt([0,max],[0,Math.min(x.step(),y.step())*.35]);
  rows.forEach(row=>{const cy=y(row)+y.bandwidth()/2;s.line(left,cy,right,cy,{'stroke-width':.55});s.text(left-11,cy+3,short(row,s.compact?4:7),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});});
  columns.forEach(col=>{const cx=x(col)+x.bandwidth()/2;s.text(cx,top-16,short(col,s.compact?3:5),{'text-anchor':'middle','font-size':s.fs-1});});
  doc.data.forEach(d=>{
    const cx=x(d.column)+x.bandwidth()/2,cy=y(d.row)+y.bandwidth()/2,color=d.value===d3.max(doc.data.filter(r=>r.row===d.row),r=>r.value)?t.accent:t.fg;
    if(d.value===0){const line=s.line(cx-2,cy,cx+2,cy,{stroke:t.secondary,'stroke-width':.8});s.tip(line,`${d.row} × ${d.column}\n0 ${doc.unit}`);return;}
    const dot=s.circle(cx,cy,rad(d.value),{fill:color,'fill-opacity':.85,'data-value':d.value,'data-mark':'matrix'});s.tip(dot,`${d.row} × ${d.column}\n${fmt(d.value)} ${doc.unit}`);s.growCircle(dot,rad(d.value),rows.indexOf(d.row)*.05+columns.indexOf(d.column)*.018,.4);
  });
  s.text(12,h-3,uiMessage`圆面积 = ${doc.unit} · 强调各行最大值`,{'font-size':s.fs-2});
}

function swarm(s,doc){
  const{w,h,theme:t}=s,groups=uniq(doc.data.map(d=>d.group)),left=s.compact?63:93,right=w-20,top=21,bottom=h-35;
  const domain=s.linearDomain(doc.data.map(d=>d.value)),pad=(domain[1]-domain[0])*.07,x=d3.scaleLinear([domain[0]>=0?Math.max(0,domain[0]-pad):domain[0]-pad,domain[1]+pad],[left,right]).nice(4),rowHeight=(bottom-top)/groups.length;
  xAxis(s,x,bottom,top,4);
  groups.forEach((group,i)=>{
    const rows=doc.data.filter(d=>d.group===group),cy=top+rowHeight*(i+.5),color=t.groupColor(group,i===groups.length-1?t.accent:t.fg);
    s.text(left-10,cy+3,short(group,s.compact?4:7),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});
    const{nodes,radius}=packSwarm(rows,x,rowHeight*.30,s.compact?3.4:4.4);
    nodes.forEach((d,j)=>{const dot=s.circle(d.x,cy+d.y,radius,{fill:color,'fill-opacity':.78,'data-mark':'sample','data-group':group,'data-value':d.value});s.tip(dot,`${d.label}\n${fmt(d.value)} ${doc.unit}`);s.growCircle(dot,radius,i*.08+j/nodes.length*.28,.35);});
    const median=d3.median(rows,d=>d.value),px=x(median);
    const tick=s.line(px,cy-rowHeight*.36,px,cy-rowHeight*.25,{stroke:color,'stroke-width':1.2});s.reveal(tick,.64,.18);
    s.text(right,cy-rowHeight*.36,uiMessage`中位 ${fmt(median)}`,{'text-anchor':'end','font-size':s.fs-2,fill:color,...mono});
  });
}

function interval(s,doc){
  const{w,h,theme:t}=s,left=s.compact?68:104,right=w-43,top=34,bottom=h-32;
  const x=d3.scaleLinear(s.linearDomain(doc.data.flatMap(d=>[d.low,d.high]),true),[left,right]).nice(4),y=d3.scalePoint(doc.data.map(d=>d.label),[top+8,bottom-15]);
  xAxis(s,x,bottom,top);s.text(left,12,short(doc.intervalLabel,s.compact?20:45),{'font-size':s.fs-1});
  doc.data.forEach((d,i)=>{
    const cy=y(d.label),center=x(d.estimate),color=i===doc.data.length-1?t.accent:t.fg,g=s.group();s.tip(g,uiMessage`${d.label}\n估计 ${fmt(d.estimate)} ${doc.unit}\n${doc.intervalLabel} [${fmt(d.low)}, ${fmt(d.high)}] ${doc.unit}`);
    s.text(left-9,cy+3,short(d.label,s.compact?5:8),{'text-anchor':'end','font-size':s.fs-1,fill:t.fg});
    const line=s.line(x(d.low),cy,x(d.high),cy,{stroke:color,'stroke-width':1.3},g),capA=s.line(x(d.low),cy-4,x(d.low),cy+4,{stroke:color,'stroke-width':1},g),capB=s.line(x(d.high),cy-4,x(d.high),cy+4,{stroke:color,'stroke-width':1},g);
    const dot=s.circle(center,cy,3.5,{fill:color,stroke:t.bg,'stroke-width':1,'data-mark':'estimate'},g);s.growCircle(dot,3.5,i*.04,.3);
    s.add(p=>{const f=phase(p,.12+i*.04,.42),a=center+(x(d.low)-center)*f,b=center+(x(d.high)-center)*f;line.setAttribute('x1',a);line.setAttribute('x2',b);capA.setAttribute('x1',a);capA.setAttribute('x2',a);capB.setAttribute('x1',b);capB.setAttribute('x2',b);});
    s.text(w-9,cy+3,fmt(d.estimate),{'text-anchor':'end','font-size':s.fs-1,fill:color,...mono});
  });
}

function diverging(s,doc){
  const{w,h,theme:t}=s,left=s.compact?48:80,right=w-33,top=21,bottom=h-31,max=d3.max(doc.data,d=>Math.abs(d.value))||1;
  const x=d3.scaleLinear([-max*1.14,max*1.14],[left,right]).nice(4),y=d3.scaleBand(doc.data.map(d=>d.label),[top,bottom]).padding(.46),pattern=hatch(s,'negative',t.accent,3);
  xAxis(s,x,bottom,top);s.line(x(0),top-5,x(0),bottom,{stroke:t.secondary,'stroke-width':.85});
  doc.data.forEach((d,i)=>{
    const cy=y(d.label)+y.bandwidth()/2,a=x(0),b=x(d.value),color=d.value<0?t.accent:t.fg,g=s.group();s.tip(g,`${d.label}\n${d.value>0?'+':''}${fmt(d.value)} ${doc.unit}`);
    s.text(left-10,cy+3,short(d.label,s.compact?3:6),{'text-anchor':'end','font-size':s.fs-1,fill:t.fg});
    const rect=s.rect(Math.min(a,b),y(d.label),Math.abs(a-b),y.bandwidth(),{fill:d.value<0?pattern:color,stroke:color,'stroke-width':.6},g);
    const dot=s.circle(b,cy,2,{fill:color},g);s.add(p=>{const f=phase(p,i*.04,.48),end=a+(b-a)*f;rect.setAttribute('x',Math.min(a,end));rect.setAttribute('width',Math.abs(end-a));dot.setAttribute('cx',end);});
    const label=s.text(b+(d.value<0?-7:7),cy+3,`${d.value>0?'+':''}${fmt(d.value)}`,{'text-anchor':d.value<0?'end':'start',fill:color,'font-size':s.fs-1,...mono});s.reveal(label,.62+i*.018,.18);
  });
}

function stacked(s,doc){
  const{w,h,theme:t}=s,names=uniq(doc.data.map(d=>d.series)),labels=uniq(doc.data.map(d=>d.label)),left=s.compact?65:102,right=w-15;
  const legendBottom=s.legend(names.map((label,i)=>({label:short(label,s.compact?4:9),color:t.groupColor(label,t.color(i))})),left,12),top=legendBottom+18,bottom=h-29;
  const y=d3.scaleBand(labels,[top,bottom]).padding(.49),x=d3.scaleLinear([0,100],[left,right]);
  [0,25,50,75,100].forEach(v=>{s.line(x(v),top-5,x(v),bottom,{'stroke-width':.55,'stroke-dasharray':'1 5'});s.text(x(v),bottom+18,`${v}%`,{'text-anchor':'middle','font-size':s.fs-2,...mono});});
  labels.forEach((label,i)=>{
    const g=s.group(),cy=y(label)+y.bandwidth()/2;let start=0;
    s.text(left-9,cy+3,short(label,s.compact?5:8),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});
    names.forEach((name,j)=>{
      const d=doc.data.find(r=>r.label===label&&r.series===name),color=t.groupColor(name,t.color(j)),width=x(start+d.value)-x(start),rect=s.rect(x(start),y(label),width,y.bandwidth(),{fill:color,stroke:t.bg,'stroke-width':.75},g);s.tip(rect,`${label} · ${name}\n${fmt(d.value)}%`);
      if(width>29)s.text(x(start)+width/2,cy+3,`${fmt(d.value)}`,{'text-anchor':'middle',fill:labelInk(color,t.fg),'font-size':s.fs-2,...mono},g);
      start+=d.value;
    });
    s.clipReveal(g,left-1,top-1,right-left+2,bottom-top+2,i*.06,.55);
  });
}

function stream(s,doc){
  const{w,h,theme:t}=s,names=uniq(doc.data.map(d=>d.series)),periods=uniq(doc.data.map(d=>d.period)),left=36,right=w-18,bottom=h-32;
  const legendBottom=s.legend(names.map((label,i)=>({label:short(label,s.compact?4:8),color:t.groupColor(label,t.color(i))})),left,12),top=legendBottom+12;
  const records=periods.map(period=>({period,values:new Map(doc.data.filter(d=>d.period===period).map(d=>[d.series,d.value]))}));
  const layers=d3.stack().keys(names).value((d,key)=>d.values.get(key))(records),max=d3.max(records,d=>d3.sum(d.values.values()));
  const x=d3.scalePoint(periods,[left,right]),y=d3.scaleLinear([0,max],[bottom,top]).nice(3),area=d3.area().x(d=>x(d.data.period)).y0(d=>y(d[0])).y1(d=>y(d[1]));
  y.ticks(3).forEach(v=>{s.line(left,y(v),right,y(v),{'stroke-width':.6,'stroke-dasharray':'1 5'});s.text(left-8,y(v)+3,fmt(v),{'text-anchor':'end','font-size':s.fs-1,...mono});});
  const g=s.group();layers.forEach((layer,j)=>{const color=t.groupColor(layer.key,t.color(j)),p=s.path(area(layer),{fill:color,'fill-opacity':.76,stroke:t.bg,'stroke-width':.7},g);s.tip(p,uiMessage`${layer.key}\n全部时期合计 ${fmt(d3.sum(layer,d=>d[1]-d[0]))} ${doc.unit}`);layer.forEach(d=>{const dot=s.circle(x(d.data.period),(y(d[0])+y(d[1]))/2,5,{fill:color,'fill-opacity':0},g);s.tip(dot,`${d.data.period} · ${layer.key}\n${fmt(d[1]-d[0])} ${doc.unit}`);});});
  s.clipReveal(g,left-1,top-1,right-left+2,bottom-top+3,0,.76);
  uniq([0,Math.floor((periods.length-1)/2),periods.length-1]).forEach(i=>s.text(x(periods[i]),bottom+21,short(periods[i],8),{'text-anchor':i===0?'start':i===periods.length-1?'end':'middle','font-size':s.fs-1,...mono}));
}

function boxplot(s,doc){
  const{w,h,theme:t}=s,groups=uniq(doc.data.map(d=>d.group)),left=37,right=w-20,top=20,bottom=h-46;
  const stats=groups.map(group=>({group,...boxStatistics(doc.data.filter(d=>d.group===group).map(d=>d.value))})),x=d3.scaleBand(groups,[left,right]).padding(.46),y=d3.scaleLinear(s.linearDomain(doc.data.map(d=>d.value)),[bottom,top]).nice(4);
  const pattern=hatch(s,'quartile',t.fg,3);
  y.ticks(4).forEach(v=>{s.line(left,y(v),right,y(v),{'stroke-width':.6,'stroke-dasharray':'1 5'});s.text(left-8,y(v)+3,fmt(v),{'text-anchor':'end','font-size':s.fs-1,...mono});});
  stats.forEach((d,i)=>{
    const cx=x(d.group)+x.bandwidth()/2,bw=Math.min(40,x.bandwidth()),g=s.group({'data-mark':'boxplot-group','data-group':d.group}),color=t.groupColor(d.group,i===stats.length-1?t.accent:t.fg);
    s.tip(g,uiMessage`${d.group} · ${d.count} 个样本\nQ1 ${fmt(d.q1)} / 中位 ${fmt(d.median)} / Q3 ${fmt(d.q3)}\n须线 [${fmt(d.low)}, ${fmt(d.high)}] ${doc.unit}\n1.5 × IQR 之外显示为离群点`);
    s.line(cx,y(d.low),cx,y(d.high),{stroke:color,'stroke-width':.9},g);
    [d.low,d.high].forEach(value=>s.line(cx-bw*.22,y(value),cx+bw*.22,y(value),{stroke:color,'stroke-width':1},g));
    s.rect(cx-bw/2,y(d.q3),bw,y(d.q1)-y(d.q3),{fill:t.bg,stroke:color,'stroke-width':1},g);
    s.rect(cx-bw/2,y(d.q3),bw,y(d.q1)-y(d.q3),{fill:t.groupColor(d.group)?hatch(s,`quartile-${i}`,color,3):pattern},g);
    s.line(cx-bw/2,y(d.median),cx+bw/2,y(d.median),{stroke:color,'stroke-width':1.8},g);
    d.outliers.forEach(value=>s.circle(cx,y(value),2.4,{fill:t.bg,stroke:color,'stroke-width':.9,'data-mark':'outlier'},g));
    s.add(p=>{const f=phase(p,i*.045,.52),my=y(d.median);g.setAttribute('transform',`translate(0 ${my*(1-f)}) scale(1 ${Math.max(.00001,f)})`);g.setAttribute('opacity',Math.min(1,f*4));});
    s.text(cx,bottom+18,short(d.group,s.compact?4:7),{'text-anchor':'middle','font-size':s.fs-1,fill:t.fg});s.text(cx,bottom+32,`n=${d.count}`,{'text-anchor':'middle','font-size':s.fs-2,...mono});
  });
}

function arc(s,doc){
  const{w,h,theme:t}=s,names=uniq(doc.data.flatMap(d=>[d.source,d.target])),left=23,right=w-23,base=h-49,top=29,x=d3.scalePoint(names,[left,right]),max=d3.max(doc.data,d=>d.value),maxGap=Math.max(...doc.data.map(d=>Math.abs(names.indexOf(d.source)-names.indexOf(d.target))));
  const links=[...doc.data].sort((a,b)=>Math.abs(names.indexOf(b.source)-names.indexOf(b.target))-Math.abs(names.indexOf(a.source)-names.indexOf(a.target)));
  links.forEach((d,i)=>{
    const a=x(d.source),b=x(d.target),distance=Math.abs(names.indexOf(d.source)-names.indexOf(d.target)),height=(base-top)*distance/maxGap,color=d.value===max?t.accent:t.color(0);
    const curve=`M${a},${base} C${a},${base-height*1.33} ${b},${base-height*1.33} ${b},${base}`;
    const path=s.path(curve,{stroke:color,'stroke-width':d.value/max*(s.compact?2.4:3.8),'stroke-opacity':d.value===max?.9:.4,'stroke-linecap':'round'});s.tip(path,`${d.source} ↔ ${d.target}\n${fmt(d.value)} ${doc.unit}`);s.draw(path,i/links.length*.3,.47);
  });
  s.line(left,base,right,base,{'stroke-width':.65});
  names.forEach((name,i)=>{const cx=x(name),incident=d3.sum(doc.data.filter(d=>d.source===name||d.target===name),d=>d.value);const dot=s.circle(cx,base,3.5,{fill:t.bg,stroke:t.color(0),'stroke-width':1.2});s.tip(dot,uiMessage`${name}\n节点关联量 ${fmt(incident)} ${doc.unit}`);s.growCircle(dot,3.5,i*.025,.28);s.text(cx,base+20,short(name,s.compact?3:6),{'text-anchor':'middle','font-size':s.fs-1,fill:t.fg});});
  s.text(14,h-3,uiMessage`线宽 = 权重 · 强调最强连接`,{'font-size':s.fs-2});
}

function parallel(s,doc){
  const{w,h,theme:t}=s,names=uniq(doc.data.map(d=>d.label)),dimensions=uniq(doc.data.map(d=>d.dimension)),left=s.compact?32:48,right=w-28,bottom=h-32;
  const legendBottom=s.legend(names.map((label,i)=>({label:short(label,s.compact?3:7),color:t.groupColor(label,t.color(i))})),left,12),top=legendBottom+18;
  const x=d3.scalePoint(dimensions,[left,right]),y=d3.scaleLinear(s.linearDomain(doc.data.map(d=>d.value),true),[bottom,top]).nice(4),ticks=y.ticks(4);
  dimensions.forEach((dim,i)=>{const px=x(dim);s.line(px,top,px,bottom,{stroke:t.secondary,'stroke-width':.65});ticks.forEach(v=>{s.line(px-3,y(v),px+3,y(v),{stroke:t.secondary,'stroke-width':.65});if(i===0)s.text(px-7,y(v)+3,fmt(v),{'text-anchor':'end','font-size':s.fs-2,...mono});});s.text(px,bottom+21,short(dim,s.compact?3:6),{'text-anchor':'middle',fill:t.fg,'font-size':s.fs-1});});
  const g=s.group();[...names].reverse().forEach(name=>{const i=names.indexOf(name),color=t.color(i),rows=dimensions.map(dimension=>doc.data.find(d=>d.label===name&&d.dimension===dimension));
    const path=s.path(d3.line().x(d=>x(d.dimension)).y(d=>y(d.value))(rows),{stroke:color,'stroke-width':i===0?1.8:1,'stroke-opacity':i===0?1:.64,'stroke-linejoin':'round'},g);s.tip(path,`${name}\n${rows.map(d=>`${d.dimension} ${fmt(d.value)} ${doc.unit}`).join('\n')}`);
    rows.forEach(d=>{const dot=s.circle(x(d.dimension),y(d.value),i===0?3:2,{fill:i===0?color:t.bg,stroke:color,'stroke-width':1},g);s.tip(dot,`${name} · ${d.dimension}\n${fmt(d.value)} ${doc.unit}`);});
  });
  s.clipReveal(g,left-5,top-5,right-left+10,bottom-top+10,0,.72);
}

export const editorialRenderers={barcode,fan,unit,matrix,swarm,interval,diverging,stacked,stream,boxplot,arc,parallel};
