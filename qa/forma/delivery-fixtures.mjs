import {presetWork,newWork,cleanWork} from '../../src/forma/work-model.js';
import {getExample} from '../../src/forma/catalog.js';
export function deliveryWorks(){
  const cases={basic:presetWork('essential'),tiny:presetWork('essential'),samples:presetWork('sample-distributions'),series:presetWork('series-revenue'),paired:presetWork('paired-evaluation'),hierarchy:presetWork('research-budget'),native:newWork([{doc:getExample('kpi')},{doc:getExample('bars3d')}])};
  for(const [id,w] of Object.entries(cases)){
    w.id=`delivery-${id}`;w.name=`交付验收 · ${id}`;w.steps=w.steps.slice(0,3);w.activeStep=w.steps[0].id;
    for(const s of w.steps){s.duration=800;s.hold=600;s.doc.source={type:'demo',name:'FORMA 交付验收 · 确定性合成数据'};}
    cases[id]=cleanWork(w);
  }
  for(const s of cases.tiny.steps){s.doc.title='微量测量：非零小数与真实零值';s.doc.subtitle='6 条原始观测 · 数量编码与比例编码';s.doc.unit='mg/L';s.doc.data.forEach((r,i)=>{r.label=`样本 ${String(i+1).padStart(4,'0')}`;r.value=i===0?0:(i+1)*1.23e-8;r._extra={备注:`原始记录 ${i+1}`};});}
  return cases;
}
