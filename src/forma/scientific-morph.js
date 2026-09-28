import {layoutDistribution} from './distribution-morph.js';
import {isDistributionView} from './distribution-rules.js';
import {layoutFrequency} from './frequency-morph.js';
import {isFrequencyView} from './frequency-rules.js';
import {SpatialMorphLayer,mixSpatialPose} from './spatial-morph-geometry.js';
import {labelInk} from './chart-readability.js';
import {chartTextWidth} from './text-wrap.js';
import {layoutSerial,interpolateSerialMark} from './serial-morph.js';
import {isSerialView} from './serial-rules.js';
import {layoutProcess,interpolateProcessMark,processMarkOpacity} from './process-morph.js';
import {isProcessView} from './process-rules.js';
import {layoutMultivariate} from './multivariate-morph.js';
import {isMultivariateView} from './multivariate-rules.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {layoutDiagnostic} from './diagnostic-morph.js';
import {isDiagnosticView} from './diagnostic-rules.js';
import {scaleLinear,scaleLog,extent,interpolateRgb,color as parseColor} from 'd3';
import {MorphChart,circlePoints,rectPoints,polygonPoints} from './morph.js';
import {boxStatistics,packSwarm} from './editorial-data.js';
import {violinDensity} from './volume4-data.js';
import {groupStats,linearFit} from './volume8-data.js';
import {scientificViews,scientificFamily,scientificEligibility,scientificBounds} from './scientific-rules.js';

import {clamp,mix,pointMix,key,short,fmt,hash,compactNames,padded,base,axis,glyph,dot,line,compactContour,interpolateDensityContour} from './scientific-geometry.js';
import {layoutAnalytical} from './analytical-morph.js';
import {isAnalyticalView} from './analytical-rules.js';
import {isExploratoryView} from './exploratory-rules.js';
import {layoutExploratory,interpolateMatrixCell} from './exploratory-morph.js';
import {resolveBoundColor,valueColorFor} from './color-semantics.js';

export function layoutObservations(doc,view,w=800,h=440,{domain}={}){
  const plot={x:55,y:62,w:w-82,h:h-112},layout=base(doc,view,w,h,plot),bounds=domain||scientificBounds(doc,view);
  const x=scaleLinear(padded(bounds.x),[plot.x,plot.x+plot.w]).nice(4),y=scaleLinear(padded(bounds.y),[plot.y+plot.h,plot.y]).nice(4),bubble=view==='obs-bubble',fitView=['obs-regression','obs-confidence'].includes(view);
  axis(layout,x,true,{title:doc.axes.x});axis(layout,y,false,{title:doc.axes.y});
  layout.heading=uiMessage`${doc.data.length} 个对象`;layout.details=bubble?uiText('圆面积 = 实际规模'):view==='obs-confidence'?uiText('均值响应 · 点态 95% CI'):view==='obs-regression'?uiText('一元 OLS · 保留原始点'):uiText('等大点 · 原始坐标');
  const groups=[...new Set(doc.data.map(r=>r.group))],maximum=Math.max(...doc.data.map(r=>r.size||1)),maxR=Math.min(21,w*.04);
  // Fit glyphs are distinct from observation glyphs: no sample is replaced by
  // a synthetic point on the fitted line, including during reverse seeking.
  if(scientificEligibility(doc,'obs-confidence').valid){
    const fit=linearFit(doc.data),range=extent(doc.data,r=>r.x),points=Array.from({length:64},(_,i)=>fit.interval(mix(...range,i/63))),flat=points.map(p=>[x(p.x),y(p.center)]),band=[...points.map(p=>[x(p.x),y(p.upper)]),...points.toReversed().map(p=>[x(p.x),y(p.lower)])];
    const common={identity:populationId('model:ols',doc.data),index:0,transitionIndex:0,group:groups[0],recordIds:doc.data.map(recordId)},a=flat[0],b=flat.at(-1),anchor=pointMix(a,b,.5);
    glyph(layout,common,'confidence',band,anchor,{opacity:view==='obs-confidence'?.13:0,entrance:[...flat,...flat.toReversed()],tooltip:uiText('均值响应点态 95% CI；不是预测区间'),model:true});
    line(layout,common,'fit',a,b,anchor,{opacity:fitView?.92:0,width:1.8,tooltip:`OLS · n=${fit.n} · R²=${fit.r2===null?uiText('未定义'):fmt(fit.r2)}`,model:true});
    layout.fit=fit;
  }
  // Large bubbles are painted first so smaller observations remain reachable.
  doc.data.map((r,index)=>({r,index})).sort((a,b)=>(b.r.size||0)-(a.r.size||0)).forEach(({r,index})=>{
    const p=[x(r.x),y(r.y)],radius=bubble?maxR*Math.sqrt(r.size/maximum):w<500?2.6:3.3;
    dot(layout,{identity:key('observation',recordId(r)),index,transitionIndex:index,group:r.group,row:r.row},'sample',p,radius,{opacity:bubble?.38:.73,stroke:bubble?1:.65,editable:'y',value:r.y,tooltip:`${r.label} · ${doc.axes.x}: ${fmt(r.x)} · ${doc.axes.y}: ${fmt(r.y)}${r.size?` · ${doc.axes.size}: ${fmt(r.size)}`:''}`});
  });
  layout.groups=groups;layout.scales={x,y};
  if(bubble){layout.sizeLegend={max:maximum,radius:maxR,title:doc.axes.size};}
  return layout;
}

export function layoutSamples(doc,view,w=800,h=440,{domain}={}){
  const ridge=view==='sample-ridge',horizontal=['sample-swarm','sample-raincloud','sample-ridge'].includes(view),cloud=view==='sample-raincloud',violin=view==='sample-violin',sd=view==='sample-sd',box=view==='sample-box'||cloud;
  const groups=groupStats(doc.data),plot={x:horizontal?(w>=600?98:66):53,y:43,w:w-(horizontal?(w>=600?125:86):79),h:h-92},layout=base(doc,view,w,h,plot);
  const density=violinDensity(groups.map(g=>({name:g.name,values:g.rows.map(r=>r.value)})),63),bounds=domain?.value||scientificBounds(doc,view).value;
  // Tick generation supplies readable numbers without expanding a complete
  // KDE domain (e.g. 0.6..99.8) into a much wider -50..150 display range.
  const valueScale=scaleLinear(padded(bounds),horizontal?[plot.x,plot.x+plot.w]:[plot.y+plot.h,plot.y]),slot=(horizontal?plot.h:plot.w)/groups.length,maxDensity=Math.max(...density.series.flatMap(g=>g.points.map(p=>p.density)));
  axis(layout,valueScale,horizontal,{title:doc.unit});layout.heading=uiMessage`${groups.length} 组 · ${doc.data.length} 个原始样本`;layout.details=sd?uiText('均值 ± 样本 SD'):violin||cloud||ridge?uiText('共用带宽 · 保留全部样本'):box?uiText('四分位 · 1.5 × IQR 须线'):uiText('数值坐标保持不变');
  layout.statistics=[];layout.density=density;
  const compactGroupNames=compactNames(groups.map(g=>g.name),horizontal?(w>=600?8:4):Math.max(2,Math.floor(slot/11)));
  const groupNames=groups.map((g,i)=>chartTextWidth(g.name,11)<=(horizontal?plot.x-18:slot-12)?g.name:compactGroupNames[i]);
  groups.forEach((g,index)=>{
    const stats=boxStatistics(g.rows.map(r=>r.value)),cross=(horizontal?plot.y:plot.x)+(index+.5)*slot,at=v=>horizontal?[valueScale(v),cross]:[cross,valueScale(v)],anchor=at(stats.median),common={colorIdentity:populationId('sample-group',g.rows),identity:populationId('summary',g.rows),index,transitionIndex:index,group:g.name,recordIds:g.rows.map(recordId)},width=Math.min(18,slot*.2),summaryOffset=cloud?slot*.09:0;
    const sp=v=>horizontal?[valueScale(v),cross+summaryOffset]:[cross,valueScale(v)];
    const statsTip=uiMessage`${g.name} · n=${g.n} · Q1 ${fmt(stats.q1)} · 中位数 ${fmt(stats.median)} · Q3 ${fmt(stats.q3)} · 均值 ${fmt(g.mean)} · SD ${fmt(g.sd)}`;
    const densitySeries=density.series[index],amplitude=Math.min(slot*(ridge?.42:cloud?.39:.35),violin?66:100);
    const one=densitySeries.points.map(p=>horizontal?[valueScale(p.x),cross-p.density/maxDensity*amplitude]:[cross-p.density/maxDensity*amplitude,valueScale(p.x)]);
    const two=densitySeries.points.toReversed().map(p=>horizontal?[valueScale(p.x),cloud||ridge?cross:cross+p.density/maxDensity*amplitude]:[cross+p.density/maxDensity*amplitude,valueScale(p.x)]);
    glyph(layout,common,'density',[...one,...two],anchor,{opacity:violin||cloud||ridge?.16:0,stroke:violin||cloud||ridge?.65:0,entrance:[...one,...two].map(p=>horizontal?[p[0],cross]:[cross,p[1]]),tooltip:uiMessage`${g.name} · 高斯核密度 · 共用带宽 ${fmt(density.bandwidth)}`,derived:true});
    line(layout,common,'whisker',sp(stats.low),sp(stats.high),anchor,{opacity:box?.8:0,tooltip:statsTip,derived:true});
    const low=sp(stats.q1),high=sp(stats.q3),bx=horizontal?Math.min(low[0],high[0]):cross-width/2,by=horizontal?cross+summaryOffset-width/2:Math.min(low[1],high[1]),bw=horizontal?Math.abs(high[0]-low[0]):width,bh=horizontal?width:Math.abs(high[1]-low[1]);
    glyph(layout,common,'box',rectPoints(bx,by,bw,bh),anchor,{opacity:box?.86:0,stroke:box?1:0,paper:true,tooltip:statsTip,derived:true});
    for(const [role,value,capWidth] of [['median',stats.median,width],['cap-low',stats.low,width*.7],['cap-high',stats.high,width*.7]]){
      const p=sp(value),a=horizontal?[p[0],p[1]-capWidth/2]:[p[0]-capWidth/2,p[1]],b=horizontal?[p[0],p[1]+capWidth/2]:[p[0]+capWidth/2,p[1]];
      line(layout,common,role,a,b,anchor,{opacity:box?.95:0,width:role==='median'?1.8:1,tooltip:statsTip,derived:true});
    }
    const mean=at(g.mean);line(layout,common,'sd',at(g.mean-g.sd),at(g.mean+g.sd),mean,{opacity:sd?.85:0,width:1.5,tooltip:statsTip,derived:true});
    for(const [role,v] of [['sd-low',g.mean-g.sd],['sd-high',g.mean+g.sd]]){const p=at(v);line(layout,common,role,horizontal?[p[0],p[1]-6]:[p[0]-6,p[1]],horizontal?[p[0],p[1]+6]:[p[0]+6,p[1]],mean,{opacity:sd?.85:0,tooltip:statsTip,derived:true});}
    dot(layout,common,'mean',mean,4.2,{opacity:sd?1:0,stroke:sd?1.7:0,paper:true,tooltip:statsTip,derived:true});
    const packed=view==='sample-swarm'?packSwarm(g.rows,valueScale,slot*.32,Math.min(3.4,slot*.06)):null,lookup=new Map(packed?.nodes.map(r=>[r.label,r])||[]);
    g.rows.forEach(r=>{
      let p,rr=Math.min(2.6,w<500?1.8:2.6),jitter=(hash(recordId(r))%997)/996;
      if(packed){const own=lookup.get(r.label);p=[own.x,cross+own.y];rr=packed.radius;}
      else if(ridge)p=[valueScale(r.value),cross+slot*(.11+jitter*.14)];
      else if(cloud)p=[valueScale(r.value),cross+slot*(.22+jitter*.13)];
      else p=[cross+(box||sd?slot*(.15+jitter*.18):(jitter-.5)*slot*.32),valueScale(r.value)];
      dot(layout,{colorIdentity:common.colorIdentity,identity:recordId(r),index:r.row,transitionIndex:r.row,group:g.name,row:r.row},'sample',p,rr,{opacity:.67,stroke:0,editable:'value',value:r.value,tooltip:`${r.sampleName} · ${fmt(r.value)} ${doc.unit}`});
    });
    layout.labels.push(horizontal?{x:plot.x-10,y:cross+3,text:groupNames[index],fullText:g.name,anchor:'end',small:true}:{x:cross,y:plot.y+plot.h+18,text:groupNames[index],fullText:g.name,anchor:'middle',small:true});
    layout.labels.push(horizontal?{x:plot.x-10,y:cross+17,text:`n=${g.n}`,anchor:'end',fontSize:9}:{x:cross,y:plot.y+plot.h+31,text:`n=${g.n}`,anchor:'middle',fontSize:9});
    layout.statistics.push({...stats,...g,anchor});
  });
  // Summaries stay behind observations, including after non-adjacent switches.
  layout.marks.sort((a,b)=>Number(!a.derived)-Number(!b.derived));
  layout.scales={value:valueScale};return layout;
}

export function layoutEstimates(doc,view,w=800,h=440,{domain}={}){
  const vertical=view==='estimate-vertical',shown=view!=='estimate-points',log=doc.scale==='log',plot={x:vertical?61:w>=650?132:78,y:44,w:w-(vertical?94:w>=650?213:126),h:h-96},layout=base(doc,view,w,h,plot),bounds=domain?.value||scientificBounds(doc,view).value;
  const scale=(log?scaleLog:scaleLinear)(padded(bounds,log),vertical?[plot.y+plot.h,plot.y]:[plot.x,plot.x+plot.w]);if(!log)scale.nice(4);
  axis(layout,scale,!vertical,{title:doc.unit,log});layout.heading=doc.intervalLabel;layout.details=log?uiText('对数轴 · 参考值 1'):shown?uiText('输入区间 · 线性尺度'):uiText('仅显示点估计');
  const compactLabels=compactNames(doc.data.map(r=>r.label),vertical?(w>=650?7:3):(w>=650?12:5));
  const names=doc.data.map((r,i)=>chartTextWidth(r.label,11)<=(vertical?plot.w/doc.data.length-12:plot.x-20)?r.label:compactLabels[i]);
  if(doc.reference!==null){const p=scale(doc.reference);layout.guides.push(vertical?{x1:plot.x,x2:plot.x+plot.w,y1:p,y2:p,major:true}:{x1:p,x2:p,y1:plot.y,y2:plot.y+plot.h,major:true});}
  doc.data.forEach((r,index)=>{
    const cross=(vertical?plot.x:plot.y)+(index+.5)*(vertical?plot.w:plot.h)/doc.data.length,at=v=>vertical?[cross,scale(v)]:[scale(v),cross],anchor=at(r.estimate),common={identity:key('estimate',recordId(r)),index,transitionIndex:index,group:uiText('估计'),row:r.row},tip=`${r.label} · ${fmt(r.estimate)} [${fmt(r.low)}, ${fmt(r.high)}] ${doc.unit} · ${doc.intervalLabel}${r.n?` · n=${r.n}`:''}`;
    line(layout,common,'range',shown?at(r.low):anchor,shown?at(r.high):anchor,anchor,{opacity:shown?.78:0,tooltip:tip});
    for(const [role,v] of [['lower',r.low],['upper',r.high]]){const p=shown?at(v):anchor,a=vertical?[p[0]-4,p[1]]:[p[0],p[1]-4],b=vertical?[p[0]+4,p[1]]:[p[0],p[1]+4];line(layout,common,role,a,b,anchor,{opacity:shown?.9:0,tooltip:tip});}
    dot(layout,common,'point',anchor,3.8,{opacity:1,paper:false,tooltip:tip,editable:'estimate',value:r.estimate});
    layout.labels.push(vertical?{x:cross,y:plot.y+plot.h+18,text:names[index],fullText:r.label,anchor:'middle',small:true}:{x:plot.x-12,y:cross+3,text:names[index],fullText:r.label,anchor:'end',small:true});
    if(!vertical)layout.labels.push({x:w-8,y:cross+3,text:fmt(r.estimate),anchor:'end',fontSize:10});
  });
  layout.scales={value:scale};return layout;
}

export function layoutScientific(doc,view,w=800,h=440,options={}){
  const annotations=options.annotations||[];
  if(annotations.length&&!options.annotationReserved){
    const side=w>=650&&w/h>1.25,space=side?208:Math.min(h*.42,Math.max(130,Math.ceil(annotations.length/Math.max(1,Math.floor((w-24)/198)))*112));
    const layout=layoutScientific(doc,view,side?w-space:w,side?h:h-space,{...options,annotationReserved:true});
    layout.annotationRail=side?{x:w-space+8,y:36,w:space-16,h:h-56}:{x:12,y:h-space+8,w:w-24,h:space-20};
    return layout;
  }
  const eligible=scientificEligibility(doc,view);if(!eligible.valid)throw new Error(eligible.reason);
  if(isFrequencyView(view))return layoutFrequency(doc,view,w,h,options);
  if(isDistributionView(view))return layoutDistribution(doc,view,w,h,options);
  if(isSerialView(view))return layoutSerial(doc,view,w,h,options);
  if(isProcessView(view))return layoutProcess(doc,view,w,h,options);
  if(isMultivariateView(view))return layoutMultivariate(doc,view,w,h,options);
  if(isExploratoryView(view))return layoutExploratory(doc,view,w,h,options);
  if(isDiagnosticView(view))return layoutDiagnostic(doc,view,w,h,options);
  if(isAnalyticalView(view))return layoutAnalytical(doc,view,w,h,options);
  return (scientificFamily(view)==='observations'?layoutObservations:scientificFamily(view)==='samples'?layoutSamples:layoutEstimates)(doc,view,w,h,options);
}

export class ScientificMorphChart extends MorphChart{
  setView(view,options={}){if(this.layout?.spatialPose)return this.setDocument(this.doc,view,{...this.options,...options});return super.setView(view,options);}
  seekTransition(from,to,progress){if(!this.layout?.spatialPose)return super.seekTransition(from,to,progress);const key=`${from}:${to}:${this.dimensions().w}:${this.dimensions().h}`;if(this.spatialSeekKey!==key){this.setDocument(this.doc,from,{...this.options,animate:false});this.spatialSeek=this.setDocument(this.doc,to,{...this.options,manual:true});this.spatialSeekKey=key;}this.spatialSeek(progress);}
  setDocument(doc,view,options={}){this.spatialSeekKey=null;this.spatialResume=options.resume?this.spatialLayer?.pose:null;this.options.annotations=options.annotations||[];const result=super.setDocument(doc,view,options);if(this.layout?.spatialPose&&!options.manual&&(options.animate===false||this.reducedMotion))this.drawSpatial(this.layout.spatialPose);return result;}
  eligibility(doc,view){return scientificEligibility(doc,view);}
  layoutFor(doc,view,w,h,options){return layoutScientific(doc,view,w,h,{...options,annotations:this.options.annotations});}
  viewInfo(view){return scientificViews.find(v=>v.id===view);}
  colorKey(mark){return mark.colorIdentity??mark.group;}
  writeShape(key,points){
    this.current.set(key,points);
    const d='M'+compactContour(points).map(p=>p.map(v=>v.toFixed(3)).join(',')).join('L')+'Z';
    const node=this.nodes.get(key),shape=node.shape;if(shape.getAttribute('d')!==d)shape.setAttribute('d',d);
    if(node.sampleRing){const x=points.reduce((sum,p)=>sum+p[0],0)/points.length,y=points.reduce((sum,p)=>sum+p[1],0)/points.length;for(const el of [node.sampleRing,node.sampleHit].filter(Boolean)){el.setAttribute('cx',x);el.setAttribute('cy',y);}}
  }
  markColor(m){
    if(m.neutral)return this.theme.secondary;
    if(m.valueDomain&&m.value!==null)return valueColorFor(this.options,m.value,m.valueDomain,interpolateRgb(this.theme.bg,this.theme.colors[(m.value<0?0:1)%this.theme.colors.length])(Math.max(.08,Math.abs(m.tone||0))));
    if(m.accent)return this.theme.colors[1]||this.theme.colors[0];
    if(Object.hasOwn(m,'tone')){if(m.tone===null)return this.theme.secondary;const end=this.theme.colors[m.tone>=0?1:0]||this.theme.colors[0],fallback=interpolateRgb(this.theme.bg,end)(m.solidTone?1:Math.abs(m.tone));return this.doc.family==='correlation'?valueColorFor(this.options,m.tone,[-1,1],fallback):fallback;}
    return resolveBoundColor(this.options,this.colorKey(m),this.theme.colors[this.colorIndices.get(this.colorKey(m))%this.theme.colors.length]);
  }
  paint(layout){
    super.paint(layout);
    if(this.options.editable&&layout.doc.family==='multivariate')this.svg.setAttribute('role','group');
    for(const m of layout.marks){
      const n=this.nodes.get(m.key),color=this.markColor(m);
      n.shape.setAttribute('fill',m.paper?this.theme.bg:color);n.shape.setAttribute('fill-opacity',m.opacity);n.shape.setAttribute('stroke',color);n.shape.setAttribute('stroke-opacity',m.opacity);n.shape.setAttribute('stroke-width',m.stroke);n.texture.setAttribute('opacity',0);
      if(Object.hasOwn(m,'tone')&&!m.tone)n.shape.setAttribute('stroke',this.theme.secondary);
      n.title.textContent=m.tooltip||'';n.group.setAttribute('aria-label',m.tooltip||'');n.group.setAttribute('data-science-role',m.role);n.group.setAttribute('tabindex',m.opacity&&this.options.interactive!==false?0:-1);n.group.setAttribute('aria-hidden',String(!m.opacity));
      if(this.options.editable&&m.editable&&!m.recordIds?.length){n.group.dataset.editRow=m.row;n.group.dataset.editField=m.editable;n.group.setAttribute('role','button');n.group.setAttribute('aria-label',uiMessage`编辑 ${m.tooltip}`);}
      else{delete n.group.dataset.editRow;delete n.group.dataset.editField;n.group.setAttribute('role','graphics-symbol');}
      n.group.style.pointerEvents=m.opacity?'':'none';
      if(m.multivariatePoint){
        n.group.dataset.sampleId=m.sampleId;n.group.dataset.variableX=m.variablePair[0];n.group.dataset.variableY=m.variablePair[1];
        if(this.options.editable){
          n.sampleRing||=this.el('circle',{'data-sample-ring':'',fill:'none','pointer-events':'none','vector-effect':'non-scaling-stroke'},n.group);
          for(const [k,v]of Object.entries({cx:m.anchor[0],cy:m.anchor[1],r:m.radius+4}))n.sampleRing.setAttribute(k,v);
          if(layout.view==='multivariate-focus'&&m.opacity>0){n.sampleHit||=this.el('circle',{'data-sample-hit':'',fill:'transparent'},n.group);for(const [k,v]of Object.entries({cx:m.anchor[0],cy:m.anchor[1],r:12}))n.sampleHit.setAttribute(k,v);}
          else{n.sampleHit?.remove();n.sampleHit=null;}
        }
      }
      if(this.options.editable&&m.recordIds?.length){
        const role={density:uiText('密度'),box:uiText('箱线'),median:uiText('中位数'),mean:uiText('均值'),sd:uiText('标准差'),fit:uiText('回归拟合'),confidence:uiText('均值置信带'),'threshold-point':uiText('阈值统计'),'calibration-bin':uiText('概率分箱'),pair:uiText('变量对相关'),mirror:uiText('变量对相关'),diagonal:uiText('变量自相关')}[m.role]||uiText('统计摘要');
        n.group.dataset.recordIds=JSON.stringify(m.recordIds);n.group.dataset.recordLabel=m.recordLabel||`${m.group} · ${role}`;
        n.group.setAttribute('role','button');n.group.setAttribute('aria-label',uiMessage`查看 ${m.multivariatePoint?m.tooltip:m.recordLabel||`${m.group} ${role}`}的 ${m.recordIds.length} 条原始记录`);
      }else{delete n.group.dataset.recordIds;delete n.group.dataset.recordLabel;}
    }
    // Keep the original DOM nodes but re-establish semantic paint order.
    for(const m of layout.marks)this.markLayer.append(this.nodes.get(m.key).group);
    if(layout.spatialPose)this.drawSpatial(this.spatialLayer?.pose||layout.spatialPose,layout);
  }
  drawSpatial(pose,layout=this.layout){this.spatialLayer??=new SpatialMorphLayer(this);this.spatialLayer.draw(pose,layout);}
  paintTransition(from,to,p){
    const old=new Map(from.marks.map(m=>[m.key,m]));
    for(const m of to.marks){const a=old.get(m.key),n=this.nodes.get(m.key),color=this.markColor(m);
      if(a?.opacity===0&&m.opacity===0)continue;
      const opacity=processMarkOpacity(a,m,p) ?? (m.clusterBranch?(p<.15?(a?.opacity||0)*(1-p/.15):m.opacity*clamp((p-.82)/.18)):mix(a?.opacity||0,m.opacity,p));
      n.shape.setAttribute('fill-opacity',opacity);n.shape.setAttribute('stroke-opacity',opacity);n.shape.setAttribute('stroke-width',mix(a?.stroke||0,m.stroke,p));
      n.shape.setAttribute('fill',interpolateRgb(a?.paper?this.theme.bg:a?this.markColor(a):color,m.paper?this.theme.bg:color)(p));
      n.shape.setAttribute('stroke',interpolateRgb(a?this.markColor(a):color,color)(p));
    }
    if(to.spatialPose){const q=p<.5?4*p*p*p:1-(-2*p+2)**3/2;this.drawSpatial(mixSpatialPose(this.spatialResume||from.spatialPose,to.spatialPose,q),to);}
  }
  interpolateMark(old,next,q,{effect,from}={}){
    if(!old)return null;
    const serial=interpolateSerialMark(from||old.points,old,next,q);if(serial)return serial;
    if(effect==='guided'){const process=interpolateProcessMark(from||old.points,old,next,q);if(process)return process;}
    if(effect==='guided'){const matrix=interpolateMatrixCell(from||old.points,old,next,q);if(matrix)return matrix;}
    let points=next.points.map((p,i)=>pointMix((from||old.points)[i],p,q));
    if(effect==='guided'&&old.opacity===0&&next.opacity>0)points=next.points.map((p,i)=>pointMix(next.entrance[i],p,q));
    if(effect==='guided'&&next.opacity===0&&old.opacity>0)points=old.points.map((p,i)=>pointMix(p,old.entrance[i],q));
    if(effect==='guided'&&old.quantity&&next.quantity&&old.quantity!==next.quantity){
      points=q<.5?old.points.map((p,i)=>pointMix(p,old.entrance[i],q*2)):next.points.map((p,i)=>pointMix(next.entrance[i],p,(q-.5)*2));
    }
    if(effect==='guided'&&((old.role.startsWith('calibration')||next.role.startsWith('calibration'))||(old.role.startsWith('threshold')||next.role.startsWith('threshold')))){
      if(old.opacity===0&&next.opacity>0)points=next.points.map((p,i)=>pointMix(next.entrance[i],p,clamp((q-.3)/.7)));
      if(next.opacity===0&&old.opacity>0)points=old.points.map((p,i)=>pointMix(p,old.entrance[i],clamp(q/.7)));
    }
    if(next.role==='density')points=this.densityTransition(from||old.points,next,q,old)||points;
    if(effect==='arc'){const bend=Math.sin(q*Math.PI)*18*(next.transitionIndex%2?1:-1);points=points.map(([x,y])=>[x,y+bend]);}
    if(effect==='turn'){const center=pointMix(old.anchor,next.anchor,q),angle=Math.sin(q*Math.PI)*.16,c=Math.cos(angle),s=Math.sin(angle);points=points.map(([x,y])=>[center[0]+(x-center[0])*c-(y-center[1])*s,center[1]+(x-center[0])*s+(y-center[1])*c]);}
    return points;
  }
  densityTransition(from,next,q,old){
    // Hidden helpers have no visible source. Unfold them at the destination
    // rather than revealing an unrelated, previously hidden violin outline.
    const start=old?.opacity===0&&next.opacity>0?next.entrance:from;
    const end=next.opacity===0&&old?.opacity>0?next.entrance:next.points;
    return interpolateDensityContour(start,end,q);
  }
  interpolateResumedMark(points,mark,q,{old}={}){
    const serial=interpolateSerialMark(points,old,mark,q);if(serial)return serial;
    const process=interpolateProcessMark(points,old,mark,q);if(process)return process;
    const matrix=interpolateMatrixCell(points,old,mark,q);if(matrix)return matrix;
    if(mark.role==='density')return this.densityTransition(points,mark,q,old);
    // A helper that was invisible has no displayed location to carry across.
    // Grow its own target geometry instead of exposing an old hidden outline.
    if(old?.opacity===0&&mark.opacity>0)return q<.08?points.map((p,i)=>pointMix(p,mark.entrance[i],q/.08)):mark.points.map((p,i)=>pointMix(mark.entrance[i],p,(q-.08)/.92));
    if(mark.opacity===0&&old?.opacity>0)return points.map((p,i)=>pointMix(p,old.entrance[i],q));
    return null;
  }
  decorateTransition(from,to,p){
    if(from.doc?.family!=='serial'||to.doc?.family!=='serial')return;
    const node=this.guideLayer.querySelector('[data-serial-estimator]');if(!node)return;
    const a=from.view==='serial-pacf'?'PACF':'ACF',b=to.view==='serial-pacf'?'PACF':'ACF',q=p<.5?4*p*p*p:1-(-2*p+2)**3/2;
    node.textContent=p===0?from.heading:p===1?to.heading:q<.45?`${a} → 0`:q<=.55?`${a} → 0 → ${b}`:`0 → ${b}`;
    this.guideLayer.setAttribute('opacity',1);
  }
  decorate(layout){
    super.decorate(layout);
    if(layout.spatialPose)this.drawSpatial(this.spatialLayer?.pose||layout.spatialPose,layout);
    if(this.options.editable)for(const facet of layout.facetPanels||[]){
      const node=this.el('rect',{x:facet.x,y:facet.y,width:facet.w,height:facet.h,fill:'transparent','data-multivariate-facet':'','data-variable-x':facet.pair[0],'data-variable-y':facet.pair[1],'data-selected-facet':facet.selected,role:'button',tabindex:facet.selected?0:-1,'aria-label':uiMessage`聚焦变量对：${facet.label}`,'aria-pressed':facet.selected},this.guideLayer);
      this.el('title',{},node,uiMessage`聚焦变量对：${facet.label}`);
    }
    for(const node of this.guideLayer.querySelectorAll('line[reference]'))node.setAttribute('stroke-dasharray','4 4');
    for(const el of [...this.guideLayer.querySelectorAll('text')].filter(el=>el.getAttribute('y')==='15'))el.remove();
    const heading=layout.w<580?(layout.doc.scale==='log'?uiMessage`${layout.heading} · 对数轴`:layout.view==='obs-confidence'?uiMessage`均值响应 95% CI · n=${layout.doc.data.length}`:layout.view==='sample-sd'?uiMessage`均值 ± 样本 SD · ${layout.doc.data.length} 个样本`:layout.heading):layout.heading;
    const header=layout.header||layout.plot;
    this.text(this.guideLayer,header.x,15,short(heading,layout.w<500?29:34),{'font-family':'Manrope,"PingFang SC",sans-serif','font-size':10.5,fill:this.theme.fg});
    if(layout.doc.family==='serial'){const node=[...this.guideLayer.querySelectorAll('text')].find(n=>n.getAttribute('y')==='15'&&n.getAttribute('x')===String(header.x));node?.setAttribute('data-serial-estimator','');}
    if(layout.w>=580)this.text(this.guideLayer,header.x+header.w,15,short(layout.details,40),{'text-anchor':'end','font-size':10});
    if(layout.groups?.length>1||layout.groupLabels)layout.groups.forEach((g,i)=>{const columns=layout.groupLegendColumns||layout.groups.length,slot=layout.plot.w/columns,x=layout.plot.x+(i%columns)*slot,y=32+Math.floor(i/columns)*18,id=layout.groupKeys?.[i]??g,color=resolveBoundColor(this.options,id,this.theme.colors[this.colorIndices.get(id)%this.theme.colors.length]),name=layout.groupLabels?.[i]||g;this.el('circle',{cx:x+3,cy:y,r:2.5,fill:color},this.guideLayer);const label=this.text(this.guideLayer,x+12,y+3,short(name,layout.groupLegendColumns?Math.max(3,Math.floor((slot-18)/10)):Math.max(6,Math.floor(slot/7))),{'font-size':10});if(layout.groupLegendColumns)this.el('title',{},label,name);});
    if(layout.divergingLegend){const width=Math.min(120,layout.plot.w*.45),x=layout.plot.x+layout.plot.w-width,y=layout.h-11;for(let i=0;i<40;i++){const tone=i/39*2-1;this.el('rect',{x:x+i*width/40,y,width:width/40+.2,height:4,fill:this.markColor({tone}),'data-value-color-swatch':''},this.guideLayer);}for(const [q,text]of [[0,'−1'],[.5,'0'],[1,'+1']])this.text(this.guideLayer,x+width*q,y-5,text,{'font-size':8,'text-anchor':'middle'});if(this.options.valueColors?.mode==='diverging')this.text(this.guideLayer,x+width,y-18,uiMessage`参考中心 ${fmt(this.options.valueColors.center)}`,{'font-size':8,'text-anchor':'end'});}
    if(layout.valueDomain){
      const [low,high]=layout.valueDomain,width=Math.min(170,layout.plot.w*.45),x=layout.plot.x+layout.plot.w-width,y=layout.h-12;
      for(let i=0;i<48;i++){const value=low+(high-low)*i/47,tone=low<0?value/(Math.max(Math.abs(low),Math.abs(high))||1):(value-low)/(high-low||1);this.el('rect',{x:x+i*width/48,y,width:width/48+.2,height:5,fill:this.markColor({value,valueDomain:layout.valueDomain,tone}),'data-value-color-swatch':''},this.guideLayer);}
      const labels=[[0,fmt(low)],[1,fmt(high)]],scheme=this.options.valueColors;
      if(scheme?.mode==='diverging'&&scheme.center>=low&&scheme.center<=high&&high>low)labels.push([(scheme.center-low)/(high-low),fmt(scheme.center)]);
      for(const [q,label] of labels)this.text(this.guideLayer,x+width*q,y-5,label,{'font-size':8,'text-anchor':'middle'});
      if(scheme?.mode==='diverging')this.text(this.guideLayer,x+width,y-18,uiMessage`参考中心 ${fmt(scheme.center)}`,{'font-size':8,'text-anchor':'end'});
    }
    if(layout.sizeLegend&&layout.w>=650){const {max,radius,title}=layout.sizeLegend,cx=layout.plot.x+layout.plot.w-18,cy=layout.plot.y+radius+6;for(const ratio of [1,.25])this.el('circle',{cx,cy:cy+radius-radius*Math.sqrt(ratio),r:radius*Math.sqrt(ratio),fill:'none',stroke:this.theme.secondary,'stroke-width':.7},this.guideLayer);this.text(this.guideLayer,cx-radius-8,cy+3,`${fmt(max)} · ${short(title,12)}`,{'text-anchor':'end','font-size':9});}
    for(const label of layout.labels.filter(l=>l.fullText)){const node=[...this.guideLayer.querySelectorAll('text')].find(n=>n.getAttribute('x')===String(label.x)&&n.getAttribute('y')===String(label.y)&&(n.textContent===String(label.text)||label.fullText&&n.getAttribute('aria-label')===label.fullText));if(node){node.setAttribute('aria-label',label.fullText);this.el('title',{},node,label.fullText);}}
    for(const label of layout.labels.filter(l=>l.toneText||l.contrastMark)){const node=[...this.guideLayer.querySelectorAll('text')].find(n=>n.getAttribute('x')===String(label.x)&&n.getAttribute('y')===String(label.y));const rgb=parseColor(this.markColor(label.contrastMark||{tone:label.tone??Number(label.text)}))?.rgb();if(node&&rgb){node.setAttribute('fill',labelInk(rgb.formatRgb(),this.theme.fg));}}
    for(const label of layout.labels.filter(l=>l.dataLabel)){const node=[...this.guideLayer.querySelectorAll('text')].find(n=>n.getAttribute('x')===String(label.x)&&n.getAttribute('y')===String(label.y)&&(n.textContent===String(label.text)||label.fullText&&n.getAttribute('aria-label')===label.fullText));if(node)this.labelLayer.append(node);}
  }
  render(progress){
    const p=clamp(progress);this.svg.dataset.entranceProgress=String(p);this.svg.dataset.inspectReady=String(p===1);this.labelLayer.setAttribute('opacity',clamp((p-.7)/.3));
    for(const m of this.layout.marks){
      if(m.opacity===0&&p<1)continue;
      const delay=((m.derived||m.model) ? .4 : 0)+(m.index/Math.max(1,this.doc.data.length))*.1;
      const q=1-(1-clamp((p-delay)/(1-delay)))**3;
      this.writeShape(m.key,p===1?m.points:m.points.map((at,i)=>pointMix(m.entrance[i],at,q)));
    }
    if(this.layout.spatialPose){const pose=this.layout.spatialPose,q=1-(1-p)**3;this.drawSpatial({...pose,surface:pose.surface*q,objects:pose.objects.map(o=>({...o,radius:o.radius*q}))});}
  }
}
