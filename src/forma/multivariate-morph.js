import {scaleLinear} from 'd3';
import {uiText,uiMessage} from './locale.js';
import {matrix10} from './volume10-data.js';
import {multivariateVariables,multivariateSelectedPair,multivariateBounds} from './multivariate-rules.js';
import {multivariateGroupKey} from './entity-identity.js';
import {base,axis,dot,key,fmt,padded,short} from './scientific-geometry.js';

export function layoutMultivariate(doc,view,w,h,{domain}={}){
 const variables=multivariateVariables(doc),pair=multivariateSelectedPair(doc),focus=view==='multivariate-focus',n=variables.length;
 const observed=new Set(doc.data.map(r=>r._sampleId)),samples=doc.sampleEntities.items.filter(s=>observed.has(s.id));
 // The native renderer and the morph share the exact same long-table pivot.
 const matrix=matrix10(doc.data,'_sampleId','_variableId'),bounds=domain||multivariateBounds(doc),domains=Object.fromEntries(variables.map(v=>[v.id,padded(bounds[v.id]||multivariateBounds(doc)[v.id])]));
 const groups=[...new Set(doc.data.map(r=>r.group))],small=w<600,legendColumns=Math.min(groups.length,Math.max(1,Math.floor((w-(small?78:100))/(small?76:105)))),legendExtra=(Math.ceil(groups.length/legendColumns)-1)*18;
 const plot={x:small?54:72,y:68+legendExtra,w:w-(small?78:100),h:h-119-legendExtra},layout=base(doc,view,w,h,plot),gap=small?5:9,cw=plot.w/n,ch=plot.h/n;
 layout.groupLegendColumns=legendColumns;layout.groups=groups;layout.groupKeys=groups.map(group=>multivariateGroupKey(doc,group));layout.transitionCount=samples.length;
 const panel=(column,row)=>({x:plot.x+column*cw+gap/2,y:plot.y+row*ch+gap/2,w:cw-gap,h:ch-gap});
 layout.facetPanels=[];
 layout.heading=uiMessage`${samples.length} 个样本 · ${n} 个变量`;layout.details=focus?uiText('原值与分组保持不变'):uiText('每个变量保留自己的尺度与单位');
 const xp=variables.find(v=>v.id===pair[0]),yp=variables.find(v=>v.id===pair[1]);
 if(focus){
  const x=scaleLinear(domains[xp.id],[plot.x,plot.x+plot.w]),y=scaleLinear(domains[yp.id],[plot.y+plot.h,plot.y]);
  axis(layout,x,true,{title:xp.label});layout.labels.at(-1).fullText=xp.label;axis(layout,y,false,{title:yp.label});layout.labels.at(-1).fullText=yp.label;layout.scales={x,y};
 }else{
  variables.forEach((v,i)=>{
   const p=panel(i,i),space=Math.max(3,Math.floor((p.w-4)/(small?8:11))),tight=p.w<115||p.h<70;
   const tiny=p.h<60,mid=p.y+p.h/2;
   layout.labels.push({x:p.x+p.w/2,y:tiny?mid+3:mid-16,text:short(v.baseName,space),fullText:`${v.label} · ${fmt(domains[v.id][0])} – ${fmt(domains[v.id][1])}`,anchor:'middle',fontSize:tiny?9:11});
   if(v.unit&&!tiny)layout.labels.push({x:p.x+p.w/2,y:mid,text:short(v.unit,space),fullText:v.unit,anchor:'middle',fontSize:10});
   const [low,high]=domains[v.id];
   if(!tiny)layout.labels.push({x:p.x+p.w/2,y:mid+18,text:`${fmt(low,{significantDigits:3})} – ${fmt(high,{significantDigits:3})}`,fullText:`${fmt(low)} – ${fmt(high)}`,anchor:'middle',fontSize:9});
   layout.labels.push({x:plot.x+(i+.5)*cw,y:h-25,text:short(v.label,space),fullText:v.label,anchor:'middle',fontSize:small?8:10});
   layout.labels.push({x:plot.x-8,y:plot.y+(i+.5)*ch+3,text:short(v.baseName,small?5:8),fullText:v.label,anchor:'end',fontSize:small?8:10});
  });
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
   const p=panel(c,r),selected=variables[c].id===pair[0]&&variables[r].id===pair[1];
   if(r!==c)layout.facetPanels.push({...p,pair:[variables[c].id,variables[r].id],label:`X: ${variables[c].label} · Y: ${variables[r].label}`,selected});
   for(const [x1,y1,x2,y2]of[[p.x,p.y,p.x+p.w,p.y],[p.x+p.w,p.y,p.x+p.w,p.y+p.h],[p.x+p.w,p.y+p.h,p.x,p.y+p.h],[p.x,p.y+p.h,p.x,p.y]])layout.guides.push({x1,y1,x2,y2,major:selected});
  }
 }
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){
  if(r===c)continue;const vx=variables[c],vy=variables[r],p=panel(c,r),selected=vx.id===pair[0]&&vy.id===pair[1];
  const target=focus&&selected?plot:p,inset=focus&&selected?0:Math.min(7,p.w*.08,p.h*.08),x=scaleLinear(domains[vx.id],[target.x+inset,target.x+target.w-inset]),y=scaleLinear(domains[vy.id],[target.y+target.h-inset,target.y+inset]);
  samples.forEach((sample,index)=>{
   const xr=matrix.lookup.get(JSON.stringify([sample.id,vx.id])),yr=matrix.lookup.get(JSON.stringify([sample.id,vy.id]));
   const visible=!focus||selected,point=visible?[x(xr.value),y(yr.value)]:[p.x+p.w/2,p.y+p.h/2],radius=visible?focus?(small?3:3.7):(small?1.5:2.2):0;
   const tooltip=`${sample.name} · ${yr.group}\n${vx.label}: ${fmt(xr.value)}\n${vy.label}: ${fmt(yr.value)}`;
   const common={identity:key('multivariate-sample',sample.id,vx.id,vy.id),index,transitionIndex:index,group:yr.group,colorIdentity:multivariateGroupKey(doc,yr.group),recordIds:[xr._id,yr._id],row:yr.row,recordLabel:`${sample.name} · ${yr.group}`};
   dot(layout,common,'point',point,radius,{opacity:visible?(focus?.84:.61):0,stroke:focus?.65:0,tooltip,value:yr.value,editable:'value',multivariatePoint:true,selectedFacet:selected,variablePair:[vx.id,vy.id],sampleId:sample.id});
  });
 }
 layout.variableDomains=domains;layout.selectedPair=pair;layout.facets=n*(n-1);return layout;
}
