// Motion state belongs to displayed contours, never to the source document.
// The player copies contours before interruption; retain their physical frame
// so the next transition starts from that exact visible encoding.
const states=new WeakMap();
export const scientificMotionState=points=>states.get(points);
export function setScientificMotionState(points,state){states.set(points,state);return points;}
export function copyScientificMotionState(from,to){const state=states.get(from);if(state)states.set(to,state);return to;}
