import {scaleLinear} from 'd3';
import {t10,autocorrelation10,pacf10} from './volume10-data.js';
import {recordId} from './data-identity.js';
import {base,axis,line,dot,key,fmt,pointMix,clamp} from './scientific-geometry.js';
export function layoutSerial(doc,view,w=800,h=440){
 const plot={x:49,y:58,w:w-71,h:h-108},l=base(doc,view,w,h,plot),partial=view==='serial-pacf',estimator=partial?'PACF':'ACF',values=(partial?pacf10:autocorrelation10)(doc.data.map(r=>r.value),doc.maxLag),x=scaleLinear([.5,doc.maxLag+.5],[plot.x,plot.x+plot.w]),y=scaleLinear([-1,1],[plot.y+plot.h,plot.y]),band=1.96/Math.sqrt(doc.data.length),ids=doc.data.map(recordId);
 l.heading=`${estimator} · n=${ids.length}`;l.details=partial?'Yule–Walker / Levinson–Durbin':t10('未调整中心化乘积','Unadjusted centered products');l.scales={x,y};l.coefficients=values;l.referenceBand=band;
 axis(l,y,false);
 for(const v of [-band,band])l.guides.push({x1:plot.x,x2:plot.x+plot.w,y1:y(v),y2:y(v),major:false,reference:true});
 l.labels.push({x:plot.x,y:h-5,text:t10('无量纲 · 白噪声参考 ±1.96/√n','Dimensionless · white-noise reference ±1.96/√n'),fontSize:w<500?8:10});
 for(let lag=1;lag<=doc.maxLag;lag++){
  const p=[x(lag),y(values[lag])],anchor=[x(lag),y(0)],common={identity:key('serial-lag',ids,lag),colorIdentity:'serial',index:lag-1,transitionIndex:0,group:estimator,recordIds:ids,recordLabel:`${estimator} · lag ${lag}`,serialEstimator:estimator,lag},tooltip=`${estimator} · ${t10('滞后','Lag')} ${lag}: ${fmt(values[lag])}\nn=${ids.length} · ${l.details}`;
  line(l,common,'coefficient',anchor,p,anchor,{width:1.7,opacity:.85,value:values[lag],tooltip});
  dot(l,common,'coefficient-tip',p,2.3,{opacity:1,value:values[lag],tooltip});
  for(const m of l.marks.slice(-2))m.entrance=m.points.map(a=>[a[0],y(0)]);
  if(doc.maxLag<=12||lag===1||lag===doc.maxLag||lag%Math.ceil(doc.maxLag/8)===0)l.labels.push({x:x(lag),y:plot.y+plot.h+18,text:String(lag),anchor:'middle',small:true});
 }
 return l;
}
// Enforced for every effect, including interrupted playback. Estimator values
// never interpolate directly into one another. The central pause is at zero.
export function interpolateSerialMark(points,old,next,q){
 if(!old?.serialEstimator||!next?.serialEstimator||old.serialEstimator===next.serialEstimator)return null;
 if(q===0)return points;if(q===1)return next.points;
 if(q<.45)return points.map((p,i)=>pointMix(p,next.entrance[i],clamp(q/.45)));
 return next.points.map((p,i)=>pointMix(next.entrance[i],p,clamp((q-.55)/.45)));
}
