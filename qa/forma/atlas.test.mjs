import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {atlasCatalog} from '../../src/forma/atlas-catalog.js';
import {histogramBins,empiricalDistribution} from '../../src/forma/atlas-data.js';
import {getExample} from '../../src/forma/catalog.js';
import {validateDocument,summary,toCSV,parseDataText} from '../../src/forma/data.js';
import {ChartScene} from '../../src/forma/charts.js';

const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const valid=doc=>validateDocument(doc).valid;
const chart=(doc,width=650,height=340)=>new ChartScene(document.createElement('div'),doc,{width,height,compact:width<400,interactive:false});

test('edition three adds eight distinct, documented data contracts with lossless CSV roundtrips',()=>{
  assert.equal(atlasCatalog.length,8);assert.equal(new Set(atlasCatalog.map(template=>template.id)).size,8);
  for(const template of atlasCatalog){
    assert.equal(template.edition,3);
    const doc=getExample(template.id),report=validateDocument(doc);
    assert.ok(report.valid,`${template.id}: ${report.errors.join(' / ')}`);
    assert.deepEqual(parseDataText(toCSV(doc),doc,'csv').data,doc.data,template.id);
    assert.doesNotMatch(summary(doc).value,/NaN|Infinity/,template.id);
  }
});

test('equal-width histogram bins retain every observation, including exact maximum and constant samples',()=>{
  const values=[-2,-1,0,1,2,2],distribution=histogramBins(values,4);
  assert.deepEqual(distribution.bins.map(bin=>bin.count),[1,1,1,3]);
  assert.equal(distribution.bins.reduce((sum,bin)=>sum+bin.count,0),values.length);
  assert.ok(distribution.bins.every(bin=>Math.abs(bin.high-bin.low-distribution.width)<1e-12));
  const constant=histogramBins(Array(24).fill(0),12);
  assert.equal(constant.bins.reduce((sum,bin)=>sum+bin.count,0),24);
  assert.ok(constant.width>0);assert.ok(constant.domain[0]<0&&constant.domain[1]>0);
  const doc=getExample('histogram');doc.binCount=1;assert.ok(!valid(doc));doc.binCount=6.5;assert.ok(!valid(doc));
});

test('empirical CDF groups tied values and reaches one without smoothing the jumps',()=>{
  assert.deepEqual(empiricalDistribution([3,1,2,2]),[
    {value:1,count:1,probability:.25},{value:2,count:3,probability:.75},{value:3,count:4,probability:1}
  ]);
  const doc=getExample('ecdf');doc.data.forEach(row=>row.value=4);
  const scene=chart(doc);assert.equal(scene.svg.querySelectorAll('[data-mark="ecdf-step"]').length,1);
  assert.equal(scene.svg.querySelector('[data-mark="ecdf-step"]').getAttribute('data-cumulative'),'1');
  assert.doesNotMatch(scene.serialize(),/NaN|Infinity/);scene.destroy();
});

test('cohort denominators remain fixed and future months cannot become zero-filled observations',()=>{
  const doc=getExample('cohort'),scene=chart(doc);
  assert.equal(scene.svg.querySelectorAll('[data-mark="cohort-cell"]').length,doc.data.length);
  assert.equal(scene.svg.querySelectorAll('[data-mark="cohort-future"]').length,6*8-doc.data.length);
  scene.destroy();
  doc.data[1].size+=1;assert.ok(!valid(doc));doc.data[1].size-=1;
  doc.data[1].active=0;assert.ok(valid(doc));
  doc.data[2].active=doc.data[2].size;assert.ok(valid(doc),'reactivation is allowed for point-in-time retention');
  doc.data.push({cohort:'2025-06',age:3,active:0,size:690});assert.ok(!valid(doc));
  const wrong=getExample('cohort');wrong.data[0].cohort='2025-13';assert.ok(!valid(wrong));
});

test('bullet values, target markers and qualitative bands share a linear scale and explicit definitions',()=>{
  const doc=getExample('bullet');doc.data[0].value=25;doc.data[1].value=50;
  const scene=chart(doc),bars=[...scene.svg.querySelectorAll('[data-mark="bullet-value"]')];
  assert.ok(Math.abs(+bars[1].getAttribute('width')/+bars[0].getAttribute('width')-2)<1e-12);scene.destroy();
  doc.data[0].mid=doc.data[0].low;assert.ok(!valid(doc));doc.data[0].mid=75;
  delete doc.bandLabels;assert.ok(!valid(doc));
});

test('funnel widths follow counts and undefined conversion after zero stays undefined',()=>{
  const doc=getExample('funnel'),scene=chart(doc),bars=[...scene.svg.querySelectorAll('[data-mark="funnel-step"] rect')];
  for(let i=1;i<bars.length;i++)assert.ok(Math.abs(+bars[i].getAttribute('width')/+bars[0].getAttribute('width')-doc.data[i].value/doc.data[0].value)<1e-12);
  scene.destroy();doc.data[1].value=doc.data[0].value+1;assert.ok(!valid(doc));
  doc.data.forEach((row,i)=>{if(i>0)row.value=0;});assert.ok(valid(doc));
  const zero=chart(doc);assert.match(zero.svg.textContent,/上一步为零/);assert.doesNotMatch(zero.serialize(),/NaN|Infinity/);zero.destroy();
  doc.data[1].step=3;assert.ok(!valid(doc));
});

test('sunburst parent totals reconcile to leaves and duplicate leaf names are scoped to their parent',()=>{
  const doc=getExample('sunburst'),scene=chart(doc),parents=[...scene.svg.querySelectorAll('[data-mark="sunburst-parent"]')],leaves=[...scene.svg.querySelectorAll('[data-mark="sunburst-leaf"]')];
  assert.equal(parents.reduce((sum,node)=>sum+Number(node.getAttribute('data-value')),0),leaves.reduce((sum,node)=>sum+Number(node.getAttribute('data-value')),0));
  assert.equal(leaves.length,doc.data.length);scene.destroy();
  doc.data[1].label=doc.data[0].label;assert.ok(!valid(doc));
});

test('gantt measures calendar intervals and separates completion from elapsed time',()=>{
  const doc=getExample('gantt'),scene=chart(doc),bars=[...scene.svg.querySelectorAll('[data-mark="gantt-duration"]')],fills=[...scene.svg.querySelectorAll('[data-mark="gantt-progress"]')];
  const day=+bars[0].getAttribute('width')/+bars[0].getAttribute('data-days');
  bars.forEach((bar,i)=>{
    assert.ok(Math.abs(+bar.getAttribute('width')/+bar.getAttribute('data-days')-day)<1e-10);
    assert.ok(Math.abs(+fills[i].getAttribute('width')/+bar.getAttribute('width')-doc.data[i].progress/100)<1e-10);
  });scene.destroy();doc.data[0].start='2025-02-30';assert.ok(!valid(doc));
  const reversed=getExample('gantt');reversed.data[0].end=reversed.data[0].start;assert.ok(!valid(reversed));
});

test('ledger uses a shared zero baseline, complete chronology and no divide-by-zero growth',()=>{
  const doc=getExample('ledger'),scene=chart(doc),paths=[...scene.svg.querySelectorAll('[data-mark="ledger-trend"]')];
  assert.equal(new Set(paths.map(path=>path.getAttribute('data-domain-max'))).size,1);scene.destroy();
  doc.data[0].value=0;assert.ok(valid(doc));const zero=chart(doc);assert.match(zero.svg.textContent,/—/);assert.doesNotMatch(zero.serialize(),/NaN|Infinity/);zero.destroy();
  doc.data.pop();assert.ok(!valid(doc));
  const unordered=getExample('ledger');[unordered.data[0],unordered.data[1]]=[unordered.data[1],unordered.data[0]];assert.ok(!valid(unordered));
});

test('new renderers remain finite and restore their exact settled geometry after backward scrubbing',()=>{
  for(const template of atlasCatalog)for(const [width,height] of [[300,220],[840,420]]){
    const scene=chart(getExample(template.id),width,height);scene.render(1);const settled=scene.serialize();
    for(const progress of [0,.15,.68,.3,1]){scene.render(progress);assert.doesNotMatch(scene.serialize(),/NaN|Infinity/,`${template.id}@${progress}`);}
    assert.equal(scene.serialize(),settled,template.id);scene.destroy();
  }
});
