import {extent} from 'd3';
import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {delta12,ecdfDifference12} from './volume12-data.js';
import {rootogram17,spreadLevel17,worm17} from './volume17-data.js';
export const comparisonText=(zh,en)=>isEnglish()?en:zh;
const t=comparisonText,uniq=a=>[...new Set(a)],finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15,text=v=>typeof v==='string'&&!!v.trim();
const view=(id,family,zh,en,note,english)=>({id,family,get name(){return t(zh,en);},en,get note(){return t(note,english);}});
export const comparisonViews=[
 view('compare-qq','comparison-samples','双样本分位对应','Two-sample quantile correspondence','同概率的 Type 7 分位数比较；原样本留在两个边缘，不制造观测配对。','Compare Type 7 quantiles at matching probabilities; all observations remain in two marginal rugs, without invented pairs.'),
 view('compare-delta','comparison-samples','分位差异展开','Quantile difference unfolding','第二组减第一组，分位差保留原始单位；下方保留全部独立样本。','Second group minus first, retaining the measurement unit; every independent observation remains below.'),
 view('compare-ecdf','comparison-samples','累计覆盖差异','Cumulative coverage difference','右连续 F_B−F_A 保留并列值质量；最大差 D 仅为描述性统计。','Right-continuous F_B−F_A retains all tied mass; maximum difference D is descriptive only.'),
 view('compare-rootogram','comparison-counts','悬挂根频数','Hanging root counts','柱顶为 √E，柱高为 √O，柱底为 √E−√O；期望来自声明的外部模型。','Bars begin at √E, have height √O and end at √E−√O; expectations come from the declared external model.'),
 view('compare-counts','comparison-counts','观察与期望端点','Observed and expected endpoints','同一箱的观察与期望回到原计数尺度；实心为观察、空心为期望。','Observed and expected values of each bin return to the original count scale; filled means observed and hollow means expected.'),
 view('compare-worm','comparison-residuals','去趋势残差分位','Detrended residual quantiles','固定 N(0,1) 理论分位数，纵轴为已标准化残差减理论分位数。','Use fixed N(0,1) theoretical quantiles; Y is the supplied standardized residual minus its theoretical quantile.'),
 view('compare-residual-qq','comparison-residuals','标准残差分位对应','Standard residual quantile correspondence','保留外部模型提供的标准残差，比较固定标准正态分位数，不重新拟合。','Retain external standardized residuals and compare with fixed standard-normal quantiles, without refitting.'),
 view('compare-spreadlevel','comparison-spread','组水平与离散度','Group level and spread','log₁₀ 中位数与 log₁₀ IQR；拟合线只描述组摘要关系，全部原值在下方保留。','Plot log10 median versus log10 IQR; the fitted line only describes group summaries, with all raw values retained below.'),
 view('compare-group-intervals','comparison-spread','分组原值与四分位距','Grouped observations and IQR','原始值、中位数及 Q25–Q75 同单位展开；区间是样本分位数，不是置信区间。','Unfold raw values, medians and Q25–Q75 in the same unit; these are sample quantile intervals, not confidence intervals.')
];
export const comparisonViewMap={qqcompare:'compare-qq',deltaplot:'compare-delta',ecdfdiff:'compare-ecdf',rootogram:'compare-rootogram',worm:'compare-worm',spreadlevel:'compare-spreadlevel'};
const info=new Map(comparisonViews.map(v=>[v.id,v]));
export const isComparisonView=v=>info.has(v);
export const comparisonFamily=v=>info.get(v)?.family;
export const comparisonGroupKey=rows=>populationId('sample-group',rows);
const completeGroupOrder=(doc,names=uniq(doc.data.map(r=>r.group)))=>Array.isArray(doc.groupOrder)&&doc.groupOrder.length===names.length&&new Set(doc.groupOrder).size===names.length&&doc.groupOrder.every(g=>names.includes(g));
export function comparisonGroups(doc){
 const names=uniq(doc.data.map(r=>r.group)),order=completeGroupOrder(doc,names)?doc.groupOrder:names;
 // Invalid metadata must never drop rows or create empty populations while
 // editing. Eligibility still rejects the view until its order is repaired.
 return order.map(g=>doc.data.filter(r=>r.group===g));
}
export function comparisonDocument(doc,common={}){
 const family=comparisonFamily(comparisonViewMap[doc.template]);if(!family)return null;
 return {...doc,...common,family,...(family==='comparison-counts'?{}:{groupOrder:doc.groupOrder===undefined?uniq(doc.data.map(r=>r.group)):doc.groupOrder}),data:doc.data.map((r,row)=>({...r,row}))};
}
export function comparisonEligibility(doc,view){
 const bad=(zh,en)=>({valid:false,reason:t(zh,en)}),family=comparisonFamily(view),rows=doc?.data;
 if(!family||family!==doc?.family||!Array.isArray(rows)||!rows.length)return bad('请选择对应系列的完整原表。','Choose the complete original table for this series.');
 if(rows.some(r=>!text(r._id)||!text(r.label))||new Set(rows.map(recordId)).size!==rows.length||new Set(rows.map(r=>r.label)).size!==rows.length)return bad('每条原始记录需要唯一编号与 _id。','Each original record needs a unique label and _id.');
 if(!text(doc.unit)||!text(doc.source?.name))return bad('请保留原始单位及来源。','Retain the original unit and source.');
 if(family==='comparison-counts'){
  if(rows.length<4||rows.length>32||!text(doc.modelName)||rows.some(r=>!Number.isSafeInteger(r.observed)||r.observed<0||r.observed>1e15||!finite(r.expected)||r.expected<0)||!rows.some(r=>r.observed>0||r.expected>0))return bad('需要 4–32 个箱、非负整数观察频数、非负期望以及外部模型名，不能全为零。','Require 4–32 bins, nonnegative integer observations, nonnegative expectations and an external model name; counts cannot all be zero.');
  return {valid:true,reason:''};
 }
 const names=uniq(rows.map(r=>r.group));
 if(names.some(g=>!text(g))||!completeGroupOrder(doc,names))return bad('声明完整且不重复的分组顺序。','Declare a complete nonrepeating group order.');
 const parts=comparisonGroups(doc),field=family==='comparison-residuals'?'stdResidual':'value';
 if(rows.some(r=>!finite(r[field])||r.weight!==undefined||r.status==='censored'||r.censored===true))return bad('需要完整等权原值，不删缺失、不补零，也不合并分组。','Complete equally weighted originals are required; do not drop missing values, fill zeros or pool groups.');
 if(family==='comparison-samples'){
  const min=view==='compare-qq'?8:5;if(parts.length!==2||parts.some(p=>p.length<min||p.length>300))return bad('双样本系列须恰好两组；Q–Q 每组 8–300 个，其余每组 5–300 个完整原值。','Two-sample views require exactly two groups: 8–300 per group for Q–Q and 5–300 otherwise.');
 }else if(family==='comparison-residuals'){
  if(!text(doc.modelName)||parts.length>4||parts.some(p=>p.length<8||p.length>180))return bad('残差系列需要外部模型名以及 1–4 层、每层 8–180 个已标准化残差。','Residual views require an external model name and 1–4 strata of 8–180 standardized residuals each.');
 }else{
  if(parts.length<3||parts.length>10||parts.some(p=>p.length<8||p.length>100)||rows.some(r=>r.value<=0))return bad('离散度系列须 3–10 组，每组 8–100 个正原值。','Spread views require 3–10 groups of 8–100 positive observations.');
  const model=spreadLevel17(doc);if(model.points.some(p=>!(p.iqr>0))||new Set(model.points.map(p=>p.median)).size<2||!Number.isFinite(model.fit.slope))return bad('每组 IQR 必须为正且至少两组中位数不同。','Each group needs a positive IQR and at least two group medians must differ.');
 }
 return {valid:true,reason:''};
}
export function comparisonCompatibility(a,b){
 if(a?.family!==b?.family)return t('原始数据结构不同。','Original data structures differ.');
 if(a.family!=='comparison-counts'&&(!completeGroupOrder(a)||!completeGroupOrder(b)))return t('分组顺序尚未覆盖全部原记录。','Group order does not yet cover all original records.');
 if(a.unit!==b.unit||a.modelName!==b.modelName||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k])||uniq([...Object.keys(a.axes||{}),...Object.keys(b.axes||{})]).some(k=>a.axes?.[k]!==b.axes?.[k]))return t('原值单位、模型、来源或变量含义不同。','Original units, model, sources or variable meanings differ.');
 if(JSON.stringify(a.data.map(recordId).sort())!==JSON.stringify(b.data.map(recordId).sort()))return t('原始记录身份集合改变。','Original record populations changed.');
 if(a.family!=='comparison-counts'&&JSON.stringify(comparisonGroups(a).map(comparisonGroupKey))!==JSON.stringify(comparisonGroups(b).map(comparisonGroupKey)))return t('分组归属或差异方向改变。','Group membership or comparison direction changed.');
 return '';
}
export function comparisonBounds(doc){
 if(doc.family==='comparison-counts'){const model=rootogram17(doc);return {count:[0,Math.max(...doc.data.flatMap(r=>[r.observed,r.expected]))],root:extent([0,...model.flatMap(p=>[p.expectedRoot,p.difference])])};}
 if(doc.family==='comparison-residuals'){const points=worm17(doc).flatMap(g=>g.points);return {residual:extent(doc.data,r=>r.stdResidual),normal:extent(points,p=>p.theoretical),deviation:extent([0,...points.map(p=>p.deviation)])};}
 const value=extent(doc.data,r=>r.value);
 if(doc.family==='comparison-spread'){const m=spreadLevel17(doc);return {value,level:extent(m.points,p=>p.x),spread:extent(m.points,p=>p.y)};}
 const parts=comparisonGroups(doc);
 // During an invalid split/merge, provide safe non-statistical bounds rather
 // than silently comparing only the first two of several populations.
 if(parts.length!==2)return {value,delta:[0,1],cdf:[-1,1]};
 const ordered={...doc,data:parts.flat()},delta=delta12(ordered.data),cdf=ecdfDifference12(ordered.data);
 return {value,delta:extent([0,...delta.points.map(p=>p.difference)]),cdf:[-Math.max(.05,cdf.maxDifference),Math.max(.05,cdf.maxDifference)]};
}
export function comparisonColorKeys(doc){const groups=doc.family==='comparison-counts'?null:new Map(comparisonGroups(doc).map(rows=>[rows[0].group,comparisonGroupKey(rows)]));return doc.data.map(r=>groups?groups.get(r.group):recordId(r));}
export function comparisonRecipe(){return {id:'comparison-coordinates',get name(){return t('原始记录与比较坐标连续流转','Continuous original records and comparison coordinates');},description:t('原记录与派生摘要使用不同身份；同一轮廓连续换坐标，始终保留原值编辑入口。','Original records and derived summaries use separate identities; the same contours change coordinates continuously while retaining original-value editing.')};}
export function comparisonGuide(doc,view){
 const methods={
  'comparison-samples':t('QQ 分位网格为 0.025…0.975；差异网格为 0.05…0.95，均为 Type 7。累计差为右连续 F_B−F_A，D 仅为描述性统计。摘要关联全部原记录，不把分位点当成观测配对。','QQ uses 0.025…0.975 and quantile differences use 0.05…0.95, both Type 7. Cumulative differences are right-continuous F_B−F_A; D is descriptive. Summaries reference all original records, without treating quantiles as paired observations.'),
  'comparison-counts':t('观察频数 observed 是非负整数；expected 为声明模型提供的非负期望，不在图内拟合。悬挂柱底是 √expected−√observed，不是 Pearson 残差。零频数保留原值编辑入口。','Observed counts are nonnegative integers; expected counts come from the declared model, without fitting here. Hanging-bar bottoms are √expected−√observed, not Pearson residuals. Zero counts retain original-value editing.'),
  'comparison-residuals':t('stdResidual 是外部模型已标准化残差，modelName 明确其来源。每层按残差排序，p=(i−0.5)/n；使用固定 N(0,1)，不重新拟合，也不绘制未计算的包络。','stdResidual contains externally standardized model residuals identified by modelName. Sort within strata and use p=(i−0.5)/n against fixed N(0,1), without refitting or uncomputed envelopes.'),
  'comparison-spread':t('Type 7 中位数、Q25、Q75 和 IQR 保留原始单位；双对数图使用 log10 中位数与 IQR。OLS 仅描述组摘要关系，不是稳健拟合、置信区间或方差齐性检验。','Type 7 median, Q25, Q75 and IQR retain original units; the log–log plot uses log10 median and IQR. OLS only describes group summaries, without robust fitting, confidence intervals or variance-homogeneity tests.')
 };
 return [info.get(view)?.note||'',t('保留每行 _id、原始字段、unit、source、axes 和明确的 groupOrder；残差与期望还需 modelName。重排不改变记录身份，不删重复、不填补缺测。','Retain each _id, original fields, unit, source, axes and explicit groupOrder; residuals and expectations also need modelName. Reordering retains identity; keep ties and never impute missing values.'),methods[doc.family]||'',t('原记录与派生摘要各有身份；全部原值可编辑，摘要仅关联其来源记录。中间帧用于展示转换，停稳后读数。','Original records and derived summaries have separate identities. Every original value remains editable; summaries only link to their source records. Read values after the morph settles.')];
}
export function comparisonAgentGuide(english=false){return (english?'Use the original FORMA player and views: ':'使用原版 FORMA 播放器及视图：')+comparisonViews.map(v=>v.id).join(', ')+ '\n'+(english?'Keep _id, label/group/value, observed/expected or stdResidual, unit, source, axes, modelName and groupOrder. Preserve every raw record and editable field, including ties and zero counts. Never pool groups, impute missing values or manufacture pairs. Group colors use populationId(\'sample-group\', rows); count-bin colors use recordId. Derived quantiles, group summaries and CDFs use separate keys plus recordIds, not editable original values. QQ is Type 7 p=.025,.05,…,.975; delta is Q_B-Q_A at p=.05,.10,…,.95; F_B-F_A is right-continuous at pooled values, with descriptive D only. The two marginal samples are independent, not observed pairs. Rootograms use sqrt(E)-sqrt(O), supplied modelName and expectations; filled observed versus hollow expected markers retain their distinction. Worm uses externally standardized residuals minus fixed N(0,1) quantiles p=(i-.5)/n, without fitting. Spread-level is log10(median) versus log10(IQR); its OLS line is descriptive, not a test or confidence interval. All raw values remain visible in a separate original-unit rug. Keep persistent raw and auxiliary contour roles in every view, reverse seeking, direct jumps and interrupted-frame continuity. Use original HTML/SVG/video export.':'保留 _id、label/group/value、observed/expected 或 stdResidual、unit、source、axes、modelName 与 groupOrder。完整保留原记录及编辑字段，包括重复值和零计数。不合组、不补缺失、不制造观测配对。组色用 populationId(\'sample-group\',rows)，计数箱用 recordId。派生分位、组摘要与 CDF 使用独立 key 和 recordIds，不冒充可编辑原值。QQ 为 Type 7 p=.025,.05,…,.975；差异为 p=.05,.10,…,.95 的 Q_B−Q_A；F_B−F_A 在合并原值处右连续，D 仅描述。两个边缘样本互相独立，不是观测配对。悬挂根图为 sqrt(E)−sqrt(O)，必须保留外部 modelName 与期望；实心观察和空心期望标记保持区别。Worm 使用已标准化外部残差减固定 N(0,1) 分位 p=(i−.5)/n，不重新拟合。离散度为 log10中位数与 log10 IQR，OLS 只描述摘要关系，不是检验或置信区间。全部原值仍在独立原单位短线带可见。各视图都保留原值与辅助轮廓角色，支持倒放、跳步和中断连续接续，使用原版 HTML/SVG/视频导出。');}
