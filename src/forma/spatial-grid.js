import {recordId} from './data-identity.js';
export function spatialGrid(rows){
  const xs=[...new Set(rows.map(r=>r.x))].sort((a,b)=>a-b),ys=[...new Set(rows.map(r=>r.y))].sort((a,b)=>a-b);
  const map=new Map(rows.map(r=>[JSON.stringify([r.x,r.y]),r]));
  if(xs.length<2||ys.length<2||rows.length!==xs.length*ys.length||map.size!==rows.length)return null;
  const uniform=a=>a.slice(2).every((v,i)=>Math.abs(v-a[i+1]-(a[1]-a[0]))<=Math.max(1,Math.abs(a[1]-a[0]))*1e-6);
  if(!uniform(xs)||!uniform(ys))return null;
  const cells=[];
  for(let y=0;y<ys.length-1;y++)for(let x=0;x<xs.length-1;x++){
    const ids=[[x,y],[x+1,y],[x,y+1],[x+1,y+1]].map(([i,j])=>recordId(map.get(JSON.stringify([xs[i],ys[j]]))));
    cells.push([ids[0],ids[2],ids[1]],[ids[1],ids[2],ids[3]]);
  }
  return cells;
}
