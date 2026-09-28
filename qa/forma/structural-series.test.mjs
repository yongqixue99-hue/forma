import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {setLocale} from '../../src/forma/locale.js';
import {getExample} from '../../src/forma/catalog.js';
import {recordId,withRecordIds} from '../../src/forma/data-identity.js';
import {structuralViews,structuralViewMap,structuralDocument,structuralEligibility,structuralCompatibility,structuralBounds,structuralColorKeys,structuralGuide,structuralAgentGuide} from '../../src/forma/structural-series-rules.js';
import {layoutStructural} from '../../src/forma/structural-series-morph.js';
import {structuralRecords,structuralPresets} from '../../src/forma/structural-series-presets.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {newWork,cleanWork,transitionPlan,stepReport} from '../../src/forma/work-model.js';
import {stepSVG} from '../../src/forma/work-export.js';
const raw=template=>withRecordIds(getExample(template),{legacyNamespace:'structural-test'}),doc=template=>structuralDocument(raw(template));
const finite=layout=>{for(const m of layout.marks){assert.equal(m.points.length,128,m.key);assert.equal(m.entrance.length,128,m.key);assert.ok(m.points.flat().every(Number.isFinite),m.key);assert.ok(m.anchor.every(Number.isFinite));}};
const near=(a,b)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);

test('eight native structural adapters preserve raw tables, metadata and complete record identities',()=>{
 assert.equal(Object.keys(structuralViewMap).length,8);
 for(const [template,view]of Object.entries(structuralViewMap)){const native=raw(template),before=structuredClone(native),d=structuralDocument(native);assert.deepEqual(native,before);assert.equal(d.unit,native.unit);assert.deepEqual(d.source,native.source);assert.equal(structuralEligibility(d,view).valid,true,template);const l=layoutStructural(d,view);finite(l);assert.equal(l.marks.filter(m=>['matrix-cell','contingency-cell','hierarchy-node'].includes(m.role)).length,d.data.length);for(const m of l.marks.filter(m=>m.editable)){assert.equal(m.identity,recordId(d.data[m.row]));assert.ok(m.opacity>=0);}for(const r of d.data)for(const k of Object.keys(before.data[r.inputIndex]))assert.deepEqual(r[k],before.data[r.inputIndex][k]);}
});

test('matrix circles encode exact relative area while radial cells retain values and explicit missingness',()=>{
 const d=doc('radialheatmap'),b=layoutStructural(d,'structural-bubbles'),r=layoutStructural(d,'structural-radial');finite(b);finite(r);const circles=b.marks.filter(m=>m.role==='matrix-cell'&&m.value>0);for(const m of circles)near(area(m.points)/area(circles[0].points),m.value/circles[0].value);
 assert.equal(b.marks.filter(m=>m.role==='matrix-cell'&&m.value===null).length,1);assert.deepEqual(b.marks.map(m=>m.key).sort(),r.marks.map(m=>m.key).sort());
 for(const m of r.marks.filter(m=>m.role==='matrix-cell')){assert.equal(m.value,d.data[m.row].value);assert.equal(m.cellAreaRepresentsValue,false);assert.ok(m.opacity>0);}
 const negative=structuredClone(d);negative.data[0].value=-5;assert.equal(structuralEligibility(negative,'structural-bubbles').valid,false);assert.equal(structuralEligibility(negative,'structural-radial').valid,true);finite(layoutStructural(negative,'structural-radial'));
 const three=doc('matrix');const names=[...new Set(three.data.map(r=>r.matrixColumn))].slice(0,3);three.data=three.data.filter(r=>names.includes(r.matrixColumn));assert.equal(structuralEligibility(three,'structural-bubbles').valid,true);assert.equal(structuralEligibility(three,'structural-radial').valid,false);
});

test('contingency shapes preserve exact count areas, association residuals, agreement and original zero cells',()=>{
 const d=doc('agreement'),a=layoutStructural(d,'structural-agreement'),r=layoutStructural(d,'structural-association'),m=layoutStructural(d,'structural-mosaic');for(const l of[a,r,m])finite(l);
 for(const cell of m.marks.filter(m=>m.role==='contingency-cell'&&m.count>0))near(area(cell.points)/(m.plot.w*m.plot.h),cell.count/m.total);
 const residuals=r.marks.filter(m=>m.role==='contingency-cell'&&Math.abs(m.residual)>1e-12),first=residuals[0];for(const cell of residuals)near(area(cell.points)/area(first.points),Math.abs(cell.count-cell.expected)/Math.abs(first.count-first.expected));
 const diag=a.marks.filter(m=>m.role==='contingency-cell'&&d.data[m.row].row===d.data[m.row].column),diagonal=diag[0];for(const cell of diag)near(Math.sqrt(area(cell.points)/area(diagonal.points)),cell.count/diagonal.count);
 near(a.statistics.agreement,a.statistics.cells.filter(c=>c.i===c.j).reduce((s,c)=>s+c.row.count**2,0)/a.statistics.rowTotals.reduce((s,v,i)=>s+v*a.statistics.columnTotals[i],0));
 const zero=structuredClone(d);zero.data[1].count=0;for(const view of ['structural-agreement','structural-association','structural-mosaic']){const l=layoutStructural(zero,view),mark=l.marks.find(m=>m.role==='contingency-cell'&&m.row===1);assert.equal(mark.value,0);assert.ok(mark.opacity>0);assert.equal(mark.editable,'count');finite(l);}
 assert.deepEqual(a.marks.map(m=>m.key).sort(),r.marks.map(m=>m.key).sort());assert.deepEqual(a.marks.map(m=>m.key).sort(),m.marks.map(m=>m.key).sort());
 assert.equal(structuralEligibility(doc('association'),'structural-agreement').valid,false,'unrelated category systems must not become agreement');
});

test('hierarchy preserves parenthood and original values with exact leaf-area and subtotal-bar ratios',()=>{
 const d=doc('circlehierarchy'),p=layoutStructural(d,'structural-pack'),r=layoutStructural(d,'structural-tree'),table=layoutStructural(d,'structural-table');for(const l of[p,r,table])finite(l);
 for(const l of[p,r]){const leaves=l.marks.filter(m=>m.role==='hierarchy-node'&&m.leaf),first=leaves[0];for(const leaf of leaves)near(area(leaf.points)/area(first.points),leaf.value/first.value);}
 for(const m of table.marks.filter(m=>m.role==='hierarchy-node')){near((Math.max(...m.points.map(p=>p[0]))-Math.min(...m.points.map(p=>p[0])))/(table.scales.value(table.total)-table.scales.value(0)),m.subtotal/table.total);assert.equal(m.value,d.data[m.row].value);assert.equal(m.editable,m.leaf?'value':'label');if(!m.leaf)assert.equal(m.originalValue,0);}
 for(const l of[p,r,table]){assert.equal(l.marks.filter(m=>m.role==='parent-edge').length,d.data.length-1);assert.deepEqual(l.marks.filter(m=>m.role==='hierarchy-node').map(m=>m.colorIdentity).sort(),structuralColorKeys(d).sort());assert.deepEqual(l.marks.map(m=>m.key).sort(),p.marks.map(m=>m.key).sort());}
 const renamed=structuredClone(d);renamed.data.reverse();renamed.data.forEach(r=>r.label=`Node ${r.id}`);assert.equal(structuralCompatibility(d,renamed),'');const again=layoutStructural(renamed,'structural-pack');assert.deepEqual(new Map(p.marks.map(m=>[m.key,m.points])),new Map(again.marks.map(m=>[m.key,m.points])));
});

test('structure membership, units and provenance reject mismatches without mutating or dropping records',()=>{
 for(const template of ['matrix','agreement','circlehierarchy']){const d=doc(template);for(const mutate of[c=>c.unit='other',c=>c.source.name='other',c=>c.data.pop(),c=>c.data[0]._id='replacement']){const bad=structuredClone(d);mutate(bad);const saved=structuredClone(bad);assert.notEqual(structuralCompatibility(d,bad),'');assert.deepEqual(bad,saved);}const changed=structuredClone(d);const leaf=changed.data.find(r=>r.value>0);if(leaf)leaf.value*=2;else changed.data[0].count++;assert.equal(structuralCompatibility(d,changed),'');}
 const hierarchy=doc('circlehierarchy'),changed=structuredClone(hierarchy);const leaf=changed.data.find(r=>r.value>0);leaf.parent=changed.data[0].id;assert.notEqual(structuralCompatibility(hierarchy,changed),'');
 const matrix=doc('matrix'),bad=structuredClone(matrix);bad.data[0].matrixRow=bad.data.at(-1).matrixRow;assert.notEqual(structuralCompatibility(matrix,bad),'');
});

test('invalid, missing, cyclic and duplicate inputs reject explicitly and preserve source data',()=>{
 const cases=[['matrix','structural-bubbles',c=>c.data.pop()],['radialheatmap','structural-radial',c=>c.data[0].value=NaN],['agreement','structural-mosaic',c=>c.data[0].count=-1],['agreement','structural-association',c=>c.data[0].count=.5],['agreement','structural-agreement',c=>c.categories=['different']],['circlehierarchy','structural-pack',c=>c.data[0].value=1],['circlehierarchy','structural-tree',c=>c.data[0].parent=c.data.at(-1).id],['circlehierarchy','structural-table',c=>c.data.at(-1).value=null]];
 for(const [template,view,mutate]of cases){const d=doc(template);mutate(d);const before=structuredClone(d);assert.equal(structuralEligibility(d,view).valid,false,view);assert.deepEqual(d,before);}
});

test('maximum-size structures and extreme finite scales render at compact and full sizes',()=>{
 const matrix=doc('radialheatmap');matrix.rings=Array.from({length:8},(_,i)=>`R${i}`);matrix.sectors=Array.from({length:16},(_,i)=>`C${i}`);matrix.data=matrix.rings.flatMap((r,i)=>matrix.sectors.map((c,j)=>({_id:`r${i}c${j}`,matrixRow:r,matrixColumn:c,value:(i+j)%7?i+j:0,inputIndex:i*16+j})));
 const hierarchy=doc('circlehierarchy');hierarchy.data=Array.from({length:80},(_,i)=>({_id:`r${i}`,id:`n${i}`,parent:i===0?'ROOT':'n0',label:`Node${i}`,value:i===0?0:i,inputIndex:i}));
 const largeTotals=structuredClone(hierarchy);largeTotals.data.forEach(r=>r.value=r.parent==='ROOT'?0:1e15);for(const view of['structural-pack','structural-tree']){assert.equal(structuralEligibility(largeTotals,view).valid,true);const layout=layoutStructural(largeTotals,view);near(layout.total,79e15);finite(layout);}
 const contingency=doc('agreement');contingency.categories=Array.from({length:6},(_,i)=>`C${i}`);contingency.data=contingency.categories.flatMap((row,i)=>contingency.categories.map((column,j)=>({_id:`r${i}c${j}`,row,column,count:(i+j)%5,inputIndex:i*6+j})));
 for(const d of [matrix,hierarchy,contingency])for(const view of structuralViews.filter(v=>v.family===d.family)){if(d===hierarchy&&view.id==='structural-table'){assert.equal(structuralEligibility(d,view.id).valid,false);continue;}assert.equal(structuralEligibility(d,view.id).valid,true,view.id);for(const [w,h]of[[300,240],[800,440],[1280,720]])finite(layoutStructural(d,view.id,w,h));}
 for(const factor of[1e-12,1e10]){const d=doc('circlehierarchy');d.data.forEach(r=>r.value*=factor);for(const v of structuralViews.filter(v=>v.family===d.family))finite(layoutStructural(d,v.id));}
});

test('three source presets retain all original rows independently and expose bilingual guidance',()=>{
 assert.equal(structuralRecords('missing'),null);assert.equal(structuralPresets.length,3);for(const preset of structuralPresets){const steps=structuralRecords(preset.id,'coral');assert.deepEqual(steps.map(s=>s.view),preset.views);for(const s of steps){assert.deepEqual(s.doc.data,steps[0].doc.data);assert.equal(s.options.palette,'coral');assert.ok(s.doc.data.every(r=>r._id));const d=structuralDocument(s.doc);assert.equal(structuralEligibility(d,s.view).valid,true);assert.ok(Object.values(structuralBounds(d)).flat().every(Number.isFinite));}steps[0].doc.data[0].sentinel=true;assert.equal(steps[1].doc.data[0].sentinel,undefined);}
 try{setLocale('en');for(const v of structuralViews){assert.equal(v.name,v.en);assert.doesNotMatch(v.note,/\p{Script=Han}/u);}for(const p of structuralPresets)assert.doesNotMatch(p.name+p.description+p.dataNote+p.relation,/\p{Script=Han}/u);const d=doc('agreement');assert.doesNotMatch(structuralGuide(d,'structural-mosaic').join(' '),/\p{Script=Han}/u);assert.doesNotMatch(structuralAgentGuide(true),/\p{Script=Han}/u);}finally{setLocale('zh-CN');}
});

test('fourteen directed transitions reuse record DOM nodes and retain exact reverse, jump and interrupted frames',()=>{
 const win=new Window();let count=0;
 for(const p of structuralPresets){const d=structuralDocument(structuralRecords(p.id)[0].doc);for(const from of p.views)for(const to of p.views){if(from===to)continue;count++;const chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440,editable:true}),nodes=new Map([...chart.nodes].map(([k,n])=>[k,n.shape])),a=chart.layout,seek=chart.setDocument(d,to,{manual:true,effect:'guided',recipe:'structural-unfold'}),b=chart.layout;seek(.37);const interrupted=structuredClone([...chart.current]);assert.ok([...chart.current.values()].flat(2).every(Number.isFinite));const jump=chart.setDocument(d,from,{manual:true,resume:true,effect:'guided',recipe:'structural-unfold'});jump(0);assert.deepEqual([...chart.current],interrupted);jump(1);a.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));const again=chart.setDocument(d,to,{manual:true,effect:'guided',recipe:'structural-unfold'});again(.5);const middle=structuredClone([...chart.current]);again(1);again(.5);assert.deepEqual([...chart.current],middle);again(0);a.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));again(1);b.marks.forEach(m=>assert.deepEqual(chart.current.get(m.key),m.points));for(const [k,n]of nodes)assert.equal(chart.nodes.get(k).shape,n);assert.doesNotMatch(chart.svg.outerHTML,/NaN|Infinity/);chart.destroy();}}
 assert.equal(count,14);win.happyDOM.close();
});

test('persisted works, pair planning, editable record bindings and SVG exports use the original player',t=>{
 const win=new Window(),previous=new Map();for(const [k,value]of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){previous.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});}t.after(()=>{for(const [k,d]of previous){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}win.happyDOM.close();});
 for(const preset of structuralPresets){const work=newWork(structuralRecords(preset.id));assert.deepEqual(cleanWork(JSON.parse(JSON.stringify(work))),work);for(const a of work.steps){assert.equal(stepReport(a).valid,true);for(const b of work.steps)if(a!==b)assert.equal(transitionPlan(a,b,{steps:work.steps}).mode,'morph');const svg=stepSVG(a,work.steps);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity/);assert.match(svg,/data-science-role="(?:matrix-cell|contingency-cell|hierarchy-node)"/);const d=structuralDocument(a.doc);for(const dark of[false,true]){const chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:a.view,editable:true,dark});for(const m of chart.layout.marks.filter(m=>m.editable)){assert.equal(chart.nodes.get(m.key).group.dataset.editField,m.editable);assert.equal(Number(chart.nodes.get(m.key).group.dataset.editRow),m.row);}chart.destroy();}}}
});

test('explicit missing matrix cells remain visible as missing markers without becoming numeric zero',()=>{
 const win=new Window(),d=doc('radialheatmap'),missing=d.data.find(r=>r.value===null);
 try{for(const view of ['structural-bubbles','structural-radial']){const chart=new ScientificMorphChart(win.document.createElement('div'),d,{view,editable:true}),marks=chart.layout.marks.filter(m=>m.identity===recordId(missing));assert.equal(marks.length,3);for(const m of marks){assert.equal(m.value,null);assert.ok(m.opacity>0);const shape=chart.nodes.get(m.key).shape;assert.notEqual(shape.getAttribute('opacity'),'0');assert.ok(Number(shape.getAttribute('fill-opacity'))>0);assert.equal(chart.nodes.get(m.key).group.dataset.editField,'value');}assert.equal(chart.doc.data[missing.inputIndex].value,null);chart.destroy();}}finally{win.happyDOM.close();}
});

test('packed leaf, matrix ring, mosaic and complete-count labels render above filled marks with contrasting ink',()=>{
 const win=new Window();
 try{for(const [template,view]of[['circlehierarchy','structural-pack'],['radialheatmap','structural-radial'],['agreement','structural-mosaic'],['agreement','structural-agreement']])for(const dark of[false,true]){
  const chart=new ScientificMorphChart(win.document.createElement('div'),doc(template),{view,width:800,height:440,dark}),labels=chart.layout.labels.filter(l=>l.dataLabel);
  assert.ok(labels.length>0,view);if(view==='structural-agreement')assert.equal(labels.length,chart.doc.data.length);
  for(const label of labels){const match=node=>node.getAttribute('x')===String(label.x)&&node.getAttribute('y')===String(label.y)&&node.textContent===String(label.text),visible=[...chart.labelLayer.querySelectorAll('text')].find(match);assert.ok(visible,`${view}: ${label.text}`);assert.equal([...chart.guideLayer.querySelectorAll('text')].some(match),false);if(label.halo){assert.equal(visible.getAttribute('stroke'),chart.theme.bg);assert.equal(visible.getAttribute('paint-order'),'stroke');}if(label.contrastMark){assert.equal(label.contrastMark.role,view==='structural-pack'?'hierarchy-node':'contingency-cell');assert.notEqual(visible.getAttribute('fill'),chart.markColor(label.contrastMark));}}
  chart.render(0);assert.equal(chart.labelLayer.getAttribute('opacity'),'0');chart.render(1);assert.equal(chart.labelLayer.getAttribute('opacity'),'1');chart.destroy();
 }}finally{win.happyDOM.close();}
});
