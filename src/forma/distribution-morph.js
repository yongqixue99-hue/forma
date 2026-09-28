import {scaleLinear} from 'd3';
import {recordId,populationId} from './data-identity.js';
import {circlePoints,rectPoints} from './morph.js';
import {base,axis,dot,glyph,segment,key,fmt,hash,compactNames} from './scientific-geometry.js';
import {boxen17} from './volume17-data.js';
import {halfeye12,quantileDots12,gaussianDensity12} from './volume12-data.js';
import {distributionText as t,distributionBounds} from './distribution-rules.js';

// Equal-probability summaries preserve exact quantile coordinates. Vertical
// levels only pack dots; no horizontal snapping or histogram bins are used.
export function packDistributionQuantiles(points,scale,width,height){
 let radius=Math.min(7,width/36),placed=[];
 const pack=r=>{const result=[];for(const p of points){const x=scale(p.value);let level=0;while(result.some(q=>Math.abs(q.x-x)<r*2.15&&q.level===level))level++;result.push({...p,x,level});}return result;};
 for(let attempt=0;attempt<40;attempt++){placed=pack(radius);if((Math.max(...placed.map(p=>p.level))+1)*radius*2.2<=height)break;radius*=.85;}
 return {points:placed,radius};
}

export function layoutDistribution(doc,view,w=800,h=440,{domain}={}){
 const horizontal=['distribution-halfeye','distribution-quantiledot'].includes(view),sina=view==='distribution-sina',box=view==='distribution-boxen',half=view==='distribution-halfeye',quantiles=view==='distribution-quantiledot';
 const plot={x:horizontal?(w>=600?100:65):52,y:51,w:w-(horizontal?(w>=600?130:86):78),h:h-106},layout=base(doc,view,w,h,plot),bounds=domain?.value||distributionBounds(doc).value;
 const value=scaleLinear(bounds,horizontal?[plot.x,plot.x+plot.w]:[plot.y+plot.h,plot.y]);
 const density=halfeye12(doc.data,doc.bandwidth),boxes=boxen17(doc.data),groups=density.curves,slot=(horizontal?plot.h:plot.w)/groups.length;
 const pointDensities=new Map(doc.data.map(r=>[recordId(r),gaussianDensity12(doc.data.filter(p=>p.group===r.group).map(p=>p.value),r.value,doc.bandwidth)])),samplePeak=Math.max(...pointDensities.values());
 const names=compactNames(groups.map(g=>g.group),horizontal?(w>=600?9:4):Math.max(3,Math.floor(slot/12)));
 axis(layout,value,horizontal,{title:doc.unit});layout.heading=t(`${groups.length} 组 · ${doc.data.length} 个原始样本`,`${groups.length} groups · ${doc.data.length} raw observations`);
 layout.details=box?t('尾部分位区间 · 原值始终保留','Tail quantiles · all observations retained'):quantiles?t(`每摘要点 ${fmt(100/doc.dotCount)}% · 下方为原样本`,`Each summary dot ${fmt(100/doc.dotCount)}% · raw observations below`):t(`共用高斯带宽 ${fmt(doc.bandwidth)} · 数值轴不抖动`,`Shared Gaussian bandwidth ${fmt(doc.bandwidth)} · exact value coordinates`);
 layout.statistics=boxes;layout.density=density;
 groups.forEach((g,index)=>{
  const center=(horizontal?plot.y:plot.x)+(index+.5)*slot,baseline=half?center+slot*.2:quantiles?plot.y+plot.h-24:center,at=v=>horizontal?[value(v),baseline]:[center,value(v)],anchor=at(g.median),rows=g.samples;
  const colorIdentity=populationId('sample-group',rows),common={identity:populationId('distribution-summary',rows),colorIdentity,index,transitionIndex:index,group:g.group,recordIds:rows.map(recordId)};
  const amplitude=Math.min(slot*(half?.52:.33),horizontal?130:90),peak=half?density.max:samplePeak;
  const flank=g.points.map(p=>horizontal?[value(p.value),baseline-p.density/peak*amplitude]:[center-p.density/peak*amplitude,value(p.value)]);
  const reverse=g.points.toReversed().map(p=>horizontal?[value(p.value),baseline]:[center+p.density/peak*amplitude,value(p.value)]);
  const contour=[...flank,...reverse],entrance=contour.map(p=>horizontal?[p[0],baseline]:[center,p[1]]);
  glyph(layout,common,'density',contour,anchor,{opacity:half?.2:sina?.06:0,stroke:half?.9:sina?.25:0,entrance,derived:true,tooltip:`${g.group} · ${t('高斯核密度，共用带宽','Gaussian KDE, shared bandwidth')} ${fmt(doc.bandwidth)} ${doc.unit} · n=${rows.length}`});
  const summaryAt=v=>horizontal?[value(v),baseline+(half?9:0)]:[center,value(v)],summaryAnchor=summaryAt(g.median),boxWidth=Math.min(slot*.48,w>=600?62:40);
  const interval=(role,low,high,shown,width,boxShape=false,extra={})=>{
   const a=summaryAt(low),b=summaryAt(high),points=shown?(boxShape?rectPoints(center-width/2,Math.min(a[1],b[1]),width,Math.abs(a[1]-b[1])):segment(a,b,width)):circlePoints(...summaryAnchor,0);
   glyph(layout,common,role,points,summaryAnchor,{opacity:shown?(boxShape?.23:.95):0,stroke:shown&&boxShape?.9:0,derived:true,tooltip:`${g.group} · ${t('样本分位区间（非置信区间）','Sample quantile interval (not a confidence interval)')} · [${fmt(low)}, ${fmt(high)}] ${doc.unit} · n=${rows.length}`,low,high,...extra});
  };
  interval('central-50',g.inner[0],g.inner[1],box||half,box?boxWidth:4,box,{coverage:.5});
  interval('central-90',g.outer[0],g.outer[1],half,1.4,false,{coverage:.9});
  boxes[index].intervals.slice(1).forEach(level=>interval(`tail-${level.level}`,level.low,level.high,box,boxWidth*level.width,true,{tailProbability:level.p}));
  const medianPoints=half?circlePoints(...summaryAnchor,3.5):box?segment([center-boxWidth/2,value(g.median)],[center+boxWidth/2,value(g.median)],1.7):circlePoints(...summaryAnchor,0);
  glyph(layout,common,'median',medianPoints,summaryAnchor,{opacity:half||box?1:0,stroke:half?1.5:0,paper:half,derived:true,value:g.median,tooltip:`${g.group} · ${t('中位数','Median')}: ${fmt(g.median)} ${doc.unit}`});
  // The quantile-dot view is single-population only. Multi-group layouts do
  // not allocate hundreds of invisible summary nodes that cannot be selected.
  const summaries=groups.length===1?quantileDots12(rows,doc.dotCount):[],packed=quantiles?packDistributionQuantiles(summaries,value,plot.w,plot.h-38):null;
  summaries.forEach((q,i)=>{
   const p=quantiles?[packed.points[i].x,baseline-packed.radius-packed.points[i].level*packed.radius*2.2]:at(q.value),pointCommon={...common,identity:key(common.identity,'quantile',q.p),transitionIndex:i};
   dot(layout,pointCommon,'quantile-summary',p,quantiles?packed.radius:0,{opacity:quantiles?.84:0,derived:true,value:q.value,quantile:q.p,mass:q.mass,entrance:circlePoints(value(q.value),baseline,0),tooltip:`${t('派生分位点，非原始观测','Derived quantile, not an observation')} · p=${fmt(q.p)} · ${fmt(q.value)} ${doc.unit} · ${t('概率质量','Probability mass')} ${fmt(q.mass*100)}%`});
  });
  rows.forEach(r=>{
   const jitter=(hash(recordId(r))%10007)/10006*2-1;
   const p=sina?[center+jitter*pointDensities.get(recordId(r))/samplePeak*amplitude,value(r.value)]:box?[center+slot*.34+jitter*Math.min(slot*.035,4),value(r.value)]:half?[value(r.value),baseline+slot*.2+jitter*Math.min(slot*.035,3)]:[value(r.value),baseline+12+jitter*2];
   dot(layout,{identity:recordId(r),colorIdentity,index:r.row,transitionIndex:r.row,group:g.group,row:r.row},'sample',p,w<500?1.65:2.15,{opacity:.76,editable:'value',value:r.value,tooltip:`${r.label} · ${r.group} · ${String(r.value)} ${doc.unit} · ${t('原始观测','Raw observation')}`});
  });
  layout.labels.push(horizontal?{x:plot.x-10,y:baseline+3,text:names[index],fullText:g.group,anchor:'end',fontSize:11}:{x:center,y:plot.y+plot.h+18,text:names[index],fullText:g.group,anchor:'middle',fontSize:11});
  layout.labels.push(horizontal?{x:plot.x-10,y:baseline+17,text:`n=${rows.length}`,anchor:'end',fontSize:9}:{x:center,y:plot.y+plot.h+32,text:`n=${rows.length}`,anchor:'middle',fontSize:9});
 });
 // Derived marks are behind the original observations, also during interruptions.
 layout.marks.sort((a,b)=>Number(!a.derived)-Number(!b.derived));layout.scales={value};
 layout.groups=groups.map(g=>g.group);layout.groupKeys=groups.map(g=>populationId('sample-group',g.samples));return layout;
}
