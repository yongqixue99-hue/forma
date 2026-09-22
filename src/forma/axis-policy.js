export function measurementDomain(values,{zero=false,padding=.06}={}){
  const finite=values.filter(Number.isFinite);if(!finite.length)return [0,1];
  let low=Math.min(...finite),high=Math.max(...finite);
  if(zero){low=Math.min(0,low);high=Math.max(0,high);}
  if(low===high){const span=Math.abs(low)*.1||1;return zero?[0,span]:[low-span,high+span];}
  const margin=zero?0:(high-low)*padding;return [low-margin,high+margin];
}
export const singleZeroBased=view=>!['line','step','dot'].includes(view);
export const pairedZeroBased=view=>['paired-bars','paired-change'].includes(view);

// Equal physical units on both axes. A constant coordinate borrows the other
// observed span; an arbitrary fallback of 1 would change the geometry by unit.
export function equalUnitDomains(rows,{width=1,height=1,padding=.08,xKey='x',yKey='y'}={}){
  const xs=rows.map(d=>d[xKey]).filter(Number.isFinite),ys=rows.map(d=>d[yKey]).filter(Number.isFinite);
  if(!xs.length||!ys.length)return {x:[0,1],y:[0,1]};
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),dx=x1-x0,dy=y1-y0;
  const fallback=dx||dy||Math.max(Math.abs(x0),Math.abs(y0))*.2||1;
  const units=Math.max((dx||fallback)*(1+2*padding)/width,(dy||fallback)*(1+2*padding)/height);
  const xm=x0+dx/2,ym=y0+dy/2;
  return {x:[xm-units*width/2,xm+units*width/2],y:[ym-units*height/2,ym+units*height/2]};
}
