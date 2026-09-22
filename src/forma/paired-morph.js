import {uiText,uiMarkup,uiMessage} from './locale.js';
import {fitChartLabel,chartTextWidth} from './text-wrap.js';
import {recordId} from './data-identity.js';
import {scaleLinear,interpolateRgb} from 'd3';
import {MorphChart,rectPoints,circlePoints,polygonPoints} from './morph.js';
import {pairedViews,relationalEligibility,pairedDomain,relationKey} from './relational-rules.js';

const clamp=x=>Math.max(0,Math.min(1,x));
import {formatNumber as fmt} from './number-format.js';
const short=(s,n)=>[...s].length>n?[...s].slice(0,n-1).join('')+'…':s;
const labelFit=(s,pixels)=>short(s,Math.max(4,Math.floor(pixels/(/[\u3400-\u9fff]/.test(s)?10:5.6))));
const mix=(a,b,q)=>[a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];
const hash=s=>[...s].reduce((n,c)=>(n*31+c.codePointAt(0))>>>0,7);
function connector(a,b,width=1){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=length?-dy/length*width/2:0,ny=length?dx/length*width/2:0;
  return polygonPoints([[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]]);
}
function avoidLabels(items,top,bottom,gap){
  const sorted=[...items].sort((a,b)=>a.y-b.y);let previous=top-gap;
  sorted.forEach(item=>{item.labelY=Math.max(item.y,previous+gap);previous=item.labelY;});
  const shift=Math.min(sorted[0].labelY-top,sorted.reduce((s,item)=>s+item.labelY-item.y,0)/sorted.length);
  sorted.forEach(item=>item.labelY-=shift);
  if(sorted.at(-1)?.labelY>bottom){sorted.at(-1).labelY=bottom;for(let i=sorted.length-2;i>=0;i--)sorted[i].labelY=Math.min(sorted[i].labelY,sorted[i+1].labelY-gap);}
  return sorted;
}
export function layoutPaired(doc,view,w=800,h=440,{domain}={}){
  const valid=relationalEligibility(doc,view);if(!valid.valid)throw new Error(valid.reason);
  const wide=w>=650,n=doc.data.length,dumbbell=view==='paired-dumbbell',bars=view==='paired-bars',change=view==='paired-change',slope=view==='paired-slope';
  const bounds=domain||pairedDomain(doc,view);
  const left=dumbbell?Math.min(w*.32,240,Math.max(78,...doc.data.map(r=>chartTextWidth(r.label)+22))):Math.max(42,...scaleLinear(bounds,[0,1]).nice(4).ticks(4).map(v=>chartTextWidth(fmt(v),11)+22));
  const legendHeight=Math.max(...doc.periodLabels.map(t=>fitChartLabel(t,(w-left-90)/2-25,38,11).lines.length))*14+20;
  const plot={x:left,y:Math.max(44,legendHeight),w:w-left-38,h:Math.max(95,h-Math.max(44,legendHeight)-60)};
  const bottom=plot.y+plot.h,xScale=scaleLinear(bounds,[plot.x,plot.x+plot.w]).nice(4),y=scaleLinear(bounds,[bottom,plot.y]).nice(4);
  const labels=[],guides=[],marks=[],overlays=[],rowEnds=[],step=plot.w/n;
  for(const v of (dumbbell?xScale:y).ticks(4)){
    guides.push(dumbbell?{x1:xScale(v),x2:xScale(v),y1:plot.y,y2:bottom,major:v===0}:{x1:plot.x,x2:plot.x+plot.w,y1:y(v),y2:y(v),major:v===0});
    labels.push(dumbbell?{x:xScale(v),y:bottom+21,text:fmt(v),anchor:'middle',small:true}:{x:plot.x-9,y:y(v)+3,text:fmt(v),anchor:'end',small:true});
  }
  doc.data.forEach((r,index)=>{
    let a,b;
    const cx=plot.x+(index+.5)*step;
    if(dumbbell){const cy=plot.y+(index+.5)*plot.h/n;a=[xScale(r.before),cy];b=[xScale(r.after),cy];labels.push({x:plot.x-12,y:cy+3,...fitChartLabel(r.label,plot.x-22,plot.h/n-4),centerLines:true,anchor:'end',small:true});}
    else if(bars){a=[cx-step*.19,y(r.before)];b=[cx+step*.19,y(r.after)];}
    else if(change){a=[cx,y(0)];b=[cx,y(r.after-r.before)];}
    else{const jitter=slope?0:((hash(recordId(r))%997)/996-.5)*Math.min(56,plot.w*.13);a=[plot.x+plot.w*.19+jitter,y(r.before)];b=[plot.x+plot.w*.81+jitter,y(r.after)];}
    rowEnds.push({a,b,row:r,index});
    const common={index,transitionIndex:index,object:recordId(r),row:r.row,tooltipLabel:r.label,before:r.before,after:r.after,delta:r.after-r.before,pairA:a,pairB:b};
    marks.push({...common,key:relationKey(recordId(r),'link'),field:'link',value:r.after-r.before,points:connector(a,b,bars?0:change?.8:1.1),geometry:{type:'pair-link',a,b,width:bars?0:change?.8:1.1},label:{visible:false}});
    for(const [field,point,value] of [['before',a,r.before],['after',b,r.after]]){
      const barW=Math.min(38,step*.29),yy=Math.min(y(0),point[1]);
      const geometry=bars?{type:'rect',x:point[0]-barW/2,y:yy,width:barW,height:Math.abs(y(0)-point[1]),baseline:y(0),valueY:point[1]}:{type:'pair-point',cx:point[0],cy:point[1],radius:n>16?2.5:3.8};
      marks.push({...common,key:relationKey(recordId(r),field),field,value,points:bars?rectPoints(geometry.x,yy,barW,geometry.height):circlePoints(point[0],point[1],geometry.radius),geometry,label:{visible:false}});
      if(bars&&step>42)marks.at(-1).label={x:point[0],y:point[1]+(value<0?14:-9),text:fmt(value),anchor:'middle',fontSize:10};
    }
    if((bars||change)&&(n<=12||index===0||index===n-1||index%Math.ceil(n/10)===0))labels.push({x:cx,y:bottom+23,...fitChartLabel(r.label,step-8,38),anchor:'middle',small:true});
    if(dumbbell&&Math.abs(a[0]-b[0])>38){labels.push({x:a[0]+(a[0]<=b[0]?-9:9),y:a[1]+3,text:fmt(r.before),anchor:a[0]<=b[0]?'end':'start',small:true});labels.push({x:b[0]+(b[0]>=a[0]?9:-9),y:b[1]+3,text:fmt(r.after),anchor:b[0]>=a[0]?'start':'end',small:true});}
  });
  if(slope){
    for(const [side,field] of [[-1,'a'],[1,'b']]){
      const list=avoidLabels(rowEnds.map(e=>({x:e[field][0],y:e[field][1],row:e.row})),plot.y,bottom,Math.min(13,plot.h/n));
      for(const item of list){
        if(Math.abs(item.labelY-item.y)>3)overlays.push({type:'line',x1:item.x,y1:item.y,x2:item.x+side*9,y2:item.labelY});
        labels.push({x:item.x+side*13,y:item.labelY+3,text:`${short(item.row.label,wide?9:4)} ${fmt(item.row[side<0?'before':'after'])}`,anchor:side<0?'end':'start',fontSize:wide?11:9});
      }
    }
  }
  if(!dumbbell&&!bars&&!change)doc.periodLabels.forEach((text,i)=>labels.push({x:plot.x+plot.w*(i?.81:.19),y:bottom+23,...fitChartLabel(text,plot.w*.35,38),anchor:'middle',small:true}));
  if(change)labels.push({x:plot.x+plot.w,y:h-5,text:uiMessage`变化量 = ${doc.periodLabels[1]} − ${doc.periodLabels[0]}`,anchor:'end',fontSize:10});
  return {view,w,h,wide,plot,marks,guides,labels,overlays,legend:[],total:0,rowEnds,transitionCount:n};
}
export class PairedMorphChart extends MorphChart{
  eligibility(doc,view){return relationalEligibility(doc,view);}
  layoutFor(doc,view,w,h,options){return layoutPaired(doc,view,w,h,options);}
  viewInfo(id){return pairedViews.find(v=>v.id===id);}
  colorKey(mark){return mark.object;}
  interpolateMark(old,next,q,{effect,from}={}){
    if(!old?.pairA)return null;
    const a=mix(old.pairA,next.pairA,q),b=mix(old.pairB,next.pairB,q);
    let points=next.field==='link'?connector(a,b,old.geometry.width+(next.geometry.width-old.geometry.width)*q):next.points.map((p,i)=>mix((from||old.points)[i],p,q));
    if(effect==='arc'){const bend=Math.sin(q*Math.PI)*28*(next.index%2?1:-1);points=points.map(([x,y])=>[x,y+bend]);}
    if(effect==='turn'){const c=mix(a,b,.5),angle=Math.sin(q*Math.PI)*.22,cos=Math.cos(angle),sin=Math.sin(angle);points=points.map(([x,y])=>[c[0]+(x-c[0])*cos-(y-c[1])*sin,c[1]+(x-c[0])*sin+(y-c[1])*cos]);}
    return points;
  }
  paint(layout){
    super.paint(layout);
    for(const mark of layout.marks){
      const node=this.nodes.get(mark.key),before=mark.field==='before',link=mark.field==='link',bars=layout.view==='paired-bars';
      const color=before?this.theme.colors[0]:this.theme.colors[1%this.theme.colors.length];
      node.shape.setAttribute('fill',link?this.theme.secondary:before&&!bars?this.theme.bg:color);
      node.shape.setAttribute('fill-opacity',link?(layout.marks.length>48?.28:.48):.94);
      node.shape.setAttribute('stroke',link?'none':color);node.shape.setAttribute('stroke-width',link||bars?0:1.3);node.texture.setAttribute('opacity',0);
      const text=uiMessage`${mark.tooltipLabel} · ${this.doc.periodLabels[0]} ${fmt(mark.before)} → ${this.doc.periodLabels[1]} ${fmt(mark.after)} ${this.doc.unit} · 变化 ${mark.delta>0?'+':''}${fmt(mark.delta)}`;
      node.title.textContent=text;node.group.setAttribute('aria-label',text);
      if(this.options.editable&&!link){node.group.dataset.editRow=mark.row;node.group.dataset.editField=mark.field;node.group.setAttribute('role','button');node.group.setAttribute('aria-label',uiMessage`编辑 ${mark.tooltipLabel} 的${this.doc.periodLabels[before?0:1]}：${fmt(mark.value)}`);}
    }
  }
  paintTransition(from,to,p){
    const fromBar=from.view==='paired-bars',toBar=to.view==='paired-bars';
    for(const m of to.marks){const node=this.nodes.get(m.key);if(m.field==='before')node.shape.setAttribute('fill',interpolateRgb(fromBar?this.theme.colors[0]:this.theme.bg,toBar?this.theme.colors[0]:this.theme.bg)(p));if(m.field!=='link')node.shape.setAttribute('stroke-width',(fromBar?0:1.3)+((toBar?0:1.3)-(fromBar?0:1.3))*p);}
  }
  decorate(layout){
    super.decorate(layout);
    for(const el of [...this.guideLayer.querySelectorAll('text')].filter(el=>el.getAttribute('y')==='15'))el.remove();
    const t=this.theme;
    const names=layout.view==='paired-change'?[uiText('零变化基线'),uiText('后值 − 前值')]:this.doc.periodLabels;
    names.forEach((label,i)=>{const span=(layout.plot.w-85)/2,x=layout.plot.x+i*span;this.el('circle',{cx:x+3,cy:13,r:3,fill:i?t.colors[1%t.colors.length]:t.bg,stroke:t.colors[i%t.colors.length],'stroke-width':1.2},this.guideLayer);const fitted=fitChartLabel(label,span-25,layout.plot.y-20,11);this.labelText(this.guideLayer,{x:x+13,y:17,...fitted},{'font-family':'Manrope,"PingFang SC",sans-serif','font-size':fitted.fontSize});});
    this.text(this.guideLayer,layout.plot.x+layout.plot.w,17,uiMessage`${this.doc.data.length} 对 · ${short(this.doc.unit,8)}`,{'text-anchor':'end','font-size':10});
  }
  render(progress){
    const p=clamp(progress);this.svg.dataset.entranceProgress=String(p);this.labelLayer.setAttribute('opacity',clamp((p-.55)/.45));
    for(const mark of this.layout.marks){const q=1-(1-clamp((p-mark.index/this.doc.data.length*.16)/.8))**3,g=mark.geometry;let points;
      if(p===1)points=mark.points;
      else if(g.type==='rect')points=mark.points.map(([x,y])=>[x,g.baseline+(y-g.baseline)*q]);
      else if(g.type==='pair-link')points=connector(g.a,mix(g.a,g.b,q),g.width);
      else{const row=this.layout.rowEnds[mark.index],start=mark.field==='after'?mix(row.a,row.b,q):row.a;points=circlePoints(...start,g.radius*Math.min(1,q*3));}
      this.writeShape(mark.key,points);
    }
  }
}
