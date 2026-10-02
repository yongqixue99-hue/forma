import {copyScientificMotionState} from './scientific-motion-state.js';
// Interpolate a measured strip in its own frame. Rotating screen-coordinate
// vertices can turn a narrow segment into a zero-width line halfway through.
const mix=(a,b,q)=>a+(b-a)*q;
const at=(a,b,q)=>[mix(a[0],b[0],q),mix(a[1],b[1],q)];
const angleMix=(a,b,q)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*q;
const compoundFrames=new WeakMap();
export function copyMotionContour(points){const copied=points.map(p=>[...p]),frame=compoundFrames.get(points);if(frame)compoundFrames.set(copied,frame);copyScientificMotionState(points,copied);return copied;}
export const hasCompoundMotion=points=>compoundFrames.has(points);
function boxContour(boxes){
 const anchor=[boxes[0].x,boxes[0].y],vertices=boxes.flatMap(b=>[anchor,[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height],[b.x,b.y],anchor]);
 return vertices.flatMap((p,i)=>{const next=vertices[(i+1)%vertices.length],count=Math.floor(128/vertices.length)+(i<128%vertices.length?1:0);return Array.from({length:count},(_,j)=>at(p,next,j/count));});
}
export function interpolateBasicCompound(points,old,next,q,{resume=false}={}){
 if(!old)return null;
 const displayed=resume?compoundFrames.get(points):null,source=old.geometry,target=next.geometry,waffle=source.type==='waffle'?source:target.type==='waffle'?target:null;
 if(resume&&!displayed)return null;
 if(!displayed&&!waffle||!['rect','waffle'].includes(target.type)||!displayed&&!['rect','waffle'].includes(source.type))return null;
 if(q===0)return points;if(q===1)return next.points;
 const weights=displayed?.weights||waffle.regions.map(b=>b.width*b.height),sum=weights.reduce((a,b)=>a+b,0);
 if(!weights.length||sum<1e-10)return null;
 const partition=rect=>{let consumed=0;return weights.map(weight=>{const share=weight/sum,horizontal=rect.valueX!==undefined||rect.width>=rect.height,box=horizontal?{x:rect.x+rect.width*consumed,y:rect.y,width:rect.width*share,height:rect.height}:{x:rect.x,y:rect.y+rect.height*consumed,width:rect.width,height:rect.height*share};consumed+=share;return box;});};
 const from=displayed?.boxes||(source.type==='waffle'?source.regions:partition(source)),to=target.type==='waffle'?target.regions:partition(target);
 if(from.length!==to.length)return null;
 const boxes=from.map((box,i)=>Object.fromEntries(['x','y','width','height'].map(k=>[k,mix(box[k],to[i][k],q)]))),result=boxContour(boxes);
 compoundFrames.set(result,{boxes,weights});return result;
}
export function interpolateStrokeFrame(from,to,q){
 if(q===0)return from;if(q===1)return to;
 if(from.length!==128||to.length!==128)return null;
 const frame=p=>{const a=p[0],b=p[32],c=p[64],d=p[96],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],length=Math.hypot(...u),width=Math.hypot(...v);
  if(length<1e-10||width<1e-10||Math.hypot(a[0]+c[0]-b[0]-d[0],a[1]+c[1]-b[1]-d[1])>1e-7*Math.max(1,length,width)||Math.abs(u[0]*v[0]+u[1]*v[1])>1e-7*length*width)return null;
  return {center:[(a[0]+c[0])/2,(a[1]+c[1])/2],length,width,angle:Math.atan2(u[1],u[0]),sign:Math.sign(u[0]*v[1]-u[1]*v[0])};};
 const a=frame(from),b=frame(to);if(!a||!b||a.sign!==b.sign)return null;
 const center=at(a.center,b.center,q),angle=angleMix(a.angle,b.angle,q),c=Math.cos(angle),s=Math.sin(angle),length=mix(a.length,b.length,q),width=mix(a.width,b.width,q),corners=[[-length/2,-a.sign*width/2],[length/2,-a.sign*width/2],[length/2,a.sign*width/2],[-length/2,a.sign*width/2]];
 return corners.flatMap((p,i)=>Array.from({length:32},(_,j)=>{const x=mix(p[0],corners[(i+1)%4][0],j/32),y=mix(p[1],corners[(i+1)%4][1],j/32);return [center[0]+x*c-y*s,center[1]+x*s+y*c];}));
}

// Connectors follow the positions of their endpoint observations. Rotating
// a whole segment independently would detach it from those moving points.
export function interpolateStrokeEndpoints(from,to,q){
 if(q===0)return from;if(q===1)return to;
 if(from.length!==128||to.length!==128)return null;
 const frame=p=>({a:at(p[0],p[96],.5),b:at(p[32],p[64],.5),width:Math.hypot(p[0][0]-p[96][0],p[0][1]-p[96][1])});
 const f=frame(from),t=frame(to),a=at(f.a,t.a,q),b=at(f.b,t.b,q),length=Math.hypot(b[0]-a[0],b[1]-a[1]),width=mix(f.width,t.width,q);
 if(length<1e-10)return Array.from({length:128},()=>[...a]);
 const normal=[-(b[1]-a[1])*width/(2*length),(b[0]-a[0])*width/(2*length)],corners=[[a[0]+normal[0],a[1]+normal[1]],[b[0]+normal[0],b[1]+normal[1]],[b[0]-normal[0],b[1]-normal[1]],[a[0]-normal[0],a[1]-normal[1]]];
 return corners.flatMap((p,i)=>Array.from({length:32},(_,j)=>at(p,corners[(i+1)%4],j/32)));
}

function originalStrip(mark){
 const g=mark.geometry;
 if(g.type==='sector'){const radius=(g.r0+g.r1)/2,angle=(g.a0+g.a1)/2;return {center:[g.cx+radius*Math.cos(angle),g.cy+radius*Math.sin(angle)],angle:angle+Math.PI/2,length:(g.a1-g.a0)*radius,width:g.r1-g.r0,curvature:radius?1/radius:0};}
 if(g.type==='rect'){const horizontal=g.width>=g.height;return {center:[g.x+g.width/2,g.y+g.height/2],angle:horizontal?0:Math.PI/2,length:horizontal?g.width:g.height,width:horizontal?g.height:g.width,curvature:0};}
 return null;
}
function recoveredStrip(points){
 if(points.length!==128)return null;
 const widths=points.slice(0,64).map((p,i)=>Math.hypot(p[0]-points[127-i][0],p[1]-points[127-i][1])),width=widths.reduce((sum,v)=>sum+v,0)/64;
 if(Math.max(...widths)-Math.min(...widths)>1e-6*Math.max(1,width))return null;
 const ridge=points.slice(0,64).map((p,i)=>at(p,points[127-i],.5)),a=ridge[0],b=ridge[31],c=ridge.at(-1),direction=[ridge[32][0]-ridge[31][0],ridge[32][1]-ridge[31][1]],angle=Math.atan2(direction[1],direction[0]);
 const cross=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1])),chord=Math.hypot(c[0]-a[0],c[1]-a[1]);
 if(Math.abs(cross)<1e-8*Math.max(1,chord*chord))return {center:at(a,c,.5),angle,length:chord,width,curvature:0};
 const sq=p=>p[0]*p[0]+p[1]*p[1],o=[(sq(a)*(b[1]-c[1])+sq(b)*(c[1]-a[1])+sq(c)*(a[1]-b[1]))/cross,(sq(a)*(c[0]-b[0])+sq(b)*(a[0]-c[0])+sq(c)*(b[0]-a[0]))/cross],radius=Math.hypot(a[0]-o[0],a[1]-o[1]);
 let span=0,previous=Math.atan2(a[1]-o[1],a[0]-o[0]);for(const p of ridge.slice(1)){const theta=Math.atan2(p[1]-o[1],p[0]-o[0]);span+=Math.atan2(Math.sin(theta-previous),Math.cos(theta-previous));previous=theta;}
 if(!Number.isFinite(radius)||radius<1e-9)return null;
 const theta=Math.atan2(a[1]-o[1],a[0]-o[0])+span/2;return {center:[o[0]+radius*Math.cos(theta),o[1]+radius*Math.sin(theta)],angle:theta+Math.sign(span)*Math.PI/2,length:Math.abs(span)*radius,width,curvature:Math.sign(span)/radius};
}
function stripPoints(frame){
 const {center,angle,length,width,curvature:k}=frame,c=Math.cos(angle),s=Math.sin(angle),point=(u,side)=>{const x=length*u,theta=k*x,along=Math.abs(k)<1e-10?x:Math.sin(theta)/k,bend=Math.abs(k)<1e-10?0:(1-Math.cos(theta))/k,offset=side*width/2,xx=along-offset*Math.sin(theta),yy=bend+offset*Math.cos(theta);return [center[0]+xx*c-yy*s,center[1]+xx*s+yy*c];};
 return [...Array.from({length:64},(_,i)=>point(i/63-.5,-1)),...Array.from({length:64},(_,i)=>point(.5-i/63,1))];
}
export function interpolateBasicStrip(points,old,next,q,{resume=false,bounds}={}){
 if(q===0)return points;if(q===1)return next.points;
 if(!old||!['sector','rect'].includes(old.geometry.type)||!['sector','rect'].includes(next.geometry.type)||!resume&&old.geometry.type==='rect'&&next.geometry.type==='rect')return null;
 const a=resume?recoveredStrip(points):originalStrip(old),b=originalStrip(next);if(!a||!b||a.length<1e-8||b.length<1e-8)return null;
 const frame={center:at(a.center,b.center,q),angle:angleMix(a.angle,b.angle,q),length:mix(a.length,b.length,q),width:mix(a.width,b.width,q)};
 // Interpolate total bend rather than curvature: the strip opens into its
 // own straight bar without an expanding radius pushing it out of the plot.
 frame.curvature=mix(a.curvature*a.length,b.curvature*b.length,q)/frame.length;
 if(Math.abs(frame.curvature)*frame.width/2>1)frame.width=Math.min(frame.width,2/Math.abs(frame.curvature));
 const result=stripPoints(frame);
 if(!bounds)return result;
 // An almost complete ring can briefly be longer than the target canvas
 // while opening. Fit the whole strip uniformly; never clip its vertices.
 const xs=result.map(p=>p[0]),ys=result.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min(1,bounds.w/(x1-x0||1),bounds.h/(y1-y0||1)),center=[(x0+x1)/2,(y0+y1)/2],half=[(x1-x0)*scale/2,(y1-y0)*scale/2],target=[Math.max(bounds.x+half[0],Math.min(bounds.x+bounds.w-half[0],center[0])),Math.max(bounds.y+half[1],Math.min(bounds.y+bounds.h-half[1],center[1]))];
 return result.map(p=>[target[0]+(p[0]-center[0])*scale,target[1]+(p[1]-center[1])*scale]);
}
