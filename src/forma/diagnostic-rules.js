import {uiText,uiMarkup,uiMessage} from './locale.js';
import {extent,mean} from 'd3';
import {blandAltman} from './volume8-data.js';

export const methodViews=[
  {id:'method-scatter',name:uiText('方法测量散点'),en:'Method comparison',note:uiText('同一样本的两种测量分别放在横纵轴，与相等线比较。适合仪器、检测方法和量表的成对测量；相关强不等于一致性好。')},
  {id:'method-bland',name:uiText('方法一致性图'),en:'Bland–Altman agreement',note:uiText('每个样本移到两次测量的均值与差值坐标，展开平均偏倚及 ±1.96 个样本标准差的一致性界限。差值固定为 A−B。')},
  {id:'method-delta',name:uiText('测量差值排序'),en:'Ranked method differences',note:uiText('按差值绝对值排列同一批样本，横向比较 A−B 的方向与大小。保留正负号，最多 40 对，不自动移除离群样本。')},
  {id:'method-pairs',name:uiText('配对方法哑铃'),en:'Paired measurements',note:uiText('每行展开一个样本的 A、B 测量值，连线表示配对关系。适合逐个复核差异，最多 20 对，共用同一数值轴。')}
];
export const predictionViews=[
  {id:'prediction-scatter',name:uiText('观测与预测'),en:'Observed versus predicted',note:uiText('横轴为输入的预测值，纵轴为实际观测值；相等线帮助比较偏离程度。适合回归模型和业务预测的结果核对，不重新拟合模型。')},
  {id:'prediction-residual',name:uiText('残差诊断图'),en:'Residual diagnostics',note:uiText('保留每条记录的预测值，把纵轴换为观测值减预测值。围绕零线观察偏差与误差随预测水平的变化。')},
  {id:'prediction-absolute',name:uiText('绝对误差图'),en:'Absolute prediction errors',note:uiText('同一条记录的误差向正半轴展开，纵轴为 |观测值−预测值|。适合比较误差大小；方向信息仍保留在原始数据和提示中。')},
  {id:'prediction-ranked',name:uiText('样本误差排序'),en:'Ranked prediction errors',note:uiText('按绝对误差从大到小排列原始记录，横轴保留误差正负号。适合逐条检查偏差，最多 40 个样本。')}
];
export const confusionViews=[
  {id:'confusion-counts',name:uiText('计数混淆矩阵'),en:'Confusion counts',note:uiText('行是真实类别，列是预测类别；每格显示对应样本数。适合分类模型、识别系统和人工标注的一致结果检查。')},
  {id:'confusion-bubbles',name:uiText('混淆气泡矩阵'),en:'Confusion bubbles',note:uiText('每个计数格展开成圆，面积与样本数成正比。行列含义保持不变，零计数不画气泡，全部计数仍可读取。')},
  {id:'confusion-rows',name:uiText('真实类别构成'),en:'Within actual classes',note:uiText('同一真实类别的计数格排成一根百分比条，分母是该真实类别的总样本数。观察每个真实类别被预测到哪里。')},
  {id:'confusion-columns',name:uiText('预测类别构成'),en:'Within predicted classes',note:uiText('按预测类别重新归组，每根百分比条显示其真实来源，分母是该预测类别的样本数。没有预测样本时保留空位。')}
];
export const diagnosticViews=[...methodViews,...predictionViews,...confusionViews];
const families=new Map([...methodViews.map(v=>[v.id,'method']),...predictionViews.map(v=>[v.id,'prediction']),...confusionViews.map(v=>[v.id,'confusion'])]);
export const diagnosticFamily=view=>families.get(view);
export const isDiagnosticView=view=>families.has(view);
export const diagnosticViewMap={blandaltman:'method-bland',residual:'prediction-residual',confusion:'confusion-counts'};
const key=(...args)=>JSON.stringify(args),unique=items=>[...new Set(items)],finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e15;
export function diagnosticDocument(doc,common){
  return {...common,...(doc.methodLabels?{methodLabels:[...doc.methodLabels]}:{}),data:doc.data.map((r,row)=>({...r,row,label:doc.template==='confusion'?key(r.actual,r.predicted):r.label,group:common.family==='confusion'?r.actual:uiText('样本')}))};
}
export function predictionStatistics(rows){
  const points=rows.map(r=>({...r,error:r.observed-r.predicted,absolute:Math.abs(r.observed-r.predicted)}));
  return {points,mae:mean(points,r=>r.absolute),rmse:Math.sqrt(mean(points,r=>r.error*r.error)),bias:mean(points,r=>r.error)};
}
export function confusionStatistics(rows){
  const categories=unique(rows.map(r=>r.actual)),actual=new Map(categories.map(c=>[c,0])),predicted=new Map(categories.map(c=>[c,0]));
  for(const r of rows){actual.set(r.actual,actual.get(r.actual)+r.count);predicted.set(r.predicted,predicted.get(r.predicted)+r.count);}
  const total=rows.reduce((sum,r)=>sum+r.count,0),correct=rows.filter(r=>r.actual===r.predicted).reduce((sum,r)=>sum+r.count,0);
  return {categories,actual,predicted,total,correct,accuracy:total?correct/total:null,cells:rows.map(r=>({...r,rowShare:actual.get(r.actual)?r.count/actual.get(r.actual):null,columnShare:predicted.get(r.predicted)?r.count/predicted.get(r.predicted):null}))};
}
export function diagnosticEligibility(doc,view){
  const family=diagnosticFamily(view),rows=doc?.data,bad=reason=>({valid:false,reason});
  if(!family||doc?.family!==family||!rows?.length)return bad(uiText('请选择对应的测量、预测或分类计数数据。'));
  if(family==='method'){
    if(rows.length<6||rows.length>200||rows.some(r=>!finite(r.a)||!finite(r.b))||doc.methodLabels?.length!==2||doc.methodLabels.some(s=>typeof s!=='string'||!s.trim())||doc.methodLabels[0]===doc.methodLabels[1])return bad(uiText('需要 6–200 个样本的两次同单位测量，并填写两个不同的方法名称。'));
    if(view==='method-pairs'&&rows.length>20)return bad(uiText('哑铃图适合最多 20 对；可用散点或一致性图保留全部样本。'));
    if(view==='method-delta'&&rows.length>40)return bad(uiText('逐项差值排序最多 40 对；请用一致性图查看完整数据。'));
  }else if(family==='prediction'){
    if(rows.length<8||rows.length>300||rows.some(r=>!finite(r.observed)||!finite(r.predicted)))return bad(uiText('需要 8–300 个唯一编号的观测值和预测值，两列使用同一单位。'));
    if(view==='prediction-ranked'&&rows.length>40)return bad(uiText('逐项排序最多 40 个样本；残差和误差散点可保留全部记录。'));
  }else{
    const names=unique(rows.map(r=>r.actual)),pred=unique(rows.map(r=>r.predicted));
    if(names.length<2||names.length>6||pred.length!==names.length||pred.some(c=>!names.includes(c))||rows.length!==names.length**2||rows.some(r=>typeof r.actual!=='string'||!r.actual.trim()||typeof r.predicted!=='string'||!r.predicted.trim()||!Number.isSafeInteger(r.count)||r.count<0)||new Set(rows.map(r=>key(r.actual,r.predicted))).size!==rows.length)return bad(uiText('填写 2–6 个类别的完整方阵，每个真实×预测组合一行，计数为非负安全整数，零计数也保留。'));
    const stats=confusionStatistics(rows);if(!Number.isSafeInteger(stats.total)||[...stats.actual.values()].some(n=>n<=0))return bad(uiText('每个真实类别至少有一个样本，合计须在安全整数范围内。'));
  }
  return {valid:true,reason:''};
}
export function diagnosticCompatibility(a,b){
  if(a.family==='method'&&JSON.stringify(a.methodLabels)!==JSON.stringify(b.methodLabels))return uiText('测量方法名称或差值方向不同');
  if(a.family==='confusion'&&JSON.stringify(unique(a.data.map(r=>r.actual)).sort())!==JSON.stringify(unique(b.data.map(r=>r.actual)).sort()))return uiText('分类类别不同，请保留各自的类别定义');
  return '';
}
export function diagnosticBounds(doc){
  if(doc.family==='method'){const s=blandAltman(doc.data);return {measurement:extent(doc.data.flatMap(r=>[r.a,r.b])),error:extent([0,s.lower,s.upper,...s.points.map(r=>r.difference)])};}
  if(doc.family==='prediction'){const s=predictionStatistics(doc.data);return {measurement:extent(doc.data.flatMap(r=>[r.observed,r.predicted])),error:extent([0,...s.points.map(r=>r.error)]),absolute:[0,Math.max(...s.points.map(r=>r.absolute))]};}
  return {count:[0,Math.max(...doc.data.map(r=>r.count))]};
}
export function diagnosticRecipe(from,to){
  const family=diagnosticFamily(to);
  if(from===to)return {id:'diagnostic-update',name:uiText('对应记录更新'),description:uiText('同一条记录或计数格保持身份，按实际新值移动。')};
  if(family==='method')return {id:'method-coordinates',name:uiText('配对测量转向'),description:uiText('每对测量保留样本编号，在原值、均值与差值之间移动；偏倚与一致性界限单独展开。')};
  if(family==='prediction')return {id:'prediction-errors',name:uiText('观测与误差迁移'),description:uiText('保留样本身份，预测坐标转为残差或绝对误差，再按偏差排列；不重新拟合模型。')};
  return {id:'confusion-reassembly',name:uiText('计数格重组'),description:uiText('同一真实×预测计数格展开为气泡或按类别归组。分母改变时先收拢，再按新占比展开，原始计数始终保留。')};
}
export function diagnosticGuide(doc,view){
  const intro=diagnosticViews.find(v=>v.id===view)?.note||'',family=diagnosticFamily(view);
  return [intro,family==='method'?uiText('每行填写同一样本的唯一编号、方法 A 测量和方法 B 测量，保持单位一致。差值采用 A−B，偏倚是差值均值，一致性界限采用偏倚 ±1.96×样本标准差。这些界限不是均值的置信区间，也不自动给出“可接受”的结论。'):'prediction'===family?uiText('每行填写样本编号、真实观测和模型已经生成的预测值。残差固定为观测值−预测值；MAE 为绝对误差均值，RMSE 为误差平方均值的平方根。图表只诊断提供的结果，不训练或替换模型。'):uiText('每行填写真实类别、预测类别和样本数，保留全部类别组合，包括零计数。矩阵行是真实类别、列是预测类别；真实类别构成按行总量归一化，预测类别构成按列总量归一化。空的预测类别显示“无预测样本”，不伪造百分比。'),family==='method'?uiText('使用一致性界限时，需要结合差值的分布、独立性和随测量水平变化的离散程度判断；重复测量设计需另外分析。改变方法顺序也改变差值方向，不会强行连续对应。'):'prediction'===family?uiText('用于科研时，说明数据来自训练集、验证集还是独立测试集。误差与原始测量使用相同单位；零值真实保留，缺失值不能填成 0。排序图会保留所有适用样本，超过 40 条请使用散点视图。'):uiText('适合核对错分去向与各预测结果的来源。构成比例受真实类别数量影响，不能单凭准确率评价不平衡分类；本图不从汇总计数推断 ROC、概率校准或统计显著性。')];
}
