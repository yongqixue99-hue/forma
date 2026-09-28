import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {scopedWorkBrief,selectAgentRules} from '../../src/forma/agent-brief.js';
import {getExample} from '../../src/forma/catalog.js';
import {recordId} from '../../src/forma/data-identity.js';
import {layoutEvaluation} from '../../src/forma/analytical-morph.js';
import {scientificDocument,scientificEligibility} from '../../src/forma/scientific-rules.js';
import {makeStep,newWork,presetWork,stepView,stepDomain,transitionPlan,workReport} from '../../src/forma/work-model.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const native=rows=>({...getExample('cumulativegains'),data:rows.map(([actual,score],i)=>({label:`S${i+1}`,model:'M',actual,score}))});
const sample=()=>native([[1,.9],[0,.8],[1,.8],[0,.6],[1,.6],[0,.4],[0,.2],[1,.1]]);
const adapted=doc=>scientificDocument(makeStep({doc}));
const points=layout=>layout.marks.filter(m=>m.role==='threshold-point');
const finite=layout=>{
  assert.ok(layout.marks.every(mark=>mark.points.every(point=>point.every(Number.isFinite))));
  assert.equal(new Set(layout.marks.map(m=>m.key)).size,layout.marks.length);
};

test('gains and cumulative lift preserve complete score ties and the source records',()=>{
  const raw=sample(),before=structuredClone(raw),doc=adapted(raw);
  const gains=layoutEvaluation(doc,'eval-gains'),lift=layoutEvaluation(doc,'eval-lift');
  const expected=[[0,0,null],[1/8,1/4,2],[3/8,2/4,4/3],[5/8,3/4,6/5],[6/8,3/4,1],[7/8,3/4,6/7],[1,1,1]];
  assert.equal(points(gains).length,expected.length);
  expected.forEach(([fraction,gain,lifting],index)=>{
    const g=points(gains)[index],l=points(lift)[index];
    assert.equal(g.key,l.key,'one score threshold keeps its identity across coordinates');
    near(gains.scales.x.invert(g.point[0]),fraction);near(gains.scales.y.invert(g.point[1]),gain);
    near(lift.scales.x.invert(l.point[0]),fraction);
    if(lifting===null){assert.equal(l.opacity,0);assert.equal(l.radius,0);assert.match(l.tooltip,/未定义/);}
    else near(lift.scales.y.invert(l.point[1]),lifting);
    assert.deepEqual(new Set(g.recordIds),new Set(doc.data.map(recordId)));
  });
  const leadingLinks=lift.marks.filter(m=>m.role.startsWith('threshold-run')&&m.index<=1);
  assert.ok(leadingLinks.every(m=>m.opacity===0),'zero screening is not joined to a made-up zero lift');
  assert.deepEqual(raw,before);finite(gains);finite(lift);
  const permuted=structuredClone(doc);permuted.data.reverse();
  assert.deepEqual(points(layoutEvaluation(permuted,'eval-lift')).map(m=>[m.key,m.point]),points(lift).map(m=>[m.key,m.point]));
});

test('constant scores enter as one complete block and retain the lift-one reference',()=>{
  for(const score of [0,.5,1]){
    const d=adapted(native(Array.from({length:8},(_,i)=>[i%2,score]))),layout=layoutEvaluation(d,'eval-lift');
    assert.equal(scientificEligibility(d,'eval-lift').valid,true);assert.equal(points(layout).length,2);
    const visible=points(layout).filter(m=>m.opacity>0);assert.equal(visible.length,1);
    near(layout.scales.x.invert(visible[0].point[0]),1);near(layout.scales.y.invert(visible[0].point[1]),1);
    assert.ok(layout.marks.filter(m=>m.role.startsWith('threshold-run')).every(m=>m.opacity===0));
    const reference=layout.guides.find(g=>g.reference);near(layout.scales.y.invert(reference.y1),1);finite(layout);
  }
});

test('rare positives and shared scales preserve full lift values rather than clipping at one',()=>{
  const raw=native(Array.from({length:300},(_,i)=>[i===0?1:0,(300-i)/300]));
  const work=newWork(['eval-gains','eval-lift','eval-roc','eval-pr'].map(view=>({doc:raw,view,dataGroup:'ranking:rare-positive'})));
  assert.equal(workReport(work).valid,true);const domain=stepDomain(work.steps[0],work.steps);
  assert.deepEqual(domain.lift,[0,300]);
  for(const step of work.steps){assert.deepEqual(stepDomain(step,work.steps),domain);const layout=layoutEvaluation(scientificDocument(step),stepView(step),320,260,{domain});finite(layout);
    if(stepView(step)==='eval-lift'){const first=points(layout)[1];near(layout.scales.y.invert(first.point[1]),300);near(first.point[1],layout.plot.y);}
  }
});

test('ranking adapters and screening preset keep native source documents and corresponding thresholds',()=>{
  for(const [template,expected]of [['cumulativegains','eval-gains'],['liftcurve','eval-lift']]){
    const step=makeStep({doc:getExample(template)});assert.equal(stepView(step),expected);assert.equal(step.doc.template,template);
    assert.equal(scientificEligibility(scientificDocument(step),expected).valid,true);
  }
  const work=presetWork('screening-effectiveness');assert.equal(workReport(work).valid,true);
  assert.deepEqual(work.steps.map(stepView),['eval-roc','eval-pr','eval-gains','eval-lift']);
  const source=work.steps[0].doc;
  for(const step of work.steps){assert.deepEqual(step.doc.data,source.data);for(const other of work.steps){if(other===step)continue;const plan=transitionPlan(step,other,{steps:work.steps});assert.equal(plan.mode,'morph');assert.ok(plan.matched.length>0);}}
});

test('renaming a sample preserves identity but cannot hide a changed actual outcome',()=>{
  const raw=sample(),work=newWork(['eval-gains','eval-lift'].map(view=>({doc:raw,view,dataGroup:'ranking:identity'})));
  for(const row of work.steps[1].doc.data)row.label='renamed:'+row.label;
  assert.equal(workReport(work).valid,true);assert.equal(transitionPlan(...work.steps).mode,'morph','display-only rename is allowed');
  work.steps[1].doc.data[0].actual=0;
  assert.equal(workReport(work).valid,true);assert.equal(recordId(work.steps[1].doc.data[0]),recordId(work.steps[0].doc.data[0]));
  const plan=transitionPlan(...work.steps);assert.equal(plan.mode,'gather','changed truth must be detected through the persistent record ID');assert.match(plan.reason,/真实标签/);
});

test('replaced record IDs and nonoverlapping score thresholds do not invent continuous matches',()=>{
  const raw=sample(),make=()=>newWork(['eval-gains','eval-lift'].map(view=>({doc:raw,view,dataGroup:'ranking:replacement'})));
  const independent=make();independent.steps[1].doc.data.forEach((row,i)=>row._id=`replacement:${i}`);
  assert.equal(transitionPlan(...independent.steps).mode,'gather');
  const shifted=make();shifted.steps[1].doc.data.forEach(row=>row.score+=.001);
  assert.equal(workReport(shifted).valid,true);assert.equal(transitionPlan(...shifted.steps).mode,'gather');
});

test('English screening metadata and new ranking axes are translated',()=>{
  const moduleUrl=name=>new URL(`../../src/forma/${name}`,import.meta.url).href;
  const script=`globalThis.__FORMA_LOCALE__='en';
    const {presetWork}=await import(${JSON.stringify(moduleUrl('work-model.js'))});
    const {scientificDocument}=await import(${JSON.stringify(moduleUrl('scientific-rules.js'))});
    const {layoutEvaluation}=await import(${JSON.stringify(moduleUrl('analytical-morph.js'))});
    const {evaluationViews}=await import(${JSON.stringify(moduleUrl('analytical-rules.js'))});
    const {analyticalPresets}=await import(${JSON.stringify(moduleUrl('analytical-presets.js'))});
    const {uiText}=await import(${JSON.stringify(moduleUrl('locale.js'))});
    const work=presetWork('screening-effectiveness'),preset=analyticalPresets.find(p=>p.id==='screening-effectiveness');
    const texts=[work.name,...['name','description','dataNote','relation'].map(k=>uiText(preset[k]))];
    for(const view of evaluationViews.filter(v=>['eval-gains','eval-lift'].includes(v.id))){const layout=layoutEvaluation(scientificDocument(work.steps[0]),view.id);texts.push(view.name,view.note,layout.heading,layout.details,...layout.labels.map(l=>l.text));}
    console.log(JSON.stringify(texts));`;
  const texts=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{...process.env,NODE_NO_WARNINGS:'1'}}));
  const untranslated=texts.filter(value=>/\p{Script=Han}/u.test(value));assert.deepEqual(untranslated,[]);
});


test('scoped ranking Agent briefs explain gains, lift and the undefined zero-selection endpoint in both languages',()=>{
 const work=presetWork('screening-effectiveness');assert.deepEqual(selectAgentRules(work),['evaluation']);
 for(const english of [false,true]){const brief=scopedWorkBrief(work,english),rules=brief.split('### evaluation\n')[1].split('\n## ')[0];
  for(const token of ['eval-gains','eval-lift','selectedFraction=(TP+FP)/N','gains=TP/P','lift=gains/selectedFraction','selectedFraction=0','_modelId'])assert.ok(rules.includes(token),token);
  assert.match(rules,english?/lift is undefined/:/lift 未定义/);assert.match(rules,english?/hide the origin and its link/:/隐藏起点及.*连线/);assert.match(rules,english?/must not be clipped to \[0,1\]/:/不能压缩或裁剪到 \[0,1\]/);assert.match(rules,english?/supplied original player/:/原版播放器/);
 }
});
