import {color as parseColor} from 'd3';
import {wrapChartText,chartTextWidth} from './text-wrap.js';
import {formatNumber} from './number-format.js';
export const labelFont='"Manrope Variable",Manrope,-apple-system,"PingFang SC",sans-serif';
const channels=value=>{const c=parseColor(value)?.rgb();return c?[c.r,c.g,c.b]:[248,247,244];};
const luminance=value=>channels(value).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function labelInk(surface,foreground='#262626'){
 return [foreground,'#ffffff','#000000'].find(ink=>contrastRatio(ink,surface)>=4.5)||'#000000';
}
export function blendedSurface(color,background,opacity=1){const a=channels(color),b=channels(background);return `rgb(${a.map((v,i)=>Math.round(v*opacity+b[i]*(1-opacity))).join(',')})`;}
export function boundedLabel(text,width,maxLines=2,fontSize=12){
 const full=String(text),lines=wrapChartText(full,Math.max(1,width/fontSize));
 if(lines.length>maxLines){lines.length=maxLines;let end=lines.at(-1);while(end&&chartTextWidth(end+'…',fontSize)>width)end=end.slice(0,-1);lines[lines.length-1]=end.trimEnd()+'…';}
 return {text:full,lines,fontSize,lineHeight:fontSize*1.3};
}
export function areaDataLabel(name,value,box,{share,center=true}={}){
 const padding=12,width=box.width-padding*2,height=box.height-padding*2;
 if(width<42||height<34)return {visible:false};
 const fontSize=width>140?13:11,maxLines=height>86?3:height>53?2:1;
 const heading=boundedLabel(name,width,maxLines,fontSize),valueText=formatNumber(value);
 const detail=share===undefined?valueText:`${valueText} · ${(share*100).toFixed(1)}%`;
 const detailText=chartTextWidth(detail,13)<=width?detail:valueText;
 const numberSize=Math.min(20,Math.max(11,width/(detailText.length*.64)),height*.35);
 const blockHeight=heading.lines.length*heading.lineHeight+numberSize+9;
 if(blockHeight>height+5||chartTextWidth(detailText,numberSize)>width)return {visible:false};
 return {x:box.x+(center?box.width/2:padding),y:box.y+(box.height-blockHeight)/2+heading.fontSize,heading:heading.lines,headingSize:heading.fontSize,headingLineHeight:heading.lineHeight,text:detailText,fullText:`${name}: ${detail}`,bodyOffset:heading.lines.length*heading.lineHeight+7,inside:true,anchor:center?'middle':'start',fontSize:numberSize};
}
// Fixed outside positions with collision spacing; connectors retain the actual sector identity.
export function sectorCallouts(marks,doc,plot,{total,fontSize=11}={}){
 const groups=[[],[]],width=Math.min(178,plot.w*.24);
 for(const m of marks){const g=m.geometry;if(!(g.a1>g.a0))continue;const a=(g.a0+g.a1)/2,side=Math.cos(a)>=0?1:0;
  groups[side].push({m,a,desired:g.cy+Math.sin(a)*(g.r1+16),name:doc.data[m.index].label});}
 for(const [side,items]of groups.entries()){
  items.sort((a,b)=>a.desired-b.desired);const gap=Math.min(54,(plot.h-20)/Math.max(1,items.length));
  for(let i=0;i<items.length;i++)items[i].y=Math.max(items[i].desired,plot.y+14,i?items[i-1].y+gap:0);
  const excess=(items.at(-1)?.y||0)-(plot.y+plot.h-22);if(excess>0)for(const item of items)item.y-=excess;
  for(let i=items.length-2;i>=0;i--)items[i].y=Math.min(items[i].y,items[i+1].y-gap);
  for(const item of items){const {m,a,name}=item,g=m.geometry,x=side?plot.x+plot.w-width+8:plot.x+width-8;
   const heading=boundedLabel(name,width-16,gap>48?2:1,fontSize),amount=formatNumber(m.value),percent=total?`${(m.value/total*100).toFixed(1)}%`:'';
   const detail=chartTextWidth(`${amount} · ${percent}`,fontSize)<=width-12?`${amount} · ${percent}`:amount;
   m.label={x,y:item.y-heading.lines.length*heading.lineHeight/2,heading:heading.lines,headingSize:fontSize,headingLineHeight:heading.lineHeight,text:detail,fullText:`${name}: ${amount} (${percent})`,fontSize,bodyOffset:heading.lines.length*heading.lineHeight+3,anchor:side?'start':'end',inside:false,leader:[[g.cx+Math.cos(a)*g.r1,g.cy+Math.sin(a)*g.r1],[g.cx+Math.cos(a)*(g.r1+12),item.y],[x+(side?-6:6),item.y]]};
  }
 }
}

export function drawSectorLabels(scene,marks,doc,plot){
 const fontSize=scene.compact?8:11;
 sectorCallouts(marks,doc,plot,{total:marks.reduce((sum,m)=>sum+m.value,0),fontSize});
 for(const mark of marks){const l=mark.label;if(!l||l.visible===false)continue;
  const color=scene.theme.objectColor(doc.data[mark.index],scene.theme.color(mark.index)),group=scene.group({'data-data-label':doc.data[mark.index]._id||doc.data[mark.index].label,'aria-label':l.fullText});
  scene.el('polyline',{points:l.leader.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':.9,'stroke-opacity':.7},group);
  const attrs={'text-anchor':l.anchor,'font-family':labelFont,'font-size':fontSize,fill:scene.theme.fg,stroke:scene.theme.bg,'stroke-width':3,'paint-order':'stroke','stroke-linejoin':'round'};
  l.heading.forEach((line,i)=>scene.text(l.x,l.y+i*l.headingLineHeight,line,{...attrs,'font-weight':600},group));
  scene.text(l.x,l.y+l.bodyOffset,l.text,attrs,group);scene.reveal(group,.65,.25);
 }
}

export function spaceAxisLabels(labels,plot){
 const rows=new Map();for(const l of labels)if(l.small&&l.y>=plot.y+plot.h-1&&['middle','start','end'].includes(l.anchor)){const key=l.y;if(!rows.has(key))rows.set(key,[]);rows.get(key).push(l);}
 const removed=new Set();for(const row of rows.values()){
  if(row.length<3)continue;row.sort((a,b)=>a.x-b.x);
  const bounds=l=>{const width=Math.max(...(l.lines||[l.text]).map(t=>chartTextWidth(t,l.fontSize||11)));return [l.x-(l.anchor==='end'?width:l.anchor==='middle'?width/2:0),l.x+(l.anchor==='start'?width:l.anchor==='middle'?width/2:0)];};
  let previous=row[0];for(let i=1;i<row.length;i++){const current=row[i];if(bounds(current)[0]<bounds(previous)[1]+8){if(i===row.length-1){removed.add(previous);previous=current;}else removed.add(current);}else previous=current;}
 }
 return labels.filter(l=>!removed.has(l));
}
