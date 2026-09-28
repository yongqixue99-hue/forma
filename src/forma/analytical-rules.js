import {uiText,uiMarkup,uiMessage} from './locale.js';
import {recordId} from './data-identity.js';
import {entityKey,withEntityIds} from './entity-identity.js';
import {extent} from 'd3';
import {findTemplate} from './catalog.js';

export const univariateViews=[
  {id:'uni-histogram',name:uiText('频数直方图'),en:'Histogram',note:uiText('把原始连续观测放入等宽区间，用柱高比较频数。适合时长、测量值和质量检测的分布探索。')},
  {id:'uni-frequency',name:uiText('频数折线图'),en:'Frequency polygon',note:uiText('同一套分箱的柱体收为箱中心的频数点，再连接相邻区间。点表示整箱计数，不是某个原始样本。')},
  {id:'uni-cumulative',name:uiText('累计频率柱图'),en:'Cumulative bins',note:uiText('按箱上界累计样本占比，展示分段累计分布。纵轴是比例；最后一箱为 100%，与单箱频数不同。')},
  {id:'uni-ecdf',name:uiText('经验累积分布'),en:'Empirical distribution',note:uiText('每个台阶表示不超过当前数值的样本占比，直接使用原始观测。同值样本共同跳升，不依赖直方图的分箱。')}
];
export const evaluationViews=[
  {id:'eval-ks',name:uiText('预测分布 KS 图'),en:'Score KS diagnostic',note:uiText('同一得分阈值展开为真实 0/1 类别的右连续经验累积分布，包含全部同分样本。最大竖直距离 D 只表示分离程度，不表示准确率或显著性。')},
  {id:'eval-gains',name:uiText('累计增益曲线'),en:'Cumulative gains',note:uiText('同一模型的得分阈值保持对应，横轴是已筛选样本占比，纵轴是已覆盖正类占比。同分样本一起进入，不拆开并列分数。')},
  {id:'eval-lift',name:uiText('提升曲线'),en:'Cumulative lift',note:uiText('同一阈值点由累计增益转为提升倍数：正类覆盖比例除以筛选比例。未筛选样本时提升未定义，不填成零；基准为随机筛选的 1 倍。')},
  {id:'eval-roc',name:uiText('ROC 阈值曲线'),en:'ROC by threshold',note:uiText('按同一得分阈值计算假阳性率和真阳性率。同分样本一起进入预测正类，适合比较二分类模型的判别能力。')},
  {id:'eval-pr',name:uiText('精确率与召回率'),en:'Precision–recall',note:uiText('把同一阈值点移到召回率与精确率坐标。适合关注少数正类和检索结果；基准线为这批样本的正类比例。')},
  {id:'eval-threshold',name:uiText('阈值与检出率'),en:'Threshold response',note:uiText('把阈值展开到横轴，同时读取真阳性率和假阳性率。实线为真阳性率，浅线为空心点的假阳性率，不自动替你选择最佳阈值。')},
  {id:'eval-calibration',name:uiText('概率校准曲线'),en:'Probability calibration',note:uiText('按预测概率等宽分箱，比较箱内平均概率与实际正类比例。它衡量概率可靠性；需要明确为概率的数据，空箱保留断点。')}
];
export const correlationViews=[
  {id:'corr-heatmap',name:uiText('相关系数热图'),en:'Correlation heatmap',note:uiText('从完整原始样本计算 Pearson 相关系数。固定 −1 到 +1 的色标表达方向和强度，适合多指标关系探索。')},
  {id:'corr-triangle',name:uiText('下三角相关图'),en:'Lower-triangle matrix',note:uiText('收起对称的重复关系，保留下三角与变量名称。同一对变量保持对应，减少重复阅读。')},
  {id:'corr-bubbles',name:uiText('气泡相关矩阵'),en:'Bubble correlogram',note:uiText('把相关方格展开为圆，圆面积与相关系数绝对值成正比，颜色表示正负方向。变量顺序与计算口径保持不变。')},
  {id:'corr-pairs',name:uiText('变量对相关排序'),en:'Ranked correlations',note:uiText('每对变量保留一次，按相关系数绝对值排列，用共同的 −1 到 +1 横轴比较。常量变量的未定义结果保留为空位。')}
];
export const analyticalViews=[...univariateViews,...evaluationViews,...correlationViews];
const families=new Map([...univariateViews.map(v=>[v.id,'univariate']),...evaluationViews.map(v=>[v.id,'evaluation']),...correlationViews.map(v=>[v.id,'correlation'])]);
export const analyticalFamily=view=>families.get(view);
export const isAnalyticalView=view=>families.has(view);
export const analyticalViewMap={ksplot:'eval-ks',histogram:'uni-histogram',ecdf:'uni-ecdf',roc:'eval-roc',precisionrecall:'eval-pr',calibration:'eval-calibration',cumulativegains:'eval-gains',liftcurve:'eval-lift',correlation:'corr-heatmap'};
const key=(...parts)=>JSON.stringify(parts),unique=xs=>[...new Set(xs)],text=s=>typeof s==='string'&&!!s.trim(),finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e15;

// The native schema remains the saved/editable document. These identities only
// serve the renderer, so repeated model labels and long-form samples stay intact.
export function analyticalDocument(doc,common){
  const family=analyticalFamily(analyticalViewMap[doc.template]);
  if(['evaluation','correlation'].includes(family)){doc=withEntityIds(doc,{legacyNamespace:'unmigrated-render'});common={...common,entities:doc.entities};}
  if(family==='univariate')return {...common,family,binCount:doc.binCount??12,data:doc.data.map((r,row)=>({...r,row,group:uiText('分布')}))};
  if(family==='evaluation')return {...common,family,positiveLabel:doc.positiveLabel,probability:doc.template==='calibration'||doc.scoreKind==='probability',bins:doc.bins??6,
    data:doc.data.map((r,row)=>({...r,row,sample:r.label,label:key(r.model,r.label),group:r.model}))};
  if(family==='correlation')return {...common,family,data:doc.data.map((r,row)=>({...r,row,label:key(r.sample,r.variable),group:uiText('相关系数')}))};
  return null;
}
export function analyticalEligibility(doc,view){
  const bad=reason=>({valid:false,reason}),family=analyticalFamily(view),rows=doc?.data;
  if(!family||doc?.family!==family||!rows?.length)return bad(uiText('请选择该图型需要的原始记录。'));
  if(family==='univariate'){
    if(rows.length<16||rows.length>600||rows.some(r=>!finite(r.value)))return bad(uiText('需要 16–600 个有唯一编号的原始连续观测。'));
    if(!Number.isInteger(doc.binCount)||doc.binCount<6||doc.binCount>24)return bad(uiText('分箱数须为 6–24 的整数。'));
  }else if(family==='evaluation'){
    const models=unique(rows.map(r=>entityKey(r,'model'))),first=rows.filter(r=>entityKey(r,'model')===models[0]),truth=new Map(first.map(r=>[r.sample,r.actual]));
    if(!text(doc.positiveLabel)||models.length>3||rows.some(r=>!text(r.model)||!text(r.sample)||![0,1].includes(r.actual)||!finite(r.score)))return bad(uiText('填写样本编号、模型、真实标签 0/1、有限得分，以及正类的含义。'));
    if(models.some(m=>{const own=rows.filter(r=>entityKey(r,'model')===m);return own.length<8||own.length>300||own.length!==first.length||new Set(own.map(r=>r.actual)).size!==2||own.some(r=>truth.get(r.sample)!==r.actual);}))return bad(uiText('每模型需要 8–300 个相同的测试样本与一致标签，并同时包含正负类。'));
    if(view==='eval-calibration'&&(!doc.probability||rows.some(r=>r.score<0||r.score>1)))return bad(uiText('校准视图需要明确的 0–1 预测概率。请从「校准曲线」模板填写；普通得分不能自动解释为概率。'));
    if(!Number.isInteger(doc.bins)||doc.bins<3||doc.bins>12)return bad(uiText('概率分箱数须为 3–12 的整数。'));
  }else{
    const variables=unique(rows.map(r=>r.variable)),samples=unique(rows.map(r=>r.sample));
    if(variables.length<3||variables.length>6||samples.length<8||samples.length>120||rows.length!==variables.length*samples.length||rows.some(r=>!text(r.variable)||!text(r.sample)||!finite(r.value))||new Set(rows.map(r=>key(r.sample,r.variable))).size!==rows.length)return bad(uiText('需要 3–6 个变量 × 8–120 个完整样本；每个样本填写所有变量，缺失值不补零。'));
  }
  return {valid:true,reason:''};
}
export function analyticalCompatibility(a,b){
  if(a.family==='univariate'&&a.binCount!==b.binCount)return uiText('分箱数不同，重新建立区间');
  if(a.family==='evaluation'){
    if(a.positiveLabel!==b.positiveLabel||a.probability!==b.probability)return uiText('正类或得分的含义不同');
    if(a.bins!==b.bins)return uiText('概率分箱边界不同');
    const truth=new Map(a.data.map(r=>[recordId(r),r.actual]));
    if(b.data.some(r=>truth.has(recordId(r))&&truth.get(recordId(r))!==r.actual))return uiText('同一样本的真实标签不同');
  }
  if(a.family==='correlation'&&JSON.stringify(unique(a.data.map(r=>entityKey(r,'variable'))).sort())!==JSON.stringify(unique(b.data.map(r=>entityKey(r,'variable'))).sort()))return uiText('变量身份集合不同，重新建立矩阵');
  return '';
}
export function analyticalCorrespondence(a,b,from,to){
  if(a.family!=='evaluation')return null;
  const samples=new Map(a.data.map(r=>[recordId(r),entityKey(r,'model')])),shared=b.data.filter(r=>samples.get(recordId(r))===entityKey(r,'model'));
  if([from,to].includes('eval-calibration'))return {keys:unique(shared.map(r=>entityKey(r,'model'))),noun:uiText('模型')};
  const thresholds=new Set(a.data.map(r=>key(entityKey(r,'model'),r.score))),models=new Set(shared.map(r=>entityKey(r,'model')));
  return {keys:unique(b.data.filter(r=>models.has(entityKey(r,'model'))&&thresholds.has(key(entityKey(r,'model'),r.score))).map(r=>key(entityKey(r,'model'),r.score))),noun:uiText('阈值')};
}

export function fixedBins(rows,count,domain=extent(rows,r=>r.value)){
  let [lo,hi]=domain;if(lo===hi){const pad=Math.abs(lo)*.05||.5;lo-=pad;hi+=pad;}
  const width=(hi-lo)/count,bins=Array.from({length:count},(_,index)=>({index,low:lo+index*width,high:index===count-1?hi:lo+(index+1)*width,rows:[],count:0,cumulative:0}));
  for(const r of rows){const i=Math.max(0,Math.min(count-1,Math.floor((r.value-lo)/width)));bins[i].rows.push(r);bins[i].count++;}
  let cumulative=0;bins.forEach(b=>{cumulative+=b.count;b.cumulative=cumulative;b.probability=cumulative/rows.length;});
  return {domain:[lo,hi],width,bins};
}
export function analyticalBounds(doc){
  if(doc.family==='univariate')return {value:extent(doc.data,r=>r.value),count:[0,Math.max(...fixedBins(doc.data,doc.binCount).bins.map(b=>b.count))]};
  if(doc.family==='evaluation'){const models=unique(doc.data.map(r=>entityKey(r,'model')));return {score:doc.probability?[0,1]:extent(doc.data,r=>r.score),lift:[0,Math.max(...models.map(model=>{const own=doc.data.filter(r=>entityKey(r,'model')===model);return own.length/own.filter(r=>r.actual===1).length;}))]};}
  return {value:[-1,1]};
}
export function analyticalSharedBounds(entries,bounds){
  if(entries[0].doc.family==='univariate')return {...bounds,count:[0,Math.max(...entries.flatMap(({doc})=>fixedBins(doc.data,doc.binCount,bounds.value).bins.map(b=>b.count)))]};
  return bounds;
}
export function analyticalRecipe(from,to){
  const family=analyticalFamily(to);
  if(from===to)return {id:'analysis-update',name:uiText('原始记录与统计更新'),description:uiText('保留样本、阈值或变量对的标识，再根据实际数据更新计算结果。')};
  if(family==='univariate')return {id:'analysis-distribution',name:uiText('分箱与累计展开'),description:uiText('保留原始观测位置与共用分箱；切换累计含义时收起频数，再展开比例与精确的经验台阶。')};
  if(family==='evaluation')return [from,to].includes('eval-calibration')?{id:'analysis-calibration',name:uiText('概率分箱重建'),description:uiText('阈值曲线收拢后，按概率分箱展开校准点。阈值点与分箱统计使用不同标识，不冒充同一个样本。')}:{id:'analysis-threshold',name:uiText('同阈值坐标迁移'),description:uiText('同一模型的同一得分阈值保持对应，在 ROC、PR、累计增益、提升、阈值轴和 KS 累积分布间迁移；KS 使用 score ≤ t，包含全部同分样本，轴含义随图型更新。')};
  return {id:'analysis-correlation',name:uiText('变量对展开与转向'),description:uiText('同一对变量的相关系数保持对应，在方格、圆面积与排序条之间变形，对称重复项按需收起。')};
}
export function analyticalGuide(doc,view){
  const family=analyticalFamily(view),intro=analyticalViews.find(v=>v.id===view)?.note||'',limit=findTemplate(doc.template)?.limit||'';
  const fill=family==='univariate'?uiMessage`每行填写唯一观测编号与原始 value，单位写在图表中，不要先做频数汇总。本表范围：${limit}。相关步骤使用相同分箱数，系统统一横轴范围与分箱边界。`:family==='evaluation'?uiMessage`每行是一名测试样本在一个模型下的预测，填写 label、model、actual 与 score。不同模型使用同一批样本和一致标签，分数越大越可能是正类。整体改名或新增请使用「管理模型」，表格中的模型列用于选择已有模型。${limit}。需要校准时，从校准曲线模板输入真实预测概率。`:uiMessage`每行填写 sample、variable 与 value；同一个样本需要包含全部变量。${limit}。变量名称建议包含各自单位。使用「管理变量」整体改名和调整矩阵顺序；新建变量的观测值留空等待填写。系统从原始观测计算 Pearson 系数，不接受把已算好的相关矩阵填成原始样本。`;
  const details=family==='univariate'?uiText('等宽区间左闭右开，最后一箱包含最大值。累计柱前几箱累计小于上界的样本，最后一箱包含最大值；ECDF 在每个实际观测值计数；同值观测共同跳升，重复值和离群值都保留。频数、累计比例与原始样本在图中分别标明。'):family==='evaluation'?uiText('同分样本共同进入阈值，ROC AUC 用梯形积分，AP 用召回增量加权，二者不能互换。校准只对非空箱绘点，显示每箱样本数，不补零、不跨空箱连线，也不自动估计置信区间。'):uiText('颜色始终使用 −1、0、+1 的共同色标；气泡面积对应 |r|，排序也按 |r|。常量变量显示「未定义」，不填成零，不自动添加显著性或因果结论。');
  return [intro,fill,details];
}
