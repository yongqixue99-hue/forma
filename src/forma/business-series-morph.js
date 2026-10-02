import {scaleLinear} from 'd3';
import {recordId,populationId} from './data-identity.js';
import {circlePoints,rectPoints,polygonPoints} from './morph.js';
import {differenceSegments} from './volume6-data.js';
import {change9} from './volume9-data.js';
import {base,axis,glyph,dot,line,key,fmt,padded,short,segment,interpolateDensityContour} from './scientific-geometry.js';
import {businessSeriesEligibility,businessSeriesBounds,businessSeriesText as t} from './business-series-rules.js';

const rawBase=(r,index)=>({identity:key('business-record',recordId(r)),colorIdentity:recordId(r),index,transitionIndex:index,row:r.row,group:r.label});
const polar=(cx,cy,r,a)=>[cx+Math.sin(a)*r,cy-Math.cos(a)*r];
const band=(cx,cy,inner,outer,start,end)=>[...Array.from({length:64},(_,i)=>polar(cx,cy,outer,start+(end-start)*i/63)),...Array.from({length:64},(_,i)=>polar(cx,cy,inner,end-(end-start)*i/63))];
// A gauge and its straight completion track have the same two ordered flanks.
// Four-edge rectangle sampling loses that correspondence and creates wedges.
const straightBand=(x1,x2,y1,y2)=>[...Array.from({length:64},(_,i)=>[x1+(x2-x1)*i/63,y1]),...Array.from({length:64},(_,i)=>[x2-(x2-x1)*i/63,y2])];
const straightStrip=(a,b,width)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,n=[dy/length*width/2,-dx/length*width/2];return [...Array.from({length:64},(_,i)=>[a[0]+dx*i/63+n[0],a[1]+dy*i/63+n[1]]),...Array.from({length:64},(_,i)=>[b[0]-dx*i/63-n[0],b[1]-dy*i/63-n[1]])];};
const finite=v=>typeof v==='number'&&Number.isFinite(v);

export function layoutBusinessTargets(doc,view,w=800,h=440,{domain}={}){
 const compact=w<500,plot={x:compact?72:115,y:58,w:w-(compact?96:154),h:h-108},l=base(doc,view,w,h,plot),bounds=domain||businessSeriesBounds(doc),fan=view==='target-fan',gauge=view==='target-gauge',bullet=view==='target-bullet',progress=view==='target-progress',slot=plot.h/doc.data.length;
 const value=scaleLinear(padded(bounds.value),[plot.x,plot.x+plot.w]),ratio=scaleLinear(bounds.ratio,[plot.x,plot.x+plot.w]);
 const cx=w/2,cy=gauge?h*.67:h*.54,radius=Math.max(22,Math.min(w*(compact?.31:.36),h*(gauge?.43:.34))),inner=radius*.18;
 l.heading=t(`${doc.data.length} 项原始目标`,`${doc.data.length} original targets`);l.details=fan||progress?t('完成率 = 完成值 / 目标值','Completion = actual / target'):gauge?t('使用输入的量程 · 不截断原值','Supplied range · No clipped values'):t('原始单位共用刻度','Shared scale in the original unit');
 l.groups=[];l.groupKeys=[];
 if(!fan&&!gauge){axis(l,progress?ratio:value,true,{title:progress?t('完成比例（1 = 100%）','Completion ratio (1 = 100%)'):doc.unit});}
 if(gauge){const row=doc.data[0];for(let i=0;i<=4;i++){const a=-Math.PI/2+Math.PI*i/4,p=polar(cx,cy,radius*1.13,a);l.labels.push({x:p[0],y:p[1]+4,text:fmt(row.min+(row.max-row.min)*i/4),anchor:'middle',small:true});}l.labels.push({x:cx,y:cy+38,text:`${fmt(row.value)} ${doc.unit}`,anchor:'middle',fontSize:compact?23:32});}
 if(fan){for(const q of[.25,.5,.75,1]){const points=Array.from({length:49},(_,i)=>polar(cx,cy,inner+(radius-inner)*q,-Math.PI*.72+Math.PI*1.44*i/48));for(let i=1;i<points.length;i++)l.guides.push({x1:points[i-1][0],y1:points[i-1][1],x2:points[i][0],y2:points[i][1]});}l.labels.push({x:cx,y:cy+radius*.83,text:'0 → 100%',anchor:'middle',small:true});}
 doc.data.forEach((row,i)=>{
  const common=rawBase(row,i),yy=plot.y+(i+.5)*slot,completed=row.target>0&&Number.isFinite(row.value/row.target)?row.value/row.target:null;
  const tip=`${row.label} · ${t('完成','Actual')} ${fmt(row.value)} / ${t('目标','Target')} ${fmt(row.target)} ${doc.unit}${completed===null?'':` · ${fmt(completed*100)}%`}`;
  let actual=[value(row.value),yy],target=[value(row.target),yy],zero=[value(0),yy],barShape,trackShape,targetShape,needleShape;
  const bh=Math.min(14,slot*.24),label={x:plot.x-10,y:yy+3,text:short(row.label,compact?5:10),fullText:row.label,anchor:'end',small:true};
  if(fan){const a=-Math.PI*.72+(doc.data.length===1?.5:i/(doc.data.length-1))*Math.PI*1.44;zero=polar(cx,cy,inner,a);actual=polar(cx,cy,inner+(radius-inner)*completed,a);target=polar(cx,cy,radius,a);barShape=straightStrip(zero,actual,2.2);trackShape=straightStrip(zero,target,1);const p=polar(cx,cy,radius+15,a);Object.assign(label,{x:p[0],y:p[1]+3,text:short(row.label,compact?3:5),anchor:Math.abs(Math.sin(a))<.2?'middle':Math.sin(a)<0?'end':'start'});}
  else if(gauge){const valueAngle=-Math.PI/2+Math.PI*(row.value-row.min)/(row.max-row.min),targetAngle=-Math.PI/2+Math.PI*(row.target-row.min)/(row.max-row.min);zero=[cx,cy];actual=polar(cx,cy,radius*.76,valueAngle);target=polar(cx,cy,radius*.96,targetAngle);barShape=band(cx,cy,radius*.87,radius,-Math.PI/2,valueAngle);trackShape=band(cx,cy,radius*.87,radius,-Math.PI/2,Math.PI/2);targetShape=segment(polar(cx,cy,radius*.82,targetAngle),polar(cx,cy,radius*1.04,targetAngle),2);needleShape=polygonPoints([[cx-Math.cos(valueAngle)*3,cy-Math.sin(valueAngle)*3],actual,[cx+Math.cos(valueAngle)*3,cy+Math.sin(valueAngle)*3]]);Object.assign(label,{x:cx,y:h-10,text:row.label,anchor:'middle'});}
  else if(progress){zero=[ratio(0),yy];actual=[ratio(completed),yy];target=[ratio(1),yy];barShape=straightBand(zero[0],actual[0],yy-bh/2,yy+bh/2);trackShape=straightBand(zero[0],target[0],yy-bh/2,yy+bh/2);}
  // The actual observation remains at the end of this contour in every
  // straight encoding. Reversing the pair's sampling leaves its exact native
  // line geometry unchanged and retains that correspondence during seeking.
  else {barShape=bullet?straightBand(value(0),value(row.value),yy-bh/2,yy+bh/2):straightStrip(target,actual,1.5);trackShape=straightStrip(zero,target,.7);}
  l.labels.push(label);
  if(!fan&&!gauge)l.labels.push({x:plot.x+plot.w,y:yy-Math.min(12,slot*.29),text:progress?`${fmt(completed*100)}%`:`${fmt(row.value)} / ${fmt(row.target)}`,anchor:'end',fontSize:compact?9:11,dataLabel:true});
  glyph(l,common,'target-track',trackShape,zero,{opacity:progress||fan||gauge?.12:0,derived:true,tooltip:tip,targetStrip:true});
  for(let j=0;j<3;j++){
   const supplied=[row.low,row.mid,row.high].every(finite),start=supplied?[0,row.low,row.mid][j]:0,end=supplied?[row.low,row.mid,row.high][j]:0;
   glyph(l,common,`target-band-${j}`,bullet?rectPoints(value(start),yy-bh*1.25,value(end)-value(start),bh*2.5):circlePoints(...zero,0),zero,{opacity:bullet?.065+j*.055:0,derived:true,tooltip:supplied?`${row.label} · ${doc.bandLabels?.[j]||''} ${fmt(start)}–${fmt(end)} ${doc.unit}`:tip});
  }
  glyph(l,common,'actual-contour',barShape,actual,{opacity:.78,editable:'value',value:row.value,tooltip:tip,targetStrip:true});
  glyph(l,common,'gauge-needle',needleShape||segment(actual,actual,1),actual,{opacity:gauge?.95:0,editable:gauge?'value':undefined,value:row.value,tooltip:tip});
  dot(l,common,'actual-point',actual,compact?2.3:3.4,{opacity:1,editable:'value',value:row.value,tooltip:tip});
  glyph(l,common,'target-endpoint',targetShape||segment([target[0],target[1]-6],[target[0],target[1]+6],1.7),target,{opacity:.95,editable:'target',value:row.target,tooltip:tip,paper:false});
 });
 l.scales={value,ratio};return l;
}

export function layoutBusinessMetrics(doc,view,w=800,h=440,{domain}={}){
 const compact=w<500,cards=view==='metric-cards',plot={x:20,y:52,w:w-40,h:h-90},l=base(doc,view,w,h,plot),cols=Math.min(doc.data.length,w>=280?2:1),rows=Math.ceil(doc.data.length/cols),cw=plot.w/cols,rh=plot.h/rows;
 l.heading=t(`${doc.data.length} 项独立指标`,`${doc.data.length} independent metrics`);l.details=t('每项独立单位与刻度 · 不跨项求和','Independent unit and scale per metric · No cross-metric sum');l.groups=[];l.groupKeys=[];l.metricScales=[];
 doc.data.forEach((row,i)=>{
  const common=rawBase(row,i),cell={x:plot.x+i%cols*cw+10,y:plot.y+Math.floor(i/cols)*rh,w:cw-24,h:rh-12},range=domain?.[`metric:${recordId(row)}`]||[Math.min(0,row.value,row.previous),Math.max(0,row.value,row.previous)],scale=scaleLinear(padded(range),[cell.x+12,cell.x+cell.w-12]),yy=cell.y+cell.h*.51,change=change9(row);
  const current=cards?[cell.x+cell.w*.5,cell.y+cell.h*.49]:[scale(row.value),yy],previous=cards?[cell.x+cell.w*.5,cell.y+cell.h*.79]:[scale(row.previous),yy];
  const tip=`${row.label} · ${fmt(row.value)} / ${fmt(row.previous)} ${row.metricUnit} · Δ ${fmt(change.delta)}`;
  l.labels.push({x:cell.x,y:cell.y+12,text:short(row.label,Math.max(4,Math.floor(cell.w/(compact?11:13)))),fullText:row.label,anchor:'start',fontSize:compact?11:13});
  if(cards){l.labels.push({x:current[0],y:current[1]+5,text:`${fmt(row.value)} ${row.metricUnit}`,anchor:'middle',fontSize:compact?17:26,dataLabel:true},{x:previous[0],y:previous[1]+4,text:`${t('前期','Previous')} ${fmt(row.previous)} ${row.metricUnit}`,anchor:'middle',fontSize:compact?9:12,dataLabel:true});}
  else{for(const tick of scale.ticks(3))l.labels.push({x:scale(tick),y:yy+29,text:fmt(tick),anchor:'middle',fontSize:compact?8:10});l.labels.push({x:cell.x+cell.w,y:cell.y+12,text:row.metricUnit,anchor:'end',fontSize:10});l.guides.push({x1:scale.range()[0],y1:yy,x2:scale.range()[1],y2:yy});l.labels.push({x:current[0],y:yy-13,text:`${t('本期','Current')} ${fmt(row.value)}`,anchor:'middle',fontSize:compact?8:10},{x:previous[0],y:yy+14,text:`${t('前期','Previous')} ${fmt(row.previous)}`,anchor:'middle',fontSize:compact?8:10});}
  const delta=`Δ ${change.delta>0?'+':''}${fmt(change.delta)} ${row.metricUnit}${change.relative===null?'':` · ${change.relative>0?'+':''}${fmt(change.relative*100)}%`}`;
  l.labels.push({x:cell.x,y:cell.y+cell.h,text:delta,anchor:'start',fontSize:compact?9:11});
  glyph(l,common,'metric-current',cards?rectPoints(cell.x,cell.y+20,cell.w,cell.h*.43):circlePoints(...current,compact?3.7:5),current,{opacity:cards?.08:.9,editable:'value',value:row.value,tooltip:tip});
  dot(l,common,'metric-previous',previous,compact?3.1:4.1,{opacity:cards?.13:.9,paper:true,stroke:cards?0:1.3,editable:'previous',value:row.previous,tooltip:tip});
  line(l,common,'metric-link',previous,current,current,{opacity:cards?0:.55,width:1.3,derived:true,tooltip:tip});
  l.metricScales.push({recordId:recordId(row),scale,unit:row.metricUnit});
 });return l;
}

export function layoutBusinessPaired(doc,view,w=800,h=440,{domain}={}){
 const compact=w<500,plot={x:compact?47:65,y:63,w:w-(compact?68:96),h:h-111},l=base(doc,view,w,h,plot),bounds=domain||businessSeriesBounds(doc),rows=[...doc.data].sort((a,b)=>a.position-b.position),combo=view==='paired-combo',difference=view==='paired-difference';
 const x=scaleLinear(bounds.position,[plot.x+plot.w*.018,plot.x+plot.w*.982]),y=scaleLinear(padded(bounds.value),[plot.y+plot.h,plot.y]);
 l.heading=t(`${rows.length} 个原始位置`,`${rows.length} original positions`);l.details=t('同单位 · 原始间隔 · 缺失保留断点','Same unit · Original spacing · Missing values remain gaps');l.groups=doc.seriesLabels;l.groupKeys=doc.businessFields.map(field=>populationId(`business-series:${field}`,doc.data));
 axis(l,y,false,{title:doc.unit});const show=Math.max(1,Math.ceil(rows.length/(compact?4:8)));
 rows.forEach((r,i)=>{if(i%show===0||i===rows.length-1)l.labels.push({x:x(r.position),y:plot.y+plot.h+19,text:short(String(doc.timeMode==='epoch'?r.epoch:r.period),compact?8:12),fullText:String(doc.timeMode==='epoch'?r.epoch:r.period),anchor:'middle',small:true});});
 const gap=Math.min(...rows.slice(1).map((r,i)=>x(r.position)-x(rows[i].position))),barW=Math.max(.6,Math.min(38,gap*.56));
 // Use the native difference algorithm for all exact numeric positions. The
 // temporary ISO date simply transports the original integer position; the
 // editable rows, period labels and source values are never rewritten.
 for(let i=1;i<rows.length;i++){
  const previous=rows[i-1],r=rows[i],complete=doc.businessFields.every(k=>previous[k]!==null&&r[k]!==null),common={identity:key('business-pair-band',recordId(previous),recordId(r)),colorIdentity:l.groupKeys[0],index:r.row,transitionIndex:r.row,row:r.row,recordIds:[recordId(previous),recordId(r)],recordLabel:`${previous.period??previous.epoch} → ${r.period??r.epoch}`,derived:true};
  const parts=complete?differenceSegments([previous,r].map(p=>({period:new Date(p.position).toISOString(),a:p[doc.businessFields[0]],b:p[doc.businessFields[1]]}))):[];
  for(const sign of[true,false]){
   const part=parts.find(p=>p.positive===sign),anchor=[x((previous.position+r.position)/2),y(complete?(previous[doc.businessFields[0]]+r[doc.businessFields[0]])/2:0)];
   const points=part?polygonPoints([...part.points.map(p=>[x(p.x),y(p.a)]),...part.points.toReversed().map(p=>[x(p.x),y(p.b)])]):circlePoints(...anchor,0);
   glyph(l,common,sign?'difference-positive':'difference-negative',points,anchor,{opacity:difference&&part?(sign?.2:.11):0,tooltip:t('相邻原始观测之间的线性差异，非额外样本','Linear difference between adjacent original observations, not extra samples')});
  }
 }
 for(let lane=0;lane<2;lane++){
  const field=doc.businessFields[lane],colorIdentity=l.groupKeys[lane];
  rows.forEach((r,i)=>{
   const observed=r[field]!==null,p=[x(r.position),y(observed?r[field]:0)],common={...rawBase(r,r.row),identity:key('business-pair-observation',recordId(r)),colorIdentity,group:doc.seriesLabels[lane],seriesLane:lane},tip=`${doc.timeMode==='epoch'?r.epoch:r.period} · ${doc.seriesLabels[lane]} ${observed?fmt(r[field]):t('缺失','Missing')} ${doc.unit}`;
   if(i){const previous=rows[i-1],visible=observed&&previous[field]!==null,a=[x(previous.position),y(previous[field]===null?0:previous[field])];line(l,{...common,identity:key('business-pair-link',recordId(previous),recordId(r)),recordIds:[recordId(previous),recordId(r)],recordLabel:`${doc.seriesLabels[lane]} · ${previous.period??previous.epoch} → ${r.period??r.epoch}`},`series-${field}-link`,a,p,p,{opacity:visible&&(!combo||lane===1)?.8:0,width:lane?1.3:1.7,derived:true,tooltip:tip});}
   const shape=combo&&lane===0?rectPoints(p[0]-barW/2,Math.min(y(0),p[1]),barW,Math.abs(y(0)-p[1])):circlePoints(...p,compact?2.2:3);
   glyph(l,common,`series-${field}-value`,shape,p,{opacity:observed?.88:0,editable:observed?field:undefined,value:r[field]??0,tooltip:tip,point:p,paper:!(combo&&lane===0)&&lane===1,stroke:!(combo&&lane===0)&&lane===1?1.3:0,missing:!observed});
  });
 }
 l.scales={x,y};return l;
}

export function layoutBusinessSeries(doc,view,w=800,h=440,options={}){
 const eligibility=businessSeriesEligibility(doc,view);if(!eligibility.valid)throw new Error(eligibility.reason);
 return doc.family==='business-target'?layoutBusinessTargets(doc,view,w,h,options):doc.family==='business-metrics'?layoutBusinessMetrics(doc,view,w,h,options):layoutBusinessPaired(doc,view,w,h,options);
}

export function interpolateBusinessSeriesMark(fromPoints,oldMark,nextMark,q){
 if(!oldMark||!['actual-contour','target-track'].includes(nextMark.role))return null;
 if(!oldMark.targetStrip||!nextMark.targetStrip)return null;
 if(q===0)return fromPoints;if(q===1)return nextMark.points;
 // At the lower gauge limit both flanks close onto one radial cap. It has no
 // longitudinal axis to normalize; interpolate that actual cap directly.
 const span=points=>Math.hypot((points[63][0]+points[64][0]-points[0][0]-points[127][0])/2,(points[63][1]+points[64][1]-points[0][1]-points[127][1])/2);
 if(Math.min(span(fromPoints),span(nextMark.points))<1e-8)return nextMark.points.map((p,i)=>[fromPoints[i][0]+(p[0]-fromPoints[i][0])*q,fromPoints[i][1]+(p[1]-fromPoints[i][1])*q]);
 const centres=points=>Array.from({length:64},(_,i)=>[(points[i][0]+points[127-i][0])/2,(points[i][1]+points[127-i][1])/2]),a=centres(fromPoints),b=centres(nextMark.points),direction=points=>[points[63][0]-points[0][0],points[63][1]-points[0][1]],da=direction(a),db=direction(b),la=Math.hypot(...da),lb=Math.hypot(...db),straight=(points,d,len)=>points.every(p=>Math.abs((p[0]-points[0][0])*d[1]-(p[1]-points[0][1])*d[0])<1e-8*len);
 if(straight(a,da,la)&&straight(b,db,lb)){
  // Rotate each strip around its interpolated real endpoints. The original
  // actual/target dots follow these same positions and cannot detach from it.
  const middle=a.map((p,i)=>[p[0]+(b[i][0]-p[0])*q,p[1]+(b[i][1]-p[1])*q]),d=direction(middle),length=Math.hypot(...d),n=length<1e-10?[da[1]/la,-da[0]/la]:[d[1]/length,-d[0]/length];
  // When an actual-to-baseline distance changes sign, its real endpoints
  // meet naturally. Keep that zero-length transverse cap; rotating the full
  // old length through half a turn would leave the canvas and detach the dot.
  return nextMark.points.map((p,i)=>{const j=i<64?i:127-i,sign=i<64?1:-1,wa=Math.hypot(fromPoints[j][0]-fromPoints[127-j][0],fromPoints[j][1]-fromPoints[127-j][1])/2,wb=Math.hypot(nextMark.points[j][0]-nextMark.points[127-j][0],nextMark.points[j][1]-nextMark.points[127-j][1])/2,width=wa+(wb-wa)*q;return [middle[j][0]+sign*n[0]*width,middle[j][1]+sign*n[1]*width];});
 }
 return interpolateDensityContour(fromPoints,nextMark.points,q);
}
