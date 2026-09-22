import {uiText,uiMarkup,uiMessage} from './locale.js';
import {formatDecimal} from './number-format.js';
import * as d3 from 'd3';
import {fmt} from './data.js';
import {paretoRows,violinDensity,pearsonMatrix,marimekkoLayout,spreadLabels} from './volume4-data.js';

const unique=values=>[...new Set(values)];
const short=(value,n=7)=>[...String(value)].length>n?[...String(value)].slice(0,n-1).join('')+'…':String(value);
const mono={'font-family':'ui-monospace, SFMono-Regular, Menlo, monospace','font-variant-numeric':'tabular-nums'};
const phase=(p,delay=0,duration=.6)=>1-Math.pow(1-Math.max(0,Math.min(1,(p-delay)/duration)),3);
const set=(element,attrs)=>Object.entries(attrs).forEach(([key,value])=>element.setAttribute(key,String(value)));
const number=(s,x,y,value,attrs={},parent)=>s.text(x,y,value,{...mono,'font-size':s.fs-1,...attrs},parent);
function hatch(s,name,color,spacing=5,direction=1){const id=`${s.id}-${name}`,pattern=s.el('pattern',{id,width:spacing,height:spacing,patternUnits:'userSpaceOnUse'},s.defs);s.path(direction>0?`M-1,1 L1,-1 M0,${spacing} L${spacing},0 M${spacing-1},${spacing+1} L${spacing+1},${spacing-1}`:`M-1,${spacing-1} L1,${spacing+1} M0,0 L${spacing},${spacing} M${spacing-1},-1 L${spacing+1},1`,{stroke:color,'stroke-width':.5,'stroke-opacity':.32},pattern);return `url(#${id})`;}
function xAxis(s,x,bottom,top,{ticks=4,format=fmt,grid=true}={}){x.ticks(ticks).forEach(value=>{const xx=x(value);if(grid)s.line(xx,top,xx,bottom,{'stroke-width':.55,'stroke-dasharray':'1 5'});s.line(xx,bottom,xx,bottom+4,{stroke:s.theme.secondary,'stroke-width':.6});number(s,xx,bottom+18,format(value),{'text-anchor':'middle'});});s.line(x.range()[0],bottom,x.range()[1],bottom,{stroke:s.theme.secondary,'stroke-width':.6});}

function lollipop(s,doc){
  const {w,h,theme:t}=s,compact=s.compact||w<420,left=compact?62:96,right=w-42,top=32,bottom=h-32;
  const x=d3.scaleLinear([0,d3.max(doc.data,row=>row.value)||1],[left,right]).nice(4),rowH=(bottom-top)/doc.data.length;
  xAxis(s,x,bottom,top,{ticks:compact?3:5});s.text(left,14,uiMessage`观测值 / ${doc.unit}`,{'font-size':s.fs-1});number(s,right,14,`n = ${doc.data.length}`,{'text-anchor':'end'});
  const maximum=d3.max(doc.data,row=>row.value);
  doc.data.forEach((row,i)=>{
    const cy=top+(i+.48)*rowH,color=t.objectColor(row,row.value===maximum?t.accent:t.fg),group=s.group({'data-mark':'lollipop','data-record-id':row._id,'data-value':row.value});
    s.text(left-10,cy+3,short(row.label,compact?4:8),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});
    s.circle(left,cy,1.3,{fill:t.bg,stroke:t.secondary,'stroke-width':.5});
    const stem=s.line(left,cy,left,cy,{stroke:color,'stroke-width':row.value===maximum?1.35:.85},group),dot=s.circle(left,cy,0,{fill:row.value===maximum?color:t.bg,stroke:color,'stroke-width':1.05},group);
    const value=number(s,x(row.value)+9,cy+3,fmt(row.value),{fill:color},group);
    s.add(p=>{const f=phase(p,i*.025,.6),end=left+(x(row.value)-left)*f;set(stem,{x2:end});set(dot,{cx:end,r:3.2*Math.sqrt(f)});set(value,{opacity:phase(p,.5+i*.025,.2)});});
    s.tip(group,`${row.label}\n${fmt(row.value)} ${doc.unit}`);
  });
}

function pareto(s,doc){
  const {w,h,theme:t}=s,compact=s.compact||w<420,rows=paretoRows(doc.data),left=38,right=w-39,top=32,bottom=h-46;
  const x=d3.scaleBand(rows.map(row=>row.label),[left,right]).paddingInner(.3).paddingOuter(.1),y=d3.scaleLinear([0,d3.max(rows,row=>row.value)],[bottom,top]).nice(3),percent=d3.scaleLinear([0,1],[bottom,top]);
  s.text(left,13,uiMessage`数量 / ${doc.unit}`,{'font-size':s.fs-1});s.text(right,13,uiText('累计 / %'),{'font-size':s.fs-1,fill:t.accent,'text-anchor':'end'});
  y.ticks(3).filter(Number.isInteger).forEach(value=>{s.line(left,y(value),right,y(value),{'stroke-width':.55,'stroke-dasharray':'1 5'});number(s,left-7,y(value)+3,fmt(value),{'text-anchor':'end'});});
  [0,.5,1].forEach(value=>number(s,right+7,percent(value)+3,`${value*100}%`,{fill:t.accent,'font-size':s.fs-2}));
  s.line(left,percent(.8),right,percent(.8),{stroke:t.accent,'stroke-width':.6,'stroke-dasharray':'3 4',opacity:.6});
  number(s,right,percent(.8)-5,'80%',{'text-anchor':'end',fill:t.accent,'font-size':s.fs-2});
  const texture=hatch(s,'pareto-bars',t.fg,4);
  rows.forEach((row,i)=>{
    const xx=x(row.label),height=bottom-y(row.value),color=t.objectColor(row,t.fg),group=s.group({'data-mark':'pareto-bar','data-record-id':row._id,'data-value':row.value,'data-label':row.label});
    const bar=s.rect(xx,bottom,x.bandwidth(),0,{fill:i===0?color:t.objectColor(row)?hatch(s,`pareto-${i}`,color,4):texture,stroke:color,'stroke-width':.55},group);
    s.add(p=>{const f=phase(p,i*.025,.5);set(bar,{y:bottom-height*f,height:height*f});});
    const label=s.text(xx+x.bandwidth()/2,bottom+15,short(row.label,compact?2:5),{'text-anchor':'middle','font-size':s.fs-2});s.tip(label,row.label);
    const value=number(s,xx+x.bandwidth()/2,y(row.value)-7,fmt(row.value),{'text-anchor':'middle',fill:color,'font-size':s.fs-2});s.reveal(value,.58+i*.02,.2);
    s.tip(group,uiMessage`${row.label}\n${fmt(row.value)} ${doc.unit}\n累计 ${fmt(row.cumulative*100)}%`);
  });
  const layer=s.group(),curve=d3.line().x(row=>x(row.label)+x.bandwidth()/2).y(row=>percent(row.cumulative))(rows);
  s.path(curve,{stroke:t.accent,'stroke-width':1.35,'data-mark':'pareto-cumulative'},layer);
  rows.forEach(row=>{const dot=s.circle(x(row.label)+x.bandwidth()/2,percent(row.cumulative),2.6,{fill:t.bg,stroke:t.accent,'stroke-width':1,'data-mark':'pareto-point','data-cumulative':row.cumulative},layer);s.tip(dot,uiMessage`${row.label} 及之前的类别\n累计 ${fmt(row.cumulative*100)}%`);});
  s.clipReveal(layer,left-5,top-5,right-left+10,bottom-top+10,.25,.64);
  s.line(left,bottom,right,bottom,{stroke:t.secondary,'stroke-width':.6});s.text(left,h-4,uiText('计数降序 · 折线为累计占比'),{'font-size':s.fs-2});
}

function violin(s,doc){
  const {w,h,theme:t}=s,compact=s.compact||w<420,left=compact?45:76,right=w-28,top=32,bottom=h-33;
  const groups=unique(doc.data.map(row=>row.group)).map(group=>({group,values:doc.data.filter(row=>row.group===group).map(row=>row.value)})),density=violinDensity(groups,100),x=d3.scaleLinear(density.domain,[left,right]);
  const rowH=(bottom-top)/groups.length,maxDensity=d3.max(density.series,group=>d3.max(group.points,point=>point.density)),amplitude=Math.min(rowH*.38,35),texture=hatch(s,'violin-fill',t.fg,4);
  xAxis(s,x,bottom,top,{ticks:compact?3:6});s.text(left,14,uiText('同一密度尺度'),{'font-size':s.fs-1});number(s,right,14,`h = ${fmt(density.bandwidth)}`,{'text-anchor':'end','font-size':s.fs-2});
  density.series.forEach((group,i)=>{
    const cy=top+(i+.5)*rowH,color=t.groupColor(group.group,i===density.series.length-1?t.accent:t.fg),layer=s.group({'data-mark':'violin','data-group':group.group,'data-bandwidth':density.bandwidth,'data-n':group.values.length});
    s.line(left,cy,right,cy,{'stroke-width':.6,'stroke-dasharray':'1 4'});
    s.text(left-9,cy-2,short(group.group,compact?3:6),{'text-anchor':'end',fill:t.fg,'font-size':s.fs-1});number(s,left-9,cy+10,`n=${group.values.length}`,{'text-anchor':'end','font-size':s.fs-3});
    const area=d3.area().x(point=>x(point.x)).y0(point=>cy-amplitude*point.density/maxDensity).y1(point=>cy+amplitude*point.density/maxDensity).curve(d3.curveLinear)(group.points);
    const shape=s.path(area,{fill:i===density.series.length-1?color:t.groupColor(group.group)?hatch(s,`violin-${i}`,color,4):texture,'fill-opacity':i===density.series.length-1?.08:1,stroke:color,'stroke-width':.95},layer);
    s.add(p=>{const f=phase(p,i*.055,.58);shape.setAttribute('transform',`translate(0 ${cy}) scale(1 ${f}) translate(0 ${-cy})`);shape.setAttribute('opacity',String(f));});
    group.values.forEach((value,j)=>{const rug=s.line(x(value),cy-2.2,x(value),cy+2.2,{stroke:color,'stroke-width':.55,opacity:.18,'data-mark':'violin-observation'},layer);s.add(p=>rug.setAttribute('opacity',String(.27*phase(p,.15+i*.04+j/group.values.length*.08,.3))));});
    const sorted=[...group.values].sort((a,b)=>a-b),q1=d3.quantileSorted(sorted,.25),median=d3.quantileSorted(sorted,.5),q3=d3.quantileSorted(sorted,.75);
    const interval=s.line(x(q1),cy,x(q3),cy,{stroke:color,'stroke-width':3,'data-mark':'violin-iqr'},layer),middle=s.circle(x(median),cy,2.3,{fill:t.bg,stroke:color,'stroke-width':1,'data-mark':'violin-median','data-value':median},layer);
    s.reveal(interval,.58+i*.035,.22);s.reveal(middle,.63+i*.035,.2);
    s.tip(layer,uiMessage`${group.group} · ${group.values.length} 个原始观测\n中位 ${fmt(median)} ${doc.unit}\nQ1–Q3：${fmt(q1)}–${fmt(q3)} ${doc.unit}\n宽度 = 概率密度，共用带宽 ${fmt(density.bandwidth)}`);
  });
  s.text(left,h-4,uiMessage`观测值 / ${doc.unit} · 圆点为中位数`,{'font-size':s.fs-2});
}

function correlation(s,doc){
  const {w,h,theme:t}=s,compact=s.compact||w<680,stats=pearsonMatrix(doc.data),n=stats.variables.length,side=Math.min(h-63,w-(compact?69:230)),left=compact?52:Math.max(72,(w-side-220)/2),top=32,cell=side/n;
  number(s,left,12,`Pearson r · n = ${stats.samples.length}`,{'font-size':s.fs-1});
  stats.variables.forEach((name,i)=>{s.text(left+(i+.5)*cell,top-8,short(name,compact?3:6),{'text-anchor':'middle','font-size':Math.min(s.fs-1,cell/3.3),fill:t.fg});s.text(left-9,top+(i+.5)*cell+3,short(name,compact?4:7),{'text-anchor':'end','font-size':s.fs-1,fill:t.fg});});
  stats.matrix.forEach((row,i)=>row.forEach((entry,j)=>{
    const xx=left+j*cell,yy=top+i*cell,cx=xx+cell/2,cy=yy+cell*.45,value=entry.coefficient,g=s.group({'data-mark':'correlation-cell','data-row':entry.row,'data-column':entry.column,'data-coefficient':value===null?'undefined':value});
    s.rect(xx,yy,cell,cell,{fill:i===j?t.soft:'none',stroke:t.line,'stroke-width':.6},g);
    if(value===null){s.line(cx-4,cy-4,cx+4,cy+4,{stroke:t.secondary,'stroke-width':.65},g);s.line(cx-4,cy+4,cx+4,cy-4,{stroke:t.secondary,'stroke-width':.65},g);if(cell>37)number(s,cx,yy+cell-6,'—',{'text-anchor':'middle','font-size':s.fs-3},g);}
    else {const mapped=t.valueColor?.(value,[-1,1],value>=0?t.fg:t.accent)??(value>=0?t.fg:t.accent),r=Math.sqrt(Math.abs(value))*cell*.245,dot=s.circle(cx,cy,0,{fill:value>=0?mapped:t.bg,stroke:mapped,'stroke-width':.85,'data-mark':'correlation-glyph','data-area-ratio':Math.abs(value)},g);s.growCircle(dot,r,(i+j)*.035,.43);if(value<0)s.line(cx-r*.65,cy,cx+r*.65,cy,{stroke:mapped,'stroke-width':.7},g);if(cell>37)number(s,cx,yy+cell-5,formatDecimal(value,2),{'text-anchor':'middle','font-size':s.fs-3,fill:value<0?mapped:t.secondary},g);}
    s.reveal(g,(i+j)*.028,.4);s.tip(g,uiMessage`${entry.row} × ${entry.column}\n${value===null?uiText('未定义：至少一个变量为常量'):`Pearson r = ${formatDecimal(value,3)}`}\n${entry.n} 个完整样本 · 相关不表示因果`);
  }));
  const positive=t.valueColor?.(1,[-1,1],t.fg)??t.fg,negative=t.valueColor?.(-1,[-1,1],t.accent)??t.accent;
  const legendY=top+side+17;s.legend([{label:uiText('正相关'),color:positive},{label:uiText('负相关'),color:negative}],left,legendY-3);s.text(compact?w-12:left+side,legendY,uiText('面积 ∝ |r|'),{'text-anchor':'end','font-size':s.fs-2});
  if(!compact){
    const ax=left+side+35,ar=w-16,ranked=stats.matrix.flatMap((row,i)=>row.filter((entry,j)=>j>i&&entry.coefficient!==null)).sort((a,b)=>Math.abs(b.coefficient)-Math.abs(a.coefficient)).slice(0,3);
    s.text(ax,top+15,uiText('关系最强的三对'),{'font-size':s.fs,fill:t.fg});s.text(ax,top+34,uiText('按 |r| 排序 · 线性关系'),{'font-size':s.fs-2});
    ranked.forEach((entry,i)=>{const yy=top+74+i*58;s.text(ax,yy,`${short(entry.row,5)} / ${short(entry.column,5)}`,{'font-size':s.fs-1});number(s,ar,yy,formatDecimal(entry.coefficient,2),{'text-anchor':'end',fill:entry.coefficient<0?t.accent:t.fg,'font-size':s.fs+1});s.line(ax,yy+15,ar,yy+15,{'stroke-width':.6});});
    s.text(ax,Math.min(h-14,top+side-12),uiText('相关不表示因果。'),{'font-size':s.fs-1,fill:t.fg});
  }
}

function marimekko(s,doc){
  const {w,h,theme:t}=s,compact=s.compact||w<560,layout=marimekkoLayout(doc.data),left=36,right=compact?w-12:w*.73,top=37,bottom=h-54,plotW=right-left,plotH=bottom-top;
  const patterns=[hatch(s,'mekko-0',t.fg,4),hatch(s,'mekko-1',t.fg,7,-1),hatch(s,'mekko-2',t.accent,4),hatch(s,'mekko-3',t.fg,10),hatch(s,'mekko-4',t.secondary,5,-1)];
  const color=index=>index===2?t.accent:t.fg;
  [0,.5,1].forEach(value=>number(s,left-7,bottom-value*plotH+3,`${value*100}%`,{'text-anchor':'end','font-size':s.fs-2}));
  s.text(left,15,uiText('组内构成'),{'font-size':s.fs-1});number(s,right,15,`Σ ${fmt(layout.total)} ${doc.unit}`,{'text-anchor':'end','font-size':s.fs-1});
  layout.groups.forEach((group,i)=>{
    const xx=left+group.left*plotW,ww=group.width*plotW,g=s.group({'data-mark':'mekko-group','data-total':group.total,'data-width-ratio':group.width});
    group.cells.forEach((cell,j)=>{
      const yy=bottom-(cell.bottom+cell.height)*plotH,hh=cell.height*plotH,box=s.group({'data-mark':'mekko-cell','data-value':cell.value,'data-share':cell.share});
      const fill=s.rect(xx,yy,ww,hh,{fill:j===0?t.soft:patterns[j],stroke:color(j),'stroke-opacity':.6,'stroke-width':.6,'data-mark':'mekko-area'},box);
      if(j===0)s.rect(xx,yy,ww,hh,{fill:patterns[0]},box);
      if(hh>25&&ww>33){const label=number(s,xx+ww/2,yy+hh/2+3,`${Math.round(cell.height*100)}%`,{'text-anchor':'middle','font-size':s.fs-2,fill:color(j)},box);s.reveal(label,.65+i*.025,.2);}
      s.tip(box,uiMessage`${group.group} · ${cell.series}\n${fmt(cell.value)} ${doc.unit}\n组内 ${fmt(cell.height*100)}% · 整体 ${fmt(cell.share*100)}%`);
      g.append(box);s.add(p=>{const f=phase(p,i*.045,.6);box.setAttribute('transform',`translate(${xx} ${bottom}) scale(${f} ${f}) translate(${-xx} ${-bottom})`);box.setAttribute('opacity',String(f));});
      fill.setAttribute('data-area-ratio',String(cell.share));
    });
    const label=s.text(xx+ww/2,bottom+16,short(group.group,compact?Math.max(2,Math.floor(ww/10)):6),{'text-anchor':'middle','font-size':s.fs-1,fill:t.fg});s.tip(label,group.group);
    number(s,xx+ww/2,bottom+30,fmt(group.total),{'text-anchor':'middle','font-size':s.fs-2});
  });
  if(compact){let cursor=left;layout.series.forEach((name,i)=>{s.rect(cursor,h-10,6,6,{fill:patterns[i],stroke:color(i),'stroke-width':.4});s.text(cursor+10,h-4,short(name,3),{'font-size':s.fs-3});cursor+=(right-left)/layout.series.length;});}
  else {const lx=right+30,rr=w-18;s.text(lx,top+5,uiText('每一部分的构成'),{'font-size':s.fs,fill:t.fg});s.text(lx,top+25,uiText('分类 / 整体数量中的占比'),{'font-size':s.fs-2});layout.series.forEach((name,i)=>{const yy=top+61+i*52,total=d3.sum(doc.data.filter(row=>row.series===name),row=>row.value);s.rect(lx,yy-8,9,9,{fill:patterns[i],stroke:color(i),'stroke-width':.55});s.text(lx+16,yy,name,{'font-size':s.fs-1,fill:color(i)});number(s,rr,yy,`${fmt(total/layout.total*100)}%`,{'text-anchor':'end',fill:color(i)});s.line(lx,yy+14,rr,yy+14,{'stroke-width':.6});});s.text(lx,bottom-8,uiText('宽 × 高 = 整体份额'),{'font-size':s.fs-1,fill:t.fg});}
}

function smallmultiples(s,doc){
  const {w,h,theme:t}=s,compact=s.compact||w<500,names=unique(doc.data.map(row=>row.series)),periods=unique(doc.data.map(row=>row.period)),columns=names.length===2?2:compact?2:names.length>4?3:2,rows=Math.ceil(names.length/columns),gapX=compact?12:26,gapY=compact?17:25,margin=compact?4:8,top=25,panelW=(w-margin*2-gapX*(columns-1))/columns,panelH=(h-top-18-gapY*(rows-1))/rows;
  const domain=s.linearDomain(doc.data.map(row=>row.value),true),yDomain=d3.scaleLinear().domain(domain).nice(3).domain(),dateDomain=[new Date(`${periods[0]}T00:00:00Z`),new Date(`${periods.at(-1)}T00:00:00Z`)];
  s.text(margin,12,uiText('同一时间范围 · 同一纵轴'),{'font-size':s.fs-1});s.text(w-margin,12,doc.unit,{'text-anchor':'end','font-size':s.fs-1});
  names.forEach((name,i)=>{
    const ox=margin+(i%columns)*(panelW+gapX),oy=top+Math.floor(i/columns)*(panelH+gapY),left=ox+(compact?23:31),right=ox+panelW-6,ptop=oy+18,bottom=oy+panelH-16,own=doc.data.filter(row=>row.series===name),x=d3.scaleUtc(dateDomain,[left,right]),y=d3.scaleLinear(yDomain,[bottom,ptop]),color=t.objectColor(own[0],i===0?t.accent:t.fg),layer=s.group({'data-mark':'smallmultiple','data-series':name,'data-series-id':own[0]?._seriesId,'data-domain-min':yDomain[0],'data-domain-max':yDomain[1]});
    s.text(ox,oy+7,short(name,compact?5:9),{'font-size':s.fs-1,fill:t.fg});
    const last=own.at(-1);number(s,right,oy+7,last.value===null?'—':fmt(last.value),{'text-anchor':'end',fill:color,'font-size':s.fs-1});
    y.ticks(2).forEach(value=>{s.line(left,y(value),right,y(value),{'stroke-width':.5,'stroke-dasharray':'1 4'},layer);number(s,left-5,y(value)+3,fmt(value),{'text-anchor':'end','font-size':s.fs-3},layer);});
    const line=d3.line().defined(row=>row.value!==null).x(row=>x(new Date(`${row.period}T00:00:00Z`))).y(row=>y(row.value));
    const marks=s.group({},layer);s.path(line(own),{stroke:color,'stroke-width':1.05,'data-mark':'smallmultiple-line'},marks);
    own.forEach(row=>{const xx=x(new Date(`${row.period}T00:00:00Z`));if(row.value===null){const miss=s.group({'data-mark':'smallmultiple-missing'},marks);s.line(xx-2,bottom-4,xx+2,bottom,{stroke:t.secondary,'stroke-width':.65},miss);s.line(xx-2,bottom,xx+2,bottom-4,{stroke:t.secondary,'stroke-width':.65},miss);s.tip(miss,uiMessage`${name} · ${row.period}\n缺失观测`);}else{const dot=s.circle(xx,y(row.value),compact?1:1.4,{fill:t.bg,stroke:color,'stroke-width':.7,'data-mark':'smallmultiple-observation','data-period':row.period,'data-value':row.value},marks);s.tip(dot,`${name} · ${row.period}\n${fmt(row.value)} ${doc.unit}`);}});
    s.clipReveal(marks,left-3,ptop-3,right-left+6,bottom-ptop+7,i*.025,.7);
    [periods[0],periods.at(-1)].forEach((period,j)=>number(s,x(new Date(`${period}T00:00:00Z`)),bottom+13,period.slice(5).replace('-','.'),{'text-anchor':j?'end':'start','font-size':s.fs-3},layer));
    if(own.every(row=>row.value===null))s.text((left+right)/2,(ptop+bottom)/2,uiText('暂无观测'),{'text-anchor':'middle','font-size':s.fs-1},layer);
  });
  s.text(margin,h-2,uiText('缺失保留断点'),{'font-size':s.fs-3});
}

function slope(s,doc){
  const {w,h,theme:t}=s,compact=s.compact||w<460,left=compact?70:Math.max(105,w*.23),right=compact?w-70:Math.min(w-105,w*.77),top=35,bottom=h-29,values=doc.data.flatMap(row=>[row.before,row.after]),y=d3.scaleLinear(s.linearDomain(values,true),[bottom,top]).nice(4);
  const leftYs=spreadLabels(doc.data.map(row=>y(row.before)),top+3,bottom-3,compact?22:25),rightYs=spreadLabels(doc.data.map(row=>y(row.after)),top+3,bottom-3,compact?22:25),maxChange=d3.max(doc.data,row=>Math.abs(row.after-row.before));
  s.text(left,14,doc.periodLabels[0],{'text-anchor':'middle',fill:t.fg,'font-size':s.fs});s.text(right,14,doc.periodLabels[1],{'text-anchor':'middle',fill:t.fg,'font-size':s.fs});
  y.ticks(3).forEach(value=>{const yy=y(value);s.line(left,yy,right,yy,{'stroke-width':.5,'stroke-dasharray':'1 5'});number(s,(left+right)/2,yy-5,fmt(value),{'text-anchor':'middle','font-size':s.fs-3,opacity:.75});});
  s.line(left,top,left,bottom,{stroke:t.secondary,'stroke-width':.6});s.line(right,top,right,bottom,{stroke:t.secondary,'stroke-width':.6});
  doc.data.forEach((row,i)=>{
    const y1=y(row.before),y2=y(row.after),color=Math.abs(row.after-row.before)===maxChange?t.accent:t.fg,group=s.group({'data-mark':'slope-series','data-before':row.before,'data-after':row.after}),line=s.line(left,y1,left,y1,{stroke:color,'stroke-width':color===t.accent?1.35:.8,'stroke-opacity':color===t.accent?1:.65},group),start=s.circle(left,y1,2.5,{fill:t.bg,stroke:color,'stroke-width':1},group),end=s.circle(left,y1,2.5,{fill:color},group);
    s.add(p=>{const f=phase(p,i*.035,.62);set(line,{x2:left+(right-left)*f,y2:y1+(y2-y1)*f});set(end,{cx:left+(right-left)*f,cy:y1+(y2-y1)*f});set(start,{opacity:f});});
    [[left,y1,leftYs[i],row.before,-1],[right,y2,rightYs[i],row.after,1]].forEach(([xx,yy,labelY,value,side])=>{
      const lx=xx+side*13,anchor=side<0?'end':'start',labels=s.group({'data-mark':'slope-label','data-original-y':yy,'data-label-y':labelY},group);
      s.path(`M${xx},${yy} L${xx+side*5},${yy} L${lx},${labelY}`,{stroke:color,'stroke-width':.45,'stroke-opacity':.6},labels);
      s.text(lx+side*3,labelY-2,short(row.label,compact?4:8),{'text-anchor':anchor,'font-size':s.fs-1,fill:color},labels);number(s,lx+side*3,labelY+9,fmt(value),{'text-anchor':anchor,'font-size':s.fs-3,fill:color},labels);s.reveal(labels,side<0?.1:.57+i*.025,.24);
    });
    s.tip(group,uiMessage`${row.label}\n${doc.periodLabels[0]} ${fmt(row.before)} → ${doc.periodLabels[1]} ${fmt(row.after)} ${doc.unit}\n变化 ${row.after-row.before>0?'+':''}${fmt(row.after-row.before)} ${doc.unit}`);
  });
  s.text((left+right)/2,h-5,uiMessage`两侧共尺 / ${doc.unit}`,{'text-anchor':'middle','font-size':s.fs-2});
}

function range(s,doc){
  const {w,h,theme:t}=s,compact=s.compact||w<420,left=37,right=w-15,top=34,bottom=h-33,dates=doc.data.map(row=>new Date(`${row.period}T00:00:00Z`)),times=dates.map(Number),minGap=d3.min(times.slice(1).map((value,i)=>value-times[i])),pad=minGap*.6,x=d3.scaleUtc([new Date(times[0]-pad),new Date(times.at(-1)+pad)],[left,right]),y=d3.scaleLinear(s.linearDomain(doc.data.flatMap(row=>[row.low,row.high])),[bottom,top]).nice(4),tick=Math.max(.7,Math.min(compact?3:5,(x(new Date(times[0]+minGap))-x(dates[0]))*.3));
  s.text(left,13,uiMessage`观测范围 / ${doc.unit}`,{'font-size':s.fs-1});s.text(right,13,uiText('左起始 · 右结束'),{'text-anchor':'end','font-size':s.fs-2});
  y.ticks(4).forEach(value=>{s.line(left,y(value),right,y(value),{'stroke-width':.55,'stroke-dasharray':'1 5'});number(s,left-7,y(value)+3,fmt(value),{'text-anchor':'end'});});
  doc.data.forEach((row,i)=>{
    const xx=x(dates[i]),middle=y((row.low+row.high)/2),color=row.close>=row.open?t.fg:t.accent,g=s.group({'data-mark':'range-observation','data-period':row.period,'data-open':row.open,'data-high':row.high,'data-low':row.low,'data-close':row.close}),stem=s.line(xx,middle,xx,middle,{stroke:color,'stroke-width':1.05},g),open=s.line(xx-tick,y(row.open),xx,y(row.open),{stroke:color,'stroke-width':1.45},g),close=s.line(xx,y(row.close),xx+tick,y(row.close),{stroke:color,'stroke-width':1.45},g);
    s.add(p=>{const f=phase(p,i/doc.data.length*.28,.55);set(stem,{y1:middle+(y(row.high)-middle)*f,y2:middle+(y(row.low)-middle)*f});set(open,{opacity:phase(p,.35+i/doc.data.length*.24,.28)});set(close,{opacity:phase(p,.4+i/doc.data.length*.24,.28)});});
    const hit=s.rect(xx-Math.max(tick,3),y(row.high)-3,Math.max(tick,3)*2,Math.max(6,y(row.low)-y(row.high)+6),{fill:'transparent'},g);
    s.tip(hit,uiMessage`${row.period}\n起始 ${fmt(row.open)} · 结束 ${fmt(row.close)} ${doc.unit}\n最低 ${fmt(row.low)} · 最高 ${fmt(row.high)} ${doc.unit}`);
  });
  const indices=unique([0,Math.floor((dates.length-1)/2),dates.length-1]);indices.forEach(i=>number(s,x(dates[i]),bottom+18,doc.data[i].period.slice(5).replace('-','.'),{'text-anchor':'middle'}));
  s.line(left,bottom,right,bottom,{stroke:t.secondary,'stroke-width':.65});
  s.text(left,h-2,uiText('墨：结束 ≥ 起始'),{'font-size':s.fs-3});s.text(right,h-2,uiText('强调色：结束 < 起始'),{'text-anchor':'end','font-size':s.fs-3,fill:t.accent});
}

export const volume4Renderers={lollipop,pareto,violin,correlation,marimekko,smallmultiples,slope,range};
