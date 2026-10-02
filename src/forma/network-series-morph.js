import {chord,chordDirected,descending,extent,max,sum} from 'd3';
import {sankey,sankeyJustify} from 'd3-sankey';
import {networkLayout} from './volume7-data.js';
import {cyclicFlow13} from './volume13-data.js';
import {recordId} from './data-identity.js';
import {sectorPoints,polygonPoints} from './morph.js';
import {base,glyph,key,fmt,compactNames,interpolateDensityContour} from './scientific-geometry.js';
import {scientificMotionState,setScientificMotionState} from './scientific-motion-state.js';
import {networkText as t,networkNodes} from './network-series-rules.js';
const mix=(a,b,q)=>a+(b-a)*q,point=(a,b,q)=>[mix(a[0],b[0],q),mix(a[1],b[1],q)],polar=(cx,cy,r,a)=>[cx+Math.sin(a)*r,cy-Math.cos(a)*r];
const cubic=(a,b,c,d,q)=>[0,1].map(k=>(1-q)**3*a[k]+3*(1-q)**2*q*b[k]+3*(1-q)*q*q*c[k]+q**3*d[k]);
const quadratic=(a,b,c,q)=>[0,1].map(k=>(1-q)**2*a[k]+2*(1-q)*q*b[k]+q*q*c[k]);
const sample=fn=>Array.from({length:64},(_,i)=>fn(i/63));
const nodeCircle=(cx,cy,r)=>[...sample(q=>[cx+r*Math.cos(Math.PI+q*Math.PI),cy+r*Math.sin(Math.PI+q*Math.PI)]),...sample(q=>[cx+r*Math.cos(q*Math.PI),cy+r*Math.sin(q*Math.PI)])];
// Flow nodes are tall narrow bodies. Pair their long vertical sides with the
// arc's long flanks; matching the short horizontal side to a whole arc creates
// a broad rotating slab halfway through an otherwise thin-node transition.
const nodeRect=(x,y,w,h)=>[...sample(q=>[x+w,y+h*q]),...sample(q=>[x,y+h*(1-q)])];
function tube(center,width){
 const sides=center.map((p,i)=>{const a=center[Math.max(0,i-1)],b=center[Math.min(center.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;return [[p[0]-dy/len*width/2,p[1]+dx/len*width/2],[p[0]+dy/len*width/2,p[1]-dx/len*width/2]];});
 const section=fn=>Array.from({length:32},(_,i)=>fn(i/32)),edge=(side,q)=>{const at=q*(sides.length-1),i=Math.min(sides.length-2,Math.floor(at));return point(sides[i][side],sides[i+1][side],at-i);};
 // The four sections match the chord ribbon exactly: source cap, outward
 // side, target cap, return side. Pairing two long flanks with four chord
 // sections twists the interpolated ribbon and detaches it from its nodes.
 return [...section(q=>point(sides[0][0],sides[0][1],q)),...section(q=>edge(1,q)),...section(q=>point(sides.at(-1)[1],sides.at(-1)[0],q)),...section(q=>edge(0,1-q))];
}
function arrow(a,b,size){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;return polygonPoints([[b[0],b[1]],[b[0]-ux*size-uy*size*.48,b[1]-uy*size+ux*size*.48],[b[0]-ux*size+uy*size*.48,b[1]-uy*size-ux*size*.48]]);}
function ribbon(c,cx,cy,r,directed){
 const a=c.source,b=c.target,sourceStart=polar(cx,cy,r,a.startAngle),sourceEnd=polar(cx,cy,r,a.endAngle),head=directed?Math.min(7,r*.07):0,targetStart=polar(cx,cy,r-head,b.startAngle),targetEnd=polar(cx,cy,r-head,b.endAngle),targetTip=polar(cx,cy,r,(b.startAngle+b.endAngle)/2),middle=[cx,cy];
 const section=fn=>Array.from({length:32},(_,i)=>fn(i/32));
 return [...section(q=>polar(cx,cy,r,mix(a.startAngle,a.endAngle,q))),...section(q=>quadratic(sourceEnd,middle,targetStart,q)),...section(q=>directed?(q<.5?point(targetStart,targetTip,q*2):point(targetTip,targetEnd,q*2-1)):polar(cx,cy,r,mix(b.startAngle,b.endAngle,q))),...section(q=>quadratic(targetEnd,middle,sourceStart,q))];
}
function flowing(doc,view,w,h,plot){
 const rows=[...doc.data].sort((a,b)=>recordId(a).localeCompare(recordId(b))),nodes=networkNodes(doc),links=new Map(),positions=new Map();
 if(view==='flow-sankey'){
  const graph=sankey().nodeId(n=>n.name).nodeWidth(w<500?6:9).nodePadding(w<500?13:22).nodeAlign(sankeyJustify).nodeSort(null).extent([[plot.x,plot.y+12],[plot.x+plot.w,plot.y+plot.h-12]])({nodes:nodes.map(n=>({name:n.name})),links:rows.map(r=>({...r}))});
  graph.links.forEach(l=>{const a=[l.source.x1,l.y0],b=[l.target.x0,l.y1],mid=(a[0]+b[0])/2,center=sample(q=>cubic(a,[mid,a[1]],[mid,b[1]],b,q));links.set(recordId(l),{center,width:l.width,points:tube(center,l.width)});});
  graph.nodes.forEach(n=>positions.set(n.name,{p:[(n.x0+n.x1)/2,(n.y0+n.y1)/2],points:nodeRect(n.x0,n.y0,n.x1-n.x0,n.y1-n.y0),label:{x:n.depth===0?n.x0-7:n.x1+7,y:(n.y0+n.y1)/2+3,anchor:n.depth===0?'end':'start'}}));
 }else{
  // The same native SCC condensation and return lanes preserve cyclic flows.
  const graph=cyclicFlow13(rows,{width:plot.w+44,height:plot.h+76,compact:true}),ox=plot.x-22,oy=plot.y-38;
  graph.links.forEach(l=>{const a=[l.source.x+l.source.width+ox,l.y0+oy],b=[l.target.x+ox,l.y1+oy],mid=(a[0]+b[0])/2,lane=l.lane+oy,bend=12,center=sample(q=>!l.returning?cubic(a,[mid,a[1]],[mid,b[1]],b,q):q<1/3?cubic(a,[a[0]+bend,a[1]],[a[0]+bend,lane],[a[0],lane],q*3):q<2/3?point([a[0],lane],[b[0],lane],q*3-1):cubic([b[0],lane],[b[0]-bend,lane],[b[0]-bend,b[1]],b,q*3-2));links.set(recordId(l.row),{center,width:l.width,points:tube(center,l.width),returning:l.returning});});
  graph.nodes.forEach(n=>positions.set(n.name,{p:[n.x+ox+n.width/2,n.y+oy+n.height/2],points:nodeRect(n.x+ox,n.y+oy,n.width,n.height),label:{x:n.x+ox+n.width/2,y:n.y+oy-8,anchor:'middle'}}));
 }
 return {links,positions};
}
function relationships(doc,view,w,h,plot,domain){
 const nodes=networkNodes(doc),names=nodes.map(n=>n.name),rows=[...doc.data].sort((a,b)=>recordId(a).localeCompare(recordId(b))),positions=new Map(),links=new Map(),maximum=Math.max(max(rows,r=>r.value),domain?.value?.[1]||0),chordView=view.endsWith('chord'),directed=doc.family==='network-directed';
 if(chordView){
  const matrix=names.map(()=>names.map(()=>0));rows.forEach(r=>{const i=names.indexOf(r.source),j=names.indexOf(r.target);matrix[i][j]=r.value;if(!directed)matrix[j][i]=r.value;});
  const model=(directed?chordDirected():chord()).padAngle(directed?.055:.075).sortSubgroups(descending)(matrix),r=Math.min(plot.w*.38,plot.h*.43),cx=w/2,cy=plot.y+plot.h/2;
  const lookup=new Map(model.map(c=>[JSON.stringify(directed?[names[c.source.index],names[c.target.index]]:[names[c.source.index],names[c.target.index]].sort()),c]));
  rows.forEach(row=>{let c=lookup.get(JSON.stringify(directed?[row.source,row.target]:[row.source,row.target].sort()));if(names[c.source.index]!==row.source)c={...c,source:c.target,target:c.source};const a=polar(cx,cy,r-5,(c.source.startAngle+c.source.endAngle)/2),b=polar(cx,cy,r-5,(c.target.startAngle+c.target.endAngle)/2),center=sample(q=>quadratic(a,[cx,cy],b,q));links.set(recordId(row),{points:ribbon(c,cx,cy,r-5,directed),center,width:(c.source.endAngle-c.source.startAngle)*(r-5),angles:{source:[c.source.startAngle,c.source.endAngle],target:[c.target.startAngle,c.target.endAngle]}});});
  model.groups.forEach(g=>{const a=(g.startAngle+g.endAngle)/2,p=polar(cx,cy,r+2.5,a),labelPoint=polar(cx,cy,r+(w<500?14:20),a);positions.set(names[g.index],{p,points:sectorPoints(cx,cy,r,r+5,g.startAngle-Math.PI/2,g.endAngle-Math.PI/2),angleRange:[g.startAngle,g.endAngle],label:{x:labelPoint[0],y:labelPoint[1]+3,anchor:Math.abs(Math.sin(a))<.16?'middle':Math.sin(a)>0?'start':'end'}});});
 }else if(view==='network-arc'){
  const y=plot.y+plot.h-20,span=plot.w/(nodes.length-1),maxGap=max(rows,r=>Math.abs(names.indexOf(r.source)-names.indexOf(r.target)));
  nodes.forEach((n,i)=>{const p=[plot.x+i*span,y];positions.set(n.name,{p,points:nodeCircle(...p,3.5),label:{x:p[0],y:y+19,anchor:'middle'}});});
  rows.forEach(row=>{const a=positions.get(row.source).p,b=positions.get(row.target).p,distance=Math.abs(names.indexOf(row.source)-names.indexOf(row.target)),rise=(plot.h-35)*distance/maxGap,center=sample(q=>cubic(a,[a[0],a[1]-rise*1.33],[b[0],b[1]-rise*1.33],b,q)),width=row.value/maximum*(w<500?3:5);links.set(recordId(row),{center,width,points:tube(center,width)});});
 }else{
  const model=networkLayout(rows),xd=extent(model.nodes,n=>n.x),yd=extent(model.nodes,n=>n.y),factor=Math.min((plot.w-28)/(xd[1]-xd[0]||1),(plot.h-35)/(yd[1]-yd[0]||1)),xy=n=>[plot.x+plot.w/2+(n.x-(xd[0]+xd[1])/2)*factor,plot.y+plot.h/2+(n.y-(yd[0]+yd[1])/2)*factor];
  model.nodes.forEach(n=>{const p=xy(n);positions.set(n.id,{p,points:nodeCircle(...p,4),label:{x:p[0],y:p[1]-10,anchor:'middle'}});});
  model.links.forEach(row=>{const center=sample(q=>point(xy(row.source),xy(row.target),q)),width=row.value/maximum*(w<500?3:5);links.set(recordId(row),{center,width,points:tube(center,width)});});
 }
 return {links,positions};
}
export function layoutNetwork(doc,view,w=800,h=440,{domain}={}){
 const directed=doc.family==='network-directed',flow=['flow-sankey','flow-cycle'].includes(view),plot={x:w<500?40:68,y:54,w:w-(w<500?80:136),h:h-102},layout=base(doc,view,w,h,plot),nodes=networkNodes(doc),{links,positions}=flow?flowing(doc,view,w,h,plot):relationships(doc,view,w,h,plot,domain),rowOrder=new Map([...doc.data].sort((a,b)=>recordId(a).localeCompare(recordId(b))).map((r,i)=>[recordId(r),i]));
 for(const row of doc.data){const edge=links.get(recordId(row)),p=edge.center[31],common={identity:recordId(row),colorIdentity:recordId(row),index:row.inputIndex,row:row.inputIndex,transitionIndex:rowOrder.get(recordId(row))},tooltip=`${row.source} ${directed?'→':'↔'} ${row.target} · ${row.value} ${doc.unit}`,networkAttachments=[row.source,row.target].map((name,i)=>{
   const position=positions.get(name),cap=edge.points[i?80:16],node=nodes.find(n=>n.name===name),station=flow?(cap[1]-position.points[0][1])/(position.points[63][1]-position.points[0][1]):position.angleRange?((edge.angles[i?'target':'source'][0]+edge.angles[i?'target':'source'][1])/2-position.angleRange[0])/(position.angleRange[1]-position.angleRange[0]):.5,side=flow?i:position.angleRange?2:.5,reference={nodeKey:key(node.identity,'network-node'),nodePoints:position.points,station,side,offset:[0,0]},sampled=networkAttachmentPoint(reference);
   reference.offset=cap.map((v,k)=>v-sampled[k]);return reference;
  });
  glyph(layout,common,'network-edge',edge.points,p,{value:row.value,editable:'value',opacity:flow?.42:view.endsWith('chord')?.38:.64,stroke:view.endsWith('chord')?.45:0,tooltip,width:edge.width,angles:edge.angles,returning:!!edge.returning,originalSource:row.source,originalTarget:row.target,networkEndpoints:[edge.center[0],edge.center.at(-1)],networkAttachments});
  if(directed){const end=edge.center.at(-1),prior=edge.center.at(-3),size=w<500?5.5:7;glyph(layout,common,'network-direction',arrow(prior,end,size),end,{value:row.value,editable:'value',opacity:view==='flow-chord'?0:.95,tooltip,derived:true,networkEdgeKey:key(common.identity,'network-edge'),directionSize:size});}
 }
 const labels=compactNames(nodes.map(n=>n.name),w<500?4:9);
 for(const [i,n]of nodes.entries()){const position=positions.get(n.name),tooltip=directed?`${n.name} · ${t('流入','In')} ${fmt(n.incoming)} · ${t('流出','Out')} ${fmt(n.outgoing)} · ${t('入−出','In−out')} ${fmt(n.incoming-n.outgoing)} ${doc.unit}`:`${n.name} · ${t('相邻联系合计','Incident total')} ${fmt(n.incident)} ${doc.unit}`;
  glyph(layout,{identity:n.identity,recordIds:n.rows.map(recordId),index:i,group:n.name},'network-node',position.points,position.p,{value:n.incident,opacity:.9,paper:!flow&&!view.endsWith('chord'),stroke:flow||view.endsWith('chord')?0:1,neutral:true,derived:true,tooltip,incoming:n.incoming,outgoing:n.outgoing,incident:n.incident});
  layout.labels.push({...position.label,text:labels[i],fullText:n.name,fontSize:w<500?9:11,dataLabel:true,halo:true});
 }
 layout.heading=t(`${nodes.length} 个节点 · ${doc.data.length} 条原始${directed?'有向流':'无向联系'}`,`${nodes.length} nodes · ${doc.data.length} original ${directed?'directed flows':'undirected edges'}`);
 layout.details=directed?(view==='flow-sankey'?t('带宽：流量 · 中间节点守恒 · 各边可能重复通过同一批对象','Ribbon width: flow · balanced intermediate nodes · transfers may repeat the same population'):view==='flow-cycle'?t('带宽：流量 · 回流与净额保留 · 不将循环当新增','Ribbon width: flow · return links and net balances retained · recirculation is not new flow'):t('箭头保留方向 · 端宽：流量 · 往返分别计量','Arrows retain direction · end width: flow · opposite directions counted separately')):view==='network-chord'?t('弦带端宽：关系权重 · 节点合计相互重叠','Ribbon-end width: edge weight · incident node totals overlap'):t('线宽：关系权重 · 布局距离、跨度与角度不是测量值','Width: edge weight · layout distance, span and angle are not measurements');
 layout.total=sum(doc.data,r=>r.value);layout.statistics={nodes,edges:doc.data,edgeTotal:layout.total};return layout;
}

// A cap keeps its original node and position along that node's two flanks.
// Chord caps are one native five-pixel gap inward from the node arc (side=2);
// flow caps use the source's right and target's left flank (side=0/1).
// The tiny sampling offset retains exact native caps without snapping to an
// unrelated nearest vertex or changing any edge's source/target identity.
export function networkAttachmentPoint(reference,nodePoints=reference.nodePoints){
 const u=Math.max(0,Math.min(1,reference.station))*63,i=Math.min(62,Math.floor(u)),t=u-i,a=point(nodePoints[i],nodePoints[i+1],t),b=point(nodePoints[127-i],nodePoints[126-i],t),p=point(a,b,reference.side);
 return p.map((v,k)=>v+reference.offset[k]);
}
function interpolatedAttachments(from,old,next,q,nodeContours){
 const displayed=scientificMotionState(from)?.networkAttachments||scientificMotionState(old.points)?.networkAttachments||old.networkAttachments;
 if(!displayed||!next.networkAttachments)return null;
 return next.networkAttachments.map((b,i)=>{const a=displayed[i];if(a.nodeKey!==b.nodeKey)return null;return {nodeKey:b.nodeKey,nodePoints:nodeContours?.get(b.nodeKey)||interpolateDensityContour(a.nodePoints,b.nodePoints,q),station:mix(a.station,b.station,q),side:mix(a.side,b.side,q),offset:point(a.offset,b.offset,q)};});
}
function shiftNetworkCaps(points,source,target){
 const a=source.map((v,k)=>v-points[16][k]),b=target.map((v,k)=>v-points[80][k]),result=points.map(p=>[...p]),shift=(index,u)=>{for(let k=0;k<2;k++)result[index][k]+=a[k]*(1-u)+b[k]*u;};
 for(let i=0;i<=32;i++){shift(32+i,i/32);shift((128-i)%128,i/32);}for(let i=1;i<32;i++){shift(i,0);shift(64+i,1);}return result;
}

// Run after the player has written every node. Cascaded node and edge clocks
// differ, so cap positions must follow the actual displayed node envelope.
export function paintNetworkAttachments(chart,from,to,p){
 if(p===0||p===1||!to.marks.some(m=>m.role==='network-edge'))return;
 const old=new Map(from.marks.map(m=>[m.key,m]));
 for(const mark of to.marks.filter(m=>m.role==='network-edge')){
  const points=chart.current.get(mark.key),state=scientificMotionState(points),previous=old.get(mark.key);if(!previous?.networkAttachments)continue;
  // Rebuild in the ribbon's centerline frame instead of shearing already
  // curled flanks. A large cascaded cap correction can otherwise fold a band.
  const frame=state?.networkFrame||{from:points,old:previous,next:mark,q:0},corrected=interpolateNetworkMark(frame.from,frame.old,frame.next,frame.q,{nodeContours:chart.current});
  if(corrected)chart.writeShape(mark.key,corrected);
 }
 for(const mark of to.marks.filter(m=>m.role==='network-direction')){
  const edge=chart.current.get(mark.networkEdgeKey);if(!edge)continue;
  const end=edge[80],prior=point(edge[63],edge[97],.5);chart.writeShape(mark.key,arrow(prior,end,mark.directionSize));
 }
}

// A ribbon's paired flanks live in the local frame of its centerline. Blending
// screen coordinates can reverse their order as a chord rolls into an arc.
// Reconstruct the centerline from the displayed contour so interrupted morphs
// keep their actual geometry, without snapping back to an earlier layout.
export function interpolateNetworkMark(from,old,next,q,{nodeContours}={}){
 if(old?.role==='network-node'&&next?.role==='network-node')return interpolateDensityContour(from,next.points,q);
 if(old?.role!=='network-edge'||next?.role!=='network-edge'||from?.length!==128||next.points?.length!==128)return null;
 if(!nodeContours){if(q===0)return from;if(q===1)return next.points;}
 const frames=points=>{
  const centers=Array.from({length:33},(_,i)=>point(points[32+i],points[(128-i)%128],.5));
  const tangents=centers.map((p,i)=>{const a=centers[Math.max(0,i-1)],b=centers[Math.min(32,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;return [dx/length,dy/length];});
  return {centers,tangents};
 };
 const attachments=interpolatedAttachments(from,old,next,q,nodeContours),caps=attachments?.every(Boolean)?attachments.map(ref=>networkAttachmentPoint(ref)):null;
 const a=frames(from),b=frames(next.points),profile=frame=>{const start=frame.centers[0],end=frame.centers[32],dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy)||1,tx=dx/length,ty=dy/length;return frame.centers.map(p=>[(p[0]-start[0])*tx/length+(p[1]-start[1])*ty/length,-(p[0]-start[0])*ty+(p[1]-start[1])*tx]);},pa=profile(a),pb=profile(b),start=caps?.[0]||point(a.centers[0],b.centers[0],q),end=caps?.[1]||point(a.centers[32],b.centers[32],q),dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy)||1,centers=pa.map((p,i)=>{const u=mix(p[0],pb[i][0],q),v=mix(p[1],pb[i][1],q);return [start[0]+dx*u-dy/length*v,start[1]+dy*u+dx/length*v];}),tangents=centers.map((p,i)=>{const before=centers[Math.max(0,i-1)],after=centers[Math.min(32,i+1)],dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy);if(length>1e-10)return [dx/length,dy/length];const angle=Math.atan2(a.tangents[i][1],a.tangents[i][0])+Math.atan2(a.tangents[i][0]*b.tangents[i][1]-a.tangents[i][1]*b.tangents[i][0],a.tangents[i][0]*b.tangents[i][0]+a.tangents[i][1]*b.tangents[i][1])*q;return [Math.cos(angle),Math.sin(angle)];});
 const local=(p,frame,i)=>{const dx=p[0]-frame.centers[i][0],dy=p[1]-frame.centers[i][1],[tx,ty]=frame.tangents[i];return [dx*tx+dy*ty,-dx*ty+dy*tx];};
 const capSpan=()=>Math.max(...[0,32].map(i=>mix(Math.hypot(from[32+i][0]-from[(128-i)%128][0],from[32+i][1]-from[(128-i)%128][1]),Math.hypot(next.points[32+i][0]-next.points[(128-i)%128][0],next.points[32+i][1]-next.points[(128-i)%128][1]),q))),span=capSpan(),travel=Math.sin(Math.PI*q)**2,clearance=1-.66*travel*Math.min(1,span/18),compression=clearance*(1-(1-Math.min(1,length/Math.max(1e-12,span*2)))*travel);
 const transform=(index,station)=>{const aa=local(from[index],a,station),bb=local(next.points[index],b,station),u=mix(aa[0],bb[0],q)*compression,v=mix(aa[1],bb[1],q)*compression,[tx,ty]=tangents[station],c=centers[station];return [c[0]+u*tx-v*ty,c[1]+u*ty+v*tx];};
 const points=Array(128);for(let i=0;i<=32;i++){points[32+i]=transform(32+i,i);points[(128-i)%128]=transform((128-i)%128,i);}for(let i=1;i<32;i++){points[i]=transform(i,0);points[64+i]=transform(64+i,32);}
 const corrected=shiftNetworkCaps(points,caps?.[0]||point(from[16],next.points[16],q),caps?.[1]||point(from[80],next.points[80],q));
 return attachments?setScientificMotionState(corrected,{networkAttachments:attachments,networkFrame:{from,old,next,q}}):corrected;
}
