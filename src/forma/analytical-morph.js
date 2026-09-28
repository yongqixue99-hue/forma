import {uiText,uiMarkup,uiMessage} from './locale.js';
import {recordId} from './data-identity.js';
import {entityKey} from './entity-identity.js';
import {formatDecimal} from './number-format.js';
import {scaleLinear,extent} from 'd3';
import {rectPoints,circlePoints} from './morph.js';
import {empiricalDistribution} from './atlas-data.js';
import {classificationCurve,calibrationBins} from './volume8-data.js';
import {pearsonMatrix} from './volume4-data.js';
import {analyticalFamily,fixedBins} from './analytical-rules.js';
import {key,fmt,compactNames,padded,base,axis,glyph,dot,line,pointMix} from './scientific-geometry.js';

function probabilityAxis(layout,scale,horizontal,title){
  axis(layout,scale,horizontal,{title});
  const labels=layout.labels.filter(l=>horizontal?l.y===layout.plot.y+layout.plot.h+17:l.x===layout.plot.x-8);
  labels.forEach(l=>{const v=scale.invert(horizontal?l.x:l.y-3);l.text=`${Math.round(v*100)}%`;});
}

export function layoutUnivariate(doc,view,w=800,h=440,{domain}={}){
  const cumulative=view==='uni-cumulative',ecdf=view==='uni-ecdf',polygon=view==='uni-frequency',plot={x:56,y:49,w:w-86,h:h-110},layout=base(doc,view,w,h,plot);
  const histogram=fixedBins(doc.data,doc.binCount,domain?.value),distribution=empiricalDistribution(doc.data.map(r=>r.value)),bottom=plot.y+plot.h;
  const x=scaleLinear(padded(histogram.domain),[plot.x,plot.x+plot.w]),y=(cumulative||ecdf?scaleLinear([0,1],[bottom,plot.y]):scaleLinear([0,domain?.count?.[1]||Math.max(...histogram.bins.map(b=>b.count))],[bottom,plot.y]).nice(4));
  axis(layout,x,true,{title:doc.unit});if(cumulative||ecdf)probabilityAxis(layout,y,false,uiText('累计样本占比'));else axis(layout,y,false,{title:uiText('样本数')});
  layout.heading=uiMessage`${doc.data.length} 个原始观测`;layout.details=ecdf?uiText('精确台阶 · 同值共同跳升'):uiMessage`${doc.binCount} 个等宽箱 · ${cumulative?uiText('按箱上界累计'):uiText('每箱频数')}`;
  layout.histogram=histogram;layout.distribution=distribution;layout.scales={x,y};
  const peak=histogram.bins.reduce((best,b)=>b.count>best.count?b:best,histogram.bins[0]).index;
  const probabilities=new Map(distribution.map(p=>[p.value,p.probability]));
  // A raw sample is never keyed as a bin. The rug preserves its x coordinate
  // while the ECDF moves each observation to its actual cumulative proportion.
  doc.data.forEach((r,index)=>{
    const p=[x(r.value),ecdf?y(probabilities.get(r.value)):bottom+7],anchor=[x(r.value),bottom+7];
    glyph(layout,{identity:key('observation',recordId(r)),index,transitionIndex:index,group:uiText('分布'),row:r.row},'observation',ecdf?circlePoints(...p,w<500?1.25:1.7):rectPoints(p[0]-.4,p[1],.8,3),anchor,{opacity:ecdf?.2:.32,editable:'value',value:r.value,tooltip:`${r.label} · ${fmt(r.value)} ${doc.unit}${ecdf?uiMessage` · 累计 ${fmt(probabilities.get(r.value)*100)}%`:''}`});
  });
  histogram.bins.forEach((b,index)=>{
    const center=x((b.low+b.high)/2),value=cumulative?b.probability:b.count,p=[center,y(value)],anchor=[center,bottom],common={identity:key('bin',b.low,b.high),index,transitionIndex:index,group:uiText('分布')};
    const bx=x(b.low)+.7,bw=Math.max(.5,x(b.high)-x(b.low)-1.4),shape=polygon?circlePoints(...p,3):rectPoints(bx,y(value),bw,bottom-y(value)),tip=uiMessage`[${fmt(b.low)}, ${fmt(b.high)}${index===histogram.bins.length-1?']':')'} ${doc.unit} · ${b.count} 个样本${cumulative?uiMessage` · 累计 ${b.cumulative}/${doc.data.length}（${fmt(b.probability*100)}%）`:''}`;
    glyph(layout,common,'bin',shape,anchor,{opacity:ecdf?0:polygon?.88:.78,quantity:cumulative?'cumulative':'frequency',accent:index===peak,derived:true,entrance:shape.map(([px])=>[px,bottom]),value,tooltip:tip});
    const previous=histogram.bins[index-1],a=previous?[x((previous.low+previous.high)/2),y(cumulative?previous.probability:previous.count)]:p;
    line(layout,common,'frequency-link',a,p,p,{opacity:polygon&&index>0?.85:0,width:1.6,derived:true,tooltip:tip});
    if(!ecdf&&!polygon&&w>=650&&doc.binCount<=16)layout.labels.push({x:center,y:p[1]-7,text:cumulative?`${Math.round(value*100)}%`:String(b.count),anchor:'middle',fontSize:9,dataLabel:true});
  });
  distribution.forEach((p,index)=>{
    const previous=distribution[index-1],before=previous?.probability||0,a=[x(previous?.value??x.domain()[0]),y(before)],b=[x(p.value),y(before)],c=[x(p.value),y(p.probability)],anchor=[x(p.value),bottom],common={identity:key('ecdf',p.value),index,transitionIndex:index,group:uiText('分布')};
    for(const [role,start,end]of [['ecdf-run',a,b],['ecdf-rise',b,c]])line(layout,common,role,start,end,anchor,{opacity:ecdf?.88:0,width:1.4,derived:true,tooltip:uiMessage`不超过 ${fmt(p.value)} ${doc.unit} · ${p.count}/${doc.data.length}（${fmt(p.probability*100)}%）`});
  });
  const last=distribution.at(-1),end=[x(last.value),y(1)];line(layout,{identity:'ecdf-tail',group:uiText('分布'),index:0},'ecdf-tail',end,[plot.x+plot.w,y(1)],end,{opacity:ecdf?.88:0,derived:true});
  return layout;
}

export function layoutEvaluation(doc,view,w=800,h=440,{domain}={}){
  const observed=[...new Set(doc.data.map(r=>entityKey(r,'model')))],models=doc.entities?.items.filter(e=>observed.includes(e.id)).map(e=>e.id)||observed;
  // Bare layout fixtures may lack the persisted registry; production documents
  // are migrated before rendering and use their explicit entity references.
  if(models.length!==observed.length)models.splice(0,models.length,...observed);
  const ks=view==='eval-ks',gains=view==='eval-gains',lift=view==='eval-lift',ranking=gains||lift,pr=view==='eval-pr',threshold=view==='eval-threshold',calibration=view==='eval-calibration',plot={x:57,y:76,w:w-87,h:h-129},layout=base(doc,view,w,h,plot),bottom=plot.y+plot.h;
  // Sweep from strict to permissive, matching ROC/PR's threshold order.
  // The scale still contains raw scores; ticks explicitly show the descending axis.
  const scoreDomain=domain?.score||(doc.probability?[0,1]:extent(doc.data,r=>r.score)),score=scaleLinear(scoreDomain[0]===scoreDomain[1]?padded(scoreDomain):scoreDomain,[plot.x+plot.w,plot.x]),x=ks?scaleLinear(score.domain(),[plot.x,plot.x+plot.w]):threshold?score:scaleLinear([0,1],[plot.x,plot.x+plot.w]),y=scaleLinear(lift?(domain?.lift||[0,Math.max(...models.map(id=>{const rows=doc.data.filter(r=>entityKey(r,'model')===id);return rows.length/rows.filter(r=>r.actual===1).length;}))]):[0,1],[bottom,plot.y]);
  if(ks)axis(layout,x,true,{title:uiText('预测得分 · 包含同分样本')});else if(threshold)axis(layout,x,true,{title:uiText('得分阈值 ≥ t · 高 → 低（严格 → 宽松）')});else probabilityAxis(layout,x,true,ranking?uiText('已筛选样本占比'):calibration?uiText('箱内平均预测概率'):pr?uiText('召回率 Recall'):uiText('假阳性率 FPR'));
  if(lift)axis(layout,y,false,{title:uiText('提升倍数')});else probabilityAxis(layout,y,false,ks?uiText('真实类别内累计比例'):gains?uiText('已覆盖正类占比'):calibration?uiText('实际正类比例'):pr?uiText('精确率 Precision'):threshold?uiText('检出率 TPR / 误报率 FPR'):uiText('真阳性率 TPR'));
  layout.heading=calibration?uiMessage`${doc.bins} 个等宽概率箱`:uiMessage`${doc.positiveLabel} · 阈值共同处理同分样本`;
  layout.details=ks?uiText('实线：实际 1 · 浅线空心点：实际 0 · D 为描述性距离'):lift?uiText('提升 = 覆盖正类比例 ÷ 筛选比例 · 零筛选未定义'):gains?uiText('同分整体进入 · 对角线为随机筛选基准'):threshold?uiText('实线 TPR · 浅线空心点 FPR'):calibration?uiText('空箱保留断点 · n 见提示'):pr?uiText('基准为正类比例 · AP 按召回增量加权'):uiText('AUC 为 ROC 梯形积分');
  layout.groups=models;layout.groupLabels=[];layout.evaluations=[];layout.scales={x,y,score};
  models.forEach((modelId,mi)=>{
    const rows=doc.data.filter(r=>entityKey(r,'model')===modelId),model=rows[0].model,curve=classificationCurve(rows),cal=doc.probability?calibrationBins(rows,doc.bins):Array(doc.bins).fill(null);
    // The KS CDF is P(score <= t). Complementing this threshold's TPR/FPR
    // would incorrectly exclude ties; complement the preceding strict boundary.
    const cdfs=curve.points.map((p,i)=>({...p,f1:1-(curve.points[i-1]?.tpr||0),f0:1-(curve.points[i-1]?.fpr||0)})),byThreshold=new Map(cdfs.map(p=>[p.threshold,p])),maximum=cdfs.slice(1).reduce((a,b)=>Math.abs(b.f0-b.f1)>Math.abs(a.f0-a.f1)?b:a),distance=Math.abs(maximum.f0-maximum.f1);
    layout.evaluations.push({model,modelId,...curve,bins:cal,ks:{points:cdfs.slice(1),maximum,distance}});
    layout.groupLabels.push(ks?`${model} · D ${formatDecimal(distance,3)}`:calibration||threshold||ranking?model:`${model} · ${pr?'AP':'AUC'} ${formatDecimal((pr?curve.ap:curve.auc),3)}`);
    const fraction=p=>(p.tp+p.fp)/curve.n,relativeLift=p=>fraction(p)>0?p.tpr/fraction(p):null;
    const position=p=>ks?[x(p.threshold===null?score.domain()[1]:p.threshold),y(byThreshold.get(p.threshold).f1)]:ranking?[x(fraction(p)),y(lift?(relativeLift(p)??0):p.tpr)]:threshold?[x(p.threshold===null?score.domain()[1]:p.threshold),y(p.tpr)]:[x(pr?p.recall:p.fpr),y(pr?p.precision:p.tpr)];
    curve.points.forEach((p,index)=>{
      const at=position(p),previous=curve.points[index-1],a=previous?position(previous):at,b=pr||ks?[a[0],at[1]]:threshold?[at[0],a[1]]:pointMix(a,at,.5),anchor=[score(p.threshold===null?score.domain()[1]:p.threshold),bottom];
      const common={identity:key('threshold',modelId,p.threshold),group:model,colorIdentity:modelId,index,transitionIndex:index},tip=ks?`${model} · score ≤ ${p.threshold===null?fmt(score.domain()[1]):fmt(p.threshold)} · F1 ${fmt(byThreshold.get(p.threshold).f1*100)}% · F0 ${fmt(byThreshold.get(p.threshold).f0*100)}% · D=${fmt(distance)}`:`${model} · ${p.threshold===null?uiText('尚无预测正类；精确率未定义（绘图端点）'):uiMessage`得分 ≥ ${fmt(p.threshold)}`} · TPR ${fmt(p.tpr*100)}% · FPR ${fmt(p.fpr*100)}% · Precision ${p.threshold===null?uiText('未定义'):`${fmt(p.precision*100)}%`} · n=${curve.n}${ranking?uiMessage` · 已筛选 ${fmt(fraction(p)*100)}% · 覆盖正类 ${fmt(p.tpr*100)}% · 提升 ${relativeLift(p)===null?uiText('未定义'):fmt(relativeLift(p))}`:''}`;
      // On the threshold axis rates are step functions: hold the previous
      // rate until the next observed score, then include all tied predictions.
      const validLink=index>(lift?1:0),opacity=!calibration&&validLink?.9:0;
      line(layout,common,'threshold-run-a',a,b,anchor,{opacity,width:1.6,derived:true,tooltip:tip});line(layout,common,'threshold-run-b',b,at,anchor,{opacity,width:1.6,derived:true,tooltip:tip});
      dot(layout,common,'threshold-point',at,index===0?0:2,{opacity:!calibration&&index>0?.65:0,entrance:Array.from({length:128},()=>anchor),tooltip:tip,derived:true,recordIds:rows.map(recordId)});
      const f=ks?[at[0],y(byThreshold.get(p.threshold).f0)]:[score(p.threshold===null?score.domain()[1]:p.threshold),y(p.fpr)],prevF=previous?(ks?[a[0],y(byThreshold.get(previous.threshold).f0)]:[score(previous.threshold===null?score.domain()[1]:previous.threshold),y(previous.fpr)]):f;
      const elbow=ks?[prevF[0],f[1]]:[f[0],prevF[1]];line(layout,common,'false-positive-run',prevF,elbow,anchor,{opacity:(threshold||ks)&&index>0?.38:0,width:1.2,derived:true,tooltip:tip});
      line(layout,common,'false-positive-rise',elbow,f,anchor,{opacity:(threshold||ks)&&index>0?.38:0,width:1.2,derived:true,tooltip:tip});
      dot(layout,common,'false-positive-point',f,2.3,{opacity:(threshold||ks)&&index>0?.7:0,stroke:.8,paper:true,derived:true,tooltip:tip,entrance:Array.from({length:128},()=>anchor)});
    });
    const gapAt=ks?x(maximum.threshold):score(maximum.threshold),gapAnchor=[gapAt,bottom];
    line(layout,{identity:key('ks-gap',modelId),group:model,colorIdentity:modelId,index:0},'ks-gap',[gapAt,y(maximum.f0)],[gapAt,y(maximum.f1)],gapAnchor,{opacity:ks?.9:0,width:2.4,derived:true,tooltip:`${model} · D=${fmt(distance)} · score ≤ ${fmt(maximum.threshold)}`,recordIds:rows.map(recordId)});
    {
      const last=cdfs.at(-1),at=ks?x(last.threshold):score(last.threshold),common={identity:key('ks-tail',modelId),group:model,colorIdentity:modelId,index:0};
      for(const [role,rate] of [['positive',last.f1],['negative',last.f0]]){
        line(layout,common,`${role}-drop`,[at,y(rate)],[at,bottom],[at,bottom],{opacity:ks?(role==='positive'?.9:.38):0,width:1.4,derived:true});
        line(layout,common,`${role}-tail`,[at,bottom],[plot.x,bottom],[at,bottom],{opacity:ks?(role==='positive'?.9:.38):0,width:1.4,derived:true});
      }
    }
    {const last=curve.points.at(-1),a=[score(last.threshold),y(1)],b=[plot.x+plot.w,y(1)];line(layout,{identity:key('threshold-tail',modelId),group:model,colorIdentity:modelId,index:0},'threshold-tail',a,b,b,{opacity:threshold?.85:0,width:1.6,derived:true});}
    cal.forEach((b,index)=>{
      const p=b?[x(b.probability),y(b.frequency)]:[x((index+.5)/doc.bins),bottom],anchor=[p[0],bottom],common={identity:key('probability-bin',modelId,index,doc.bins),group:model,colorIdentity:modelId,index,transitionIndex:index},previous=cal[index-1],a=previous?[x(previous.probability),y(previous.frequency)]:p;
      const tip=b?uiMessage`${model} · 概率 [${fmt(b.lower)}, ${fmt(b.upper)}${index===doc.bins-1?']':')'} · n=${b.n} · 平均预测 ${fmt(b.probability*100)}% · 实际正类 ${fmt(b.frequency*100)}%`:uiText('空概率箱');
      line(layout,common,'calibration-link',a,p,anchor,{opacity:calibration&&b&&previous?.84:0,width:1.4,derived:true,tooltip:tip});
      dot(layout,common,'calibration-bin',p,b?3.6:0,{opacity:calibration&&b?1:0,stroke:.9,paper:mi%2===1,derived:true,tooltip:tip,entrance:Array.from({length:128},()=>anchor),recordIds:rows.filter(r=>Math.min(doc.bins-1,Math.floor(r.score*doc.bins))===index).map(recordId)});
      if(calibration&&b&&models.length===1&&w>=580)layout.labels.push({x:p[0]+7,y:p[1]-8,text:`n=${b.n}`,fontSize:9,dataLabel:true});
    });
    if(mi===0&&pr)layout.guides.push({x1:plot.x,x2:plot.x+plot.w,y1:y(curve.prevalence),y2:y(curve.prevalence),major:true,reference:true});
  });
  if(lift)layout.guides.push({x1:plot.x,x2:plot.x+plot.w,y1:y(1),y2:y(1),major:true,reference:true});
  if(!ks&&!threshold&&!pr&&!lift)layout.guides.push({x1:x(0),y1:y(0),x2:x(1),y2:y(1),major:true,reference:true});
  return layout;
}

export function layoutCorrelation(doc,view,w=800,h=440){
  const order=new Map((doc.entities?.items||[]).map((e,i)=>[e.id,i])),namesById=new Map(doc.data.map(r=>[entityKey(r,'variable'),r.variable]));
  const matrix=pearsonMatrix(doc.data.map(r=>({...r,variable:entityKey(r,'variable')})).sort((a,b)=>(order.get(a.variable)??0)-(order.get(b.variable)??0))),variableIds=matrix.variables,variables=variableIds.map(id=>namesById.get(id)),n=variables.length,pairs=view==='corr-pairs',triangle=view==='corr-triangle',bubbles=view==='corr-bubbles';
  matrix.variables=variables;matrix.matrix=matrix.matrix.map(row=>row.map(e=>({...e,row:namesById.get(e.row),column:namesById.get(e.column)})));
  const plot={x:pairs?(w>=650?146:96):(w>=650?112:74),y:43,w:w-(pairs?(w>=650?215:142):(w>=650?175:106)),h:h-94},layout=base(doc,view,w,h,plot),side=Math.min(plot.w,plot.h),left=plot.x+(plot.w-side)/2,cell=side/n;
  layout.heading=uiMessage`${matrix.samples.length} 个完整样本 · Pearson r`;layout.details=pairs?uiText('按 |r| 排序 · 每对变量一次'):uiText('固定色标 −1 → +1 · 相关不代表因果');layout.matrix=matrix;layout.divergingLegend=true;
  const names=compactNames(variables,w>=650?9:5),x=scaleLinear([-1,1],[plot.x,plot.x+plot.w]);
  const uniquePairs=[];for(let i=0;i<n;i++)for(let j=0;j<i;j++)uniquePairs.push({...matrix.matrix[i][j],i,j,id:key(...[variableIds[i],variableIds[j]].sort())});
  uniquePairs.sort((a,b)=>((b.coefficient===null?-Infinity:Math.abs(b.coefficient))-(a.coefficient===null?-Infinity:Math.abs(a.coefficient)))||a.id.localeCompare(b.id));
  // Undefined values follow the defined pairs and keep a visible labelled slot.
  uniquePairs.sort((a,b)=>Number(a.coefficient===null)-Number(b.coefficient===null));
  if(pairs)axis(layout,x,true,{});
  else for(let i=0;i<n;i++){
    layout.labels.push({x:left-10,y:plot.y+(i+.5)*cell+3,text:names[i],fullText:variables[i],anchor:'end',fontSize:10});
    layout.labels.push({x:left+(i+.5)*cell,y:plot.y+side+18,text:names[i],fullText:variables[i],anchor:'middle',fontSize:10});
  }
  const addCell=(entry,role,row,column)=>{
    const r=entry.coefficient,defined=r!==null,index=uniquePairs.findIndex(p=>p.id===entry.id),rank=index<0?0:index,cx=left+(column+.5)*cell,cy=plot.y+(row+.5)*cell,shown=!pairs||role==='pair',inTriangle=role!=='mirror',opacity=shown&&(!triangle||inTriangle)?1:0;
    const position=pairs&&role==='pair'?[x(r??0),plot.y+(rank+.5)*plot.h/uniquePairs.length]:[cx,cy],anchor=pairs?[x(0),position[1]]:position;
    const radius=defined?cell*.41*Math.sqrt(Math.abs(r)):0,shape=pairs&&role==='pair'?rectPoints(Math.min(x(0),x(r??0)),position[1]-Math.min(5,plot.h/uniquePairs.length*.17),Math.abs(x(r??0)-x(0)),Math.min(10,plot.h/uniquePairs.length*.34)):bubbles?circlePoints(...position,radius):rectPoints(cx-cell/2+1.2,cy-cell/2+1.2,cell-2.4,cell-2.4);
    const common={identity:key('correlation',entry.id),group:uiText('相关系数'),recordLabel:row===column?uiMessage`${entry.row} · 变量自相关`:uiMessage`${entry.row} × ${entry.column} · 相关系数`,index:Math.max(0,index),transitionIndex:Math.max(0,index),recordIds:doc.data.filter(r=>[variableIds[row],variableIds[column]].includes(entityKey(r,'variable'))).map(recordId)},tooltip=`${entry.row} × ${entry.column} · ${defined?`Pearson r=${formatDecimal(r,4)}`:uiText('未定义（至少一个变量为常量）')} · n=${entry.n}`;
    glyph(layout,common,role,shape,anchor,{opacity,stroke:bubbles?.6:defined?.35:.7,paper:!defined,tone:r,solidTone:bubbles||pairs,derived:true,tooltip,value:r??0,entrance:shape.map(()=>anchor)});
    if(!defined)for(const [suffix,a,b]of [['null-a',[-4,-4],[4,4]],['null-b',[-4,4],[4,-4]]])line(layout,common,`${role}-${suffix}`,[position[0]+a[0],position[1]+a[1]],[position[0]+b[0],position[1]+b[1]],position,{opacity:opacity*.55,width:.8,tooltip});
    if(!opacity)return;
    if(pairs){
      const full=`${entry.row} × ${entry.column}`,pairName=compactNames(uniquePairs.map(p=>`${p.row} × ${p.column}`),w>=650?17:8)[rank];
      layout.labels.push({x:plot.x-10,y:position[1]+3,text:pairName,fullText:full,anchor:'end',fontSize:10},{x:plot.x+plot.w+9,y:position[1]+3,text:defined?formatDecimal(r,2):uiText('未定义'),fontSize:9,dataLabel:true});
    }else if(!bubbles&&cell>=26)layout.labels.push({x:position[0],y:position[1]+3,text:defined?formatDecimal(r,2):'—',anchor:'middle',fontSize:cell<30?8:cell<47?9:11,dataLabel:true,toneText:defined});
    else if(bubbles&&defined&&r===0)layout.labels.push({x:position[0],y:position[1]+3,text:'0',anchor:'middle',fontSize:9,dataLabel:true});
  };
  for(const p of uniquePairs){addCell(p,'pair',p.i,p.j);addCell(p,'mirror',p.j,p.i);}
  for(let i=0;i<n;i++)addCell({...matrix.matrix[i][i],id:key(variableIds[i])},'diagonal',i,i);
  layout.pairs=uniquePairs;layout.scales={x};return layout;
}
export function layoutAnalytical(doc,view,w,h,options){return ({univariate:layoutUnivariate,evaluation:layoutEvaluation,correlation:layoutCorrelation}[analyticalFamily(view)])(doc,view,w,h,options);}
