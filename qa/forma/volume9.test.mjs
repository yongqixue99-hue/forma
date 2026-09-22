import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {volume9Catalog,basicTemplateIds} from '../../src/forma/volume9-catalog.js';
import {table9,normalized9,change9} from '../../src/forma/volume9-data.js';
import {validateDocument,parseDataText,toCSV,summary} from '../../src/forma/data.js';
import {filterCatalog,facetCounts} from '../../src/forma/library-filter.js';
import {ChartScene} from '../../src/forma/charts.js';
import {staticSVG,standaloneHTML} from '../../src/forma/export.js';
const window=new Window();globalThis.document=window.document;globalThis.XMLSerializer=window.XMLSerializer;
const chart=(doc,options={})=>new ChartScene(document.createElement('div'),doc,{width:600,height:320,interactive:false,...options});
const valid=doc=>validateDocument(doc).valid,near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);

test('12 basic templates integrate with all 120 contracts and preserve CSV data and metadata',()=>{
  assert.equal(catalog.length,120);assert.equal(volume9Catalog.length,12);
  assert.equal(new Set(catalog.map(t=>t.id)).size,120);
  for(const t of volume9Catalog){const d=getExample(t.id);assert.ok(valid(d),t.id);assert.deepEqual(parseDataText(toCSV(d),d,'csv').data,d.data);assert.deepEqual(parseDataText(JSON.stringify(d),d),d);assert.ok(summary(d).label);assert.equal(d.source.type,'demo');}
});
test('basic collection spans old and new charts and composes with independent family facets',()=>{
  const basic=filterCatalog(catalog,{category:'basic'});assert.equal(basic.length,29);assert.deepEqual(new Set(basic.map(t=>t.id)),basicTemplateIds);
  assert.deepEqual(filterCatalog(catalog,{category:'basic',family:'pie'}).map(t=>t.id),['donut','pie']);
  assert.equal(filterCatalog(catalog,{category:'basic',edition:'9'}).length,12);
  assert.equal(facetCounts(catalog,{family:'pie'},'category').basic,2);
  assert.equal(facetCounts(catalog,{category:'basic'},'family').all,29);
  assert.equal(filterCatalog(catalog,{category:'basic',onlyFavorites:true,favorites:['column','volcano']})[0].id,'column');
});
test('single bars retain signed values, equal magnitudes have equal lengths, and zeros are accepted',()=>{
  for(const id of ['column','bar']){const d=getExample(id);d.data=[{label:'负',value:-5},{label:'零',value:0},{label:'正',value:5}];assert.ok(valid(d));const s=chart(d),marks=[...s.svg.querySelectorAll(`[data-mark="${id==='bar'?'basic-bar':'basic-column'}"]`)];const key=id==='bar'?'width':'height';near(+marks[0].getAttribute(key),+marks[2].getAttribute(key));near(+marks[1].getAttribute(key),0);s.destroy();d.data.forEach(r=>r.value=0);assert.ok(valid(d));const z=chart(d);assert.doesNotMatch(z.serialize(),/NaN|Infinity/);z.destroy();}
});
test('basic lines and areas keep missing observations as separate subpaths',()=>{
  for(const id of ['singleline','area']){const d=getExample(id);d.data=[1,2,null,3,4].map((value,i)=>({period:`P${i}`,value}));assert.ok(valid(d));const s=chart(d);assert.equal((s.svg.querySelector('[data-mark="basic-line"]').getAttribute('d').match(/M/g)||[]).length,2);assert.equal(s.svg.querySelectorAll('[data-mark="basic-trend-point"]').length,4);s.destroy();d.data.forEach(r=>r.value=null);assert.ok(!valid(d));}
});
test('negative area values are rejected without rejecting signed line values',()=>{
  const d=getExample('area');d.data[0].value=-1;assert.ok(!valid(d));d.template='singleline';assert.ok(valid(d));
});
test('basic scatter preserves every observation with the same unweighted marker geometry',()=>{
  const d=getExample('xy'),s=chart(d),points=[...s.svg.querySelectorAll('[data-mark="basic-scatter"]')];assert.equal(points.length,d.data.length);assert.equal(new Set(points.map(p=>p.getAttribute('d'))).size,1);near(+points[0].getAttribute('data-x'),d.data[0].x);s.destroy();delete d.axes;assert.ok(!valid(d));
});
test('grouped and stacked tables reject duplicate and incomplete combinations instead of inventing zero',()=>{
  for(const id of ['groupedbarh','stackedbar','percentcolumn','percentarea']){const d=getExample(id);d.data.pop();assert.ok(!valid(d),id);const dup=getExample(id);dup.data.push({...dup.data[0]});assert.ok(!valid(dup),id);const negative=getExample(id);negative.data[0].value=-1;assert.ok(!valid(negative),id);}
});
test('absolute stacked bars preserve row totals and each component width',()=>{
  const d=getExample('stackedbar'),table=table9(d.data),s=chart(d),marks=[...s.svg.querySelectorAll('[data-mark="basic-stack"]')];let index=0;
  for(const r of table.rows){let total=0;for(const v of r.values){const mark=marks[index++];near(+mark.getAttribute('data-high')-+mark.getAttribute('data-low'),v);total+=v;}near(total,r.total);}s.destroy();
});
test('percentage charts normalize each period using its own total and preserve original units',()=>{
  for(const id of ['percentcolumn','percentarea']){const d=getExample(id),table=normalized9(d);for(const r of table.rows){near(r.shares.reduce((a,b)=>a+b,0),1);r.shares.forEach((v,i)=>near(v*r.total,r.values[i]));}assert.equal(d.unit,'万元');const p=table.columns[0];d.data.filter(r=>r.period===p).forEach(r=>r.value=0);assert.ok(!valid(d));}
});
test('column and reference line use the same scale and missing reference points stay disconnected',()=>{
  const d=getExample('comboline');d.data=[10,20,null,30,40].map((line,i)=>({period:`P${i}`,bar:20,line}));const s=chart(d),path=s.svg.querySelector('[data-mark="basic-combo-line"]');assert.equal((path.getAttribute('d').match(/M/g)||[]).length,2);assert.equal(s.svg.querySelectorAll('[data-mark="basic-combo-bar"]').length,5);s.destroy();d.seriesLabels=['同名','同名'];assert.ok(!valid(d));
});
test('progress shares one ratio scale and preserves completion above 100 percent',()=>{
  const d=getExample('progress');d.data=[{label:'超额',value:120,target:100},{label:'达成',value:50,target:50},{label:'未开始',value:0,target:10}];assert.ok(valid(d));const s=chart(d),groups=[...s.svg.querySelectorAll('[data-mark="basic-progress"]')];near(+groups[0].dataset.ratio,1.2);const filled=g=>+g.querySelectorAll('rect')[1].getAttribute('width');near(filled(groups[0])/filled(groups[1]),1.2);near(filled(groups[2]),0);s.destroy();d.data[0].target=0;assert.ok(!valid(d));d.data[0].target=1e-300;assert.ok(!valid(d));
});
test('metric changes use relative rates only for positive baselines',()=>{
  near(change9({value:120,previous:100}).relative,.2);assert.deepEqual(change9({value:10,previous:0}),{delta:10,relative:null});assert.deepEqual(change9({value:-5,previous:-10}),{delta:5,relative:null});
  const d=getExample('kpi');d.data=[{label:'变化',value:10,previous:0,metricUnit:'件'}];const s=chart(d);assert.match(s.svg.textContent,/差值 \+10/);assert.doesNotMatch(s.svg.textContent,/Infinity|NaN|100%/);s.render(0);assert.equal(s.svg.querySelector('[data-mark="basic-metric"]').textContent,'0');s.render(1);assert.equal(s.svg.querySelector('[data-mark="basic-metric"]').textContent,'10');s.destroy();
});
test('monochrome grouped series keep distinct fills and pattern definitions have unique IDs',()=>{
  for(const id of ['groupedbarh','stackedbar','percentcolumn']){const s=chart(getExample(id),{palette:'mono'});const patterns=[...s.defs.querySelectorAll('pattern')].map(p=>p.id);assert.equal(patterns.length,new Set(patterns).size);const fills=[...s.svg.querySelectorAll('[data-mark^="basic-"]')].map(p=>p.getAttribute('fill')).filter(Boolean);assert.ok(new Set(fills).size>=2,id);s.destroy();}
});
test('basic templates export complete provenance and remain deterministic after arbitrary seeks',()=>{
  for(const t of volume9Catalog){const d=getExample(t.id);const s=chart(d,{width:300,height:240,compact:true}),final=s.serialize();for(const p of [.8,.1,.6,0,1])s.render(p);assert.equal(s.serialize(),final,t.id);s.destroy();const svg=staticSVG(d,{ratio:'portrait'});assert.match(svg,/确定性合成数据/);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.ok(standaloneHTML(d,{},'var FormaPlayer={mount(){}};').includes(t.id));}
});
