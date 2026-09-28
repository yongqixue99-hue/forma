import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample,findTemplate} from '../../src/forma/catalog.js';
import {volume5Catalog} from '../../src/forma/volume5-catalog.js';
import {validateDocument,toCSV,parseDataText,summary,recommend} from '../../src/forma/data.js';
import {polarAreaRadius,icicleLayout} from '../../src/forma/volume5-data.js';
import {filterCatalog,facetCounts} from '../../src/forma/library-filter.js';
import {ChartScene} from '../../src/forma/charts.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const chart=(doc,width=650,height=340)=>new ChartScene(document.createElement('div'),doc,{width,height,compact:width<400,interactive:false});
const valid=d=>validateDocument(d).valid;
test('all eight edition-five documents have complete contracts and lossless CSV roundtrips',()=>{
  assert.equal(volume5Catalog.length,8);assert.equal(catalog.length,144);
  for(const t of volume5Catalog){const d=getExample(t.id);assert.ok(valid(d),JSON.stringify(validateDocument(d)));assert.deepEqual(parseDataText(toCSV(d),d,'csv').data,d.data);assert.doesNotMatch(summary(d).value,/NaN|Infinity/);}
});
test('concrete names replace abstract titles without breaking stable IDs or former aliases',()=>{
  assert.equal(findTemplate('sunburst').name,'旭日图');assert.equal(getExample('smallmultiples').title,'各类内容阅读量趋势');
  assert.equal(findTemplate('tide').alias,'潮汐');assert.ok(recommend('潮汐').some(r=>r.template==='tide'));
  for(const t of catalog){assert.ok(t.name.length<=10);assert.ok(getExample(t.id).title.length<=22);}
});
test('sidebar composes category, edition, favorites and search while faceting independently',()=>{
  const opts={edition:'5',category:'comparison',query:'',favorites:new Set(['groupedbar','heatmap']),onlyFavorites:true};
  assert.deepEqual(filterCatalog(catalog,opts).map(t=>t.id),['groupedbar']);
  const categories=facetCounts(catalog,opts,'category');assert.equal(categories.all,2);assert.equal(categories.distribution,1);
  assert.equal(facetCounts(catalog,opts,'edition')['5'],1);assert.equal(filterCatalog(catalog,{query:'grouped bar'}).length,2);
  assert.equal(filterCatalog(catalog,{query:'41'})[0].id,'groupedbar');assert.equal(filterCatalog(catalog,{query:'旭日图'})[0].id,'sunburst');assert.equal(filterCatalog(catalog,{query:'does-not-exist'}).length,0);
  assert.equal(filterCatalog(catalog,{edition:'5'}).length,8);
});
test('grouped bars use a shared zero for signed values and reject incomplete groups',()=>{
  const d=getExample('groupedbar');d.data[0].value=20;d.data[1].value=-40;const s=chart(d),bars=[...s.svg.querySelectorAll('[data-mark=grouped-bar]')];
  const rects=bars.map(g=>g.querySelector('rect'));assert.equal(new Set(bars.map(g=>g.getAttribute('data-zero'))).size,1);
  assert.ok(Math.abs(+rects[1].getAttribute('height')/+rects[0].getAttribute('height')-2)<1e-9);
  assert.equal(+rects[1].getAttribute('y'),+bars[1].getAttribute('data-zero'));s.destroy();d.data.pop();assert.ok(!valid(d));
});
test('ribbon preserves interval bounds and missing gaps and uses actual date spacing',()=>{
  const d=getExample('ribbon');d.data[2]={period:d.data[2].period,estimate:null,low:null,high:null};assert.ok(valid(d));
  const s=chart(d);assert.equal((s.svg.querySelector('[data-mark=ribbon-line]').getAttribute('d').match(/M/g)||[]).length,2);
  assert.equal(s.svg.querySelectorAll('[data-mark=ribbon-missing]').length,1);
  const marks=[...s.svg.querySelectorAll('[data-mark=ribbon-observation]')];assert.ok(Math.abs((+marks[2].getAttribute('cx')-+marks[1].getAttribute('cx'))/(+marks[1].getAttribute('cx')-+marks[0].getAttribute('cx'))-2)<1e-8);
  const g=s.svg.querySelector('[data-mark=ribbon-series]');assert.ok(+g.getAttribute('data-domain-max')>=Math.max(...d.data.filter(r=>r.high!==null).map(r=>r.high)));s.destroy();
  d.data[2].low=0;assert.ok(!valid(d));d.data[2].low=null;delete d.intervalLabel;assert.ok(!valid(d));
});
test('heatmap distinguishes observed zero, null and signed values and rejects missing cells',()=>{
  const d=getExample('heatmap');d.data[0].value=0;d.data[1].value=-9;const s=chart(d);
  const missing=s.svg.querySelector('[data-value=missing] rect'),zero=s.svg.querySelector('[data-value="0"] rect');assert.notEqual(missing.getAttribute('fill'),zero.getAttribute('fill'));assert.match(missing.getAttribute('fill'),/^url/);s.destroy();
  d.data.pop();assert.ok(!valid(d));
});
test('pyramid gives equal counts equal lengths on both sides and requires named populations',()=>{
  const d=getExample('pyramid');d.data[0].left=d.data[0].right=100;const s=chart(d),row=s.svg.querySelector('[data-mark=pyramid-row]');assert.equal(row.querySelector('[data-side=left]').getAttribute('width'),row.querySelector('[data-side=right]').getAttribute('width'));s.destroy();
  d.data[0].left=-1;assert.ok(!valid(d));d.data[0].left=100;d.sideLabels=['相同','相同'];assert.ok(!valid(d));
});
test('rose sectors encode values by area, including genuine zero',()=>{
  assert.equal(polarAreaRadius(0,100,150),0);assert.ok(Math.abs(polarAreaRadius(40,100,150)**2/polarAreaRadius(10,100,150)**2-4)<1e-10);
  const d=getExample('rose');d.data[0].value=0;const s=chart(d);assert.equal(s.svg.querySelector('[data-value="0"]').getAttribute('data-radius'),'0');s.destroy();d.data.forEach(r=>r.value=0);assert.ok(!valid(d));
});
test('icicle widths reconcile parent and child totals without adding duplicated levels',()=>{
  const d=getExample('icicle'),layout=icicleLayout(d.data);assert.equal(layout.total,d.data.reduce((n,r)=>n+r.value,0));
  assert.ok(Math.abs(layout.groups.reduce((n,g)=>n+g.width,0)-1)<1e-12);
  for(const g of layout.groups){assert.ok(Math.abs(g.children.reduce((n,r)=>n+r.width,0)-g.width)<1e-12);for(const r of g.children)assert.ok(Math.abs(r.width-r.value/layout.total)<1e-12);}
  const s=chart(d);assert.equal(s.svg.querySelectorAll('[data-mark=icicle-leaf]').length,d.data.length);s.destroy();d.data[0].value=0;assert.ok(!valid(d));
});
test('radar retains one explicit scale and one point per observation',()=>{
  const d=getExample('radar'),s=chart(d);assert.equal(s.svg.querySelectorAll('[data-mark=radar-point]').length,d.data.length);assert.deepEqual([...s.svg.querySelectorAll('[data-mark=radar-point]')].map(e=>+e.getAttribute('data-value')),d.data.map(r=>r.value));s.destroy();
  d.data[0].value=d.max+1;assert.ok(!valid(d));d.data[0].value=0;delete d.max;assert.ok(!valid(d));
});
test('trajectory sorts chronologically while preserving measured coordinates and axis meanings',()=>{
  const d=getExample('trajectory');d.data.reverse();const s=chart(d);assert.deepEqual([...s.svg.querySelectorAll('[data-mark=trajectory-point]')].map(e=>e.getAttribute('data-period')),[...d.data].sort((a,b)=>a.period.localeCompare(b.period)).map(r=>r.period));s.destroy();delete d.axes.x;assert.ok(!valid(d));
});
test('new renderers stay finite, keep observed points in frame and seek backwards exactly',()=>{
  for(const t of volume5Catalog)for(const [width,height] of [[300,240],[840,420]]){const s=chart(getExample(t.id),width,height),final=s.serialize();
    for(const p of [0,.4,.8,.1,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity/,t.id);}
    for(const point of s.svg.querySelectorAll('[data-mark$="point"],[data-mark$="observation"]'))if(point.tagName==='circle')for(const [attr,max]of [['cx',width],['cy',height]])assert.ok(+point.getAttribute(attr)>=0&&+point.getAttribute(attr)<=max,`${t.id}: ${attr}`);
    assert.equal(s.serialize(),final,t.id);s.destroy();}
});
