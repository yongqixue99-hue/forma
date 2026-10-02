import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {polygonArea} from 'd3';
import {MorphChart,layoutMorph,morphExample} from '../../src/forma/morph.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {segment} from '../../src/forma/scientific-geometry.js';
import {interpolateStrokeFrame,interpolateStrokeEndpoints} from '../../src/forma/motion-geometry.js';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {newWork,recommendedTransitions,stepView,stepEligibility,presetWork} from '../../src/forma/work-model.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
const area=p=>Math.abs(polygonArea(p));
const finite=p=>assert.ok(p.flat().every(Number.isFinite));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);

test('straight measured ribbons keep their thickness and nonzero area through a half turn',()=>{
 const from=segment([40,70],[220,70],1.2),to=segment([240,120],[60,120],1.2);
 for(const q of [.01,.25,.5,.75,.99]){const p=interpolateStrokeFrame(from,to,q);finite(p);close(area(p),180*1.2);close(Math.hypot(p[0][0]-p[96][0],p[0][1]-p[96][1]),1.2);}
 assert.strictEqual(interpolateStrokeFrame(from,to,0),from);assert.strictEqual(interpolateStrokeFrame(from,to,1),to);
});

test('moving connectors remain attached to both observations and preserve measured line width',()=>{
 const a=[[40,70],[220,120]],b=[[90,140],[240,60]],source=segment(...a,1.6),target=segment(...b,1.6);
 for(const q of[.1,.25,.5,.75,.9]){const p=interpolateStrokeEndpoints(source,target,q),ends=[[0,96],[32,64]].map(([i,j])=>[(p[i][0]+p[j][0])/2,(p[i][1]+p[j][1])/2]);for(let i=0;i<2;i++)for(let k=0;k<2;k++)close(ends[i][k],a[i][k]+(b[i][k]-a[i][k])*q);close(Math.hypot(p[0][0]-p[96][0],p[0][1]-p[96][1]),1.6);}
});

test('ring and polar sectors unwrap as continuous two-sided strips, retain values and fit compact or dominant-share cases',async()=>{
 const win=new Window();try{for(const [w,h]of[[300,220],[800,440]])for(const view of['pie','donut','semidonut','rose'])for(const dominant of[false,true]){
  const d=structuredClone(morphExample);if(dominant)d.data.forEach((r,i)=>r.value=i?1:95);const before=structuredClone(d),chart=new MorphChart(win.document.createElement('div'),d,{view,width:w,height:h}),source=chart.layout,seek=chart.setDocument(d,'bars',{manual:true,effect:'guided'}),target=chart.layout;
  for(const q of[0,.001,.1,.25,.5,.75,.9,.999,1]){seek(q);for(const m of target.marks){const p=chart.current.get(m.key);finite(p);assert.ok(area(p)>0);for(const[x,y]of p){assert.ok(x>=-1e-6&&x<=w+1e-6,view);assert.ok(y>=-1e-6&&y<=h+1e-6,view);}assert.equal(m.value,source.marks.find(s=>s.key===m.key).value);}}
  seek(.37);const displayed=structuredClone([...chart.current]),resume=chart.setDocument(d,'columns',{manual:true,resume:true});resume(0);assert.deepEqual([...chart.current],displayed);resume(.000001);for(const [id,p]of chart.current){const old=displayed.find(([key])=>key===id)[1];assert.ok(Math.abs(area(p)-area(old))<.02,'resumed outline jumped');}resume(.5);for(const p of chart.current.values())finite(p);resume(1);for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);assert.deepEqual(d,before);chart.destroy();
 }}finally{await win.happyDOM.close();}
});

test('fractional waffle runs merge into rectangles without torn polygons or lost share and resume from displayed partitions',async()=>{
 const win=new Window();try{for(const [from,to]of[['waffle','bars'],['columns','waffle'],['waffle','stacked']]){
  const d=structuredClone(morphExample);d.data.forEach((r,i)=>r.value=[12.5,7.25,38.1,11.2,6.6,24.35][i]);const chart=new MorphChart(win.document.createElement('div'),d,{view:from,width:800,height:440}),a=chart.layout,seek=chart.setDocument(d,to,{manual:true,effect:'guided'}),b=chart.layout,nodes=new Map([...chart.nodes].map(([id,n])=>[id,n.shape]));
  for(const q of[.05,.25,.5,.75,.95]){seek(q);for(const m of b.marks){const p=chart.current.get(m.key);finite(p);assert.ok(area(p)>0);assert.ok(area(p)<800*440);assert.equal(chart.nodes.get(m.key).shape.getAttribute('stroke-width'),'0');}}
  seek(0);for(const m of a.marks)assert.deepEqual(chart.current.get(m.key),m.points);seek(1);for(const m of b.marks)assert.deepEqual(chart.current.get(m.key),m.points);seek(.37);const current=structuredClone([...chart.current]),resume=chart.setDocument(d,'bars',{manual:true,resume:true});resume(0);assert.deepEqual([...chart.current],current);resume(.000001);for(const[id,p]of chart.current)assert.ok(Math.abs(area(p)-area(current.find(([key])=>key===id)[1]))<.02);resume(.5);for(const p of chart.current.values())finite(p);resume(1);for(const[id,node]of nodes)assert.equal(chart.nodes.get(id).shape,node);chart.destroy();
 }}finally{await win.happyDOM.close();}
});

test('direct scientific seek and live changes use the same specialized geometry as exported work frames',async()=>{
 const win=new Window(),queue=new Map();let counter=0;win.requestAnimationFrame=cb=>{queue.set(++counter,cb);return counter;};win.cancelAnimationFrame=id=>queue.delete(id);const advance=time=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(cb=>cb(time));};
 try{const work=presetWork('complete-research-biplot-story'),d=scientificDocument(work.steps[0]),from=work.steps[0].view,to=work.steps[1].view,host=()=>win.document.createElement('div'),a=new ScientificMorphChart(host(),d,{view:from,width:800,height:440,palette:'vermilion',dark:true}),b=new ScientificMorphChart(host(),d,{view:from,width:800,height:440,palette:'vermilion',dark:true});
  const expected=b.setDocument(d,to,{manual:true,effect:'guided',palette:'vermilion',dark:true});expected(.5);const middle=structuredClone([...b.current]);a.seekTransition(from,to,.5);assert.deepEqual([...a.current],middle);a.seekTransition(from,to,1);a.seekTransition(from,to,.5);assert.deepEqual([...a.current],middle);
  a.setView(from,{animate:false});a.setView(to,{duration:1500});advance(0);advance(750);assert.deepEqual([...a.current],middle);assert.equal(a.theme.bg,b.theme.bg);a.setView(from,{animate:false});assert.equal(queue.size,0);for(const m of a.layout.marks)assert.deepEqual(a.current.get(m.key),m.points);a.destroy();b.destroy();
 }finally{await win.happyDOM.close();}
});

test('basic live, canvas seeking and work frames share the same contour clock and compound styling',async()=>{
 const win=new Window(),queue=new Map();let index=0;win.requestAnimationFrame=cb=>{queue.set(++index,cb);return index;};win.cancelAnimationFrame=id=>queue.delete(id);const advance=time=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(cb=>cb(time));};
 try{for(const from of['waffle','donut','columns']){const host=()=>win.document.createElement('div'),a=new MorphChart(host(),morphExample,{view:from,width:800,height:440}),b=new MorphChart(host(),morphExample,{view:from,width:800,height:440}),seek=b.setDocument(morphExample,'bars',{manual:true,effect:'guided'});seek(.5);const expected=structuredClone([...b.current]);a.seekTransition(from,'bars',.5);assert.deepEqual([...a.current],expected);if(from==='waffle')for(const node of a.nodes.values())assert.equal(node.shape.getAttribute('stroke-width'),'0');a.setView(from,{animate:false});a.setView('bars',{duration:1500});advance(0);advance(750);assert.deepEqual([...a.current],expected);advance(1500);a.destroy();b.destroy();}}
 finally{await win.happyDOM.close();}
});

test('explicit arc and turn remain distinct controls on unwrapping rings and compound waffle paths',async()=>{
 const win=new Window();try{for(const view of['waffle','donut']){const frames=[];for(const effect of['smooth','arc','turn']){const chart=new MorphChart(win.document.createElement('div'),morphExample,{view,width:800,height:440}),seek=chart.setDocument(morphExample,'bars',{manual:true,effect});seek(.5);frames.push([...chart.current.values()].flat(2));seek(1);for(const m of chart.layout.marks)assert.deepEqual(chart.current.get(m.key),m.points);chart.destroy();}for(const frame of frames.slice(1))assert.ok(frame.some((v,i)=>Math.abs(v-frames[0][i])>1));}}
 finally{await win.happyDOM.close();}
});

test('palette changes update active manual and live frames without reverting colors or moving geometry',async()=>{
 const win=new Window(),queue=new Map();let counter=0;win.requestAnimationFrame=cb=>{queue.set(++counter,cb);return counter;};win.cancelAnimationFrame=id=>queue.delete(id);const advance=time=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(cb=>cb(time));};
 try{const work=presetWork('complete-research-biplot-story');for(const [Chart,d,from,to]of[[MorphChart,morphExample,'columns','bars'],[ScientificMorphChart,scientificDocument(work.steps[0]),work.steps[0].view,work.steps[1].view]]){
  const host=()=>win.document.createElement('div'),a=new Chart(host(),d,{view:from,width:800,height:440,palette:'ink'}),b=new Chart(host(),d,{view:from,width:800,height:440,palette:'vermilion',dark:true}),seek=a.setDocument(d,to,{manual:true,effect:'guided'}),reference=b.setDocument(d,to,{manual:true,effect:'guided',palette:'vermilion',dark:true});seek(.37);const geometry=structuredClone([...a.current]);a.setPalette('vermilion',true);assert.deepEqual([...a.current],geometry);seek(.6);reference(.6);for(const[id,node]of a.nodes){for(const attr of['fill','stroke'])assert.equal(node.shape.getAttribute(attr),b.nodes.get(id).shape.getAttribute(attr));}
  a.setView(from,{animate:false});a.setView(to,{duration:1500});advance(0);advance(550);a.setPalette('vermilion',true);advance(900);for(const[id,node]of a.nodes)assert.equal(node.shape.getAttribute('fill'),b.nodes.get(id).shape.getAttribute('fill'));a.destroy();b.destroy();
 }}finally{await win.happyDOM.close();}
});

test('paused seeks and gathered shapes retarget from the actual displayed contour without a first-frame jump or stale metadata',async()=>{
 const win=new Window(),queue=new Map();let counter=0;win.requestAnimationFrame=cb=>{queue.set(++counter,cb);return counter;};win.cancelAnimationFrame=id=>queue.delete(id);const advance=time=>{const callbacks=[...queue.values()];queue.clear();callbacks.forEach(cb=>cb(time));};
 const distance=(a,b)=>Math.max(...a.flatMap(([key,p])=>{const other=b.find(([k])=>k===key)[1];return p.map((point,i)=>Math.hypot(point[0]-other[i][0],point[1]-other[i][1]));}));
 try{const chart=new MorphChart(win.document.createElement('div'),morphExample,{view:'waffle',width:800,height:440});chart.seekTransition('waffle','bars',.37);const paused=structuredClone([...chart.current]);chart.setView('waffle',{duration:1500});advance(0);advance(.001);assert.ok(distance([...chart.current],paused)<.001);
  chart.setView('waffle',{animate:false});chart.setView('bars',{effect:'gather',duration:1500});advance(0);advance(750);const gathered=structuredClone([...chart.current]),resume=chart.setDocument(morphExample,'waffle',{manual:true,resume:true});resume(0);assert.deepEqual([...chart.current],gathered);resume(.000001);assert.ok(distance([...chart.current],gathered)<.001);
  chart.seekTransition('donut','bars',.5);chart.setView('columns',{effect:'gather',animate:false});chart.seekTransition('donut','bars',1);assert.equal(chart.view,'bars');assert.equal(chart.layout.view,'bars');assert.equal(chart.svg.dataset.view,'bars');chart.destroy();
 }finally{await win.happyDOM.close();}
});

test('switching from emphasis ink to a categorical theme removes obsolete hatching and restores full category fills',async()=>{
 const win=new Window();try{const host=()=>win.document.createElement('div'),a=new MorphChart(host(),morphExample,{view:'columns',width:800,height:440,palette:'ink'}),b=new MorphChart(host(),morphExample,{view:'bars',width:800,height:440,palette:'mauve'}),seek=a.setDocument(morphExample,'bars',{manual:true,effect:'guided'});seek(.4);a.setPalette('mauve');seek(1);for(const[id,node]of a.nodes){const expected=b.nodes.get(id);for(const attr of['fill','fill-opacity','stroke','stroke-width'])assert.equal(node.shape.getAttribute(attr),expected.shape.getAttribute(attr));assert.equal(node.texture.getAttribute('opacity'),expected.texture.getAttribute('opacity'));}a.destroy();b.destroy();}
 finally{await win.happyDOM.close();}
});

test('recommendations favor nearby readable encodings while every native chart keeps an eligible alternate',()=>{
 const original=newWork([{doc:getExample('pie')}]),snapshot=structuredClone(original);assert.equal(recommendedTransitions(original.steps[0])[0].view,'donut');assert.deepEqual(original,snapshot);
 for(const[id,expected]of[['waffle','stacked'],['groupedbar','grouped-bars'],['area','line'],['mosaic','bubbles']])assert.equal(recommendedTransitions(newWork([{doc:getExample(id)}]).steps[0])[0].view,expected);
 for(const t of catalog){const step=newWork([{doc:getExample(t.id)}]).steps[0],choices=recommendedTransitions(step);assert.ok(choices.length,t.id);for(const c of choices){assert.notEqual(c.view,stepView(step));assert.ok(stepEligibility(step,c.view).valid,t.id);}}
});
