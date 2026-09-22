import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {withRecordIds} from '../../src/forma/data-identity.js';
import {withEntityIds,renameMultivariateSample,multivariateGroupKey} from '../../src/forma/entity-identity.js';
import {multivariateVariables,multivariateSelectedPair,withMultivariatePair,multivariateDocument,multivariateEligibility,multivariateCompatibility,multivariateBounds} from '../../src/forma/multivariate-rules.js';
import {layoutMultivariate} from '../../src/forma/multivariate-morph.js';
import {validateDocument} from '../../src/forma/data.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {parseTable,splitTable,importedTableDocument} from '../../src/forma/table-data.js';
import {readProject,makeProject} from '../../src/forma/project-file.js';
import {colorSubjects,chartTheme} from '../../src/forma/color-semantics.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {newWork,cleanWork,makeStep,stepDomain,transitionPlan,stepEligibility} from '../../src/forma/work-model.js';
import {ChartScene} from '../../src/forma/charts.js';
import {multivariateAgentGuide} from '../../src/forma/multivariate-brief.js';
const native=()=>withRecordIds(getExample('splom'),{legacyNamespace:'qa:multivariate'}),mapped=d=>multivariateDocument(d,{title:d.title,subtitle:d.subtitle,unit:d.unit,source:d.source}),marks=l=>new Map(l.marks.map(m=>[m.key,m.points]));

test('old SPLOM works acquire independent sample/variable registries once and keep every measurement',()=>{
 const original=getExample('splom'),d=withRecordIds(original,{legacyNamespace:'legacy:known'}),again=withRecordIds(d,{legacyNamespace:'different'});
 assert.deepEqual(d,again);assert.deepEqual(d.data.map(r=>[r.sample,r.variable,r.value,r.group]),original.data.map(r=>[r.sample,r.variable,r.value,r.group]));
 assert.equal(d.sampleEntities.items.length,26);assert.equal(d.entities.items.length,3);assert.deepEqual(d.selectedPair,d.entities.items.slice(0,2).map(v=>v.id));assert.ok(d.data.every(r=>r._id&&r._sampleId&&r._variableId));
 const reversed=withRecordIds({...original,data:[...original.data].reverse()},{legacyNamespace:'legacy:known'});assert.deepEqual(new Map(d.data.map(r=>[r._id,[r._sampleId,r._variableId]])),new Map(reversed.data.map(r=>[r._id,[r._sampleId,r._variableId]])));
 assert.ok(validateDocument(d).valid);assert.deepEqual(readProject(JSON.stringify(makeProject(d,{}))).doc,d);
});
test('pair helpers use registered IDs and do not mutate the source or infer replacements by name',()=>{
 const d=native(),vars=multivariateVariables(d),pair=[vars[2].id,vars[0].id],b=withMultivariatePair(d,pair);
 assert.deepEqual(multivariateSelectedPair(b),pair);assert.notDeepEqual(d.selectedPair,pair);assert.deepEqual(b.data,d.data);
 assert.throws(()=>withMultivariatePair(d,[vars[0].name,vars[1].name]));assert.throws(()=>withMultivariatePair(d,[vars[0].id,vars[0].id]));
 for(const broken of [{...d,selectedPair:['unknown',vars[0].id]},{...d,variableUnits:{unknown:'kg'}},{...d,sampleEntities:{version:1,kind:'sample',items:[]}}])assert.equal(validateDocument(broken).dataValid,false);
 const missing=structuredClone(d);delete missing.sampleEntities;assert.equal(validateDocument(missing).dataValid,false);assert.throws(()=>withEntityIds(missing));
});
test('rename and table reorder preserve sample × ordered-variable-pair geometry and group bindings',()=>{
 const d=native(),before=layoutMultivariate(mapped(d),'multivariate-matrix',800,450),sid=d.sampleEntities.items[0].id,renamed=renameMultivariateSample(d,sid,'same specimen, new name');
 const model=createEditorModel(renamed),vid=renamed.entities.items[0].id;model.editEntity('rename',{id:vid,name:'Length renamed / mm'});const b=model.doc;b.data.reverse();
 const after=layoutMultivariate(mapped(b),'multivariate-matrix',800,450);assert.deepEqual(marks(after),marks(before));assert.deepEqual(colorSubjects(b).sort((a,b)=>a.id.localeCompare(b.id)),colorSubjects(d).sort((a,b)=>a.id.localeCompare(b.id)));
 assert.equal(multivariateCompatibility(mapped(d),mapped(b)),'');assert.equal(multivariateGroupKey(d,'A'),multivariateGroupKey(b,'A'));
});
test('matrix copies preserve both source records; focus expands only the selected panel',()=>{
 const d=mapped(native()),a=layoutMultivariate(d,'multivariate-matrix',800,450),b=layoutMultivariate(d,'multivariate-focus',800,450),samples=d.sampleEntities.items.length;
 assert.equal(a.marks.length,samples*6);assert.equal(b.marks.filter(m=>m.opacity>0).length,samples);assert.deepEqual([...marks(a).keys()].sort(),[...marks(b).keys()].sort());
 for(const mark of a.marks){assert.equal(mark.recordIds.length,2);assert.ok(mark.recordIds.every(id=>d.data.some(r=>r._id===id)));assert.deepEqual(mark.variablePair,JSON.parse(mark.identity).slice(-2));}
 assert.ok(b.marks.filter(m=>m.opacity===0).every(m=>m.radius===0));assert.ok(b.marks.filter(m=>m.opacity>0).every(m=>m.selectedFacet));
 assert.equal(new Set(b.marks.filter(m=>m.opacity>0).map(m=>m.sampleId)).size,samples);assert.deepEqual(a.variableDomains,b.variableDomains);
});
test('separate dimensions retain small scientific values, signs and own units; changed pairs use new-coordinate entry',()=>{
 const d=native(),ids=d.entities.items.map(v=>v.id);d.variableUnits={[ids[0]]:'mol/L',[ids[1]]:'g'};d.data.forEach((r,i)=>{if(r._variableId===ids[0])r.value=(i/3+1)*1e-8;});
 const m=mapped(d),bounds=multivariateBounds(m),l=layoutMultivariate(m,'multivariate-focus',800,450);assert.ok(bounds[ids[0]][1]<1e-5);assert.ok(l.labels.some(label=>/[e−-]|0\.00000/.test(label.text)));assert.ok(l.labels.some(label=>label.text.includes('mol/L')));assert.ok(l.labels.some(label=>label.text.includes('g')));assert.equal(l.scales.x.domain()[0],bounds[ids[0]][0]-(bounds[ids[0]][1]-bounds[ids[0]][0])*.08);
 const changed=withMultivariatePair(d,[ids[2],ids[0]]);assert.match(multivariateCompatibility(m,mapped(changed)),/变量对不同/);
 const units=structuredClone(d);units.variableUnits[ids[0]]='mmol/L';assert.match(multivariateCompatibility(m,mapped(units)),/单位不同/);
 const oldUnits=native(),renamed=structuredClone(oldUnits),oldId=oldUnits.entities.items[0].id;renamed.entities.items[0].name='Length / cm';renamed.data.forEach(r=>{if(r._variableId===oldId)r.variable='Length / cm';});assert.match(multivariateCompatibility(mapped(oldUnits),mapped(renamed)),/单位不同/);
});
test('missingness and duplicate observations remain errors; capacity is a layout restriction only',()=>{
 const d=native(),missing=structuredClone(d);missing.data[0].value=null;assert.equal(validateDocument(missing).dataValid,false);assert.equal(multivariateEligibility(mapped(missing),'multivariate-focus').valid,false);assert.equal(missing.data.length,d.data.length);assert.equal(missing.data[0].value,null);
 const duplicate=structuredClone(d);duplicate.data.push({...duplicate.data[0],_id:'another'});assert.equal(multivariateEligibility(mapped(duplicate),'multivariate-matrix').valid,false);
 const few=structuredClone(d),keep=new Set(few.sampleEntities.items.slice(0,2).map(s=>s.id));few.data=few.data.filter(r=>keep.has(r._sampleId));assert.equal(validateDocument(few).dataValid,true);assert.equal(validateDocument(few).layoutValid,false);assert.equal(multivariateEligibility(mapped(few),'multivariate-focus').valid,false);
});
test('editor snapshots preserve new metadata, default old drafts, rectangular paste and one-step pair undo',()=>{
 const d=native(),model=createEditorModel(d),ids=d.entities.items.map(v=>v.id),pair=[ids[2],ids[0]];model.setMeta('selectedPair',pair);assert.deepEqual(model.doc.selectedPair,pair);model.undo();assert.deepEqual(model.doc.selectedPair,d.selectedPair);model.redo();assert.deepEqual(model.doc.selectedPair,pair);
 const beforeIds=model.recordIds();model.paste([['.000001'],['.000002']],0,2);assert.equal(model.doc.data[0].value,.000001);assert.deepEqual(model.recordIds(),beforeIds);assert.ok(model.snapshot.rowMeta.every(r=>r._sampleId&&r._variableId));
 const reopened=createEditorModel(model.doc,model.snapshot);assert.deepEqual(reopened.doc,model.doc);const old=createEditorModel(d).snapshot;delete old.meta.sampleEntities;delete old.meta.selectedPair;delete old.meta.variableUnits;old.rowMeta.forEach(r=>delete r._sampleId);assert.equal(createEditorModel(d,old).report.valid,true);
});
test('replacement import creates independent identity and preserves original headers',()=>{
 const d=native(),text='specimen\tmetric\treading\tcohort\nS1\tA / mg\t0.0001\tT\nS1\tB / g\t2\tT\nS2\tA / mg\t0.0002\tT\nS2\tB / g\t3\tT\nS3\tA / mg\t0.0003\tT\nS3\tB / g\t4\tT',table=splitTable(parseTable(text),true),result=importedTableDocument(d,table,[0,1,2,3]);result.doc.source.name='Lab table';
 assert.equal(validateDocument(result.doc).valid,true);assert.deepEqual(result.doc.tableInput.headers,['specimen','metric','reading','cohort']);assert.notEqual(result.doc.sampleEntities.items[0].id,d.sampleEntities.items[0].id);assert.ok(result.doc.selectedPair.every(id=>result.doc.entities.items.some(v=>v.id===id)));
});
test('registered group colors agree in native and continuous charts; selected facet stays visible',()=>{
 const win=new Window(),old={document:globalThis.document,window:globalThis.window,XMLSerializer:globalThis.XMLSerializer};Object.assign(globalThis,{document:win.document,window:win,XMLSerializer:win.XMLSerializer});
 try{const rawSubjects=colorSubjects(getExample('splom'));assert.equal(new Set(rawSubjects.map(s=>s.id)).size,2);const d=native(),subjects=colorSubjects(d);assert.equal(subjects.length,2);const options={width:800,height:450,palette:'ink',colorBindings:subjects.map((s,i)=>({id:s.id,color:i?'#557788':'#c46a51'}))},scene=new ChartScene(win.document.createElement('div'),d,options);scene.render(1);
 assert.equal(scene.svg.querySelectorAll('[data-mark="splom-point"]').length,156);assert.equal(scene.svg.querySelectorAll('[data-selected-facet="true"]').length,1);assert.ok([...scene.svg.querySelectorAll('[data-mark="splom-point"]')].every(n=>['#557788','#c46a51'].includes(n.getAttribute('fill'))));
 const c=new ScientificMorphChart(win.document.createElement('div'),mapped(d),{...options,view:'multivariate-focus'});assert.ok([...c.nodes.values()].every(n=>['#557788','#c46a51'].includes(n.shape.getAttribute('fill'))));c.destroy();scene.destroy();
 }finally{Object.assign(globalThis,old);win.happyDOM.close();}
});
test('forward, reverse, interrupted and repeated quarter inspection reach exact geometry',()=>{
 const win=new Window();try{const d=native();for(const [from,to]of[['multivariate-matrix','multivariate-focus'],['multivariate-focus','multivariate-matrix']]){const c=new ScientificMorphChart(win.document.createElement('div'),mapped(d),{view:from,width:760,height:440}),nodes=new Map([...c.nodes].map(([k,n])=>[k,n.shape])),seek=c.setDocument(mapped(d),to,{manual:true,effect:'guided'}),frames=[];
 for(const q of[0,.25,.5,.75,1]){seek(q);frames.push(structuredClone([...c.current]));}assert.notDeepEqual(frames[1],frames[3]);seek(.25);assert.deepEqual([...c.current],frames[1]);seek(1);for(const m of c.layout.marks)assert.deepEqual(c.current.get(m.key),m.points);seek(.5);const start=structuredClone([...c.current]),reverse=c.setDocument(mapped(d),from,{manual:true,resume:true});reverse(0);assert.deepEqual([...c.current],start);reverse(1);for(const [k,n]of nodes)assert.equal(c.nodes.get(k).shape,n);c.destroy();}
 const work=newWork([{doc:d,view:'multivariate-matrix',dataGroup:'same'},{doc:d,view:'multivariate-focus',dataGroup:'same'}]);assert.deepEqual(cleanWork(work),work);assert.equal(transitionPlan(...work.steps,{steps:work.steps}).mode,'morph');assert.deepEqual(stepDomain(work.steps[0],work.steps),stepDomain(work.steps[1],work.steps));
 const changed=structuredClone(work.steps[1]);changed.doc=withMultivariatePair(changed.doc,[changed.doc.entities.items[2].id,changed.doc.entities.items[0].id]);assert.notEqual(transitionPlan(work.steps[1],changed,{steps:[work.steps[1],changed]}).mode,'morph');assert.ok(multivariateAgentGuide(true).includes('sampleEntities'));assert.ok(multivariateAgentGuide().includes('不按分面对样本删行'));
 }finally{win.happyDOM.close();}
});
