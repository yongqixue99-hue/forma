import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {getExample} from '../../src/forma/catalog.js';
import {withRecordIds,recordId} from '../../src/forma/data-identity.js';
import {setLocale} from '../../src/forma/locale.js';
import {networkViews,networkViewMap,networkDocument,networkEligibility,networkCompatibility,networkNodes,networkBounds,networkColorKeys,networkColorSubjects,networkGuide,networkAgentGuide} from '../../src/forma/network-series-rules.js';
import {layoutNetwork,interpolateNetworkMark,networkAttachmentPoint} from '../../src/forma/network-series-morph.js';
import {interpolateDensityContour} from '../../src/forma/scientific-geometry.js';
import {scientificMotionState} from '../../src/forma/scientific-motion-state.js';
import {networkPresets,networkRecords} from '../../src/forma/network-series-presets.js';
const raw=template=>withRecordIds(getExample(template),{legacyNamespace:'network-test'}),doc=template=>networkDocument(raw(template));
const finite=l=>{const keys=new Set();for(const m of l.marks){assert.equal(m.points.length,128,m.key);assert.equal(m.entrance.length,128,m.key);assert.ok(m.points.flat().every(Number.isFinite),m.key);assert.ok(m.anchor.every(Number.isFinite),m.key);assert.ok(!keys.has(m.key),m.key);keys.add(m.key);}for(const label of l.labels)assert.ok(Number.isFinite(label.x)&&Number.isFinite(label.y));};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);

test('six native network adapters preserve complete raw edges, direction, provenance and record identities',()=>{
 assert.equal(Object.keys(networkViewMap).length,6);assert.equal(networkViews.length,6);
 for(const [template,view]of Object.entries(networkViewMap)){const native=raw(template),saved=structuredClone(native),d=networkDocument(native),l=layoutNetwork(d,view);assert.deepEqual(native,saved);assert.equal(networkEligibility(d,view).valid,true,template);finite(l);assert.equal(d.unit,native.unit);assert.deepEqual(d.source,native.source);const edges=l.marks.filter(m=>m.role==='network-edge');assert.equal(edges.length,d.data.length);for(const m of edges){const row=d.data[m.row];assert.equal(m.identity,recordId(row));assert.equal(m.originalSource,row.source);assert.equal(m.originalTarget,row.target);assert.equal(m.value,row.value);assert.equal(m.editable,'value');assert.ok(m.opacity>0);}for(const r of d.data)for(const [key,value]of Object.entries(native.data[r.inputIndex]))assert.deepEqual(r[key],value);}
});

test('native constraints reject missing weights, loops, duplicated edges, false conservation and cross-direction claims',()=>{
 for(const [template,view,mutate]of[
  ['network','network-force',d=>d.data[0].value=null],['network','network-force',d=>d.data[0].value=0],['network','network-force',d=>d.data[0].value=-1],['network','network-force',d=>d.data[0].value=NaN],['network','network-force',d=>d.data[0].target=d.data[0].source],['network','network-force',d=>d.data[0]._id=d.data[1]._id],['network','network-force',d=>{d.data[0].source=d.data[1].target;d.data[0].target=d.data[1].source;}],['alluvial','flow-sankey',d=>d.data[0].value*=2],['sankeycycle','flow-sankey',()=>{}],['directedchord','flow-chord',d=>d.data[0].target=d.data[0].source],['chord','flow-chord',()=>{}]]){const d=doc(template);mutate(d);const before=structuredClone(d);assert.equal(networkEligibility(d,view).valid,false,`${template}/${view}`);assert.deepEqual(d,before);}
 const two=doc('sankeycycle');two.data=[{_id:'a',source:'A',target:'A',value:5,inputIndex:0},{_id:'b',source:'A',target:'B',value:8,inputIndex:1}];assert.equal(networkEligibility(two,'flow-cycle').valid,true);assert.equal(networkEligibility(two,'flow-chord').valid,false);finite(layoutNetwork(two,'flow-cycle'));assert.equal(new Set(networkNodes(two).map(n=>n.identity)).size,2);
});

test('edge and endpoint identities survive full node renames, reordering and value edits but reject rewiring',()=>{
 for(const p of networkPresets){const d=networkDocument(networkRecords(p.id)[0].doc),renamed=structuredClone(d),before=networkNodes(d).map(n=>n.identity).sort();renamed.data.reverse();const rename=new Map(networkNodes(d).map((n,i)=>[n.name,`Node ${i}`]));renamed.data.forEach(r=>{r.source=rename.get(r.source);r.target=rename.get(r.target);r.value*=1.2;});assert.equal(networkCompatibility(d,renamed),'');assert.deepEqual(networkNodes(renamed).map(n=>n.identity).sort(),before);assert.deepEqual(networkColorKeys(d).sort(),networkColorKeys(renamed).sort());for(const v of p.views){const a=layoutNetwork(d,v),b=layoutNetwork(renamed,v);assert.deepEqual(a.marks.map(m=>m.key).sort(),b.marks.map(m=>m.key).sort());finite(b);}for(const mutate of[c=>c.data.pop(),c=>c.unit='different',c=>c.source.name='different',c=>c.data[0]._id='new edge',c=>c.data[0].target=c.data[0].source]){const bad=structuredClone(d);mutate(bad);assert.notEqual(networkCompatibility(d,bad),'');}}
});

test('undirected node totals double-count incident edges without double-counting original relationships',()=>{
 const d=networkDocument(networkRecords('network-collaboration-story')[0].doc),total=d.data.reduce((s,r)=>s+r.value,0);
 for(const v of ['network-chord','network-arc','network-force']){const l=layoutNetwork(d,v);near(l.total,total);near(l.statistics.nodes.reduce((s,n)=>s+n.incident,0),total*2);for(const m of l.marks.filter(m=>m.role==='network-node')){const ids=m.recordIds;near(m.incident,d.data.filter(r=>ids.includes(recordId(r))).reduce((s,r)=>s+r.value,0));assert.equal(m.derived,true);assert.equal(m.editable,undefined);}}
 const l=layoutNetwork(d,'network-force'),edges=l.marks.filter(m=>m.role==='network-edge');for(const edge of edges)near(edge.width/edges[0].width,edge.value/edges[0].value);
});

test('directed flow preserves opposite directions, native flow widths, self-loops and incoming/outgoing imbalance',()=>{
 const d=doc('sankeycycle');for(const view of ['flow-cycle','flow-chord']){const l=layoutNetwork(d,view);finite(l);for(const m of l.marks.filter(m=>m.role==='network-node')){const n=l.statistics.nodes.find(n=>n.identity===m.identity);near(m.incoming,d.data.filter(r=>r.target===n.name).reduce((s,r)=>s+r.value,0));near(m.outgoing,d.data.filter(r=>r.source===n.name).reduce((s,r)=>s+r.value,0));}assert.ok(l.statistics.nodes.some(n=>n.incoming!==n.outgoing));const edges=l.marks.filter(m=>m.role==='network-edge');for(const edge of edges)near(edge.width/edges[0].width,edge.value/edges[0].value);}
 const flow=networkDocument(networkRecords('network-conserved-flow-story')[0].doc),l=layoutNetwork(flow,'flow-sankey'),edges=l.marks.filter(m=>m.role==='network-edge');for(const edge of edges)near(edge.width/edges[0].width,edge.value/edges[0].value);
 const opposite=d.data.filter(r=>d.data.some(q=>q.source===r.target&&q.target===r.source));assert.equal(opposite.length,2);const chord=layoutNetwork(d,'flow-chord');for(const row of opposite)assert.equal(chord.marks.filter(m=>m.role==='network-edge'&&m.identity===recordId(row)).length,1);
});

test('every view keeps identical raw and derived contour keys, with changing geometry instead of hard switching',()=>{
 for(const p of networkPresets){const d=networkDocument(networkRecords(p.id)[0].doc),layouts=p.views.map(v=>layoutNetwork(d,v)),first=layouts[0];for(const l of layouts){assert.deepEqual(l.marks.map(m=>m.key).sort(),first.marks.map(m=>m.key).sort());finite(l);}for(let i=1;i<layouts.length;i++){const a=new Map(layouts[i-1].marks.map(m=>[m.key,m]));for(const b of layouts[i].marks.filter(m=>m.role==='network-edge')){assert.notDeepEqual(b.points,a.get(b.key).points);assert.ok(a.get(b.key).opacity>0&&b.opacity>0);}}}
});

test('maximum native networks and extreme positive magnitudes keep finite contours at compact and large sizes',()=>{
 const variants=[];
 const force=doc('network');force.data=Array.from({length:50},(_,i)=>({_id:`e${i}`,source:`N${i%24}`,target:`N${(i%24+(i<24?1:i<48?3:5))%24}`,value:(i+1)*1e12,inputIndex:i}));variants.push([force,'network-force']);
 const directed=doc('directedchord');directed.data=Array.from({length:8},(_,i)=>Array.from({length:8},(_,j)=>({source:`N${i}`,target:`N${j}`,value:(i+j+1)*1e12})).filter(r=>r.source!==r.target)).flat().slice(0,40).map((r,i)=>({...r,_id:`e${i}`,inputIndex:i}));variants.push([directed,'flow-chord']);
 const loop=doc('sankeycycle');loop.data=Array.from({length:16},(_,i)=>({_id:`e${i}`,source:`N${i}`,target:`N${(i+1)%16}`,value:(i+1)*1e12,inputIndex:i}));loop.data.push(...Array.from({length:16},(_,i)=>({_id:`s${i}`,source:`N${i}`,target:`N${i}`,value:1e10,inputIndex:i+16})));variants.push([loop,'flow-cycle']);
 for(const [d,v]of variants){assert.equal(networkEligibility(d,v).valid,true,v);for(const [w,h]of[[300,240],[800,440],[1280,720]])finite(layoutNetwork(d,v,w,h));}
 for(const factor of[1e-12,1e10])for(const p of networkPresets){const d=networkDocument(networkRecords(p.id)[0].doc);d.data.forEach(r=>r.value*=factor);for(const v of p.views){assert.equal(networkEligibility(d,v).valid,true);finite(layoutNetwork(d,v));}}
});

test('three distinct presets clone raw data and expose complete bilingual guidance and stable color subjects',()=>{
 assert.equal(networkPresets.length,3);assert.equal(networkRecords('missing'),null);const signatures=[];
 for(const p of networkPresets){const steps=networkRecords(p.id,'coral');assert.deepEqual(steps.map(s=>s.view),p.views);signatures.push(JSON.stringify(steps[0].doc.data));for(const s of steps){assert.equal(s.options.palette,'coral');assert.deepEqual(s.doc.data,steps[0].doc.data);const d=networkDocument(s.doc);assert.equal(networkEligibility(d,s.view).valid,true);assert.ok(Object.values(networkBounds(d)).flat().every(Number.isFinite));assert.deepEqual(networkColorSubjects(d).map(s=>s.id),networkColorKeys(d));}steps[0].doc.data[0].sentinel=true;assert.equal(steps[1].doc.data[0].sentinel,undefined);}assert.equal(new Set(signatures).size,3);
 try{setLocale('en');for(const v of networkViews){assert.equal(v.name,v.en);assert.doesNotMatch(v.note,/\p{Script=Han}/u);}for(const p of networkPresets)assert.doesNotMatch(p.name+p.description+p.dataNote+p.relation,/\p{Script=Han}/u);assert.doesNotMatch(networkAgentGuide(true),/\p{Script=Han}/u);assert.doesNotMatch(networkGuide(doc('network'),'network-force').join(' '),/\p{Script=Han}/u);}finally{setLocale('zh-CN');}
});

test('fourteen directed transitions retain actual record DOM nodes under seek, reverse and interruptions',async()=>{
 const {ScientificMorphChart}=await import('../../src/forma/scientific-morph.js');let count=0;
 for(const p of networkPresets)for(const from of p.views)for(const to of p.views){if(from===to)continue;count++;const win=new Window(),d=networkDocument(networkRecords(p.id)[0].doc);let chart;try{chart=new ScientificMorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440,editable:true});const original=chart.layout,nodes=new Map([...chart.nodes].map(([k,n])=>[k,n.shape])),seek=chart.setDocument(d,to,{manual:true,effect:'guided',recipe:'network-unfold'}),target=chart.layout;seek(.41);const middle=structuredClone([...chart.current]);const reverse=chart.setDocument(d,from,{manual:true,resume:true,effect:'guided',recipe:'network-unfold'});reverse(0);assert.deepEqual([...chart.current],middle);reverse(1);for(const m of original.marks)assert.deepEqual(chart.current.get(m.key),m.points);const again=chart.setDocument(d,to,{manual:true,effect:'guided',recipe:'network-unfold'});again(.5);const half=structuredClone([...chart.current]);again(1);again(.5);assert.deepEqual([...chart.current],half);again(1);for(const m of target.marks)assert.deepEqual(chart.current.get(m.key),m.points);for(const [key,node]of nodes)assert.equal(chart.nodes.get(key).shape,node);assert.doesNotMatch(chart.svg.outerHTML,/NaN|Infinity|undefined/);}finally{chart?.destroy();await win.happyDOM.close();}}
 assert.equal(count,14);
});

test('network work planning, saved roundtrips, original editing fields and SVG exports use the original player',async()=>{
 const [{newWork,cleanWork,stepReport,transitionPlan},{stepSVG},{ScientificMorphChart}]=await Promise.all([import('../../src/forma/work-model.js'),import('../../src/forma/work-export.js'),import('../../src/forma/scientific-morph.js')]);const win=new Window(),old=new Map();for(const [key,value]of Object.entries({document:win.document,XMLSerializer:win.XMLSerializer})){old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 try{for(const p of networkPresets){const work=newWork(networkRecords(p.id));assert.deepEqual(cleanWork(JSON.parse(JSON.stringify(work))),work);for(const a of work.steps){assert.equal(stepReport(a).valid,true);for(const b of work.steps)if(a!==b)assert.equal(transitionPlan(a,b,{steps:work.steps}).mode,'morph');const svg=stepSVG(a,work.steps);assert.doesNotMatch(svg.replace(/<style>[\s\S]*?<\/style>/g,''),/NaN|Infinity|undefined/);assert.match(svg,/data-science-role="network-edge"/);const chart=new ScientificMorphChart(win.document.createElement('div'),networkDocument(a.doc),{view:a.view,editable:true});for(const m of chart.layout.marks.filter(m=>m.editable&&!m.derived)){assert.equal(chart.nodes.get(m.key).group.dataset.editField,'value');assert.equal(Number(chart.nodes.get(m.key).group.dataset.editRow),m.row);}chart.destroy();}}}finally{for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}await win.happyDOM.close();}
});


test('shared width bounds keep arc and force weights comparable across changed-value steps',()=>{
 const a=networkDocument(networkRecords('network-collaboration-story')[0].doc),b=structuredClone(a);b.data[0].value*=8;const domain={value:[0,Math.max(...b.data.map(r=>r.value))]};
 for(const view of ['network-arc','network-force']){const l=layoutNetwork(a,view,800,440,{domain}),r=layoutNetwork(b,view,800,440,{domain}),byId=new Map(l.marks.filter(m=>m.role==='network-edge').map(m=>[m.identity,m]));for(const m of r.marks.filter(m=>m.role==='network-edge')){const prior=byId.get(m.identity);near(m.width/prior.width,m.value/prior.value);}assert.equal(networkCompatibility(a,b),'');}
});


test('connection end caps keep their source and target attachment points throughout every morph',()=>{
 for(const preset of networkPresets){const d=networkDocument(networkRecords(preset.id)[0].doc),layouts=preset.views.map(v=>layoutNetwork(d,v));
  for(const layout of layouts)for(const mark of layout.marks.filter(m=>m.role==='network-edge'))for(const [index,end]of[[16,0],[80,1]]){near(mark.points[index][0],mark.networkEndpoints[end][0]);near(mark.points[index][1],mark.networkEndpoints[end][1]);const ref=mark.networkAttachments[end],node=layout.marks.find(m=>m.key===ref.nodeKey);assert.equal(node.group,end?mark.originalTarget:mark.originalSource);assert.ok(Math.hypot(...ref.offset)<.03,'Only native tessellation error is corrected, never a detached node or a rotated sector');const attached=networkAttachmentPoint(ref,node.points);near(mark.points[index][0],attached[0]);near(mark.points[index][1],attached[1]);}
  for(const a of layouts)for(const b of layouts){const old=new Map(a.marks.map(m=>[m.key,m]));for(const mark of b.marks.filter(m=>m.role==='network-edge'))for(const q of[.25,.5,.75])for(const [index,end]of[[16,0],[80,1]])for(const k of[0,1]){const prior=old.get(mark.key),actual=interpolateNetworkMark(prior.points,prior,mark,q)[index][k],a=prior.networkAttachments[end],b=mark.networkAttachments[end],expected=networkAttachmentPoint({nodeKey:a.nodeKey,nodePoints:interpolateDensityContour(a.nodePoints,b.nodePoints,q),station:a.station*(1-q)+b.station*q,side:a.side*(1-q)+b.side*q,offset:a.offset.map((v,j)=>v*(1-q)+b.offset[j]*q)})[k];assert.equal(a.nodeKey,b.nodeKey);near(actual,expected);}}
 }
});


test('chord-to-arc middle frames retain connected ribbon flanks instead of folding into separate thick sheets',()=>{
 const d=networkDocument(networkRecords('network-collaboration-story')[0].doc),a=layoutNetwork(d,'network-chord'),b=layoutNetwork(d,'network-arc'),old=new Map(a.marks.map(m=>[m.key,m])),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(const mark of b.marks.filter(m=>m.role==='network-edge')){const prior=old.get(mark.key);assert.equal(interpolateNetworkMark(prior.points,prior,mark,0),prior.points);assert.equal(interpolateNetworkMark(prior.points,prior,mark,1),mark.points);for(const q of[.25,.5,.75]){const points=interpolateNetworkMark(prior.points,prior,mark,q);for(let i=0;i<128;i++)for(let j=i+2;j<128;j++){if(i===0&&j===127)continue;const a=points[i],b=points[(i+1)%128],c=points[j],d=points[(j+1)%128];assert.ok(!(cross(a,b,c)*cross(a,b,d)<-1e-6&&cross(c,d,a)*cross(c,d,b)<-1e-6),`${mark.originalSource} → ${mark.originalTarget}, q=${q}: crossed flanks ${i}/${j}`);}assert.equal(interpolateNetworkMark(points,mark,prior,0),points);const resumed=interpolateNetworkMark(points,mark,prior,.5);assert.ok(resumed.flat().every(Number.isFinite));}}
});

test('cyclic self-links retain finite live contours during changed-flow updates',()=>{
 const a=doc('sankeycycle');a.data.push({_id:'self',source:a.data[0].source,target:a.data[0].source,value:12,inputIndex:a.data.length});const b=structuredClone(a);b.data.forEach((r,i)=>r.value*=1+i*.1);const before=layoutNetwork(a,'flow-cycle'),after=layoutNetwork(b,'flow-cycle'),old=new Map(before.marks.map(m=>[m.key,m]));for(const mark of after.marks.filter(m=>m.role==='network-edge'))for(const q of[0,.1,.5,.9,1]){const prior=old.get(mark.key),points=interpolateNetworkMark(prior.points,prior,mark,q);assert.ok(points.flat().every(Number.isFinite));for(const [index,end]of[[16,0],[80,1]]){const ref=scientificMotionState(points)?.networkAttachments[end]||mark.networkAttachments[end],expected=q===0?prior.points[index]:q===1?mark.points[index]:networkAttachmentPoint(ref);for(const k of[0,1])near(points[index][k],expected[k]);}}
});
