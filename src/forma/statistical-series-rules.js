import {deviation,extent} from 'd3';
import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {qqRows} from './volume7-data.js';
import {meanExcess15,weibull15} from './volume15-data.js';
import {nelson18} from './volume18-data.js';

export const statisticalText=(zh,en)=>isEnglish()?en:zh;
const t=statisticalText,view=(id,zh,en,note,english)=>({id,get name(){return t(zh,en);},en,get note(){return t(note,english);}});
export const statisticalViews=[
 view('stat-qq','正态分位对应','Normal Q–Q observations','原样本移动到拟合正态分位数与原值坐标；使用样本均值和样本标准差。','Observations move to fitted-normal quantile versus original value, using sample mean and sample standard deviation.'),
 view('stat-pp','正态累计概率对应','Normal P–P observations','比较已声明正态模型概率与右连续经验概率，不自动拟合参考参数。','Compare declared normal-model probabilities with right-continuous empirical probabilities; reference parameters are not fitted.'),
 view('stat-weibull','Weibull 寿命概率','Weibull lifetime probability','完整正寿命进入对数寿命和 Weibull 概率坐标，保留重复原值，不拟合参数。','Complete positive lifetimes enter log-lifetime and Weibull probability coordinates; ties remain and no parameters are fitted.'),
 view('stat-meanexcess','阈值与平均超额','Thresholds and mean excess','原值保留在短线带，阈值以上均值作为独立派生点展开，注明超额样本数。','All original values remain in a rug; means above thresholds unfold as separate derived points with exceedance counts.'),
 view('stat-ttt','累计总试验时间','Total time on test','完整等权正寿命转到累计失效份额与总试验时间份额，不当作风险率估计。','Complete equally weighted positive lifetimes move to cumulative failure and total-time-on-test shares, not a hazard-rate estimate.'),
 view('stat-lorenz','累计资源分配','Cumulative resource allocation','等权非负原值转到累计样本与资源份额，样本 Gini 不作有限样本校正。','Equally weighted nonnegative observations move to cumulative population and resource shares; sample Gini has no finite-sample correction.'),
 view('stat-ecdfband','经验分布与置信带','Empirical CDF and DKW band','原样本移到右连续经验概率，独立展开 DKW 同时置信带，依赖独立同分布假设。','Observations move to the right-continuous empirical CDF with a separate DKW simultaneous band under IID assumptions.'),
 view('stat-survival','持续比例阶梯','Kaplan–Meier survival','相同时长与右删失记录形成 Kaplan–Meier 乘积极限估计，同刻先计事件。','The same durations and right-censor records form a Kaplan–Meier product-limit estimate, handling tied events before withdrawals.'),
 view('stat-nelsonaalen','累积风险阶梯','Nelson–Aalen cumulative hazard','相同在险集与事件数展开为 Σd/n；累积风险不是概率，不用 −log(S) 替代。','The same risk sets and event counts unfold as Σd/n. Cumulative hazard is not probability and is not replaced by −log(S).')
];
export const statisticalViewMap={qqplot:'stat-qq',ppplot:'stat-pp',weibull:'stat-weibull',meanexcess:'stat-meanexcess',ttt:'stat-ttt',lorenz:'stat-lorenz',ecdfband:'stat-ecdfband',survival:'stat-survival',nelsonaalen:'stat-nelsonaalen'};
const ids=new Set(statisticalViews.map(v=>v.id));
export const isStatisticalView=id=>ids.has(id);
export const statisticalFamily=id=>ids.has(id)?(['stat-survival','stat-nelsonaalen'].includes(id)?'statistical-survival':'statistical-observations'):undefined;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e15,text=x=>typeof x==='string'&&!!x.trim();
export const statisticalOrdered=rows=>[...rows].sort((a,b)=>a.value-b.value||recordId(a).localeCompare(recordId(b)));
const groups=rows=>[...new Set(rows.map(r=>r.group))].map(group=>rows.filter(r=>r.group===group));
export function statisticalDocument(doc,common={}){
 const family=statisticalFamily(statisticalViewMap[doc?.template]);if(!family)return null;
 return {...doc,...common,family,...(family==='statistical-observations'?{alpha:doc.alpha??.05,minExceedances:doc.minExceedances??2}:{}),data:doc.data.map((r,row)=>({...r,row}))};
}
export function statisticalEligibility(doc,view){
 const bad=(zh,en)=>({valid:false,reason:t(zh,en)}),rows=doc?.data,family=statisticalFamily(view);
 if(!family||doc?.family!==family||!Array.isArray(rows)||!rows.length)return bad('请选择对应的完整原始记录。','Select the corresponding complete original records.');
 if(rows.some(r=>!text(r._id)||!text(r.label))||new Set(rows.map(recordId)).size!==rows.length||new Set(rows.map(r=>r.label)).size!==rows.length)return bad('每行需要唯一记录 ID 与编号，不删除重复原值。','Each row needs a unique record ID and label; repeated original values are retained.');
 if(!text(doc.unit)||!text(doc.source?.name))return bad('请声明原始测量单位和来源。','Declare the original measurement unit and source.');
 if(family==='statistical-survival'){
  if(rows.some(r=>!text(r.group)||!finite(r.duration)||r.duration<0||!['ended','censored'].includes(r.status)))return bad('时长须为有限非负原值，并明确分组和 ended / censored 状态。','Durations must be finite and nonnegative, with group and ended / censored status.');
  const parts=groups(rows),km=view==='stat-survival',min=km?6:4,max=km?40:120;
  if(parts.length<(km?2:1)||parts.length>4||parts.some(g=>g.length<min||g.length>max))return bad('分组容量不符：KM 为 2–4 组，每组 6–40；累积风险为 1–4 组，每组 4–120。','Capacity mismatch: KM uses 2–4 groups of 6–40; cumulative hazard uses 1–4 groups of 4–120.');
  if(rows.some(r=>r.entry!==undefined||r.start!==undefined||r.weight!==undefined||r.lower!==undefined||r.upper!==undefined))return bad('仅支持等权右删失，不支持左截断、区间删失或权重。','Only equal-weight right censoring is supported, without left truncation, interval censoring or weights.');
  return {valid:true,reason:''};
 }
 if(rows.some(r=>!finite(r.value)))return bad('每个样本须有有限完整原值；缺失不删行或补零。','Every sample needs a finite original value; missing rows are neither deleted nor zero-filled.');
 if(new Set(rows.filter(r=>r.group!==undefined).map(r=>r.group)).size>1)return bad('单变量系列仅接受一个群体，不自动合组。','The univariate series accepts one population; groups are not silently pooled.');
 const [min,max]={'stat-qq':[12,240],'stat-pp':[5,300],'stat-weibull':[5,300],'stat-meanexcess':[5,300],'stat-ttt':[5,300],'stat-lorenz':[3,300],'stat-ecdfband':[8,600]}[view];
 if(rows.length<min||rows.length>max)return bad('原始样本数超出此视图支持范围。','Original sample count is outside the supported range for this view.');
 if(rows.some(r=>r.weight!==undefined||r.censored===true||r.censored===1||r.event===0||r.status==='censored'))return bad('此系列只接受完整等权样本，不接受删失或带权记录。','This series accepts complete equally weighted samples, not censored or weighted records.');
 if(view==='stat-qq'&&!(deviation(rows,r=>r.value)>0))return bad('正态 Q–Q 参考需要正的样本标准差。','The normal Q–Q reference requires positive sample standard deviation.');
 if(view==='stat-pp'&&(!finite(doc.referenceMean)||!finite(doc.referenceSD)||doc.referenceSD<=0||!Number.isFinite(1/doc.referenceSD)))return bad('P–P 须显式填写 referenceMean 和正 referenceSD，不自动拟合。','P–P requires explicit referenceMean and positive referenceSD; no automatic fitting.');
 if(['stat-weibull','stat-ttt'].includes(view)&&rows.some(r=>r.value<=0))return bad('寿命变换仅支持完整正值，不替换零或负值。','Lifetime transforms require complete positive values; zeros and negative values are not replaced.');
 if(view==='stat-lorenz'&&(rows.some(r=>r.value<0)||!rows.some(r=>r.value>0)))return bad('洛伦兹曲线需要非负原值且总量为正。','Lorenz curves require nonnegative values and a positive total.');
 if(view==='stat-ecdfband'&&(!finite(doc.alpha)||doc.alpha<.001||doc.alpha>.5))return bad('DKW 的 alpha 须在 0.001–0.5 之间。','DKW alpha must be between 0.001 and 0.5.');
 if(view==='stat-meanexcess'&&(!Number.isInteger(doc.minExceedances)||doc.minExceedances<2||doc.minExceedances>=rows.length||!meanExcess15(rows,doc.minExceedances).length))return bad('minExceedances 至少为 2，且至少一个阈值保留足够的严格超额样本。','minExceedances must be at least 2, with at least one threshold retaining enough strictly exceeding observations.');
 return {valid:true,reason:''};
}
export function statisticalCompatibility(a,b){
 if(a?.family!==b?.family||!['statistical-observations','statistical-survival'].includes(a?.family))return t('原始记录结构不同','Different original record structures');
 if(a.unit!==b.unit||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('原始单位或来源不同','Original units or sources differ');
 const axes=new Set([...Object.keys(a.axes||{}),...Object.keys(b.axes||{})]);if([...axes].some(k=>a.axes?.[k]!==b.axes?.[k]))return t('指标坐标含义不同','Measurement-axis definitions differ');
 const signature=rows=>rows.map(recordId).sort();if(JSON.stringify(signature(a.data))!==JSON.stringify(signature(b.data)))return t('原始观测身份或样本群体改变','Original observation identities or population changed');
 if(a.family==='statistical-survival'){
  const parts=rows=>groups(rows).map(part=>part.map(recordId).sort()).sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
  if(JSON.stringify(parts(a.data))!==JSON.stringify(parts(b.data)))return t('持续记录分组成员改变','Duration-group membership changed');
  const status=new Map(a.data.map(r=>[recordId(r),r.status]));if(b.data.some(r=>status.get(recordId(r))!==r.status))return t('事件或删失状态改变，需重新核对在险集','Event or censor status changed; reassess the risk sets');
 }else if(['referenceMean','referenceSD','alpha','minExceedances'].some(k=>a[k]!==b[k]))return t('参考模型或摘要参数改变','Reference model or summary parameters changed');
 return '';
}
export function statisticalBounds(doc){
 if(doc.family==='statistical-survival')return {duration:[0,Math.max(...doc.data.map(r=>r.duration))],hazard:[0,Math.max(...nelson18(doc.data).flatMap(g=>g.points.map(p=>p.hazard)))]};
 const rows=statisticalOrdered(doc.data),qq=deviation(rows,r=>r.value)>0?qqRows(rows):[],weibull=rows.every(r=>r.value>0)?weibull15(rows):[],excess=meanExcess15(rows,doc.minExceedances);
 return {value:extent(rows,r=>r.value),theoretical:qq.length?extent(qq,r=>r.theoretical):extent(rows,r=>r.value),logValue:weibull.length?extent(weibull,r=>r.x):[0,1],weibull:weibull.length?extent(weibull,r=>r.y):[0,1],excess:[0,Math.max(0,...excess.map(p=>p.mean))]};
}
export function statisticalRecipe(){return {id:'statistical-coordinates',get name(){return t('原始观测连续换坐标','Continuous original-observation coordinates');},description:t('相同记录 ID 的原始点连续移动；派生均值、区间与阶梯有独立身份，不替代原样本。','Original points with the same record IDs move continuously; derived means, bands and steps have separate identities and never replace samples.')};}
export function statisticalGuide(doc,view){return [statisticalViews.find(v=>v.id===view)?.note||'',t('每行保留 label、原值与 _id；声明 unit、source、axes。重命名和重排不换身份，不删除重复或填补缺失。','Each row retains label, original values and _id; declare unit, source and axes. Renaming and reordering preserve identity, ties remain and missing values are never filled.'),doc.family==='statistical-survival'?t('duration 为时长，status 为 ended 或 censored；同刻先计事件，再移除全部同刻记录。KM=∏(1−d/n)，Nelson–Aalen=Σd/n；累积风险不是概率。','duration is elapsed time; status is ended or censored. Process tied events before all same-time withdrawals. KM=∏(1−d/n), Nelson–Aalen=Σd/n; cumulative hazard is not probability.'):t('Q–Q 用拟合正态及 (i−0.5)/n；P–P 用显式 referenceMean/referenceSD。Weibull 用 (i−0.3)/(n+0.4)。DKW 默认 alpha=0.05，平均超额默认 minExceedances=2；摘要不是原始观测。','Q–Q uses fitted-normal (i−0.5)/n; P–P uses explicit referenceMean/referenceSD. Weibull uses (i−0.3)/(n+0.4). Defaults: DKW alpha=0.05 and mean-excess minExceedances=2; summaries are not observations.'),t('中间帧表达坐标转换，停稳后读数；图形不替代显著性、拟合检验或因果分析。','Intermediate frames explain coordinate changes; read values after settling. Graphics do not replace significance, fit tests or causal analysis.')];}
export const statisticalGroupKey=rows=>populationId('sample-group',rows);
export function statisticalAgentGuide(english=false){
 const views=statisticalViews.map(v=>v.id).join(', ');
 return (english?'Use the existing FORMA player; do not recreate the renderer or crossfade independent charts. ':'使用现有 FORMA 播放器，不重新仿写或用独立图表淡入替代变形。')+views+'\n'+(english?'Preserve label/value or label/group/duration/status, _id, unit, source, axes, alpha, minExceedances and referenceMean/referenceSD. Never delete ties, pool groups, impute missing values or replace zero with epsilon. Original points retain stable recordId keys and raw editable values. Derived means, bands and cumulative links have separate identities and recordIds. Group colors use populationId(\'sample-group\',rows).\nQ–Q uses sample mean/SD and (i-.5)/n. P–P requires explicit referenceMean/referenceSD and right-continuous probabilities. Weibull accepts complete positive lifetimes and p=(i-.3)/(n+.4), without fitting. TTT=[sum(j<=i)t_j+(n-i)t_i]/sum(t). Lorenz uses equal-weight nonnegative cumulative resource shares, with uncorrected sample Gini. Mean-excess uses strictly x>u, minExceedances default 2, and a complete raw rug separate from threshold means. DKW epsilon=sqrt(log(2/alpha)/(2*n)), alpha default .05, is an IID simultaneous CDF band, not a mean confidence interval.\nFor right censoring, calculate tied events before all same-time withdrawals. KM=product(1-d/n); Nelson–Aalen=sum(d/n), not -log(S), and cumulative hazard is not probability. Preserve censor plus marks; no left truncation, interval censoring, weighting, smoothing or tail extrapolation. Units, sources, axes, identities, group membership and censor status must agree. Preserve reverse seeking, direct jumps, interrupted-frame continuity and HTML/SVG/video export through the original player.':'完整保留 label/value 或 label/group/duration/status、_id、unit、source、axes、alpha、minExceedances、referenceMean/referenceSD，不删重复、不合组、不补缺失、不把零替换成极小数。原始点保持 recordId 与原值编辑入口，派生均值、置信带、累计连线使用独立身份及 recordIds。组色使用 populationId(\'sample-group\',rows)。\nQ–Q 用样本均值/SD 及 (i−0.5)/n；P–P 需要显式 referenceMean/referenceSD，经验概率右连续。Weibull 仅用完整正寿命和 (i−0.3)/(n+0.4)，不拟合。TTT=[Σ(j≤i)t_j+(n−i)t_i]/Σt；Lorenz 用等权非负累计资源及未校正样本 Gini。平均超额仅用严格 x>u，minExceedances 默认 2，全部原样本留在短线带，与阈值均值分开。DKW epsilon=sqrt(log(2/alpha)/(2*n))，alpha 默认 0.05，是独立同分布样本的 CDF 同时带，不是均值区间。\n右删失同刻先计事件再移出全部记录，KM=∏(1−d/n)，Nelson–Aalen=Σd/n，不能用 −log(S) 替代，累积风险不是概率。删失点保留加号；不支持左截断、区间删失、权重、平滑或外推。单位、来源、坐标、身份、分组及删失状态须一致。倒放、跳步、中断连续接续及 HTML/SVG/视频均用原播放器。');
}

