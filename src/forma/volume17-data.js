import * as d3 from 'd3';
import {isEnglish} from './locale.js';
import {measurementDomain} from './axis-policy.js';
import {normalQuantile} from './volume7-data.js';
import {volume17Catalog,volume17English} from './volume17-catalog.js';
export const t17=(zh,en)=>isEnglish()?en:zh;
const ids=new Set(volume17Catalog.map(t=>t.id)),unique=a=>[...new Set(a)],finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15,text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=80;
export const groups17=rows=>unique(rows.map(r=>r.group));
const quantile=(rows,p,key='value')=>d3.quantileSorted(rows.map(r=>r[key]).sort(d3.ascending),p);
export function boxen17(rows){return groups17(rows).map(group=>{const samples=rows.filter(r=>r.group===group),depth=Math.min(5,Math.max(1,Math.floor(Math.log2(samples.length))-3)),intervals=Array.from({length:depth},(_,level)=>{const p=2**(-level-2);return{level,p,low:quantile(samples,p),high:quantile(samples,1-p),width:2**(-level)};});return{group,samples,median:quantile(samples,.5),intervals};});}
function stableJitter(label){let h=2166136261;for(const c of String(label)){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return((h>>>0)+.5)/4294967296*2-1;}
const kernel=(rows,value,bandwidth)=>d3.mean(rows,r=>Math.exp(-.5*((value-r.value)/bandwidth)**2))/Math.sqrt(2*Math.PI)/bandwidth;
export function sina17(doc){const groups=groups17(doc.data),curves=groups.map(group=>{const samples=doc.data.filter(r=>r.group===group);return{group,samples,points:samples.map(row=>({row,density:kernel(samples,row.value,doc.bandwidth),jitter:stableJitter(`${row.group}\u0000${row.label}`)}))};}),max=d3.max(curves,c=>d3.max(c.points,p=>p.density));return{curves,max};}
export function rootogram17(doc){return doc.data.map((row,index)=>({row,index,expectedRoot:Math.sqrt(row.expected),observedRoot:Math.sqrt(row.observed),difference:Math.sqrt(row.expected)-Math.sqrt(row.observed)}));}
export function ecdfBand17(doc){const values=doc.data.map(r=>r.value).sort(d3.ascending),epsilon=Math.sqrt(Math.log(2/doc.alpha)/(2*values.length)),points=unique(values).map(value=>{const p=d3.bisectRight(values,value)/values.length;return{value,p,low:Math.max(0,p-epsilon),high:Math.min(1,p+epsilon)};});return{points,epsilon,n:values.length};}
export function qqCompare17(doc){const samples=doc.groupOrder.map(group=>doc.data.filter(r=>r.group===group)),points=Array.from({length:39},(_,i)=>{const p=(i+1)/40;return{p,x:quantile(samples[0],p),y:quantile(samples[1],p)};});return{groups:doc.groupOrder,samples,points};}
export function worm17(doc){return groups17(doc.data).map(group=>{const rows=doc.data.filter(r=>r.group===group).sort((a,b)=>a.stdResidual-b.stdResidual);return{group,points:rows.map((row,i)=>{const p=(i+.5)/rows.length,theoretical=normalQuantile(p);return{row,p,theoretical,deviation:row.stdResidual-theoretical};})};});}
// Normalizing centered coordinates prevents underflow/overflow in covariance.
export function fitLine17(points){const mx=d3.mean(points,p=>p.x),my=d3.mean(points,p=>p.y),sx=d3.max(points,p=>Math.abs(p.x-mx)),sy=d3.max(points,p=>Math.abs(p.y-my))||1,xx=d3.sum(points,p=>((p.x-mx)/sx)**2),xy=d3.sum(points,p=>(p.x-mx)/sx*(p.y-my)/sy),slope=xy/xx*sy/sx;return{mx,my,slope,intercept:my-slope*mx,predict:x=>my+slope*(x-mx)};}
export function spreadLevel17(doc){const points=groups17(doc.data).map(group=>{const rows=doc.data.filter(r=>r.group===group),median=quantile(rows,.5),low=quantile(rows,.25),high=quantile(rows,.75),iqr=high-low;return{group,rows,median,iqr,low,high,x:Math.log10(median),y:Math.log10(iqr)};});return{points,fit:fitLine17(points)};}
export function scaleLocation17(doc){return doc.data.map(row=>({row,x:row.fitted,y:Math.sqrt(Math.abs(row.stdResidual))}));}
export function cook17(row,parameterCount){return row.stdResidual**2/parameterCount*(row.leverage/(1-row.leverage));}
export function addedVariable17(doc){const points=doc.data.map(row=>({row,x:row.xResidual,y:row.yResidual}));return{points,fit:fitLine17(points)};}
export function componentResidual17(doc){return doc.data.map(row=>({row,x:row.x,component:doc.coefficient*row.x,y:row.residual+doc.coefficient*row.x}));}
const methodNotes={
 boxen:['Type 7 样本分位数。第 k 层尾概率为 2^(−k−2)，区间为 [Qp,Q1−p]；层数 min(5, floor(log₂n)−3)，最少一层。箱宽逐层减半，是概率层级编码，非密度估计；全部原值另行显示。','Type 7 sample quantiles. Level k has tail probability 2^(−k−2) and interval [Qp,Q1−p]. Depth is min(5,floor(log₂n)−3), at least one. Width halves by level and encodes probability depth, not density; all raw values remain visible.'],
 sina:['每组使用相同 bandwidth 的高斯核密度；横向范围按各组共同最大样本点密度归一化。稳定标签哈希决定范围内抖动，数值坐标始终保持原值。抖动不是聚类、碰撞检测或测量误差。','Each group uses Gaussian KDE with the same bandwidth. Widths share the maximum density evaluated at sample points. A stable label hash chooses jitter inside that width; measured coordinates stay exact. Jitter is neither clustering, collision avoidance nor measurement error.'],
 rootogram:['悬挂柱顶为 √expected，柱高为 √observed，柱底为 √expected−√observed。零观察柱保留编辑标记。expected 由外部模型提供，不重拟合；箱宽不编码真实区间宽度。','Hanging bars start at √expected, have height √observed and end at √expected−√observed. Zero observations retain edit markers. Expectations come from an external model; no refit is performed. Display widths do not encode physical bin widths.'],
 ecdfband:['对于独立同分布样本，ε = √(ln(2/alpha)/(2n))；同时带为 [max(0,Fn−ε),min(1,Fn+ε)]，置信水平至少 1−alpha。经验分布右连续，重复原值按全部质量计入；不估计均值区间。','For IID observations, ε=√(ln(2/alpha)/(2n)). The simultaneous band is [max(0,Fn−ε),min(1,Fn+ε)] with coverage at least 1−alpha. The ECDF is right-continuous and retains tied mass. This is not a confidence interval for the mean.'],
 qqcompare:['两组均采用 Type 7 样本分位数，在 p=0.025,0.05,…,0.975 上比较。横纵使用相同单位和同一像素比例，参考线为 y=x；两侧短线保留各组全部原值，不制造观测配对。','Both groups use Type 7 sample quantiles at p=0.025,0.05,…,0.975. Axes share units and pixels per unit; the reference is y=x. Marginal rugs preserve every original value without inventing paired observations.'],
 worm:['每层按残差升序，p=(i−0.5)/n；横轴 Φ⁻¹(p)，纵轴为标准化残差−Φ⁻¹(p)。参考为固定 N(0,1)，不重新估计均值或方差，不绘制未计算的包络或拟合三次曲线。','Within each stratum, sort residuals and use p=(i−0.5)/n. X=Φ⁻¹(p), Y=standardized residual−Φ⁻¹(p). The reference is fixed N(0,1); no mean/variance fit, uncomputed envelope or cubic fit is supplied.'],
 spreadlevel:['每组中位数及 IQR 采用 Type 7 分位数，横纵坐标为各自 log₁₀。线为各组摘要点的普通最小二乘描述性直线；它不是稳健拟合、置信区间或异方差检验。不自动变换原始观测。','Group median and IQR use Type 7 quantiles; coordinates are their log10 values. The line is an ordinary least-squares descriptive fit across group summaries, not a robust fit, confidence interval or heteroscedasticity test. No observations are automatically transformed.'],
 scalelocation:['纵轴为 √|r|，r 必须是同一 OLS 拟合的内部标准化残差 e/(s√(1−h))。仅转换显示坐标，输入残差完整保留；不绘制假定的平滑趋势或检验结论。','Y=√|r|, where r is the internal standardized residual e/(s√(1−h)) from the same OLS fit. Only display coordinates are transformed; supplied residuals are preserved. No invented smoother or test conclusion is drawn.'],
 residualleverage:['Cook D = r² h/[p(1−h)]，p 是含截距的参数数；等值线为 r=±√(Dp(1−h)/h)，D=0.5 与 1。需要完整拟合观测且 Σh≈p；h=1 不定义该残差，必须回到拟合分析处理，不能静默删除。','Cook D=r²h/[p(1−h)], with p parameters including the intercept. Contours r=±√(Dp(1−h)/h) use D=0.5 and 1. Supply the complete fit with Σh≈p. h=1 leaves this residual undefined; resolve it in the model analysis rather than silently omitting it.'],
 cooksdistance:['由内部标准化残差计算 D = r²h/[p(1−h)]，按输入顺序显示。4/n 虚线只是常见探索性参考，不能据此自动删除观测；不改变拟合、不填补缺失诊断。','D=r²h/[p(1−h)] uses internal standardized residuals and is displayed in input order. The 4/n line is only an exploratory reference, never an automatic deletion rule. The fit is not changed and missing diagnostics are not imputed.'],
 addedvariable:['输入来自两次外部辅助回归：X 对其余协变量及截距、Y 对同一协变量及截距。图内仅拟合残差平面的 OLS 直线；在这些前提下其斜率等于原多元线性模型中 X 的系数。不输出因果或显著性结论。','Inputs come from two external auxiliary regressions: X on the other covariates and intercept, and Y on those same covariates and intercept. Only the residual-plane OLS line is fitted here. Under these assumptions its slope equals the X coefficient in the full linear model; no causal or significance claim is made.'],
 componentresidual:['部分残差 = 完整模型普通残差 + coefficient×x；参考线为 coefficient×x。适用于不含该项交互的数值线性项，坐标不代表预测值；coefficient 由外部原模型给出，不在图内重新估计。','Partial residual = ordinary full-model residual + coefficient×x; the reference is coefficient×x. This applies to a numeric linear term without interactions involving that term. Coordinates are not predictions; coefficient is supplied from the external model, never re-estimated here.']
};
function tickable(values){const domain=measurementDomain(values);try{return domain.every(Number.isFinite)&&domain[1]>domain[0]&&d3.ticks(...domain,5).every(Number.isFinite)&&d3.ticks(...domain,5).length>0;}catch{return false;}}
export function validateVolume17(doc,{fail,count,noDuplicates,warnings}){
 if(!ids.has(doc.template))return;const id=doc.template,rows=doc.data,spec=volume17Catalog.find(t=>t.id===id);
 if(!Array.isArray(rows)||rows.some(row=>!row||spec.fields.some(([key,type])=>type==='number'?!finite(row[key]):!text(row[key])))){fail(t17('必须提供完整有限原值和非空编号；缺测不删行、不补零。','Supply complete finite values and nonempty identifiers; missing rows are neither removed nor zero-filled.'));return;}
 noDuplicates(rows.map(r=>r.label),t17('观测编号','Observation identifiers'));
 const grouped=['boxen','sina','qqcompare','worm','spreadlevel'].includes(id);
 if(grouped){const groups=groups17(rows),range=id==='qqcompare'?[2,2]:id==='spreadlevel'?[3,10]:id==='worm'?[1,4]:[1,5];count(groups.length,...range,t17('分组','groups'));for(const group of groups)count(rows.filter(r=>r.group===group).length,id==='boxen'?16:8,id==='boxen'?240:id==='sina'?200:id==='qqcompare'?300:id==='worm'?180:100,t17('每组观测','observations per group'));}else count(rows.length,id==='rootogram'?4:8,id==='rootogram'?32:id==='ecdfband'?600:300,t17('完整记录','complete records'));
 if(['boxen','sina','ecdfband','qqcompare','spreadlevel'].includes(id)&&rows.length&&!tickable(rows.map(r=>r.value)))fail(t17('原值跨度无法形成有限坐标刻度，请换算单位。','Input magnitudes cannot form finite axis ticks; convert measurement units.'));
 if(id==='sina'){
  const extent=d3.extent(rows,r=>r.value),span=extent[1]-extent[0];if(!finite(doc.bandwidth)||doc.bandwidth<=0||!Number.isFinite(1/doc.bandwidth)||span>0&&(doc.bandwidth<span/100||doc.bandwidth>span*4))fail(t17('bandwidth 必须是可表示的正数；非恒定样本要求跨度的 1/100–4 倍。','bandwidth must be a representable positive number, and 1/100–4 times the span for nonconstant samples.'));
 }
 if(id==='rootogram'){
  if(rows.some(r=>!Number.isSafeInteger(r.observed)||r.observed<0||r.expected<0))fail(t17('observed 须为非负安全整数；expected 须为非负有限期望值。','observed must be a nonnegative safe integer; expected a nonnegative finite expectation.'));
  if(!rows.some(r=>r.observed>0||r.expected>0))fail(t17('观察与期望不能全部为零。','Observed and expected counts cannot both be all zero.'));
 }
 if(id==='ecdfband'&&(!finite(doc.alpha)||doc.alpha<.001||doc.alpha>.5))fail(t17('alpha 必须介于 0.001 和 0.5；置信水平为 1−alpha。','alpha must lie in [0.001,0.5]; confidence is 1−alpha.'));
 if(id==='qqcompare'){
  if(!Array.isArray(doc.groupOrder)||doc.groupOrder.length!==2||!doc.groupOrder.every(text)||new Set(doc.groupOrder).size!==2||rows.some(r=>!doc.groupOrder.includes(r.group))||!doc.groupOrder.every(g=>rows.some(r=>r.group===g)))fail(t17('groupOrder 必须按横轴、纵轴顺序明确两组唯一名称，并覆盖全部观测。','groupOrder must name the two unique groups in horizontal, vertical order and cover all observations.'));
 }
 if(id==='spreadlevel'){
  if(rows.some(r=>r.value<=0))fail(t17('双对数离散度水平图只接受正原值，不自动平移。','The log–log spread-level plot requires positive original values; no automatic shift is applied.'));
  const groups=groups17(rows),stats=groups.map(g=>{const rr=rows.filter(r=>r.group===g);return{median:quantile(rr,.5),iqr:quantile(rr,.75)-quantile(rr,.25)};});if(stats.some(s=>!(s.iqr>0)))fail(t17('各组 IQR 必须大于零；不为常量分布制造离散度。','Every group IQR must be positive; no spread is invented for constant distributions.'));
  if(new Set(stats.map(s=>s.median)).size<2)fail(t17('至少两组中位数须不同，才能识别离散度与水平的关系。','At least two group medians must differ to identify a spread–level relation.'));
 }
 if(['rootogram','worm','scalelocation','residualleverage','cooksdistance','addedvariable','componentresidual'].includes(id)&&!text(doc.modelName))fail(t17('请用 modelName 明确外部模型及诊断来源。','modelName must identify the external model and diagnostic source.'));
 if(['residualleverage','cooksdistance'].includes(id)){
  if(!Number.isInteger(doc.parameterCount)||doc.parameterCount<1||doc.parameterCount>rows.length-2)fail(t17('parameterCount 是含截距的参数整数个数，须在 1 至 n−2 之间。','parameterCount is the integer number of parameters including the intercept, between 1 and n−2.'));
  if(rows.some(r=>r.leverage<0||r.leverage>=1))fail(t17('杠杆值必须位于 [0,1)；h=1 的未定义标准化残差需在外部分析处理。','Leverage must lie in [0,1); resolve undefined standardized residuals at h=1 in the external analysis.'));
  if(finite(doc.parameterCount)&&Math.abs(d3.sum(rows,r=>r.leverage)-doc.parameterCount)>Math.max(1,doc.parameterCount)*1e-5)fail(t17('完整 OLS 诊断的杠杆值合计须等于 parameterCount（容差 10⁻⁵）。','The complete OLS leverage sum must equal parameterCount within relative tolerance 10⁻⁵.'));
  if(rows.every(r=>r.leverage>=0&&r.leverage<1)&&doc.parameterCount>0&&rows.some(r=>!Number.isFinite(cook17(r,doc.parameterCount))))fail(t17('当前残差与杠杆导致 Cook 距离不可表示，请检查输入定义。','Residual and leverage values produce unrepresentable Cook distances; check the diagnostic definitions.'));
 }
 if(['addedvariable','componentresidual'].includes(id)&&![doc.axes?.x,doc.axes?.y].every(text))fail(t17('axes.x 和 axes.y 须注明变量含义与原单位。','axes.x and axes.y must name the quantities and original units.'));
 if(id==='addedvariable'){
  if(!(d3.max(rows,r=>r.xResidual)>d3.min(rows,r=>r.xResidual)))fail(t17('X 残差必须有变化，常量残差不识别斜率。','X residuals must vary; a constant does not identify a slope.'));
  else {const m=addedVariable17(doc);if(!Number.isFinite(m.fit.slope)||!Number.isFinite(m.fit.intercept)||m.points.some(p=>!Number.isFinite(m.fit.predict(p.x))))fail(t17('残差平面直线超出有限数值范围，请换算单位。','The residual-plane line exceeds finite numeric range; convert units.'));}
 }
 if(id==='componentresidual'&&!finite(doc.coefficient))fail(t17('coefficient 必须为外部原模型中的有限线性系数。','coefficient must be the finite linear coefficient from the external original model.'));
 if(rows.length){
  const values=id==='worm'?rows.map(r=>r.stdResidual):id==='scalelocation'?rows.map(r=>r.fitted):id==='addedvariable'?rows.flatMap(r=>[r.xResidual,r.yResidual]):id==='componentresidual'&&finite(doc.coefficient)?componentResidual17(doc).flatMap(p=>[p.x,p.y,p.component]):[];
  if(values.length&&!tickable(values))fail(t17('诊断值量级无法形成有限刻度，请先调整单位。','Diagnostic magnitudes cannot form finite ticks; adjust units first.'));
 }
 warnings.push(t17(...methodNotes[id]));
}
export function volume17Summary(doc,fmt){if(!ids.has(doc.template))return null;return{value:fmt(doc.template==='rootogram'?d3.sum(doc.data,r=>r.observed):doc.data.length),label:t17(doc.template==='rootogram'?'观察频数':'输入记录',doc.template==='rootogram'?'Observed count':'Input records'),unit:doc.template==='rootogram'?doc.unit:t17('条','rows')};}
const refs={boxen:'https://seaborn.pydata.org/generated/seaborn.boxenplot.html',sina:'https://ggforce.data-imaginist.com/reference/geom_sina.html',rootogram:'https://www.zeileis.org/papers/Kleiber%2BZeileis-2016.pdf',ecdfband:'https://arxiv.org/abs/2403.16651',qqcompare:'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/qqnorm.html',worm:'https://search.r-project.org/CRAN/refmans/gamlss/html/wp.html',spreadlevel:'https://search.r-project.org/CRAN/refmans/car/html/spreadLevelPlot.html',scalelocation:'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/plot.lm.html',residualleverage:'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/plot.lm.html',cooksdistance:'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/influence.measures.html',addedvariable:'https://search.r-project.org/CRAN/refmans/car/html/avPlots.html',componentresidual:'https://search.r-project.org/CRAN/refmans/car/html/crPlots.html'};
export function volume17MethodNotes(id){return ids.has(id)?[t17(...methodNotes[id]),t17('方法参考：','Method reference: ')+refs[id]]:[];}
export function guide17(t,guide){if(!ids.has(t.id))return guide;const en=volume17English[t.id],warnings=[];validateVolume17(guide.example,{fail:()=>{},count:()=>{},noDuplicates:()=>{},warnings});return{...guide,introduction:isEnglish()?en.description:t.description,rowMeaning:isEnglish()?en.rowMeaning:t.fields.map(([key,,meaning])=>`${key}：${meaning}`).join('；'),use:isEnglish()?en.use:t.use,avoid:isEnglish()?en.avoid:t.avoid,limit:isEnglish()?en.limit:t.limit,notes:volume17MethodNotes(t.id),fields:guide.fields.map((f,i)=>({...f,description:isEnglish()?en.fields[i][2]:t.fields[i][2]}))};}
