import {uiText,uiMarkup,uiMessage} from './locale.js';
import {recordId} from './data-identity.js';
import {scaleLinear} from 'd3';
import {rectPoints,circlePoints} from './morph.js';
import {blandAltman} from './volume8-data.js';
import {diagnosticFamily,diagnosticBounds,predictionStatistics,confusionStatistics} from './diagnostic-rules.js';
import {base,axis,glyph,dot,line,key,fmt,short,padded,compactNames} from './scientific-geometry.js';

export function layoutMethod(doc,view,w,h,{domain}={}){
  const ranked=view==='method-delta',pairs=view==='method-pairs',bland=view==='method-bland',rowView=ranked||pairs;
  const plot={x:rowView?76:58,y:60,w:w-(rowView?112:89),h:h-113},layout=base(doc,view,w,h,plot),bounds=domain||diagnosticBounds(doc),stats=blandAltman(doc.data);
  const x=scaleLinear(padded(ranked?bounds.error:bounds.measurement),[plot.x,plot.x+plot.w]).nice(4),y=scaleLinear(padded(bland?bounds.error:bounds.measurement),[plot.y+plot.h,plot.y]).nice(4);
  const [methodA,methodB]=doc.methodLabels,order=[...stats.points].sort((a,b)=>ranked?Math.abs(b.difference)-Math.abs(a.difference)||a.label.localeCompare(b.label):a.row-b.row),position=new Map(order.map((r,i)=>[r.label,plot.y+plot.h*(i+.5)/order.length]));
  axis(layout,x,true,{title:ranked?`A−B / ${doc.unit}`:pairs?uiMessage`测量值 / ${doc.unit}`:bland?`(A+B)/2 / ${doc.unit}`:`${methodA} / ${doc.unit}`});
  if(!rowView)axis(layout,y,false,{title:bland?`A−B / ${doc.unit}`:`${methodB} / ${doc.unit}`});
  if(!bland&&!rowView){const [lo,hi]=bounds.measurement;layout.guides.push({x1:x(lo),y1:y(lo),x2:x(hi),y2:y(hi),reference:true});}
  layout.heading=uiMessage`${doc.data.length} 对测量`;layout.details=ranked?uiText('按 |A−B| 降序 · 保留正负'):pairs?uiText('空心 A · 实心 B'):uiMessage`偏倚 ${fmt(stats.bias)} · SD ${fmt(stats.sd)}`;layout.statistics=stats;
  for(const [role,value,name]of [['bias',stats.bias,uiText('偏倚')],['lower',stats.lower,uiText('下界')],['upper',stats.upper,uiText('上界')]]){
    const anchor=[plot.x,y(value)],common={identity:key('method',role),index:0,transitionIndex:0,group:uiText('摘要')};
    line(layout,common,role,anchor,[plot.x+plot.w,y(value)],anchor,{opacity:bland?(role==='bias'?.65:.28):0,width:role==='bias'?1.4:.8,model:true,tooltip:`${name} ${fmt(value)} ${doc.unit}`});
    if(bland&&(stats.sd!==0||role==='bias'))layout.labels.push({x:plot.x+plot.w-3,y:y(value)-6,text:`${stats.sd===0?uiText('偏倚与上下界'):name} ${fmt(value)}`,anchor:'end',small:true});
  }
  const step=plot.h/doc.data.length;
  for(const r of stats.points){
    const py=position.get(r.label),p=ranked?[x(r.difference),py]:pairs?[x(r.b),py]:bland?[x(r.mean),y(r.difference)]:[x(r.a),y(r.b)],a=pairs?[x(r.a),py]:p;
    const common={identity:key('method',recordId(r)),index:r.row,transitionIndex:r.row,group:uiText('样本'),row:r.row},radius=w<500?2.6:3.4,tip=`${r.label} · ${methodA}: ${fmt(r.a)} · ${methodB}: ${fmt(r.b)} · A−B: ${fmt(r.difference)} ${doc.unit}`;
    const anchor=ranked?[x(0),py]:a;
    line(layout,common,'pair-line',pairs?a:anchor,p,anchor,{opacity:rowView?.42:0,width:1.2,tooltip:tip});
    dot(layout,common,'method-a',a,radius,{opacity:pairs?1:0,stroke:1.2,paper:true,editable:pairs?'a':undefined,value:r.a,tooltip:tip});
    dot(layout,common,'sample',p,radius,{opacity:.86,stroke:.7,editable:!ranked&&!bland?'b':undefined,value:ranked||bland?r.difference:r.b,tooltip:tip});
    if(rowView&&Math.round((py-plot.y)/step-.5)%Math.max(1,Math.ceil(9/step))===0)layout.labels.push({x:plot.x-9,y:py+3,text:short(r.label,9),fullText:r.label,anchor:'end',small:true,...(step<12?{fontSize:8}:{})});
  }
  return layout;
}

export function layoutPrediction(doc,view,w,h,{domain}={}){
  const ranked=view==='prediction-ranked',observed=view==='prediction-scatter',absolute=view==='prediction-absolute',plot={x:ranked?77:58,y:57,w:w-(ranked?111:88),h:h-109},layout=base(doc,view,w,h,plot),bounds=domain||diagnosticBounds(doc),stats=predictionStatistics(doc.data);
  const x=scaleLinear(padded(ranked?bounds.error:bounds.measurement),[plot.x,plot.x+plot.w]).nice(4),y=scaleLinear(absolute?[0,bounds.absolute[1]*1.08||1]:padded(observed?bounds.measurement:bounds.error),[plot.y+plot.h,plot.y]).nice(4);
  const ordered=[...stats.points].sort((a,b)=>b.absolute-a.absolute||a.label.localeCompare(b.label)),positions=new Map(ordered.map((r,i)=>[r.label,plot.y+plot.h*(i+.5)/ordered.length]));
  axis(layout,x,true,{title:ranked?uiMessage`观测−预测 / ${doc.unit}`:uiMessage`预测值 / ${doc.unit}`});if(!ranked)axis(layout,y,false,{title:`${observed?uiText('观测值'):absolute?uiText('绝对误差'):uiText('观测−预测')} / ${doc.unit}`});
  if(observed){const [lo,hi]=bounds.measurement;layout.guides.push({x1:x(lo),y1:y(lo),x2:x(hi),y2:y(hi),reference:true});}
  layout.heading=uiMessage`${doc.data.length} 条预测记录`;layout.details=`MAE ${fmt(stats.mae)} · RMSE ${fmt(stats.rmse)} ${doc.unit}`;layout.statistics=stats;
  for(const r of stats.points){
    const value=observed?r.observed:absolute?r.absolute:r.error,p=ranked?[x(r.error),positions.get(r.label)]:[x(r.predicted),y(value)],anchor=ranked?[x(0),p[1]]:[p[0],observed?p[1]:y(0)],common={identity:key('prediction',recordId(r)),index:r.row,transitionIndex:r.row,row:r.row,group:uiText('样本')};
    const tip=uiMessage`${r.label} · 观测 ${fmt(r.observed)} · 预测 ${fmt(r.predicted)} · 残差 ${fmt(r.error)} ${doc.unit}`,max=r.label===ordered[0].label;
    line(layout,common,'error-stem',anchor,p,anchor,{opacity:observed?0:ranked?.4:.13,width:1,tooltip:tip});
    dot(layout,common,'sample',p,w<500?2.5:3.25,{opacity:.8,stroke:.55,accent:max,editable:observed?'observed':undefined,value,tooltip:tip});
    const rowHeight=plot.h/doc.data.length;
    if(ranked&&Math.round((p[1]-plot.y)/rowHeight-.5)%Math.max(1,Math.ceil(9/rowHeight))===0)layout.labels.push({x:plot.x-9,y:p[1]+3,text:short(r.label,9),fullText:r.label,anchor:'end',small:true,...(rowHeight<12?{fontSize:8}:{})});
  }
  return layout;
}

export function layoutConfusion(doc,view,w,h,{domain}={}){
  const stats=confusionStatistics(doc.data),names=stats.categories,n=names.length,stacked=['confusion-rows','confusion-columns'].includes(view),columns=view==='confusion-columns',bubbles=view==='confusion-bubbles';
  const compact=h<240,size=Math.min(w-113,h-(compact?85:135)),plot=stacked?{x:78,y:compact?58:77,w:w-116,h:h-(compact?88:145)}:{x:(w-size)/2+14,y:compact?54:66,w:size,h:size},layout=base(doc,view,w,h,plot),maximum=(domain||diagnosticBounds(doc)).count[1]||1;
  layout.statistics=stats;layout.total=stats.total;layout.heading=uiMessage`${n} 类 · ${fmt(stats.total)} 个样本`;layout.details=stacked?(columns?uiText('分母 = 预测类别总数'):uiText('分母 = 真实类别总数')):uiMessage`行：真实 · 列：预测 · ${bubbles?uiText('圆面积'):uiText('色深')} = 计数`;
  layout.header={x:40,w:w-80};
  if(stacked){layout.groups=names;layout.groupLabels=names.map(name=>compact?name:`${columns?uiText('真实'):uiText('预测')} ${name}`);}
  const cell=plot.w/n,band=stacked?plot.h/n:cell,barHeight=Math.min(42,band*.58),labels=compactNames(names,Math.max(2,Math.min(10,Math.floor((stacked?plot.x-18:cell)/8))));
  if(stacked){
    for(const p of [0,25,50,75,100]){const at=plot.x+plot.w*p/100;layout.guides.push({x1:at,x2:at,y1:plot.y,y2:plot.y+plot.h,major:p===0});layout.labels.push({x:at,y:plot.y+plot.h+18,text:`${p}%`,anchor:'middle',small:true});}
    layout.labels.push({x:plot.x,y:plot.y-10,text:compact?uiMessage`${columns?uiText('预测类别'):uiText('真实类别')} · 颜色 = ${columns?uiText('真实'):uiText('预测')}`:columns?uiText('预测类别'):uiText('真实类别'),small:true});
  }else{
    layout.labels.push({x:plot.x+plot.w/2,y:plot.y-31,text:uiText('预测类别'),anchor:'middle',fontSize:10},{x:plot.x-8,y:plot.y-14,text:uiText('真实'),anchor:'end',fontSize:10});
    for(let i=0;i<n;i++)layout.labels.push({x:plot.x+cell*(i+.5),y:plot.y-13,text:labels[i],fullText:names[i],anchor:'middle',small:true});
  }
  for(let i=0;i<n;i++){
    const py=plot.y+band*(i+.5);layout.labels.push({x:plot.x-10,y:py+3,text:labels[i],fullText:names[i],anchor:'end',small:true});
    if(stacked&&columns&&stats.predicted.get(names[i])===0)layout.labels.push({x:plot.x+10,y:py+3,text:uiText('无预测样本'),small:true});
  }
  // Sorting geometry by category names, not input row order, keeps each
  // (actual,predicted) cell on the same route when tables are reordered.
  const cells=new Map(stats.cells.map(r=>[key(r.actual,r.predicted),r]));
  for(let i=0;i<n;i++){let offset=0;for(let j=0;j<n;j++){
    const r=cells.get(key(columns?names[j]:names[i],columns?names[i]:names[j])),share=columns?r.columnShare:r.rowShare;
    const cx=plot.x+cell*(j+.5),cy=plot.y+band*(i+.5),width=stacked?plot.w*(share||0):cell-3,height=stacked?barHeight:cell-3;
    const px=stacked?plot.x+offset+width/2:cx,py=cy,anchor=stacked?[plot.x+offset,py]:[px,py];
    const points=stacked?rectPoints(px-width/2,py-height/2,width,height):bubbles?circlePoints(px,py,cell*.41*Math.sqrt(r.count/maximum)):rectPoints(px-width/2,py-height/2,width,height);
    const group=stacked?(columns?r.actual:r.predicted):uiText('计数'),tone=r.count/maximum,common={identity:key('confusion',r.actual,r.predicted),index:r.row,transitionIndex:r.row,row:r.row,group};
    const tooltip=uiMessage`真实 ${r.actual} → 预测 ${r.predicted} · ${fmt(r.count)} 个样本${stacked?share===null?uiText(' · 无预测样本'):` · ${(share*100).toFixed(2)}% / ${columns?uiText('该预测类别'):uiText('该真实类别')}`:''}`;
    glyph(layout,common,'count-cell',points,anchor,{opacity:stacked?(r.count?1:0):1,stroke:stacked?.7:bubbles?.65:.45,...(!stacked?{tone,bubbles,solidTone:bubbles}:{}),value:r.count,quantity:stacked?columns?'column-proportion':'row-proportion':'count',entrance:stacked?rectPoints(plot.x+offset,py-height/2,0,height):points.map(()=>[px,py]),editable:'count',tooltip});
    if(stacked){if(width>=38)layout.labels.push({x:px,y:py+3,text:`${Math.round((share||0)*100)}%`,anchor:'middle',fontSize:10,dataLabel:true,contrastMark:{group}});}
    else {const tiny=bubbles&&r.count>0&&cell*.41*Math.sqrt(r.count/maximum)<10;layout.labels.push({x:px,y:tiny?py+cell*.41*Math.sqrt(r.count/maximum)+11:py+3,text:fmt(r.count),anchor:'middle',fontSize:cell<42?8:11,dataLabel:true,...(!bubbles?{toneText:true,tone}:r.count&&!tiny?{contrastMark:{tone,solidTone:true}}:{})});}
    if(stacked)offset+=width;
  }}
  layout.labels.push({x:plot.x,y:h-7,text:stacked?uiText('计数保留 · 百分比由当前分母计算'):bubbles?uiMessage`圆面积对应计数 · 最大 ${fmt(maximum)}`:uiMessage`色深对应计数 · 0–${fmt(maximum)}`,fontSize:9});
  return layout;
}
export function layoutDiagnostic(doc,view,w=800,h=440,options={}){return diagnosticFamily(view)==='method'?layoutMethod(doc,view,w,h,options):diagnosticFamily(view)==='prediction'?layoutPrediction(doc,view,w,h,options):layoutConfusion(doc,view,w,h,options);}
