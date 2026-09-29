import {scaleLinear} from 'd3';
import {recordId,populationId} from './data-identity.js';
import {base,axis,dot,line,key,fmt} from './scientific-geometry.js';
import {measurementDomain} from './axis-policy.js';
import {cook17,addedVariable17,componentResidual17} from './volume17-data.js';
import {regressionDiagnosticText as t,regressionDiagnosticBounds} from './regression-diagnostic-rules.js';
const range=(values,zero=false)=>measurementDomain(values,{zero,padding:.09});
function clippedFit(fit,xd,yd){
 let [lo,hi]=xd;if(fit.slope!==0){const ends=yd.map(v=>fit.mx+(v-fit.my)/fit.slope).sort((a,b)=>a-b);lo=Math.max(lo,ends[0]);hi=Math.min(hi,ends[1]);}
 return hi>=lo&&[fit.predict(lo),fit.predict(hi)].every(Number.isFinite)?[[lo,fit.predict(lo)],[hi,fit.predict(hi)]]:null;
}
export function layoutRegressionDiagnostic(doc,view,w=800,h=440,{domain}={}){
 const bounds=domain||regressionDiagnosticBounds(doc),plot={x:w<500?54:66,y:58,w:w-(w<500?78:92),h:Math.max(50,h-116)},layout=base(doc,view,w,h,plot),family=doc.family,rows=doc.data,colorIdentity=populationId('sample-group',rows),group=family==='regression-study'?t('全部研究','All studies'):t('拟合观测','Fitted observations'),common={identity:populationId('regression-reference',rows),colorIdentity,index:0,transitionIndex:0,group,recordIds:rows.map(recordId)};
 const cook=view==='regression-cook',root=view==='regression-scale-location',adjusted=view==='regression-adjusted-deviation',ordinary=view==='regression-ordinary',standardized=view==='regression-study-standardized';
 let xd,yd,xTitle,yTitle,model,project,field;
 if(family==='regression-scale'){
  xd=range(bounds.fitted);yd=root?range(bounds.rootAbsolute,true):range(bounds.standardized,true);xTitle=doc.axes?.x||t('外部模型拟合值','External fitted value');yTitle=root?'√|r|':t('内部标准残差 r','Internal standardized residual r');field='stdResidual';project=r=>({x:r.fitted,y:root?Math.sqrt(Math.abs(r.stdResidual)):r.stdResidual});
 }else if(family==='regression-influence'){
  const maxResidual=Math.max(2.5,...bounds.standardized.map(Math.abs))*1.08;
  xd=cook?[.4,bounds.inputOrder[1]+.6]:[0,Math.min(1-Number.EPSILON/2,bounds.leverage[1]*1.12)];yd=cook?[0,bounds.cook[1]*1.12]:[-maxResidual,maxResidual];xTitle=cook?t('输入观测序号','Input observation index'):t('杠杆 h','Leverage h');yTitle=cook?'Cook D':t('内部标准残差 r','Internal standardized residual r');field='stdResidual';project=(r,i)=>({x:cook?i+1:r.leverage,y:cook?cook17(r,doc.parameterCount):r.stdResidual,D:cook17(r,doc.parameterCount)});
 }else if(family==='regression-adjusted'){
  model=addedVariable17(doc);xd=range(bounds.xResidual);yd=range(adjusted?bounds.adjustedDeviation:bounds.yResidual,adjusted);xTitle=doc.axes.x;yTitle=adjusted?t('偏离（Y残差单位）','Deviation (Y-residual units)'):doc.axes.y;field='yResidual';project=r=>({x:r.xResidual,y:adjusted?r.yResidual-model.fit.predict(r.xResidual):r.yResidual,prediction:model.fit.predict(r.xResidual)});
 }else if(family==='regression-component'){
  model=componentResidual17(doc);xd=range(bounds.predictor);yd=range(ordinary?bounds.ordinary:bounds.partial,ordinary);xTitle=doc.axes.x;yTitle=ordinary?t('普通残差','Ordinary residual')+' / '+doc.unit:doc.axes.y;field='residual';project=r=>({x:r.x,y:ordinary?r.residual:r.residual+doc.coefficient*r.x,component:doc.coefficient*r.x});
 }else{
  xd=standardized?range(bounds.precision,true):range(bounds.effect);yd=standardized?range(bounds.studyDeviation,true):bounds.se;xTitle=standardized?'1/SE · 1/('+doc.unit+')':t('效应','Effect')+' / '+doc.unit;yTitle=standardized?'(effect − referenceEffect) / SE':'SE / '+doc.unit+ ' · '+t('向上更精确','more precise upwards');field='effect';project=r=>({x:standardized?1/r.se:r.effect,y:standardized?(r.effect-doc.referenceEffect)/r.se:r.se,precision:Number.isFinite(1/r.se)?1/r.se:null,standardized:Number.isFinite((r.effect-doc.referenceEffect)/r.se)?(r.effect-doc.referenceEffect)/r.se:null});
 }
 const x=scaleLinear(xd,[plot.x,plot.x+plot.w]),y=scaleLinear(yd,family==='regression-study'&&!standardized?[plot.y,plot.y+plot.h]:[plot.y+plot.h,plot.y]),at=p=>[x(p.x),y(p.y)],center=[plot.x+plot.w/2,plot.y+plot.h/2];
 axis(layout,x,true,{title:xTitle});axis(layout,y,false,{title:yTitle});layout.heading=doc.modelName||t('参考效应','Reference effect')+' = '+fmt(doc.referenceEffect);layout.details=family==='regression-study'?t('参考带，不是研究置信区间','Reference bands, not study intervals'):t('外部原值不变 · 仅切换诊断坐标','External originals unchanged · diagnostic coordinates only');
 rows.forEach((r,i)=>{
  const p=project(r,i),point=at(p),m={identity:recordId(r),colorIdentity,index:0,transitionIndex:i,row:r.row,group};
  let tooltip=r.label+' · '+field+'='+String(r[field]);
  if(family==='regression-scale')tooltip+=` · fitted=${String(r.fitted)} · √|r|=${fmt(Math.sqrt(Math.abs(r.stdResidual)))}`;
  else if(family==='regression-influence')tooltip+=` · h=${String(r.leverage)} · Cook D=${fmt(p.D)} · p=${doc.parameterCount} · `+t('D为派生坐标，编辑原r','D is derived; edit original r');
  else if(family==='regression-adjusted')tooltip+=` · xResidual=${String(r.xResidual)} · fitted=${fmt(p.prediction)} · deviation=${fmt(r.yResidual-p.prediction)}`;
  else if(family==='regression-component')tooltip+=` · x=${String(r.x)} · β=${String(doc.coefficient)} · βx=${fmt(p.component)} · e+βx=${fmt(r.residual+p.component)}`;
  else tooltip+=` ${doc.unit} · SE=${String(r.se)} · reference=${String(doc.referenceEffect)}`+(standardized?` · 1/SE=${fmt(p.precision)} · Δ/SE=${fmt(p.standardized)}`:'');
  dot(layout,m,'sample',point,w<500?2.1:3,{original:true,editable:field,value:r[field],opacity:.88,projection:p,tooltip});
  // Stems carry their own derived role; they never impersonate observations.
  const stemBase=cook?[point[0],y(0)]:family==='regression-adjusted'?[point[0],y(adjusted?0:p.prediction)]:family==='regression-component'?[point[0],y(ordinary?0:p.component)]:point;
  line(layout,{...m,recordIds:[recordId(r)]},'diagnostic-stem',stemBase,point,point,{derived:true,opacity:cook?.45:['regression-adjusted','regression-component'].includes(family)?.2:0,width:1,tooltip});
 });
 if(family==='regression-influence'){
  // All four equal-distance contours have fixed role keys in both views.
  // Invisible counterparts collapse inside the plot instead of flying from
  // off-scale coordinates when the user interrupts or reverses the morph.
  for(const D of[.5,1])for(const sign of[-1,1]){
   const high=xd[1],rmax=Math.max(Math.abs(yd[0]),Math.abs(yd[1])),low=D*doc.parameterCount/(rmax*rmax+D*doc.parameterCount),visible=!cook&&low<high;
   const points=Array.from({length:41},(_,i)=>{if(!visible)return center;const leverage=low+(high-low)*i/40,residual=sign*Math.sqrt(D*doc.parameterCount*(1-leverage)/leverage);return[x(leverage),y(residual)];});
   for(let i=1;i<points.length;i++)line(layout,{...common,identity:key(common.identity,'cook-contour',D,sign,i),transitionIndex:i},'cook-contour',points[i-1],points[i],center,{derived:true,opacity:visible?.3:0,width:.9,D,tooltip:`Cook D=${D} · `+t('仅探索参考','exploratory reference only')});
  }
  line(layout,{...common,identity:key(common.identity,'cook-four-over-n')},'cook-reference',cook?[plot.x,y(4/rows.length)]:center,cook?[plot.x+plot.w,y(4/rows.length)]:center,center,{derived:true,opacity:cook?.6:0,width:1.2,reference:4/rows.length,tooltip:'4/n = '+fmt(4/rows.length)+' · '+t('不是删除规则','not a deletion rule')});
  if(cook)layout.labels.push({x:plot.x+plot.w,y:y(4/rows.length)-5,text:'4/n',anchor:'end',fontSize:9,halo:true,dataLabel:true});
 }else if(family==='regression-adjusted'||family==='regression-component'){
  const fit=family==='regression-adjusted'?model.fit:{slope:doc.coefficient,mx:0,my:0,predict:v=>doc.coefficient*v},flat=adjusted||ordinary,clipped=flat?[[xd[0],0],[xd[1],0]]:clippedFit(fit,xd,yd),ends=clipped?.map(([xx,yy])=>[x(xx),y(yy)]);
  line(layout,common,'model-reference',ends?.[0]||center,ends?.[1]||center,center,{derived:true,opacity:ends?.length?.65:0,width:1.4,neutral:true,slope:fit.slope,tooltip:family==='regression-adjusted'?t('残差平面描述性 OLS','Descriptive residual-plane OLS'):t('外部线性成分 βx','External linear component βx')});layout.statistics=model;
 }else if(family==='regression-study'){
  for(const sign of[-1,1]){const a=standardized?[plot.x,y(sign*1.96)]:[x(doc.referenceEffect),y(0)],b=standardized?[plot.x+plot.w,y(sign*1.96)]:[x(doc.referenceEffect+sign*1.96*bounds.se[1]),y(bounds.se[1])];line(layout,{...common,identity:key(common.identity,'study-reference',sign)},'study-limit',a,b,center,{derived:true,opacity:.58,width:1.15,reference:sign*1.96,neutral:true,tooltip:t('给定效应的参考边界，非单研究置信区间','Reference boundary around the supplied effect, not a study confidence interval')});}
  line(layout,common,'study-center',standardized?[plot.x,y(0)]:[x(doc.referenceEffect),plot.y],standardized?[plot.x+plot.w,y(0)]:[x(doc.referenceEffect),plot.y+plot.h],center,{derived:true,opacity:.4,width:1.1,neutral:true,tooltip:'referenceEffect = '+String(doc.referenceEffect)});
 }
 layout.marks.sort((a,b)=>Number(!a.derived)-Number(!b.derived));layout.scales={x,y};layout.groups=[group];layout.groupKeys=[colorIdentity];return layout;
}
