import {getExample} from './catalog.js';

export const diagnosticPresets=[
  {id:'method-agreement',name:'检测方法一致性',category:'research',description:'同一样本从双方法散点移到均值与差值，再展开差值排序和逐对测量。',dataNote:'每行填写唯一编号及两次同单位测量。方法 A−B 的方向固定，一致性界限不是置信区间。',relation:'同一样本 · 两种测量方法',views:['method-scatter','method-bland','method-delta','method-pairs']},
  {id:'measurement-review',name:'测量偏差排查',category:'regular',description:'先检查每对测量，按差值定位偏差较大的记录，再回到整体测量范围。',dataNote:'提供两台设备对同一对象的读数和各自名称，保留原始值，不把不同对象硬配成一对。',relation:'同一批对象 · 测量与差值',views:['method-pairs','method-delta','method-bland','method-scatter']},
  {id:'prediction-diagnostics',name:'预测值与误差',category:'research',description:'实际值与预测值移到残差坐标，再比较绝对误差和样本排序。',dataNote:'输入已完成预测的结果，残差为观测减预测；同一编号始终对应同一样本，不重新拟合模型。',relation:'同一组预测 · 原值与误差',views:['prediction-scatter','prediction-residual','prediction-absolute','prediction-ranked']},
  {id:'forecast-review',name:'需求预测复盘',category:'regular',description:'从误差大小找到偏离较大的日期，再看高估、低估方向与预测值的关系。',dataNote:'每行填写日期编号、真实需求与事先预测，单位一致；不使用后来修订的预测替换原始记录。',relation:'同一批预测记录 · 逐条核对',views:['prediction-absolute','prediction-ranked','prediction-residual','prediction-scatter']},
  {id:'classification-diagnostics',name:'分类结果诊断',category:'research',description:'计数矩阵展开为气泡，再按真实和预测类别重组，查看两种分母下的错分构成。',dataNote:'填写完整的真实×预测类别计数，零也保留。每次重组显示分母，无预测样本的类别保持为空。',relation:'同一计数方阵 · 真实与预测',views:['confusion-counts','confusion-bubbles','confusion-rows','confusion-columns']},
  {id:'recognition-review',name:'识别结果与构成',category:'regular',description:'先看各预测结果来自哪里，再回到完整矩阵核对计数与错分去向。',dataNote:'适合识别结果复核和人工标注检查。类别名称在行列中一致，计数不转换成概率评分。',relation:'同一批分类结果 · 计数格重组',views:['confusion-columns','confusion-counts','confusion-rows','confusion-bubbles']}
];
export function diagnosticRecords(id,palette='ink'){
  const preset=diagnosticPresets.find(p=>p.id===id);if(!preset)return null;let doc;
  if(['method-agreement','measurement-review'].includes(id)){
    const device=id==='measurement-review';
    doc={...getExample('blandaltman'),title:device?'双设备测量复核':'两种检测方法的一致性',subtitle:'16 个配对样本 · 差值 A−B',unit:device?'mm':'mg/L',methodLabels:device?['设备 A','设备 B']:['方法 A','方法 B'],data:Array.from({length:16},(_,i)=>{const a=Math.round((20+i*3.1+Math.sin(i)*1.8)*(device?2:1)*100)/100,b=Math.round((a+(device?0.4:-1.4)+(Math.sin(i*2.37)*3.7+Math.cos(i*.6)*1.2)*(device?0.45:1))*100)/100;return {label:`S${String(i+1).padStart(2,'0')}`,a,b};})};
  }else if(['prediction-diagnostics','forecast-review'].includes(id)){
    const forecast=id==='forecast-review';
    doc={...getExample('residual'),title:forecast?'每日需求预测复盘':'预测值与观测误差',subtitle:'24 条完整记录 · 残差 = 观测−预测',unit:forecast?'单':'mg/L',data:Array.from({length:24},(_,i)=>{const predicted=Math.round((forecast?120+i*5.2:15+i*1.2)*100)/100,observed=Math.round((predicted+(Math.sin(i*2.21)*3.2+Math.cos(i*.42)*1.6+(i===17?5:0))*(forecast?3:1))*100)/100;return {label:forecast?`09.${String(i+1).padStart(2,'0')}`:`S${String(i+1).padStart(2,'0')}`,observed,predicted};})};
  }else{
    doc={...getExample('confusion'),title:id==='classification-diagnostics'?'四类别分类结果':'识别结果的来源与去向',subtitle:'真实类别 × 预测类别 · 所有步骤保留原始计数'};
    const labels=id==='recognition-review'?['发票','合同','表单','其他']:['A 类','B 类','C 类','D 类'];
    const counts=id==='recognition-review'?[[92,5,2,1],[9,78,6,7],[2,8,83,7],[4,10,9,77]]:[[86,12,3,4],[7,63,19,6],[2,8,41,9],[5,3,6,28]];
    doc.data=labels.flatMap((actual,i)=>labels.map((predicted,j)=>({actual,predicted,count:counts[i][j]})));
  }
  doc.source={name:'FORMA 诊断场景演示 · 确定性合成数据',type:'demo'};
  return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,options:{palette},scale:'shared',duration:1800,hold:2400}));
}
