import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {volume6Catalog} from '../../src/forma/volume6-catalog.js';
import {validateDocument,toCSV,parseDataText} from '../../src/forma/data.js';
import {ternaryPosition,hexbinLayout,regularGrid,differenceSegments} from '../../src/forma/volume6-data.js';
import {ChartScene} from '../../src/forma/charts.js';
import {cameraState,spatialViews} from '../../src/forma/spatial-charts.js';
import {makeSelectionItem,createSelectionBundle,normalizeChartOptions} from '../../src/forma/library-actions.js';
import {staticSVG} from '../../src/forma/export.js';
import {filterCatalog} from '../../src/forma/library-filter.js';
const win=new Window();globalThis.document=win.document;globalThis.XMLSerializer=win.XMLSerializer;
const chart=(id,options={})=>new ChartScene(document.createElement('div'),typeof id==='string'?getExample(id):id,{width:840,height:420,interactive:false,...options});
const valid=doc=>validateDocument(doc).valid;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≈ ${b}`);

test('edition six has twelve distinct contracts, four spatial templates and lossless source data',()=>{
  assert.equal(catalog.length,204);assert.equal(volume6Catalog.length,12);assert.equal(filterCatalog(catalog,{category:'spatial'}).length,6);
  for(const t of volume6Catalog){const doc=getExample(t.id);assert.ok(valid(doc),JSON.stringify(validateDocument(doc)));assert.deepEqual(parseDataText(toCSV(doc),doc,'csv').data,doc.data);assert.equal(doc.source.type,'demo');}
});

test('ternary positions obey all three weights and invalid proportions are rejected',()=>{
  const vertices=[[100,0],[0,180],[200,180]];
  for(let i=0;i<3;i++){const row={a:0,b:0,c:0};row[['a','b','c'][i]]=100;assert.deepEqual(ternaryPosition(row,vertices),vertices[i]);}
  const p=ternaryPosition({a:25,b:25,c:50},vertices);assert.deepEqual(p,[125,135]);
  const doc=getExample('ternary');doc.data[0].a++;assert.ok(!valid(doc));doc.data[0].a--;doc.unit='份';assert.ok(!valid(doc));
});

test('regular sampling rejects missing, duplicate and irregular coordinates without filling data',()=>{
  for(const id of ['contour','surface3d']){
    const doc=getExample(id),grid=regularGrid(doc.data);assert.equal(grid.xs.length*grid.ys.length,doc.data.length);
    const shuffled={...doc,data:[...doc.data].reverse()};assert.deepEqual(regularGrid(shuffled.data).rows,grid.rows);
    const missing=structuredClone(doc);missing.data.pop();assert.ok(!valid(missing));
    const duplicated=structuredClone(doc);duplicated.data[1]=duplicated.data[0];assert.ok(!valid(duplicated));
    const irregular=structuredClone(doc);irregular.data.forEach(r=>{if(r.x===2)r.x=2.2;});assert.ok(!valid(irregular));
    const constant=structuredClone(doc);constant.data.forEach(r=>r.value=15);assert.ok(valid(constant));const s=chart(constant);assert.doesNotMatch(s.serialize(),/NaN|Infinity/);s.destroy();
  }
});

test('hexagonal bins count every original record exactly once and preserve bin membership across render sizes',()=>{
  const doc=getExample('hexbin'),layout=hexbinLayout(doc);assert.equal(layout.bins.reduce((n,b)=>n+b.length,0),doc.data.length);
  assert.deepEqual(layout.bins.flat().map(r=>r.label).sort(),doc.data.map(r=>r.label).sort());
  const memberships=layout.bins.map(b=>({x:b.x,y:b.y,labels:b.map(r=>r.label).sort()}));
  for(const width of [300,1100]){const s=chart(doc,{width});assert.equal([...s.svg.querySelectorAll('[data-mark=hex-bin]')].reduce((n,g)=>n+Number(g.dataset.count),0),doc.data.length);s.destroy();assert.deepEqual(hexbinLayout(doc).bins.map(b=>({x:b.x,y:b.y,labels:b.map(r=>r.label).sort()})),memberships);}
  doc.binRadius=0;assert.ok(!valid(doc));doc.binRadius=14;doc.data[0].x=Infinity;assert.ok(!valid(doc));
});

test('difference fills split at the exact interpolated crossing and retain signs',()=>{
  const rows=[{period:'2025-01-01',a:20,b:10},{period:'2025-01-05',a:0,b:10}],segments=differenceSegments(rows);
  assert.equal(segments.length,2);assert.equal(segments[0].positive,true);assert.equal(segments[1].positive,false);
  const crossing=segments[0].points[1];assert.deepEqual(crossing,segments[1].points[0]);assert.equal(crossing.x,Date.parse('2025-01-03'));assert.equal(crossing.a,10);assert.equal(crossing.a,crossing.b);
  const doc=getExample('difference');doc.seriesLabels=['同名','同名'];assert.ok(!valid(doc));
});

test('donut angles and packed circle areas are proportional, and zero remains zero',()=>{
  const doc=getExample('donut');doc.data[0].value=0;const s=chart(doc),sectors=[...s.svg.querySelectorAll('[data-mark=donut-sector]')],total=doc.data.reduce((n,r)=>n+r.value,0);
  sectors.forEach((el,i)=>near(Number(el.dataset.angle),doc.data[i].value/total*Math.PI*2));near(sectors.reduce((n,el)=>n+Number(el.dataset.angle),0),Math.PI*2);assert.equal(sectors[0].dataset.angle,'0');s.destroy();
  const circles=chart('circlepack'),nodes=[...circles.svg.querySelectorAll('[data-mark=packed-circle]')],ratio=Number(nodes[0].querySelector('circle').getAttribute('r'))**2/Number(nodes[0].dataset.value);
  nodes.forEach(n=>near(Number(n.querySelector('circle').getAttribute('r'))**2/Number(n.dataset.value),ratio));circles.destroy();
});

test('step lines preserve gaps and invalid dates cannot silently roll into another month',()=>{
  const doc=getExample('step');doc.data[3].value=null;const s=chart(doc);assert.equal((s.svg.querySelector('[data-mark=step-line]').getAttribute('d').match(/M/g)||[]).length,2);assert.equal(s.svg.querySelectorAll('[data-mark=step-point]').length,doc.data.length-1);s.destroy();
  for(const id of ['step','difference','trajectory3d']){const d=getExample(id);d.data[0].period='2025-02-30';assert.ok(!valid(d));}
});

test('3D columns share zero and mesh heights remain proportional to the actual values',()=>{
  const doc=getExample('bars3d');doc.data[0].value=0;const s=chart(doc),entries=s.spatial.entries;
  assert.equal(s.spatial.domains.z[0],0);assert.equal(entries[0].mesh.visible,false);assert.equal(entries[0].mesh.scale.y,0);
  const ratio=entries[1].mesh.scale.y/doc.data[1].value;
  entries.forEach((e,i)=>{near(e.mesh.scale.y,doc.data[i].value*ratio);near(e.mesh.position.y,e.mesh.scale.y/2);assert.equal(e.row,doc.data[i]);});s.destroy();
  doc.data.pop();assert.ok(!valid(doc));
});

test('3D uses a real orthographic camera, preserves measured point positions and releases owned scene objects',()=>{
  for(const id of ['scatter3d','trajectory3d','surface3d']){
    const s=chart(id),spatial=s.spatial,positions=spatial.entries.map(e=>[...e.position]);assert.equal(spatial.camera.isOrthographicCamera,true);assert.equal(spatial.entries.length,getExample(id).data.length);
    spatial.setCamera({azimuth:-40,elevation:58});assert.deepEqual(spatial.entries.map(e=>e.position),positions);assert.equal(s.svg.dataset.cameraAzimuth,'-40');
    s.destroy();assert.equal(spatial.scene.children.length,0);
  }
});

test('3D camera presets, keyboard, copy recipes and SVG exports retain the selected view',()=>{
  const doc=getExample('scatter3d'),s=chart(doc,{interactive:true,orbit:true});s.spatial.setCamera(spatialViews.front);
  s.svg.dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.deepEqual(s.spatial.getCamera(),{azimuth:6,elevation:0});
  s.svg.dispatchEvent(new win.PointerEvent('pointerdown',{button:0,clientX:40,clientY:50}));s.svg.dispatchEvent(new win.PointerEvent('pointermove',{clientX:100,clientY:70}));assert.deepEqual(s.spatial.getCamera(),{azimuth:30,elevation:6});s.svg.dispatchEvent(new win.PointerEvent('pointerup'));s.spatial.setCamera({azimuth:6,elevation:0});
  const options={palette:'cobalt',camera3d:s.spatial.getCamera()},item=makeSelectionItem(doc,options),bundle=createSelectionBundle([item]);
  assert.deepEqual(bundle.charts[0].options.camera3d,options.camera3d);const svg=staticSVG(doc,options);assert.match(svg,/data-camera-azimuth="6"/);assert.match(svg,/data-spatial-renderer="scatter3d"/);assert.doesNotMatch(svg,/<canvas/);
  assert.deepEqual(cameraState(null),spatialViews.iso);assert.deepEqual(cameraState({azimuth:999,elevation:-8}),{azimuth:180,elevation:0});assert.ok(!('camera3d' in normalizeChartOptions(options,getExample('donut'))));s.destroy();
});

test('new plots stay finite in narrow layouts and restore exact geometry after backward seeking',()=>{
  for(const t of volume6Catalog)for(const width of [300,840]){
    const s=chart(t.id,{width,height:width===300?240:420,compact:width===300}),final=s.serialize();
    for(const p of [0,.5,.9,.1,1]){s.render(p);assert.doesNotMatch(s.serialize(),/NaN|Infinity/,t.id);}
    assert.equal(s.serialize(),final,t.id);s.destroy();
  }
});

test('orthographic frames retain all observations in portrait and square exports at every preset',()=>{
  for(const id of ['scatter3d','bars3d','surface3d','trajectory3d'])for(const [width,height] of [[840,1120],[840,840]]){
    const s=chart(id,{width,height});
    for(const view of Object.values(spatialViews)){
      s.spatial.setCamera(view);
      for(const {hit}of s.spatial.entries){const x=+hit.getAttribute('cx'),y=+hit.getAttribute('cy');assert.ok(x>=6&&x<=width-6&&y>=6&&y<=height-6,`${id} ${width}×${height}: (${x}, ${y})`);}
    }
    s.destroy();
  }
});
