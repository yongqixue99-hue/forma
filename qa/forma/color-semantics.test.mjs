import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {withRecordIds} from '../../src/forma/data-identity.js';
import {colorSubjects,fixedColorBindings,chartTheme,valueColorFor,resolveBoundColor} from '../../src/forma/color-semantics.js';
import {cleanOptions,makeProject,readProject} from '../../src/forma/project-file.js';
import {ChartScene} from '../../src/forma/charts.js';
import {MorphChart} from '../../src/forma/morph.js';

test('explicit category colour survives rename/reorder and never migrates to a same-name replacement',()=>{
 const doc=withRecordIds(getExample('column')),options={colorBindings:fixedColorBindings(doc,{palette:'ochre'})};options.colorBindings[0].color='#335577';
 const id=doc.data[0]._id,next=structuredClone(doc);next.data[0].label='Renamed';next.data.reverse();const index=next.data.findIndex(r=>r._id===id);
 assert.equal(chartTheme(next,options).color(index),'#335577');assert.equal(doc.data[0].label,'1月');
 next.data[index]._id='new-object';assert.notEqual(chartTheme(next,options).color(index),'#335577');
 const reopened=readProject(JSON.stringify(makeProject(next,options)));assert.deepEqual(reopened.options.colorBindings,options.colorBindings);
});
test('series colour follows registered entity identity independently of registry and row order',()=>{
 const doc=withRecordIds(getExample('groupedbar')),subjects=colorSubjects(doc),options={colorBindings:subjects.map((s,i)=>({id:s.id,color:['#315577','#ba6750','#858455'][i]}))};
 const entity=doc.entities.items[0],oldName=entity.name;entity.name='Renamed series';doc.data.filter(r=>r.series===oldName).forEach(r=>r.series=entity.name);doc.entities.items.reverse();doc.data.reverse();
 const at=colorSubjects(doc).findIndex(s=>s.id===entity.id);assert.equal(chartTheme(doc,options).color(at),'#315577');
});
test('sample population bindings retain exact members rather than a display name',()=>{
 for(const template of ['boxplot','halfeye','deltaplot','ecdfdiff']){
 const doc=withRecordIds(getExample(template)),first=colorSubjects(doc)[0];doc.data.filter(r=>r.group===first.label).forEach(r=>r.group='Renamed population');doc.data.reverse();
 assert.equal(colorSubjects(doc).find(s=>s.label==='Renamed population').id,first.id);doc.data=doc.data.filter((r,i)=>!(r.group==='Renamed population'&&i===doc.data.findIndex(r=>r.group==='Renamed population')));
 assert.notEqual(colorSubjects(doc).find(s=>s.label==='Renamed population').id,first.id);
 }
});
test('colour options validate identities and typed scales instead of silently accepting malformed styles',()=>{
 assert.throws(()=>cleanOptions({colorBindings:[{id:'a',color:'#112233'},{id:'a',color:'#445566'}]}));
 assert.throws(()=>cleanOptions({valueColors:{mode:'diverging',low:'#123456',middle:'#ffffff',high:'#654321',center:NaN}}));
 const options={valueColors:{mode:'diverging',low:'#335577',middle:'#eeeeee',high:'#bb6655',center:0}};
 assert.equal(valueColorFor(options,0,[-2,2],'fallback'),'#eeeeee');assert.equal(valueColorFor(options,-2,[-2,2],'fallback'),'#335577');assert.equal(valueColorFor(options,2,[-2,2],'fallback'),'#bb6655');assert.equal(valueColorFor(options,null,[-2,2],'missing'),'missing');assert.equal(valueColorFor(options,3.1e-8,[0,3.1e-8],'fallback'),'#bb6655');assert.deepEqual(cleanOptions(options).valueColors,options.valueColors);
});
test('native marks and morph endpoints use identical bindings and seek restores endpoint colours',()=>{
 const w=new Window(),previous={window:globalThis.window,document:globalThis.document};globalThis.window=w;globalThis.document=w.document;
 try{
  const doc=withRecordIds(getExample('column')),id=doc.data[0]._id,options={palette:'ink',colorMode:'categorical',colorBindings:[{id,color:'#446688'}],width:680,height:420,interactive:false};
  const native=new ChartScene(document.createElement('div'),doc,options);native.render(1);assert.equal(native.svg.querySelector('[data-mark="basic-column"]').getAttribute('fill'),'#446688');native.destroy();
  const morph=new MorphChart(document.createElement('div'),doc,{...options,view:'columns'});morph.render(1);assert.equal(morph.nodes.get(id).shape.getAttribute('fill'),'#446688');
  const seek=morph.setDocument(doc,'bars',{...options,colorBindings:[{id,color:'#aa6655'}],manual:true});seek(0);assert.equal(morph.nodes.get(id).shape.getAttribute('fill'),'#446688');seek(1);assert.equal(morph.nodes.get(id).shape.getAttribute('fill'),'#aa6655');seek(.5);seek(0);assert.equal(morph.nodes.get(id).shape.getAttribute('fill'),'#446688');morph.destroy();
 }finally{globalThis.window=previous.window;globalThis.document=previous.document;w.happyDOM.abort();}
});
