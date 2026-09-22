import {test} from 'node:test';
import assert from 'node:assert/strict';
import {layoutMorph,morphExample,morphViews} from '../../src/forma/morph.js';
const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} ≠ ${b}`);
const area=points=>Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2);
const doc=structuredClone(morphExample);doc.data.forEach((r,i)=>r.value=[12.5,7.25,38.1,11.2,6.6,24.35][i]);
const layouts=view=>[[320,310],[900,360],[1300,480]].map(([w,h])=>layoutMorph(doc,view,w,h));

test('twenty encodings preserve fractional observations, identity, and finite contours at every supported category count',()=>{
  for(const n of [4,6,8]){const input=structuredClone(doc);input.data=Array.from({length:n},(_,i)=>({label:`类别${i+1}`,value:(i+1)*3.27}));const before=structuredClone(input);
    for(const {id} of morphViews){if(['unit','funnel-bars'].includes(id)){assert.throws(()=>layoutMorph(input,id,360,280),/整数/);continue;}const layout=layoutMorph(input,id,360,280);assert.equal(layout.marks.length,n,id);near(layout.total,input.data.reduce((s,r)=>s+r.value,0));
      for(const [i,mark] of layout.marks.entries()){assert.equal(mark.key,input.data[i].label);assert.equal(mark.value,input.data[i].value);assert.equal(mark.points.length,128);assert.ok(mark.points.every(p=>p.every(Number.isFinite)),id);assert.ok(area(mark.points)>0,id);}
    }assert.deepEqual(input,before);
  }
});
test('dot and lollipop marks encode positions on a common zero scale, not sizes',()=>{
  for(const layout of layouts('dot'))for(const mark of layout.marks){const g=mark.geometry;near((g.cx-g.baseline)/g.scale,mark.value);near(g.r,layout.marks[0].geometry.r);}
  for(const layout of layouts('lollipop'))for(const mark of layout.marks){const g=mark.geometry;near((g.baseline-g.cy)/g.scale,mark.value);}
});
test('proportional squares use square-root sides; semicircle shares sum to exactly 180 degrees',()=>{
  for(const layout of layouts('squares')){const unit=layout.marks[0].geometry.area/layout.marks[0].value;for(const m of layout.marks){near(area(m.points),m.value*unit);near(m.geometry.width,m.geometry.height);}}
  for(const layout of layouts('semidonut')){let sum=0;for(const m of layout.marks){const angle=m.geometry.a1-m.geometry.a0;sum+=angle;near(angle/Math.PI,m.value/layout.total);}near(sum,Math.PI);}
});
test('radial bars and radar share a common radius scale without claiming area proportionality',()=>{
  for(const layout of layouts('radialbars'))for(const m of layout.marks){const g=m.geometry;near((g.r1-g.r0)/g.scale,m.value);near(g.r0,layout.marks[0].geometry.r0);}
  for(const layout of layouts('radar'))for(const m of layout.marks){const g=m.geometry;near(g.radius/g.scale,m.value);near(Math.hypot(g.point[0]-g.cx,g.point[1]-g.cy),g.radius);}
});
test('waterfall increments connect at cumulative boundaries and end at the original total',()=>{
  for(const layout of layouts('waterfall')){let sum=0;for(const [i,m] of layout.marks.entries()){const g=m.geometry;near(g.before,sum);sum+=m.value;near(g.after,sum);near(g.height/g.scale,m.value);if(i)near(g.y+g.height,layout.marks[i-1].geometry.y);}near(sum,layout.total);}
});
test('Pareto sorts geometry while keeping keyed identity and connects a separate cumulative percentage axis',()=>{
  for(const layout of layouts('pareto')){const ordered=[...layout.marks].sort((a,b)=>a.geometry.x-b.geometry.x);assert.deepEqual(ordered.map(m=>m.key),[...doc.data].sort((a,b)=>b.value-a.value).map(r=>r.label));let running=0;
    for(const m of ordered){running+=m.value;near(m.geometry.cumulative,running/layout.total);near(m.geometry.height/m.geometry.scale,m.value);}
    assert.equal(layout.overlays.filter(o=>o.type==='circle').length,doc.data.length);assert.equal(layout.overlays.filter(o=>o.type==='line').length,doc.data.length-1);assert.ok(layout.labels.some(l=>l.text==='100%'));
  }
  const ties=structuredClone(doc);ties.data[0].value=ties.data[1].value=99;assert.deepEqual(layoutMorph(ties,'pareto',900,360).marks.slice(0,2).map(m=>m.geometry.x).sort((a,b)=>a-b),layoutMorph(ties,'pareto',900,360).marks.slice(0,2).map(m=>m.geometry.x));
});
test('funnel keeps input stage order and encodes width even when the values rise between stages',()=>{
  for(const layout of layouts('funnel'))for(const [i,m] of layout.marks.entries()){near(m.geometry.topWidth/m.geometry.scale,m.value);near(m.geometry.nextWidth/m.geometry.scale,doc.data[i+1]?.value??m.value);if(i)assert.ok(m.geometry.y>layout.marks[i-1].geometry.y);}
});
test('waffle uses exact partial cells and zero-area bridges never inflate the represented share',()=>{
  for(const layout of layouts('waffle')){const totalArea=layout.marks.reduce((s,m)=>s+area(m.points),0);let end=0;for(const m of layout.marks){const g=m.geometry;near(g.start,end);end=g.end;near((g.end-g.start)/100,m.value/layout.total);near(area(m.points),g.area);near(area(m.points)/totalArea,m.value/layout.total);near(g.regions.reduce((s,r)=>s+r.width*r.height,0),g.area);}near(end,100);assert.equal(layout.overlays.length,22);}
});
