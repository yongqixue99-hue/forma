import {areaDataLabel,labelInk,blendedSurface} from './chart-readability.js';
import {resolveBoundColor} from './color-semantics.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {entityNames,entityKey} from './entity-identity.js';
import {recordId} from './data-identity.js';
import {hierarchy,treemap,treemapSquarify,interpolateRgb} from 'd3';
import {MorphChart,rectPoints,sectorPoints} from './morph.js';
import {hierarchyViews,relationalEligibility,relationKey} from './relational-rules.js';

import {formatNumber as fmt} from './number-format.js';
const short=(s,n)=>[...s].length>n?[...s].slice(0,n-1).join('')+'…':s;
const clamp=x=>Math.max(0,Math.min(1,x));
export function layoutHierarchy(doc,view,w=800,h=440){
  const valid=relationalEligibility(doc,view);if(!valid.valid)throw new Error(valid.reason);
  const wide=w>=680,plot={x:20,y:35,w:w-(wide?195:40),h:Math.max(110,h-46)},groups=entityNames(doc,'parent').map(parent=>({parent,parentId:entityKey(doc.data.find(r=>r.parent===parent),'parent'),children:doc.data.filter(r=>r.parent===parent)}));
  groups.forEach(g=>g.value=g.children.reduce((s,r)=>s+r.value,0));const total=groups.reduce((s,g)=>s+g.value,0);
  const marks=[],labels=[],parentLabels=[],summary=[],r=Math.min(plot.w/2-8,plot.h/2-6),cx=plot.x+plot.w/2,cy=plot.y+plot.h/2;
  let offset=0;
  const root=hierarchy({children:groups.map(g=>({parent:g.parent,children:g.children.map(row=>({...row}))}))}).sum(d=>d.children?0:d.value||0);
  treemap().tile(treemapSquarify).size([plot.w,plot.h]).padding(0)(root);
  groups.forEach((g,index)=>{
    const start=offset/total,end=(offset+g.value)/total;offset+=g.value;
    const a0=-Math.PI/2+start*Math.PI*2,a1=-Math.PI/2+end*Math.PI*2,parentNode=root.children[index];
    let geometry,points;
    if(view==='hierarchy-sunburst'){geometry={type:'sector',cx,cy,r0:r*.32,r1:r*.62,a0,a1};points=sectorPoints(cx,cy,geometry.r0,geometry.r1,a0,a1);}
    else if(view==='hierarchy-icicle'){geometry={type:'hierarchy-rect',x:plot.x+start*plot.w,y:plot.y,width:(end-start)*plot.w,height:plot.h*.36};points=rectPoints(geometry.x,geometry.y,geometry.width,geometry.height);}
    else{geometry={type:'hierarchy-rect',x:plot.x+parentNode.x0,y:plot.y+parentNode.y0,width:parentNode.x1-parentNode.x0,height:parentNode.y1-parentNode.y0};points=rectPoints(geometry.x,geometry.y,geometry.width,geometry.height);}
    marks.push({key:relationKey('parent',g.parentId),parent:g.parent,parentId:g.parentId,branch:true,index,value:g.value,share:g.value/total,tooltipLabel:g.parent,points,geometry,label:{visible:false}});
    if(view==='hierarchy-icicle'&&geometry.width>45)parentLabels.push({parent:g.parent,parentId:g.parentId,x:geometry.x+geometry.width/2,y:geometry.y+geometry.height/2+4,text:short(g.parent,Math.max(3,Math.floor(geometry.width/12))),anchor:'middle',inside:true});
    if(view==='hierarchy-treemap')parentLabels.push({parent:g.parent,parentId:g.parentId,x:geometry.x+8,y:geometry.y+16,text:short(g.parent,Math.max(3,Math.floor(geometry.width/12)-1)),anchor:'start'});
    let childOffset=start;
    g.children.forEach((row,j)=>{
      const share=row.value/total,c0=-Math.PI/2+childOffset*Math.PI*2,c1=c0+share*Math.PI*2;let childGeometry,childPoints,label={visible:false};
      if(view==='hierarchy-sunburst'){
        childGeometry={type:'sector',cx,cy,r0:r*.64,r1:r,a0:c0,a1:c1};childPoints=sectorPoints(cx,cy,childGeometry.r0,r,c0,c1);
        if(share*Math.PI*2*r*.82>36&&r>70){const angle=(c0+c1)/2;label={x:cx+Math.cos(angle)*r*.81,y:cy+Math.sin(angle)*r*.81+3,text:short(row.child,4),anchor:'middle',fontSize:10};}
      }else{
        const node=parentNode.children[j];childGeometry=view==='hierarchy-icicle'?{type:'hierarchy-rect',x:plot.x+childOffset*plot.w,y:plot.y+plot.h*.36,width:share*plot.w,height:plot.h*.64}:{type:'hierarchy-rect',x:plot.x+node.x0,y:plot.y+node.y0,width:node.x1-node.x0,height:node.y1-node.y0};
        const {x,y,width,height}=childGeometry;childPoints=rectPoints(x,y,width,height);
        const header=view==='hierarchy-treemap'&&node.y0===parentNode.y0?23:0;label={...areaDataLabel(row.child,row.value,{x,y:y+header,width,height:height-header}),surfaceOpacity:.12};
      }
      marks.push({key:relationKey('leaf',recordId(row)),parent:row.parent,parentId:entityKey(row,'parent'),child:row.child,row:row.row,index:groups.length+row.row,value:row.value,share,tooltipLabel:`${row.parent} / ${row.child}`,points:childPoints,geometry:childGeometry,label});childOffset+=share;
    });
    summary.push({parent:g.parent,parentId:g.parentId,value:g.value,share:g.value/total,index});
  });
  // Parent shapes stay behind leaves in every view, including reverse seeking.
  marks.sort((a,b)=>Number(b.branch||false)-Number(a.branch||false));
  if(view==='hierarchy-sunburst'){labels.push({x:cx,y:cy-3,text:fmt(total),anchor:'middle',fontSize:r>100?28:21,serif:true},{x:cx,y:cy+21,text:short(doc.unit,8),anchor:'middle',fontSize:10});}
  return {view,w,h,wide,plot,marks,guides:[],labels,overlays:[],legend:[],total,parentLabels,summary};
}
export class HierarchyMorphChart extends MorphChart{
  setDocument(doc,view,options={}){
    this.resumedBandContour=!!options.resume&&!!this.bandContour;
    this.resumedBranches=options.resume?new Map([...this.nodes].map(([k,n])=>[k,{opacity:Number(n.shape.getAttribute('fill-opacity')),stroke:n.shape.getAttribute('stroke'),'stroke-width':n.shape.getAttribute('stroke-width')}])):null;
    return super.setDocument(doc,view,options);
  }
  interpolateResumedMark(points,mark,q){
    if(!this.resumedBandContour||mark.geometry.type!=='hierarchy-rect')return null;
    // An interrupted unroll still has two sampled arcs, not four sampled
    // rectangle edges. Keep that correspondence until the new rectangle settles.
    const b=mark.geometry;
    return points.map(([x,y],i)=>{const top=i<64,u=top?i/63:1-(i-64)/63;return [x+(b.x+b.width*u-x)*q,y+(b.y+(top?0:b.height)-y)*q];});
  }
  eligibility(doc,view){return relationalEligibility(doc,view);}
  layoutFor(doc,view,w,h){return layoutHierarchy(doc,view,w,h);}
  viewInfo(id){return hierarchyViews.find(v=>v.id===id);}
  colorKey(mark){return mark.parentId??mark.parent;}
  interpolateMark(from,to,q){
    if(!from||from.geometry.type===to.geometry.type)return null;
    const sector=from.geometry.type==='sector'?from:to,rect=sector===from?to:from;
    if(sector.geometry.type!=='sector'||rect.geometry.type!=='hierarchy-rect')return null;
    // Unroll a curved band in its own coordinates. Direct interpolation of
    // unrelated contour vertices folds the band through itself at mid-frame.
    const t=sector===from?q:1-q,g=sector.geometry,b=rect.geometry,mid=(g.a0+g.a1)/2,r=(g.r0+g.r1)/2;
    const angleDelta=Math.atan2(Math.sin(-Math.PI/2-mid),Math.cos(-Math.PI/2-mid)),angle=mid+angleDelta*t;
    const center=[g.cx+Math.cos(mid)*r,g.cy+Math.sin(mid)*r].map((v,i)=>v+((i?b.y+b.height/2:b.x+b.width/2)-v)*t);
    const half=((g.r1-g.r0)*(1-t)+b.height*t)/2,sweep=(g.a1-g.a0)*(1-t),length=(g.a1-g.a0)*r*(1-t)+b.width*t;
    if(sweep<1e-7)return [...Array.from({length:64},(_,i)=>[b.x+b.width*i/63,b.y]),...Array.from({length:64},(_,i)=>[b.x+b.width*(1-i/63),b.y+b.height])];
    const radius=Math.max(length/sweep,half+1e-6);
    return Array.from({length:128},(_,i)=>{const outer=i<64,u=outer?i/63:1-(i-64)/63,a=angle+sweep*(u-.5),rho=radius+(outer?half:-half);return [center[0]+Math.cos(a)*rho-Math.cos(angle)*radius,center[1]+Math.sin(a)*rho-Math.sin(angle)*radius];});
  }
  paint(layout){
    super.paint(layout);
    for(const mark of layout.marks){
      const item=this.nodes.get(mark.key),color=resolveBoundColor(this.options,this.colorKey(mark),this.theme.colors[this.colorIndices.get(this.colorKey(mark))%this.theme.colors.length]),tree=layout.view==='hierarchy-treemap';
      item.texture.setAttribute('opacity',mark.branch?0:.2);item.shape.setAttribute('fill-opacity',mark.branch?(tree?0:.87):.12);
      item.shape.setAttribute('stroke',mark.branch&&tree?color:this.theme.bg);item.shape.setAttribute('stroke-width',mark.branch&&tree?1.4:1.2);
      const text=uiMessage`${mark.tooltipLabel} · ${fmt(mark.value)} ${this.doc.unit} · 总量的 ${fmt(mark.share*100)}%${mark.branch?uiText(' · 子项合计'):''}`;
      item.title.textContent=text;item.group.setAttribute('aria-label',text);
      if(this.options.editable&&!mark.branch){item.group.dataset.editRow=mark.row;item.group.dataset.editField='value';item.group.setAttribute('role','button');}
    }
  }
  paintTransition(from,to,p){
    this.bandContour=(this.resumedBandContour||from.view==='hierarchy-sunburst'||to.view==='hierarchy-sunburst')&&p>0&&p<1;
    const a=from.view==='hierarchy-treemap'?0:.87,b=to.view==='hierarchy-treemap'?0:.87;
    for(const mark of to.marks.filter(m=>m.branch)){const node=this.nodes.get(mark.key),saved=this.resumedBranches?.get(mark.key),color=resolveBoundColor(this.options,this.colorKey(mark),this.theme.colors[this.colorIndices.get(this.colorKey(mark))%this.theme.colors.length]),start=saved?.opacity??a,fromStroke=saved?.stroke??(from.view==='hierarchy-treemap'?color:this.theme.bg),toStroke=to.view==='hierarchy-treemap'?color:this.theme.bg,fromWidth=Number(saved?.['stroke-width']??(from.view==='hierarchy-treemap'?1.4:1.2)),toWidth=to.view==='hierarchy-treemap'?1.4:1.2;node.shape.setAttribute('fill-opacity',(start+(b-start)*p)*(1-.92*Math.sin(Math.PI*p)**2));node.shape.setAttribute('stroke',p===0?fromStroke:p===1?toStroke:interpolateRgb(fromStroke,toStroke)(p));node.shape.setAttribute('stroke-width',fromWidth+(toWidth-fromWidth)*p);}
    if(p===0||p===1)return;
    for(const mark of to.marks.filter(m=>!m.branch))this.nodes.get(mark.key).shape.setAttribute('fill-opacity',.12+.23*Math.sin(Math.PI*p));
    // Reordering full-area bands obscures sibling identity. Keep their keyed
    // outlines visible but compact while travelling; expand at the endpoints.
    // Intermediate area is deliberately not a data-reading state.
    const clearance=1-(this.resumedBranches?.size ? .18 : .3)*Math.sin(Math.PI*p);
    if(from.view!==to.view||this.resumedBandContour)for(const [key,contour]of this.current){
      const cx=contour.reduce((s,v)=>s+v[0]/contour.length,0),cy=contour.reduce((s,v)=>s+v[1]/contour.length,0);
      this.writeShape(key,contour.map(([x,y])=>[cx+(x-cx)*clearance,cy+(y-cy)*clearance]));
    }
    // Rotating wide bands need temporary breathing room; fit the complete
    // group uniformly so the transition never crosses the footer or legend.
    const points=[...this.current.values()].flat(),xs=points.map(v=>v[0]),ys=points.map(v=>v[1]);
    const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),plot=to.plot;
    const scale=Math.min(1,plot.w/(x1-x0||1),plot.h/(y1-y0||1));
    const tx=Math.max(plot.x-x0*scale,Math.min(0,plot.x+plot.w-x1*scale)),ty=Math.max(plot.y-y0*scale,Math.min(0,plot.y+plot.h-y1*scale));
    for(const [key,contour]of this.current)this.writeShape(key,contour.map(([x,y])=>[x*scale+tx,y*scale+ty]));
  }
  decorate(layout){
    super.decorate(layout);const t=this.theme;
    for(const entry of layout.parentLabels){const color=resolveBoundColor(this.options,entry.parentId??entry.parent,t.colors[this.colorIndices.get(entry.parentId??entry.parent)%t.colors.length]);this.text(this.labelLayer,entry.x,entry.y,entry.text,{'text-anchor':entry.anchor,'font-family':'Manrope,"PingFang SC",sans-serif','font-size':11,fill:entry.inside?labelInk(blendedSurface(color,t.bg,.87),t.fg):t.fg,...(!entry.inside?{stroke:t.bg,'stroke-width':4,'paint-order':'stroke'}:{})});}
    if(layout.wide){
      const x=layout.w-154,y=layout.plot.y+Math.max(4,(layout.plot.h-layout.summary.length*42-27)/2);
      this.text(this.guideLayer,x,y,uiText('分类 / 总量中的份额'),{'font-family':'Manrope,"PingFang SC",sans-serif','font-size':10});
      layout.summary.forEach((g,i)=>{const yy=y+29+i*42,color=resolveBoundColor(this.options,g.parentId??g.parent,t.colors[this.colorIndices.get(g.parentId??g.parent)%t.colors.length]);this.el('circle',{cx:x+3,cy:yy-4,r:2.5,fill:color},this.guideLayer);this.text(this.guideLayer,x+13,yy,short(g.parent,7),{'font-family':'Manrope,"PingFang SC",sans-serif','font-size':11,fill:color});this.text(this.guideLayer,layout.w-12,yy,`${fmt(g.share*100)}%`,{'text-anchor':'end','font-size':11,fill:t.fg});this.text(this.guideLayer,x+13,yy+15,`${fmt(g.value)} ${short(this.doc.unit,5)}`,{'font-size':9});});
    }else if(layout.view==='hierarchy-sunburst'){
      // Compact legend sits above the ring; child labels remain inside sectors.
      let x=20;layout.summary.forEach(g=>{const text=short(g.parent,3);this.el('circle',{cx:x,cy:28,r:2.4,fill:resolveBoundColor(this.options,g.parentId??g.parent,t.colors[this.colorIndices.get(g.parentId??g.parent)%t.colors.length])},this.guideLayer);this.text(this.guideLayer,x+7,31,text,{'font-size':9});x+=(layout.w-35)/layout.summary.length;});
    }
  }
  render(progress){
    const p=clamp(progress);this.svg.dataset.entranceProgress=String(p);this.labelLayer.setAttribute('opacity',clamp((p-.62)/.38));
    for(const mark of this.layout.marks){const g=mark.geometry,q=1-(1-clamp((p-(mark.branch?0:.18))/.8))**3;let points;
      if(p===1)points=mark.points;
      else if(g.type==='sector')points=sectorPoints(g.cx,g.cy,g.r0,g.r0+(g.r1-g.r0)*q,g.a0,g.a0+(g.a1-g.a0)*q);
      else points=rectPoints(g.x,g.y,g.width*q,g.height);
      this.writeShape(mark.key,points);
    }
  }
}
