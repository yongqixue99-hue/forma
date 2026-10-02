import {interpolateDensityContour,pointMix} from './scientific-geometry.js';
import {scientificMotionState,setScientificMotionState} from './scientific-motion-state.js';
// Roll a complete column as one ordered radial axis. Screen-coordinate
// interpolation can make its downwards flat axis and upwards radial axis
// cancel, piling every row onto the same point halfway through the morph.
// Rotate that axis instead, retaining its positive physical pitch. The
// Keep the displayed column axis with its contour. A resumed 37% frame has a
// partially rotated axis, not the previous transition's settled target axis.
const nativeFrame=config=>({center:config.radial?config.radialCenter:config.flatCenter,angle:config.radial?config.angle:Math.PI/2,pitch:config.radial?config.radialPitch:config.flatPitch});
const cellCenter=(frame,config)=>{const row=config.row+.5-config.rows/2;return[frame.center[0]+Math.cos(frame.angle)*row*frame.pitch,frame.center[1]+Math.sin(frame.angle)*row*frame.pitch];};
function rollFrame(from,old,next,q){
 const config=next.matrixRoll;if(!old.matrixRoll||!config)return null;
 const a=scientificMotionState(from)?.matrixRoll||scientificMotionState(old.points)?.matrixRoll||nativeFrame(old.matrixRoll),b=nativeFrame(config),angle=a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*q;
 return {a,b,current:{center:pointMix(a.center,b.center,q),angle,pitch:a.pitch+(b.pitch-a.pitch)*q}};
}
export function interpolateMatrixRoll(from,old,next,q){
 const points=interpolateDensityContour(from,next.points,q);
 if(!points||q===0||q===1)return points;
 return applyMatrixRoll(points,from,old,next,q);
}
export function applyMatrixRoll(points,from,old,next,q){
 const frames=rollFrame(from,old,next,q);if(!frames)return points;
 const target=cellCenter(frames.current,next.matrixRoll),linear=pointMix(cellCenter(frames.a,old.matrixRoll),cellCenter(frames.b,next.matrixRoll),q),shift=target.map((v,k)=>v-linear[k]);
 return setScientificMotionState(points.map(p=>[p[0]+shift[0],p[1]+shift[1]]),{matrixRoll:frames.current});
}
