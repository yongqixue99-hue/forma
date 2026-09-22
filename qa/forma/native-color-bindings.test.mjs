import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {withRecordIds} from '../../src/forma/data-identity.js';
import {colorSubjects,chartTheme,valueColorTemplates} from '../../src/forma/color-semantics.js';
import {ChartScene} from '../../src/forma/charts.js';
import {makeProject,readProject} from '../../src/forma/project-file.js';
const palette=['#255879','#b75d48','#7b7c45','#805e95','#468581','#997246','#785557','#667ca4','#418163','#ae675b','#577580','#907141','#865e82','#528071','#855f40','#526698'];
function fixture(doc,options,verify){const w=new Window(),prior={window:globalThis.window,document:globalThis.document};globalThis.window=w;globalThis.document=w.document;let scene;try{scene=new ChartScene(document.createElement('div'),doc,{width:900,height:550,interactive:false,editable:true,...options});scene.render(1);verify(scene);}finally{scene?.destroy();globalThis.window=prior.window;globalThis.document=prior.document;w.happyDOM.abort();}}
function bound(doc){return {palette:'ink',colorMode:'categorical',colorBindings:colorSubjects(doc).map((r,i)=>({id:r.id,color:palette[i%palette.length]}))};}
function fillOrStroke(el,scene){const fill=el.getAttribute('fill');if(fill?.startsWith('url(#')){const id=fill.slice(5,-1),pattern=scene.svg.querySelector(`[id="${id}"]`);return pattern?.querySelector('[stroke]')?.getAttribute('stroke');}return fill&&fill!=='none'&&fill!=='transparent'?fill:el.getAttribute('stroke');}

test('numeric colour scales and polarity are not advertised as entity colour controls',()=>{for(const id of [...valueColorTemplates,'diverging'])assert.deepEqual(colorSubjects(withRecordIds(getExample(id))),[],id);});

test('every advertised native binding actually reaches SVG marks, not only a theme slot',()=>{
 const supported=[];for(const item of catalog){const doc=withRecordIds(getExample(item.id)),subjects=colorSubjects(doc);if(!subjects.length)continue;supported.push(item.id);const options=bound(doc);fixture(doc,options,s=>{for(const {id,color}of options.colorBindings){const marks=[...s.svg.querySelectorAll('path,rect,circle,line')].filter(n=>!n.closest('defs'));assert.ok(marks.some(n=>[n.getAttribute('fill'),n.getAttribute('stroke')].includes(color)||fillOrStroke(n,s)===color),`${item.id}: ${id} colour ${color} never reaches a plotted mark`);}});}assert.ok(supported.length>=29,JSON.stringify(supported));
});

test('value-sorted native charts keep each identity colour after rename, reorder and value ranking change',()=>{
 for(const id of ['mosaic','pareto','unit','circlepack']){
  const doc=withRecordIds(getExample(id)),options=bound(doc),first=doc.data[0],last=doc.data.at(-1);first.label='Renamed object';doc.data.reverse();[first.value,last.value]=[last.value,first.value];
  fixture(doc,options,s=>{for(const row of doc.data){const container=s.svg.querySelector(`[data-record-id="${row._id}"]`),expected=options.colorBindings.find(b=>b.id===row._id).color;assert.ok(container,`${id} ${row.label}`);const mark=container.matches('rect,path,circle')?container:container.querySelector('rect,path,circle');assert.equal(id==='mosaic'?mark.getAttribute('stroke'):fillOrStroke(mark,s),expected,`${id} ${row.label}`);}});
 }
});

test('highlight-based charts honour per-object binding on shape, stroke and shaded texture',()=>{
 for(const [id,selector]of [['lollipop','[data-mark="lollipop"]'],['rose','[data-mark="rose-sector"]'],['funnel','[data-mark="funnel-step"]']]){
  const doc=withRecordIds(getExample(id)),options=bound(doc);fixture(doc,options,s=>{for(const row of doc.data){const group=[...s.svg.querySelectorAll(selector)].find(el=>el.dataset.recordId===row._id);assert.ok(group);const shape=group.matches('g')?group.querySelector('rect,circle'):group;assert.equal(shape.getAttribute('stroke'),options.colorBindings.find(b=>b.id===row._id).color,`${id} ${row.label}`);if(id!=='lollipop')assert.equal(fillOrStroke(shape,s),options.colorBindings.find(b=>b.id===row._id).color);}});
 }
});

test('population summary colours follow exact observations through group rename and reversal',()=>{
 for(const id of ['swarm','boxplot','violin','raincloud','errorbar']){
  const doc=withRecordIds(getExample(id)),options=bound(doc),subjects=colorSubjects(doc),first=subjects[0];doc.data.filter(r=>r.group===first.label).forEach(r=>r.group='Renamed group');doc.data.reverse();
  fixture(doc,options,s=>{const theme=s.theme;assert.equal(theme.groupColor('Renamed group'),options.colorBindings[0].color);for(const subject of colorSubjects(doc)){const color=options.colorBindings.find(b=>b.id===subject.id).color;const marks=[...s.svg.querySelectorAll('[data-group]')].filter(n=>n.dataset.group===subject.label);if(marks.length)for(const mark of marks){const visible=mark.matches('g')?mark.querySelector('[stroke]'):mark;assert.equal(visible.getAttribute('stroke')||visible.getAttribute('fill'),color,`${id} ${subject.label}`);}}});
 }
});

test('model and hierarchy bindings survive registry reordering and whole-entity renaming',()=>{
 for(const [id,field,selector]of [['roc','model','[data-mark="roc-curve"]'],['precisionrecall','model','[data-mark="pr-curve"]'],['calibration','model','[data-mark="calibration-line"]'],['sunburst','parent','[data-mark="sunburst-parent"]'],['icicle','parent','[data-mark="icicle-parent"]']]){
  const doc=withRecordIds(getExample(id)),options=bound(doc),entity=doc.entities.items[0],old=entity.name;entity.name='Renamed entity';doc.data.filter(r=>r[field]===old).forEach(r=>r[field]=entity.name);doc.entities.items.reverse();doc.data.reverse();const saved=readProject(JSON.stringify(makeProject(doc,options)));
  fixture(saved.doc,saved.options,s=>{for(const el of s.svg.querySelectorAll(selector)){const subject=colorSubjects(saved.doc).find(r=>r.label===el.dataset.group);assert.ok(subject);const mark=el.matches('g')?el.querySelector('rect'):el;assert.equal(fillOrStroke(mark,s),options.colorBindings.find(b=>b.id===subject.id).color,`${id} ${subject.label}`);}});
 }
});

test('series bindings colour data shapes and hatches consistently after row and registry order changes',()=>{
 for(const [id,selector]of [['groupedbar','[data-mark="grouped-bar"]'],['groupedbarh','[data-mark="basic-grouped-bar"]'],['stackedbar','[data-mark="basic-stack"]'],['percentcolumn','[data-mark="basic-percent-column"]'],['stackedcolumn','[data-mark="stacked-column"]']]){
  const doc=withRecordIds(getExample(id)),options=bound(doc),entity=doc.entities.items[0],oldName=entity.name;entity.name='Stable renamed series';doc.data.filter(r=>r.series===oldName).forEach(r=>r.series=entity.name);doc.entities.items.reverse();doc.data.reverse();
  fixture(doc,options,s=>{let checked=0;for(const el of s.svg.querySelectorAll(selector)){const tip=el.getAttribute('data-tip')||'',subject=colorSubjects(doc).find(r=>tip.includes(r.label+'\n'));assert.ok(subject,`${id} plotted mark identifies its series`);const shape=el.matches('g')?el.querySelector('rect'):el,expected=options.colorBindings.find(b=>b.id===subject.id).color;assert.equal(fillOrStroke(shape,s),expected,`${id} ${subject.label}`);checked++;}assert.ok(checked>=doc.data.length);});
 }
});

test('binding colours leaves native data geometry and end values unchanged for every supported template',()=>{
 const attrs=['d','x','y','x1','y1','x2','y2','cx','cy','r','width','height','transform','data-value','data-low','data-high','data-share'];
 const geometry=s=>[...s.svg.querySelectorAll('path,rect,circle,line')].filter(el=>!el.closest('defs')).map(el=>[el.tagName,...attrs.map(a=>el.getAttribute(a))]);
 for(const item of catalog){const doc=withRecordIds(getExample(item.id));if(!colorSubjects(doc).length)continue;let before;fixture(doc,{palette:'ink'},s=>before=geometry(s));fixture(doc,bound(doc),s=>assert.deepEqual(geometry(s),before,item.id));}
});


test('small multiples and rank lines retain persistent series colours after rename, reorder and saved reopening',()=>{
 for(const id of ['smallmultiples','race']){
  const doc=withRecordIds(getExample(id)),options=bound(doc),entity=doc.entities.items[0],oldName=entity.name;entity.name='Stable renamed series';doc.data.filter(r=>r._seriesId===entity.id).forEach(r=>r.series=entity.name);doc.entities.items.reverse();const periods=[...new Set(doc.data.map(r=>r.period))],ids=doc.entities.items.map(e=>e.id);doc.data.sort((a,b)=>ids.indexOf(a._seriesId)-ids.indexOf(b._seriesId)||periods.indexOf(a.period)-periods.indexOf(b.period));
  const saved=readProject(JSON.stringify(makeProject(doc,options)));
  fixture(saved.doc,saved.options,s=>{
   const lines=id==='smallmultiples'?[...s.svg.querySelectorAll('[data-mark="smallmultiple"]')].map(group=>({id:group.dataset.seriesId,line:group.querySelector('[data-mark="smallmultiple-line"]'),dots:[...group.querySelectorAll('[data-mark="smallmultiple-observation"]')]})):[...s.svg.querySelectorAll('[data-mark="race-line"]')].map(line=>({id:line.dataset.seriesId,line,dots:[...s.svg.querySelectorAll('[data-mark="race-observation"]')].filter(dot=>dot.dataset.seriesId===line.dataset.seriesId)}));
   assert.equal(lines.length,colorSubjects(saved.doc).length);
   for(const group of lines){const expected=options.colorBindings.find(binding=>binding.id===group.id)?.color;assert.ok(expected,`${id} plotted series has a persistent identity`);assert.equal(group.line.getAttribute('stroke'),expected);assert.ok(group.dots.length);for(const dot of group.dots)assert.equal(dot.getAttribute('stroke'),expected);}
  });
 }
});
