import { deviation, quantileSorted, mean, extent } from 'd3';

// Estimate in normalized units so both very small measurements and a large
// common offset retain their distribution after a change of measurement units.
export function sharedBandwidth(groups, resolution=120){
  const all=groups.flatMap(g=>g.values),[low,high]=extent(all),magnitude=Math.max(Math.abs(low),Math.abs(high))||1;
  const span=high-low;
  const candidates=groups.map(g=>{
    const values=[...g.values].sort((a,b)=>a-b),center=values[0],scale=values.at(-1)-center||span||magnitude;
    const normalized=values.map(v=>(v-center)/scale),sd=deviation(normalized)||0,iqr=(quantileSorted(normalized,.75)-quantileSorted(normalized,.25))/1.34;
    return .9*(Math.min(sd,iqr)||sd||(span||magnitude)/scale/8)*scale*Math.pow(values.length,-.2);
  });
  return Math.max(mean(candidates),span/resolution,magnitude*Number.EPSILON*8);
}

// A shared Gaussian bandwidth keeps ridge heights comparable across groups.
// Every density is computed from raw records; rug marks retain those records.
export function ridgeDensity(groups,resolution=100){
  const all=groups.flatMap(g=>g.values),[min,max]=extent(all);
  const bandwidth=sharedBandwidth(groups);
  const domain=[min>=0?Math.max(0,min-3*bandwidth):min-3*bandwidth,max+3*bandwidth];
  const x=Array.from({length:resolution+1},(_,i)=>domain[0]+i/resolution*(domain[1]-domain[0]));
  const factor=1/(Math.sqrt(2*Math.PI)*bandwidth);
  const series=groups.map(g=>({...g,points:x.map(x=>({x,density:mean(g.values,v=>Math.exp(-.5*((x-v)/bandwidth)**2))*factor}))}));
  return {series,bandwidth,domain};
}
