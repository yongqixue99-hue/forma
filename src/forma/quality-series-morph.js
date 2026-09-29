import {scaleLinear} from 'd3';
import {recordId,populationId} from './data-identity.js';
import {base,axis,dot,line,key,fmt,short,glyph} from './scientific-geometry.js';
import {measurementDomain} from './axis-policy.js';
import {proportion11,defects11,cusum11,ewma11,xbar11} from './volume11-data.js';
import {funnelLimits16} from './volume16-data.js';
import {qualityText as t,qualityBounds} from './quality-series-rules.js';
const domain=(values,{zero=false,percent=false}={})=>{const d=measurementDomain(values,{zero,padding:.075});return percent?[Math.max(0,d[0]),Math.min(1,d[1])]:d;};
const roles={raw:{neutral:true},fg:{nativeColorRole:'fg'},signal:{nativeColorRole:'accent'}};
function frame(w,h){return{x:w<500?52:66,y:57,w:w-(w<500?76:92),h:Math.max(56,h-112)};}
function yAxis(l,p,y,title,percent=false){const start=l.labels.length;axis({...l,plot:p},y,false,{title});if(percent)for(const label of l.labels.slice(start))if(label.small){const v=y.invert(label.y-3);label.text=fmt(v*100)+'%';}}
function xTime(l,p,x,rows,title='',show=true){
 if(show){const n=Math.min(rows.length,l.w<500?4:8),indices=[...new Set(Array.from({length:n},(_,j)=>Math.round(j*(rows.length-1)/Math.max(1,n-1))))];for(const i of indices)l.labels.push({x:x(i),y:p.y+p.h+16,text:short(rows[i].period,l.w<500?5:9),anchor:'middle',fontSize:9});}
 if(title)l.labels.push({x:p.x+p.w,y:l.h-6,text:short(title,Math.max(15,Math.floor(l.w/12))),anchor:'end',fontSize:9});
}
const meta=(r,i)=>({identity:recordId(r),index:0,transitionIndex:i,row:r.row,group:'quality'});
const aggregate=(identity,rows,i=0)=>({identity,index:0,transitionIndex:i,group:'quality',recordIds:rows.map(recordId)});
function ref(l,p,y,value,identity,{opacity=.55,signal=false}={}){const yy=y(value);line(l,aggregate(key('quality-reference',identity),l.doc.data),'reference',[p.x,yy],[p.x+p.w,yy],[p.x+p.w/2,yy],{derived:true,opacity,width:.9,...(signal?roles.signal:roles.raw),value,tooltip:String(identity)+': '+fmt(value)});}
function connector(l,r,i,role,a,b,{opacity=.5,color=roles.fg,records,...rest}={}){line(l,aggregate(key(recordId(r),role),records||[r],i),'connection',a,b,a,{derived:true,opacity,width:1.1,...color,...rest});}
function point(l,r,i,role,p,field,{value=r[field],opacity=.82,radius=l.w<500?2.1:2.8,color=roles.fg,tooltip,...extra}={}){return dot(l,meta(r,i),role,p,radius,{original:true,editable:field,value,opacity,...color,tooltip,...extra});}
function derivedPoint(l,r,i,role,p,value,records,{color=roles.fg,opacity=.88,tooltip,...extra}={}){return dot(l,aggregate(key(recordId(r),role),records,i),'statistic',p,l.w<500?2.2:2.8,{derived:true,value,opacity,...color,tooltip,...extra});}
// One contour per smooth reference curve, with stable paired flanks. Sampling
// is limited to a display reference; no observation or count is resampled.
function curve(l,id,coordinates,{color=roles.signal,opacity=.5}={}){
 const sampled=Array.from({length:64},(_,i)=>coordinates(i/63)),upper=[],lower=[];
 sampled.forEach((p,i)=>{const a=sampled[Math.max(0,i-1)],b=sampled[Math.min(63,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,n=[-dy/length*.45,dx/length*.45];upper.push([p[0]+n[0],p[1]+n[1]]);lower.push([p[0]-n[0],p[1]-n[1]]);});
 glyph(l,aggregate(key('quality-curve',id),l.doc.data),'reference-curve',[...upper,...lower.reverse()],sampled[32],{derived:true,opacity,...color,tooltip:t('近似控制参考界限','Approximate control reference limit')});
}
function attributes(doc,view,w,h,bounds){
 const p=frame(w,h),l=base(doc,view,w,h,p),isP=doc.family==='quality-proportion',denominator=isP?'sampleSize':'exposure',field=isP?'defectives':'defects',stats=(isP?proportion11:defects11)(doc.data),bySize=view.endsWith('-size')||view.endsWith('-exposure'),x=scaleLinear(domain(bySize?bounds.denominator:bounds.order),[p.x,p.x+p.w]),y=scaleLinear(domain(bounds.rate,{zero:true,percent:isP}),[p.y+p.h,p.y]);
 yAxis(l,p,y,isP?t('不合格件比例','Nonconforming proportion'):doc.unit,isP);if(bySize)axis(l,x,true,{title:isP?t('检查件数 n','Inspected units n'):t('实际检查暴露量','Actual inspection exposure')});else xTime(l,p,x,doc.data,t('按采集顺序排列的批次','Batches in acquisition order'));
 ref(l,p,y,stats.center,'weighted-center');
 const project=(item,i)=>[x(bySize?item.row[denominator]:i),y(item.value)];
 stats.points.forEach((item,i)=>{
  const r=item.row,at=project(item,i),outside=item.value<item.low||item.value>item.high,tooltip=`${r.period} · ${field}=${r[field]} · ${denominator}=${r[denominator]} · ${isP?fmt(item.value*100)+'%':fmt(item.value)+' '+doc.unit} · [${isP?fmt(item.low*100)+'%':fmt(item.low)}, ${isP?fmt(item.high*100)+'%':fmt(item.high)}]`;
  point(l,r,i,'quality-observation',at,field,{color:outside?roles.signal:roles.fg,paper:!outside,stroke:1.1,outside,projection:{x:bySize?r[denominator]:i,y:item.value},tooltip});
  connector(l,r,i,'local-limits',[at[0],y(item.low)],[at[0],y(item.high)],{opacity:bySize?.35:.13,color:roles.signal,records:doc.data,low:item.low,high:item.high,tooltip});
  if(i){const previous=stats.points[i-1],before=project(previous,i-1),middle=(at[0]+before[0])/2;connector(l,r,i,'observation-trace',before,at,{opacity:bySize?0:.52,records:[previous.row,r]});for(const field of['low','high']){
    const a=[before[0],y(previous[field])],b=[at[0],y(item[field])],segments=[[a,[middle,a[1]]],[[middle,a[1]],[middle,b[1]]],[[middle,b[1]],b]];
    segments.forEach(([from,to],j)=>connector(l,r,i,`${field}-${j}`,from,to,{opacity:bySize?0:.4,color:roles.signal,records:doc.data}));
  }}
 });
 l.heading=(isP?'p̄':'ū')+' = '+(isP?fmt(stats.center*100)+'%':fmt(stats.center)+' '+doc.unit);l.details=t('总计数 ÷ 总分母 · 原记录保留','Total counts ÷ total denominator · originals retained');l.statistics=stats;l.scales={x,y};return l;
}
function cusum(doc,view,w,h,bounds){
 const p=frame(w,h),allHeight=p.h,strip={...p,y:p.y+allHeight*.78+5,h:Math.max(14,allHeight*.22-5)};p.h=allHeight*.6;const l=base(doc,view,w,h,p),points=cusum11(doc),single=view==='quality-cusum-contributions',x=scaleLinear(bounds.order,[p.x,p.x+p.w]),y=scaleLinear(domain(single?bounds.contribution:bounds.cumulative,{zero:true}),[p.y+p.h,p.y]),z=scaleLinear(domain(bounds.standardized,{zero:true}),[strip.y+strip.h,strip.y]);
 yAxis(l,p,y,single?t('当次超额 / σ','Individual excess / σ'):t('累计量 / σ','Cumulative amount / σ'));xTime(l,strip,x,doc.data,t('按原始采集顺序 · 下方保留 z','Acquisition order · raw z below'));
 l.labels.push({x:strip.x,y:strip.y-5,text:'z = (value − target) / sigma',fontSize:8});ref(l,p,y,0,'zero');
 for(const sign of[-1,1])ref(l,p,y,single?0:sign*doc.decisionH,'H:'+sign,{opacity:single?0:.6,signal:true});
 for(const [role,sign,color]of[['upper',1,{...roles.signal,nativeDataColorIndex:0}],['lower',-1,{...roles.fg,nativeDataColorIndex:1}]]){
  const val=item=>single?sign*Math.max(0,sign*item.z-doc.referenceK):sign*item[role];
  points.forEach((item,i)=>{const r=item.row,value=val(item),at=[x(i),y(value)],history=single?[r]:doc.data.slice(0,i+1),tooltip=`${r.period} · ${single?t('单次超额','Individual excess'):role==='upper'?'C⁺':'−C⁻'}=${fmt(value)} σ · value=${r.value} ${doc.unit} · z=${fmt(item.z)}`;
   derivedPoint(l,r,i,role,at,value,history,{color,tooltip,paper:single||Math.abs(value)<=doc.decisionH,stroke:1.05,statistic:single?'individual-excess':'cumulative',outside:!single&&Math.abs(value)>doc.decisionH,projection:{x:i,y:value}});
   if(i)connector(l,r,i,role+'-trace',[x(i-1),y(val(points[i-1]))],at,{color,records:single?[points[i-1].row,r]:doc.data.slice(0,i+1)});
  });
 }
 points.forEach((item,i)=>point(l,item.row,i,'quality-observation',[x(i),z(item.z)],'value',{color:roles.raw,radius:w<500?1.8:2.4,projection:{x:i,y:item.z},tooltip:`${item.row.period} · value=${item.row.value} ${doc.unit} · z=${fmt(item.z)}`}));
 l.heading=`K=${fmt(doc.referenceK)} · H=${fmt(doc.decisionH)}`;l.details=single?t('单次超额，不是报警统计量','Individual excess, not an alarm statistic'):t('完整历史累计 · 越限后不重置','Complete accumulated history · no reset after crossing');l.statistics=points;l.scales={x,y,z};return l;
}
function ewma(doc,view,w,h,bounds){
 const p=frame(w,h),l=base(doc,view,w,h,p),points=ewma11(doc),split=view==='quality-ewma-decomposition',x=scaleLinear(bounds.order,[p.x,p.x+p.w]),y=scaleLinear(domain(split?bounds.decomposition:bounds.measurement,{zero:split}),[p.y+p.h,p.y]);
 yAxis(l,p,y,split?t('偏离','Departure')+' / '+doc.unit:doc.unit);xTime(l,p,x,doc.data,t('按原始采集顺序','Original acquisition order'));ref(l,p,y,split?0:doc.target,'baseline');
 const projected=item=>({raw:split?item.row.value-item.value:item.row.value,weighted:split?item.value-doc.target:item.value});
 points.forEach((item,i)=>{const r=item.row,values=projected(item),raw=[x(i),y(values.raw)],weighted=[x(i),y(values.weighted)],tooltip=`${r.period} · value=${r.value} ${doc.unit} · EWMA=${fmt(item.value)} · value−EWMA=${fmt(r.value-item.value)} · EWMA−target=${fmt(item.value-doc.target)}`;
  point(l,r,i,'quality-observation',raw,'value',{color:roles.raw,opacity:.7,tooltip,projection:{x:i,y:values.raw}});
  const outside=item.value<item.low||item.value>item.high;
  derivedPoint(l,r,i,'ewma',weighted,values.weighted,doc.data.slice(0,i+1),{color:outside?roles.signal:{...roles.signal,nativeDataColorIndex:0},tooltip,outside,paper:!outside,stroke:1.1,statistic:split?'smoothed-departure':'EWMA',projection:{x:i,y:values.weighted}});
  if(i){const prev=points[i-1],old=projected(prev);connector(l,r,i,'raw-trace',[x(i-1),y(old.raw)],raw,{color:roles.raw,opacity:.3,records:[prev.row,r]});connector(l,r,i,'ewma-trace',[x(i-1),y(old.weighted)],weighted,{color:{...roles.signal,nativeDataColorIndex:0},records:doc.data.slice(0,i+1)});for(const field of['low','high'])connector(l,r,i,field,[x(i-1),y(split?0:prev[field])],[x(i),y(split?0:item[field])],{color:roles.signal,opacity:split?0:.4,records:doc.data.slice(0,i+1)});}
 });
 l.heading=`λ=${fmt(doc.lambda)} · target=${fmt(doc.target)} ${doc.unit}`;l.details=split?'value − target = (EWMA − target) + (value − EWMA)':t('原始值与加权轨迹 · 启动期控制限','Raw values and weighted trace · startup limits');l.statistics=points;l.scales={x,y};return l;
}
function xbar(doc,view,w,h,bounds){
 const p=frame(w,h),allHeight=p.h,p2={...p,y:p.y+allHeight*.64,h:Math.max(20,allHeight*.36)};p.h=Math.max(22,allHeight*.42);const l=base(doc,view,w,h,p),stats=xbar11(doc.data),centered=view==='quality-subgroup-residuals',x=scaleLinear(bounds.order,[p.x,p.x+p.w]),y=scaleLinear(domain(centered?bounds.within:bounds.measurement,{zero:centered}),[p.y+p.h,p.y]),ry=scaleLinear(domain(bounds.range,{zero:true}),[p2.y+p2.h,p2.y]);
 yAxis(l,p,y,centered?t('原值 − 子组均值','Raw − subgroup mean'):'X̄ · '+doc.unit);yAxis(l,p2,ry,'R · '+doc.unit);xTime(l,p2,x,stats.groups,t('同样本量原始子组','Equal-size original subgroups'));
 for(const [role,value]of[['low',stats.low],['center',stats.center],['high',stats.high]])ref(l,p,y,centered?0:value,'mean-'+role,{opacity:centered?(role==='center'?.55:0):.55,signal:role!=='center'});
 for(const [role,value]of[['low',stats.rangeLow],['center',stats.range],['high',stats.rangeHigh]])ref(l,p2,ry,value,'range-'+role,{signal:role!=='center'});
 stats.groups.forEach((group,i)=>{
  const identity=populationId('quality-subgroup',group.rows),rawMean=centered?0:group.mean,at=[x(i),y(rawMean)],rt=[x(i),ry(group.range)],tooltip=`${group.period} · mean=${fmt(group.mean)} ${doc.unit} · R=${fmt(group.range)} · n=${stats.n}`;
  for(const [role,where,value,outside]of[['subgroup-mean',at,rawMean,!centered&&(group.mean<stats.low||group.mean>stats.high)],['subgroup-range',rt,group.range,group.range<stats.rangeLow||group.range>stats.rangeHigh]])dot(l,aggregate(identity,group.rows,i),role,where,w<500?2.2:2.9,{derived:true,value,opacity:.9,...(outside?roles.signal:roles.fg),paper:!outside,stroke:1,tooltip,outside,projection:{x:i,y:value}});
  group.rows.forEach((r,j)=>{const spread=Math.min(9,p.w/stats.groups.length*.3),cx=x(i)+(j/(stats.n-1)-.5)*spread,v=centered?r.value-group.mean:r.value;point(l,r,r.row,'quality-observation',[cx,y(v)],'value',{color:roles.raw,radius:w<500?1.6:2.1,opacity:.6,projection:{x:i,y:v},tooltip:`${group.period} · ${r.sample} · value=${r.value} ${doc.unit} · value−mean=${fmt(r.value-group.mean)}`});});
  if(i){const before=stats.groups[i-1],source=[...before.rows,...group.rows],m=aggregate(key(identity,'trace'),source,i);line(l,m,'mean-trace',[x(i-1),y(centered?0:before.mean)],at,at,{derived:true,opacity:.4,...roles.fg});line(l,m,'range-trace',[x(i-1),ry(before.range)],rt,rt,{derived:true,opacity:.4,...roles.fg});}
 });
 l.heading=`n=${stats.n} · `+t('均值与极差','Means and ranges');l.details=centered?t('每组独立中心化 · 极差不变','Center within each subgroup · ranges unchanged'):t('全部子组估计基线 · 原样本保留','All subgroups estimate the baseline · raw samples retained');l.statistics=stats;l.scales={x,y,range:ry};return l;
}
function funnel(doc,view,w,h,bounds){
 const p=frame(w,h),l=base(doc,view,w,h,p),standard=view==='quality-funnel-standardized',nd=domain(bounds.denominator),x=scaleLinear(nd,[p.x,p.x+p.w]),y=scaleLinear(domain(standard?bounds.standardized:bounds.rate,{zero:standard,percent:!standard}),[p.y+p.h,p.y]),convert=(value,n)=>standard?(value-doc.targetRate)/Math.sqrt(doc.targetRate*(1-doc.targetRate)/n):value;
 axis(l,x,true,{title:t('完整样本量 n','Complete sample size n')});yAxis(l,p,y,standard?t('标准化偏离（无量纲）','Standardized departure (dimensionless)'):t('事件比例','Event proportion'));ref(l,p,y,standard?0:doc.targetRate,'target');
 const nMin=bounds.denominator[0],nMax=bounds.denominator[1];for(const field of['low','high'])curve(l,field,q=>{const n=nMin+(nMax-nMin)*q;return [x(n),y(convert(funnelLimits16(n,doc.targetRate,doc.limitSigma)[field],n))];});
 doc.data.forEach((r,i)=>{const rate=r.events/r.total,limits=funnelLimits16(r.total,doc.targetRate,doc.limitSigma),value=convert(rate,r.total),outside=rate<limits.low||rate>limits.high,low=convert(limits.low,r.total),high=convert(limits.high,r.total);point(l,r,i,'quality-observation',[x(r.total),y(value)],'events',{color:outside?roles.signal:roles.fg,paper:!outside,stroke:1.1,tooltip:`${r.label} · events=${r.events} · total=${r.total} · rate=${fmt(rate)} · ${standard?'z':'rate'}=${fmt(value)} · [${fmt(low)}, ${fmt(high)}]`,outside,projection:{x:r.total,y:value},low,high});});
 l.heading=`p=${fmt(doc.targetRate)} · ${doc.limitSigma}σ`;l.details=t('显式目标 · 相同原界限 · 仅正态近似','Explicit target · same original limits · normal approximation only');l.scales={x,y};return l;
}
export function layoutQuality(doc,view,w=800,h=440,{domain:shared}={}){
 const bounds=shared||qualityBounds(doc),layout=['quality-proportion','quality-defects'].includes(doc.family)?attributes(doc,view,w,h,bounds):doc.family==='quality-cusum'?cusum(doc,view,w,h,bounds):doc.family==='quality-ewma'?ewma(doc,view,w,h,bounds):doc.family==='quality-xbar'?xbar(doc,view,w,h,bounds):funnel(doc,view,w,h,bounds);
 layout.marks.sort((a,b)=>Number(!a.derived)-Number(!b.derived));layout.groups=[];layout.groupKeys=[];return layout;
}
