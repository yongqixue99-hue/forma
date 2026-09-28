import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {validateDocument,summary,parseDataText,toCSV} from '../../src/forma/data.js';
import {boxStatistics,packSwarm} from '../../src/forma/editorial-data.js';
import {palettes,themeFor,normalizePalette} from '../../src/forma/palettes.js';
import {ChartScene} from '../../src/forma/charts.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const valid=d=>validateDocument(d).valid;
const scene=doc=>new ChartScene(document.createElement('div'),doc,{width:650,height:320,interactive:false});

test('all six collections retain their documented template counts and every CSV roundtrip remains valid',()=>{
  assert.equal(catalog.length,144);assert.equal(new Set(catalog.map(t=>t.id)).size,144);
  for(const [edition,count] of [[1,12],[2,12],[3,8],[4,8]])assert.equal(catalog.filter(t=>t.edition===edition).length,count);
  for(const t of catalog){const d=getExample(t.id);assert.ok(valid(parseDataText(toCSV(d),d,'csv')),t.id);assert.ok(!summary(d).value.includes('NaN'),t.id);}
});
test('all palettes use the same neutral dark ground and old saved palette names migrate',()=>{
  for(const id of Object.keys(palettes)){assert.equal(themeFor(id,true).bg,'#202020');assert.equal(themeFor(id,false).bg,'#f8f7f4');}
  assert.equal(normalizePalette('mineral'),'ink');assert.equal(normalizePalette('clay'),'vermilion');assert.equal(normalizePalette('porcelain'),'cobalt');assert.equal(themeFor('mineral',true).name,'ink');
});
test('barcode validates real dates and represents a missing day differently from zero',()=>{
  const d=getExample('barcode');d.data[2].value=null;d.data[3].value=0;assert.ok(valid(d));
  const chart=scene(d);assert.equal(chart.svg.querySelectorAll('[data-mark="stem"]').length,89);
  assert.ok([...chart.svg.querySelectorAll('[data-tip]')].some(e=>e.getAttribute('data-tip').includes('缺失记录')));chart.destroy();
  d.data[0].date='2025-02-30';assert.ok(!valid(d));
});
test('barcode keeps actual time distances instead of compressing missing dates',()=>{
  const d=getExample('barcode');d.data=d.data.slice(0,15);d.data.splice(1,1);
  const chart=scene(d),stems=[...chart.svg.querySelectorAll('[data-mark="stem"]')];
  const x=stems.map(s=>+s.getAttribute('x1'));assert.ok(Math.abs((x[1]-x[0])/(x[2]-x[1])-2)<1e-8);chart.destroy();
});
test('fan compares normalized progress with explicit positive denominators',()=>{
  const d=getExample('fan');d.data[0].value=50;d.data[0].target=100;d.data[1].value=100;d.data[1].target=200;
  const chart=scene(d),stems=[...chart.svg.querySelectorAll('line[data-tip]')];const length=e=>Math.hypot(+e.getAttribute('x2')-+e.getAttribute('x1'),+e.getAttribute('y2')-+e.getAttribute('y1'));
  assert.ok(Math.abs(length(stems[0])-length(stems[1]))<1e-8);chart.destroy();d.data[0].target=0;assert.ok(!valid(d));d.data[0].target=49;assert.ok(!valid(d));
});
test('unit charts draw exactly the count, with no decorative extra dots',()=>{
  const d=getExample('unit'),chart=scene(d);assert.equal(chart.svg.querySelectorAll('[data-mark="unit"]').length,d.data.reduce((n,r)=>n+r.value,0));chart.destroy();
  for(const value of [-1,1.5,51]){d.data[0].value=value;assert.ok(!valid(d));}
});
test('matrix area ratios remain proportional and incomplete cells cannot be silently filled',()=>{
  const d=getExample('matrix');d.data[0].value=10;d.data[1].value=40;
  const chart=scene(d),dots=[...chart.svg.querySelectorAll('[data-mark="matrix"]')],r=dot=>+dot.getAttribute('r');assert.ok(Math.abs(r(dots[1])**2/r(dots[0])**2-4)<1e-8);chart.destroy();
  d.data.pop();assert.ok(!valid(d));
});
test('swarm packing preserves measured x, avoids collisions and fits even 40 identical samples',()=>{
  const rows=Array.from({length:40},(_,i)=>({label:`sample ${i}`,value:10})),packed=packSwarm(rows,v=>v*5,18,4);
  assert.equal(packed.nodes.length,40);assert.deepEqual(packed,packSwarm([...rows].reverse(),v=>v*5,18,4));
  for(const [i,a]of packed.nodes.entries()){assert.equal(a.x,50);assert.ok(Math.abs(a.y)+packed.radius<=18);for(const b of packed.nodes.slice(i+1))assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=packed.radius*2-1e-6);}
});
test('intervals reject reversed bounds, out-of-range estimates and undefined statistical meanings',()=>{
  const d=getExample('interval');delete d.intervalLabel;assert.ok(!valid(d));d.intervalLabel='预测范围';d.data[0].low=d.data[0].high+1;assert.ok(!valid(d));d.data[0].low=0;d.data[0].estimate=d.data[0].high+1;assert.ok(!valid(d));
});
test('each stacked row must contain all categories and reconcile to 100%',()=>{
  const d=getExample('stacked');d.data[0].value+=.1;assert.ok(!valid(d));d.data[0].value-=.1;assert.ok(valid(d));d.data.pop();assert.ok(!valid(d));
});
test('stream totals count the latest period and reject missing or negative components',()=>{
  const d=getExample('stream'),latest=d.data.at(-1).period;assert.equal(+summary(d).value.replaceAll(',',''),d.data.filter(r=>r.period===latest).reduce((sum,r)=>sum+r.value,0));
  d.data[0].value=-1;assert.ok(!valid(d));d.data[0].value=0;d.data.pop();assert.ok(!valid(d));
});
test('box statistics derive quartiles and Tukey whiskers from observations, including outliers and constant data',()=>{
  assert.deepEqual(boxStatistics([1,2,3,4,5,6,7,100]),{q1:2.75,median:4.5,q3:6.25,low:1,high:7,outliers:[100],count:8});
  assert.deepEqual(boxStatistics(Array(8).fill(4)),{q1:4,median:4,q3:4,low:4,high:4,outliers:[],count:8});
});
test('arc charts reject self edges and mirrored duplicates',()=>{
  const d=getExample('arc');d.data.push({source:d.data[0].target,target:d.data[0].source,value:1});assert.ok(!valid(d));d.data.pop();d.data[0].target=d.data[0].source;assert.ok(!valid(d));
});
test('parallel coordinates require a complete object-dimension grid',()=>{
  const d=getExample('parallel');d.data.pop();assert.ok(!valid(d));d.data.push({...d.data[0]});assert.ok(!valid(d));
});
test('zero-only count and signed-change plots remain finite, while overflowing numeric inputs are rejected',()=>{
  for(const id of ['barcode','fan','unit','diverging']){const d=getExample(id);d.data.forEach(r=>r.value=0);assert.ok(valid(d),id);const chart=scene(d);assert.doesNotMatch(chart.serialize(),/NaN|Infinity/);chart.destroy();}
  const d=getExample('stream');d.data[0].value=1e308;assert.ok(!valid(d));
});
