import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {matchingGuideFrame} from '../../src/forma/guide-continuity.js';
import {presetWork,stepDomain} from '../../src/forma/work-model.js';
import {scientificDocument} from '../../src/forma/scientific-rules.js';
import {ScientificMorphChart,layoutScientific} from '../../src/forma/scientific-morph.js';
test('same coordinate encodings retain reference axes during morph and restore value labels at rest',()=>{
 const win=new Window();try{for(const id of ['matrix-encoding','uncertainty-over-time','time-path']){
  const work=presetWork(id),[a,b]=work.steps,chart=new ScientificMorphChart(win.document.createElement('div'),scientificDocument(a),{view:a.view,width:800,height:440,domain:stepDomain(a,work.steps)}),seek=chart.setDocument(scientificDocument(b),b.view,{manual:true,effect:'guided',domain:stepDomain(b,work.steps)});
  for(const q of [0,.25,.5,.75,1,.25]){seek(q);assert.equal(chart.guideLayer.getAttribute('opacity'),'1',id);for(const label of chart.guideLayer.querySelectorAll('[data-guide-value]'))assert.equal(label.getAttribute('opacity'),q===0||q===1?'1':'0');}
  chart.destroy();
 }}finally{win.happyDOM.close();}
});
test('changed domains, units or matrix ordering do not keep misleading reference axes',()=>{
 const w=presetWork('matrix-encoding'),d=scientificDocument(w.steps[0]),a=layoutScientific(d,'matrix-heatmap'),b=layoutScientific(d,'matrix-bubbles');assert.ok(matchingGuideFrame(a,b));
 const edited=structuredClone(d);edited.data.reverse();assert.equal(matchingGuideFrame(a,layoutScientific(edited,'matrix-bubbles')),false);
 edited.unit='other';assert.equal(matchingGuideFrame(a,layoutScientific(edited,'matrix-bubbles')),false);
 const t=presetWork('uncertainty-over-time'),doc=scientificDocument(t.steps[0]),l=layoutScientific(doc,t.steps[0].view);assert.equal(matchingGuideFrame(l,layoutScientific(doc,t.steps[1].view,800,440,{domain:{time:[Date.parse(doc.data[0].period),Date.parse(doc.data.at(-1).period)],value:[-1,50]}})),false);
 const spatial=presetWork('spatial-projections');assert.equal(matchingGuideFrame(layoutScientific(scientificDocument(spatial.steps[0]),'spatial-3d'),layoutScientific(scientificDocument(spatial.steps[1]),'spatial-xy')),false);
});
test('custom matrix color references leave a separate line below column labels',()=>{
 const win=new Window();try{
  const work=presetWork('matrix-reordering');
  for(const [width,height]of [[1000,520],[600,260],[320,260]])for(const step of work.steps){
   const doc=scientificDocument(step),layout=layoutScientific(doc,step.view,width,height),chart=new ScientificMorphChart(win.document.createElement('div'),doc,{view:step.view,width,height,valueColors:{mode:'diverging',low:'#527b91',middle:'#eeeae2',high:'#c66a51',center:30}});
   chart.render(1);
   const reference=[...chart.guideLayer.querySelectorAll('text')].find(n=>n.textContent.includes('30')&&Number(n.getAttribute('y'))===height-30);
   assert.ok(reference,'reference center must remain visible');
   for(const column of layout.labels.filter(l=>l.fullText&&l.anchor==='middle'))assert.ok(Number(reference.getAttribute('y'))-column.y>=16,`${step.view}: separate reference and column labels`);
   chart.destroy();
  }
 }finally{win.happyDOM.close();}
});
