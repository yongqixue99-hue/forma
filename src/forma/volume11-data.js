import * as d3 from 'd3';
import {isEnglish} from './locale.js';
import {measurementDomain} from './axis-policy.js';
import {volume11Catalog,volume11English} from './volume11-catalog.js';
export const t11=(zh,en)=>isEnglish()?en:zh;
const ids=new Set(volume11Catalog.map(d=>d.id)),finite=Number.isFinite,unique=a=>[...new Set(a)];
export const forecastKeys11=['median','lower50','upper50','lower80','upper80','lower95','upper95'];
export function proportion11(rows){
 const center=d3.sum(rows,d=>d.defectives)/d3.sum(rows,d=>d.sampleSize);
 return{center,points:rows.map((row,i)=>{const margin=3*Math.sqrt(center*(1-center)/row.sampleSize);return{row,i,value:row.defectives/row.sampleSize,low:Math.max(0,center-margin),high:Math.min(1,center+margin)};})};
}
export function defects11(rows){
 const center=d3.sum(rows,d=>d.defects)/d3.sum(rows,d=>d.exposure);
 return{center,points:rows.map((row,i)=>{const margin=3*Math.sqrt(center/row.exposure);return{row,i,value:row.defects/row.exposure,low:Math.max(0,center-margin),high:center+margin};})};
}
export function cusum11(doc){
 let upper=0,lower=0;
 return doc.data.map((row,i)=>{const z=(row.value-doc.target)/doc.sigma;upper=Math.max(0,upper+z-doc.referenceK);lower=Math.max(0,lower-z-doc.referenceK);return{row,i,z,upper,lower};});
}
export function ewma11(doc){
 let value=doc.target;
 return doc.data.map((row,i)=>{value=doc.lambda*row.value+(1-doc.lambda)*value;const startup=-Math.expm1(2*(i+1)*Math.log1p(-doc.lambda)),margin=doc.limitSigma*doc.sigma*Math.sqrt(doc.lambda)*Math.sqrt(startup)/Math.sqrt(2-doc.lambda);return{row,i,value,low:doc.target-margin,high:doc.target+margin};});
}
// Conventional rounded X-bar/R factors for normal, equal-size subgroups.
// NIST describes the range estimator; the listed A2/D3/D4 factors follow the
// equipment maker's published SPC table (linked in the shared method notes).
export const xbarFactors11=Object.freeze({2:[1.880,0,3.267],3:[1.023,0,2.574],4:[.729,0,2.282],5:[.577,0,2.114],6:[.483,0,2.004],7:[.419,.076,1.924],8:[.373,.136,1.864],9:[.337,.184,1.816],10:[.308,.223,1.777]});
export function subgroups11(rows){return Array.from(d3.group(rows,d=>d.period),([period,items])=>({period,rows:items,mean:d3.mean(items,d=>d.value),range:d3.max(items,d=>d.value)-d3.min(items,d=>d.value)}));}
export function xbar11(rows){
 const groups=subgroups11(rows),n=groups[0]?.rows.length,[a2,d3Factor,d4]=xbarFactors11[n]||[],center=d3.mean(groups,d=>d.mean),range=d3.mean(groups,d=>d.range);
 return{groups,n,center,range,low:center-a2*range,high:center+a2*range,rangeLow:d3Factor*range,rangeHigh:d4*range};
}
export function lagPairs11(doc){return doc.data.slice(doc.lag).map((row,j)=>({row,previous:doc.data[j],i:j+doc.lag,x:doc.data[j].value,y:row.value}));}
// Rectangular window, constant detrend, one-sided spectrum (not density).
// A real-signal interior bin combines positive and negative frequencies;
// the even-n Nyquist bin has no distinct partner and must not be doubled.
export function spectrum11(values,sampleInterval){
 const n=values.length,scale=d3.max(values,v=>Math.abs(v))||1,normalized=values.map(v=>v/scale),mean=d3.mean(normalized),centered=normalized.map(v=>v-mean);
 return Array.from({length:Math.floor(n/2)},(_,j)=>{const k=j+1;let real=0,imaginary=0;for(let i=0;i<n;i++){const angle=2*Math.PI*k*i/n;real+=centered[i]*Math.cos(angle);imaginary-=centered[i]*Math.sin(angle);}const paired=n%2===0&&k===n/2?1:2;return{k,frequency:k/n/sampleInterval,power:paired*((real/n)**2+(imaginary/n)**2)*scale*scale};});
}
// Match the document's existing magnitude ceiling for top-level numerics too.
// Separately verify calculated domains: a tiny denominator can overflow the
// display span even when every individual derived value remains finite.
function parameter(doc,key,fail,{positive=false,min,max,integer=false}={}){const value=doc[key];if(!finite(value)||Math.abs(value)>1e15||positive&&value<=0||min!==undefined&&value<min||max!==undefined&&value>max||integer&&!Number.isInteger(value)){fail(t11(`参数 ${key} 无效；绝对值不能超过 10¹⁵，并须满足数据指南中的范围。`,`Invalid ${key}; its absolute value must not exceed 10¹⁵ and must satisfy the range in the data guide.`));return false;}return true;}
export function plotRange11(values,{zero=false}={}){
 if(!values.length||values.some(v=>!finite(v)))return false;
 const [low,high]=measurementDomain(values,{zero,padding:0}),span=high-low,domain=zero&&low>=0?[0,high+span*.08]:[low-span*.08,high+span*.08];
 if(!(span>0)||!finite(span)||domain.some(v=>!finite(v))||!finite(domain[1]-domain[0]))return false;
 try{return [3,4,5].every(n=>{const y=d3.scaleLinear(domain,[0,1]).nice(n),ticks=y.ticks(n);return y.domain().every(finite)&&finite(y.domain()[1]-y.domain()[0])&&ticks.length>0&&ticks.every(finite)&&values.every(v=>finite(y(v)));});}catch{return false;}
}
const rangeFailure=()=>t11('数据或派生界限的显示尺度超出浮点可表示范围，请换算单位或核对基线参数；不会截断、补零或隐藏原值。','The data or derived-limit display scale is outside the representable numeric range. Rescale units or check baseline parameters; values are not truncated, zero-filled or hidden.');
export function validateVolume11(doc,{fail,count,noDuplicates,warnings}){
 const id=doc.template;if(!ids.has(id))return;const rows=doc.data;
 if(id!=='xbar')noDuplicates(rows.map(d=>d.period),t11('时期标签','Period labels'));
 if(['pcontrol','ucontrol'].includes(id)){
  count(rows.length,4,150,t11('批次','batches'));
  if(id==='pcontrol'){
   if(rows.some(d=>!Number.isInteger(d.defectives)||d.defectives<0||!Number.isInteger(d.sampleSize)||d.sampleSize<=0||d.defectives>d.sampleSize))fail(t11('defectives 和 sampleSize 必须为整数，且 0 ≤ defectives ≤ sampleSize、sampleSize > 0。','defectives and sampleSize must be integers with 0 ≤ defectives ≤ sampleSize and sampleSize > 0.'));
   if(doc.unit!=='%')fail(t11('比例控制图的 unit 必须为 %；输入仍为原始件数，不填百分比。','The p-chart unit must be %; input original counts, not percentages.'));
   const p=proportion11(rows).center;if(rows.some(d=>d.sampleSize*p<5||d.sampleSize*(1-p)<5))warnings.push(t11('有批次的期望不合格件或合格件数少于 5，三西格玛正态近似可能不准确；不自动切换为精确二项界限。','Some expected nonconforming or conforming counts are below 5; three-sigma normal limits may be inaccurate. Exact binomial limits are not substituted automatically.'));
  }else{
   if(rows.some(d=>!Number.isInteger(d.defects)||d.defects<0||!finite(d.exposure)||d.exposure<=0))fail(t11('defects 必须为非负整数，exposure 必须为同口径正数。','defects must be a nonnegative integer and exposure a positive value in one common unit.'));
   const stats=defects11(rows);if(!finite(stats.center)||!plotRange11(stats.points.flatMap(p=>[p.value,p.low,p.high]),{zero:true}))fail(rangeFailure());
   if(rows.some(d=>d.exposure*stats.center<5))warnings.push(t11('有批次的期望缺陷数少于 5，三西格玛泊松正态近似可能较差。','Some expected defect counts are below 5; the Poisson normal approximation may be poor.'));
  }
  warnings.push(t11('全部输入估计同一基线；仅标记点越限，不执行其他运行规则。控制限不是规格限，且独立、同口径的过程假设需由使用者核实。','All supplied inputs estimate one baseline. Only points outside limits are flagged; no extra run rules are applied. Control limits are not specification limits. Verify independence and a comparable process.'));
 }
 if(['cusum','ewma'].includes(id)){
  count(rows.length,4,300,t11('观测','observations'));
  const checks=[parameter(doc,'target',fail),parameter(doc,'sigma',fail,{positive:true})];
  if(id==='cusum')checks.push(parameter(doc,'referenceK',fail,{positive:true}),parameter(doc,'decisionH',fail,{positive:true}));
  else checks.push(parameter(doc,'lambda',fail,{positive:true,max:1}),parameter(doc,'limitSigma',fail,{positive:true}));
  if(checks.every(Boolean)){const stats=id==='cusum'?cusum11(doc):ewma11(doc),fields=id==='cusum'?['z','upper','lower']:['value','low','high'],values=id==='cusum'?[-doc.decisionH,doc.decisionH,...stats.flatMap(p=>[p.upper,-p.lower])]:[...rows.map(d=>d.value),...stats.flatMap(p=>[p.value,p.low,p.high])];if(stats.some(p=>fields.some(k=>!finite(p[k])))||!plotRange11(values))fail(rangeFailure());}
  warnings.push(t11('target 和 sigma 必须来自独立的受控基线，不根据本段监测数据重新拟合。假定观测独立、基线近似正态；阈值不是预测区间或显著性概率。','target and sigma must come from an independent in-control baseline; they are not fitted to monitoring data. Observations are assumed independent with an approximately normal baseline. Thresholds are not prediction intervals or p-values.'));
 }
 if(id==='xbar'){
  const groups=subgroups11(rows),n=groups[0]?.rows.length;count(groups.length,3,60,t11('子组','subgroups'));
  noDuplicates(rows.map(d=>JSON.stringify([d.period,d.sample])),t11('子组与样本标识组合','Subgroup/sample pairs'));
  if(!Number.isInteger(n)||n<2||n>10||groups.some(g=>g.rows.length!==n))fail(t11('每个子组必须有相同的 2–10 个原始样本，不接受不同子组大小。','Every subgroup must contain the same 2–10 original observations; unequal subgroup sizes are not supported.'));
  if(!groups.some(g=>g.range>0))fail(t11('至少一个子组必须有非零极差，才能估计组内波动。','At least one subgroup needs a nonzero range to estimate within-subgroup variation.'));
  warnings.push(t11('控制限由全部子组的均值与平均极差估计；使用常规四舍五入 A2/D3/D4 系数。子组内部近似独立正态、子组之间可比；只标记越限，不执行额外运行规则。','All subgroup means and ranges estimate the baseline using conventional rounded A2/D3/D4 factors. Assume approximately independent normal observations within comparable subgroups. Only outside-limit signals are evaluated.'));
 }
 if(['lagplot','periodogram'].includes(id)){
  count(rows.length,id==='lagplot'?5:8,id==='lagplot'?500:512,t11('观测','observations'));if(new Set(rows.map(d=>d.value)).size<2)fail(t11('需要非恒定原始序列。','A nonconstant original sequence is required.'));
  if(id==='lagplot')parameter(doc,'lag',fail,{integer:true,min:1,max:Math.min(60,rows.length-2)});
  else{const valid=parameter(doc,'sampleInterval',fail,{positive:true});if(typeof doc.timeUnit!=='string'||!doc.timeUnit.trim()||doc.timeUnit.length>40)fail(t11('timeUnit 需要 1–40 字的采样时间单位。','timeUnit must name the sampling-time unit in 1–40 characters.'));if(valid){const spectrum=spectrum11(rows.map(d=>d.value),doc.sampleInterval);if(!plotRange11([0,.5/doc.sampleInterval],{zero:true})||!plotRange11(spectrum.map(p=>p.power),{zero:true})||!spectrum.some(p=>p.power>0))fail(rangeFailure());}}
  warnings.push(t11('按输入顺序处理等间隔观测；不重新排序、不插值补点，也不自动去趋势或差分。','Use equally spaced observations in input order. No sorting, imputation, trend removal or differencing is applied.'));
 }
 if(id==='forecastfan'){
  const split=rows.findIndex(d=>d.observed===null),history=split<0?rows.length:split;count(history,3,60,t11('历史时期','historical periods'));count(rows.length-history,2,40,t11('预测时期','forecast periods'));
  if(rows.some((d,i)=>i<history?!finite(d.observed)||forecastKeys11.some(k=>d[k]!==null):d.observed!==null||forecastKeys11.some(k=>!finite(d[k]))))fail(t11('历史只填写 observed、预测字段全为 null；随后预测期 observed 为 null，7 个预测字段必须完整。','History must contain observed with null forecast fields. All following forecast rows require null observed and all seven finite forecast fields.'));
  if(rows.slice(history).some(d=>[d.lower95,d.lower80,d.lower50,d.median,d.upper50,d.upper80,d.upper95].some((v,i,a)=>i&&v<a[i-1])))fail(t11('必须满足 lower95 ≤ lower80 ≤ lower50 ≤ median ≤ upper50 ≤ upper80 ≤ upper95。','Require lower95 ≤ lower80 ≤ lower50 ≤ median ≤ upper50 ≤ upper80 ≤ upper95.'));
  warnings.push(t11('这里只呈现同一外部模型的中央预测区间，不计算或拟合预测；期望覆盖率由模型负责，不表示观测真实落入概率已校准。历史与预测之间保留边界，按等间隔顺序展示。','This chart displays central prediction intervals from one external model; it does not calculate or fit forecasts. Nominal coverage belongs to the model and is not validated here. A boundary separates equally spaced history and forecast periods.'));
 }
}
const meanings={pcontrol:'一行是一个批次的原始检查件数 sampleSize 与不合格件数 defectives，不填写缺陷事件数或已经计算的比例。',ucontrol:'一行是一批原始缺陷事件数 defects 与实际检查暴露量 exposure；所有行使用同一个暴露单位，多个缺陷可以发生于同一件。',cusum:'一行是一次原始测量；target 和 sigma 来自独立受控基线，referenceK 与 decisionH 为无量纲标准差倍数。',ewma:'一行是一次原始测量；独立基线 target、sigma 保持固定，lambda 是当前观测权重，limitSigma 是控制限倍数。',xbar:'一行是一个子组 period 内的一个原始样本 sample；sample 在该子组内唯一，子组顺序按首次出现。',lagplot:'一行是按等间隔采集的一次原始测量；第 t 个点以 value[t−lag] 为横轴、value[t] 为纵轴，前 lag 行不伪造配对。',periodogram:'一行是一次等时间间隔原始采样。sampleInterval 为相邻采样间隔，timeUnit 为采样时间单位，unit 是信号的测量单位。',forecastfan:'历史行只填 observed，预测字段全部填 null；未来行 observed 填 null，填写同一模型与预测起点的中位数及三层中央预测区间。'};
export function volume11MethodNotes(id){
 const notes={
  pcontrol:[t11('p̄=Σdefectives/ΣsampleSize；pᵢ=defectivesᵢ/sampleSizeᵢ。各期 LCL=max(0,p̄−3√[p̄(1−p̄)/nᵢ])，UCL=min(1,p̄+3√[p̄(1−p̄)/nᵢ])；仅显示时乘 100。限线按当前批次 nᵢ 阶梯变化，不能使用各批比例的未加权均值。','p̄=Σdefectives/ΣsampleSize; pᵢ=defectivesᵢ/sampleSizeᵢ. Each LCL=max(0,p̄−3√[p̄(1−p̄)/nᵢ]) and UCL=min(1,p̄+3√[p̄(1−p̄)/nᵢ]). Multiply by 100 for display only. Limits step with the current batch size; do not average batch proportions without weights.'),'https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc332.htm'],
  ucontrol:[t11('ū=Σdefects/Σexposure；uᵢ=defectsᵢ/exposureᵢ。LCL=max(0,ū−3√[ū/exposureᵢ])，UCL=ū+3√[ū/exposureᵢ]。泊松模型假设缺陷事件按暴露量具有共同强度；不是二项比例，值允许大于 1。','ū=Σdefects/Σexposure; uᵢ=defectsᵢ/exposureᵢ. LCL=max(0,ū−3√[ū/exposureᵢ]), UCL=ū+3√[ū/exposureᵢ]. Poisson events have a common intensity per exposure unit; this is not a binomial proportion and may exceed 1.'),'https://www.itl.nist.gov/div898/software/dataplot/refman1/ch2/ucontrol.pdf'],
  cusum:[t11('zᵢ=(valueᵢ−target)/sigma；C⁺₀=C⁻₀=0；C⁺ᵢ=max(0,C⁺ᵢ₋₁+zᵢ−referenceK)，C⁻ᵢ=max(0,C⁻ᵢ₋₁−zᵢ−referenceK)。显示 C⁺ 与 −C⁻，阈值为 ±decisionH；超出即标记。每一点包含截至该点的全部历史，不在越限后自动归零。','zᵢ=(valueᵢ−target)/sigma; C⁺₀=C⁻₀=0; C⁺ᵢ=max(0,C⁺ᵢ₋₁+zᵢ−referenceK), C⁻ᵢ=max(0,C⁻ᵢ₋₁−zᵢ−referenceK). Display C⁺ and −C⁻ with thresholds ±decisionH. Flag crossings; each statistic includes its entire prefix and is not reset after a signal.'),'https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/cusum.htm'],
  ewma:[t11('Z₀=target，Zₜ=lambda×valueₜ+(1−lambda)Zₜ₋₁；启动期 Var(Zₜ)=sigma²×lambda/(2−lambda)×[1−(1−lambda)^(2t)]，由独立输入的加权方差和求得。控制限为 target±limitSigma√Var(Zₜ)，t 从 1 开始。原始值为淡色点；加权轨迹明确区别于原值，不使用曲线平滑。','Z₀=target, Zₜ=lambda×valueₜ+(1−lambda)Zₜ₋₁. Startup Var(Zₜ)=sigma²×lambda/(2−lambda)×[1−(1−lambda)^(2t)], from the sum of weighted independent variances. Limits are target±limitSigma√Var(Zₜ), t starting at 1. Pale points retain raw values; the weighted trace is distinct and uses no curve smoothing.'),'https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc324.htm'],
  xbar:[t11('每子组计算均值 x̄ᵢ 与极差 Rᵢ=max−min；x̄̄ 是子组均值的均值，R̄ 是极差均值。X̄ 界限 x̄̄±A2×R̄；R 界限 [D3×R̄,D4×R̄]，系数由共同子组大小 n 决定。原始点可编辑；均值和极差标记关联整个子组，不能伪装成单条测量。','Compute each subgroup mean x̄ᵢ and range Rᵢ=max−min. x̄̄ averages subgroup means and R̄ averages ranges. X̄ limits=x̄̄±A2×R̄; R limits=[D3×R̄,D4×R̄], with factors for the common n. Raw points remain editable; means and ranges refer to their entire subgroup, never one invented observation.'),'https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc311.htm','https://servaid.atlascopco.com/AssertWeb/en-US/AtlasCopco/Document/6711978/DownloadConvertedFileAsPdf'],
  lagplot:[t11('从 t=lag 到 n−1 原样配对 (value[t−lag],value[t])，不拟合回归、不抖动、不删除相同坐标的重复观测。两轴用同一原值域且几何单位长度相等；虚线 y=x 是数值相等参考，不是拟合线。每点绑定两条来源记录。','Pair (value[t−lag],value[t]) for t=lag…n−1 without fitting, jittering or deleting coincident observations. Both axes share the same raw-value domain and equal geometric unit length. Dashed y=x is an equality reference, not a fit. Each point retains both source records.')],
  periodogram:[t11('先减去整段均值，X[k]=Σⱼ(value[j]−mean)exp(−2πikj/n)。绘制 k=1…floor(n/2)，f=k/(n×sampleInterval)，P[k]=2|X[k]|²/n²；偶数 n 的 Nyquist 频点只用 |X[k]|²/n²。使用矩形窗、不补零、不分段、不平滑；功率和等于原序列总体方差（分母 n），单位为 unit²，而非 unit²/Hz。','Subtract the overall mean, then X[k]=Σⱼ(value[j]−mean)exp(−2πikj/n). Plot k=1…floor(n/2), f=k/(n×sampleInterval), P[k]=2|X[k]|²/n²; for even n the Nyquist bin is |X[k]|²/n². Use a rectangular window, no zero-padding, segments or smoothing. Sum of bin power equals population variance (denominator n); units are unit², not unit²/Hz.'),'https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.periodogram.html'],
  forecastfan:[t11('保持全部输入区间端点：lower95≤lower80≤lower50≤median≤upper50≤upper80≤upper95。按 95%、80%、50% 的顺序绘制三层色带，深色表示中央区间，不改变输入宽度。区间从首个预测时期开始，不能把最后一个历史点伪造为零宽度预测；各时点之间仅作线性连接。','Preserve all interval endpoints: lower95≤lower80≤lower50≤median≤upper50≤upper80≤upper95. Draw 95%, 80%, then 50% bands so the central interval is darker, without changing widths. Bands begin at the first forecast period; never invent a zero-width forecast at the last observation. Connect supplied periods linearly.')]
 };
 return notes[id]||[];
}
export function volume11Summary(doc,fmt){if(!ids.has(doc.template))return null;return{value:fmt(doc.template==='xbar'?subgroups11(doc.data).length:doc.data.length),label:doc.template==='xbar'?t11('原始子组','Original subgroups'):t11('输入记录','Input records'),unit:doc.template==='xbar'?t11('组','groups'):t11('条','rows')};}
export function guide11(t,guide){
 if(!ids.has(t.id))return guide;const en=volume11English[t.id],warnings=[];
 validateVolume11(guide.example,{fail:()=>{},count:()=>{},noDuplicates:()=>{},warnings});
 const rangeNote=['cusum','ewma','lagplot','periodogram'].includes(t.id)?[t11('顶层数值参数的绝对值最多为 10¹⁵；过大或极小尺度使派生坐标、界限或功率不可表示时，需要先换算单位，不会默默改为零。','Top-level numeric parameters have absolute magnitude at most 10¹⁵. Rescale units if very large or tiny scales make derived coordinates, limits or power unrepresentable; they are never silently replaced with zero.')]:[];
 return{...guide,introduction:isEnglish()?en.description:t.description,rowMeaning:isEnglish()?en.rowMeaning:meanings[t.id],use:isEnglish()?en.use:t.use,avoid:isEnglish()?en.avoid:t.avoid,limit:isEnglish()?en.limit:t.limit,notes:[...warnings,...volume11MethodNotes(t.id),...rangeNote],fields:guide.fields.map((f,i)=>({...f,description:(isEnglish()?en.fields:t.fields)[i][2]}))};
}
