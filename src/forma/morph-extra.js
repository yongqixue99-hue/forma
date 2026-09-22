import {uiText,uiMarkup,uiMessage} from './locale.js';
import {boundedLabel} from './chart-readability.js';
import {recordId} from './data-identity.js';
import {scaleLinear} from 'd3';

export const extraMorphViews=[
  {id:'lollipop',name:uiText('棒棒糖'),en:'Lollipop',note:uiText('圆点高度表示数值，细杆从共同零基线出发。')},
  {id:'dot',name:uiText('点图'),en:'Cleveland dots',note:uiText('圆点大小相同，以横坐标比较各类别数值。')},
  {id:'squares',name:uiText('比例方块'),en:'Proportional squares',note:uiText('方块面积与数值成正比，边长按平方根缩放。')},
  {id:'semidonut',name:uiText('半环'),en:'Semicircle',note:uiText('半圆总角度为 180°，每段角度对应整体中的份额。')},
  {id:'radialbars',name:uiText('径向柱'),en:'Radial length',note:uiText('从共同内圈出发，以径向长度比较数量，不以扇区面积读数。')},
  {id:'radar',name:uiText('雷达'),en:'Radar',note:uiText('每条轴使用同一量纲与范围，顶点距中心的距离表示数值。')},
  {id:'waterfall',name:uiText('瀑布'),en:'Positive waterfall',note:uiText('按表格顺序逐项累加；每段高度表示本项增量。')},
  {id:'funnel',name:uiText('漏斗'),en:'Stage funnel',note:uiText('按表格顺序排列阶段，上边宽度表示该阶段数量；不自动推断转化率。')},
  {id:'pareto',name:uiText('帕累托'),en:'Pareto',note:uiText('柱形按数量降序排列，折线显示累计占比，读取右侧百分比轴。')},
  {id:'waffle',name:uiText('华夫'),en:'Waffle',note:uiText('每格占整体 1%；不足一格保留部分填充，类别份额不取整。')}
];
import {formatNumber as fmt} from './number-format.js';


export function layoutExtraMorph(doc,view,{plot,total,wide,rectPoints,circlePoints,sectorPoints,polygonPoints,domain,axisLabels}){
  const index=i=>doc.data[i].label;
  const n=doc.data.length,maximum=Math.max(...doc.data.map(r=>r.value)),marks=[],guides=[],labels=[],overlays=[];
  const mark=(row,i,points,geometry,label)=>({key:recordId(row),index:i,value:row.value,points,geometry,label});
  const bottom=plot.y+plot.h-18,top=plot.y+15;
  const axes=(scale,right=plot.x+plot.w)=>{for(const tick of scale.ticks(4)){guides.push({type:'line',x1:plot.x,x2:right,y1:scale(tick),y2:scale(tick),major:tick===0});labels.push({x:plot.x-6,y:scale(tick)+3,text:fmt(tick),anchor:'end',small:true});}};
  if(view==='lollipop'){
    const y=scaleLinear().domain(domain||[0,maximum]).nice(4).range([bottom,top]),step=plot.w/n,r=wide?6:4.5,half=.8,angle=Math.asin(half/r);
    axes(y);
    doc.data.forEach((row,i)=>{
      const cx=plot.x+step*(i+.5),cy=y(row.value),arc=Array.from({length:52},(_,k)=>{const a=Math.PI/2+angle+(Math.PI*2-angle*2)*k/51;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];});
      const vertices=[[cx-half,y(0)],...arc,[cx+half,y(0)]];
      marks.push(mark(row,i,polygonPoints(vertices),{type:'lollipop',cx,cy,baseline:y(0),scale:(bottom-top)/(y.domain()[1]-y.domain()[0])}, {x:cx,y:cy-r-7,text:fmt(row.value),anchor:'middle'}));
      labels.push({x:cx,y:bottom+18,text:index(i),anchor:'middle',small:true});
    });
  }else if(view==='dot'){
    const left=plot.x+Math.min(180,plot.w*.3),right=plot.x+plot.w-65,rowH=plot.h/n,x=scaleLinear().domain(domain||[0,maximum]).nice(4).range([left,right]);
    for(const tick of x.ticks(4)){guides.push({type:'line',x1:x(tick),x2:x(tick),y1:plot.y,y2:bottom,major:tick===0});labels.push({x:x(tick),y:bottom+18,text:fmt(tick),anchor:'middle',small:true});}
    doc.data.forEach((row,i)=>{const cy=plot.y+(i+.45)*(plot.h-20)/n,cx=x(row.value),r=Math.min(5,rowH*.2);guides.push({type:'line',x1:left,x2:right,y1:cy,y2:cy});marks.push(mark(row,i,circlePoints(cx,cy,r),{type:'dot',cx,cy,r,baseline:x(0),scale:(right-left)/(x.domain()[1]-x.domain()[0])},{x:cx+10,y:cy+4,text:fmt(row.value)}));labels.push({x:left-12,y:cy+3,text:index(i),anchor:'end',small:true});});
  }else if(view==='squares'){
    const cols=wide?n:Math.ceil(n/2),rows=Math.ceil(n/cols),cellW=plot.w/cols,cellH=plot.h/rows,sideMax=Math.max(12,Math.min(cellW*.8,cellH-35));
    doc.data.forEach((row,i)=>{const side=sideMax*Math.sqrt(row.value/maximum),cx=plot.x+(i%cols+.5)*cellW,cy=plot.y+(Math.floor(i/cols)+.5)*cellH;
      marks.push(mark(row,i,rectPoints(cx-side/2,cy-side/2,side,side),{type:'square',cx,cy,width:side,height:side,area:side*side},{x:cx,y:cy+4,text:fmt(row.value),inside:true,fontSize:wide?18:16,visible:side>22}));labels.push({x:cx,y:cy+sideMax/2+18,text:index(i),anchor:'middle',small:true});});
  }else if(view==='semidonut'){
    const r=Math.min(plot.w/2-8,plot.h-50),cx=plot.x+plot.w/2,cy=plot.y+(plot.h+r)/2-5,r0=r*.6;let a=-Math.PI;
    doc.data.forEach((row,i)=>{const a0=a,a1=a+row.value/total*Math.PI,mid=(a0+a1)/2;a=a1;marks.push(mark(row,i,sectorPoints(cx,cy,r0,r,a0,a1),{type:'sector',cx,cy,r0,r1:r,a0,a1,area:(r*r-r0*r0)*(a1-a0)/2},{x:cx+Math.cos(mid)*(r+r0)/2,y:cy+Math.sin(mid)*(r+r0)/2+4,text:`${(row.value/total*100).toFixed(1)}%`,inside:true,visible:a1-a0>.25,fontSize:12}));});
    labels.push({x:cx,y:cy-5,text:fmt(total),anchor:'middle',fontSize:Math.min(24,r0*.45,r0*1.5/(fmt(total).length*.65))});
  }else if(view==='radialbars'||view==='radar'){
    const cx=plot.x+plot.w/2,cy=plot.y+plot.h/2,r=Math.max(24,Math.min(plot.w,plot.h)/2-40),r0=view==='radialbars'?r*.26:0,angle=Math.PI*2/n;
    const at=(i,radius)=>[cx+Math.cos(-Math.PI/2+i*angle)*radius,cy+Math.sin(-Math.PI/2+i*angle)*radius];
    if(view==='radar'){
      for(const q of [.25,.5,.75,1])for(let i=0;i<n;i++){const a=at(i,r*q),b=at((i+1)%n,r*q);guides.push({type:'line',x1:a[0],y1:a[1],x2:b[0],y2:b[1]});}
      doc.data.forEach((_,i)=>{const a=at(i,r);guides.push({type:'line',x1:cx,y1:cy,x2:a[0],y2:a[1]});});
      for(const q of [.25,.5,.75,1])labels.push({x:cx-r-38,y:cy-r*q+4,text:fmt(maximum*q),anchor:'end',fontSize:11,halo:true});
    }
    const centers=doc.data.map((row,i)=>at(i,r*row.value/maximum));
    doc.data.forEach((row,i)=>{
      const tip=at(i,r0+(r-r0)*row.value/maximum),lab=at(i,r+24);
      if(view==='radialbars'){
        const a0=-Math.PI/2+i*angle-angle*.32,a1=a0+angle*.64,r1=r0+(r-r0)*row.value/maximum;
        marks.push(mark(row,i,sectorPoints(cx,cy,r0,r1,a0,a1),{type:'radialbar',cx,cy,r0,r1,scale:(r-r0)/maximum},{x:tip[0],y:tip[1],visible:false,text:fmt(row.value)}));
      }else{
        const p=centers[(i+n-1)%n],c=centers[i],next=centers[(i+1)%n],left=[(p[0]+c[0])/2,(p[1]+c[1])/2],right=[(c[0]+next[0])/2,(c[1]+next[1])/2];
        marks.push(mark(row,i,polygonPoints([[cx,cy],left,c,right]),{type:'radar',cx,cy,point:c,radius:r*row.value/maximum,scale:r/maximum},{x:c[0],y:c[1],visible:false,text:fmt(row.value)}));
        overlays.push({type:'circle',cx:c[0],cy:c[1],r:3,key:recordId(row)});
      }
      if(i%Math.ceil(n/12)===0)labels.push({x:lab[0],y:lab[1]-3,text:row.label,lines:[row.label,fmt(row.value)],lineHeight:15,fontSize:11,anchor:Math.cos(-Math.PI/2+i*angle)>.3?'start':Math.cos(-Math.PI/2+i*angle)<-.3?'end':'middle',halo:true,dataLabel:true});
    });
  }else if(view==='waterfall'||view==='pareto'){
    const right=plot.x+plot.w-(view==='pareto'?32:0),step=(right-plot.x)/n,width=step*.62;
    const y=scaleLinear().domain([0,view==='waterfall'?total:maximum]).nice(4).range([bottom,top]);axes(y,right);
    let running=0;const order=doc.data.map((r,i)=>i).sort((a,b)=>view==='pareto'?doc.data[b].value-doc.data[a].value||a-b:a-b),byIndex=new Map();
    order.forEach((i,rank)=>{const row=doc.data[i],before=running;running+=row.value;const x=plot.x+step*(rank+.5)-width/2,y0=y(view==='waterfall'?before:0),y1=y(view==='waterfall'?running:row.value);
      byIndex.set(i,mark(row,i,rectPoints(x,y1,width,y0-y1),{type:view,x,y:y1,width,height:y0-y1,before,after:running,cumulative:running/total,scale:(bottom-top)/y.domain()[1]},{x:x+width/2,y:y1-8,text:fmt(row.value),anchor:'middle'}));
      labels.push({x:x+width/2,y:bottom+18,text:index(i),anchor:'middle',small:true});
      if(view==='waterfall'&&rank<n-1)guides.push({type:'line',x1:x+width,x2:x+step,y1:y1,y2:y1,major:true});
      if(view==='pareto'){
        const py=bottom-(bottom-top)*running/total,px=x+width/2;
        overlays.push({type:'circle',cx:px,cy:py,r:3,accent:true});
        if(rank){const previous=order[rank-1],m=byIndex.get(previous),oldX=m.geometry.x+width/2,oldY=bottom-(bottom-top)*before/total;overlays.push({type:'line',x1:oldX,y1:oldY,x2:px,y2:py,accent:true});}
      }
    });
    marks.push(...doc.data.map((_,i)=>byIndex.get(i)));
    if(view==='pareto')for(const q of [0,.5,1])labels.push({x:right+6,y:bottom-(bottom-top)*q+3,text:`${q*100}%`,small:true});
  }else if(view==='funnel'){
    const rowH=(plot.h-10)/n,height=rowH*.84,labelWidth=Math.min(140,plot.w*.3),maxW=plot.w-labelWidth-12,cx=plot.x+labelWidth+maxW/2;
    doc.data.forEach((row,i)=>{const width=maxW*row.value/maximum,nextWidth=maxW*(doc.data[i+1]?.value??row.value)/maximum,y=plot.y+rowH*i;
      marks.push(mark(row,i,polygonPoints([[cx-width/2,y],[cx+width/2,y],[cx+nextWidth/2,y+height],[cx-nextWidth/2,y+height]]),{type:'funnel',topWidth:width,nextWidth,y,height,scale:maxW/maximum},{x:cx,y:y+height/2+4,text:fmt(row.value),inside:true,visible:Math.min(width,nextWidth)>24,fontSize:wide?18:13}));labels.push({x:plot.x+4,y:y+height/2+3,...boundedLabel(index(i),labelWidth-14,rowH>30?2:1,11),centerLines:true,small:true});});
  }else if(view==='waffle'){
    const side=Math.min(plot.w,plot.h-10),cell=side/10,left=plot.x+(plot.w-side)/2,top=plot.y+4;let start=0;
    doc.data.forEach((row,i)=>{
      const end=i===n-1?100:Math.min(100,start+row.value/total*100),regions=[];let cursor=start;
      while(cursor<end){const r=Math.min(9,Math.floor(cursor/10)),stop=Math.min(end,(r+1)*10),x=left+(cursor-r*10)*cell,width=(stop-cursor)*cell;regions.push({x,y:top+r*cell,width,height:cell});cursor=stop;}
      // Zero-area bridges keep disconnected runs in one persistent contour.
      const vertices=[],anchor=regions.length?[regions[0].x,regions[0].y]:[left,top];
      for(const box of regions){vertices.push(anchor,[box.x,box.y],[box.x+box.width,box.y],[box.x+box.width,box.y+cell],[box.x,box.y+cell],[box.x,box.y],anchor);}
      marks.push(mark(row,i,polygonPoints(vertices.length?vertices:[anchor,anchor,anchor,anchor]),{type:'waffle',start,end,regions,area:(end-start)/100*side*side},{x:0,y:0,text:fmt(row.value),visible:false}));start=end;
    });
    for(let k=0;k<=10;k++){overlays.push({type:'line',x1:left+k*cell,x2:left+k*cell,y1:top,y2:top+side,paper:true},{type:'line',x1:left,x2:left+side,y1:top+k*cell,y2:top+k*cell,paper:true});}
    labels.push({x:left+side/2,y:top+side+19,text:uiText('1 格 = 1%'),anchor:'middle',small:true});
  }else throw new Error(uiMessage`未知的扩展图型：${view}`);
  return {marks,guides,labels,overlays};
}
