import {cleanWork,transitionPlan} from './work-model.js';

// A finite sequence: entrance/transition, then reading time, for every step.
// Milliseconds are independent of RAF speed, encoding speed and screen size.
export function workTimeline(value){
  const work=cleanWork(value);let cursor=0;
  const segments=work.steps.map((step,index)=>{
    const from=index?work.steps[index-1]:null,plan=from?transitionPlan(from,step,{steps:work.steps}):null;
    const duration=plan?.duration??step.duration,start=cursor,settled=start+duration;
    cursor=settled+step.hold;
    return {index,step,from,plan,start,settled,end:cursor,duration};
  });
  return {work,segments,duration:cursor};
}

export function timelineFrame(timeline,milliseconds){
  const time=Math.min(timeline.duration,Math.max(0,Number(milliseconds)||0));
  const segment=timeline.segments.find(s=>time<s.end)||timeline.segments.at(-1);
  const progress=Math.min(1,Math.max(0,(time-segment.start)/segment.duration));
  return {...segment,time,progress,phase:progress===1?'hold':segment.from?'transition':'entrance'};
}

export function timelineTime(milliseconds){
  const tenths=Math.round(Math.max(0,milliseconds)/100);
  return `${Math.floor(tenths/600)}:${((tenths%600)/10).toFixed(1).padStart(4,'0')}`;
}

// Keep hold edits inside the existing version-1 timing range and snap to 0.1 s.
export function holdDuration(milliseconds){
  if(!Number.isFinite(milliseconds))throw new Error('Hold duration must be finite.');
  return Math.min(12000,Math.max(500,Math.round(milliseconds/100)*100));
}

/** Preview speed changes animation only; a reading hold is always wall time. */
export function advanceTimeline(timeline,time,elapsed,rate=1){
  let cursor=Math.max(0,time),remaining=Math.max(0,elapsed);
  while(remaining>0&&cursor<timeline.duration){
    const segment=timelineFrame(timeline,cursor),moving=cursor<segment.settled;
    const speed=moving?rate:1,boundary=moving?segment.settled:segment.end,cost=(boundary-cursor)/speed;
    if(remaining<cost)return cursor+remaining*speed;
    cursor=boundary;remaining-=cost;
  }
  return Math.min(cursor,timeline.duration);
}
