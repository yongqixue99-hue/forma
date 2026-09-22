import {uiText,uiMarkup,uiMessage} from './locale.js';
import {entityNames,entityKey} from './entity-identity.js';
import {recordId} from './data-identity.js';
import {scaleLinear} from 'd3';
import {MorphChart,rectPoints,polygonPoints,circlePoints,POINTS} from './morph.js';
import {mixOutline} from './morph-foundation.js';
import {seriesViews,seriesEligibility,seriesDomain,seriesKey,seriesPeriods,isSeriesDatePeriod} from './series-rules.js';
import {resolveBoundColor} from './color-semantics.js';

const unique=a=>[...new Set(a)];
import {formatNumber as fmt,formatDecimal} from './number-format.js';
const short=(s,n=8)=>[...s].length>n?[...s].slice(0,n-1).join('')+'…':s;
function legendLayout(series,w,left){
  const limit=Math.max(4,Math.min(14,Math.floor((w-70)/(Math.min(series.length,3)*11)-3)));
  let x=left,y=16;
  const entries=series.map(name=>{const label=short(name,limit),width=[...label].reduce((n,c)=>n+(/[\u2e80-\uffff]/.test(c)?11:6.5),29);
    if(x>left&&x+width>w-45){x=left;y+=19;}const item={name,label,x,y};x+=width;return item;
  });return {entries,bottom:y};
}

export function layoutSeries(doc,view,w=800,h=440,{domain}={}){
  const report=seriesEligibility(doc,view);if(!report.valid)throw new Error(report.reason);
  if(view==='small-multiples')return layoutSmallMultiples(doc,view,w,h,{domain});
  if(view.endsWith('-bars'))return layoutHorizontal(doc,view,w,h,{domain});
  const periods=seriesPeriods(doc),series=entityNames(doc,'series');
  const lookup=new Map(doc.data.map(r=>[r.label,r])),n=periods.length,m=series.length,wide=w>=650;
  const rank=view==='series-rank',percent=view.startsWith('percent'),stacked=view.startsWith('stacked')||percent,isLine=view==='multi-line'||rank,isArea=view.includes('area');
  const legend=legendLayout(series,w,wide?48:38),plotTop=legend.bottom+22;
  const plot={x:wide?48:38,y:plotTop,w:w-(wide?76:56),h:h-plotTop-38};
  const bottom=plot.y+plot.h,top=plot.y+8,step=plot.w/n;
  const extent=percent?[0,100]:rank?[1,m]:domain||seriesDomain(doc,view),y=rank?scaleLinear(extent,[top,bottom]):scaleLinear(extent,[bottom,top]).nice(4);
  const totals=periods.map(p=>series.reduce((s,name)=>s+(lookup.get(seriesKey(p,name)).value??0),0));
  const datePeriods=periods.every(isSeriesDatePeriod),dates=periods.map(p=>Date.parse(p)),time=datePeriods?scaleLinear([Math.min(...dates),Math.max(...dates)],[plot.x+step/2,plot.x+plot.w-step/2]):null;
  const atPeriod=i=>isLine&&time?time(dates[i]):plot.x+(i+.5)*step;
  const endpoints=new Map();
  periods.forEach((period,i)=>{let cumulative=0;series.forEach((name,j)=>{
    const row=lookup.get(seriesKey(period,name)),value=row.value??0,place=rank?1+series.filter(other=>lookup.get(seriesKey(period,other)).value>value).length:null,v=rank?place:percent?value/totals[i]*100:value;
    const low=stacked?cumulative:0,high=low+v;cumulative+=v;
    endpoints.set(row.label,{cx:atPeriod(i),low:y(low),high:y(high),valueY:y(v),row,rank:place,share:totals[i]>0?value/totals[i]:null});
  });});
  const marks=[],guides=[],labels=[],stride=Math.ceil(n/(wide?12:5));
  for(const tick of rank?series.map((_,i)=>i+1):y.ticks(h<240?3:4)){
    guides.push({x1:plot.x,x2:plot.x+plot.w,y1:y(tick),y2:y(tick),major:tick===0});
    labels.push({x:plot.x-9,y:y(tick)+3,text:fmt(tick)+(percent?'%':''),anchor:'end',small:true});
  }
  periods.forEach((p,i)=>{if(i===0||i===n-1||i%stride===0&&i<n-stride)labels.push({x:atPeriod(i),y:bottom+22,text:short(p,wide?8:5),anchor:'middle',small:true});});
  for(const [index,row] of doc.data.entries()){
    const i=periods.indexOf(row.period),j=series.indexOf(row.series),e=endpoints.get(row.label);
    let points,geometry,label={visible:false};
    if(!isArea&&!isLine){
      const width=stacked?step*.62:step*.76/m,x=stacked?e.cx-width/2:plot.x+i*step+step*.12+j*width;
      const height=Math.abs(e.high-e.low),yy=Math.min(e.high,e.low),barW=stacked?width:width*.87;
      points=rectPoints(x,yy,barW,height);geometry={type:'rect',x,y:yy,width:barW,height,baseline:y(0),valueY:e.high};
      if(n<=8&&m<=4&&step>70)label={x:x+barW/2,y:stacked?(e.high+e.low)/2+4:e.high+(row.value<0?14:-7),text:row.value===null?'—':percent?formatDecimal(e.share*100,1)+'%':fmt(row.value),inside:stacked,visible:!stacked||height>22,anchor:'middle',fontSize:10};
    }else{
      const neighbor=k=>k<0||k>=n?e:endpoints.get(seriesKey(periods[k],row.series));
      let prev=neighbor(i-1),next=neighbor(i+1);if(prev.row.value===null)prev=e;if(next.row.value===null)next=e;
      const left=[(e.cx+prev.cx)/2,(e.high+prev.high)/2],right=[(e.cx+next.cx)/2,(e.high+next.high)/2];
      const ridge=[left,[e.cx,e.high],right],floor=[[right[0],(e.low+next.low)/2],[e.cx,e.low],[left[0],(e.low+prev.low)/2]];
      points=polygonPoints(isLine?[...ridge.map(([x,yy])=>[x,yy-1.15]),...ridge.toReversed().map(([x,yy])=>[x,yy+1.15])]:[...ridge,...floor]);
      geometry={type:view,cx:e.cx,cy:e.high,baseline:rank?bottom:y(0),left,right};
    }
    if(row.value===null)points=Array.from({length:POINTS},()=>[e.cx,bottom]);
    marks.push({key:recordId(row),index,value:row.value,rank:e.rank,series:row.series,seriesId:entityKey(row,'series'),period:row.period,periodIndex:i,row:row.row,tooltipLabel:`${row.period} · ${row.series}`,share:e.share,total:totals[i],points,geometry,label});
  }
  return {view,w,h,wide,plot,marks,guides,labels,overlays:[],legend:[],seriesLegend:legend.entries.map(e=>({...e,key:entityKey(doc.data.find(r=>r.series===e.name),'series')})),periodCount:n,series,total:0,percent};
}

function layoutSmallMultiples(doc,view,w,h,{domain}){
  const periods=seriesPeriods(doc),series=entityNames(doc,'series'),wide=w>=650,n=periods.length;
  const columns=w>=500||series.length>3?2:1,rows=Math.ceil(series.length/columns),gapX=36,gapY=Math.min(50,Math.max(42,(h-80)/rows*.32)),plot={x:wide?48:36,y:35,w:w-(wide?72:54),h:h-63};
  const cellW=(plot.w-gapX*(columns-1))/columns,cellH=(plot.h-gapY*(rows-1))/rows,extent=domain||seriesDomain(doc,view),datePeriods=periods.every(isSeriesDatePeriod),dates=periods.map(p=>Date.parse(p));
  const marks=[],guides=[],labels=[],lookup=new Map(doc.data.map(r=>[r.label,r]));
  series.forEach((name,j)=>{
    const left=plot.x+j%columns*(cellW+gapX),top=plot.y+Math.floor(j/columns)*(cellH+gapY),bottom=top+cellH;
    const x=datePeriods?scaleLinear([Math.min(...dates),Math.max(...dates)],[left,left+cellW]):scaleLinear([0,n-1],[left,left+cellW]),y=scaleLinear(extent,[bottom,top+6]).nice(4),xp=i=>x(datePeriods?dates[i]:i);
    labels.push({x:left,y:top-8,text:short(name,Math.max(8,Math.floor(cellW/10))),fullText:name,fontSize:11,anchor:'start'});
    const ticks=cellH<90?[...new Set([y.domain()[0],y.domain()[1]])]:y.ticks(3);
    for(const v of ticks){guides.push({x1:left,x2:left+cellW,y1:y(v),y2:y(v),major:v===0});labels.push({x:left-7,y:y(v)+3,text:fmt(v),anchor:'end',fontSize:8});}
    for(const i of [0,n-1])labels.push({x:xp(i),y:bottom+16,text:datePeriods?periods[i].slice(5):short(periods[i],8),anchor:i?'end':'start',fontSize:9});
    periods.forEach((period,i)=>{
      const row=lookup.get(seriesKey(period,name)),cy=row.value===null?bottom:y(row.value),cx=xp(i),prev=i>0?lookup.get(seriesKey(periods[i-1],name)):row,next=i<n-1?lookup.get(seriesKey(periods[i+1],name)):row;
      const leftPoint=prev.value===null?[cx,cy]:[(cx+xp(Math.max(0,i-1)))/2,(cy+y(prev.value))/2],rightPoint=next.value===null?[cx,cy]:[(cx+xp(Math.min(n-1,i+1)))/2,(cy+y(next.value))/2];
      const ridge=[leftPoint,[cx,cy],rightPoint],points=row.value===null?Array.from({length:POINTS},()=>[cx,bottom]):polygonPoints([...ridge.map(([a,b])=>[a,b-.9]),...ridge.toReversed().map(([a,b])=>[a,b+.9])]);
      marks.push({key:recordId(row),index:doc.data.indexOf(row),value:row.value,series:name,seriesId:entityKey(row,'series'),period,periodIndex:i,row:row.row,tooltipLabel:`${period} · ${name}`,points,geometry:{type:view,cx,cy,baseline:bottom,left:leftPoint,right:rightPoint},label:{visible:false}});
    });
  });
  return {view,w,h,wide,plot,marks,guides,labels,overlays:[],legend:[],seriesLegend:[],periodCount:n,series,total:0,percent:false};
}

function layoutHorizontal(doc,view,w,h,{domain}){
  const periods=seriesPeriods(doc),series=entityNames(doc,'series'),n=periods.length,m=series.length,wide=w>=650;
  const percent=view==='percent-bars',stacked=view!=='grouped-bars',legend=legendLayout(series,w,wide?92:64);
  const plot={x:wide?92:64,y:legend.bottom+25,w:w-(wide?132:95),h:h-legend.bottom-61},bottom=plot.y+plot.h,step=plot.h/n;
  const x=scaleLinear(percent?[0,100]:domain||seriesDomain(doc,view),[plot.x,plot.x+plot.w]).nice(4),lookup=new Map(doc.data.map(r=>[r.label,r]));
  const totals=periods.map(p=>series.reduce((sum,name)=>sum+(lookup.get(seriesKey(p,name)).value??0),0));
  const marks=[],guides=[],labels=[],byKey=new Map(),stride=Math.ceil(n/Math.max(1,Math.floor(plot.h/22)));
  for(const v of x.ticks(wide?5:3)){guides.push({x1:x(v),x2:x(v),y1:plot.y,y2:bottom,major:v===0});labels.push({x:x(v),y:bottom+21,text:fmt(v)+(percent?'%':''),anchor:'middle',small:true});}
  periods.forEach((period,i)=>{
    let running=0;
    if(i===0||i===n-1||i%stride===0&&i<n-stride)labels.push({x:plot.x-10,y:plot.y+(i+.5)*step+3,text:short(period,wide?9:5),anchor:'end',small:true});
    series.forEach((name,j)=>{
      const row=lookup.get(seriesKey(period,name)),v=percent?row.value/totals[i]*100:row.value??0,low=stacked?running:0,high=low+v;running+=v;
      const height=stacked?step*.6:step*.78/m,cy=plot.y+(i+.5)*step,yy=stacked?cy-height/2:plot.y+i*step+step*.11+j*height;
      const start=x(low),end=x(high),xx=Math.min(start,end),width=Math.abs(end-start),bh=stacked?height:height*.87;
      const points=row.value===null?Array.from({length:POINTS},()=>[x(0),yy]):rectPoints(xx,yy,width,bh);
      byKey.set(row.label,{points,geometry:{type:'rect',x:xx,y:yy,width,height:bh,baseline:x(0),valueX:end,scale:(x.range()[1]-x.range()[0])/(x.domain()[1]-x.domain()[0]),low,high},label:{x:stacked?(start+end)/2:end+(v<0?-7:7),y:yy+bh/2+3,text:row.value===null?'—':percent?fmt(v)+'%':fmt(row.value),inside:stacked,anchor:stacked?'middle':v<0?'end':'start',fontSize:10,visible:bh>14&&(!stacked||width>30)}});
    });
  });
  doc.data.forEach((row,index)=>marks.push({key:recordId(row),index,value:row.value,series:row.series,seriesId:entityKey(row,'series'),period:row.period,periodIndex:periods.indexOf(row.period),row:row.row,tooltipLabel:`${row.period} · ${row.series}`,share:totals[periods.indexOf(row.period)]>0?(row.value??0)/totals[periods.indexOf(row.period)]:null,total:totals[periods.indexOf(row.period)],...byKey.get(row.label)}));
  return {view,w,h,wide,plot,marks,guides,labels,overlays:[],legend:[],seriesLegend:legend.entries.map(e=>({...e,key:entityKey(doc.data.find(r=>r.series===e.name),'series')})),periodCount:n,series,total:0,percent};
}

export class SeriesMorphChart extends MorphChart{
  // Reorient many series through their own small endpoints. Interpolating
  // full line/area strips into horizontal bars creates crossing wedges.
  endpoint(mark){const g=mark.geometry;return g.type==='rect'?(g.valueX===undefined?[g.x+g.width/2,g.valueY??g.y]:[g.valueX,g.y+g.height/2]):[g.cx,g.cy];}
  reorient(points,old,mark,q,resume=false){
    if(!old||old.value===null||mark.value===null)return null;
    const horizontal=m=>m.geometry.type==='rect'&&m.geometry.valueX!==undefined;
    if(horizontal(old)===horizontal(mark))return null;
    const start=resume?points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]):this.endpoint(old),end=this.endpoint(mark),a=circlePoints(...start,2.5),b=circlePoints(...end,2.5);
    if(q<.28)return mixOutline(points,a,q/.28);
    if(q<.7){const t=(q-.28)/.42;return circlePoints(start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t,2.5);}
    return mixOutline(b,mark.points,(q-.7)/.3);
  }
  interpolateMark(old,mark,q,{from}){return this.reorient(from,old,mark,q);}
  interpolateResumedMark(points,mark,q,{old}){return this.reorient(points,old,mark,q,true);}
  dimensions(){return {w:Math.max(280,this.options.width||this.host.clientWidth||800),h:Math.max(160,this.options.height||this.host.clientHeight||440)};}
  eligibility(doc,view){return seriesEligibility(doc,view);}
  layoutFor(doc,view,w,h,options){return layoutSeries(doc,view,w,h,options);}
  viewInfo(view){return seriesViews.find(v=>v.id===view);}
  colorKey(mark){return mark.seriesId??mark.series;}
  paint(layout){
    super.paint(layout);
    for(const mark of layout.marks){
      const item=this.nodes.get(mark.key);
      item.shape.setAttribute('fill-opacity',['multi-line','small-multiples','series-rank'].includes(layout.view)?1:.84);
      item.shape.setAttribute('stroke-width',layout.view.includes('area')||['multi-line','small-multiples','series-rank'].includes(layout.view)?0:.55);
      item.texture.setAttribute('opacity',0);
      const value=mark.value===null?uiText('未采集'):`${fmt(mark.value)} ${this.doc.unit}`;
      const text=`${mark.tooltipLabel} · ${value}${mark.rank?uiMessage` · 第 ${mark.rank} 名`:''}${layout.percent?uiMessage` · ${fmt(mark.share*100)}% · 当期合计 ${fmt(mark.total)} ${this.doc.unit}`:''}`;
      item.title.textContent=text;item.group.setAttribute('aria-label',text);
      if(this.options.editable){item.group.dataset.editRow=mark.row;item.group.dataset.editField='value';item.group.setAttribute('role','button');item.group.setAttribute('tabindex','0');}
    }
  }
  decorate(layout){
    super.decorate(layout);
    for(const text of this.labelLayer.querySelectorAll('text')){text.setAttribute('font-family','"DM Mono",ui-monospace,monospace');text.setAttribute('font-size','11');}
    // Replace the decorative encoding tag with the actual series legend.
    for(const el of [...this.guideLayer.querySelectorAll('text')].filter(el=>el.getAttribute('y')==='15'))el.remove();
    const t=this.theme;
    for(const {name,key,label,x,y} of layout.seriesLegend){
      this.el('circle',{cx:x+3,cy:y-3,r:3,fill:resolveBoundColor(this.options,key,t.color(this.colorIndices.get(key)))},this.guideLayer);
      const text=this.text(this.guideLayer,x+13,y,label,{'font-family':'Manrope,"PingFang SC",sans-serif','font-size':11});this.el('title',{},text,name);
    }
    this.text(this.guideLayer,layout.w-18,16,layout.view==='series-rank'?uiText('名次 · 同值并列'):layout.percent?'%':short(this.doc.unit,8),{'text-anchor':'end','font-size':10});
    if(['multi-line','small-multiples','series-rank'].includes(layout.view))for(const mark of layout.marks){if(mark.value===null)continue;this.el('circle',{cx:mark.geometry.cx,cy:mark.geometry.cy,r:layout.periodCount>16?2:3,fill:t.bg,stroke:resolveBoundColor(this.options,this.colorKey(mark),t.color(this.colorIndices.get(this.colorKey(mark)))),'stroke-width':1.4,'data-series-point':mark.key},this.labelLayer);}
  }
}
