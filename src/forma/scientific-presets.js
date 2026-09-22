import {getExample} from './catalog.js';

export const scientificPresets=[
  {id:'scale-relationship',name:'投入、表现与规模',category:'regular',description:'先比较两个指标，再让同一个点按实际规模展开。位置与对象始终对应。',dataNote:'每行一个对象，填写名称、分组、X、Y 和真实大小指标 size。气泡面积代表 size；轴名称分别写明单位。',relation:'同一组对象 · 坐标与面积',views:['obs-scatter','obs-bubble']},
  {id:'calibration-study',name:'标定与拟合',category:'research',description:'从原始观测到线性趋势，再展开均值响应的置信带。散点始终留在原来的位置。',dataNote:'每行一个独立观测，填写唯一名称、X 和 Y。使用一元 OLS 与 Student t 均值响应区间；先核对线性和独立性等模型假设。',relation:'同一批样本 · 观测与模型',views:['obs-scatter','obs-regression','obs-confidence']},
  {id:'sample-distributions',name:'分布的几种读法',category:'research',description:'原始样本从蜂群转向箱线、小提琴与雨云，让分布细节和统计摘要同时可见。',dataNote:'每行填写分组与一条原始观测。四分位、1.5 × IQR 须线和共用带宽密度由同一批样本计算，全部重复值与离群点保留。',relation:'同一批原始样本 · 分布与摘要',views:['sample-swarm','sample-box','sample-violin','sample-raincloud']},
  {id:'replicate-summary',name:'实验重复与离散',category:'research',description:'从独立实验样本出发，展开均值和标准差，再比较中位数与四分位。',dataNote:'填写唯一的样本名称、实验分组与实际数值。标准差按 n−1 计算；样本量不足的密度图会停用，SD 不解释为置信区间。',relation:'同一批独立重复 · SD 与四分位',views:['sample-swarm','sample-sd','sample-box']},
  {id:'estimate-comparison',name:'估计与不确定性',category:'regular',description:'先读取估计值，再向两端展开输入区间，最后转向纵轴比较。',dataNote:'每行填写对象、estimate、low 和 high，并在区间定义中说明含义。区间来自已有分析，系统只负责绘制，不推算缺少的上下界。',relation:'同一份估计结果 · 线性尺度',views:['estimate-points','estimate-horizontal','estimate-vertical']},
  {id:'ratio-effects',name:'研究效应与区间',category:'research',description:'同一组比值效应在点估计、森林式区间和纵向区间之间转换，始终使用对数尺度。',dataNote:'填写研究名称、比值效应、已计算的上下界及样本量。全部值大于零，参考值为 1；样本量不作权重，也不自动合并效应。',relation:'同一份研究结果 · 对数尺度',views:['estimate-points','estimate-horizontal','estimate-vertical']}
];
export function scientificRecords(id,palette){
  const preset=scientificPresets.find(p=>p.id===id);if(!preset)return null;
  const templates={'scale-relationship':'scatter','calibration-study':'regression','sample-distributions':'raincloud','replicate-summary':'errorbar','estimate-comparison':'interval','ratio-effects':'forest'};
  const doc=getExample(templates[id]);
  const titles={'scale-relationship':'内容投入与表现','calibration-study':'标定数据与模型','sample-distributions':'各组观测分布','replicate-summary':'实验组响应','estimate-comparison':'各项目完成率估计','ratio-effects':'各研究的比值效应'};
  const subtitles={'scale-relationship':'X、Y 为实际指标 · 气泡面积对应阅读量','calibration-study':'同一批独立观测 · 原始数据保持不变','sample-distributions':'原始观测、四分位与密度 · 各组使用共同尺度','replicate-summary':'全部独立样本 · 比较分布与离散程度','estimate-comparison':'点估计与输入区间 · 区间定义保持不变','ratio-effects':'输入的风险比与 95% 置信区间 · 参考值为 1'};
  doc.title=titles[id];doc.subtitle=subtitles[id];doc.source={name:'FORMA 高频场景演示 · 合成数据',type:'demo'};
  return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,options:{palette},scale:'shared'}));
}
