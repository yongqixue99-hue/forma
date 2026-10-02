import {formatNumber as fmt} from './number-format.js';
import {circlePoints,polygonPoints} from './morph.js';
export const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,q)=>a+(b-a)*q,pointMix=(a,b,q)=>[mix(a[0],b[0],q),mix(a[1],b[1],q)];
export const key=(...parts)=>JSON.stringify(parts),short=(s,n)=>[...String(s)].length>n?[...String(s)].slice(0,n-1).join('')+'…':String(s);
export {formatNumber as fmt} from './number-format.js';
export const hash=s=>[...s].reduce((n,c)=>(n*31+c.codePointAt(0))>>>0,7);
export function compactNames(names,limit){
  const abbreviated=names.map(name=>{const chars=[...name];if(chars.length<=limit)return name;const head=Math.max(1,Math.floor((limit-1)/2)),tail=Math.max(1,limit-head-1);return chars.slice(0,head).join('')+'…'+chars.slice(-tail).join('');});
  return abbreviated.map((name,i)=>abbreviated.indexOf(name)!==abbreviated.lastIndexOf(name)?String(i+1).padStart(2,'0'):name);
}
export function padded(bounds,log=false){let [lo,hi]=bounds;if(log){if(lo===hi)return [lo/1.3,hi*1.3];const d=Math.log(hi/lo)*.08;return [lo*Math.exp(-d),hi*Math.exp(d)];}const d=(hi-lo)*.08||(Math.abs(lo)*.1)||1;return [lo-d,hi+d];}
export function segment(a,b,width=1.2){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,n=[-dy/l*width/2,dx/l*width/2];return polygonPoints([[a[0]+n[0],a[1]+n[1]],[b[0]+n[0],b[1]+n[1]],[b[0]-n[0],b[1]-n[1]],[a[0]-n[0],a[1]-n[1]]]);}
export function base(doc,view,w,h,plot){return {view,w,h,wide:w>=650,plot,marks:[],guides:[],labels:[],overlays:[],legend:[],total:0,heading:'',details:'',doc,transitionCount:doc.data.length};}
export function axis(layout,scale,horizontal,{title='',log=false}={}){
  const {plot,w,h}=layout,bottom=plot.y+plot.h;
  let ticks=scale.ticks(4);if(log&&ticks.length>6){const [a,b]=scale.domain();ticks=Array.from({length:5},(_,i)=>Math.exp(Math.log(a)+(Math.log(b)-Math.log(a))*i/4));}
  for(const v of ticks){const p=scale(v);if(p<Math.min(...scale.range())-.1||p>Math.max(...scale.range())+.1)continue;
    layout.guides.push(horizontal?{x1:p,x2:p,y1:plot.y,y2:bottom,major:v===0}:{x1:plot.x,x2:plot.x+plot.w,y1:p,y2:p,major:v===0});
    layout.labels.push(horizontal?{x:p,y:bottom+17,text:fmt(v),anchor:'middle',small:true}:{x:plot.x-8,y:p+3,text:fmt(v),anchor:'end',small:true});
  }
  if(title)layout.labels.push({x:horizontal?plot.x+plot.w:plot.x,y:horizontal?h-6:plot.y-12,text:short(title,Math.max(12,Math.floor(w/13))),anchor:horizontal?'end':'start',fontSize:10});
}
export function glyph(layout,base,role,points,anchor,{opacity=1,stroke=0,paper=false,entrance,editable,tooltip,value=0,...rest}={}){
  const mark={...base,key:key(base.identity,role),role,value,points,anchor,opacity,stroke,paper,geometry:{type:'science',anchor},label:{visible:false},entrance:entrance||points.map(()=>anchor),editable,tooltip,...rest};layout.marks.push(mark);return mark;
}
export function dot(layout,base,role,p,r,options={}){return glyph(layout,base,role,circlePoints(...p,r),p,{...options,point:p,radius:r});}
export function line(layout,base,role,a,b,anchor,options={}){return glyph(layout,base,role,segment(a,b,options.width||1.2),anchor,{ribbonSegment:true,...options});}

// A density contour has two sampled flanks: low→high, then high→low.
// Interpolate in its own value/width frame. Screen-coordinate interpolation
// shears a rotating half-violin because its two widths change asymmetrically.
// Recover the frame from the displayed points so repeated interruptions do
// not fall back to a previous settled layout or change sample correspondence.
export function interpolateDensityContour(from,to,q){
  if(q===0)return from;if(q===1)return to;
  if(from.length!==to.length||from.length<4||from.length%2)return null;
  const frame=points=>{
    const half=points.length/2,start=pointMix(points[0],points.at(-1),.5),end=pointMix(points[half-1],points[half],.5);
    const center=pointMix(start,end,.5),dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy);
    return {center,length,angle:Math.atan2(dy,dx)};
  };
  const a=frame(from),b=frame(to);if(a.length<1e-12)a.angle=b.angle;if(b.length<1e-12)b.angle=a.angle;
  const angle=a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*q;
  const center=pointMix(a.center,b.center,q),length=mix(a.length,b.length,q),cos=Math.cos(angle),sin=Math.sin(angle);
  const local=(p,f)=>{const dx=p[0]-f.center[0],dy=p[1]-f.center[1],c=Math.cos(f.angle),s=Math.sin(f.angle);return [(dx*c+dy*s)/(f.length||1),-dx*s+dy*c];};
  return to.map((p,i)=>{const start=local(from[i],a),end=local(p,b),u=mix(start[0],end[0],q)*length,v=mix(start[1],end[1],q);return [center[0]+u*cos-v*sin,center[1]+u*sin+v*cos];});
}

// Preserve the full interpolation contour in memory. Only collinear vertices
// are omitted from SVG serialization; curves and corners keep their geometry.
export function compactContour(points){
  // Remove adjacent duplicates before collinearity: repeated endpoint/gap
  // corners otherwise disappear from the SVG despite valid memory geometry.
  const clean=points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length];return p[0]!==a[0]||p[1]!==a[1];});
  const kept=clean.filter((p,i)=>{const a=clean[(i+clean.length-1)%clean.length],b=clean[(i+1)%clean.length],u=[p[0]-a[0],p[1]-a[1]],v=[b[0]-p[0],b[1]-p[1]];return Math.abs(u[0]*v[1]-u[1]*v[0])>1e-10*Math.max(1,Math.hypot(...u)*Math.hypot(...v))||u[0]*v[0]+u[1]*v[1]<0;});
  return kept.length?kept:[points[0]];
}
