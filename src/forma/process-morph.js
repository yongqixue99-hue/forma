import {scaleLinear} from 'd3';
import {recordId} from './data-identity.js';
import {imr10} from './volume10-data.js';
import {processBounds,processEligibility,processText as t} from './process-rules.js';
import {base,axis,dot,line,key,fmt,short,padded,pointMix,clamp,mix} from './scientific-geometry.js';

export function layoutProcess(doc,view,w=800,h=440,{domain}={}){
 const eligible=processEligibility(doc,view);if(!eligible.valid)throw new Error(eligible.reason);
 const expanded=view==='process-imr',compact=w<500,top=43,bottom=h-43,space=bottom-top,gap=h<280?30:43;
 const plot={x:compact?47:61,y:top,w:w-(compact?66:100),h:expanded?(space-gap)*.57:space};
 const moving={x:plot.x,y:expanded?plot.y+plot.h+gap:bottom,w:plot.w,h:expanded?(space-gap)*.43:0};
 const l=base(doc,view,w,h,plot),s=imr10(doc.data),bounds=domain||processBounds(doc);
 const x=scaleLinear([0,doc.data.length-1],[plot.x,plot.x+plot.w]);
 // Observations and ALL control limits share the I domain. Its origin need
 // not be zero; the explicitly nonnegative MR scale always starts at zero.
 const y=scaleLinear(padded(bounds.individual),[plot.y+plot.h,plot.y]);
 const mr=scaleLinear([0,bounds.moving[1]*1.08||1],[moving.y+moving.h,moving.y]);
 l.heading=compact?`${t('单值 I')} · n=${doc.data.length}`:`${t('过程单值图')} · n=${doc.data.length}`;l.details=t('全部输入估计基线 · 仅检查越限');
 l.statistics=s;l.scales={x,individual:y,moving:mr};l.processExpanded=expanded;l.movingPlot=moving;
 axis(l,y,false,{title:`I / ${doc.unit}`});
 if(expanded)axis({...l,plot:moving},mr,false,{title:`MR / ${doc.unit}`});
 const orderTicks=new Set([0,...Array.from({length:compact?3:5},(_,i)=>Math.round((doc.data.length-1)*i/(compact?2:4))),doc.data.length-1]);
 for(const i of orderTicks){l.labels.push({x:x(i),y:bottom+17,text:short(doc.data[i].period,compact?6:10),fullText:doc.data[i].period,anchor:'middle',small:true});}
 l.labels.push({x:plot.x,y:h-3,text:t('控制限不是规格限'),fontSize:compact?8:9});
 l.labels.push({x:plot.x+plot.w,y:h-3,text:t('采集顺序'),anchor:'end',fontSize:compact?8:9});
 if(expanded&&!compact)l.labels.push({x:plot.x+3,y:moving.y+moving.h-7,text:t('首项 MR 未定义'),fontSize:8});
 const allIds=doc.data.map(recordId),population=key('process-baseline',allIds),fullBottom=bottom;
 const control=(kind,role,value,scale,visible)=>{
  const yy=visible?scale(value):fullBottom,anchor=[plot.x,yy],common={identity:key(population,kind),colorIdentity:'process:measurement',index:0,transitionIndex:0,group:kind==='i'?t('单值 I'):t('移动极差 MR'),recordIds:allIds};
  const center=role==='mean',mark=line(l,common,`${kind}-${role}`,anchor,[plot.x+plot.w,yy],anchor,{opacity:visible?(center?.52:.32):0,width:center?1.1:.75,neutral:true,processPanel:kind,processExpanded:expanded,derived:true,value,tooltip:`${kind==='i'?'I':'MR'} ${center?'CL':role==='low'?'LCL':'UCL'} ${fmt(value)} ${doc.unit}`,entrance:[[plot.x,yy],[plot.x,yy]]});
  // line() creates a sampled contour; use its own full-length flat baseline
  // for unfolding instead of the two-point centerline passed above.
  mark.entrance=mark.points.map(p=>[p[0],kind==='mr'?fullBottom:p[1]]);
  if(visible&&!compact)l.labels.push({x:plot.x+plot.w+5,y:yy+3,text:center?'CL':role==='low'?'LCL':'UCL',fontSize:8});
 };
 control('i','mean',s.mean,y,true);control('i','low',s.low,y,true);control('i','high',s.high,y,true);
 control('mr','mean',s.mrMean,mr,expanded);control('mr','low',0,mr,expanded);control('mr','high',s.mrHigh,mr,expanded);
 const radius=Math.max(1.25,Math.min(compact?2.5:3.1,plot.w/(doc.data.length*2.8)));
 doc.data.forEach((r,i)=>{
  const p=[x(i),y(r.value)],outside=r.value<s.low||r.value>s.high,common={identity:key('process-i',recordId(r)),colorIdentity:'process:measurement',index:i,transitionIndex:i,row:r.row??i,group:t('单值 I'),processPanel:'i',processExpanded:expanded};
  if(i){const prev=doc.data[i-1],a=[x(i-1),y(prev.value)];line(l,{...common,identity:key('process-i-link',recordId(prev),recordId(r))},'individual-link',a,p,a,{opacity:.62,width:compact?.9:1.15,value:r.value,tooltip:`${prev.period} → ${r.period}`});}
  // A user can bind the normal series to the accent color (or use one color
  // for every category). Outside-limit flags therefore also have an outer
  // ring with a paper gap; color alone must never carry their meaning.
  if(outside)dot(l,common,'individual-limit-ring',p,radius+2.4,{opacity:1,stroke:1.1,paper:true,accent:true,limitFlag:true,value:r.value,tooltip:`${r.period} · I ${fmt(r.value)} ${doc.unit} · ${t('超出控制限')}`});
  dot(l,common,'individual',p,radius,{opacity:.95,stroke:outside?1.1:.5,accent:outside,value:r.value,editable:'value',entrance:undefined,tooltip:`${r.period} · I ${fmt(r.value)} ${doc.unit}${outside?` · ${t('超出控制限')}`:''}`});
  if(!i)return; // MR[0] is undefined: never manufacture a zero observation.
  const prev=doc.data[i-1],value=s.moving[i],a=[x(i),fullBottom],p2=expanded?[x(i),mr(value)]:a,pair=[recordId(prev),recordId(r)],mc={identity:key('process-mr',...pair),colorIdentity:'process:measurement',index:i,transitionIndex:i,row:r.row??i,group:t('移动极差 MR'),recordIds:pair,recordLabel:`${prev.period} → ${r.period} · MR`,processPanel:'mr',processExpanded:expanded};
  if(i>1){const pp=expanded?[x(i-1),mr(s.moving[i-1])]:[x(i-1),fullBottom],lm=line(l,{...mc,identity:key('process-mr-link',recordId(doc.data[i-2]),...pair),recordIds:[recordId(doc.data[i-2]),...pair]},'moving-link',pp,p2,a,{opacity:expanded?.52:0,width:compact?.9:1.05,derived:true,value,tooltip:`${doc.data[i-2].period} → ${prev.period} → ${r.period}`});lm.entrance=lm.points.map(p=>[p[0],fullBottom]);}
  const outsideMR=value>s.mrHigh;
  if(outsideMR){const ring=dot(l,mc,'moving-limit-ring',p2,radius+2.4,{opacity:expanded?1:0,stroke:1.1,paper:true,accent:true,limitFlag:true,derived:true,value,tooltip:`${prev.period} → ${r.period} · MR ${fmt(value)} ${doc.unit} · ${t('超出控制限')}`});ring.entrance=ring.points.map(p=>[p[0],fullBottom]);}
  dot(l,mc,'moving-range',p2,radius,{opacity:expanded?.9:0,stroke:outsideMR?1.1:.5,accent:outsideMR,derived:true,value,entrance:undefined,tooltip:`${prev.period} → ${r.period} · MR = |${fmt(r.value)} − ${fmt(prev.value)}| = ${fmt(value)} ${doc.unit}${outsideMR?` · ${t('超出控制限')}`:''}`});
  l.marks.at(-1).entrance=l.marks.at(-1).points.map(p=>[p[0],fullBottom]);
 });
 // Lines and derived references stay beneath measured and derived points.
 const layer=m=>['individual','moving-range'].includes(m.role)?2:m.limitFlag?1:0;
 l.marks.sort((a,b)=>layer(a)-layer(b));
 return l;
}

export function processMarkProgress(old,next,q){
 if(q===0||q===1)return q;
 if(!next?.processPanel||old?.processExpanded===next.processExpanded)return q;
 const opening=next.processExpanded;
 return next.processPanel==='mr'?(opening?clamp((q-.42)/.58):clamp(q/.58)):(opening?clamp(q/.66):clamp((q-.34)/.66));
}
export function processMarkOpacity(old,next,q){
 if(!next?.processPanel)return null;
 return mix(old?.opacity||0,next.opacity,processMarkProgress(old,next,q));
}
export function interpolateProcessMark(points,old,next,q){
 if(!old?.processPanel||!next?.processPanel||points.length!==next.points.length)return null;
 const p=processMarkProgress(old,next,q);
 if(p===0)return points;if(p===1)return next.points;
 return next.points.map((target,i)=>pointMix(points[i],target,p));
}
