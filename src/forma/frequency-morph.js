import {scaleLinear} from 'd3';
import {recordId} from './data-identity.js';
import {response19} from './volume19-data.js';
import {frequencyBounds,frequencyEligibility,frequencyGroupKey,frequencyText as t} from './frequency-rules.js';
import {base,axis,dot,line,key,fmt,padded} from './scientific-geometry.js';

export function layoutFrequency(doc,view,w=800,h=440,{domain}={}){
 const eligible=frequencyEligibility(doc,view);if(!eligible.valid)throw new Error(eligible.reason);
 const compact=w<500,bode=view==='freq-bode',nyquist=view==='freq-nyquist',curves=response19(doc.data),bounds=domain||frequencyBounds(doc);
 const top=compact&&curves.length>2?82:66,plot={x:compact?53:66,y:top,w:w-(compact?70:100),h:h-top-44},l=base(doc,view,w,h,plot);
 const linear=(d,r)=>scaleLinear(padded(d),r),right=plot.x+plot.w,bottom=plot.y+plot.h;
 l.heading=t(`${doc.data.length} 个频响采样`,`${doc.data.length} response samples`);l.details=t('同一采样连续换坐标 · 不推断稳定性','Same samples, changing coordinates · No stability inference');
 l.groups=curves.map(c=>c.group);l.groupKeys=curves.map(c=>frequencyGroupKey(c.points.map(p=>p.row)));l.groupLegendColumns=curves.length>2&&compact?2:curves.length;
 const xFreq=linear(bounds.logFrequency,[plot.x,right]);let real,imag,phase,gain,phasePanel;
 if(bode){
  const gap=compact?39:46,half=(plot.h-gap)/2,upper={...plot,h:half},lower={...plot,y:plot.y+half+gap,h:half};
  gain=linear(bounds.magnitude,[upper.y+half,upper.y]);phase=linear(bounds.phase,[bottom,lower.y]);phasePanel=lower;
  axis({...l,plot:upper},gain,false,{title:t('幅值 / dB','Magnitude / dB')});axis({...l,plot:lower},phase,false,{title:t('展开相位 / °','Unwrapped phase / °')});
  for(const tick of xFreq.ticks(compact?3:5)){const xx=xFreq(tick);for(const p of[upper,lower])l.guides.push({x1:xx,x2:xx,y1:p.y,y2:p.y+p.h});l.labels.push({x:xx,y:bottom+16,text:fmt(10**tick),anchor:'middle',small:true});}
  l.labels.push({x:right,y:h-5,text:`f / ${doc.frequencyUnit}`,anchor:'end',fontSize:10});l.panels={magnitude:upper,phase:lower};
 }else if(nyquist){
  // Center around observed extents and preserve identical pixels per response
  // unit. Small responses stay readable; no arbitrary -1 reference rescales them.
  const dx=bounds.real,dy=bounds.imag,cx=dx[0]/2+dx[1]/2,cy=dy[0]/2+dy[1]/2,spread=Math.max(dx[1]-dx[0],dy[1]-dy[0]),fallback=Math.max(...dx.map(Math.abs),...dy.map(Math.abs))*.16||1,pixel=spread>0?Math.max((dx[1]-dx[0])/plot.w,(dy[1]-dy[0])/plot.h)*1.16:fallback/Math.min(plot.w,plot.h);
  real=scaleLinear([cx-pixel*plot.w/2,cx+pixel*plot.w/2],[plot.x,right]);imag=scaleLinear([cy-pixel*plot.h/2,cy+pixel*plot.h/2],[bottom,plot.y]);
  axis(l,real,true,{title:`Re / ${doc.unit}`});axis(l,imag,false,{title:`Im / ${doc.unit}`});
 }else{
  phase=linear(bounds.phase,[plot.x,right]);gain=linear(bounds.magnitude,[bottom,plot.y]);
  axis(l,phase,true,{title:t('展开相位 / °','Unwrapped phase / °')});axis(l,gain,false,{title:t('幅值 / dB','Magnitude / dB')});
 }
 const place=(p,lane)=>bode?[xFreq(Math.log10(p.row.frequency)),lane==='magnitude'?gain(p.db):phase(p.phase)]:nyquist?[real(p.row.real),imag(p.row.imag)]:[phase(p.phase),gain(p.db)];
 curves.forEach((curve,g)=>{
  const groupKey=l.groupKeys[g];
  for(const lane of['phase','magnitude'])curve.points.forEach((p,i)=>{
   const r=p.row,position=place(p,lane),id=recordId(r),common={identity:key('frequency-sample',id),colorIdentity:groupKey,index:r.row,transitionIndex:r.row,group:curve.group,row:r.row,frequencyLane:lane};
   const tip=`${r.label} · ${curve.group} · f ${fmt(r.frequency)} ${doc.frequencyUnit} · Re ${fmt(r.real)}, Im ${fmt(r.imag)} ${doc.unit} · ${fmt(p.db)} dB · ${fmt(p.phase)}°`;
   if(i){const previous=curve.points[i-1],a=place(previous,lane);line(l,{...common,identity:key('frequency-link',recordId(previous.row),id),recordIds:[recordId(previous.row),id],recordLabel:`${previous.row.label} → ${r.label}`},`response-${lane}-link`,a,position,a,{opacity:lane==='phase'?.43:.65,width:compact?.9:1.3,tooltip:tip});}
   // Both projections remain represented in every view. The phase ring meets
   // its solid counterpart without removing, duplicating or replacing samples.
   const ring=lane==='phase',radius=compact?(ring?2.4:1.7):(ring?3.5:2.4);
   dot(l,common,`response-${lane}`,position,radius,{opacity:ring?.85:.95,stroke:ring?.8:.2,paper:ring,editable:ring?'imag':'real',value:ring?r.imag:r.real,tooltip:tip+' · '+(ring?t('点击编辑虚部','Click to edit imaginary part'):t('点击编辑实部','Click to edit real part'))});
  });
 });
 // Links behind all samples; phase rings behind solid samples at merged points.
 const layer=m=>m.role.endsWith('-link')?0:m.frequencyLane==='phase'?1:2;
 l.marks.sort((a,b)=>layer(a)-layer(b));l.scales={logFrequency:xFreq,magnitude:gain,phase,real,imag};l.response=curves;l.phasePanel=phasePanel;
 return l;
}
