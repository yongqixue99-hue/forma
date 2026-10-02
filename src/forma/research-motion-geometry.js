import {circlePoints} from './morph.js';
import {pointMix,mix,clamp,segment} from './scientific-geometry.js';

const centroid=points=>points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const polar=(from,to,pivot,q)=>{const a=[from[0]-pivot[0],from[1]-pivot[1]],b=[to[0]-pivot[0],to[1]-pivot[1]],ra=Math.hypot(...a),rb=Math.hypot(...b),aa=ra<1e-10?Math.atan2(b[1],b[0]):Math.atan2(a[1],a[0]),ab=rb<1e-10?aa:Math.atan2(b[1],b[0]),angle=aa+delta(aa,ab)*q,r=mix(ra,rb,q);return[pivot[0]+r*Math.cos(angle),pivot[1]+r*Math.sin(angle)];};

// PCA rotation retains the supplied vector magnitude instead of replacing a
// quarter-turn with a chord through a smaller radius. The displayed contour
// is the source, so interruption never restarts at a previous settled angle.
export function rotateResearchContour(points,old,next,q){
 if(!old?.rotationPivot||!next?.rotationPivot||points.length!==next.points.length)return null;
 if(q===0)return points;if(q===1)return next.points;
 const pivot=pointMix(old.rotationPivot,next.rotationPivot,q);
 if(next.rotationGlyph==='point'){
  const a=centroid(points),b=centroid(next.points),center=polar(a,b,pivot,q);
  return next.points.map((p,i)=>{const offset=pointMix([points[i][0]-a[0],points[i][1]-a[1]],[p[0]-b[0],p[1]-b[1]],q);return[center[0]+offset[0],center[1]+offset[1]];});
 }
 return next.points.map((p,i)=>polar(points[i],p,pivot,q));
}

// Recover an orthogonal time/frequency frame from the CURRENT rectangle.
// Grid spans and normalized cell coordinates are authored, not inferred from
// values or colors. Orthogonal axes rotate as one grid. A single fit factor
// keeps the complete rotated grid inside its plot; it never scales cells
// independently or alters power values, and works from an interrupted pose.
export function rotateSignalCell(points,old,next,q){
 if(!old?.signalCell||!next?.signalCell||points.length!==128)return null;
 if(q===0)return points;if(q===1)return next.points;
 const recover=(vertices,cell)=>{const a=vertices[0],b=vertices[32],c=vertices[64],u=[(b[0]-a[0])/cell.span[0],(b[1]-a[1])/cell.span[0]],v=[(c[0]-b[0])/cell.span[1],(c[1]-b[1])/cell.span[1]],center=centroid(vertices);return{u,v,origin:[center[0]-u[0]*cell.coordinate[0]-v[0]*cell.coordinate[1],center[1]-u[1]*cell.coordinate[0]-v[1]*cell.coordinate[1]]};};
 const a=recover(points,old.signalCell),b=recover(next.points,next.signalCell),angleA=Math.atan2(a.u[1],a.u[0]),angleB=Math.atan2(b.u[1],b.u[0]),angle=angleA+delta(angleA,angleB)*q;
 const ua=Math.hypot(...a.u),ub=Math.hypot(...b.u),va=Math.hypot(...a.v),vb=Math.hypot(...b.v);if(Math.min(ua,ub,va,vb)<1e-10)return null;
 const lengthU=Math.exp(mix(Math.log(ua),Math.log(ub),q)),lengthV=Math.exp(mix(Math.log(va),Math.log(vb),q)),handedness=Math.sign(a.u[0]*a.v[1]-a.u[1]*a.v[0]),u=[Math.cos(angle)*lengthU,Math.sin(angle)*lengthU],v=[-Math.sin(angle)*handedness*lengthV,Math.cos(angle)*handedness*lengthV],center=pointMix([a.origin[0]+(a.u[0]+a.v[0])/2,a.origin[1]+(a.u[1]+a.v[1])/2],[b.origin[0]+(b.u[0]+b.v[0])/2,b.origin[1]+(b.u[1]+b.v[1])/2],q),extent=next.signalCell.extent,fit=Math.min(1,extent.w/(Math.abs(u[0])+Math.abs(v[0])),extent.h/(Math.abs(u[1])+Math.abs(v[1])));for(const vector of[u,v]){vector[0]*=fit;vector[1]*=fit;}const origin=[center[0]-(u[0]+v[0])/2,center[1]-(u[1]+v[1])/2];
 const local=(p,f)=>{const dx=p[0]-f.origin[0],dy=p[1]-f.origin[1],det=f.u[0]*f.v[1]-f.u[1]*f.v[0];return[(dx*f.v[1]-dy*f.v[0])/det,(f.u[0]*dy-f.u[1]*dx)/det];};
 return next.points.map((p,i)=>{const position=pointMix(local(points[i],a),local(p,b),q);return[origin[0]+position[0]*u[0]+position[1]*v[0],origin[1]+position[0]*u[1]+position[1]*v[1]];});
}

// One threshold wave is shared by every model. No model receives a temporal
// advantage, and a connector uses exactly the progress of each endpoint.
const sweep=(q,threshold)=>clamp(q+Math.sin(Math.PI*q)*.18*(2*threshold-1));
export function interpolateCostSweep(points,old,next,q){
 if(!old?.costSweep||!next?.costSweep||points.length!==next.points.length)return null;
 if(q===0)return points;if(q===1)return next.points;
 const changing=old.costSweep.encoding!==next.costSweep.encoding,progress=s=>changing?sweep(q,s):q;
 if(next.role==='metric-point')return next.points.map((p,i)=>pointMix(points[i],p,progress(next.costSweep.end)));
 if(next.role!=='metric-link')return null;
 const endpoints=vertices=>({a:pointMix(vertices[0],vertices[96],.5),b:pointMix(vertices[32],vertices[64],.5),width:Math.hypot(vertices[0][0]-vertices[96][0],vertices[0][1]-vertices[96][1])});
 const a=endpoints(points),b=endpoints(next.points),start=pointMix(a.a,b.a,progress(next.costSweep.start)),end=pointMix(a.b,b.b,progress(next.costSweep.end));
 return segment(start,end,mix(a.width,b.width,q));
}

// A normalization changes the denominator, not the original count identity.
// A compact token carries each positive cell between encodings so the entire
// matrix does not disappear together into a collection of zero-width bars.
export function confusionCountBridge(points,old,next,q){
 if(old?.role!=='count-cell'||next?.role!=='count-cell'||old.quantity===next.quantity||!old.confusionCount||!next.confusionCount||points.length!==next.points.length)return null;
 if(q===0)return points;if(q===1)return next.points;
 const a=centroid(points),b=centroid(next.points),center=pointMix(a,b,q),radius=next.value>0?Math.min(old.confusionCount.radius,next.confusionCount.radius):0,bridge=circlePoints(0,0,radius);
 // Continuous two-sided unfolding. The midpoint is visibly one token for
 // each count, while axis/percentage labels remain unsettled until completion.
 const phase=q<.5?q*2:(q-.5)*2;
 return next.points.map((p,i)=>{const start=[points[i][0]-a[0],points[i][1]-a[1]],end=[p[0]-b[0],p[1]-b[1]],offset=q<.5?pointMix(start,bridge[i],phase):pointMix(bridge[i],end,phase);return[center[0]+offset[0],center[1]+offset[1]];});
}
