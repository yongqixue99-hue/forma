import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {presetWork,transitionPlan} from '../../src/forma/work-model.js';
import {WorkFrameRenderer} from '../../src/forma/work-frame.js';
import {layoutScientific} from '../../src/forma/scientific-morph.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';

test('ROC and PR interruption into threshold keeps thresholds spread, keyed and correctly ordered',()=>{
 const win=new Window(),previous={window:globalThis.window,document:globalThis.document};Object.assign(globalThis,{window:win,document:win.document});
 const work=presetWork('classifier-comparison'),[roc,pr,threshold]=work.steps;
 try{
  for(const [a,b] of [[roc,pr],[pr,roc]])for(const partial of [.25,.5,.75]){
   const renderer=new WorkFrameRenderer(win.document.createElement('div'),work.steps,{width:900,height:460});
   try{
    renderer.render({index:1,from:a,step:b,plan:transitionPlan(a,b,{steps:work.steps}),progress:partial});
    const points=structuredClone([...renderer.scene.current]),nodes=new Map([...renderer.scene.nodes].map(([k,n])=>[k,n.shape]));
    const f={index:2,from:b,step:threshold,plan:transitionPlan(b,threshold,{steps:work.steps}),retarget:true};
    renderer.render({...f,progress:0});for(const [key,value] of points)assert.deepEqual(renderer.scene.current.get(key),value,key);
    for(const p of [.25,.5,.75,1,.5]){
     renderer.render({...f,progress:p});
     const xs=renderer.scene.layout.marks.filter(m=>m.role==='threshold-point').map(m=>renderer.scene.current.get(m.key)).map(ps=>ps.reduce((s,p)=>s+p[0]/ps.length,0));
     assert.ok(Math.max(...xs)-Math.min(...xs)>renderer.scene.layout.plot.w*.25,`${a.view} via ${b.view} at ${partial}/${p} collapsed into a vertical bundle`);
     for(const [key,node] of nodes)if(renderer.scene.nodes.has(key))assert.equal(renderer.scene.nodes.get(key).shape,node);
    }
   }finally{renderer.destroy();}
  }
  const layout=layoutScientific(scientificDocument(threshold),threshold.view,900,460);
  assert.ok(layout.scales.x(.9)<layout.scales.x(.1));assert.match(layout.labels.map(l=>l.text).join(' '),/高.*低/);
 }finally{Object.assign(globalThis,previous);win.happyDOM.close();}
});
