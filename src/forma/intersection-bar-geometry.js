import {pointMix,segment} from './scientific-geometry.js';
import {circlePoints} from './morph.js';
import {scientificMotionState,setScientificMotionState} from './scientific-motion-state.js';
const mix=(a,b,q)=>a+(b-a)*q;
function interpolatedFrame(a,b,q){
 const frame={center:pointMix(a.center,b.center,q),angle:a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*q,bounds:b.bounds};
 for(const key of['pitch','rank','length','width','maxLength','minOffset','ranks'])frame[key]=mix(a[key],b[key],q);
 if(a.size!==undefined)frame.size=mix(a.size,b.size,q);
 if(a.offsets)frame.offsets=a.offsets.map((v,i)=>mix(v,b.offsets[i],q));
 // A ninety-degree transpose can temporarily exceed the chart's height.
 // Fit the complete coordinate system, including the original membership
 // matrix, uniformly; clipping or fitting each count separately changes its
 // ratio and breaks the correspondence with its actual member row.
 const v=[Math.cos(frame.angle),Math.sin(frame.angle)],n=[-v[1],v[0]],extent=((frame.ranks-1)*frame.pitch+frame.width)/2,box=[-extent,extent].flatMap(rank=>[frame.minOffset,frame.maxLength].map(value=>[frame.center[0]+n[0]*rank+v[0]*value,frame.center[1]+n[1]*rank+v[1]*value])),x0=Math.min(...box.map(p=>p[0])),x1=Math.max(...box.map(p=>p[0])),y0=Math.min(...box.map(p=>p[1])),y1=Math.max(...box.map(p=>p[1])),bounds=frame.bounds,scale=Math.min(1,bounds.w/(x1-x0||1),bounds.h/(y1-y0||1)),center=[(x0+x1)/2,(y0+y1)/2],half=[(x1-x0)*scale/2,(y1-y0)*scale/2],fitted=[Math.max(bounds.x+half[0],Math.min(bounds.x+bounds.w-half[0],center[0])),Math.max(bounds.y+half[1],Math.min(bounds.y+bounds.h-half[1],center[1]))];
 frame.center=frame.center.map((value,k)=>fitted[k]+(value-center[k])*scale);
 for(const key of['pitch','length','width','maxLength','minOffset','size'])if(frame[key]!==undefined)frame[key]*=scale;
 if(frame.offsets)frame.offsets=frame.offsets.map(value=>value*scale);
 return frame;
}
export function intersectionBarPoints(frame){
 const {center,angle,pitch,rank,length,width}=frame,v=[Math.cos(angle),Math.sin(angle)],n=[-v[1],v[0]],base=[center[0]+n[0]*rank*pitch,center[1]+n[1]*rank*pitch],p=(u,side)=>[base[0]+v[0]*length*u+n[0]*width*side/2,base[1]+v[1]*length*u+n[1]*width*side/2];
 return [...Array.from({length:64},(_,i)=>p(i/63,-1)),...Array.from({length:64},(_,i)=>p(1-i/63,1))];
}
// Rotate the rank/value coordinate frame as a whole. Blending each wide bar's
// screen corners turns a vertical comparison into overlapping diagonal slabs.
// Count lengths and row identity remain original; only their encoding rotates.
export function interpolateIntersectionBar(from,old,next,q){
 if(!next.intersectionBar)return null;
 const a=scientificMotionState(from)?.intersectionBar||scientificMotionState(old.points)?.intersectionBar||old.intersectionBar,b=next.intersectionBar;if(!a)return null;
 if(q===0)return from;if(q===1)return next.points;
 const frame=interpolatedFrame(a,b,q);
 return setScientificMotionState(intersectionBarPoints(frame),{intersectionBar:frame});
}
export function interpolateIntersectionMembership(from,old,next,q){
 const a=scientificMotionState(from)?.intersectionMembership||scientificMotionState(old.points)?.intersectionMembership||old.intersectionMembership,b=next.intersectionMembership;if(!a||!b)return null;
 if(q===0)return from;if(q===1)return next.points;
 const frame=interpolatedFrame(a,b,q);
 const v=[Math.cos(frame.angle),Math.sin(frame.angle)],n=[-v[1],v[0]],points=frame.offsets.map(offset=>[frame.center[0]+n[0]*frame.rank*frame.pitch+v[0]*offset,frame.center[1]+n[1]*frame.rank*frame.pitch+v[1]*offset]),contour=points.length===1?circlePoints(...points[0],frame.size):segment(points[0],points[1],frame.size);
 return setScientificMotionState(contour,{intersectionMembership:frame});
}
