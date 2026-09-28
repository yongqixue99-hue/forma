import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
import {distributionText as t} from './distribution-rules.js';

export const distributionPresets=[
 {id:'distribution-tail-story',get name(){return t('原始点、长尾与半眼','Observations, tails and half-eyes');},category:'research',get description(){return t('Sina 原始点收为嵌套尾部分位箱，再转向半眼密度与中央区间；每个样本持续保留。','Sina observations unfold into nested tail-quantile boxes, then turn into half-eye densities and central intervals. Every observation remains visible.');},get dataNote(){return t('同一份 label/group/value 原始样本，共用带宽与数值轴；箱宽表示分位深度，区间不是均值置信区间。','One label/group/value sample table, sharing bandwidth and value domain. Box width encodes quantile depth; intervals are not confidence intervals for a mean.');},get relation(){return t('同一批原样本 · 分布展开','Same observations · distribution unfolding');},views:['distribution-sina','distribution-boxen','distribution-halfeye']},
 {id:'distribution-probability-story',get name(){return t('从样本到概率点阵','From observations to probability dots');},category:'research',get description(){return t('单组原样本在密度抖动、尾部分位箱、半眼与等概率分位点阵之间连续展开，原值始终在场。','One population continuously unfolds through Sina, tail-quantile boxes, half-eye and equal-mass quantile dots, retaining all raw observations.');},get dataNote(){return t('单组实际样本；每个分位摘要点表示 2% 概率，独立于原样本身份。全部原始点另行保留。','One population of original measurements. Each quantile summary dot represents 2% probability with a separate identity; all original points remain visible.');},get relation(){return t('同一组原样本 · 原值与概率','Same population · values and probability');},views:['distribution-sina','distribution-boxen','distribution-halfeye','distribution-quantiledot']}
];
export function distributionRecords(id,palette='ink'){
 const preset=distributionPresets.find(p=>p.id===id);if(!preset)return null;
 const doc=getExample('sina');
 if(id==='distribution-probability-story'){const group=doc.data[0].group;doc.data=doc.data.filter(r=>r.group===group);}
 doc.source={get name(){return t('FORMA 场景演示 · 合成数据','FORMA scenario · synthetic data');},type:'demo'};
 // Persist identity once before making related copies. A label edit must not
 // produce a new point or change its deterministic density-jitter offset.
 const identified=withRecordIds(doc,{legacyNamespace:`scenario:${id}`});
 return preset.views.map(view=>({doc:structuredClone(identified),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}}));
}
