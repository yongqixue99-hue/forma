import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {color as parseColor,interpolateLab} from 'd3';
import {getExample,findTemplate} from '../../src/forma/catalog.js';
import {createEditorModel} from '../../src/forma/editor-model.js';
import {newWork,cleanWork,stepEligibility,stepMorphDocument} from '../../src/forma/work-model.js';
import {ScientificMorphChart} from '../../src/forma/scientific-morph.js';
import {ChartScene} from '../../src/forma/charts.js';
import {workColorMap} from '../../src/forma/work-scene.js';
import {timePlanningOrderFields,timePlanningCompatibility} from '../../src/forma/time-planning-rules.js';
import {valueColorFor} from '../../src/forma/color-semantics.js';
import {semanticChanges,encodingMeaning,frameMeaning} from '../../src/forma/data-semantics.js';
import {timePlanningViews} from '../../src/forma/time-planning-rules.js';
import {qualityViews} from '../../src/forma/quality-series-rules.js';
import {setLocale} from '../../src/forma/locale.js';
const hex=c=>parseColor(c).formatHex();

test('calendar palette and explicit value scale match native rendering, morph marks and exported legends',async()=>{
 const win=new Window(),previous=globalThis.document;globalThis.document=win.document;
 try{
  const original=getExample('calendar'),work=newWork([{doc:original}]),doc=stepMorphDocument(work.steps[0]);
  const valueColors={mode:'sequential',low:'#dce9ed',middle:'#eeeeee',high:'#1d576d',center:0};
  for(const palette of ['ink','vermilion','cobalt'])for(const override of [undefined,valueColors]){
   const options={palette,width:800,height:440,...(override?{valueColors:override}:{})},native=new ChartScene(win.document.createElement('div'),work.steps[0].doc,options),chart=new ScientificMorphChart(win.document.createElement('div'),doc,{...options,view:'planning-calendar'});
   try{
    const maximum=Math.max(0,...original.data.map(r=>r.value??0))||1;
    for(const mark of chart.layout.marks.filter(m=>m.valueDomain&&m.value!==null)){
     const value=mark.colorValue??mark.value,fallback=interpolateLab(chart.theme.soft,chart.theme.color(0))(value/maximum),expected=valueColorFor(options,value,[0,maximum],fallback);
     assert.equal(hex(chart.markColor(mark)),hex(expected));
    }
    const row=original.data.find(r=>r.value!==null),nativeCell=[...native.svg.querySelectorAll('rect[data-tip]')].find(el=>el.getAttribute('data-tip').startsWith(row.date+'\n'));
    assert.ok(nativeCell);assert.equal(hex(nativeCell.getAttribute('fill')),hex(valueColorFor(options,row.value,[0,maximum],interpolateLab(chart.theme.soft,chart.theme.color(0))(row.value/maximum))));
    for(const [i,swatch]of [...chart.svg.querySelectorAll('[data-value-color-swatch]')].entries())assert.equal(hex(swatch.getAttribute('fill')),hex(valueColorFor(options,maximum*i/47,[0,maximum],interpolateLab(chart.theme.soft,chart.theme.color(0))(i/47))));
   }finally{native.destroy();chart.destroy();}
  }
 }finally{globalThis.document=previous;await win.happyDOM.close();}
});

test('planning group renames preserve declared order, record colors, undo and work recovery',()=>{
 for(const template of ['eventline','ledger'])for(const [key,field]of Object.entries(timePlanningOrderFields({template}))){
  const work=newWork([{doc:getExample(template)}]),step=work.steps[0],order=step.doc[key],name=order[0],column=findTemplate(template).fields.findIndex(f=>f[0]===field),indices=step.doc.data.flatMap((r,i)=>r[field]===name?[i]:[]),before=stepMorphDocument(step),colors=[...workColorMap(step,work.steps)];
  const model=createEditorModel(step.doc,undefined,{viewValidation:doc=>stepEligibility({...step,doc})});
  for(const i of indices)model.setCell(i,column,'Renamed group');
  assert.equal(model.report.valid,true,template+JSON.stringify(model.report));assert.deepEqual(model.meta[key],['Renamed group',...order.slice(1)]);
  step.doc=model.doc;const after=stepMorphDocument(step);assert.equal(timePlanningCompatibility({...before,source:after.source},after),'');assert.deepEqual([...workColorMap(step,work.steps)],colors);
  assert.deepEqual(cleanWork(JSON.parse(JSON.stringify(work))).steps[0].doc[key],model.meta[key]);
  model.undo();assert.deepEqual(model.meta[key],order);model.redo();assert.equal(model.report.valid,true);
  for(const value of [null,'bad',[],['missing']]){const bad={...step,doc:{...step.doc,[key]:value}};assert.equal(stepEligibility(bad).valid,false);assert.doesNotThrow(()=>workColorMap(bad,[bad]));}
 }
});

test('new scene meanings remain bilingual and sync review names every changed process parameter',()=>{
 try{
  for(const locale of ['zh-CN','en']){setLocale(locale);for(const v of [...timePlanningViews,...qualityViews]){assert.equal(encodingMeaning(v.id),v.note);if(locale==='en')assert.doesNotMatch(encodingMeaning(v.id),/\p{Script=Han}/u);assert.ok(frameMeaning(v.id,{mode:'morph',progress:.5}).includes(v.note));}}
 }finally{setLocale('zh-CN');}
 for(const [template,fields]of [['cusum',['target','sigma','referenceK','decisionH']],['ewma',['lambda','limitSigma']],['funnelcontrol',['targetRate']],['ledger',['metricOrder']],['spiralheatmap',['cycleLength']]])for(const key of fields){
  const before=getExample(template),after={...before,[key]:key==='metricOrder'?['A','B']:1.23};assert.ok(semanticChanges(before,after).some(c=>c.key===key),key);
 }
});
