import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {setLocale} from '../../src/forma/locale.js';
import {countries,resolveCountry,searchCountries} from '../../src/forma/country-input.js';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {presetWork,cleanWork,workReport} from '../../src/forma/work-model.js';
import {holdDuration,advanceTimeline,workTimeline} from '../../src/forma/work-timeline.js';
import {mountWorkPlayer} from '../../src/forma/work-player.js';
import {workVideoPlan} from '../../src/forma/work-video.js';
import growth from '../../src/forma/datasets/gdp-growth.json' with {type:'json'};
import economy from '../../src/forma/datasets/us-inflation-unemployment.json' with {type:'json'};

test('country names and codes resolve across the full map; prefixes require a choice',()=>{
  assert.equal(countries.length,176);
  for(const country of countries){assert.equal(resolveCountry(country.code)?.code,country.code);assert.equal(resolveCountry(country.name)?.code,country.code);}
  for(const [input,code] of [['argentina','ARG'],['AR','ARG'],['阿根廷','ARG'],['uk','GBR'],['South Korea','KOR'],['德国','DEU'],['Côte d’Ivoire','CIV']])assert.equal(resolveCountry(input)?.code,code,input);
  assert.equal(resolveCountry('A'),null);assert.ok(searchCountries('A').length>1);assert.equal(resolveCountry('Atlantis'),null);assert.equal(resolveCountry('SGP'),null);
});
test('country changes preserve values and IDs, update default names, keep custom labels and undo atomically',()=>{
  setLocale('en');const model=createEditorModel(getExample('choropleth')),original=model.doc.data[0];
  model.setCell(0,0,'Argentina');assert.equal(model.doc.data[0].code,'ARG');assert.equal(model.doc.data[0].label,'Argentina');assert.equal(model.doc.data[0].value,original.value);assert.equal(model.doc.data[0]._id,original._id);
  model.undo();assert.deepEqual(model.doc.data[0],original);
  model.setCell(0,1,'My regional team');model.setCell(0,0,'AR');assert.equal(model.doc.data[0].label,'My regional team');
  model.setCell(0,0,'A');assert.equal(model.report.valid,false);assert.ok(model.report.cellErrors.some(e=>e.row===0&&e.col===0));assert.equal(model.doc.data[0].code,'ARG');
  model.undo();assert.equal(model.report.valid,true);setLocale('zh-CN');
});
test('all current English example units and axes are semantic, without Item aliases',()=>{
  setLocale('en');try{for(const chart of catalog){const doc=getExample(chart.id);assert.doesNotMatch(JSON.stringify({unit:doc.unit,axes:doc.axes}),/Item \d|[\u3400-\u9fff]/,chart.id);}}finally{setLocale('zh-CN');}
});
test('four public scenario replacements preserve source values and honest aggregation',()=>{
  for(const id of ['paired-evaluation','matrix-encoding','values-to-ranks','time-path']){const w=presetWork(id);assert.ok(workReport(w).valid,id);assert.deepEqual(cleanWork(w),w);for(const step of w.steps){assert.equal(step.doc.source.type,'public');assert.deepEqual(step.doc.data,w.steps[0].doc.data);}}
  const paired=presetWork('paired-evaluation').steps[0].doc;assert.equal(paired.data.reduce((n,r)=>n+r.before,0),391035);assert.equal(paired.data.reduce((n,r)=>n+r.after,0),416161);assert.equal(paired.data[3].after-paired.data[3].before,-1319);
  const matrix=presetWork('matrix-encoding').steps[0].doc;assert.equal(matrix.data.length,9);assert.equal(matrix.data.reduce((n,r)=>n+r.value,0),344);assert.equal(matrix.data.filter(r=>r.value===0).length,4);
  assert.deepEqual(presetWork('values-to-ranks').steps[0].doc.data.map(r=>r.value),growth.map(r=>r.growth));
  assert.deepEqual(presetWork('time-path').steps[0].doc.data.map(r=>[r.period,r.x,r.y]),economy.map(r=>[`${r.year}-12-31`,r.unemployment,r.inflation]));
});
test('animation preview multipliers cross boundaries without speeding up static holds',()=>{
  const timeline=workTimeline(presetWork('public-revenue'));
  assert.equal(advanceTimeline(timeline,0,1000,2),1800); // 0.8 s animation, then 0.2 s hold
  assert.equal(advanceTimeline(timeline,1600,1200,3),2800);
  assert.equal(advanceTimeline(timeline,3900,200,2),4200); // hold ends, next transition starts
  assert.equal(advanceTimeline(timeline,0,100000,3),timeline.duration);
});
test('editable holds save exact duration for exports and retain unrelated steps and data',()=>{
  const win=new Window(),host=win.document.createElement('div'),original=presetWork('public-revenue');let saved;
  const player=mountWorkPlayer(host,original,{editableTiming:true,onTimingChange:value=>saved=value});
  try{
    player.seek(6500);const buttons=host.querySelectorAll('[data-wp-hold]');buttons[1].dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowLeft',shiftKey:true,bubbles:true}));
    assert.equal(saved.steps[1].hold,1400);assert.equal(host.querySelector('[data-wp-position]').textContent,'02 / 03');assert.match(host.querySelector('[data-wp-seek]').getAttribute('aria-valuetext'),/2/);assert.ok(host.querySelector('.wp-scrubber [data-wp-hold]'));assert.equal(host.querySelector('.wp-hold-editor'),null);assert.equal(original.steps[1].hold,2400);assert.equal(player.duration,11000);assert.deepEqual(saved.steps.map(s=>s.doc),original.steps.map(s=>s.doc));
    assert.equal(workTimeline(cleanWork(saved)).duration,11000);assert.equal(workVideoPlan(saved).duration,11);
    assert.deepEqual([...host.querySelector('[data-wp-rate]').options].map(o=>o.value),['0.5','1','2','3']);
    buttons[1].dispatchEvent(new win.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(saved.steps[1].hold,500);
    buttons[1].dispatchEvent(new win.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(saved.steps[1].hold,12000);
    assert.equal(holdDuration(-400),500);assert.equal(holdDuration(1249),1200);assert.throws(()=>holdDuration(NaN));
  }finally{player.destroy();win.happyDOM.close();}
});
