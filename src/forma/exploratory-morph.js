import {spatialPose} from './spatial-morph-geometry.js';
import {uiText,uiMessage} from './locale.js';
import {scaleLinear} from 'd3';
import {recordId,populationId} from './data-identity.js';
import {circlePoints,rectPoints,polygonPoints} from './morph.js';
import {base,axis,dot,line,glyph,segment,key,fmt,short,compactNames,padded,pointMix} from './scientific-geometry.js';
import {exploratoryBounds} from './exploratory-rules.js';
import {clusterNumericMatrix} from './matrix-clustering.js';

const unique=a=>[...new Set(a)];
const collapsed=p=>circlePoints(...p,0);
const colorIdentity=(doc,row)=>populationId('exploratory-group',doc.data.filter(r=>(r.group||'')===(row.group||'')));

export function layoutNumericMatrix(doc,view,w,h,{domain}={}){
  const clustered=view==='matrix-clustered',clustering=clusterNumericMatrix(doc.data),rowNames=clustered?clustering.rowNames:unique(doc.data.map(r=>r.rowName)),columns=clustered?clustering.columns:unique(doc.data.map(r=>r.column)),bubbles=view==='matrix-bubbles';
  // Reserve distinct rows for column labels, a color-scale reference, and the
  // value range. Custom diverging legends must not overlap the last column.
  const treeWidth=clustered?(w>=600?38:22):0,plot={x:(w>=600?86:54)+treeWidth,y:clustered?80:48,w:w-(w>=600?117:77)-treeWidth,h:h-(clustered?148:116)},layout=base(doc,view,w,h,plot),valueDomain=domain?.value||exploratoryBounds(doc).value;
  const cw=plot.w/columns.length,ch=plot.h/rowNames.length,side=Math.min(cw,ch),maximum=Math.max(0,valueDomain[1]),signed=valueDomain[0]<0,limit=Math.max(Math.abs(valueDomain[0]),Math.abs(valueDomain[1]))||1;
  layout.heading=uiMessage`${rowNames.length} 行 × ${columns.length} 列`;layout.details=clustered?uiText('原值 · 欧氏距离 · 平均连接'):bubbles?uiText('圆面积 = 非负原值 · 斜线 = 缺失'):uiText('色深 = 原值 · 斜线 = 缺失');
  const rowLabels=compactNames(rowNames,w>=600?11:5),columnLabels=compactNames(columns,Math.max(2,Math.floor(cw/11)));
  rowNames.forEach((name,i)=>layout.labels.push({x:plot.x-10-treeWidth,y:plot.y+(i+.5)*ch+3,text:rowLabels[i],fullText:name,anchor:'end',fontSize:10}));
  columns.forEach((name,i)=>layout.labels.push({x:plot.x+(i+.5)*cw,y:plot.y+plot.h+19,text:columnLabels[i],fullText:name,anchor:'middle',fontSize:10}));
  const missing=doc.data.filter(r=>r.value===null).length;
  layout.labels.push({x:plot.x,y:h-6,text:w>=650?uiMessage`范围 ${fmt(valueDomain[0])}–${fmt(valueDomain[1])} ${doc.unit} · ${missing} 处缺失`:uiMessage`${doc.unit} · ${missing} 处缺失`,anchor:'start',fontSize:10});
  doc.data.forEach((r,index)=>{
    const i=rowNames.indexOf(r.rowName),j=columns.indexOf(r.column),p=[plot.x+(j+.5)*cw,plot.y+(i+.5)*ch],isMissing=r.value===null,zero=r.value===0;
    const rect=rectPoints(p[0]-cw*.43,p[1]-ch*.43,cw*.86,ch*.86),radius=maximum?side*.41*Math.sqrt(Math.max(0,r.value??0)/maximum):0;
    const points=isMissing?rect:bubbles?circlePoints(...p,radius):rect;
    const common={identity:key('matrix-cell',recordId(r)),index,transitionIndex:index,group:uiText('观测'),row:r.row};
    const tooltip=`${r.rowName} · ${r.column} · ${isMissing?uiText('未采集'):fmt(r.value)+' '+doc.unit}`;
    const tone=isMissing?null:signed?r.value/limit:(r.value-valueDomain[0])/(valueDomain[1]-valueDomain[0]||1);
    glyph(layout,common,'cell',points,p,{opacity:1,stroke:isMissing||zero?.7:0,paper:isMissing||bubbles&&zero,tone,value:r.value,valueDomain,tooltip,editable:'value',matrixCell:true,matrixClustered:clustered});
    // Missingness has a visible symbol in BOTH encodings, never a zero-area dot.
    const q=side*.22;line(layout,common,'missing-a',[p[0]-q,p[1]+q],[p[0]+q,p[1]-q],p,{opacity:isMissing?.6:0,width:.8,tooltip});
    line(layout,common,'missing-b',[p[0]-q,p[1]+q*.35],[p[0]+q*.35,p[1]-q],p,{opacity:isMissing?.6:0,width:.8,tooltip});
    if(!isMissing&&(zero||!bubbles&&cw>35&&ch>21||bubbles&&radius>15))layout.labels.push({x:p[0],y:p[1]+3,text:fmt(r.value,{significantDigits:Math.max(2,Math.min(6,Math.floor(cw/8)))}),fullText:fmt(r.value),anchor:'middle',fontSize:Math.min(11,side*.24),dataLabel:true,...(!(bubbles&&zero)?{contrastMark:{tone,value:r.value,valueDomain}}:{})});
  });
  if(clustering){
    const drawTree=(node,items,order,horizontal,max)=>{
      if(!node.children)return;
      const pos=n=>n.indices.reduce((sum,i)=>sum+order.indexOf(items[i].name),0)/n.indices.length+.5,depth=n=>max?n.distance/max*(horizontal?Math.max(15,treeWidth-8):24):0;
      const [a,b]=node.children,common={identity:JSON.stringify([horizontal?'row-cluster':'column-cluster',...node.indices.map(i=>items[i].id).sort()]),index:0,transitionIndex:0,group:uiText('聚类'),recordIds:doc.data.filter(r=>node.indices.some(i=>items[i].name===(horizontal?r.rowName:r.column))).map(r=>r._id)},tooltip=uiMessage`聚类合并距离 ${fmt(node.distance)} · 欧氏距离 / 平均连接`;
      const p=n=>horizontal?[plot.x-5-depth(n),plot.y+pos(n)*ch]:[plot.x+pos(n)*cw,plot.y-5-depth(n)],pa=p(a),pb=p(b),pn=p(node),elbowA=horizontal?[pn[0],pa[1]]:[pa[0],pn[1]],elbowB=horizontal?[pn[0],pb[1]]:[pb[0],pn[1]];
      for(const [role,start,end]of [['a',pa,elbowA],['join',elbowA,elbowB],['b',elbowB,pb]])line(layout,common,role,start,end,pn,{opacity:clustered?.65:0,width:.8,tooltip,derived:true,neutral:true,clusterBranch:true});
      drawTree(a,items,order,horizontal,max);drawTree(b,items,order,horizontal,max);
    };
    drawTree(clustering.rowTree,clustering.rowItems,rowNames,true,clustering.rowTree.distance);drawTree(clustering.columnTree,clustering.columnItems,columns,false,clustering.columnTree.distance);
  }
  layout.valueDomain=valueDomain;return layout;
}

// Reorder rows, then columns. Each leg is still an interpolation of the same
// cell contour, including when the transition starts from an interrupted pose.
export function interpolateMatrixCell(points,old,mark,q){
  if(!old?.matrixCell||!mark.matrixCell||!old.matrixClustered&&!mark.matrixClustered)return null;
  const vertical=Math.min(1,q/.55),horizontal=Math.max(0,(q-.45)/.55);
  return points.map((p,i)=>[p[0]+(mark.points[i][0]-p[0])*horizontal,p[1]+(mark.points[i][1]-p[1])*vertical]);
}

export function layoutOrderedEstimates(doc,view,w,h,{domain}={}){
  const rows=[...doc.data].sort((a,b)=>Date.parse(a.period)-Date.parse(b.period)),bounds=domain||exploratoryBounds(doc);
  const plot={x:w>=600?59:44,y:45,w:w-(w>=600?87:64),h:h-95},layout=base(doc,view,w,h,plot);
  const x=scaleLinear(bounds.time,[plot.x,plot.x+plot.w]),y=scaleLinear(padded(bounds.value),[plot.y+plot.h,plot.y]).nice(4);
  const band=view==='ordered-estimate-band',intervals=view==='ordered-estimate-intervals';
  axis(layout,y,false,{title:doc.unit});layout.heading=doc.intervalLabel;layout.details=uiText('真实日期间距 · 输入上下界');
  const stride=Math.max(1,Math.ceil(rows.length/(w>=600?7:3)));
  rows.forEach((r,i)=>{if(i===0||i===rows.length-1||i%stride===0&&i<rows.length-stride)layout.labels.push({x:x(Date.parse(r.period)),y:plot.y+plot.h+19,text:r.period.slice(5),fullText:r.period,anchor:'middle',fontSize:10});});
  rows.forEach((r,index)=>{
    const xx=x(Date.parse(r.period)),missing=r.estimate===null,anchor=[xx,missing?plot.y+plot.h:y(r.estimate)],common={identity:key('ordered-estimate',recordId(r)),index,transitionIndex:index,group:uiText('估计'),row:r.row};
    const tip=`${r.period} · ${missing?uiText('未采集'):`${fmt(r.estimate)} [${fmt(r.low)}, ${fmt(r.high)}] ${doc.unit} · ${doc.intervalLabel}`}`;
    // Partition the ribbon at observation midpoints, keeping one piece per ID.
    // A missing neighbour closes this piece at its own date, leaving a gap.
    const prev=rows[index-1]?.estimate!==null&&rows[index-1]?rows[index-1]:r,next=rows[index+1]?.estimate!==null&&rows[index+1]?rows[index+1]:r;
    const at=(row,k)=>[x(Date.parse(row.period)),y(row[k])];
    let contour=collapsed(anchor),trend=collapsed(anchor);
    if(!missing){
      const left=pointMix(at(prev,'estimate'),anchor,.5),right=pointMix(anchor,at(next,'estimate'),.5);
      trend=polygonPoints([...([left,anchor,right].map(([a,b])=>[a,b-.9])),...([right,anchor,left].map(([a,b])=>[a,b+.9]))]);
      // Give upper and lower bounds the same stations in both encodings.
      // Each full date cell contracts horizontally into its own interval;
      // pairing six polygon edges with four interval edges produced spikes.
      const bound=(field,q)=>q<.5?pointMix(pointMix(at(prev,field),at(r,field),.5),at(r,field),q*2):pointMix(at(r,field),pointMix(at(r,field),at(next,field),.5),q*2-1);
      const flank=(field,reverse=false)=>Array.from({length:64},(_,i)=>{const q=reverse?1-i/63:i/63;return band?bound(field,q):[xx-.65+1.3*q,y(r[field])];});
      contour=band||intervals?[...flank('high'),...flank('low',true)]:collapsed(anchor);
    }
    const estimateAt=xx=>{const a=xx<anchor[0]?at(prev,'estimate'):anchor,b=xx<anchor[0]?anchor:at(next,'estimate');return a[1]+(b[1]-a[1])*(xx-a[0])/(b[0]-a[0]||1);};
    const entrance=band&&!missing?contour.map(([xx])=>[xx,estimateAt(xx)]):collapsed(anchor);
    glyph(layout,common,'interval',contour,anchor,{opacity:missing||!band&&!intervals?0:band?.19:.8,tooltip:tip,value:r.estimate,entrance});
    glyph(layout,common,'trend',trend,anchor,{opacity:missing?0:intervals?.25:.85,tooltip:tip,value:r.estimate});
    for(const [role,value] of [['lower',r.low],['upper',r.high]]){const atp=[xx,missing?anchor[1]:y(value)];line(layout,common,role,[atp[0]-3,atp[1]],[atp[0]+3,atp[1]],anchor,{opacity:!missing&&intervals?.8:0,tooltip:tip});}
    dot(layout,common,'estimate',anchor,w>=600?3.2:2.5,{opacity:missing?0:1,tooltip:tip,value:r.estimate,editable:'estimate'});
    line(layout,common,'missing',[xx-3,anchor[1]-3],[xx+3,anchor[1]+3],anchor,{opacity:missing?.7:0,tooltip:tip});
  });
  layout.scales={x,y};return layout;
}

export function layoutTrajectory(doc,view,w,h,{domain}={}){
  const bounds=domain||exploratoryBounds(doc),plot={x:58,y:57,w:w-90,h:h-108},layout=base(doc,view,w,h,plot),rows=[...doc.data].sort((a,b)=>Date.parse(a.period)-Date.parse(b.period));
  const x=scaleLinear(padded(bounds.x),[plot.x,plot.x+plot.w]).nice(4),y=scaleLinear(padded(bounds.y),[plot.y+plot.h,plot.y]).nice(4);
  axis(layout,x,true,{title:doc.axes.x});axis(layout,y,false,{title:doc.axes.y});
  layout.heading=uiMessage`${rows.length} 次时间观测`;layout.details=uiText('按日期连接 · 不是回归线');
  rows.forEach((r,index)=>{
    const p=[x(r.x),y(r.y)],prev=rows[index-1],start=prev?[x(prev.x),y(prev.y)]:p,common={identity:key('trajectory',recordId(r)),index,transitionIndex:index,group:uiText('观测'),row:r.row};
    const tip=`${r.period} · ${doc.axes.x}: ${fmt(r.x)} · ${doc.axes.y}: ${fmt(r.y)}`;
    line(layout,common,'path',start,p,start,{opacity:prev&&view==='trajectory-path'?.7:0,width:1.3,tooltip:tip,entrance:collapsed(start)});
    dot(layout,common,'point',p,index===rows.length-1?4.2:3,{opacity:.92,paper:index!==rows.length-1,stroke:1.1,tooltip:tip,editable:'y',value:r.y});
    if(index===0||index===rows.length-1)layout.labels.push({x:p[0]+(p[0]>plot.x+plot.w*.8?-9:9),y:p[1]-9,text:r.period,anchor:p[0]>plot.x+plot.w*.8?'end':'start',fontSize:10,dataLabel:true});
  });layout.scales={x,y};return layout;
}

const spatialBasis={
  'spatial-3d':[[Math.SQRT1_2,-Math.SQRT1_2,0],[1/Math.sqrt(6),1/Math.sqrt(6),-2/Math.sqrt(6)]],
  'spatial-xy':[[1,0,0],[0,-1,0]],'spatial-xz':[[1,0,0],[0,0,-1]],'spatial-yz':[[0,1,0],[0,0,-1]]
};
export function layoutSpatial(doc,view,w,h,{domain}={}){
  const bounds=domain||exploratoryBounds(doc),spatial=['spatial-3d','spatial-bubbles','spatial-surface'].includes(view),plot={x:w>=600?65:47,y:58,w:w-(w>=600?108:73),h:h-113},layout=base(doc,view,w,h,plot);
  const dimensions=['x','y','z'],norm=dimensions.map(d=>scaleLinear(padded(bounds[d]),[-.5,.5])),basis=spatialBasis[spatial?'spatial-3d':view],size=Math.min(plot.w/(spatial?1.58:1.12),plot.h/(spatial?1.8:1.12)),center=[plot.x+plot.w/2,plot.y+plot.h/2];
  const project=v=>basis.map((row,i)=>center[i]+size*row.reduce((n,c,k)=>n+c*v[k],0));
  layout.header={...plot};
  layout.heading=view==='spatial-surface'?uiText('三维采样曲面'):view==='spatial-bubbles'?uiText('三维规模气泡'):spatial?uiText('三维正交投影'):uiMessage`${view.slice(-2).toUpperCase()} 坐标平面`;
  const hidden=spatial?'':({ 'spatial-xy':'Z','spatial-xz':'Y','spatial-yz':'X'})[view];layout.details=view==='spatial-surface'?uiText('原始采样 · 线性三角网格'):view==='spatial-bubbles'?uiMessage`投影面积：${doc.axes.size}`:spatial?uiText('等大原始点 · 轴分别注明量纲'):uiMessage`隐藏 ${hidden} 维 · 原始坐标保留`;
  const visible=spatial?dimensions:({'spatial-xy':['x','y'],'spatial-xz':['x','z'],'spatial-yz':['y','z']})[view];
  if(spatial){
    const corners=Array.from({length:8},(_,i)=>dimensions.map((_,j)=>i&(1<<j)?.5:-.5));
    for(let i=0;i<8;i++)for(let d=0;d<3;d++)if(!(i&(1<<d))){const a=project(corners[i]),b=project(corners[i|(1<<d)]);layout.guides.push({x1:a[0],y1:a[1],x2:b[0],y2:b[1],major:i===0});}
    dimensions.forEach((d,j)=>{const a=[-.5,-.5,-.5],b=[...a];b[j]=.5;const pa=project(a),pb=project(b);layout.labels.push({x:pb[0],y:pb[1]+(j===2?-16:30),text:short(doc.axes[d],w>=600?24:14),fullText:doc.axes[d],anchor:'middle',fontSize:10});for(const t of [.5,1]){const p=pointMix(pa,pb,t);layout.labels.push({x:p[0]+(j===2?-7:0),y:p[1]+(j===2?3:11),text:fmt(norm[j].invert(t-.5)),anchor:j===2?'end':'middle',fontSize:8});}});
  }else{
    const [a,b]=visible,[i,j]=[dimensions.indexOf(a),dimensions.indexOf(b)],left=center[0]-size/2,right=center[0]+size/2,top=center[1]-size/2,bottom=center[1]+size/2;
    layout.plot={x:left,y:top,w:size,h:size};
    const x=scaleLinear(norm[i].domain(),[left,right]),y=scaleLinear(norm[j].domain(),[bottom,top]);axis(layout,x,true,{title:doc.axes[a]});axis(layout,y,false,{title:doc.axes[b]});
  }
  const groups=unique(doc.data.map(r=>r.group)),order=doc.data.map((r,index)=>({r,index,depth:spatial?r.x+r.y+r.z:0})).sort((a,b)=>b.depth-a.depth);
  order.forEach(({r,index})=>{
    const p=project(dimensions.map((d,j)=>norm[j](r[d]))),radius=view==='spatial-surface'?0:view==='spatial-bubbles'?size*.023*2.8*Math.sqrt(r.size/Math.max(...doc.data.map(r=>r.size))):size*.023,tip=`${r.label} · ${dimensions.map(d=>`${doc.axes[d]}: ${fmt(r[d])}`).join(' · ')}${view==='spatial-bubbles'?` · ${doc.axes.size}: ${fmt(r.size)}`:''}`;
    dot(layout,{identity:key('spatial',recordId(r)),index,transitionIndex:index,group:r.group,colorIdentity:colorIdentity(doc,r),row:r.row},'point',p,radius,{opacity:.8,stroke:.8,tooltip:tip,value:r.z,editable:'z'});
  });
  layout.spatialPose=spatialPose(doc,view,{norm,basis,center,size});layout.spatialPose.contours=new Map(layout.marks.map(m=>[m.key,m.points]));layout.spatialZDomain=bounds.z;layout.guides=[];layout.spatialBasis=basis;layout.project=project;layout.groups=groups;layout.groupKeys=groups.map(group=>colorIdentity(doc,doc.data.find(r=>r.group===group)));return layout;
}
export function layoutExploratory(doc,view,w,h,options){return ({matrix:layoutNumericMatrix,'ordered-estimates':layoutOrderedEstimates,trajectory:layoutTrajectory,spatial:layoutSpatial})[doc.family](doc,view,w,h,options);}
