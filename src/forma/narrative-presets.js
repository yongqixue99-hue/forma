import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
import {newAnnotation} from './annotations.js';
import {t10 as t} from './volume10-data.js';
export const narrativePresets=[
 {id:'serial-diagnostics',name:'ACF 与 PACF 共轴诊断',category:'research',description:'同一等间隔序列，先看自相关，再回零切换偏自相关，最后返回核对。',dataNote:'输入原始序列；未调整 ACF 与 Yule–Walker PACF。固定 [-1,1] 系数轴，最大滞后与采集顺序保持一致。',relation:'同一序列 · 两种估计器',views:['serial-acf','serial-pacf','serial-acf']},
 {id:'interval-story',name:'科研结果与区间说明',category:'research',description:'从点估计展开输入区间，转向纵轴，再返回横向结果；标注跟随同一对象与端点。',dataNote:'区间上下界由原表输入，注明区间定义。标注的连接线不另行计算置信区间。',relation:'同一组结果 · 估计与不确定性',views:['estimate-points','estimate-horizontal','estimate-vertical','estimate-horizontal']},
 {id:'distribution-story',name:'竖屏分布讲解',category:'research',description:'原始样本展开四分位与密度，再返回逐点观察；说明跟随被选中的原始样本。',dataNote:'保留每份原始样本，均值和密度均由原始观测计算，不替代样本身份。',relation:'同一批样本 · 分布展开与返回',views:['sample-swarm','sample-box','sample-raincloud','sample-swarm']},
 {id:'matrix-story',name:'指标矩阵汇报',description:'同一组指标原值从热图转为面积比较，再返回热图；说明始终对应同一个单元。',dataNote:'各行列组合提供一个非负原值，圆面积表示数值，零值保留。',relation:'同一原表 · 单元解读',views:['matrix-heatmap','matrix-bubbles','matrix-heatmap']}
];
export function narrativeRecords(id,palette='ink'){
 const preset=narrativePresets.find(p=>p.id===id);if(!preset)return null;
 const template={'serial-diagnostics':'acf','interval-story':'interval','distribution-story':'raincloud','matrix-story':'heatmap'}[id];
 const doc=withRecordIds(getExample(template),{legacyNamespace:`scenario:${id}`});
 doc.title=t(preset.name,{'serial-diagnostics':'ACF and PACF diagnostics','interval-story':'Estimates and uncertainty','distribution-story':'Reading distributions','matrix-story':'Reading the indicator matrix'}[id]);
 const annotation=id==='serial-diagnostics'?null:newAnnotation(doc,{text:t(id==='interval-story'?'关注这项结果及其输入区间':id==='distribution-story'?'同一原始样本随分布展开保留':'同一单元，比较色深与面积',id==='interval-story'?'Follow this estimate and its supplied interval':id==='distribution-story'?'Follow the same original sample':'The same cell: color and area')});
 return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette,...(id==='distribution-story'?{ratio:'story'}:{}),...(annotation?{annotations:[structuredClone(annotation)]}:{})}}));
}
