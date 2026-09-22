import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,families,getExample} from '../../src/forma/catalog.js';
import {volume7Catalog} from '../../src/forma/volume7-catalog.js';
import {validateDocument,toCSV,parseDataText} from '../../src/forma/data.js';
import {normalQuantile,qqRows,survivalSteps,parallelSetsLayout,networkLayout,likertLayout,table7,horizonSamples} from '../../src/forma/volume7-data.js';
import {spatialScale7} from '../../src/forma/volume7-utils.js';
import {filterCatalog,facetCounts} from '../../src/forma/library-filter.js';
import {ChartScene} from '../../src/forma/charts.js';
import {spatialViews} from '../../src/forma/spatial-charts.js';
import {staticSVG,standaloneHTML} from '../../src/forma/export.js';
const win=new Window();globalThis.document=win.document;globalThis.XMLSerializer=win.XMLSerializer;
const chart=(doc,options={})=>new ChartScene(document.createElement('div'),typeof doc==='string'?getExample(doc):doc,{width:840,height:420,interactive:false,...options});
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≈ ${b}`);
const valid=doc=>validateDocument(doc).valid;

test('20 additions have valid source-aware documents and lossless CSV roundtrips',()=>{
  assert.equal(catalog.length,120);assert.equal(volume7Catalog.length,20);assert.equal(volume7Catalog.filter(t=>t.dimension==='3d').length,2);
  for(const t of volume7Catalog){const doc=getExample(t.id);assert.ok(valid(doc),`${t.id}: ${validateDocument(doc).errors}`);assert.deepEqual(parseDataText(toCSV(doc),doc,'csv').data,doc.data);assert.equal(doc.source.type,'demo');assert.ok(t.fields.length&&t.limit&&t.use&&t.avoid&&t.motion);}
});
test('visual families cover all templates once, and compose with purpose, favorites, search and latest additions',()=>{
  assert.deepEqual(families.slice(1,4).map(f=>f.name),['饼状图类','折线图类','柱状图类']);
  const counts=facetCounts(catalog,{},'family');assert.equal(Object.entries(counts).filter(([k])=>k!=='all').reduce((n,[,v])=>n+v,0),120);assert.ok(catalog.every(t=>families.some(f=>f.id===t.family)));
  assert.deepEqual(filterCatalog(catalog,{family:'pie'}).map(t=>t.id).sort(),['donut','pie','rose','sunburst']);
  const opts={family:'line',category:'trend',edition:'7'};assert.equal(filterCatalog(catalog,opts).length,4);assert.equal(facetCounts(catalog,opts,'family').all,6);
  assert.deepEqual(filterCatalog(catalog,{...opts,onlyFavorites:true,favorites:new Set(['polarline','pie'])}).map(t=>t.id),['polarline']);
  assert.equal(filterCatalog(catalog,{family:'bar',query:'stacked column'}).length,2);assert.equal(filterCatalog(catalog,{edition:'7'}).length,20);
});
test('incomplete grids, negative shares, invalid dates and impossible single metrics are rejected',()=>{
  for(const id of ['stackedcolumn','streamgraph','horizon','cycleplot','lines3d']){const doc=getExample(id);doc.data.pop();assert.ok(!valid(doc),id);}
  for(const id of ['pie','polarline','stackedcolumn','streamgraph']){const doc=getExample(id);doc.data[0].value=-1;assert.ok(!valid(doc),id);}
  for(const id of ['streamgraph','horizon','eventline']){const doc=getExample(id);doc.data[0][id==='eventline'?'date':'period']='2025-02-30';assert.ok(!valid(doc),id);}
  const doc=getExample('gauge');doc.data[0].value=101;assert.ok(!valid(doc));doc.data[0].value=50;doc.data[0].max=0;assert.ok(!valid(doc));
});
test('graph contracts distinguish directed edges and reject ambiguous hierarchy memberships',()=>{
  for(const id of ['network','edgebundle']){const d=getExample(id);const r=d.data[0];d.data.push({...r,source:r.target,target:r.source});assert.ok(!valid(d),id);}
  const directed=getExample('directedchord');assert.ok(valid(directed));directed.data.push({...directed.data[0]});assert.ok(!valid(directed));
  const tree=getExample('edgebundle');tree.data[0].sourceGroup='异组';assert.ok(!valid(tree));
  const layout=networkLayout(getExample('network').data),again=networkLayout(getExample('network').data);assert.deepEqual(layout.nodes,again.nodes);assert.ok(layout.nodes.every(d=>Number.isFinite(d.x)&&Number.isFinite(d.y)));
});
test('parallel sets preserve every joint record, exact thickness and axis totals',()=>{
  const doc=getExample('parallelsets'),layout=parallelSetsLayout(doc.data,300),total=doc.data.reduce((n,d)=>n+d.value,0);assert.equal(layout.total,total);
  layout.bands.forEach((band,i)=>{assert.equal(band.value,doc.data[i].value);close(band.thickness,band.value*layout.scale);assert.equal(band.positions.length,3);band.positions.forEach(p=>assert.ok(p>=0&&p+band.thickness<=300+1e-8));});
  for(const axis of layout.axes)close(axis.reduce((n,c)=>n+c.value,0),total);
  const bad=getExample('parallelsets');bad.data.push({...bad.data[0]});assert.ok(!valid(bad));
});
test('Q-Q quantiles match known normal values, preserve sorted observations and reject zero variance',()=>{
  close(normalQuantile(.5),0);close(normalQuantile(.975),1.959963984,2e-6);close(normalQuantile(.025),-1.959963984,2e-6);close(normalQuantile(.001),-3.090232306,2e-5);
  const d=getExample('qqplot'),rows=qqRows(d.data);assert.deepEqual(rows.map(r=>r.value),d.data.map(r=>r.value).sort((a,b)=>a-b));assert.ok(rows.every((r,i)=>!i||r.theoretical>=rows[i-1].theoretical));d.data.forEach(r=>r.value=7);assert.ok(!valid(d));
});
test('duration survival handles tied events before censoring and never drops on censoring alone',()=>{
  const rows=[{duration:1,status:'ended'},{duration:1,status:'censored'},{duration:2,status:'ended'},{duration:3,status:'censored'}],steps=survivalSteps(rows);
  assert.deepEqual(steps.map(d=>d.risk),[4,2,1]);close(steps[0].survival,.75);close(steps[1].survival,.375);close(steps[2].survival,.375);
  assert.ok(survivalSteps(rows.map(r=>({...r,status:'censored'}))).every(d=>d.survival===1));
  const doc=getExample('survival');doc.data[0].status='missing';assert.ok(!valid(doc));
});
test('Likert shares sum to 100, neutral straddles zero and invalid percentages are blocked',()=>{
  const doc=getExample('likert'),rows=likertLayout(doc);for(const row of rows){close(row.segments.at(-1).end-row.segments[0].start,100);close(row.segments[2].start,-row.segments[2].end);for(const d of row.segments)close(d.end-d.start,d.value);}
  doc.data[0].value++;assert.ok(!valid(doc));doc.data[0].value--;doc.responses[0]=doc.responses[1];assert.ok(!valid(doc));
});
test('spatial fields preserve Euclidean proportions and vector magnitudes including zero',()=>{
  for(const size of [[300,240],[840,420]]){const doc=getExample('vectorfield'),s=chart(doc,{width:size[0],height:size[1]}),f=spatialScale7(s,doc.data);close(Math.abs(f.x(1)-f.x(0)),Math.abs(f.y(1)-f.y(0)));const vectors=[...s.svg.querySelectorAll('[data-mark=vector]')];assert.equal(vectors.length,doc.data.length);vectors.forEach((v,i)=>close(+v.dataset.magnitude,Math.hypot(doc.data[i].u,doc.data[i].v)));s.destroy();}
  const doc=getExample('vectorfield');doc.data.forEach(r=>{r.u=0;r.v=0;});const s=chart(doc);assert.doesNotMatch(s.serialize(),/NaN|Infinity/);s.destroy();
});
test('pie angles, stacked amounts and gauge angles correspond to input values',()=>{
  const doc=getExample('pie');doc.data[0].value=0;const s=chart(doc),sectors=[...s.svg.querySelectorAll('[data-mark=pie-sector]')];close(sectors.reduce((a,d)=>a+Number(d.dataset.angle),0),Math.PI*2);close(Number(sectors[0].dataset.angle),0);s.destroy();
  const bars=chart('stackedcolumn');assert.equal(bars.svg.querySelectorAll('[data-mark=stacked-column]').length,getExample('stackedcolumn').data.length);bars.destroy();
  const gauge=getExample('gauge');gauge.data[0]={label:'指标',min:-50,max:150,value:50,target:100};const g=chart(gauge);close(+g.svg.querySelector('[data-mark=gauge-needle]').dataset.ratio,.5);g.destroy();
});
test('metadata-like series names are safe and missing horizon observations remain gaps',()=>{
  for(const id of ['stackedcolumn','streamgraph','horizon','cycleplot']){const doc=getExample(id),k=id==='cycleplot'?'season':'series',first=doc.data[0][k];doc.data.forEach(r=>{if(r[k]===first)r[k]='key';});assert.ok(valid(doc));const s=chart(doc);assert.doesNotMatch(s.serialize(),/NaN|Infinity/);s.destroy();}
  const doc=getExample('horizon'),s=chart(doc),path=s.svg.querySelectorAll('[data-horizon-series]')[1].querySelector('path');assert.ok((path.getAttribute('d').match(/M/g)||[]).length>=2);s.destroy();
});
test('raincloud retains every raw sample and uses one bandwidth across groups',()=>{
  const d=getExample('raincloud'),s=chart(d);assert.equal(s.svg.querySelectorAll('[data-mark=raincloud-observation]').length,d.data.length);assert.equal(new Set([...s.svg.querySelectorAll('[data-mark=raincloud-density]')].map(e=>e.dataset.bandwidth)).size,1);s.destroy();
});
test('3D bubble projected areas encode size and camera movement preserves all source coordinates',()=>{
  const d=getExample('bubble3d');d.data[0].size=4;d.data[1].size=16;const s=chart(d),e=s.spatial.entries;close(e[1].mesh.scale.x**2/e[0].mesh.scale.x**2,4);const positions=e.map(d=>[...d.position]);s.spatial.setCamera(spatialViews.top);assert.deepEqual(e.map(d=>d.position),positions);assert.equal(s.spatial.camera.isOrthographicCamera,true);s.destroy();
});
test('3D lines share an explicit zero-containing height scale, preserve point count and export all views',()=>{
  for(const id of ['bubble3d','lines3d'])for(const [width,height]of [[300,240],[840,420],[300,420]]){const d=getExample(id),s=chart(d,{width,height,compact:width<400});assert.equal(s.spatial.entries.length,d.data.length);if(id==='lines3d')assert.ok(s.spatial.domains.z[0]<=0);for(const view of Object.values(spatialViews)){s.spatial.setCamera(view);for(const e of s.spatial.entries){assert.ok(+e.hit.getAttribute('cx')>=0&&+e.hit.getAttribute('cx')<=width);assert.ok(+e.hit.getAttribute('cy')>=0&&+e.hit.getAttribute('cy')<=height);}}s.destroy();}
});
test('new templates export source data and finish deterministically after arbitrary backwards seeks',()=>{
  for(const t of volume7Catalog){const d=getExample(t.id),s=chart(d),final=s.serialize();for(const p of [.63,.08,.91,0,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity/,t.id);}assert.equal(s.serialize(),final,t.id);s.destroy();const svg=staticSVG(d,{ratio:'portrait'});assert.match(svg,/确定性合成数据/);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);const html=standaloneHTML(d,{},'var FormaPlayer={mount(){}};');assert.ok(html.includes(t.id));}
});

test('horizon folding splits linear intervals at exact sign and band crossings',()=>{
  const rows=[{key:'2025-01-01',values:{A:30}},{key:'2025-01-07',values:{A:-30}}],samples=horizonSamples(rows,'A',10);assert.deepEqual(samples.map(d=>d.value),[30,20,10,0,-10,-20,-30]);assert.equal(new Date(samples[3].time).toISOString().slice(0,10),'2025-01-04');rows[1].values.A=null;assert.equal(horizonSamples(rows,'A',10).length,2);
});
