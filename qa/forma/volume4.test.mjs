import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {volume4Catalog} from '../../src/forma/volume4-catalog.js';
import {paretoRows,violinDensity,pearsonMatrix,marimekkoLayout,spreadLabels} from '../../src/forma/volume4-data.js';
import {getExample} from '../../src/forma/catalog.js';
import {validateDocument,summary,toCSV,parseDataText} from '../../src/forma/data.js';
import {ChartScene} from '../../src/forma/charts.js';

const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const valid=doc=>validateDocument(doc).valid;
const chart=(doc,width=650,height=340)=>new ChartScene(document.createElement('div'),doc,{width,height,compact:width<400,interactive:false});

test('edition four adds eight distinct contracts with valid examples and lossless CSV roundtrips',()=>{
  assert.equal(volume4Catalog.length,8);assert.equal(new Set(volume4Catalog.map(template=>template.id)).size,8);
  for(const template of volume4Catalog){
    assert.equal(template.edition,4);const doc=getExample(template.id),report=validateDocument(doc);
    assert.ok(report.valid,`${template.id}: ${report.errors.join(' / ')}`);
    assert.deepEqual(parseDataText(toCSV(doc),doc,'csv').data,doc.data,template.id);
    assert.doesNotMatch(summary(doc).value,/NaN|Infinity/,template.id);
  }
});

test('lollipop stems share a true zero baseline and preserve input order, including zero values',()=>{
  const doc=getExample('lollipop');doc.data[0].value=20;doc.data[1].value=40;doc.data[2].value=0;
  const scene=chart(doc),groups=[...scene.svg.querySelectorAll('[data-mark="lollipop"]')],stems=groups.map(group=>group.querySelector('line'));
  const width=stem=>Number(stem.getAttribute('x2'))-Number(stem.getAttribute('x1'));
  assert.ok(Math.abs(width(stems[1])/width(stems[0])-2)<1e-12);assert.equal(width(stems[2]),0);
  assert.deepEqual(groups.map(group=>Number(group.getAttribute('data-value'))),doc.data.map(row=>row.value));scene.destroy();
  doc.data[0].value=-1;assert.ok(!valid(doc));doc.data.forEach(row=>row.value=0);assert.ok(valid(doc));
});

test('pareto sorts stably, reconciles counts and reaches 100 percent without assuming an 80/20 split',()=>{
  const data=[{label:'A',value:2},{label:'B',value:5},{label:'C',value:5},{label:'D',value:0}],rows=paretoRows(data);
  assert.deepEqual(rows.map(row=>row.label),['B','C','A','D']);assert.deepEqual(rows.map(row=>row.cumulative),[5/12,10/12,1,1]);
  assert.deepEqual(data.map(row=>row.label),['A','B','C','D']);
  const doc=getExample('pareto');doc.data=data;assert.ok(valid(doc));const scene=chart(doc);
  assert.equal(scene.svg.querySelectorAll('[data-mark="pareto-bar"]').length,4);
  assert.equal(scene.svg.querySelectorAll('[data-mark="pareto-point"]')[3].getAttribute('data-cumulative'),'1');scene.destroy();
  doc.data.forEach(row=>row.value=0);assert.ok(!valid(doc));doc.data[0].value=.2;assert.ok(!valid(doc));
});

test('violin KDE uses one bandwidth and scale, integrates to one per group and supports constant samples',()=>{
  const groups=[{group:'A',values:Array.from({length:40},(_,i)=>i/10)},{group:'B',values:Array(20).fill(2)}],density=violinDensity(groups,500);
  assert.ok(density.bandwidth>0);assert.equal(density.series.length,2);
  for(const group of density.series){let integral=0;for(let i=1;i<group.points.length;i++)integral+=(group.points[i].x-group.points[i-1].x)*(group.points[i].density+group.points[i-1].density)/2;assert.ok(Math.abs(integral-1)<.0001,`${group.group}: ${integral}`);}
  const doc=getExample('violin');doc.data=groups.flatMap(group=>group.values.map(value=>({group:group.group,value})));const scene=chart(doc);
  assert.equal(scene.svg.querySelectorAll('[data-mark="violin-observation"]').length,60);assert.equal(new Set([...scene.svg.querySelectorAll('[data-mark="violin"]')].map(node=>node.getAttribute('data-bandwidth'))).size,1);scene.destroy();
});

test('Pearson correlation is computed from paired originals and leaves constant variables undefined',()=>{
  const rows=Array.from({length:8},(_,i)=>[{sample:`S${i}`,variable:'A',value:i+1},{sample:`S${i}`,variable:'B',value:17-2*i},{sample:`S${i}`,variable:'C',value:4}]).flat(),stats=pearsonMatrix(rows);
  assert.equal(stats.matrix[0][0].coefficient,1);assert.ok(Math.abs(stats.matrix[0][1].coefficient+1)<1e-12);assert.equal(stats.matrix[2][2].coefficient,null);assert.equal(stats.matrix[0][2].coefficient,null);
  const tiny=pearsonMatrix(rows.map(row=>({...row,value:row.value*1e-250})));assert.ok(Math.abs(tiny.matrix[0][1].coefficient+1)<1e-12);
  const doc=getExample('correlation');doc.data=rows;assert.ok(valid(doc));const scene=chart(doc);
  assert.equal(scene.svg.querySelectorAll('[data-coefficient="undefined"]').length,5);assert.match(scene.svg.querySelector('[data-coefficient="undefined"]').getAttribute('data-tip'),/未定义/);scene.destroy();
  doc.data.pop();assert.ok(!valid(doc));
});

test('marimekko widths and cell areas reconcile to original quantities with no geometry gaps',()=>{
  const doc=getExample('marimekko'),layout=marimekkoLayout(doc.data);
  assert.ok(Math.abs(layout.groups.reduce((sum,group)=>sum+group.width,0)-1)<1e-12);
  for(const group of layout.groups){assert.ok(Math.abs(group.cells.reduce((sum,cell)=>sum+cell.height,0)-1)<1e-12);for(const cell of group.cells)assert.ok(Math.abs(group.width*cell.height-cell.value/layout.total)<1e-12);}
  const scene=chart(doc),rects=[...scene.svg.querySelectorAll('[data-mark="mekko-area"]')];const area=rect=>Number(rect.getAttribute('width'))*Number(rect.getAttribute('height')),totalArea=rects.reduce((sum,rect)=>sum+area(rect),0);
  rects.forEach(rect=>assert.ok(Math.abs(area(rect)/totalArea-Number(rect.getAttribute('data-area-ratio')))<1e-12));scene.destroy();
  doc.data[0].value=0;assert.ok(valid(doc));const zero=chart(doc);assert.equal(zero.svg.querySelector('[data-area-ratio="0"]').getAttribute('height'),'0');zero.destroy();
  const first=doc.data[0].group;doc.data.filter(row=>row.group===first).forEach(row=>row.value=0);assert.ok(!valid(doc));
});

test('small multiples share a zero-inclusive scale and retain both real date gaps and null breaks',()=>{
  const doc=getExample('smallmultiples'),scene=chart(doc),panels=[...scene.svg.querySelectorAll('[data-mark="smallmultiple"]')];
  assert.equal(new Set(panels.map(panel=>panel.getAttribute('data-domain-min'))).size,1);assert.equal(panels[0].getAttribute('data-domain-min'),'0');assert.equal(new Set(panels.map(panel=>panel.getAttribute('data-domain-max'))).size,1);
  const observed=doc.data.filter(row=>row.value!==null).map(row=>row.value);assert.ok(Number(panels[0].getAttribute('data-domain-max'))>=Math.max(...observed),'shared domain must enclose the actual observations');assert.ok(Number(panels[0].getAttribute('data-domain-min'))<=Math.min(...observed));
  for(const point of scene.svg.querySelectorAll('[data-mark="smallmultiple-observation"]')){assert.ok(Number(point.getAttribute('cx'))>=0&&Number(point.getAttribute('cx'))<=scene.w);assert.ok(Number(point.getAttribute('cy'))>=0&&Number(point.getAttribute('cy'))<=scene.h,'every measured point must stay inside the plotting canvas');}
  assert.equal(scene.svg.querySelectorAll('[data-mark="smallmultiple-missing"]').length,2);assert.equal((panels[1].querySelector('path').getAttribute('d').match(/M/g)||[]).length,2);scene.destroy();
  const names=[...new Set(doc.data.map(row=>row.series))];doc.data=names.flatMap(series=>Array.from({length:6},(_,i)=>({series,period:['2025-01-01','2025-01-02','2025-01-04','2025-01-07','2025-01-11','2025-01-16'][i],value:i+1})));assert.ok(valid(doc));
  const irregular=chart(doc),points=[...irregular.svg.querySelector('[data-mark="smallmultiple"]').querySelectorAll('[data-mark="smallmultiple-observation"]')];
  const dx=index=>Number(points[index+1].getAttribute('cx'))-Number(points[index].getAttribute('cx'));assert.ok(Math.abs(dx(1)/dx(0)-2)<1e-10);irregular.destroy();
  doc.data.filter(row=>row.series===names[0]).forEach(row=>row.value=null);assert.ok(valid(doc));const empty=chart(doc);assert.match(empty.svg.textContent,/暂无观测/);assert.doesNotMatch(empty.serialize(),/NaN|Infinity/);empty.destroy();
  doc.data.pop();assert.ok(!valid(doc));
});

test('slope label collision resolution keeps actual values intact and requires named periods',()=>{
  const positions=[100,100,101,99,102,98],labels=spreadLabels(positions,20,180,22);
  assert.equal(labels.length,positions.length);const sorted=[...labels].sort((a,b)=>a-b);for(let i=1;i<sorted.length;i++)assert.ok(sorted[i]-sorted[i-1]>=22-1e-12);assert.ok(sorted[0]>=20&&sorted.at(-1)<=180);
  const doc=getExample('slope');doc.data.forEach((row,i)=>{row.before=50;row.after=40+i;});const scene=chart(doc),starts=[...scene.svg.querySelectorAll('[data-mark="slope-series"] > line')];
  assert.equal(new Set(starts.map(line=>line.getAttribute('y1'))).size,1);assert.equal(new Set([...scene.svg.querySelectorAll('[data-mark="slope-label"]')].filter((_,i)=>i%2===0).map(node=>node.getAttribute('data-label-y'))).size,doc.data.length);scene.destroy();
  delete doc.periodLabels;assert.ok(!valid(doc));
});

test('range charts validate high-low containment, real dates and flat observations',()=>{
  const doc=getExample('range');doc.data[0].open=doc.data[0].high+1;assert.ok(!valid(doc));
  const flat=getExample('range');flat.data.forEach(row=>Object.assign(row,{open:20,high:20,low:20,close:20}));assert.ok(valid(flat));const scene=chart(flat);
  for(const mark of scene.svg.querySelectorAll('[data-mark="range-observation"]')){const stem=mark.querySelector('line');assert.equal(stem.getAttribute('y1'),stem.getAttribute('y2'));}assert.doesNotMatch(scene.serialize(),/NaN|Infinity/);scene.destroy();
  flat.data[0].period='2025-02-30';assert.ok(!valid(flat));
});

test('edition four renders finite geometry and restores the exact settled state after backward scrubbing',()=>{
  for(const template of volume4Catalog)for(const [width,height] of [[300,240],[840,420]]){
    const scene=chart(getExample(template.id),width,height);scene.render(1);const settled=scene.serialize();
    for(const progress of [0,.15,.68,.3,1]){scene.render(progress);assert.doesNotMatch(scene.serialize(),/NaN|Infinity/,`${template.id}@${progress}`);}
    assert.equal(scene.serialize(),settled,template.id);scene.destroy();
  }
});
