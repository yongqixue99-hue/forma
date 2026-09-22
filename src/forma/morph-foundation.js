import {uiText,uiMarkup,uiMessage} from './locale.js';
import {boundedLabel} from './chart-readability.js';
import {recordId} from './data-identity.js';
import {scaleLinear} from 'd3';

export const foundationViews=[
  {id:'diverging',name:uiText('发散条形'),en:'Diverging bars',note:uiText('以零为中心，两侧使用相同刻度，分别读取增加与减少。')},
  {id:'step',name:uiText('阶梯折线'),en:'Step after',note:uiText('本次记录生效后保持到下次变更；日期按实际间隔排列，缺失保留断点。')},
  {id:'polarline',name:uiText('极坐标折线'),en:'Cyclic line',note:uiText('等间隔周期首尾相接，以半径读取数值，不以包围面积比较总量。')},
  {id:'unit',name:uiText('单位堆叠'),en:'Unit count',note:uiText('每个圆点严格代表一个单位，保留整数数量，按数量升序排列。')},
  {id:'funnel-bars',name:uiText('转化漏斗'),en:'Conversion stages',note:uiText('同一批对象逐步减少，条长表示阶段人数，旁边标注相对首步的留存。')}
];

// A unit category has multiple closed runs connected by zero-area bridges.
// Keep every individual dot; never round a count into a proportional symbol.
export function joinedRuns(runs,anchor=[0,0]){
  return runs.length?runs.flatMap(run=>[anchor,run[0],...run,run[0],anchor]):Array.from({length:128},()=>[...anchor]);
}
export function resampleContour(points,count){
  if(points.length===count)return points;
  return Array.from({length:count},(_,i)=>{const at=i/count*points.length,j=Math.floor(at),q=at-j,a=points[j],b=points[(j+1)%points.length];return [a[0]+(b[0]-a[0])*q,a[1]+(b[1]-a[1])*q];});
}
export function contourPair(a,b){const n=Math.max(a.length,b.length);return [resampleContour(a,n),resampleContour(b,n)];}
export function mixContour(a,b,q){const [from,to]=contourPair(a,b);return to.map((p,i)=>[from[i][0]+(p[0]-from[i][0])*q,from[i][1]+(p[1]-from[i][1])*q]);}

// Match outlines by travelled distance and winding, not the source polygon's
// arbitrary vertex indices. This avoids corner spikes in interrupted basic views.
export function mixOutline(a,b,q){
  if(q===0)return a;if(q===1)return b;
  const signed=ps=>ps.reduce((n,p,i)=>{const v=ps[(i+1)%ps.length];return n+p[0]*v[1]-v[0]*p[1];},0);
  const target=signed(a)*signed(b)<0?[...b].reverse():b;
  const measure=ps=>{const start=ps.reduce((best,p,i)=>p[0]+p[1]<ps[best][0]+ps[best][1]?i:best,0),lengths=ps.map((p,i)=>Math.hypot(p[0]-ps[(i+1)%ps.length][0],p[1]-ps[(i+1)%ps.length][1]));const total=lengths.reduce((n,v)=>n+v,0),at=Array(ps.length);let sum=0;for(let j=0;j<ps.length;j++){const i=(start+j)%ps.length;at[i]=sum;sum+=lengths[i];}return {start,lengths,total,at};};
  const source=measure(a),dest=measure(target);
  return a.map((p,i)=>{let distance=(source.total>1e-8?source.at[i]/source.total:i/a.length)*dest.total,edge=dest.start;
    for(let n=0;n<target.length-1&&distance>dest.lengths[edge];n++){distance-=dest.lengths[edge];edge=(edge+1)%target.length;}
    const v=target[edge],w=target[(edge+1)%target.length],u=dest.lengths[edge]>1e-8?distance/dest.lengths[edge]:0;
    return [p[0]+(v[0]+(w[0]-v[0])*u-p[0])*q,p[1]+(v[1]+(w[1]-v[1])*u-p[1])*q];
  });
}

export function unitBridge(rect,count){
  const {x,y,width,height,valueX}=rect,anchor=[x,y+height];
  return joinedRuns(Array.from({length:count},(_,j)=>{
    const xx=valueX===undefined?x:x+width*j/count,yy=valueX===undefined?y+height*(count-1-j)/count:y;
    const ww=valueX===undefined?width:width/count,hh=valueX===undefined?height/count:height;
    const corners=[[xx,yy],[xx+ww,yy],[xx+ww,yy+hh],[xx,yy+hh]];
    return corners.flatMap((a,i)=>Array.from({length:4},(_,k)=>{const b=corners[(i+1)%4];return [a[0]+(b[0]-a[0])*k/4,a[1]+(b[1]-a[1])*k/4];}));
  }),anchor);
}
import {formatNumber as fmt} from './number-format.js';
const short=s=>[...s].length>7?[...s].slice(0,6).join('')+'…':s;
function strokePolygon(points,polygonPoints,half=1.3){
  const sides=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [-(b[1]-a[1])/d*half,(b[0]-a[0])/d*half];});
  return polygonPoints([...points.map((p,i)=>[p[0]+sides[i][0],p[1]+sides[i][1]]),...points.map((p,i)=>[p[0]-sides[i][0],p[1]-sides[i][1]]).reverse()]);
}

export function layoutFoundation(doc,view,{plot,wide,domain,rectPoints,polygonPoints,circlePoints}){
  const n=doc.data.length,marks=[],guides=[],labels=[],overlays=[],bottom=plot.y+plot.h-20,top=plot.y+12;
  const label=(i)=>short(doc.data[i].label),stride=Math.ceil(n/(wide?10:5));
  const tick=i=>i===0||i===n-1||i%stride===0&&i<n-stride;
  const mark=(r,i,points,geometry,text)=>({key:recordId(r),index:i,value:r.value,points,geometry,label:text});
  if(view==='unit'){
    const max=Math.max(1,...doc.data.map(r=>r.value)),dx=plot.w/n,perRow=dx<45?3:5,dy=Math.min(15,(bottom-top-20)/Math.ceil(max/perRow)),gap=Math.min(dx/(perRow+1),dy),r=Math.min(3.6,dy*.3,gap*.3);
    const order=doc.data.map((_,i)=>i).sort((a,b)=>doc.data[a].value-doc.data[b].value||a-b);
    doc.data.forEach((row,i)=>{
      const cx=plot.x+(order.indexOf(i)+.5)*dx,anchor=[cx,bottom],units=Array.from({length:row.value},(_,j)=>({cx:cx+(j%perRow-(perRow-1)/2)*gap,cy:bottom-(Math.floor(j/perRow)+.5)*dy,r}));
      const points=joinedRuns(units.map(c=>Array.from({length:16},(_,k)=>{const a=-Math.PI*.75+k/16*Math.PI*2;return [c.cx+Math.cos(a)*r,c.cy+Math.sin(a)*r];})),anchor);
      marks.push(mark(row,i,points,{type:'unit',cx,cy:bottom,baseline:bottom,units,count:row.value,scale:dy/perRow,perRow},{x:cx,y:bottom-Math.ceil(row.value/perRow)*dy-10,text:fmt(row.value),anchor:'middle',fontSize:11}));
      labels.push({x:cx,y:bottom+20,text:label(i),anchor:'middle',small:true});
    });
    guides.push({x1:plot.x,x2:plot.x+plot.w,y1:bottom,y2:bottom,major:true});
    labels.push({x:plot.x,y:top-2,text:uiMessage`1 点 = 1 ${doc.unit}`,small:true});
  }else if(view==='step'){
    const dated=doc.data.every(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.label)&&Number.isFinite(Date.parse(r.label))),order=doc.data.map((_,i)=>i).sort((a,b)=>dated?Date.parse(doc.data[a].label)-Date.parse(doc.data[b].label):a-b);
    const times=order.map(i=>dated?Date.parse(doc.data[i].label):i),x=scaleLinear([times[0],times.at(-1)],[plot.x+8,plot.x+plot.w-8]),y=scaleLinear(domain,[bottom,top]).nice(4);
    for(const v of y.ticks(4)){guides.push({x1:plot.x,x2:plot.x+plot.w,y1:y(v),y2:y(v),major:v===0});labels.push({x:plot.x-6,y:y(v)+3,text:fmt(v),anchor:'end',small:true});}
    doc.data.forEach((row,i)=>{
      const rank=order.indexOf(i),next=doc.data[order[rank+1]],cx=x(times[rank]),cy=y(row.value??0),nx=next&&next.value!==null?x(times[rank+1]):cx,ny=next&&next.value!==null?y(next.value):cy;
      const ridge=[[cx,cy],[nx,cy],[nx,ny]];
      const points=row.value===null?Array.from({length:128},()=>[cx,cy]):nx===cx?circlePoints(cx,cy,2.3):strokePolygon(ridge,polygonPoints);
      marks.push(mark(row,i,points,{type:'step',cx,cy,right:[nx,cy],next:[nx,ny],baseline:y(0),scale:(bottom-top)/(y.domain()[1]-y.domain()[0]),time:times[rank]},{x:cx,y:cy-10,text:row.value===null?'—':fmt(row.value),anchor:'middle',visible:row.value===null||n<9||rank===n-1}));
      if(row.value!==null)overlays.push({type:'circle',cx,cy,r:2.4,key:recordId(row)});
      if(tick(rank))labels.push({x:cx,y:bottom+21,text:dated?row.label.slice(5):label(i),anchor:'middle',small:true});
    });
  }else if(view==='polarline'){
    const cx=plot.x+plot.w/2,cy=plot.y+plot.h/2,r=Math.max(24,Math.min(plot.w,plot.h)/2-44),y=scaleLinear([0,Math.max(...doc.data.map(r=>r.value))],[0,r]).nice(3),at=(a,r)=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r];
    for(const v of y.ticks(3).filter(v=>v>0)){
      for(let k=0;k<64;k++){const a=at(k/64*Math.PI*2,y(v)),b=at((k+1)/64*Math.PI*2,y(v));guides.push({x1:a[0],y1:a[1],x2:b[0],y2:b[1]});}
      const x=Math.max(plot.x+12,cx-r-58);labels.push({x,y:cy-y(v)+4,text:fmt(v),anchor:'end',fontSize:11,halo:true});guides.push({x1:x+8,x2:cx-r-16,y1:cy-y(v),y2:cy-y(v)});
    }
    const centers=doc.data.map((row,i)=>at(-Math.PI/2+i/n*Math.PI*2,y(row.value)));
    doc.data.forEach((row,i)=>{const c=centers[i],a=centers[(i+n-1)%n],b=centers[(i+1)%n],left=[(a[0]+c[0])/2,(a[1]+c[1])/2],right=[(b[0]+c[0])/2,(b[1]+c[1])/2];
      marks.push(mark(row,i,strokePolygon([left,c,right],polygonPoints),{type:'polarline',cx,cy,point:c,radius:y(row.value),scale:r/y.domain()[1],left,right},{visible:false}));
      overlays.push({type:'circle',cx:c[0],cy:c[1],r:n>24?1.5:2.3,key:recordId(row)});
      if(i%Math.ceil(n/12)===0){const a=-Math.PI/2+i/n*Math.PI*2,pos=at(a,r+24);labels.push({x:pos[0],y:pos[1]-3,text:row.label,lines:[row.label,fmt(row.value)],lineHeight:15,fontSize:11,anchor:Math.cos(a)>.3?'start':Math.cos(a)<-.3?'end':'middle',halo:true,dataLabel:true});}
    });
  }else if(view==='funnel-bars'){
    const left=plot.x+65,right=plot.x+plot.w-85,rowH=plot.h/n,height=Math.min(30,rowH*.56),x=scaleLinear([0,doc.data[0].value],[left,right]);
    for(const v of x.ticks(4)){guides.push({x1:x(v),x2:x(v),y1:plot.y,y2:bottom,major:v===0});labels.push({x:x(v),y:bottom+20,text:fmt(v),anchor:'middle',small:true});}
    doc.data.forEach((row,i)=>{const yy=plot.y+i*(plot.h-20)/n+5,end=x(row.value);marks.push(mark(row,i,rectPoints(left,yy,end-left,height),{type:'rect',x:left,y:yy,width:end-left,height,baseline:left,valueX:end,scale:(right-left)/doc.data[0].value},{x:end+8,y:yy+height/2+4,text:fmt(row.value),fontSize:11}));labels.push({x:left-10,y:yy+height/2+4,text:label(i),anchor:'end',small:true},{x:plot.x+plot.w,y:yy+height/2+4,text:`${fmt(row.value/doc.data[0].value*100)}%`,anchor:'end',small:true});});
    labels.push({x:plot.x+plot.w,y:bottom+36,text:uiText('相对首步'),anchor:'end',small:true});
  }
  return {marks,guides,labels,overlays};
}
