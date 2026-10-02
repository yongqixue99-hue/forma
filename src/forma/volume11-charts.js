import {populationId} from './data-identity.js';
import * as d3 from 'd3';
import {t11,proportion11,defects11,cusum11,ewma11,xbar11,lagPairs11,spectrum11} from './volume11-data.js';
import {number7 as fmt,num7 as num,label7 as label,short7 as shorten} from './volume7-utils.js';

const markColor=(s,i=0)=>s.dataColor(i,i===0?s.theme.accent:s.theme.fg);
const records=rows=>JSON.stringify(rows.map(d=>d._id).filter(Boolean));
function frame(s,values,{left=s.compact?42:56,right=s.w-20,top=38,bottom=s.h-43,zero=false,percent=false,ticks=4}={}){
 const domain=s.linearDomain(values,zero),span=domain[1]-domain[0],padded=zero&&domain[0]>=0?[0,domain[1]+span*.08]:[domain[0]-span*.08,domain[1]+span*.08],y=d3.scaleLinear(padded,[bottom,top]).nice(ticks);
 if(percent)y.domain([Math.max(0,y.domain()[0]),Math.min(1,y.domain()[1])]);
 y.ticks(ticks).forEach(v=>{s.line(left,y(v),right,y(v),{'stroke-width':.6,'stroke-dasharray':'1 5'});num(s,left-7,y(v)+3,percent?`${fmt(v*100)}%`:fmt(v),{'text-anchor':'end','font-size':s.fs-3});});
 s.line(left,bottom,right,bottom,{'stroke-width':.75});return{left,right,top,bottom,y};
}
function timeline(s,rows,f,{labels=true}={}){
 const x=d3.scaleLinear([0,Math.max(1,rows.length-1)],[f.left,f.right]),skip=Math.max(1,Math.ceil(rows.length/(s.compact?5:8)));
 if(labels){
  const limit=s.compact?4:7,size=Math.max(s.compact?8:10,s.fs-3),width=i=>[...shorten(rows[i].period,limit)].reduce((sum,c)=>sum+(/[\u0000-\u007f]/.test(c)?.6:1)*size,0),gap=(a,b)=>Math.max(28,(width(a)+width(b))/2+8),indices=[];
  rows.forEach((_,i)=>{if(i===0||i%skip===0){const previous=indices.at(-1);if(previous===undefined||x(i)-x(previous)>=gap(previous,i))indices.push(i);}});
  const last=rows.length-1;if(indices.at(-1)!==last){while(indices.length>1&&x(last)-x(indices.at(-1))<gap(indices.at(-1),last))indices.pop();if(x(last)-x(indices.at(-1))>=gap(indices.at(-1),last))indices.push(last);}
  indices.forEach(i=>label(s,x(i),f.bottom+17,rows[i].period,{'text-anchor':'middle','font-size':s.fs-3,'data-mark':'process-period-label','data-period-index':i},limit));
 }return x;
}
function reference(s,f,value,{color=s.theme.secondary,dash='3 4',name,percent=false}={}){
 const line=s.line(f.left,f.y(value),f.right,f.y(value),{stroke:color,'stroke-width':.9,'stroke-dasharray':dash,'data-mark':'process-reference','data-value':value});
 s.tip(line,`${name||'CL'}: ${percent?fmt(value*100)+'%':fmt(value)}`);return line;
}
function limits(s,f,x,points,{step=false}={}){
 const g=s.group({'data-mark':'control-envelope'}),curve=step?d3.curveStep:d3.curveLinear,area=d3.area().x((d,i)=>x(i)).y0(d=>f.y(d.low)).y1(d=>f.y(d.high)).curve(curve),line=d3.line().x((d,i)=>x(i)).curve(curve);
 s.path(area(points),{fill:s.theme.accent,'fill-opacity':.065},g);
 for(const field of ['low','high'])s.path(line.y(d=>f.y(d[field]))(points),{stroke:s.theme.accent,'stroke-width':.9,'stroke-dasharray':'4 3','data-mark':`control-${field}`},g);
 s.clipReveal(g,f.left-4,f.top-5,f.right-f.left+8,f.bottom-f.top+10,0,.72);return g;
}
function scalarPoints(s,doc,f,x,points,{prefix,color=s.theme.fg,field='value',format=fmt,tip,group,raw=false}={}){
 const g=group||s.group(),line=d3.line().x((d,i)=>x(i)).y(d=>f.y(d.value));
 s.path(line(points),{stroke:color,'stroke-width':1.3,'data-mark':`${prefix}-line`},g);
 points.forEach((p,i)=>{const outside=p.low!==undefined&&(p.value<p.low||p.value>p.high),point=s.circle(x(i),f.y(p.value),outside?3.5:2.7,{fill:outside?s.theme.accent:s.theme.bg,stroke:outside?s.theme.accent:color,'stroke-width':1.2,'data-mark':`${prefix}-point`,'data-value':p.value,'data-low':p.low,'data-high':p.high,'data-outside':outside},g);
  if(raw)s.edit(point,p.row,field);else point.setAttribute('data-record-ids',records(doc.data.slice(0,i+1)));
  s.tip(point,tip?tip(p):`${p.row.period}\n${format(p.value)} ${doc.unit}${outside?'\n'+t11('超出控制限','Outside control limits'):''}`);
 });return g;
}
function attributeControl(s,doc,proportion){
 const stats=(proportion?proportion11:defects11)(doc.data),f=frame(s,stats.points.flatMap(p=>[p.value,p.low,p.high]),{bottom:s.h-78,zero:true,percent:proportion}),x=timeline(s,doc.data,f),format=v=>proportion?`${fmt(v*100)}%`:`${fmt(v)} ${doc.unit}`;
 limits(s,f,x,stats.points,{step:true});reference(s,f,stats.center,{name:'CL',percent:proportion,dash:'',color:s.theme.secondary});
 const countKey=proportion?'defectives':'defects',denominator=proportion?'sampleSize':'exposure',g=scalarPoints(s,doc,f,x,stats.points,{prefix:doc.template,raw:true,field:countKey,tip:p=>`${p.row.period}\n${format(p.value)}\n${countKey}: ${p.row[countKey]} · ${denominator}: ${p.row[denominator]}\nLCL ${format(p.low)} · UCL ${format(p.high)}${p.value<p.low||p.value>p.high?'\n'+t11('超出控制限','Outside control limits'):''}`});
 s.clipReveal(g,f.left-5,f.top-6,f.right-f.left+10,f.bottom-f.top+12,.07,.72);
 label(s,f.left,15,`${proportion?'p':'u'} · ${t11('加权基线','Weighted baseline')} ${format(stats.center)}`,{'font-size':s.fs-2,fill:s.theme.fg},s.compact?30:58);
 const barTop=s.h-40,barBottom=s.h-24,max=d3.max(doc.data,d=>d[denominator]),barWidth=Math.min(7,(f.right-f.left)/doc.data.length*.55);
 doc.data.forEach((d,i)=>{const height=(barBottom-barTop)*d[denominator]/max,bar=s.rect(x(i)-barWidth/2,barBottom-height,barWidth,height,{fill:s.theme.secondary,'fill-opacity':.4,'data-mark':'inspection-exposure','data-value':d[denominator]});s.reveal(bar,.2+i/doc.data.length*.35,.3);s.edit(bar,d,denominator);s.tip(bar,`${d.period}\n${denominator}: ${d[denominator]}`);});
 label(s,f.left,s.h-5,proportion?t11('下方短柱：各批检查件数 n','Lower bars: inspected units n'):t11('下方短柱：各批检查暴露量','Lower bars: inspection exposure'),{'font-size':s.fs-3},s.compact?32:60);
}
function cusum(s,doc){
 const points=cusum11(doc),f=frame(s,[-doc.decisionH,doc.decisionH,...points.flatMap(p=>[p.upper,-p.lower])]),x=timeline(s,doc.data,f),g=s.group();
 reference(s,f,0,{dash:'',name:'0'});for(const sign of[-1,1])reference(s,f,sign*doc.decisionH,{name:sign>0?'H':'−H',color:s.theme.accent});
 for(const [j,field,sign]of[[0,'upper',1],[1,'lower',-1]]){
  const col=markColor(s,j),line=d3.line().x((p,i)=>x(i)).y(p=>f.y(sign*p[field])),area=d3.area().x((p,i)=>x(i)).y0(f.y(0)).y1(p=>f.y(sign*p[field]));
  s.path(area(points),{fill:col,'fill-opacity':.07},g);s.path(line(points),{stroke:col,'stroke-width':1.6,'data-mark':`cusum-${field}-line`},g);
  points.forEach((p,i)=>{const out=p[field]>doc.decisionH,m=s.circle(x(i),f.y(sign*p[field]),out?3.2:2.4,{fill:out?col:s.theme.bg,stroke:col,'stroke-width':1.05,'data-mark':`cusum-${field}-point`,'data-value':sign*p[field],'data-outside':out,'data-record-ids':records(doc.data.slice(0,i+1))},g);s.edit(m,p.row,'value');s.tip(m,`${p.row.period} · ${j?'−C⁻':'C⁺'}\n${fmt(sign*p[field])} σ\n${t11('当前原始观测','Current raw observation')}: ${p.row.value} ${doc.unit}\nz=${fmt(p.z)}${out?'\n'+t11('超出决策阈值','Beyond decision threshold'):''}`);});
 }
 s.clipReveal(g,f.left-6,f.top-6,f.right-f.left+12,f.bottom-f.top+12,0,.82);
 s.legend([{label:'C⁺',color:markColor(s,0)},{label:'−C⁻',color:markColor(s,1)}],f.left,15);label(s,f.right,s.h-3,`K=${fmt(doc.referenceK)} · H=${fmt(doc.decisionH)} · σ ${t11('倍数','units')}`,{'text-anchor':'end','font-size':s.fs-3},48);
}
function ewma(s,doc){
 const points=ewma11(doc),f=frame(s,[...doc.data.map(d=>d.value),...points.flatMap(p=>[p.value,p.low,p.high])]),x=timeline(s,doc.data,f),g=s.group();
 limits(s,f,x,points);reference(s,f,doc.target,{name:t11('基线','Baseline'),dash:''});
 const rawLine=d3.line().x((d,i)=>x(i)).y(d=>f.y(d.value));s.path(rawLine(doc.data),{stroke:s.theme.secondary,'stroke-opacity':.35,'stroke-width':.8},g);
 doc.data.forEach((d,i)=>{const m=s.circle(x(i),f.y(d.value),2,{fill:s.theme.secondary,'fill-opacity':.5,'data-mark':'ewma-observation','data-value':d.value},g);s.edit(m,d,'value');s.tip(m,`${d.period}\n${t11('原始测量','Raw measurement')}: ${d.value} ${doc.unit}`);});
 scalarPoints(s,doc,f,x,points,{prefix:'ewma',color:markColor(s),group:g,tip:p=>`${p.row.period}\nEWMA: ${fmt(p.value)} ${doc.unit}\n${t11('原始测量','Raw measurement')}: ${p.row.value}\nLCL ${fmt(p.low)} · UCL ${fmt(p.high)}`});
 s.clipReveal(g,f.left-5,f.top-6,f.right-f.left+10,f.bottom-f.top+12,.04,.78);
 s.legend([{label:'EWMA',color:markColor(s)},{label:t11('原始值','Raw'),color:s.theme.secondary}],f.left,15);label(s,f.right,s.h-3,`λ=${fmt(doc.lambda)} · ${doc.limitSigma}σ · ${t11('启动期控制限','Startup limits')}`,{'text-anchor':'end','font-size':s.fs-3},50);
}
function xbar(s,doc){
 const stats=xbar11(doc.data),top=27,gap=s.compact?43:47,bottom=s.h-30,ph=(bottom-top-gap)/2;
 const panels=[{name:'X̄',key:'mean',low:stats.low,high:stats.high,center:stats.center},{name:'R',key:'range',low:stats.rangeLow,high:stats.rangeHigh,center:stats.range}];
 panels.forEach((panel,j)=>{
  const values=[panel.low,panel.high,...stats.groups.map(g=>g[panel.key]),...(j?[]:doc.data.map(d=>d.value))],f=frame(s,values,{top:top+j*(ph+gap),bottom:top+j*(ph+gap)+ph,zero:j===1,ticks:3}),x=timeline(s,stats.groups,f,{labels:j===1}),g=s.group();
  for(const [name,value]of[['LCL',panel.low],['CL',panel.center],['UCL',panel.high]])reference(s,f,value,{name,color:name==='CL'?s.theme.secondary:s.theme.accent,dash:name==='CL'?'':'3 4'});
  s.path(d3.line().x((p,i)=>x(i)).y(p=>f.y(p[panel.key]))(stats.groups),{stroke:s.theme.fg,'stroke-width':1.3},g);
  stats.groups.forEach((p,i)=>{
   if(j===0)p.rows.forEach((row,k)=>{const spread=Math.min(8,(f.right-f.left)/stats.groups.length*.28),cx=x(i)+(k/(p.rows.length-1)-.5)*spread,m=s.circle(cx,f.y(row.value),s.compact?1.7:2,{fill:s.theme.secondary,'fill-opacity':.38,'data-mark':'xbar-observation','data-value':row.value},g);s.edit(m,row,'value');s.tip(m,`${p.period} · ${row.sample}\n${row.value} ${doc.unit}`);});
   const value=p[panel.key],outside=value<panel.low||value>panel.high,m=s.circle(x(i),f.y(value),outside?3.4:2.7,{fill:outside?s.theme.accent:s.theme.bg,stroke:outside?s.theme.accent:s.theme.fg,'stroke-width':1.1,'data-mark':`xbar-${panel.key}`,'data-value':value,'data-outside':outside,'data-record-ids':records(p.rows),'data-source-rows':JSON.stringify(p.rows.map(r=>doc.data.indexOf(r)))},g);
   s.tip(m,`${p.period} · ${panel.name}=${fmt(value)} ${doc.unit}\nn=${stats.n}\nLCL ${fmt(panel.low)} · CL ${fmt(panel.center)} · UCL ${fmt(panel.high)}\n${p.rows.map(r=>`${r.sample}: ${r.value}`).join(' · ')}${outside?'\n'+t11('超出控制限','Outside control limits'):''}`);
  });s.clipReveal(g,f.left-6,f.top-7,f.right-f.left+12,f.bottom-f.top+14,j*.08,.75);
  label(s,f.left,f.top-11,`${panel.name} · ${doc.unit}${j?'':` · n=${stats.n}`}`,{'font-size':s.fs-2,fill:s.theme.fg},40);
 });
}
function lagplot(s,doc){
 const points=lagPairs11(doc),margin=s.compact?46:62,size=Math.min(s.w-margin-22,s.h-70),left=margin+(s.w-margin-22-size)/2,top=29,bottom=top+size,domain=s.linearDomain(doc.data.map(d=>d.value)),span=domain[1]-domain[0],expanded=[domain[0]-span*.08,domain[1]+span*.08],x=d3.scaleLinear(expanded,[left,left+size]),y=d3.scaleLinear(expanded,[bottom,top]);
 for(const value of x.ticks(4)){s.line(x(value),top,x(value),bottom,{'stroke-width':.5,'stroke-dasharray':'1 5'});num(s,x(value),bottom+16,fmt(value),{'text-anchor':'middle','font-size':s.fs-3});s.line(left,y(value),left+size,y(value),{'stroke-width':.5,'stroke-dasharray':'1 5'});num(s,left-7,y(value)+3,fmt(value),{'text-anchor':'end','font-size':s.fs-3});}
 s.line(left,bottom,left+size,top,{stroke:s.theme.secondary,'stroke-dasharray':'4 4','stroke-width':.8,'data-mark':'lag-equality'});
 points.forEach((p,j)=>{const mark=s.circle(x(p.x),y(p.y),s.compact?2.5:3.1,{fill:s.theme.objectColor(populationId('complete-native-signal',doc.data),markColor(s)),'fill-opacity':.3+.55*j/Math.max(1,points.length-1),stroke:s.theme.bg,'stroke-width':.6,'data-mark':'lag-pair','data-x':p.x,'data-y':p.y,'data-source-rows':JSON.stringify([p.i-doc.lag,p.i]),'data-record-ids':records([p.previous,p.row])});s.growCircle(mark,s.compact?2.5:3.1,j/points.length*.36,.46);s.edit(mark,p.row,'value');s.tip(mark,`${p.previous.period} → ${p.row.period}\nX: ${p.x} ${doc.unit}\nY: ${p.y} ${doc.unit}\n${t11('滞后','Lag')} ${doc.lag}`);});
 label(s,left,13,`Y: x[t] · ${doc.unit}`,{'font-size':s.fs-2},45);label(s,left+size,s.h-3,`X: x[t−${doc.lag}] · ${doc.unit}`,{'font-size':s.fs-2,'text-anchor':'end'},45);
}
function periodogram(s,doc){
 const signalColor=s.theme.objectColor(populationId('complete-native-signal',doc.data),markColor(s));
 const points=spectrum11(doc.data.map(d=>d.value),doc.sampleInterval),peak=points.reduce((a,b)=>b.power>a.power?b:a),f=frame(s,points.map(p=>p.power),{zero:true,top:43}),x=d3.scaleLinear([0,.5/doc.sampleInterval],[f.left,f.right]),g=s.group(),frequencyUnit=`1/${doc.timeUnit}`;
 x.ticks(s.compact?3:5).forEach(v=>num(s,x(v),f.bottom+17,fmt(v),{'text-anchor':'middle','font-size':s.fs-3}));
 const area=d3.area().x(p=>x(p.frequency)).y0(f.y(0)).y1(p=>f.y(p.power));s.path(area(points),{fill:signalColor,'fill-opacity':.1},g);
 s.path(d3.line().x(p=>x(p.frequency)).y(p=>f.y(p.power))(points),{stroke:signalColor,'stroke-width':1.25},g);
 points.forEach(p=>{const line=s.line(x(p.frequency),f.y(0),x(p.frequency),f.y(p.power),{stroke:signalColor,'stroke-width':p===peak?2:.65,'stroke-opacity':p===peak?1:.25,'data-mark':'spectrum-bin','data-frequency':p.frequency,'data-power':p.power},g);s.tip(line,`f=${fmt(p.frequency)} ${frequencyUnit}\nP=${fmt(p.power)} ${doc.unit}²\n${t11('周期','Period')}: ${fmt(1/p.frequency)} ${doc.timeUnit}\nk=${p.k}`);});
 const peakPoint=s.circle(x(peak.frequency),f.y(peak.power),3.1,{fill:signalColor,stroke:s.theme.bg,'stroke-width':1,'data-mark':'spectrum-peak'},g);s.tip(peakPoint,`${t11('最大频点功率','Peak bin power')}\nf=${fmt(peak.frequency)} ${frequencyUnit}\n${fmt(peak.power)} ${doc.unit}²`);
 s.clipReveal(g,f.left-5,f.top-7,f.right-f.left+10,f.bottom-f.top+14,0,.82);
 label(s,f.left,13,`${t11('每频点功率','Power per bin')} · ${doc.unit}²`,{'font-size':s.fs-2},44);label(s,f.left,29,`${t11('主峰周期','Peak period')} ${fmt(1/peak.frequency)} ${doc.timeUnit}`,{'font-size':s.fs-3,fill:signalColor},44);label(s,f.right,s.h-3,`${t11('频率','Frequency')} · ${frequencyUnit}`,{'text-anchor':'end','font-size':s.fs-3},40);
}
function forecastfan(s,doc){
 const split=doc.data.findIndex(d=>d.observed===null),history=doc.data.slice(0,split),forecast=doc.data.slice(split),all=doc.data.flatMap(d=>d.observed===null?[d.lower95,d.upper95]:[d.observed]),f=frame(s,all,{top:37}),x=timeline(s,doc.data,f),g=s.group(),col=markColor(s),boundary=(x(split-1)+x(split))/2;
 s.rect(boundary,f.top,f.right-boundary,f.bottom-f.top,{fill:col,'fill-opacity':.025});s.line(boundary,f.top,boundary,f.bottom,{stroke:s.theme.secondary,'stroke-width':.85,'stroke-dasharray':'2 4','data-mark':'forecast-boundary'});
 for(const [level,opacity]of[[95,.12],[80,.15],[50,.25]]){const area=d3.area().x((d,i)=>x(i+split)).y0(d=>f.y(d[`lower${level}`])).y1(d=>f.y(d[`upper${level}`]));s.path(area(forecast),{fill:col,'fill-opacity':opacity,'data-mark':`forecast-band-${level}`},g);}
 s.path(d3.line().x((d,i)=>x(i)).y(d=>f.y(d.observed))(history),{stroke:s.theme.fg,'stroke-width':1.65,'data-mark':'forecast-history'},g);
 s.path(d3.line().x((d,i)=>x(i+split)).y(d=>f.y(d.median))(forecast),{stroke:col,'stroke-width':1.6,'data-mark':'forecast-median'},g);
 history.forEach((d,i)=>{const m=s.circle(x(i),f.y(d.observed),2.4,{fill:s.theme.bg,stroke:s.theme.fg,'stroke-width':1,'data-mark':'forecast-observation','data-value':d.observed},g);s.edit(m,d,'observed');s.tip(m,`${d.period}\n${t11('历史观测','Observed')}: ${d.observed} ${doc.unit}`);});
 forecast.forEach((d,i)=>{
  for(const key of ['lower95','upper95','lower80','upper80','lower50','upper50','median']){const median=key==='median',m=s.circle(x(i+split),f.y(d[key]),median?2.5:1.6,{fill:col,'fill-opacity':median?1:.5,stroke:median?s.theme.bg:'none','stroke-width':.65,'data-mark':median?'forecast-estimate':'forecast-bound','data-field':key,'data-value':d[key]},g);s.edit(m,d,key);s.tip(m,`${d.period}\n${key}: ${d[key]} ${doc.unit}\n50%: ${d.lower50} – ${d.upper50}\n80%: ${d.lower80} – ${d.upper80}\n95%: ${d.lower95} – ${d.upper95}`);}
 });
 s.clipReveal(g,f.left-5,f.top-7,f.right-f.left+10,f.bottom-f.top+14,0,.86);
 const legend=[['50%',.48],['80%',.26],['95%',.12]],slot=s.compact?48:57;legend.forEach(([text,opacity],i)=>{s.rect(f.left+i*slot,6,11,7,{fill:col,'fill-opacity':opacity});label(s,f.left+i*slot+15,13,text,{'font-size':s.fs-3},8);});
 label(s,f.right,s.h-3,t11('中央预测区间 · 输入模型结果','Central prediction intervals · supplied model'),{'text-anchor':'end','font-size':s.fs-3},s.compact?34:58);
}
export const volume11Renderers={pcontrol:(s,d)=>attributeControl(s,d,true),ucontrol:(s,d)=>attributeControl(s,d,false),cusum,ewma,xbar,lagplot,periodogram,forecastfan};
