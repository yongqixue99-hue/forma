import {scaleLinear,bisectRight} from 'd3';
import {recordId,populationId} from './data-identity.js';
import {circlePoints,rectPoints,polygonPoints} from './morph.js';
import {base,axis,dot,glyph,line,segment,key,fmt,hash} from './scientific-geometry.js';
import {measurementDomain} from './axis-policy.js';
import {qqRows,survivalSteps} from './volume7-data.js';
import {lorenz12,pp12} from './volume12-data.js';
import {weibull15,meanExcess15,ttt15} from './volume15-data.js';
import {ecdfBand17} from './volume17-data.js';
import {nelson18} from './volume18-data.js';
import {statisticalText as t,statisticalBounds,statisticalOrdered,statisticalGroupKey} from './statistical-series-rules.js';

const stableGroups=rows=>[...new Set(rows.map(r=>r.group))].map(group=>rows.filter(r=>r.group===group)).sort((a,b)=>statisticalGroupKey(a).localeCompare(statisticalGroupKey(b)));
const stepped=(a,b,width=1.3)=>{
 if(a[0]===b[0]||a[1]===b[1])return segment(a,b,width);
 const s=width/2,turn=b[1]<a[1]?-1:1;
 // The inner/outer corner swaps when a probability step rises on screen.
 // Keeping the same corner ordering would create a self-intersecting contour.
 return polygonPoints([[a[0],a[1]-s],[b[0]+turn*s,a[1]-s],[b[0]+turn*s,b[1]],[b[0]-turn*s,b[1]],[b[0]-turn*s,a[1]+s],[a[0],a[1]+s]]);
};
const range=(values,zero=false)=>measurementDomain(values,{zero,padding:.07});
const plus=(x,y,r=3)=>polygonPoints([[x-1,y-r],[x+1,y-r],[x+1,y-1],[x+r,y-1],[x+r,y+1],[x+1,y+1],[x+1,y+r],[x-1,y+r],[x-1,y+1],[x-r,y+1],[x-r,y-1],[x-1,y-1]]);
export function layoutStatistical(doc,view,w=800,h=440,options={}){
 return doc.family==='statistical-survival'?layoutDurations(doc,view,w,h,options):layoutOriginals(doc,view,w,h,options);
}
function layoutOriginals(doc,view,w,h,{domain}={}){
 const qq=view==='stat-qq',pp=view==='stat-pp',weibull=view==='stat-weibull',excess=view==='stat-meanexcess',ttt=view==='stat-ttt',lorenz=view==='stat-lorenz',ecdf=view==='stat-ecdfband';
 const rows=statisticalOrdered(doc.data),values=rows.map(r=>r.value),n=rows.length,bounds=domain||statisticalBounds(doc),summary=excess?meanExcess15(rows,doc.minExceedances):[];
 let plot={x:60,y:48,w:w-86,h:h-(excess?133:108)};
 if(qq||pp||ttt||lorenz){const side=Math.min(plot.w,plot.h);plot={x:(w-side)/2,y:48,w:side,h:side};}
 const layout=base(doc,view,w,h,plot),colorIdentity=statisticalGroupKey(rows),group=t('原始观测','Original observations'),common={identity:populationId('statistical-summary',rows),colorIdentity,index:0,transitionIndex:0,group,recordIds:rows.map(recordId)};
 let xd,yd,xTitle,yTitle,calculated=new Map();
 if(qq){const points=qqRows(rows);points.forEach(r=>calculated.set(recordId(r),{x:r.theoretical,y:r.value}));xd=yd=range([...bounds.value,...bounds.theoretical]);xTitle=t('拟合正态分位','Fitted normal quantile')+' / '+doc.unit;yTitle=t('观测值','Observed value')+' / '+doc.unit;}
 else if(pp){pp12(rows,doc.referenceMean,doc.referenceSD).forEach(p=>calculated.set(recordId(p.row),{x:p.theoretical,y:p.empirical}));xd=yd=[0,1];xTitle=t('指定正态模型概率','Declared normal-model probability');yTitle=t('经验累计概率','Empirical cumulative probability');}
 else if(weibull){weibull15(rows).forEach(p=>calculated.set(recordId(p.row),{x:p.x,y:p.y,p:p.p}));xd=range(bounds.logValue);yd=range(bounds.weibull);xTitle='ln(value) · value / '+doc.unit;yTitle='ln(−ln(1−p))';}
 else if(ttt||lorenz){const stats=ttt?{points:ttt15(rows)}:lorenz12(rows);layout.statistics=stats;stats.points.slice(1).forEach(p=>calculated.set(recordId(p.row),{x:ttt?p.fraction:p.population,y:ttt?p.total:p.share}));xd=yd=[0,1];xTitle=ttt?t('累计失效份额 i/n','Cumulative failure fraction i/n'):t('累计样本份额','Cumulative sample share');yTitle=ttt?t('总试验时间份额','Total time-on-test share'):t('累计资源份额','Cumulative resource share');}
 else{xd=range(bounds.value);yd=excess?range(bounds.excess,true):[0,1];xTitle=(excess?t('阈值','Threshold'):t('观测值','Observed value'))+' / '+doc.unit;yTitle=excess?t('平均超额','Mean excess')+' / '+doc.unit:t('经验累计概率','Empirical cumulative probability');rows.forEach(r=>calculated.set(recordId(r),{x:r.value,y:excess?0:bisectRight(values,r.value)/n}));}
 const x=scaleLinear(xd,[plot.x,plot.x+plot.w]),y=scaleLinear(yd,[plot.y+plot.h,plot.y]),at=p=>[x(p.x),y(p.y)];
 axis(layout,x,true,{title:xTitle});axis(layout,y,false,{title:yTitle});
 layout.heading=t(n+' 个原始观测',n+' original observations');
 layout.details=excess?t('下方为全部原样本 · 点线为严格超额均值','All raw samples below · line shows strict-exceedance means'):ecdf?t('DKW 同时带 · '+fmt((1-doc.alpha)*100)+'% · 独立同分布','DKW simultaneous band · '+fmt((1-doc.alpha)*100)+'% · IID'):lorenz?'Gini = '+fmt(layout.statistics.gini):qq?t('样本拟合正态 · 保留全部原值','Sample-fitted normal · all raw values retained'):pp?'N('+fmt(doc.referenceMean)+', '+fmt(doc.referenceSD)+'²)':weibull?t('完整正寿命 · 不自动拟合','Complete positive lifetimes · no fit'):t('完整等权寿命 · 非风险率估计','Complete equally weighted lifetimes · not a hazard estimate');
 if(qq||pp||ttt||lorenz)layout.guides.push({x1:x(xd[0]),y1:y(yd[0]),x2:x(xd[1]),y2:y(yd[1]),major:true,dashed:true});
 const coordinates=new Map(rows.map(r=>[recordId(r),excess?[x(r.value),plot.y+plot.h+36+(hash(recordId(r))%3-1)*2]:at(calculated.get(recordId(r)))]));
 // Every original record has one persistent sample contour. Summaries never take its identity.
 rows.forEach((r,i)=>{
  const p=coordinates.get(recordId(r)),derived=calculated.get(recordId(r)),extra=weibull?' · p='+fmt(derived.p):!excess?' · X='+fmt(derived.x)+' · Y='+fmt(derived.y):'';
  const m={identity:recordId(r),colorIdentity,index:r.row,transitionIndex:r.row,group,row:r.row};
  const opts={opacity:.8,editable:'value',value:r.value,tooltip:r.label+' · '+String(r.value)+' '+doc.unit+extra,original:true,projection:derived};
  if(excess)glyph(layout,m,'sample',rectPoints(p[0]-.85,p[1]-3,.17*10,6),p,opts);else dot(layout,m,'sample',p,w<500?1.8:2.5,opts);
  // Sorted cumulative lines have separate identities from their endpoint records.
  const previous=i?coordinates.get(recordId(rows[i-1])):ecdf?[plot.x,y(0)]:[x(0),y(0)],show=ttt||lorenz||ecdf;
  glyph(layout,{...common,identity:key('statistical-link',i?recordId(rows[i-1]):'origin',recordId(r)),transitionIndex:i,recordIds:i?[recordId(rows[i-1]),recordId(r)]:[recordId(r)]},'cumulative-link',show?(ecdf?stepped(previous,p):segment(previous,p,1.4)):circlePoints(...p,0),p,{opacity:show?.72:0,derived:true});
 });
 if(ecdf){
  const model=ecdfBand17(doc),points=[{value:xd[0],p:0,low:0,high:Math.min(1,model.epsilon)},...model.points];
  points.forEach((p,i)=>{const end=points[i+1]?.value??xd[1],xx=x(p.value),width=Math.max(0,x(end)-xx),center=[xx+width/2,y(p.p)],sources=rows.filter(r=>r.value===p.value);glyph(layout,{...common,identity:key(common.identity,'band',i===0?'origin':populationId('threshold',sources)),transitionIndex:i},'dkw-band',rectPoints(xx,y(p.high),width,y(p.low)-y(p.high)),center,{opacity:.14,derived:true,entrance:rectPoints(xx,y(p.p),width,0),low:p.low,high:p.high,probability:p.p,epsilon:model.epsilon,tooltip:t('DKW 同时置信带','DKW simultaneous confidence band')+' · ['+fmt(p.low)+', '+fmt(p.high)+'] · n='+n});});
  const last=coordinates.get(recordId(rows.at(-1))),end=[plot.x+plot.w,y(1)];line(layout,common,'cdf-tail',last,end,last,{derived:true,opacity:.72,width:1.4});layout.statistics=model;
 }
 if(excess){
  layout.statistics=summary;layout.labels.push({x:plot.x,y:plot.y+plot.h+57,text:t('全部原始观测（可编辑）','All original observations (editable)'),fontSize:9});
  summary.forEach((p,i)=>{const sources=rows.filter(r=>r.value===p.threshold),identity=populationId('excess-threshold',sources),commonPoint={...common,identity,transitionIndex:i,recordIds:p.rows.map(recordId)},point=[x(p.threshold),y(p.mean)],anchor=[x(p.threshold),plot.y+plot.h+36];dot(layout,commonPoint,'excess-mean',point,w<500?2:2.8,{derived:true,opacity:.95,value:p.mean,threshold:p.threshold,count:p.count,entrance:circlePoints(...anchor,0),tooltip:t('派生超额均值，非原始观测','Derived excess mean, not an observation')+' · u='+fmt(p.threshold)+' · e(u)='+fmt(p.mean)+' '+doc.unit+' · n(x>u)='+p.count});if(i){const previous=summary[i-1],a=[x(previous.threshold),y(previous.mean)];line(layout,{...commonPoint,identity:key('excess-link',populationId('excess-threshold',rows.filter(r=>r.value===previous.threshold)),identity)},'excess-link',a,point,anchor,{derived:true,opacity:.8,width:1.4});}});
 }
 layout.marks.sort((a,b)=>Number(!a.derived)-Number(!b.derived));layout.scales={x,y};layout.groups=[group];layout.groupKeys=[colorIdentity];return layout;
}
function layoutDurations(doc,view,w,h,{domain}={}){
 const km=view==='stat-survival',parts=stableGroups(doc.data),bounds=domain||statisticalBounds(doc),plot={x:58,y:65,w:w-83,h:h-122},layout=base(doc,view,w,h,plot);
 const x=scaleLinear(bounds.duration[1]>0?bounds.duration:[0,1],[plot.x,plot.x+plot.w]),y=scaleLinear(km?[0,1]:bounds.hazard[1]>0?bounds.hazard:[0,1],[plot.y+plot.h,plot.y]);
 axis(layout,x,true,{title:doc.unit});axis(layout,y,false,{title:km?t('持续比例 S(t)','Survival S(t)'):t('累积风险 H(t)，非概率','Cumulative hazard H(t), not probability')});
 layout.heading=t(doc.data.length+' 个时长记录 · '+parts.length+' 组',doc.data.length+' duration records · '+parts.length+' groups');
 layout.details=km?'S(t) = ∏(1−d/n) · '+t('+ 右删失','+ right censored'):'H(t) = Σd/n · '+t('同刻删失仍在险','same-time censoring remains at risk');layout.statistics=[];
 parts.forEach((rows,index)=>{
  const colorIdentity=statisticalGroupKey(rows),group=rows[0].group,survival=survivalSteps(rows),hazard=nelson18(rows)[0].points.slice(1),models=survival.map((s,i)=>({...s,hazard:hazard[i].hazard,records:hazard[i].records})),common={identity:populationId('duration-population',rows),colorIdentity,index,transitionIndex:index,group,recordIds:rows.map(recordId)};
  let previous={time:0,survival:1,hazard:0};
  models.forEach((m,i)=>{const point=[x(m.time),y(km?m.survival:m.hazard)],a=[x(previous.time),y(km?previous.survival:previous.hazard)],middle=[point[0],a[1]],id=populationId('duration-time',m.records),baseMark={...common,identity:id,transitionIndex:i,recordIds:m.records.map(recordId)};
   line(layout,baseMark,'duration-horizontal',a,middle,point,{derived:true,opacity:.8,width:1.5});line(layout,baseMark,'duration-vertical',middle,point,point,{derived:true,opacity:.8,width:1.5});
   m.records.forEach(r=>{const p=[x(r.duration),point[1]],mark={identity:recordId(r),colorIdentity,index,transitionIndex:r.row,group,row:r.row},tip=r.label+' · '+group+' · '+String(r.duration)+' '+doc.unit+' · '+r.status+' · n='+m.risk+' · d='+m.ended+' · S='+fmt(m.survival)+' · H='+fmt(m.hazard),opts={opacity:.9,editable:'duration',value:r.duration,tooltip:tip,original:true,status:r.status,survival:m.survival,hazard:m.hazard,atRisk:m.risk,events:m.ended,point:p};if(r.status==='censored')glyph(layout,mark,'sample',plus(...p,w<500?2.6:3.3),p,opts);else dot(layout,mark,'sample',p,w<500?1.8:2.5,opts);});
   previous=m;
  });layout.statistics.push({group,models});
 });
 layout.marks.sort((a,b)=>Number(!a.derived)-Number(!b.derived));layout.scales={x,y};layout.groups=parts.map(r=>r[0].group);layout.groupKeys=parts.map(statisticalGroupKey);return layout;
}
