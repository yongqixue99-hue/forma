import {scaleLinear,max,hierarchy,cluster} from 'd3';
import {recordId,populationId} from './data-identity.js';
import {base,axis,dot,line,key,glyph,fmt,short} from './scientific-geometry.js';
import {polygonPoints} from './morph.js';
import {measurementDomain} from './axis-policy.js';
import {marimekkoLayout} from './volume4-data.js';
import {likertLayout} from './volume7-data.js';
import {tornado13} from './volume13-data.js';
import {nomogram16,labbe16} from './volume16-data.js';
import {variwide18,waterfall18} from './volume18-data.js';
import {completionBusinessText as t,completionBusinessBounds,businessWaterfall} from './completion-business-rules.js';

const unique=a=>[...new Set(a)],domain=(a,zero=false)=>measurementDomain(a,{zero,padding:.065});
const roles={fg:{nativeColorRole:'fg'},accent:{nativeColorRole:'accent'},secondary:{nativeColorRole:'secondary'},line:{nativeColorRole:'line'}};
const defaultRole=(options,role)=>options.nativeColorIndex!==undefined||options.nativeDataColorIndex!==undefined||options.nativeTornadoLow?{}:role;
function frame(w,h){return{x:w<500?48:68,y:54,w:w-(w<500?69:92),h:Math.max(54,h-103)};}
function init(doc,view,w,h){return base(doc,view,w,h,frame(w,h));}
const original=(r,i)=>({identity:recordId(r),row:r.row,index:i,transitionIndex:i,group:'business'});
const derived=(identity,rows,i=0)=>({identity,recordIds:rows.map(recordId),index:i,transitionIndex:i,group:'business'});
function rect(l,m,role,x0,y0,x1,y1,options={}){return glyph(l,m,role,polygonPoints([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]),[(x0+x1)/2,(y0+y1)/2],options);}
function rawRect(l,r,i,role,x0,y0,x1,y1,field,options={}){return rect(l,original(r,i),role,x0,y0,x1,y1,{original:true,editable:field,value:r[field],opacity:.72,stroke:.65,...defaultRole(options,roles.fg),tooltip:JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k])=>!k.startsWith('_')&&k!=='row'))),...options});}
function rawDot(l,r,i,role,p,field,{radius=l.w<500?2.2:3,...options}={}){return dot(l,original(r,i),role,p,radius,{original:true,editable:field,value:r[field],opacity:.9,...defaultRole(options,roles.fg),tooltip:`${r.label??r.period??r.variable??r.parameter??''} · ${field}: ${fmt(r[field])} ${l.doc.unit}`,...options});}
function derivedLine(l,identity,rows,role,a,b,options={}){return line(l,derived(identity,rows),'business-'+role,a,b,[(a[0]+b[0])/2,(a[1]+b[1])/2],{derived:true,opacity:.36,width:1,...defaultRole(options,roles.secondary),...options});}
function orderLabels(l,rows,x,field='label'){const n=Math.min(rows.length,l.w<500?4:9),indices=[...new Set(Array.from({length:n},(_,i)=>Math.round(i*(rows.length-1)/Math.max(1,n-1))))];for(const i of indices)l.labels.push({x:x(i),y:l.plot.y+l.plot.h+17,text:short(rows[i][field],l.w<500?5:10),anchor:'middle',fontSize:9});}
function percentAxis(l,scale,horizontal,title){const start=l.labels.length;axis(l,scale,horizontal,{title});for(const a of l.labels.slice(start))if(a.small)a.text=fmt(scale.invert(horizontal?a.x:a.y-3)*100)+'%';}
function barFrom(l,r,i,role,x,yy,height,from,to,field,options={}){return rawRect(l,r,i,role,Math.min(x(from),x(to)),yy-height/2,Math.max(x(from),x(to)),yy+height/2,field,{projection:{start:from,end:to},...options});}

function waterfall(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,model=businessWaterfall(doc.data),alt=view.endsWith('-deltas'),y=scaleLinear(domain(bounds.value,true),[p.y+p.h,p.y]),slot=p.w/model.length,bw=slot*.62,x=i=>p.x+slot*(i+.5);
 axis(l,y,false,{title:doc.unit});orderLabels(l,doc.data,x);
 model.forEach((a,i)=>{const r=a.row,start=alt&&r.kind==='change'?0:a.start,end=alt&&r.kind==='change'?r.value:a.end,role=r.kind==='total'?roles.fg:r.value>=0?{nativeColorIndex:2}:roles.accent;
  rawRect(l,r,i,'business-waterfall-value',x(i)-bw/2,Math.min(y(start),y(end)),x(i)+bw/2,Math.max(y(start),y(end)),'value',{...role,projection:{start,end},kind:r.kind});
  if(i<model.length-1){const next=model[i+1],first=alt?end:a.end,last=alt?(next.row.kind==='total'?0:next.row.value):a.end;derivedLine(l,key(recordId(r),'next'),[r,next.row],'waterfall-connector',[x(i)+bw/2,y(first)],[x(i+1)-bw/2,y(last)],{opacity:alt?.14:.4});}
 });l.scales={y,x};l.statistics=model;l.heading=t('起终总量与原始变化保持区别','Distinguish initial/final totals from original changes');l.details=alt?t('变化从零展示 · 总量保持总量','Changes start at zero · totals remain totals'):t('前一净额 + 原始变化 = 下一净额','Previous balance + original change = next balance');return l;
}

// Fixed-count clipped hatches retain correspondence while a cell reshapes.
// Their endpoints are derived from the cell rectangle, never from invented data.
function hatchCell(l,r,role,x0,y0,x1,y1,color,index){
 const width=x1-x0,height=y1-y0,angle=index%2?-1:1;
 for(let j=0;j<8;j++){const q=-.75+j*.25,start=Math.max(0,q),end=Math.min(1,q+1);const a=[x0+start*width,y0+(angle>0?Math.max(0,-q):1-Math.max(0,-q))*height],b=[x0+end*width,y0+(angle>0?Math.min(1,1-q):1-Math.min(1,1-q))*height];derivedLine(l,key(recordId(r),role,j),[r],'cell-hatch',a,b,{...color,width:.45,opacity:width>0&&height>0?.17:0});}
}
function mekko(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,groups=doc.groupOrder||unique(doc.data.map(r=>r.group)),series=doc.seriesOrder||unique(doc.data.map(r=>r.series)),ordered=groups.flatMap(group=>series.map(s=>doc.data.find(r=>r.group===group&&r.series===s))),model=marimekkoLayout(ordered),alt=view.endsWith('-counts'),x=scaleLinear(domain(bounds.value,true),[p.x,p.x+p.w]);
 if(alt)axis(l,x,true,{title:doc.unit});else{const y=scaleLinear([0,1],[p.y+p.h,p.y]);percentAxis(l,y,false,t('组内比例','Within-group proportion'));}
 model.groups.forEach((g,i)=>{let running=0;g.cells.forEach((c,j)=>{const r=doc.data.find(r=>recordId(r)===recordId(c)),color=j===2?roles.accent:roles.fg;let x0,x1,y0,y1;
   if(alt){const cy=p.y+p.h*(i+.5)/groups.length,bh=Math.min(30,p.h/groups.length*.6);x0=x(running);running+=r.value;x1=x(running);y0=cy-bh/2;y1=cy+bh/2;}
   else{x0=p.x+g.left*p.w;x1=x0+g.width*p.w;y0=p.y+p.h*(1-c.bottom-c.height);y1=p.y+p.h*(1-c.bottom);}
   const mark=rawRect(l,r,r.row,'business-mekko-cell',x0,y0,x1,y1,'value',{...color,paper:j!==0,opacity:j===0?.16:.8,projection:{groupTotal:g.total,share:c.share,withinShare:c.height,groupWidth:g.width},stroke:.65});hatchCell(l,r,'mekko-hatch',x0,y0,x1,y1,j===4?roles.secondary:color,j);
   if(x1-x0>30&&y1-y0>18)l.labels.push({x:(x0+x1)/2,y:(y0+y1)/2+3,text:alt?fmt(r.value):fmt(c.height*100)+'%',anchor:'middle',fontSize:9,contrastMark:mark});
  });l.labels.push({x:alt?p.x-6:p.x+(g.left+g.width/2)*p.w,y:alt?p.y+p.h*(i+.5)/groups.length+3:p.y+p.h+17,text:short(g.group,w<500?5:12),anchor:alt?'end':'middle',fontSize:9});
 });l.groups=series;l.groupKeys=series;l.groupColorMarks=series.map((_,j)=>j===2?roles.accent:roles.fg);l.groupLegendColumns=Math.min(series.length,w<500?3:5);l.statistics=model;l.scales={x};l.heading=t('原始数量与构成份额','Raw counts and composition shares');l.details=alt?t('长度=原数量 · 每组完整堆叠','Length = raw quantity · complete group stacks'):t('面积=整体份额 · 组宽=组总量份额','Area = global share · width = group-total share');return l;
}
function ranges(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,alt=view.endsWith('-departures'),x=scaleLinear(bounds.date,[p.x,p.x+p.w]),y=scaleLinear(domain(alt?bounds.departure:bounds.value),[p.y+p.h,p.y]);axis(l,y,false,{title:alt?t('相对本条 open 的变化 · ','Departure from own open · ')+doc.unit:doc.unit});
 const n=Math.min(doc.data.length,w<500?4:8);for(let j=0;j<n;j++){const i=Math.round(j*(doc.data.length-1)/(n-1));l.labels.push({x:x(Date.parse(doc.data[i].period)),y:p.y+p.h+17,text:doc.data[i].period.slice(5),anchor:'middle',fontSize:9});}
 doc.data.forEach((r,i)=>{const xx=x(Date.parse(r.period)),project=k=>y(r[k]-(alt?r.open:0)),low=project('low'),high=project('high'),color=r.close>=r.open?roles.fg:roles.accent;
  derivedLine(l,key(recordId(r),'range'),[r],'observed-range',[xx,low],[xx,high],{...color,opacity:.55,width:1.1,projection:{low:r.low-(alt?r.open:0),high:r.high-(alt?r.open:0)}});
  for(const[field,dx]of[['low',0],['high',0],['open',-4],['close',4]])rawDot(l,r,i,'business-range-'+field,[xx+dx,project(field)],field,{...color,radius:field==='close'?2.5:1.8,projection:{x:Date.parse(r.period),y:r[field]-(alt?r.open:0)},paper:field==='open',stroke:.75});
  for(const[field,sign]of[['open',-1],['close',1]])derivedLine(l,key(recordId(r),'range-tick',field),[r],'range-tick',[xx,project(field)],[xx+sign*6,project(field)],{...color,opacity:.7});
 });l.scales={x,y};l.heading=t('原始观测高低范围 · 非置信区间','Original observed high/low range · not a confidence interval');l.details=t('真实日期间隔 · open/close/low/high 完整保留','Actual date spacing · complete open/close/low/high retained');return l;
}
function pyramid(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,alt=view.endsWith('-paired'),x=scaleLinear(domain(bounds.value,true),[p.x,p.x+p.w]),length=scaleLinear(domain(bounds.value,true),[0,p.w*.43]),slot=p.h/doc.data.length,bh=Math.min(15,slot*.3),center=p.x+p.w/2;
 if(alt)axis(l,x,true,{title:doc.unit});else{for(const v of length.ticks(3))for(const sign of[-1,1])l.labels.push({x:center+sign*length(v),y:p.y+p.h+17,text:fmt(v),anchor:'middle',fontSize:9});}
 doc.data.forEach((r,i)=>{const cy=p.y+slot*(i+.5);for(const[field,sign,role]of[['left',-1,roles.fg],['right',1,roles.accent]]){const start=alt?x(0):center,end=alt?x(r[field]):center+sign*length(r[field]),yy=alt?cy+(field==='left'?-bh/1.5:bh/1.5):cy;rawRect(l,r,i,'business-pyramid-'+field,Math.min(start,end),yy-bh/2,Math.max(start,end),yy+bh/2,field,{...role,projection:{quantity:r[field],side:field},paper:field==='left',stroke:.85});}
  l.labels.push({x:p.x-6,y:cy+3,text:short(r.label,w<500?5:12),anchor:'end',fontSize:9});
 });l.groups=doc.sideLabels;l.groupKeys=['left','right'];l.groupColorMarks=[roles.fg,roles.accent];l.scales={x,length};l.heading=t('共同数量尺度 · 左侧同样为正值','Shared quantity scale · the left side is positive too');l.details=doc.sideLabels.join(' / ');return l;
}
function tree(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,parents=unique(doc.data.map(r=>r.parent)),root=hierarchy({name:t('合计','Total'),children:parents.map(parent=>({name:parent,children:doc.data.filter(r=>r.parent===parent).map(r=>({...r,name:r.label}))}))}).sum(r=>r.value||0),alt=view.endsWith('-radial');
 cluster().size([alt?2*Math.PI:p.h,alt?Math.min(p.w,p.h)*.4:p.w*.76])(root);
 const center=[p.x+p.w/2,p.y+p.h/2],position=node=>alt?[center[0]+Math.cos(node.x-Math.PI/2)*node.y,center[1]+Math.sin(node.x-Math.PI/2)*node.y]:[p.x+node.y,p.y+node.x],rows=node=>node.leaves().map(n=>doc.data.find(r=>recordId(r)===recordId(n.data))),nodeId=node=>populationId('business-tree-node',rows(node));
 root.links().forEach(({source,target})=>{const a=position(source),b=position(target);derivedLine(l,key(nodeId(source),nodeId(target)),rows(target),'tree-link',a,b,{opacity:.4,width:.8});});
 root.descendants().forEach((node,i)=>{const at=position(node),records=rows(node),parent=node.depth===2?parents.indexOf(node.parent.data.name):-1,color=node.depth===2?{nativeColorIndex:parent}:roles.fg,radius=node.depth===2?(w<500?5:7)*Math.sqrt(node.value/bounds.value[1]):2.8;
  if(node.depth===2){const r=records[0];rawDot(l,r,r.row,'business-tree-leaf',at,'value',{...color,radius,paper:true,stroke:1,projection:{structural:true,parent:r.parent}});l.labels.push({x:at[0]+(alt&&at[0]<center[0]?-8:8),y:at[1]+3,text:short(r.label,w<500?4:9),anchor:alt&&at[0]<center[0]?'end':'start',fontSize:8});}
  else dot(l,derived(nodeId(node),records,i),'business-tree-node',at,radius,{derived:true,...color,value:node.value,opacity:.9,tooltip:node.data.name+' · '+fmt(node.value)+' '+doc.unit});
 });l.statistics={total:root.value,parents};l.heading=t('原父子归属 · 叶圆面积=原数量','Original membership · leaf-circle area = raw quantity');l.details=t('距离和角度仅用于组织结构','Distances and angles organize structure only');return l;
}
function likert(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,alt=view.endsWith('-stacked'),model=likertLayout(doc),order=doc.questionOrder||model.map(g=>g.question),range=Math.ceil(max(model,g=>Math.max(-g.segments[0].start,g.segments.at(-1).end))/10)*10,x=scaleLinear(alt?[0,100]:[-range,range],[p.x,p.x+p.w]),slot=p.h/model.length;
 const labelStart=l.labels.length;axis(l,x,true,{title:'%'});if(!alt)for(const a of l.labels.slice(labelStart))if(a.small)a.text=fmt(Math.abs(x.invert(a.x)))+'%';
 const colors=[roles.fg,roles.secondary,roles.line,{nativeColorIndex:2},roles.accent];
 order.forEach((name,i)=>{const group=model.find(g=>g.question===name),cy=p.y+slot*(i+.5),bh=Math.min(26,slot*.6);let cursor=0;group.segments.forEach((a,j)=>{const r=doc.data.find(r=>recordId(r)===recordId(a)),start=alt?cursor:a.start,end=alt?cursor+r.value:a.end;cursor+=r.value;barFrom(l,r,r.row,'business-response',x,cy,bh,start,end,'value',{...colors[j],opacity:j===3?.65:1,projection:{start,end,responseIndex:j}});});l.labels.push({x:p.x-7,y:cy+3,text:short(name,w<500?5:11),anchor:'end',fontSize:9});});
 l.groups=doc.responses;l.groupKeys=doc.responses;l.groupColorMarks=colors;l.groupLegendColumns=w<500?3:5;l.scales={x};l.statistics=model;l.heading=t('五档顺序与每项 100% 保留','Retain five ordered responses and 100% per item');l.details=alt?t('原完整比例从零累计','Complete original proportions accumulate from zero'):t('中立选项跨越零点','The neutral response straddles zero');return l;
}
function forecast(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,rows=doc.data,split=rows.findIndex(r=>r.observed===null),future=rows.slice(split),reference=rows[split-1].observed,alt=view.endsWith('-departures'),x=scaleLinear(bounds.order,[p.x,p.x+p.w]),y=scaleLinear(domain(alt?bounds.departure:bounds.value),[p.y+p.h,p.y]),project=v=>y(v-(alt?reference:0));
 axis(l,y,false,{title:alt?t('相对最后历史观测 · ','Departure from last history · ')+doc.unit:doc.unit});orderLabels(l,rows,x,'period');
 // Both contour flanks sample the same original piecewise-linear time grid.
 // This display reference never adds records or narrows the provided intervals.
 for(const[level,opacity]of[[95,.12],[80,.15],[50,.25]]){
  const sample=(field,j)=>{const f=j/63*(future.length-1),i=Math.min(future.length-2,Math.floor(f)),q=f-i,value=future[i][field]*(1-q)+future[i+1][field]*q;return[x(split+f),project(value)];},top=Array.from({length:64},(_,j)=>sample('upper'+level,j)),bottom=Array.from({length:64},(_,j)=>sample('lower'+level,j));
  glyph(l,derived(populationId('forecast-band-'+level,future),future),'business-forecast-band',top.concat(bottom.reverse()),[x(split+(future.length-1)/2),project(future[Math.floor(future.length/2)].median)],{derived:true,nativeDataColorIndex:0,nativeColorRole:'accent',opacity,intervalLevel:level});
 }
 rows.forEach((r,i)=>{const fields=r.observed===null?['lower95','upper95','lower80','upper80','lower50','upper50','median']:['observed'];for(const field of fields)rawDot(l,r,i,'business-forecast-'+field,[x(i),project(r[field])],field,{...(field==='observed'?roles.fg:{nativeDataColorIndex:0,nativeColorRole:'accent'}),radius:field==='observed'||field==='median'?2.5:1.6,paper:field==='observed',stroke:field==='observed'?1:0,opacity:field==='median'||field==='observed'?1:.5,projection:{x:i,y:r[field]-(alt?reference:0)},tooltip:`${r.period} · ${field}: ${fmt(r[field])} ${doc.unit}`});
  const field=r.observed===null?'median':'observed';if(i&&(rows[i-1].observed===null)===(r.observed===null))derivedLine(l,key(recordId(r),'forecast-trace'),[rows[i-1],r],'forecast-trace',[x(i-1),project(rows[i-1][field])],[x(i),project(r[field])],{...(field==='observed'?roles.fg:{nativeDataColorIndex:0,nativeColorRole:'accent'}),opacity:.9,width:1.4});
 });l.scales={x,y};l.statistics={split,reference,levels:[50,80,95]};l.heading=t('输入的中央预测区间 · 不重新拟合','Supplied central prediction intervals · no refitting');l.details=alt?t('坐标减去最后历史观测 · 区间宽度保持','Subtract the last observation · interval widths retained'):t('历史与预测分别连接 · 不伪造过渡预测点','Separate history and forecast traces · no invented bridging forecast');return l;
}
function tornado(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,model=tornado13(doc),alt=view.endsWith('-plane'),x=scaleLinear(domain(bounds.value),[p.x,p.x+p.w]),y=scaleLinear(domain(bounds.value),[p.y+p.h,p.y]),slot=p.h/model.length;
 axis(l,x,true,{title:alt?t('低输入情景的输出 · ','Low-input scenario output · ')+doc.unit:doc.unit});if(alt)axis(l,y,false,{title:t('高输入情景的输出 · ','High-input scenario output · ')+doc.unit});
 model.forEach((a,i)=>{const r=a.row,bh=Math.min(12,slot*.27),cy=p.y+slot*(i+.5),at=alt?[x(r.low),y(r.high)]:null;
  for(const[field,color,sign]of[['low',{nativeTornadoLow:true,nativeColorIndex:0},-1],['high',roles.accent,1]]){const a=alt?[x(doc.baseline),at[1]+sign*2]:[x(doc.baseline),cy+sign*bh/1.3],b=alt?[at[0],at[1]+sign*2]:[x(r[field]),cy+sign*bh/1.3];rawRect(l,r,r.row,'business-tornado-'+field,Math.min(a[0],b[0]),a[1]-(alt?.7:bh/2),Math.max(a[0],b[0]),a[1]+(alt?.7:bh/2),field,{...color,opacity:alt?.2:.68,projection:{scenario:field,output:r[field],baseline:doc.baseline}});
   rawDot(l,r,r.row,'business-tornado-end-'+field,alt?at:[x(r[field]),cy+sign*bh/1.3],field,{...color,radius:alt?(field==='low'?3.6:2.2):1.7,paper:alt&&field==='low',stroke:alt&&field==='low'?.9:0,projection:{x:alt?r.low:r[field],y:alt?r.high:i,scenario:field}});
  }if(!alt)l.labels.push({x:p.x-7,y:cy+3,text:short(r.parameter,w<500?5:12),anchor:'end',fontSize:9});
 });l.scales={x,y};l.statistics=model;l.heading=t('low/high 是低高输入情景，不是置信界限','Low/high are input scenarios, not confidence limits');l.details=alt?t('同一参数的两情景输出配对','Pair the two scenario outputs of the same parameter'):t('按最大绝对基准偏离排序','Order by maximum absolute departure from baseline');return l;
}
function variwide(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,model=variwide18(doc.data),alt=view.endsWith('-amount'),x=scaleLinear(domain(alt?bounds.amount:bounds.width,true),[p.x,p.x+p.w]),y=scaleLinear(domain(bounds.rate,true),[p.y+p.h,p.y]),slot=p.h/doc.data.length;
 axis(l,x,true,{title:alt?doc.unit:doc.axes.x});if(!alt)axis(l,y,false,{title:doc.axes.y});
 model.bars.forEach((a,i)=>{const r=a.row,color={nativeColorIndex:i};let x0,x1,y0,y1;if(alt){const cy=p.y+slot*(i+.5),bh=Math.min(25,slot*.65);x0=x(0);x1=x(a.amount);y0=cy-bh/2;y1=cy+bh/2;l.labels.push({x:p.x-7,y:cy+3,text:short(r.label,w<500?5:12),anchor:'end',fontSize:9});}else{x0=x(a.start);x1=x(a.end);y0=y(r.rate);y1=y(0);}
  rawRect(l,r,i,'business-variwide-record',x0,y0,x1,y1,'rate',{...color,opacity:.68,projection:{width:r.width,rate:r.rate,amount:a.amount,start:a.start,end:a.end},tooltip:`${r.label} · width=${fmt(r.width)} ${doc.axes.x} · rate=${fmt(r.rate)} ${doc.axes.y} · width×rate=${fmt(a.amount)} ${doc.unit}`});
 });l.statistics=model;l.scales={x,y};l.heading=alt?t('长度=原数量×原率','Length = original quantity × original rate'):t('宽度=数量 · 高度=率 · 面积=总量','Width = quantity · height = rate · area = amount');l.details=t('零率不创造正面积 · 全部原字段保留','Zero rates create no positive area · all raw fields retained');return l;
}
function components(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,model=waterfall18(doc),alt=view.endsWith('-deltas'),y=scaleLinear(domain(bounds.value,true),[p.y+p.h,p.y]),slot=p.w/(doc.stepOrder.length+2),x=i=>p.x+slot*(i+.5),bw=slot*.62;
 axis(l,y,false,{title:doc.unit});const total=(value,i,which)=>rect(l,derived(populationId('business-waterfall-'+which,doc.data),doc.data),'business-component-total',x(i)-bw/2,Math.min(y(0),y(value)),x(i)+bw/2,Math.max(y(0),y(value)),{derived:true,value,...roles.fg,opacity:.8,tooltip:which+' '+fmt(value)+' '+doc.unit});
 total(doc.baseline,0,'baseline');total(doc.finalTotal,doc.stepOrder.length+1,'final');
 model.steps.forEach((step,i)=>{step.parts.forEach((a,j)=>{const r=a.row,width=alt?bw/doc.components.length:bw,center=alt?x(i+1)-bw/2+width*(j+.5):x(i+1),start=alt?0:a.start,end=alt?r.value:a.end;rawRect(l,r,r.row,'business-component-value',center-width/2,Math.min(y(start),y(end)),center+width/2,Math.max(y(start),y(end)),'value',{nativeColorIndex:j,opacity:.75,projection:{start,end,step:step.step,component:r.component}});});derivedLine(l,key('component-net',populationId('business-step',step.parts.map(a=>a.row))),step.parts.map(a=>a.row),'component-net',[x(i+1)-bw/2,y(step.end)],[x(i+1)+bw/2,y(step.end)],{...roles.fg,opacity:alt?.2:.9,net:step.end});});
 const names=[t('起始','Start'),...doc.stepOrder,t('最终','Final')];names.forEach((name,i)=>l.labels.push({x:x(i),y:p.y+p.h+17,text:short(name,w<500?5:10),anchor:'middle',fontSize:9}));l.groups=doc.components;l.groupKeys=doc.components;l.groupColorMarks=doc.components.map((_,j)=>({nativeColorIndex:j}));l.groupLegendColumns=w<500?3:6;l.statistics=model;l.scales={y,x};l.heading=t('正负分量分别保留 · 净额守恒','Retain opposing components · reconcile net balances');l.details=alt?t('每个分量展示原始有符号变化','Each component displays its raw signed change'):t('正负分别从前一净额累计','Positive and negative stacks start at the previous net balance');return l;
}
function nomogram(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,model=nomogram16(doc),alt=view.endsWith('-cumulative'),x=scaleLinear(domain(alt?bounds.value:bounds.contribution),[p.x,p.x+p.w]),slot=p.h/(model.rows.length+1),totalX=scaleLinear(domain(bounds.value),[p.x,p.x+p.w]);let balance=doc.intercept;
 axis(l,x,true,{title:alt?t('累计线性分数 · ','Cumulative linear score · ')+doc.unit:t('线性贡献 · ','Linear contribution · ')+doc.unit});
 model.rows.forEach((a,i)=>{const r=a.row,cy=p.y+slot*(i+.5),start=alt?balance:0,end=alt?balance+a.contribution:a.contribution;balance+=a.contribution;
  const color={nativeColorIndex:i},limitStart=alt?start+a.low:a.low,limitEnd=alt?start+a.high:a.high;derivedLine(l,key(recordId(r),'nomogram-range'),[r],'nomogram-range',[x(limitStart),cy],[x(limitEnd),cy],{...color,opacity:.35,width:1.3,projection:{low:limitStart,high:limitEnd}});
  rect(l,derived(key(recordId(r),'linear-contribution'),[r]),'business-linear-contribution',Math.min(x(start),x(end)),cy-3,Math.max(x(start),x(end)),cy+3,{derived:true,value:a.contribution,...color,opacity:.35,projection:{start,end,contribution:a.contribution}});
  rawDot(l,r,i,'business-nomogram-input',[x(end),cy],'value',{...color,radius:3.5,projection:{score:end,contribution:a.contribution,raw:r.value},tooltip:`${r.variable} · value=${fmt(r.value)} · coefficient=${fmt(r.coefficient)} · reference=${fmt(r.reference)} · contribution=${fmt(a.contribution)} ${doc.unit}`});
  l.labels.push({x:p.x-7,y:cy+3,text:short(r.variable,w<500?8:16),anchor:'end',fontSize:9});
 });const totalY=p.y+slot*(model.rows.length+.5);dot(l,derived(populationId('business-total-score',doc.data),doc.data),'business-total-score',[totalX(model.total),totalY],4.5,{derived:true,...roles.accent,value:model.total,opacity:.95,projection:{intercept:doc.intercept,total:model.total},tooltip:t('总分','Total score')+' = '+fmt(model.total)+' '+doc.unit});
 derivedLine(l,populationId('business-total-score-ruler',doc.data),doc.data,'total-score-ruler',[totalX(bounds.value[0]),totalY],[totalX(bounds.value[1]),totalY],{...roles.fg,opacity:.55});l.labels.push({x:p.x-7,y:totalY+3,text:t('总分','Total score'),anchor:'end',fontSize:9});l.statistics=model;l.scales={x,totalX};l.heading='intercept + Σ β × (value − reference) = '+fmt(model.total)+' '+doc.unit;l.details=t('固定输入系数 · 原值可编辑 · 不输出风险概率','Fixed supplied coefficients · editable raw inputs · no risk probabilities');return l;
}
function labbe(doc,view,w,h,bounds){
 const l=init(doc,view,w,h),p=l.plot,model=labbe16(doc.data),alt=view.endsWith('-difference'),x=scaleLinear([0,1],[p.x,p.x+p.w]),y=scaleLinear(alt?domain(bounds.difference):[0,1],[p.y+p.h,p.y]),rmax=w<500?9:13;
 percentAxis(l,x,true,t('对照组事件比例','Control event proportion'));percentAxis(l,y,false,alt?t('处理−对照比例差','Treatment−control risk difference'):t('处理组事件比例','Treatment event proportion'));
 derivedLine(l,populationId('labbe-equality',doc.data),doc.data,'labbe-equality',[x(0),y(alt?0:0)],[x(1),y(alt?0:1)],{...roles.secondary,opacity:.6,width:.9});
 [...model].sort((a,b)=>b.size-a.size).forEach((a,i)=>{const r=a.row,value=alt?a.treatment-a.control:a.treatment;rawDot(l,r,r.row,'business-labbe-study',[x(a.control),y(value)],'treatmentEvents',{...roles.accent,radius:rmax*Math.sqrt(a.size/bounds.size[1]),opacity:.22,stroke:.8,projection:{control:a.control,treatment:a.treatment,difference:a.treatment-a.control,size:a.size,y:value},tooltip:`${r.label} · controlEvents=${r.controlEvents} · controlTotal=${r.controlTotal} · treatmentEvents=${r.treatmentEvents} · treatmentTotal=${r.treatmentTotal} · n=${a.size}`});});
 l.statistics=model;l.scales={x,y};l.heading=t('气泡面积=两组合计样本量','Bubble area = combined sample size');l.details=t('完整原计数与分母 · 无合并效应或显著性标记','Complete raw counts and denominators · no pooled effect or significance claim');return l;
}
const renderers={waterfall,marimekko:mekko,range:ranges,pyramid,dendrogram:tree,likert,forecastfan:forecast,tornado,variwide,stackedwaterfall:components,nomogram,labbe};
export function layoutCompletionBusiness(doc,view,w=800,h=440,{domain:shared}={}){
 const layout=renderers[doc.template||doc.family.slice('complete-business-'.length)](doc,view,w,h,shared||completionBusinessBounds(doc));
 // Background statistics sit below original edit targets. Cell hatches sit
 // above their paper-filled originals so native texture remains visible.
 const layer=m=>m.role==='business-cell-hatch'?2:m.original?1:0;
 layout.marks.sort((a,b)=>layer(a)-layer(b));
 return layout;
}
