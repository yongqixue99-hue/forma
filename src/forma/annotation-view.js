import {uiText,uiMarkup,uiMessage} from './locale.js';
import {annotationContext,annotationStatus,annotationOpacity,annotationRowName,annotationValue,annotationFieldNames} from './annotations.js';
import {formatNumber} from './number-format.js';
import {themeFor} from './palettes.js';
import {wrapChartText} from './text-wrap.js';

const NS='http://www.w3.org/2000/svg',clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mid=points=>{const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return [(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];};
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
function el(svg,tag,attrs={},parent=svg,text){const node=svg.ownerDocument.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;parent.append(node);return node;}
function lines(text,width,font){
  return text?wrapChartText(text,width/font):[];
}
function nativeAnchor(scene,target){
  const item=scene.annotationMarks?.find(m=>m.recordId===target.recordId&&m.field===target.field&&m.node.tagName.toLowerCase()!=='text');
  if(!item)return null;const n=item.node,number=k=>Number(n.getAttribute(k)||0);let p;
  if(['circle','ellipse'].includes(n.tagName.toLowerCase()))p=[number('cx'),number('cy')];
  else if(n.tagName.toLowerCase()==='rect'){const row=scene.doc?.data.find(r=>r._id===target.recordId),horizontal=scene.doc?.template==='bar',vertical=scene.doc?.template==='column';p=[number('x')+number('width')*(horizontal?(row?.[target.field]<0?0:1):.5),number('y')+number('height')*(vertical?(row?.[target.field]<0?1:0):.5)];}
  else try{const b=n.getBBox();if(b.width||b.height)p=[b.x+b.width/2,b.y+b.height/2];}catch{}
  if(!p)return null;
  try{const own=n.getCTM(),base=scene.svg.getCTM();if(own&&base){const point=scene.svg.createSVGPoint();point.x=p[0];point.y=p[1];const transformed=point.matrixTransform(base.inverse().multiply(own));p=[transformed.x,transformed.y];}}catch{}
  return p.every(Number.isFinite)?{point:p}:null;
}
export function annotationAnchor(scene,target,family){
  if(!scene.current||!scene.nodes)return nativeAnchor(scene,target);
  const scientific={samples:[target.recordId,'sample'],estimates:[JSON.stringify(['estimate',target.recordId]),{estimate:'point',low:'lower',high:'upper'}[target.field]],matrix:[JSON.stringify(['matrix-cell',target.recordId]),'cell'],ordered:[JSON.stringify(['ordered-estimate',target.recordId]),{estimate:'estimate',low:'lower',high:'upper'}[target.field]]};
  const key=scientific[family]?JSON.stringify(scientific[family]):family==='paired'?JSON.stringify([target.recordId,target.field]):family==='method'?JSON.stringify([JSON.stringify(['method',target.recordId]),'sample']):target.recordId;
  const points=scene.current.get(key),shape=scene.nodes.get(key)?.shape;
  if(!shape||!points?.length||points.some(p=>!p.every(Number.isFinite)))return null;
  const point=mid(points),bias=scene.annotationBias?.get(key)??annotationBiases(scene).get(key)??[0,0],xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  point[0]+=(Math.max(...xs)-Math.min(...xs))*bias[0];point[1]+=(Math.max(...ys)-Math.min(...ys))*bias[1];
  return {point,path:shape.getAttribute('d')};
}
export function annotationBiases(scene){return new Map((scene.layout?.marks||[]).map(m=>{const g=m.geometry||{};return [m.key,g.type==='rect'&&g.valueY!==undefined?[0,m.value<0?.5:-.5]:g.type==='rect'&&g.valueX!==undefined?[m.value<0?-.5:.5,0]:[0,0]];}));}
export function annotationCaption(doc,a){
  if(a.kind==='note'||!a.showValue)return '';
  const c=annotationContext(doc);
  return a.targets.map(t=>{const row=doc.data.find(r=>r._id===t.recordId);if(!row)return '';
    if(c.family==='method')return `${annotationRowName(row)}\n${c.observations[0]} ${formatNumber(row.a)} ${doc.unit}\n${c.observations[1]} ${formatNumber(row.b)} ${doc.unit}`;
    const field=annotationFieldNames(doc).find(([id])=>id===t.field)?.[1]||uiText('原值');return `${annotationRowName(row)} · ${field} ${formatNumber(annotationValue(doc,row,t.field))} ${doc.unit}`;
  }).join(' → ');
}
function frameItems(step,{from,progress=1,fraction=1,staticFrame=false,reducedMotion=false}={}){
  const current=step.options.annotations||[],previous=from?.options.annotations||[];
  if(!from||progress===1)return current.map(a=>({a,doc:step.doc,opacity:annotationOpacity(a,fraction,{staticFrame,reducedMotion})}));
  const ids=new Set([...previous,...current].map(a=>a.id));
  return [...ids].map(id=>{const old=previous.find(a=>a.id===id),next=current.find(a=>a.id===id),useOld=progress<.5&&old||!next;
    return {a:useOld?old:next,doc:useOld?from.doc:step.doc,opacity:(old?annotationOpacity(old,1,{reducedMotion})*(1-progress):0)+(next?annotationOpacity(next,fraction,{reducedMotion})*progress:0)};
  });
}

// Draw after geometry, from its currently displayed keyed contours. No DOM row
// order, display name, animation clock or random layout is used as identity.
export function renderAnnotations(scene,step,frame={}){
  const svg=scene?.svg;if(!svg)return {overflow:0,warnings:[]};
  svg.querySelector('[data-annotations-layer]')?.remove();svg.removeAttribute('data-annotation-overflow');
  scene.annotationReport={overflow:0,warnings:[]};
  const biases=annotationBiases(scene),q=1-(1-(frame.progress??1))**3;
  scene.annotationBias=new Map([...new Set([...biases.keys(),...(frame.biasFrom?.keys()||[])])].map(key=>{const to=biases.get(key)||[0,0],from=frame.biasFrom?.get(key)||to;return [key,from.map((n,i)=>n+(to[i]-n)*q)];}));
  const items=frameItems(step,frame);scene.annotationPositions=new Map();
  if(!items.length)return scene.annotationReport;
  const box=svg.getAttribute('viewBox')?.split(/[ ,]+/).map(Number),w=box?.[2]||scene.w||800,h=box?.[3]||scene.h||440;
  const original=scene.layout?.plot||{x:38,y:30,w:w-65,h:h-70},plot={x:Math.max(8,original.x),y:Math.max(8,original.y),w:Math.max(90,Math.min(w-16-original.x,original.w)),h:Math.max(60,Math.min(h-20-original.y,original.h))};
  const theme=themeFor(step.options.palette,step.options.dark,step.options.colors),ink=theme.fg,accent=theme.accent||theme.colors[1],font=w<500?10:12,lineHeight=font+4;
  const layer=el(svg,'g',{'data-annotations-layer':'','font-family':'Manrope,"PingFang SC",sans-serif','pointer-events':frame.interactive?'auto':'none'}),placed=[],warnings=[];let overflow=0;
  const finalScene=scene.current?{...scene,current:new Map(scene.layout.marks.map(m=>[m.key,m.points])),annotationBias:annotationBiases(scene)}:scene;
  const obstacles=[...(finalScene.current?.values()||[])].filter(points=>points.length).map(points=>{const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{x:Math.min(...xs)-3,y:Math.min(...ys)-3,w:Math.max(...xs)-Math.min(...xs)+6,h:Math.max(...ys)-Math.min(...ys)+6};});
  for(const label of [...(scene.layout?.labels||[]),...(scene.layout?.marks||[]).map(m=>m.label).filter(l=>l&&l.visible!==false)]){if(!label.text||!Number.isFinite(label.x)||!Number.isFinite(label.y))continue;const size=label.fontSize||11,width=String(label.text).length*size*.6;obstacles.push({x:label.x-(label.anchor==='end'?width:label.anchor==='middle'?width/2:0),y:label.y-size,w:width,h:size+3});}
  for(const {a,doc,opacity}of items){
    let status=annotationStatus(doc,a),anchors=[];
    if(status.valid&&a.kind!=='note'){
      anchors=a.targets.map(t=>annotationAnchor(scene,t,a.binding.family));
      if(anchors.some(p=>!p)){status={valid:false,reason:uiText('当前图型尚不能定位此对象')};anchors=[];}
    }
    if(!status.valid)warnings.push({id:a.id,reason:status.reason});
    const anchor=anchors.length?mid(anchors.map(p=>p.point)):null,bw=Math.min(scene.layout?.annotationRail&&w<650?330:190,Math.max(120,(scene.layout?.annotationRail?.w||plot.w)*.95),w-24),body=lines(a.text,bw-22,font),caption=lines(status.valid?annotationCaption(doc,a):uiMessage`待定位 · ${status.reason}`,bw-22,font-1),bh=18+body.length*lineHeight+(caption.length?caption.length*(lineHeight-1)+7:0);
    const finalAnchors=status.valid?a.targets.map(t=>annotationAnchor(finalScene,t,a.binding.family)):[],positionAnchor=finalAnchors.length&&finalAnchors.every(Boolean)?mid(finalAnchors.map(p=>p.point)):anchor;
    const rail=scene.layout?.annotationRail;
    const minX=rail?.x??plot.x,maxX=(rail?rail.x+rail.w:plot.x+plot.w)-bw,minY=rail?.y??plot.y,maxY=(rail?rail.y+rail.h:plot.y+plot.h)-bh;
    let candidates=[];
    const corners={'top-left':[minX,minY],'top-right':[maxX,minY],'bottom-left':[minX,maxY],'bottom-right':[maxX,maxY]};
    if(a.position)candidates.push([minX+a.position.x*Math.max(0,maxX-minX),minY+a.position.y*Math.max(0,maxY-minY)]);
    if(a.placement!=='auto')candidates.push(corners[a.placement]);
    if(positionAnchor)candidates.push([positionAnchor[0]+20,positionAnchor[1]-bh-16],[positionAnchor[0]-bw-20,positionAnchor[1]-bh-16],[positionAnchor[0]+20,positionAnchor[1]+16],[positionAnchor[0]-bw-20,positionAnchor[1]+16]);
    candidates.push(...Object.values(corners));
    for(let y=minY;y<=maxY;y+=bh+9){candidates.push([minX,y],[maxX,y]);}
    candidates=candidates.map(([x,y],i)=>({x:clamp(x,minX,Math.max(minX,maxX)),y:clamp(y,minY,Math.max(minY,maxY)),w:bw,h:bh,i}));
    const score=c=>(a.position||a.placement!=='auto')&&c.i===0?-1e9:obstacles.reduce((sum,o)=>sum+overlap(c,o),0)*10+(positionAnchor?Math.hypot(c.x+c.w/2-positionAnchor[0],c.y+c.h/2-positionAnchor[1])*.1:0)+c.i;
    const position=candidates.filter(c=>c.y+c.h<=(rail?rail.y+rail.h:plot.y+plot.h)+1&&c.x+c.w<=w-8&&placed.every(p=>!frame.staticFrame&&!frame.from&&(a.when.end<=p.when.start||a.when.start>=p.when.end)||!overlap({...c,x:c.x-4,y:c.y-4,w:c.w+8,h:c.h+8},p))).sort((a,b)=>score(a)-score(b))[0];
    if(!position){if(opacity>.001)overflow++;continue;}placed.push({...position,when:a.when});
    const start=frame.positionsFrom?.get(a.id);if(start){position.x=start.x+(position.x-start.x)*q;position.y=start.y+(position.y-start.y)*q;}
    scene.annotationPositions.set(a.id,{...position});if(opacity<=.001)continue;
    const g=el(svg,'g',{'data-annotation-id':a.id,'data-annotation-state':status.valid?'valid':'unresolved','data-annotation-placement':a.placement,'data-position-bounds':[minX,minY,Math.max(0,maxX-minX),Math.max(0,maxY-minY)].join(','),opacity,...(frame.interactive?{role:'button',tabindex:0,'aria-label':uiMessage`编辑标注：${a.text}`}:{role:'note','aria-label':`${a.text}${status.valid?'':`。${status.reason}`}`})},layer);
    el(svg,'title',{},g,[a.text,status.valid?annotationCaption(doc,a):status.reason].filter(Boolean).join(' · '));
    for(const item of anchors){
      if(item.path)el(svg,'path',{d:item.path,fill:'none',stroke:accent,'stroke-width':1.5,'stroke-opacity':.7,'vector-effect':'non-scaling-stroke'},g);
      el(svg,'circle',{cx:item.point[0],cy:item.point[1],r:3.6,fill:theme.bg,stroke:accent,'stroke-width':1.3},g);
    }
    if(anchors.length===2)el(svg,'path',{d:`M${anchors[0].point.join(',')}L${anchors[1].point.join(',')}`,fill:'none',stroke:accent,'stroke-width':1.2,'stroke-dasharray':'3 3'},g);
    if(anchor){const end=[clamp(anchor[0],position.x,position.x+bw),clamp(anchor[1],position.y,position.y+bh)];el(svg,'path',{d:`M${anchor.join(',')}L${end.join(',')}`,fill:'none',stroke:ink,'stroke-opacity':.5,'stroke-width':.8},g);}
    el(svg,'rect',{x:position.x,y:position.y,width:bw,height:bh,rx:3,fill:theme.bg,'fill-opacity':.97,stroke:status.valid?theme.line:accent,'stroke-width':.8},g);
    el(svg,'path',{d:`M${position.x+1},${position.y+10}v${bh-20}`,stroke:accent,'stroke-width':2},g);
    let y=position.y+15;
    for(const line of body){el(svg,'text',{x:position.x+11,y,'font-size':font,fill:ink},g,line);y+=lineHeight;}
    if(caption.length)y+=5;
    for(const line of caption){el(svg,'text',{x:position.x+11,y,'font-size':font-1,fill:status.valid?theme.secondary:accent},g,line);y+=lineHeight-1;}
  }
  if(overflow){svg.setAttribute('data-annotation-overflow',String(overflow));const y=h-24;el(svg,'rect',{x:4,y,width:w-8,height:22,fill:theme.bg,stroke:accent,'stroke-width':.8},layer);el(svg,'text',{x:11,y:y+15,'font-size':10,fill:ink},layer,uiMessage`${overflow} 条标注放不下 · 请缩短文字或错开显示时间`);}
  scene.annotationReport={overflow,warnings};return scene.annotationReport;
}
export function assertAnnotationLayout(scene){if(scene?.annotationReport?.overflow)throw new Error(uiText('当前画幅放不下全部标注。请扩大画幅、缩短说明或错开显示时间；标注和数据均未删除。'));}
export function annotateScene(scene,step,options={}){
  if(!scene?.svg||options.annotationAuto===false)return scene;
  const render=scene.render.bind(scene);scene.render=(p,...args)=>{render(p,...args);renderAnnotations(scene,step,{fraction:p,staticFrame:options.annotationStatic===true,interactive:options.editable===true});};
  scene.render(options.progress??1);return scene;
}
