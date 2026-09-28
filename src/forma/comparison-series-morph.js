import {scaleLinear,bisectRight} from 'd3';
import {recordId,populationId} from './data-identity.js';
import {circlePoints,rectPoints} from './morph.js';
import {base,axis,dot,glyph,line,key,fmt,hash,compactNames} from './scientific-geometry.js';
import {measurementDomain} from './axis-policy.js';
import {rootogram17,spreadLevel17,worm17,qqCompare17} from './volume17-data.js';
import {delta12,ecdfDifference12} from './volume12-data.js';
import {comparisonText as t,comparisonBounds,comparisonGroups,comparisonGroupKey} from './comparison-series-rules.js';
const range=(values,zero=false)=>measurementDomain(values,{zero,padding:.09}),order=rows=>[...rows].sort((a,b)=>a.value-b.value||recordId(a).localeCompare(recordId(b)));
const original=(r,groupIndex,colorIdentity)=>({identity:recordId(r),colorIdentity,index:groupIndex,transitionIndex:r.row,group:r.group||r.label,row:r.row});
const summary=(rows,groupIndex,group)=>({identity:populationId('comparison-summary',rows),colorIdentity:comparisonGroupKey(rows),index:groupIndex,transitionIndex:groupIndex,group,recordIds:rows.map(recordId)});
// Multi-axis comparisons keep the main coordinate title beside its own ticks.
function titleAboveRug(layout){const title=layout.labels.find(label=>label.y===layout.h-6&&label.anchor==='end'&&label.fontSize===10);if(title)title.y=layout.plot.y+layout.plot.h+30;}
function decorateGroups(layout,parts){layout.groups=parts.map(rows=>rows[0].group);layout.groupLabels=compactNames(layout.groups,Math.max(2,Math.floor(layout.plot.w/parts.length/8)-2));layout.groupKeys=parts.map(comparisonGroupKey);layout.marks.sort((a,b)=>Number(!a.derived)-Number(!b.derived));return layout;}
export function layoutComparison(doc,view,w=800,h=440,options={}){
 if(doc.family==='comparison-counts')return layoutCounts(doc,view,w,h,options);
 if(doc.family==='comparison-residuals')return layoutResiduals(doc,view,w,h,options);
 if(doc.family==='comparison-spread')return layoutSpread(doc,view,w,h,options);
 return layoutSamples(doc,view,w,h,options);
}
function layoutSamples(doc,view,w,h,{domain}={}){
 const qq=view==='compare-qq',delta=view==='compare-delta',ecdf=view==='compare-ecdf',parts=comparisonGroups(doc),ordered={...doc,data:parts.flat()},bounds=domain||comparisonBounds(doc),rawDomain=range(bounds.value);
 let plot={x:62,y:70,w:w-92,h:h-(delta?187:ecdf?148:136)};
 if(qq){const side=Math.min(plot.w,plot.h);plot={x:(w-side)/2,y:70,w:side,h:side};}
 const layout=base(doc,view,w,h,plot),xd=qq||ecdf?rawDomain:[0,1],yd=qq?rawDomain:delta?range(bounds.delta,true):range(bounds.cdf,true),x=scaleLinear(xd,[plot.x,plot.x+plot.w]),y=scaleLinear(yd,[plot.y+plot.h,plot.y]),rawX=scaleLinear(rawDomain,[plot.x,plot.x+plot.w]);
 const names=parts.map(p=>p[0].group),labelNames=compactNames(names,w<500?8:20),all=summary(doc.data,0,t('两组比较摘要','Two-group comparison summaries')),qmodel=qqCompare17(ordered),dmodel=delta12(ordered.data),cmodel=ecdfDifference12(ordered.data),values=parts.map(rows=>rows.map(r=>r.value).sort((a,b)=>a-b));
 axis(layout,x,true,{title:qq?`${names[0]} / ${doc.unit}`:delta?t('分位概率 p','Quantile probability p'):doc.unit});
 axis(layout,y,false,{title:qq?`${names[1]} / ${doc.unit}`:delta?`${labelNames[1]} − ${labelNames[0]} / ${doc.unit}`:`F_${labelNames[1]} − F_${labelNames[0]}`});
 layout.heading=t('同一批独立原始样本','The same independent original samples');layout.details=qq?`Type 7 · n=${parts[0].length} / ${parts[1].length} · y=x`:delta?t('Type 7 分位差 · 非个体配对变化','Type 7 quantile differences · not individual paired changes'):`D = ${fmt(cmodel.maxDifference)} · `+t('描述性最大概率差','descriptive maximum probability difference');
 if(qq)layout.guides.push({x1:x(xd[0]),y1:y(xd[0]),x2:x(xd[1]),y2:y(xd[1]),major:true,dashed:true});
 const difference=v=>bisectRight(values[1],v)/values[1].length-bisectRight(values[0],v)/values[0].length;
 parts.forEach((rows,index)=>{
  const colorIdentity=comparisonGroupKey(rows),rugY=plot.y+plot.h+(delta?58:26)+index*12;
  rows.forEach(r=>{
   const p=qq?(index===0?[x(r.value),plot.y+plot.h+7]:[plot.x+plot.w+7,y(r.value)]):ecdf?[x(r.value),y(difference(r.value))]:[rawX(r.value),rugY];
   const shape=qq?(index===0?rectPoints(p[0]-.7,p[1]-2,1.4,4):rectPoints(p[0]-2,p[1]-.7,4,1.4)):delta?rectPoints(p[0]-.8,p[1]-3,1.6,6):circlePoints(...p,w<500?1.8:2.3);
   glyph(layout,original(r,index,colorIdentity),'sample',shape,p,{original:true,editable:'value',value:r.value,opacity:.83,point:p,derivedProbability:ecdf?difference(r.value):undefined,tooltip:`${r.label} · ${r.group} · ${String(r.value)} ${doc.unit}`+(ecdf?` · F_B−F_A=${fmt(difference(r.value))}`:'')});
  });
  if(delta)layout.labels.push({x:plot.x-6,y:rugY+3,text:labelNames[index],anchor:'end',fontSize:9});
 });
 if(delta){titleAboveRug(layout);layout.labels.push({x:plot.x,y:plot.y+plot.h+45,text:t('全部原样本 · 独立原值横轴','All observations · separate original-value axis'),fontSize:9});for(const v of rawX.ticks(w<500?3:5))layout.labels.push({x:rawX(v),y:h-22,text:fmt(v),fontSize:9,anchor:'middle'});layout.labels.push({x:plot.x+plot.w,y:h-6,text:doc.unit,anchor:'end',fontSize:10});}
 // Quantile summaries keep their own probability identities across views.
 // The 19 native delta probabilities are the even members of the 39-point QQ grid.
 const qp=qmodel.points.map(p=>({p:p.p,x:qq?x(p.x):delta?x(p.p):rawX((p.x+p.y)/2),y:qq?y(p.y):delta?y(p.y-p.x):plot.y+plot.h+8,a:p.x,b:p.y}));
 qp.forEach((p,i)=>{
  const visible=qq||delta&&(i+1)%2===0,center=[p.x,p.y],m={...all,identity:key(all.identity,'quantile',i+1),transitionIndex:i};
  dot(layout,m,'quantile',center,w<500?2:2.8,{derived:true,opacity:visible?.95:0,probability:p.p,a:p.a,b:p.b,difference:p.b-p.a,tooltip:`p=${fmt(p.p)} · ${names[0]}=${fmt(p.a)} · ${names[1]}=${fmt(p.b)} · Δ=${fmt(p.b-p.a)} ${doc.unit} · `+t('派生分位，非原样本','derived quantiles, not raw samples')});
  const previous=qp[Math.max(0,i-(delta?2:1))],show=i>=(delta?2:1)&&visible;
  line(layout,m,'quantile-link',[previous.x,previous.y],center,center,{derived:true,opacity:show?.62:0,width:1.25});
 });
 const sorted=order(doc.data);let previous=[plot.x,ecdf?y(0):plot.y+plot.h+8];
 sorted.forEach((r,i)=>{
  const current=[ecdf?x(r.value):rawX(r.value),ecdf?y(difference(r.value)):plot.y+plot.h+8],turn=[current[0],previous[1]],m={...all,identity:recordId(r),transitionIndex:i,recordIds:[recordId(r)]};
  line(layout,m,'cdf-horizontal',previous,turn,current,{derived:true,opacity:ecdf?.7:0,width:1.3});line(layout,m,'cdf-vertical',turn,current,current,{derived:true,opacity:ecdf?.7:0,width:1.3});previous=current;
 });
 line(layout,all,'cdf-tail',previous,[plot.x+plot.w,ecdf?y(0):plot.y+plot.h+8],previous,{derived:true,opacity:ecdf?.7:0,width:1.3});
 layout.statistics={quantiles:qmodel,delta:dmodel,cdf:cmodel};layout.scales={x,y,rawX};return decorateGroups(layout,parts);
}
function layoutCounts(doc,view,w,h,{domain}={}){
 const hanging=view==='compare-rootogram',bounds=domain||comparisonBounds(doc),model=rootogram17(doc),plot={x:62,y:70,w:w-88,h:h-128},layout=base(doc,view,w,h,plot),step=plot.w/doc.data.length,x=i=>plot.x+(i+.5)*step,y=scaleLinear(range(hanging?bounds.root:bounds.count,true),[plot.y+plot.h,plot.y]),labels=compactNames(doc.data.map(r=>r.label),w<500?4:9);
 axis(layout,y,false,{title:hanging?t('平方根频数','Square-root counts'):doc.unit});layout.heading=doc.modelName;layout.details=hanging?'√E − √O · '+t('观察柱向下悬挂','observed bars hang downward'):t('实心：观察 O · 空心：外部期望 E','Filled: observed O · hollow: external expected E');
 model.forEach((p,i)=>{
  const r=p.row,cx=x(i),top=y(hanging?p.expectedRoot:r.observed),bottom=y(hanging?p.difference:r.observed),observed=[cx,hanging?(top+bottom)/2:top],expected=[cx,y(hanging?p.expectedRoot:r.expected)],m=original(r,i,recordId(r)),previous=model[Math.max(0,i-1)],barWidth=Math.max(2,Math.min(38,step*.62));
  glyph(layout,m,'observed',hanging?rectPoints(cx-barWidth/2,top,barWidth,Math.max(0,bottom-top)):circlePoints(...observed,w<500?3:4),observed,{original:true,editable:'observed',value:r.observed,zeroObserved:r.observed===0,stroke:hanging&&r.observed===0?1.3:0,opacity:hanging?.55:.95,point:observed,observedRoot:p.observedRoot,difference:p.difference,tooltip:`${r.label} · O=${String(r.observed)} ${doc.unit} · √O=${fmt(p.observedRoot)} · √E−√O=${fmt(p.difference)}`});
  dot(layout,m,'expected',expected,w<500?3:4,{original:true,editable:'expected',value:r.expected,paper:true,stroke:1.5,opacity:1,expectedRoot:p.expectedRoot,tooltip:`${r.label} · E=${String(r.expected)} ${doc.unit} · ${doc.modelName}`});
  const common={...m,recordIds:[recordId(r)]};line(layout,common,'count-pair',observed,expected,observed,{derived:true,opacity:hanging?0:.42,width:1.15});
  line(layout,common,'expected-curve',[x(Math.max(0,i-1)),y(hanging?previous.expectedRoot:previous.row.expected)],expected,expected,{derived:true,opacity:hanging&&i?.55:0,width:1.2});
  if(doc.data.length<=12||i%Math.ceil(doc.data.length/10)===0)layout.labels.push({x:cx,y:plot.y+plot.h+19,text:labels[i],fullText:r.label,anchor:'middle',fontSize:9});
 });
 layout.statistics=model;layout.scales={x,y};layout.groups=[];layout.groupKeys=[];layout.marks.sort((a,b)=>Number(!a.derived)-Number(!b.derived));return layout;
}
function layoutResiduals(doc,view,w,h,{domain}={}){
 const worm=view==='compare-worm',parts=comparisonGroups(doc),stable={...doc,data:parts.flatMap(rows=>[...rows].sort((a,b)=>a.stdResidual-b.stdResidual||recordId(a).localeCompare(recordId(b))))},models=worm17(stable),bounds=domain||comparisonBounds(doc),layout=base(doc,view,w,h,{x:60,y:66,w:w-85,h:h-109}),columns=parts.length>1?2:1,rows=Math.ceil(parts.length/columns),gap=30,cellWidth=(w-32-(columns-1)*gap)/columns,cellHeight=(h-99-(rows-1)*31)/rows,xd=range(bounds.normal),yd=range(worm?bounds.deviation:[...bounds.residual,...bounds.normal],worm);
 layout.heading=doc.modelName;layout.details=worm?t('X：固定标准正态分位 · Y：标准残差 − 理论分位','X: fixed standard-normal quantile · Y: residual minus theoretical quantile'):t('X：固定标准正态分位 · Y：原标准残差','X: fixed standard-normal quantile · Y: supplied standardized residual');layout.scales={groups:[]};
 models.forEach((g,index)=>{
  const left=18+(index%columns)*(cellWidth+gap)+42,top=68+Math.floor(index/columns)*(cellHeight+31),plot={x:left,y:top,w:cellWidth-46,h:cellHeight-24},x=scaleLinear(xd,[plot.x,plot.x+plot.w]),y=scaleLinear(yd,[plot.y+plot.h,plot.y]),sub=base(doc,view,w,h,plot),common=summary(parts[index],index,g.group),names=compactNames(parts.map(p=>p[0].group),w<500?10:24);
  axis(sub,x,true);axis(sub,y,false);layout.guides.push(...sub.guides);layout.labels.push(...sub.labels.map(l=>({...l,fontSize:w<500?8:9})),{x:left,y:top-10,text:`${names[index]} · n=${g.points.length}`,fontSize:10});
  if(worm)layout.guides.push({x1:x(xd[0]),y1:y(0),x2:x(xd[1]),y2:y(0),major:true});else{const lo=Math.max(xd[0],yd[0]),hi=Math.min(xd[1],yd[1]);layout.guides.push({x1:x(lo),y1:y(lo),x2:x(hi),y2:y(hi),major:true,dashed:true});}
  g.points.forEach((p,i)=>{
   const center=[x(p.theoretical),y(worm?p.deviation:p.row.stdResidual)],m=original(p.row,index,common.colorIdentity),previous=g.points[Math.max(0,i-1)];
   dot(layout,m,'sample',center,w<500?1.8:2.5,{original:true,editable:'stdResidual',value:p.row.stdResidual,opacity:.88,theoretical:p.theoretical,deviation:p.deviation,probability:p.p,tooltip:`${p.row.label} · ${g.group} · r=${String(p.row.stdResidual)} · Φ⁻¹(p)=${fmt(p.theoretical)} · Δ=${fmt(p.deviation)}`});
   line(layout,{...common,identity:recordId(p.row),transitionIndex:i,recordIds:[recordId(previous.row),recordId(p.row)]},'residual-link',[x(previous.theoretical),y(worm?previous.deviation:previous.row.stdResidual)],center,center,{derived:true,opacity:i?.48:0,width:1.2});
  });layout.scales.groups.push({group:g.group,x,y});
 });layout.statistics=models;return decorateGroups(layout,parts);
}
function layoutSpread(doc,view,w,h,{domain}={}){
 const spread=view==='compare-spreadlevel',parts=comparisonGroups(doc),ordered={...doc,data:parts.flat()},model=spreadLevel17(ordered),bounds=domain||comparisonBounds(doc),rugStep=Math.min(8,Math.max(3,(h-100)*.25/parts.length)),rugHeight=parts.length*rugStep,top=h<280?64:70,plot={x:62,y:top,w:w-91,h:Math.max(42,h-top-(spread?93+rugHeight:62))},layout=base(doc,view,w,h,plot),x=scaleLinear(range(spread?bounds.level:bounds.value),[plot.x,plot.x+plot.w]),y=scaleLinear(range(bounds.spread),[plot.y+plot.h,plot.y]),rawX=scaleLinear(range(bounds.value),[plot.x,plot.x+plot.w]),names=compactNames(parts.map(r=>r[0].group),w<500?7:18),groupY=i=>plot.y+(i+.5)*plot.h/parts.length;
 axis(layout,x,true,{title:spread?t('log₁₀ 中位数','log10 median'):doc.unit});if(spread)axis(layout,y,false,{title:t('log₁₀ IQR','log10 IQR')});layout.heading=t('组分布与水平依赖的离散度','Grouped distributions and level-dependent spread');layout.details=spread?t('描述性 OLS 斜率','Descriptive OLS slope')+' = '+fmt(model.fit.slope):t('点：原样本 · 圆：中位数 · 线：Q25–Q75','Dots: observations · circle: median · interval: Q25–Q75');
 model.points.forEach((g,index)=>{
  const common=summary(g.rows,index,g.group),center=spread?[x(g.x),y(g.y)]:[x(g.median),groupY(index)],rugSpacing=Math.min(rugStep,Math.max(0,(h-33-(plot.y+plot.h+58))/Math.max(1,parts.length-1))),rugY=plot.y+plot.h+58+index*rugSpacing;
  g.rows.forEach(r=>{const p=[rawX(r.value),spread?rugY:groupY(index)+8+(hash(recordId(r))%5-2)*1.4];dot(layout,original(r,index,common.colorIdentity),'sample',p,w<500?1.1:1.6,{original:true,editable:'value',value:r.value,opacity:.72,tooltip:`${r.label} · ${g.group} · ${String(r.value)} ${doc.unit}`});});
  dot(layout,common,'group-summary',center,w<500?3.7:5,{derived:true,opacity:.98,median:g.median,iqr:g.iqr,low:g.low,high:g.high,tooltip:`${g.group} · median=${fmt(g.median)} ${doc.unit} · IQR=${fmt(g.iqr)} ${doc.unit} · n=${g.rows.length}`});
  line(layout,common,'iqr',spread?center:[x(g.low),groupY(index)],spread?center:[x(g.high),groupY(index)],center,{derived:true,opacity:spread?0:.62,width:4,low:g.low,high:g.high});
  for(const [role,value]of [['low',g.low],['high',g.high]])line(layout,common,'iqr-'+role,spread?center:[x(value),groupY(index)-4],spread?center:[x(value),groupY(index)+4],center,{derived:true,opacity:spread?0:.8,width:1.2});
  if(spread)layout.labels.push({x:center[0]+6,y:center[1]-7,text:names[index],fullText:g.group,fontSize:9,dataLabel:true,halo:true});else layout.labels.push({x:plot.x-8,y:center[1]+4,text:names[index],fullText:g.group,anchor:'end',fontSize:9});
 });
 // Fit endpoints are clipped in data space; summaries remain inside finite SVG bounds.
 let [lo,hi]=x.domain();if(spread&&model.fit.slope!==0){const yy=y.domain(),ends=yy.map(v=>(v-model.fit.my)/model.fit.slope+model.fit.mx).sort((a,b)=>a-b);lo=Math.max(lo,ends[0]);hi=Math.min(hi,ends[1]);}
 const fitVisible=spread&&hi>=lo,anchor=[plot.x+plot.w/2,plot.y+plot.h/2],all=summary(doc.data,0,t('组摘要拟合','Fit of group summaries'));
 line(layout,all,'spread-fit',fitVisible?[x(lo),y(model.fit.predict(lo))]:anchor,fitVisible?[x(hi),y(model.fit.predict(hi))]:anchor,anchor,{derived:true,opacity:fitVisible?.38:0,width:1.3,slope:model.fit.slope,neutral:true,tooltip:t('组摘要的描述性 OLS 拟合，非检验','Descriptive OLS fit of group summaries, not a test')});
 if(spread){titleAboveRug(layout);layout.labels.push({x:plot.x,y:plot.y+plot.h+45,text:t('全部原样本 · 独立原值横轴','All observations · separate original-value axis'),fontSize:9});for(const v of rawX.ticks(w<500?3:5))layout.labels.push({x:rawX(v),y:h-23,text:fmt(v),anchor:'middle',fontSize:9});layout.labels.push({x:plot.x+plot.w,y:h-6,text:doc.unit,anchor:'end',fontSize:10});}
 layout.scales={x,y,rawX};layout.statistics=model;return decorateGroups(layout,parts);
}
