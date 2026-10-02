import {hierarchy,pack,tree,sum,max,scaleLinear} from 'd3';
import {recordId,populationId} from './data-identity.js';
import {circlePoints,rectPoints,sectorPoints} from './morph.js';
import {base,glyph,segment,key,fmt,compactNames} from './scientific-geometry.js';
import {interpolateMatrixRoll,applyMatrixRoll} from './matrix-roll-geometry.js';
import {hierarchy13} from './volume13-data.js';
import {contingency14} from './volume14-data.js';
import {structuralText as t,structuralBounds,structuralMatrixNames} from './structural-series-rules.js';
const center=points=>[sum(points,p=>p[0])/points.length,sum(points,p=>p[1])/points.length];
// The same two flanks as a sector: left→right across the upper arc, then
// right→left across the lower arc. A uniform circle perimeter has unrelated
// stations and folds into splinters when it is paired with the sector's arcs.
function matrixCircle(cx,cy,r){return [...Array.from({length:64},(_,i)=>{const a=Math.PI+i/63*Math.PI;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r];}),...Array.from({length:64},(_,i)=>{const a=i/63*Math.PI;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r];})];}
function matrixLayout(doc,view,w,h,{domain}={}){
 const radial=view==='structural-radial',plot={x:w<500?40:76,y:51,w:w-(w<500?60:96),h:h-101},l=base(doc,view,w,h,plot),{rows,columns}=structuralMatrixNames(doc),range=domain?.value||structuralBounds(doc).value,maxValue=Math.max(...range,0),colorScale=Math.max(...range.map(Math.abs))||1;
 const cw=plot.w/columns.length,ch=plot.h/rows.length,cx=plot.x+plot.w/2,cy=plot.y+plot.h/2,r=Math.min(plot.w,plot.h)/2,inner=r*.23,band=(r-inner)/rows.length,angle=Math.PI*2/columns.length;
 l.heading=t(`${rows.length} 行 × ${columns.length} 列 · 同一原表`,`${rows.length} rows × ${columns.length} columns · one source table`);
 l.details=radial?t(`颜色：${fmt(range[0])}—${fmt(range[1])} ${doc.unit} · × 缺测 · 面积不表示数量`,`Color: ${fmt(range[0])}–${fmt(range[1])} ${doc.unit} · × missing · area is not quantity`):t('圆面积：原值 · 空心圈：0 · ×：缺测','Circle area: original value · outlined circle: 0 · ×: missing');
 for(const row of doc.data){
  const i=rows.indexOf(row.matrixRow),j=columns.indexOf(row.matrixColumn),a0=-Math.PI/2+j*angle,a1=a0+angle,mid=(a0+a1)/2,p=radial?[cx+Math.cos(mid)*(inner+(i+.5)*band),cy+Math.sin(mid)*(inner+(i+.5)*band)]:[plot.x+(j+.5)*cw,plot.y+(i+.5)*ch],radius=row.value>0?Math.min(cw,ch)*.4*Math.sqrt(row.value/(maxValue||1)):2.8;
  const points=radial?sectorPoints(cx,cy,inner+i*band,inner+(i+1)*band,a0,a1):matrixCircle(...p,radius),common={identity:recordId(row),colorIdentity:recordId(row),index:row.inputIndex,row:row.inputIndex,transitionIndex:j};
  const tooltip=`${row.matrixRow} × ${row.matrixColumn} · ${row.value===null?t('缺测，非零','Missing, not zero'):String(row.value)+' '+doc.unit}`;
  const cell=glyph(l,common,'matrix-cell',points,p,{value:row.value,editable:'value',opacity:radial?.9:.78,paper:row.value===null||!radial&&row.value===0,stroke:row.value===null||row.value===0?1:.45,neutral:row.value===null,tone:row.value===null?null:row.value/colorScale,valueDomain:range,tooltip,cellAreaRepresentsValue:!radial&&row.value!==null,observedValue:row.value,matrixRoll:{radial,row:i,rows:rows.length,angle:mid,flatPitch:ch,radialPitch:band,flatCenter:[plot.x+(j+.5)*cw,cy],radialCenter:[cx+Math.cos(mid)*(inner+rows.length*band/2),cy+Math.sin(mid)*(inner+rows.length*band/2)]}});
  const cross=segment([p[0]-2.4,p[1]-2.4],[p[0]+2.4,p[1]+2.4],1),cross2=segment([p[0]-2.4,p[1]+2.4],[p[0]+2.4,p[1]-2.4],1);
  for(const [n,shape]of[cross,cross2].entries())glyph(l,common,`missing-${n}`,shape,p,{value:row.value,editable:'value',opacity:row.value===null?1:0,neutral:true,tooltip,matrixRoll:cell.matrixRoll});
 }
 const cn=compactNames(columns,radial?6:Math.max(3,Math.floor(cw/8))),rn=compactNames(rows,radial?6:w<500?4:8);
 columns.forEach((name,j)=>{const a=-Math.PI/2+(j+.5)*angle;l.labels.push(radial?{x:cx+Math.cos(a)*(r+13),y:cy+Math.sin(a)*(r+13)+3,text:cn[j],anchor:'middle',fontSize:9}:{x:plot.x+(j+.5)*cw,y:plot.y-10,text:cn[j],anchor:'middle',fontSize:10});});
 rows.forEach((name,i)=>l.labels.push(radial?{x:cx-3,y:cy-inner-(i+.5)*band+3,text:rn[i],anchor:'end',fontSize:Math.min(10,band*.65),dataLabel:true,halo:true}:{x:plot.x-7,y:plot.y+(i+.5)*ch+3,text:rn[i],anchor:'end',fontSize:10}));
 l.transitionCount=columns.length;l.valueDomain=range;l.total=doc.data.filter(r=>r.value!==null).length;return l;
}
function contingencyLayout(doc,view,w,h){
 const agreement=view==='structural-agreement',association=view==='structural-association',mosaic=view==='structural-mosaic',model=contingency14({...doc,template:doc.categories?'agreement':'association'}),plot={x:w<500?38:62,y:54,w:w-(w<500?54:84),h:h-99},l=base(doc,view,w,h,plot),cw=plot.w/model.columns.length,rh=plot.h/model.rows.length,maxExpected=max(model.cells,c=>Math.sqrt(c.expected)),maxResidual=Math.max(1,max(model.cells,c=>Math.abs(c.residual))),widthScale=cw*.78/maxExpected,heightScale=rh*.34/maxResidual;
 const tableW=Math.min(w*.28,w<500?85:160),side=Math.min(plot.w-tableW-22,plot.h-10),x0=plot.x,y0=plot.y+(plot.h-side)/2,k=side/model.total,tx=w-tableW-8,ty=plot.y+24,tableCell=Math.min(tableW/model.columns.length,(plot.h-35)/model.rows.length),rowStart=[0],columnStart=[0];
 model.rowTotals.forEach(v=>rowStart.push(rowStart.at(-1)+v));model.columnTotals.forEach(v=>columnStart.push(columnStart.at(-1)+v));
 l.heading=agreement?`B = ${fmt(model.agreement)} · ${t('完全一致率','Exact match')} ${fmt(model.exactRate*100)}%`:association?t('独立性偏差 · 不作显著性检验','Independence deviations · no significance test'):t('频数面积与独立性残差','Count area and independence residual');
 l.details=agreement?t('主图方块边长：一致频数 · 旁表保留全部计数','Main square side: agreement count · side table retains every count'):association?t('宽度 √E · 上方 O>E / 下方 O<E · 空心圈为零残差','Width √E · above O>E / below O<E · outlined circle is zero residual'):t('面积 = 频数/N · 灰：高于期望 / 红：低于期望 · 空心圈为零频数','Area = count/N · gray: above expectation / red: below · outlined circle: zero count');
 const cumulative=new Map();
 for(const c of model.cells){
  const row=c.row,index=row.inputIndex,common={identity:recordId(row),colorIdentity:recordId(row),index,row:index,transitionIndex:index},value=row.count;
  let points,p,empty=false,insideLabel;
  if(agreement){if(c.i===c.j){const width=model.columnTotals[c.j]*k,height=model.rowTotals[c.i]*k,s=value*k;p=[x0+columnStart[c.j]*k+width/2,y0+rowStart[c.i]*k+height/2];points=value?rectPoints(p[0]-s/2,p[1]-s/2,s,s):circlePoints(...p,2.5);empty=value===0;}else{p=[tx+(c.j+.5)*tableCell,ty+(c.i+.5)*tableCell];points=rectPoints(p[0]-tableCell*.43,p[1]-tableCell*.43,tableCell*.86,tableCell*.86);}}
  else if(association){const x=plot.x+(c.j+.5)*cw,y=plot.y+(c.i+.5)*rh,width=Math.sqrt(c.expected)*widthScale,height=Math.abs(c.residual)*heightScale;p=[x,y+(c.residual>=0?-height/2:height/2)];points=height?rectPoints(x-width/2,c.residual>=0?y-height:y,width,height):circlePoints(x,y,2.5);empty=height===0;}
  else{const x=plot.x+rowStart[c.i]/model.total*plot.w,width=model.rowTotals[c.i]/model.total*plot.w,prior=cumulative.get(c.i)||0,y=plot.y+prior/model.rowTotals[c.i]*plot.h,height=value/model.rowTotals[c.i]*plot.h;cumulative.set(c.i,prior+value);p=[x+width/2,y+height/2];points=value?rectPoints(x,y,width,height):circlePoints(...p,2.5);empty=value===0;if(height>20&&width>35)insideLabel={x:p[0],y:p[1]+3,text:`${c.row.column} · ${value}`,anchor:'middle',fontSize:w<500?8:10,dataLabel:true};}
  const tooltip=`${row.row} × ${row.column} · ${t('原始频数','Observed count')} ${value} ${doc.unit} · E=${fmt(c.expected)} · r=${fmt(c.residual)}`;
  const cellMark=glyph(l,common,'contingency-cell',points,p,{value,editable:'count',opacity:agreement&&c.i!==c.j?.12:.83,stroke:empty?1:.65,paper:empty,tone:agreement?.7:c.residual/maxResidual,solidTone:association,tooltip,count:value,expected:c.expected,residual:c.residual,encodedArea:mosaic?c.share:association?Math.abs(value-c.expected):null});
  if(insideLabel)l.labels.push({...insideLabel,contrastMark:cellMark});
  // A separate count-table layer preserves every record even when its observed
  // count is already represented by a diagonal agreement square in the main plot.
  const tablePoint=agreement?[tx+(c.j+.5)*tableCell,ty+(c.i+.5)*tableCell]:p;
  glyph(l,common,'count-table',agreement?rectPoints(tablePoint[0]-tableCell*.46,tablePoint[1]-tableCell*.46,tableCell*.92,tableCell*.92):circlePoints(...p,0),tablePoint,{value,editable:'count',opacity:agreement?.2:0,paper:true,stroke:.7,tooltip});
  if(agreement)l.labels.push({x:tablePoint[0],y:tablePoint[1]+3,text:String(value),anchor:'middle',fontSize:Math.min(w<500?9:12,tableCell*.4),dataLabel:true});
  if(association)l.labels.push({x:p[0],y:c.residual>=0?Math.min(...points.map(p=>p[1]))-5:Math.max(...points.map(p=>p[1]))+11,text:`${c.residual>0?'+':''}${fmt(c.residual)}`,anchor:'middle',fontSize:w<500?8:10});
 }
 if(doc.categories)model.rows.forEach((name,i)=>{const rows=doc.data.filter(r=>r.row===name||r.column===name),x=x0+columnStart[i]*k,y=y0+rowStart[i]*k,width=model.columnTotals[i]*k,height=model.rowTotals[i]*k,p=[x+width/2,y+height/2];glyph(l,{identity:populationId('contingency-margin',rows),recordIds:rows.map(recordId),group:name,index:i},'agreement-margin',agreement?rectPoints(x,y,width,height):circlePoints(...p,0),p,{opacity:agreement?.45:0,stroke:.7,paper:true,neutral:true,derived:true,tooltip:t(`${name} · 行边际 ${model.rowTotals[i]} / 列边际 ${model.columnTotals[i]} · 非单条观测`,`${name} · row margin ${model.rowTotals[i]} / column margin ${model.columnTotals[i]} · not one observation`)});});
 // Marginal enclosures sit behind the original record contours.
 l.marks.sort((a,b)=>Number(!a.derived)-Number(!b.derived));
 const rn=compactNames(model.rows,w<500?4:10),cn=compactNames(model.columns,w<500?5:12);
 if(agreement){l.labels.push({x:tx,y:plot.y+12,text:t('完整计数表','Complete counts'),fontSize:10});model.rows.forEach((name,i)=>{l.labels.push({x:x0+(columnStart[i]+model.columnTotals[i]/2)*k,y:y0+side+17,text:rn[i],anchor:'middle',fontSize:9});l.labels.push({x:plot.x-5,y:y0+(rowStart[i]+model.rowTotals[i]/2)*k+3,text:rn[i],anchor:'end',fontSize:9});});}
 if(association){model.columns.forEach((name,j)=>l.labels.push({x:plot.x+(j+.5)*cw,y:plot.y-10,text:cn[j],anchor:'middle',fontSize:10}));model.rows.forEach((name,i)=>{const y=plot.y+(i+.5)*rh;l.labels.push({x:plot.x-5,y:y+3,text:rn[i],anchor:'end',fontSize:10});l.guides.push({x1:plot.x,x2:plot.x+plot.w,y1:y,y2:y});});}
 if(mosaic)model.rows.forEach((name,i)=>l.labels.push({x:plot.x+(rowStart[i]+model.rowTotals[i]/2)/model.total*plot.w,y:plot.y+plot.h+17,text:rn[i],anchor:'middle',fontSize:10}));
 l.statistics=model;l.total=model.total;return l;
}
function hierarchyLayout(doc,view,w,h){
 const packed=view==='structural-pack',radial=view==='structural-tree',table=view==='structural-table',model=hierarchy13(doc.data),root=hierarchy(model.root,n=>n.children).sum(n=>n.children.length?0:n.row.value).sort((a,b)=>recordId(a.data.row).localeCompare(recordId(b.data.row))),plot={x:20,y:47,w:w-40,h:h-86},l=base(doc,view,w,h,plot),size=Math.min(plot.w,plot.h),cx=w/2,cy=plot.y+plot.h/2;
 const packedRoot=pack().size([size,size]).padding(3)(root.copy()),radialRoot=tree().size([Math.PI*2,size*.42])(root.copy()),nodes=root.descendants(),order=[];root.eachBefore(n=>order.push(n));const byId=new Map(nodes.map(n=>[n.data.row.id,n])),packedBy=new Map(packedRoot.descendants().map(n=>[n.data.row.id,n])),radialBy=new Map(radialRoot.descendants().map(n=>[n.data.row.id,n])),orderIndex=new Map(order.map((n,i)=>[n.data.row.id,i])),split=w*.52,right=w-44,step=plot.h/order.length,barH=Math.min(15,step*.62),valueScale=scaleLinear([0,model.total],[split,right]),indent=Math.min(w<500?9:16,(split-50)/(model.depth+1)),maxLeaf=max(nodes.filter(n=>!n.children),n=>n.data.row.value);
 const position=n=>{if(packed){const p=packedBy.get(n.data.row.id);return [cx-size/2+p.x,cy-size/2+p.y];}if(radial){const p=radialBy.get(n.data.row.id);return [cx+Math.sin(p.x)*p.y,cy-Math.cos(p.x)*p.y];}return [(split+valueScale(n.data.total))/2,plot.y+(orderIndex.get(n.data.row.id)+.5)*step];};
 const branchRows=n=>{const branch=n.ancestors().find(a=>a.depth===1);return branch?branch.descendants().map(q=>q.data.row):[n.data.row];};
 for(const n of nodes){if(!n.parent)continue;const p=position(n),a=position(n.parent);let points=segment(a,p,.75);if(table){const childIndex=orderIndex.get(n.data.row.id),parentIndex=orderIndex.get(n.parent.data.row.id),x=plot.x+(n.depth-.65)*indent;points=segment([x,plot.y+(parentIndex+.5)*step],[x,plot.y+(childIndex+.5)*step],.65);}
  glyph(l,{identity:key(recordId(n.data.row),'parent',recordId(n.parent.data.row)),recordIds:[recordId(n.data.row),recordId(n.parent.data.row)],colorIdentity:populationId('hierarchy-branch',branchRows(n)),group:n.data.row.label,index:n.data.row.inputIndex},'parent-edge',points,p,{opacity:packed?0:.43,neutral:true,derived:true,tooltip:`${n.parent.data.row.label} → ${n.data.row.label} · ${t('父子关系，长度不编码数量','Parenthood; length is not a measurement')}`});
 }
 for(const n of nodes){const row=n.data.row,p=position(n),leaf=!n.children,common={identity:recordId(row),colorIdentity:populationId('hierarchy-branch',branchRows(n)),group:row.label,index:row.inputIndex,row:row.inputIndex,transitionIndex:row.inputIndex},radius=packed?packedBy.get(row.id).r:leaf?Math.min(w<500?7:10,size*.045)*Math.sqrt(row.value/maxLeaf):2.8;
  const points=table?rectPoints(split,p[1]-barH/2,valueScale(n.data.total)-split,barH):circlePoints(...p,radius),tooltip=`${row.label} · id=${row.id} · parent=${row.parent} · ${t('原值','Original value')} ${row.value} ${doc.unit} · ${t('叶值汇总','Leaf subtotal')} ${n.data.total} ${doc.unit}`;
  const nodeMark=glyph(l,common,'hierarchy-node',points,p,{value:row.value,editable:leaf?'value':'label',opacity:leaf?.8:packed?.27:.6,stroke:packed||!leaf?.8:.4,paper:!leaf&&!table,tooltip,leaf,subtotal:n.data.total,originalValue:row.value,quantity:leaf?'leaf-value':'subtree-envelope'});
  if(table){const label=compactNames([row.label],Math.max(3,Math.floor((split-plot.x-n.depth*indent-10)/(w<500?6:7))))[0];l.labels.push({x:plot.x+n.depth*indent,y:p[1]+3,text:label,fontSize:Math.min(w<500?10:12,step*.7)});l.labels.push({x:right+5,y:p[1]+3,text:fmt(n.data.total),fontSize:Math.min(10,step*.65)});}
  else if(radial){if(n.depth===0||leaf){const r=radialBy.get(row.id),offset=leaf?9:0,align=n.depth===0?'middle':Math.sin(r.x)>=0?'start':'end';l.labels.push({x:p[0]+(align==='start'?offset:align==='end'?-offset:0),y:p[1]+(n.depth===0?-8:3),text:compactNames([row.label],w<500?5:12)[0],anchor:align,fontSize:w<500?8:10});}}
  else if(leaf&&radius>13)l.labels.push({x:p[0],y:p[1]+3,text:compactNames([row.label],Math.max(2,Math.floor(radius/4)))[0],anchor:'middle',fontSize:Math.min(11,radius/2.2),dataLabel:true,contrastMark:nodeMark});
 }
 l.heading=t(`${model.nodes.length} 个真实节点 · ${model.depth+1} 层 · 叶值 ${fmt(model.total)} ${doc.unit}`,`${model.nodes.length} actual nodes · ${model.depth+1} levels · leaf total ${fmt(model.total)} ${doc.unit}`);
 l.details=packed?t('叶圆面积：原值 · 父圆：含留白的包络','Leaf-circle area: original value · parent circles: padded enclosures'):radial?t('叶点面积：原值 · 枝长与角度仅用于布局','Leaf-point area: original value · edge lengths and angles are layout only'):t('共同根总量尺度 · 内部原值保持 0 · 父子汇总重叠','Shared root-total scale · internal original values stay 0 · subtotals overlap');
 l.statistics=model;l.total=model.total;l.scales={value:valueScale};return l;
}
export function layoutStructural(doc,view,w=800,h=440,options={}){return doc.family==='matrix-cell'?matrixLayout(doc,view,w,h,options):doc.family==='contingency'?contingencyLayout(doc,view,w,h):hierarchyLayout(doc,view,w,h);}
export function interpolateStructuralMark(from,old,next,q){
 if(old?.role==='matrix-cell'&&next?.role==='matrix-cell')return interpolateMatrixRoll(from,old,next,q);
 if(old?.role?.startsWith('missing-')&&next?.role===old.role&&old.matrixRoll&&next.matrixRoll){if(q===0)return from;if(q===1)return next.points;const points=from.map((p,i)=>p.map((v,k)=>v+(next.points[i][k]-v)*q));return applyMatrixRoll(points,from,old,next,q);}
 return null;
}
