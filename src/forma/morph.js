import {uiText,uiMarkup,uiMessage} from './locale.js';
import {resolveBoundColor} from './color-semantics.js';
import {areaDataLabel,sectorCallouts,spaceAxisLabels,labelInk,blendedSurface,labelFont,boundedLabel} from './chart-readability.js';
import {fitChartLabel,chartTextWidth} from './text-wrap.js';
import {recordId} from './data-identity.js';
import {matchingGuideFrame,sameGuideCoordinates} from './guide-continuity.js';
import {measurementDomain,singleZeroBased} from './axis-policy.js';
import {hierarchy, pack, treemap, treemapSquarify, scaleLinear,interpolateRgb} from 'd3';
import {themeFor} from './palettes.js';
import {extraMorphViews,layoutExtraMorph} from './morph-extra.js';
import {foundationViews,layoutFoundation,mixContour,mixOutline,unitBridge} from './morph-foundation.js';
import {validateMorphDocument,morphEligibility,numericDomain,shareViews} from './morph-rules.js';
export {validateMorphDocument} from './morph-rules.js';

const NS='http://www.w3.org/2000/svg';
export const POINTS=128;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>t<.5?4*t*t*t:1-(-2*t+2)**3/2;
import {formatNumber as number} from './number-format.js';
const short=(value,n)=>[...value].length>n?[...value].slice(0,n-1).join('')+'…':value;
let instance=0;

export const morphViews=[
  {id:'bars',name:uiText('条形'),en:'Length',note:uiText('从共同的零点出发，以长度比较数量。')},
  {id:'bubbles',name:uiText('气泡'),en:'Area',note:uiText('圆的面积与数值成正比，颜色始终对应同一类别。')},
  {id:'donut',name:uiText('环形'),en:'Share',note:uiText('把同一组数值转成整体中的份额，角度表示占比。')},
  {id:'treemap',name:uiText('矩形树'),en:'Partition',note:uiText('以矩形面积划分整体，每个类别的原始值保持不变。')},
  {id:'columns',name:uiText('柱形'),en:'Height',note:uiText('所有柱形从共同零点量起，以高度比较数量。')},
  {id:'pie',name:uiText('饼形'),en:'Angle',note:uiText('扇区角度表示各类别占整体的份额。')},
  {id:'rose',name:uiText('玫瑰'),en:'Polar area',note:uiText('扇区角度相同，以面积对应数量，半径按平方根缩放。')},
  {id:'stacked',name:uiText('份额带'),en:'Stacked share',note:uiText('同高矩形按数量划分宽度，所有份额合成一个整体。')},
  {id:'line',name:uiText('折线'),en:'Position',note:uiText('按表格顺序连接观测值，纵坐标表示数量；相邻类别的颜色在中点交接。')},
  {id:'area',name:uiText('面积'),en:'Continuous area',note:uiText('按表格顺序连接观测值并填充至零基线，以轮廓高度读取数值。')},
  ...extraMorphViews,...foundationViews
];
export const morphEffects=[{id:'smooth',name:uiText('直接变形')},{id:'cascade',name:uiText('逐项接力')},{id:'arc',name:uiText('弧线迁移')},{id:'gather',name:uiText('汇聚展开')},{id:'turn',name:uiText('旋转落位')}];
export const morphExample={
  title:uiText('六类内容的创作数量'),subtitle:uiText('不同图型共用同一组原始数值。'),
  unit:uiText('篇'),source:{name:uiText('FORMA 设计演示 · 确定性合成数据'),type:'demo'},
  data:[{label:uiText('设计'),value:28},{label:uiText('技术'),value:22},{label:uiText('文化'),value:18},{label:uiText('商业'),value:14},{label:uiText('生活'),value:10},{label:uiText('科学'),value:8}]
};


export function rectPoints(x,y,w,h){
  const points=[];
  for(let edge=0;edge<4;edge++)for(let i=0;i<POINTS/4;i++){
    const t=i/(POINTS/4);
    points.push(edge===0?[x+w*t,y]:edge===1?[x+w,y+h*t]:edge===2?[x+w*(1-t),y+h]:[x,y+h*(1-t)]);
  }
  return points;
}
export function circlePoints(cx,cy,r){
  return Array.from({length:POINTS},(_,i)=>{const a=-Math.PI*.75+i/POINTS*Math.PI*2;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];});
}
export function sectorPoints(cx,cy,r0,r1,a0,a1){
  const points=[];
  for(let i=0;i<POINTS/2;i++){const a=a0+(a1-a0)*i/(POINTS/2-1);points.push([cx+Math.cos(a)*r1,cy+Math.sin(a)*r1]);}
  for(let i=0;i<POINTS/2;i++){const a=a1-(a1-a0)*i/(POINTS/2-1);points.push([cx+Math.cos(a)*r0,cy+Math.sin(a)*r0]);}
  return points;
}
const pathFor=points=>'M'+points.map(p=>p.map(v=>v.toFixed(3)).join(',')).join('L')+'Z';

// Include every corner while retaining the same contour size as the other views.
export function polygonPoints(vertices){
  return vertices.flatMap((a,i)=>{
    const b=vertices[(i+1)%vertices.length],count=Math.floor(POINTS/vertices.length)+(i<POINTS%vertices.length?1:0);
    return Array.from({length:count},(_,j)=>[a[0]+(b[0]-a[0])*j/count,a[1]+(b[1]-a[1])*j/count]);
  });
}

// Every encoding uses the same records; the raw values and identities stay intact.
export function layoutMorph(doc,view,w=800,h=440,{showLegend=false,domain,axisLabels=false}={}){
  const eligibility=morphEligibility(doc,view);if(!eligibility.valid)throw new Error(eligibility.reason);
  if(!morphViews.some(v=>v.id===view))throw new Error(uiMessage`未知变换视图：${view}`);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<240||h<200)throw new Error(uiText('变换画布至少需要 240 × 200 的逻辑尺寸。'));
  const total=doc.data.reduce((sum,r)=>sum+(r.value??0),0),n=doc.data.length;
  showLegend=showLegend&&n<=16;
  const extent=domain||measurementDomain(doc.data.map(r=>r.value),{zero:singleZeroBased(view)}),labelFor=i=>doc.data[i].label;
  const wide=w>=650,labelStride=Math.ceil(n/(wide?12:6)),showTick=i=>i===0||i===n-1||(i%labelStride===0&&i<n-labelStride);
  const gutter=Math.max(wide?38:30,Math.min(84,...extent.map(v=>chartTextWidth(number(v),11)+14)));
  const legendRows=wide?n:Math.ceil(n/2);
  const legendH=showLegend&&!wide?Math.min(legendRows*23+35,h-160):0;
  const plot={x:gutter,y:34,w:showLegend&&wide?w-220-gutter:w-gutter*2,h:h-64-legendH};
  const marks=[],guides=[],labels=[],overlays=[];
  const legend=doc.data.map((row,i)=>({key:recordId(row),index:i,label:row.label,value:row.value,share:total?row.value/total:0,x:wide?w-167:18+(i%2)*(w-36)/2,y:wide?55+(h-95-Math.min(64,(h-95)/n)*n)/2+i*Math.min(64,(h-95)/n):h-legendH+16+Math.floor(i/2)*Math.max(9,(legendH-22)/legendRows)}));
  if(view==='bars'||view==='diverging'){
    const labelWidth=Math.min(plot.w*.34,240,Math.max(65,...doc.data.map(r=>chartTextWidth(r.label,11))));
    const valueWidth=Math.min(plot.w*.18,Math.max(41,...doc.data.map(r=>chartTextWidth(number(r.value),11)+16)));
    const left=plot.x+labelWidth+12,right=plot.x+plot.w-valueWidth;
    const magnitude=Math.max(...extent.map(Math.abs))||1;
    const x=scaleLinear().domain(view==='diverging'?[-magnitude,magnitude]:extent).nice(4).range([left,right]);
    const rowH=plot.h/n,barH=Math.min(wide?32:23,rowH*.66);
    let tickCount=wide?5:4,ticks=x.ticks(tickCount);
    const tickWidth=Math.max(...ticks.map(tick=>number(tick).length))*5.8+10;
    while(tickCount>1&&ticks.length>1&&Math.abs(x(ticks[1])-x(ticks[0]))<tickWidth)ticks=x.ticks(--tickCount);
    for(const tick of ticks){
      guides.push({type:'line',x1:x(tick),x2:x(tick),y1:plot.y-7,y2:plot.y+plot.h-3,major:tick===0});
      labels.push({x:x(tick),y:plot.y+plot.h+16,text:number(tick),anchor:'middle',small:true});
    }
    doc.data.forEach((row,i)=>{
      const y=plot.y+i*rowH+(rowH-barH)/2,start=x(0),end=x(row.value??0),width=Math.abs(end-start),xx=Math.min(start,end),negativeInside=row.value<0&&width>chartTextWidth(number(row.value),11)+18;
      marks.push({key:recordId(row),index:i,value:row.value,points:rectPoints(xx,y,width,barH),geometry:{type:'rect',x:xx,y,width,height:barH,baseline:start,valueX:end,scale:(right-left)/(x.domain()[1]-x.domain()[0])},label:{x:end+(row.value<0&&!negativeInside?-12:12),y:y+barH/2+4,text:row.value===null?'—':number(row.value),anchor:row.value<0&&!negativeInside?'end':'start',fontSize:11,visible:rowH>=17||showTick(i),inside:negativeInside}});
      if(rowH>=17||showTick(i))labels.push({x:left-12,y:y+barH/2+4,...fitChartLabel(labelFor(i),labelWidth,Math.max(12,rowH-4)),anchor:'end',small:true,centerLines:true});
    });
  }else if(view==='bubbles'){
    const root=hierarchy({children:doc.data.map((r,i)=>({...r,index:i}))}).sum(r=>r.value||0);
    pack().size([plot.w,plot.h]).padding(wide?7:4)(root);
    for(const node of root.leaves()){
      const cx=node.x+plot.x,cy=node.y+plot.y,r=node.r;
      marks.push({key:recordId(node.data),index:node.data.index,value:node.value,points:circlePoints(cx,cy,r),geometry:{type:'circle',cx,cy,r,area:Math.PI*r*r},label:areaDataLabel(node.data.label,node.value,{x:cx-r*.8,y:cy-r*.65,width:r*1.6,height:r*1.3})});
    }
  }else if(view==='donut'||view==='pie'){
    const cx=plot.x+plot.w/2,cy=plot.y+plot.h/2;
    const r1=Math.max(20,Math.min(plot.w*.48,plot.h-34)/2),r0=view==='pie'?0:r1*.65;
    let angle=-Math.PI/2;
    doc.data.forEach((row,i)=>{
      const a0=angle,a1=angle+row.value/total*Math.PI*2,mid=(a0+a1)/2;angle=a1;
      marks.push({key:recordId(row),index:i,value:row.value,points:sectorPoints(cx,cy,r0,r1,a0,a1),geometry:{type:'sector',cx,cy,r0,r1,a0,a1,area:(r1*r1-r0*r0)*(a1-a0)/2},label:{visible:false}});
    });
    sectorCallouts(marks,doc,plot,{total,fontSize:wide?12:10});
    if(view==='donut'){
      // Fit exact values inside the hole, including compact previews and exports.
      const text=number(total),fontSize=Math.min(24,r0*.4,r0*1.5/(text.length*.65));
      if(fontSize>=9){
        labels.push({x:cx,y:cy-3,text,anchor:'middle',fontSize,centerTotal:true});
        labels.push({x:cx,y:cy+18,text:uiText('合计'),anchor:'middle',fontSize:9,small:true});
      }
    }
  }else if(view==='columns'){
    const bottom=plot.y+plot.h-17,top=plot.y+12,step=plot.w/n,barW=step*.61;
    const y=scaleLinear().domain(extent).nice(4).range([bottom,top]);
    for(const value of y.ticks(4)){guides.push({type:'line',x1:plot.x,x2:plot.x+plot.w,y1:y(value),y2:y(value),major:value===0});labels.push({x:plot.x-5,y:y(value)+3,text:number(value),anchor:'end',small:true});}
    doc.data.forEach((row,i)=>{const x=plot.x+step*i+(step-barW)/2,end=y(row.value??0),baseline=y(0),yy=Math.min(end,baseline),height=Math.abs(end-baseline);marks.push({key:recordId(row),index:i,value:row.value,points:rectPoints(x,yy,barW,height),geometry:{type:'rect',x,y:yy,width:barW,height,baseline,valueY:end,scale:(bottom-top)/(y.domain()[1]-y.domain()[0])},label:{x:x+barW/2,y:end+(row.value<0?15:-8),text:row.value===null?'—':number(row.value),visible:n<=(wide?16:8)||row.value===null||(showTick(i)&&i===n-1),inside:false,anchor:'middle'}});if(showTick(i))labels.push({x:x+barW/2,y:bottom+19,text:labelFor(i),anchor:'middle',small:true});});
  }else if(view==='line'||view==='area'){
    const bottom=plot.y+plot.h-17,top=plot.y+12,step=plot.w/n;
    const y=scaleLinear().domain(extent).nice(4).range([bottom,top]);
    const centers=doc.data.map((row,i)=>[plot.x+step*(i+.5),y(row.value??0)]);
    for(const value of y.ticks(4)){guides.push({type:'line',x1:plot.x,x2:plot.x+plot.w,y1:y(value),y2:y(value),major:value===0});labels.push({x:plot.x-5,y:y(value)+3,text:number(value),anchor:'end',small:true});}
    doc.data.forEach((row,i)=>{
      const center=centers[i],prev=i>0&&doc.data[i-1].value!==null?centers[i-1]:center,next=i<n-1&&doc.data[i+1].value!==null?centers[i+1]:center;
      const left=[(prev[0]+center[0])/2,(prev[1]+center[1])/2],right=[(next[0]+center[0])/2,(next[1]+center[1])/2];
      const ridge=[left,center,right],half=1.35;
      const vertices=view==='line'?[...ridge.map(([x,yy])=>[x,yy-half]),...ridge.toReversed().map(([x,yy])=>[x,yy+half])]:[...ridge,[right[0],y(0)],[center[0],y(0)],[left[0],y(0)]];
      marks.push({key:recordId(row),index:i,value:row.value,points:row.value===null?Array.from({length:POINTS},()=>[...center]):polygonPoints(vertices),geometry:{type:view,cx:center[0],cy:center[1],left,right,baseline:y(0),scale:(bottom-top)/(y.domain()[1]-y.domain()[0])},label:{x:center[0],y:center[1]-12,text:row.value===null?'—':number(row.value),visible:row.value===null||n<=(wide?12:8)||i===n-1,inside:false,anchor:'middle'}});
      if(showTick(i))labels.push({x:center[0],y:bottom+19,text:labelFor(i),anchor:'middle',small:true});
    });
  }else if(view==='rose'){
    const cx=plot.x+plot.w/2,cy=plot.y+plot.h/2,r=Math.max(20,Math.min(plot.w,plot.h)/2-14),maximum=Math.max(...doc.data.map(r=>r.value)),angle=Math.PI*2/n;
    doc.data.forEach((row,i)=>{const r1=r*Math.sqrt(row.value/maximum),a0=-Math.PI/2+i*angle,a1=a0+angle,mid=(a0+a1)/2;marks.push({key:recordId(row),index:i,value:row.value,points:sectorPoints(cx,cy,0,r1,a0,a1),geometry:{type:'sector',cx,cy,r0:0,r1,a0,a1,area:r1*r1*angle/2},label:{x:cx+Math.cos(mid)*r1*.68,y:cy+Math.sin(mid)*r1*.68+4,text:number(row.value),inside:true,visible:r1>30,fontSize:wide?20:14}});});
  }else if(view==='stacked'){
    const left=plot.x,top=plot.y+plot.h*.25,height=plot.h*.48;let x=left;
    doc.data.forEach((row,i)=>{const width=plot.w*row.value/total;marks.push({key:recordId(row),index:i,value:row.value,points:rectPoints(x,top,width,height),geometry:{type:'rect',x,y:top,width,height,area:width*height},label:areaDataLabel(row.label,row.value,{x,y:top,width,height},{share:row.value/total})});x+=width;});
    [0,25,50,75,100].forEach(value=>labels.push({x:left+plot.w*value/100,y:top+height+24,text:`${value}%`,anchor:'middle',small:true}));
  }else if(view==='treemap'){
    const root=hierarchy({children:doc.data.map((r,i)=>({...r,index:i}))}).sum(r=>r.value||0);
    treemap().tile(treemapSquarify).size([plot.w,plot.h]).padding(0).round(false)(root);
    for(const node of root.leaves()){
      const x=plot.x+node.x0,y=plot.y+node.y0,width=node.x1-node.x0,height=node.y1-node.y0;
      marks.push({key:recordId(node.data),index:node.data.index,value:node.value,points:rectPoints(x,y,width,height),geometry:{type:'rect',x,y,width,height,area:width*height},label:areaDataLabel(node.data.label,node.value,{x,y,width,height},{share:node.value/total,center:false})});
    }
  }else if(foundationViews.some(v=>v.id===view)){
    const extra=layoutFoundation(doc,view,{plot,total,wide,rectPoints,circlePoints,sectorPoints,polygonPoints,domain:extent});
    marks.push(...extra.marks);guides.push(...extra.guides);labels.push(...extra.labels);overlays.push(...extra.overlays);
  }else{
    const extra=layoutExtraMorph(doc,view,{plot,total,wide,rectPoints,circlePoints,sectorPoints,polygonPoints,domain:extent,axisLabels});
    marks.push(...extra.marks);guides.push(...extra.guides);labels.push(...extra.labels);overlays.push(...extra.overlays);
  }
  for(const mark of marks)if(mark.value===null&&mark.label.visible!==false){mark.label.x=Math.max(plot.x+8,Math.min(plot.x+plot.w-8,mark.label.x));mark.label.y=Math.max(plot.y+14,Math.min(plot.y+plot.h-18,mark.label.y));}
  for(const label of labels){if(doc.data.some(r=>r.label===label.text)&&!label.lines){const width=label.anchor==='end'?Math.max(35,label.x-plot.x):Math.max(35,Math.min(160,plot.w/n-8));Object.assign(label,boundedLabel(label.text,width,2,11));}}
  return {view,w,h,total,wide,plot,marks,guides,labels:spaceAxisLabels(labels,plot),overlays,legend:showLegend?legend:[]};
}

export class MorphChart{
  constructor(host,doc=morphExample,options={}){
    const eligibility=this.eligibility(doc,options.view||'bars');if(!eligibility.valid)throw new Error(eligibility.reason);
    this.host=host;this.doc=structuredClone(doc);this.options=options;
    this.win=host.ownerDocument.defaultView||globalThis;this.document=host.ownerDocument;
    this.view=options.view||'bars';this.theme=themeFor(options.palette||'ink',options.dark??false,options.colors);
    this.id=`forma-morph-${++instance}`;this.patternCount=0;this.colorIndices=new Map(options.colorIndices||[]);this.nodes=new Map();this.current=new Map();this.generation=0;this.destroyed=false;this.animating=false;this.frame=null;
    this.motion=this.win.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotion=options.reducedMotion??this.motion?.matches??false;
    this.svg=this.el('svg',{xmlns:NS,width:'100%',height:'100%',role:'img','data-morph-chart':'','aria-label':doc.title});
    this.svg.style.cssText='display:block;overflow:visible;font-family:Manrope,"PingFang SC",sans-serif';
    this.el('desc',{},this.svg,uiMessage`${doc.title}；图型变换时原始值保持不变。来源：${doc.source.name}`);
    this.defs=this.el('defs',{},this.svg);this.guideLayer=this.el('g',{'data-morph-guides':''},this.svg);this.markLayer=this.el('g',{'data-morph-marks':''},this.svg);this.labelLayer=this.el('g',{'data-morph-labels':'','pointer-events':'none'},this.svg);
    host.replaceChildren(this.svg);
    this.motionListener=e=>{this.reducedMotion=options.reducedMotion??e.matches;if(this.reducedMotion&&this.animating)this.setView(this.view,{animate:false});};
    this.motion?.addEventListener?.('change',this.motionListener);
    this.resize();
  }
  eligibility(doc,view){return morphEligibility(doc,view);}
  layoutFor(doc,view,w,h,options){return layoutMorph(doc,view,w,h,options);}
  viewInfo(view){return morphViews.find(v=>v.id===view);}
  colorKey(mark){return mark.key;}
  el(tag,attrs={},parent,content){
    const node=this.document.createElementNS(NS,tag);
    for(const[key,value]of Object.entries(attrs))if(value!==undefined)node.setAttribute(key,String(value));
    if(content!==undefined)node.textContent=content;
    parent?.append(node);return node;
  }
  text(layer,x,y,value,attrs={}){return this.el('text',{x,y,fill:this.theme.secondary,'font-size':11,'font-family':'"DM Mono",monospace',...attrs},layer,value);}
  labelText(layer,label,attrs={}){
    const lines=label.lines||[label.text],lineHeight=label.lineHeight||(label.fontSize||10)*1.2;
    const y=label.y-(label.centerLines?(lines.length-1)*lineHeight/2:0);
    const node=this.text(layer,label.x,y,'',{'aria-label':label.text,...attrs});
    lines.forEach((line,i)=>this.el('tspan',{x:label.x,dy:i?lineHeight:0},node,line));return node;
  }
  dimensions(){return {w:Math.max(280,this.options.width||this.host.clientWidth||800),h:Math.max(200,this.options.height||this.host.clientHeight||440)};}
  syncNodes(layout){
    for(const mark of layout.marks)if(!mark.tooltipLabel)mark.tooltipLabel=this.doc.data[mark.index]?.label||mark.key;
    const active=new Set(layout.marks.map(mark=>mark.key));
    for(const[key,item]of this.nodes)if(!active.has(key)){item.group.remove();item.pattern.remove();this.nodes.delete(key);this.current.delete(key);}
    for(const mark of layout.marks){
      // Existing nodes may receive a new shared color map or semantic group.
      if(!this.colorIndices.has(this.colorKey(mark))){const usedColors=new Set(this.colorIndices.values());let colorIndex=0;while(usedColors.has(colorIndex))colorIndex++;this.colorIndices.set(this.colorKey(mark),colorIndex);}
      if(this.nodes.has(mark.key))continue;
      const patternId=`${this.id}-ink-${++this.patternCount}`;
      const pattern=this.el('pattern',{id:patternId,width:5,height:5,patternUnits:'userSpaceOnUse',patternTransform:'rotate(28)'},this.defs);
      const hatch=this.el('line',{x1:0,y1:0,x2:0,y2:5,'stroke-width':.65},pattern);
      const group=this.el('g',{'data-morph-key':mark.key,tabindex:this.options.interactive===false?-1:0,role:'graphics-symbol'},this.markLayer);
      const title=this.el('title',{},group);
      const shape=this.el('path',{'data-morph-shape':'','data-key':mark.key,'vector-effect':'non-scaling-stroke','stroke-width':.9,'stroke-linejoin':'round'},group);
      const texture=this.el('path',{'pointer-events':'none',fill:`url(#${patternId})`},group);
      this.nodes.set(mark.key,{group,title,shape,texture,pattern,hatch});
    }
  }
  paint(layout){
    this.svg.style.color=this.theme.fg;
    for(const mark of layout.marks){
      const item=this.nodes.get(mark.key),colorIndex=this.colorIndices.get(this.colorKey(mark)),color=resolveBoundColor(this.options,this.colorKey(mark),this.theme.colors[colorIndex%this.theme.colors.length]);
      const solid=['line','dot','lollipop','waffle','step','polarline','unit'].includes(layout.view);
      item.shape.setAttribute('fill',color);item.shape.setAttribute('stroke',color);
      item.shape.setAttribute('stroke-width',['waffle','unit','step','polarline'].includes(layout.view)?0:.9);
      item.shape.setAttribute('fill-opacity',solid||colorIndex<2||this.theme.categorical||this.theme.custom?.91:.06);
      item.texture.setAttribute('opacity',solid||colorIndex<2||this.theme.categorical||this.theme.custom?0:.55);item.hatch.setAttribute('stroke',color);
      const amount=mark.value===null?uiText('未采集'):`${mark.value} ${this.doc.unit}`,share=this.options.showShares&&layout.total>0&&this.doc.data.every(r=>r.value!==null&&r.value>=0)?uiMessage`，占 ${number(mark.value/layout.total*100)}%`:'';
      item.group.setAttribute('aria-label',`${mark.tooltipLabel||mark.key}：${amount}${share}`);item.title.textContent=`${mark.tooltipLabel||mark.key} · ${amount}${share}`;
      item.shape.setAttribute('opacity',mark.value===null?0:1);item.texture.setAttribute('visibility',mark.value===null?'hidden':'visible');
    }
  }
  decorate(layout){
    this.decoratedLayout=layout;this.guideLayer.replaceChildren();this.labelLayer.replaceChildren();
    const t=this.theme;
    for(const guide of layout.guides)this.el('line',{...guide,stroke:guide.major?t.secondary:t.line,'stroke-width':guide.major?.8:.6,'stroke-dasharray':guide.major?'none':'2 5'},this.guideLayer);
    this.text(this.guideLayer,layout.plot.x,15,this.viewInfo(layout.view).en.toUpperCase(),{'font-size':9.5,'letter-spacing':1.25});
    this.text(this.guideLayer,layout.plot.x+layout.plot.w,15,boundedLabel(this.doc.unit,layout.plot.w*.48,1,10).lines[0],{'text-anchor':'end','font-size':10});
    for(const label of layout.labels)this.labelText(this.guideLayer,label,{'data-guide-value':label.dataLabel?'':undefined,'data-donut-total':label.centerTotal?'':undefined,'text-anchor':label.anchor||'start','font-size':label.fontSize||(label.small?11:12),'font-family':labelFont,'font-variant-numeric':'tabular-nums',fill:label.serif||label.centerTotal||label.dataLabel?t.fg:t.secondary,...(label.halo?{stroke:t.bg,'stroke-width':4,'paint-order':'stroke','stroke-linejoin':'round'}:{})});
    if(layout.legend.length&&layout.wide){
      this.el('line',{x1:layout.w-191,x2:layout.w-191,y1:38,y2:layout.h-35,stroke:t.line,'stroke-width':.7},this.guideLayer);
    }else if(layout.legend.length)this.el('line',{x1:18,x2:layout.w-18,y1:layout.legend[0].y-18,y2:layout.legend[0].y-18,stroke:t.line,'stroke-width':.7},this.guideLayer);
    for(const entry of layout.legend){
      const col=t.colors[this.colorIndices.get(entry.key)%t.colors.length],width=layout.wide?147:(layout.w-36)/2-14;
      this.el('circle',{cx:entry.x+3,cy:entry.y-4,r:3.5,fill:resolveBoundColor(this.options,entry.key,col)},this.guideLayer);
      const slotHeight=layout.wide?Math.min(64,(layout.h-95)/layout.legend.length):Math.max(20,(layout.h-layout.legend[0].y)/Math.ceil(layout.legend.length/2));
      const valueText=entry.value===null?'—':number(entry.value);
      const fitted=fitChartLabel(entry.label,width-24,Math.max(12,slotHeight-16),layout.wide?10:9);
      this.labelText(this.guideLayer,{x:entry.x+24,y:entry.y,...fitted},{'font-family':'Manrope,"PingFang SC",sans-serif','font-size':fitted.fontSize,fill:t.fg});
      this.text(this.guideLayer,entry.x+width,entry.y+fitted.lines.length*fitted.lineHeight,valueText,{'text-anchor':'end',fill:t.fg,'font-size':10});
    }
    for(const overlay of layout.overlays||[]){const {type,key,accent,paper,...attrs}=overlay,color=paper?t.bg:accent?t.accent:key?t.colors[this.colorIndices.get(key)%t.colors.length]:t.secondary;this.el(type,{...attrs,fill:type==='circle'?t.bg:'none',stroke:color,'stroke-width':paper?2:1.5,'data-morph-overlay':''},this.labelLayer);}
    for(const mark of layout.marks){
      if(layout.view==='line'&&mark.value!==null)this.el('circle',{cx:mark.geometry.cx,cy:mark.geometry.cy,r:4,fill:t.bg,stroke:resolveBoundColor(this.options,this.colorKey(mark),t.colors[this.colorIndices.get(this.colorKey(mark))%t.colors.length]),'stroke-width':1.8,'data-line-point':mark.key},this.labelLayer);
      const label=mark.label;if(label.visible===false)continue;
      const colorIndex=this.colorIndices.get(this.colorKey(mark)),color=resolveBoundColor(this.options,this.colorKey(mark),t.colors[colorIndex%t.colors.length]);
      const filled=colorIndex<2||t.categorical||t.custom,surface=label.inside?blendedSurface(color,t.bg,label.surfaceOpacity??(filled?.91:.06)):t.bg,fill=label.inside?labelInk(surface,t.fg):t.fg;
      const common={'text-anchor':label.anchor||(label.inside?'middle':'start'),fill,'font-family':labelFont,'font-variant-numeric':'tabular-nums','data-data-label':mark.key,'aria-label':label.fullText||`${mark.tooltipLabel}: ${label.text}`,...(!label.inside||!filled||label.surfaceOpacity<.5?{stroke:surface,'stroke-width':3.5,'stroke-linejoin':'round','paint-order':'stroke'}:{})};
      if(label.leader)this.el('polyline',{points:label.leader.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':1,opacity:.75,'data-label-leader':mark.key},this.labelLayer);
      if(label.heading){this.labelText(this.labelLayer,{...label,lines:label.heading,lineHeight:label.headingLineHeight},{...common,'font-size':label.headingSize,'font-weight':600});}
      this.text(this.labelLayer,label.x,label.y+(label.bodyOffset||0),label.text,{...common,'font-size':label.fontSize||12,'font-weight':500});
    }
  }
  writeShape(key,points){
    this.current.set(key,points);
    const item=this.nodes.get(key),d=pathFor(points);item.shape.setAttribute('d',d);item.texture.setAttribute('d',d);
  }
  notify(){this.svg.setAttribute('data-view',this.view);this.svg.setAttribute('aria-busy',String(this.animating));this.options.onChange?.({view:this.view,animating:this.animating});}
  cancel(){this.generation++;if(this.frame!==null)this.win.cancelAnimationFrame(this.frame);this.frame=null;}
  // A composed canvas owns its clock. Seeking must not schedule a second loop.
  seekTransition(fromView,toView,progress){
    if(this.destroyed)return;this.cancel();const p=clamp(progress),{w,h}=this.dimensions(),key=`${fromView}:${toView}:${w}:${h}`;
    if(this.seekKey!==key){
      this.seekKey=key;this.seekFrom=this.layoutFor(this.doc,fromView,w,h,{showLegend:this.options.showLegend??false,domain:this.options.domain,axisLabels:this.options.axisLabels});this.seekTo=this.layoutFor(this.doc,toView,w,h,{showLegend:this.options.showLegend??false,domain:this.options.domain,axisLabels:this.options.axisLabels});
      this.syncNodes(this.seekTo);this.paint(this.seekTo);this.svg.setAttribute('viewBox',`0 0 ${w} ${h}`);this.seekDecorated=null;
    }
    const from=new Map(this.seekFrom.marks.map(mark=>[mark.key,mark.points]));
    for(const mark of this.seekTo.marks){const q=ease(clamp((p-mark.index/this.seekTo.marks.length*.12)/.88));this.writeShape(mark.key,p===0?from.get(mark.key):p===1?mark.points:mixContour(from.get(mark.key),mark.points,q));}
    const decorated=p<.5?this.seekFrom:this.seekTo;if(decorated!==this.seekDecorated){this.decorate(decorated);this.seekDecorated=decorated;}
    const opacity=p<.5?Math.max(0,1-p*4):Math.max(0,p*4-3);this.guideLayer.setAttribute('opacity',opacity);this.labelLayer.setAttribute('opacity',opacity);
    this.view=toView;this.layout=this.seekTo;this.animating=p>0&&p<1;this.notify();
  }
  setView(id,{animate=true,duration=this.options.duration||1500,effect=this.options.effect||'smooth'}={}){
    if(this.destroyed)return;
    if(effect!=='guided'&&!morphEffects.some(e=>e.id===effect))throw new Error(uiMessage`未知变换方式：${effect}`);
    const {w,h}=this.dimensions(),layout=this.layoutFor(this.doc,id,w,h,{showLegend:this.options.showLegend??false,domain:this.options.domain,axisLabels:this.options.axisLabels});
    this.cancel();this.view=id;this.layout=layout;this.svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    this.syncNodes(layout);this.paint(layout);
    const from=new Map(layout.marks.map(mark=>[mark.key,this.current.get(mark.key)||mark.points]));
    const changes=layout.marks.some(mark=>{const points=this.current.get(mark.key);return points&&(points.length!==mark.points.length||points.some((p,i)=>Math.abs(p[0]-mark.points[i][0])>.0001||Math.abs(p[1]-mark.points[i][1])>.0001));});
    const shouldAnimate=animate&&!this.reducedMotion&&this.current.size>0&&changes;
    if(!shouldAnimate){
      for(const mark of layout.marks)this.writeShape(mark.key,mark.points);
      this.decorate(layout);this.guideLayer.setAttribute('opacity',1);this.labelLayer.setAttribute('opacity',1);this.animating=false;this.notify();return;
    }
    const outgoingOpacity=Number(this.guideLayer.getAttribute('opacity')??1);
    this.animating=true;this.notify();
    const token=this.generation,milliseconds=clamp(Number.isFinite(duration)?duration:1500,300,5000);
    let start=null,decorated=false;
    const tick=now=>{
      if(this.destroyed||this.generation!==token)return;
      if(start===null)start=now;
      const p=clamp((now-start)/milliseconds);
      for(const mark of layout.marks){
        const delay=mark.index/layout.marks.length*(effect==='cascade'?.32:.08),q=ease(clamp((p-.07-delay)/(effect==='cascade'?.49:.75)));
        const bend=effect==='arc'?Math.sin(q*Math.PI)*Math.min(48,h*.1)*(mark.index%2?1:-1):0;
        let points=mixContour(from.get(mark.key),mark.points,q).map(([x,y])=>[x,y+bend]);
        if((effect==='gather'||effect==='turn')&&q>0&&q<1){
          const center=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]),pulse=Math.sin(q*Math.PI),angle=mark.index/layout.marks.length*Math.PI*2;
          if(effect==='gather'){
            const mix=pulse*pulse,hub=[layout.plot.x+layout.plot.w/2+Math.cos(angle)*Math.min(30,layout.plot.w*.08),layout.plot.y+layout.plot.h/2+Math.sin(angle)*Math.min(30,layout.plot.h*.1)],scale=1-.82*mix;
            points=points.map(p=>[center[0]+(hub[0]-center[0])*mix+(p[0]-center[0])*scale,center[1]+(hub[1]-center[1])*mix+(p[1]-center[1])*scale]);
          }else{
            const a=pulse*.28*(mark.index%2?1:-1),cos=Math.cos(a),sin=Math.sin(a);
            points=points.map(p=>[center[0]+(p[0]-center[0])*cos-(p[1]-center[1])*sin,center[1]+(p[0]-center[0])*sin+(p[1]-center[1])*cos]);
          }
        }
        this.writeShape(mark.key,points);
      }
      if(p>=.9&&!decorated){this.decorate(layout);decorated=true;}
      const opacity=p<.09?outgoingOpacity*(1-clamp(p/.09)):clamp((p-.9)/.1);this.guideLayer.setAttribute('opacity',opacity);this.labelLayer.setAttribute('opacity',opacity);
      if(p<1)this.frame=this.win.requestAnimationFrame(tick);
      else {this.frame=null;this.guideLayer.setAttribute('opacity',1);this.labelLayer.setAttribute('opacity',1);for(const mark of layout.marks)this.writeShape(mark.key,mark.points);this.animating=false;this.notify();}
    };
    this.frame=this.win.requestAnimationFrame(tick);
  }
  render(progress){
    const p=clamp(progress),layout=this.layout;
    this.svg.dataset.entranceProgress=String(p);
    this.labelLayer.setAttribute('opacity',clamp((p-.65)/.35));
    const traces=['line','area','step','multi-line','stacked-area','percent-area'].includes(layout.view);
    if(traces&&p<1){
      if(!this.entranceClip){const clip=this.el('clipPath',{id:`${this.id}-entrance`},this.defs);this.entranceClip=this.el('rect',{},clip);}
      for(const [key,value] of Object.entries({x:layout.plot.x-8,y:layout.plot.y-10,width:(layout.plot.w+16)*clamp(p/.86),height:layout.plot.h+28}))this.entranceClip.setAttribute(key,value);
      this.markLayer.setAttribute('clip-path',`url(#${this.id}-entrance)`);this.labelLayer.setAttribute('clip-path',`url(#${this.id}-entrance)`);
    }else{this.markLayer.removeAttribute('clip-path');this.labelLayer.removeAttribute('clip-path');}
    for(const mark of layout.marks){
      const g=mark.geometry,delay=(mark.periodIndex??mark.index)/Math.max(1,layout.periodCount??layout.marks.length)*.18;
      const q=1-(1-clamp((p-delay)/.78))**3;
      let points;
      if(p===1||traces)points=mark.points;
      else if(g.type==='unit'&&g.count){points=mark.points.map(([x,y],k)=>{const j=Math.floor(k/20),c=g.units[j],q=1-(1-clamp((p-delay-j/g.count*.35)/.55))**3;return [c.cx+(x-c.cx)*q,c.cy+(y-c.cy)*q];});}
      else if(g.type==='rect'&&g.valueX!==undefined)points=mark.points.map(([x,y])=>[g.baseline+(x-g.baseline)*q,y]);
      else if(g.type==='rect'||['line','area','multi-line','stacked-area','percent-area'].includes(g.type)){
        const base=g.baseline??layout.plot.y+layout.plot.h;
        points=mark.points.map(([x,y])=>[x,base+(y-base)*q]);
      }else if(g.type==='sector')points=sectorPoints(g.cx,g.cy,g.r0,g.r1,g.a0,g.a0+(g.a1-g.a0)*q);
      else{
        const cx=g.cx??mark.points.reduce((s,v)=>s+v[0]/mark.points.length,0),cy=g.cy??mark.points.reduce((s,v)=>s+v[1]/mark.points.length,0);
        points=mark.points.map(([x,y])=>[cx+(x-cx)*Math.sqrt(q),cy+(y-cy)*Math.sqrt(q)]);
      }
      this.writeShape(mark.key,points);
    }
  }
  setPalette(palette,dark=false){if(this.destroyed)return;this.theme=themeFor(palette,dark,this.options.colors);this.paint(this.layout);this.decorate(this.decoratedLayout||this.layout);if(this.animating){this.guideLayer.setAttribute('opacity',0);this.labelLayer.setAttribute('opacity',0);}}
  // Change both data and encoding. Persistent record IDs keep their SVG node;
  // new/removed records grow/shrink instead of borrowing another record's value.
  setDocument(doc,view,{duration=1500,effect='smooth',recipe='contour',animate=true,manual=false,resume=false,palette=this.options.palette,dark=false,colors=this.options.colors,domain=this.options.domain,colorIndices,colorBindings,valueColors}={}){
    const eligibility=this.eligibility(doc,view);if(!eligibility.valid)throw new Error(eligibility.reason);if(this.destroyed)return;
    const displayedGuides=resume?this.guideLayer.cloneNode(true):null,displayedLabels=resume?this.labelLayer.cloneNode(true):null;
    const appearance=()=>new Map([...this.nodes].map(([key,item])=>[key,{fill:item.shape.getAttribute('fill'),stroke:item.shape.getAttribute('stroke'),fillOpacity:Number(item.shape.getAttribute('fill-opacity')??1),strokeWidth:Number(item.shape.getAttribute('stroke-width')??0),texture:Number(item.texture.getAttribute('opacity')??0)}]));
    const previousAppearance=appearance();
    // A guided bridge starts at a settled encoding. When interrupted, resume
    // the actual displayed contours rather than jumping back to that encoding.
    if(resume){effect='smooth';recipe='contour';}
    this.cancel();this.markLayer.removeAttribute('clip-path');this.labelLayer.removeAttribute('clip-path');this.seekKey=null;this.options.domain=domain;if(colorIndices)this.colorIndices=new Map(colorIndices);
    const {w,h}=this.dimensions(),next=this.layoutFor(doc,view,w,h,{showLegend:this.options.showLegend??false,domain:this.options.domain,axisLabels:this.options.axisLabels});
    const previous=resume?{...this.layout,marks:this.layout.marks.map(m=>({...m,points:this.current.get(m.key)||m.points,opacity:Number(this.nodes.get(m.key)?.shape.getAttribute('fill-opacity')??m.opacity??1)}))}:this.layout,oldMarks=previous?.marks||[],nextKeys=new Set(next.marks.map(m=>m.key));
    const known=new Map(oldMarks.map(m=>[m.key,m]));
    const exits=[...this.current].filter(([key])=>!nextKeys.has(key)).map(([key,points],index)=>known.get(key)||{key,points,index,value:0});
    const from=new Map([...this.current].map(([key,points])=>[key,points.map(p=>[...p])]));
    const centroid=points=>points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
    const collapse=points=>{const c=centroid(points);return points.map(()=>[...c]);};
    this.doc=structuredClone(doc);this.view=view;this.layout=next;this.options.colors=colors;this.options.colorBindings=colorBindings;this.options.valueColors=valueColors;this.theme=themeFor(palette||'ink',dark,colors);
    this.svg.setAttribute('aria-label',doc.title);this.svg.querySelector(':scope > desc').textContent=uiMessage`${doc.title}；按记录 ID 对应，新增和移除记录分别进出。来源：${doc.source.name}`;
    this.svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    this.syncNodes({...next,marks:[...next.marks,...exits]});this.paint(next);
    const nextAppearance=appearance();
    for(const m of next.marks)if(!from.has(m.key))from.set(m.key,collapse(m.points));
    const targets=[...next.marks,...exits.map(m=>({...m,points:collapse(from.get(m.key)||m.points)}))];
    const finish=()=>{for(const m of next.marks)this.writeShape(m.key,m.points);this.syncNodes(next);this.decorate(next);this.guideLayer.setAttribute('opacity',1);this.labelLayer.setAttribute('opacity',1);this.animating=false;this.frame=null;this.notify();};
    if(!manual&&(!animate||this.reducedMotion||!oldMarks.length)){finish();return;}
    this.animating=true;this.notify();const stableAxes=(previous?.doc?.family==='serial'&&next.doc?.family==='serial')||!resume&&(matchingGuideFrame(previous,next)||['endpoints','fill','update','series-stack','series-endpoints','series-band','series-contour'].includes(recipe)&&!!previous.percent===!!next.percent&&sameGuideCoordinates(previous,next));this.guideLayer.setAttribute('opacity',stableAxes?1:0);this.labelLayer.setAttribute('opacity',0);
    const token=this.generation,ms=clamp(duration,600,5000);let start,lastDecoration;
    // Both the live clock and video encoder use this exact, reversible frame.
    // Retain the union of keyed nodes while seeking, even after visiting t=1.
    const frameAt=progress=>{
      const p=clamp(progress);
      targets.forEach((m,index)=>{
        const node=this.nodes.get(m.key),styleA=previousAppearance.get(m.key)||nextAppearance.get(m.key),styleB=nextAppearance.get(m.key)||styleA,qStyle=ease(p);
        if(styleA&&styleB){for(const [attr,key]of [['fill-opacity','fillOpacity'],['stroke-width','strokeWidth']])node.shape.setAttribute(attr,p===0?styleA[key]:p===1?styleB[key]:styleA[key]+(styleB[key]-styleA[key])*qStyle);node.texture.setAttribute('opacity',p===0?styleA.texture:p===1?styleB.texture:styleA.texture+(styleB.texture-styleA.texture)*qStyle);for(const attr of ['fill','stroke']){const a=styleA[attr],b=styleB[attr];node.shape.setAttribute(attr,p===0?a:p===1?b:a===b?a:a==='none'||b==='none'?(p<.5?a:b):interpolateRgb(a,b)(qStyle));}}
        // Invisible scientific helpers keep deterministic state without
        // interpolating hidden geometry. Endpoints still write exactly.
        if(!resume&&p>0&&p<1&&m.opacity===0&&known.get(m.key)?.opacity===0){this.writeShape(m.key,m.points);return;}
        const stagger=effect==='cascade'?(m.transitionIndex??index)/(next.transitionCount??targets.length)*.22:0,q=ease(clamp((p-stagger)/(1-stagger)));
        const a=from.get(m.key)||collapse(m.points),bend=effect==='arc'?Math.sin(q*Math.PI)*28*(index%2?1:-1):0;
        let points;
        const old=known.get(m.key);
        const custom=nextKeys.has(m.key)?(resume?this.interpolateResumedMark?.(a,m,q,{old}):this.interpolateMark?.(old,m,q,{effect,from:a})):null;
        if(custom)points=custom;
        else if(effect==='guided'&&recipe==='units'&&old&&nextKeys.has(m.key)&&((old.geometry.type==='unit'&&m.geometry.type==='rect')||(m.geometry.type==='unit'&&old.geometry.type==='rect'))){
          const toUnits=m.geometry.type==='unit',count=(toUnits?m:old).geometry.count;
          const bridge=unitBridge((toUnits?old:m).geometry,count);
          points=toUnits?mixContour(bridge,m.points,q):mixContour(a,bridge,q);
        }else if(effect==='guided'&&['endpoints','series-endpoints'].includes(recipe)&&old&&nextKeys.has(m.key)&&m.value!==null&&old.value!==null){
          const g=old.geometry.type==='rect'?old.geometry:m.geometry,bridge=circlePoints(g.x+g.width/2,g.valueY??g.y,3);
          const phase=p<.45?ease(p/.45):ease((p-.45)/.55),startPoints=p<.45?a:bridge,endPoints=p<.45?bridge:m.points;
          points=mixOutline(startPoints,endPoints,phase);
        }else points=((resume||old?.geometry.type!==m.geometry.type)&&['rect','line','area','circle','sector'].includes(old?.geometry.type)&&['rect','line','area','circle','sector'].includes(m.geometry.type)?mixOutline(a,m.points,q):mixContour(a,m.points,q)).map(([x,y])=>[x,y+bend]);
        // Compound unit paths contain intentional zero-area bridges, so an
        // outline would draw connectors between individual dots.
        if(old?.geometry.type==='unit'||m.geometry.type==='unit'){
          const item=this.nodes.get(m.key);item.shape.setAttribute('stroke-width',p===1&&m.geometry.type!=='unit'?.9:0);item.texture.setAttribute('opacity',0);item.shape.setAttribute('fill-opacity',.91);
        }
        if(effect==='turn'&&!m.serialEstimator&&!custom){const c=centroid(points),angle=Math.sin(q*Math.PI)*.22,cos=Math.cos(angle),sin=Math.sin(angle);points=points.map(([x,y])=>[c[0]+(x-c[0])*cos-(y-c[1])*sin,c[1]+(x-c[0])*sin+(y-c[1])*cos]);}
        this.writeShape(m.key,p===0?a:p===1?m.points:points);
      });
      this.paintTransition?.(previous,next,p);
      for(const label of this.guideLayer.querySelectorAll('[data-guide-value]'))label.setAttribute('opacity',p===0||p===1?1:0);
      if(p===1&&(oldMarks.some(m=>m.geometry.type==='unit')||next.marks.some(m=>m.geometry.type==='unit')))this.paint(next);
      if(manual){
        if(resume&&p===0){
          for(const [layer,saved]of [[this.guideLayer,displayedGuides],[this.labelLayer,displayedLabels]]){layer.replaceChildren(...[...saved.childNodes].map(n=>n.cloneNode(true)));layer.setAttribute('opacity',saved.getAttribute('opacity')||'1');}
          lastDecoration=null;this.svg.dataset.transitionProgress='0';this.svg.setAttribute('aria-busy','false');this.animating=false;return;
        }
        const decoration=p===0?previous:next;
        if(decoration!==lastDecoration){this.decorate(decoration);lastDecoration=decoration;}
        this.guideLayer.setAttribute('opacity',p===0||p===1?1:stableAxes?1:0);
        for(const label of this.guideLayer.querySelectorAll('[data-guide-value]'))label.setAttribute('opacity',p===0||p===1?1:0);
        this.labelLayer.setAttribute('opacity',p===0||p===1?1:0);
        this.svg.dataset.transitionProgress=String(p);this.svg.setAttribute('aria-busy','false');this.animating=false;
      }
      this.decorateTransition?.(previous,next,p);
    };
    if(manual){frameAt(0);return frameAt;}
    const tick=now=>{
      if(this.destroyed||token!==this.generation)return;
      start??=now;const p=clamp((now-start)/ms);frameAt(p);
      if(p===1)finish();else this.frame=this.win.requestAnimationFrame(tick);
    };
    this.frame=this.win.requestAnimationFrame(tick);
  }
  setData(doc){if(this.destroyed)return;const eligibility=this.eligibility(doc,this.view);if(!eligibility.valid)throw new Error(eligibility.reason);this.doc=structuredClone(doc);this.seekKey=null;this.svg.setAttribute('aria-label',doc.title);this.svg.querySelector(':scope > desc').textContent=uiMessage`${doc.title}；图型变换时原始值保持不变。来源：${doc.source.name}`;this.setView(this.view,{animate:true});}
  resize(){if(this.destroyed)return;const {w,h}=this.dimensions();if(this.layout&&this.layout.w===w&&this.layout.h===h)return;this.setView(this.view,{animate:false});}
  destroy(){if(this.destroyed)return;this.cancel();this.destroyed=true;this.motion?.removeEventListener?.('change',this.motionListener);this.svg.remove();this.nodes.clear();this.current.clear();this.colorIndices.clear();}
}
