import {extent} from 'd3';
import {isEnglish} from './locale.js';
import {recordId} from './data-identity.js';
import {validateDocument} from './data.js';
import {proportion11,defects11,cusum11,ewma11,xbar11,plotRange11,volume11MethodNotes} from './volume11-data.js';
import {funnelLimits16,volume16MethodNotes} from './volume16-data.js';
export const qualityText=(zh,en)=>isEnglish()?en:zh;
const t=qualityText,view=(id,family,zh,en,note,english)=>({id,family,get name(){return t(zh,en);},en,get note(){return t(note,english);}});
export const qualityViews=[
 view('quality-proportion','quality-proportion','批次不合格比例','Batch nonconforming proportions','按原批次顺序展示加权基线及各批样本量对应的界限。','Retain batch order, the weighted baseline and limits for each batch sample size.'),
 view('quality-proportion-size','quality-proportion','样本量与不合格比例','Sample size and nonconforming proportions','同一批次移动到实际检查件数坐标，保留本批控制区间，便于核查小样本波动。','Move the same batches to inspected-unit coordinates, retaining each control interval to inspect small-sample variation.'),
 view('quality-defects','quality-defects','批次单位缺陷率','Batch defect intensities','缺陷事件数除以实际暴露量；不是不合格件比例。','Divide defect events by actual exposure; this is not a proportion of nonconforming items.'),
 view('quality-defects-exposure','quality-defects','暴露量与缺陷率','Exposure and defect intensity','横轴改为同口径实际暴露量，观察不同检查规模下的波动。','Use actual exposure in a common unit on X to inspect variation at different inspection scales.'),
 view('quality-cusum','quality-cusum','双侧累计漂移','Two-sided cumulative drift','C⁺ 与 −C⁻ 保留全部历史，达到 H 后不自动归零。','C⁺ and −C⁻ retain the complete history and do not reset after crossing H.'),
 view('quality-cusum-contributions','quality-cusum','单次超额与累计来源','Individual excess behind accumulation','展示 max(0,z−K) 与 −max(0,−z−K)；这是单次超额，不能直接相加代替含回落与归零的 CUSUM。','Show max(0,z−K) and −max(0,−z−K): individual excess, not a substitute for the CUSUM recurrence with decreases and a zero floor.'),
 view('quality-ewma','quality-ewma','原始测量与加权轨迹','Raw measurements and EWMA','原始值与 EWMA 明确区分，保留独立基线与启动期控制限。','Distinguish raw measurements from EWMA, retaining the independent baseline and startup limits.'),
 view('quality-ewma-decomposition','quality-ewma','加权偏移与当期偏离','Smoothed drift and current departure','原始偏离 value−target = (EWMA−target) + (value−EWMA)；分解坐标不使用控制限。','Raw departure value−target = (EWMA−target) + (value−EWMA); decomposition coordinates carry no control limits.'),
 view('quality-xbar','quality-xbar','子组均值与极差','Subgroup means and ranges','保留每组原始样本，上方面板均值，下方面板极差。','Retain every raw sample, with means above and ranges below.'),
 view('quality-subgroup-residuals','quality-xbar','组内偏离与极差','Within-subgroup departures and ranges','原样本减去自己的子组均值，观察组内差异；极差保持不变，上方面板不把均值控制限当个体界限。','Subtract each sample’s own subgroup mean to inspect within-group differences; retain ranges and do not use mean-control limits for individuals.'),
 view('quality-funnel','quality-funnel','规模与事件比例','Size and event proportion','以完整样本量和事件比例显示显式目标附近的近似二项控制限。','Show complete sample sizes and event proportions with approximate binomial limits around an explicit target.'),
 view('quality-funnel-standardized','quality-funnel','规模与标准化偏离','Size and standardized departure','按各单位的二项标准误标准化偏离，保留截至 [0,1] 后的对应界限。','Standardize departures by each unit’s binomial standard error, retaining transformed limits clipped to [0,1].')
];
export const qualityViewMap={pcontrol:'quality-proportion',ucontrol:'quality-defects',cusum:'quality-cusum',ewma:'quality-ewma',xbar:'quality-xbar',funnelcontrol:'quality-funnel'};
const info=new Map(qualityViews.map(v=>[v.id,v])),nativeByFamily=Object.fromEntries(Object.entries(qualityViewMap).map(([native,id])=>[info.get(id).family,native]));
export const isQualityView=id=>info.has(id);
export const qualityFamily=id=>info.get(id)?.family;
export function qualityDocument(doc,common={}){const family=qualityFamily(qualityViewMap[doc?.template]);return family?{...doc,...common,family,data:doc.data.map((r,row)=>({...r,row}))}:null;}
export function qualityEligibility(doc,id){
 const bad=(zh,en)=>({valid:false,reason:t(zh,en)}),family=qualityFamily(id);
 if(!family||doc?.family!==family||!Array.isArray(doc.data)||!doc.data.length||doc.data.some(r=>!r||typeof r!=='object'))return bad('请选择对应质量过程的完整原始记录。','Select complete original records for the corresponding quality process.');
 if(doc.data.some(r=>typeof r._id!=='string'||!r._id)||new Set(doc.data.map(recordId)).size!==doc.data.length)return bad('每条记录需要稳定、唯一的 _id。','Every record needs a stable unique _id.');
 const check=validateDocument({...doc,template:nativeByFamily[family]});if(!check.valid)return {valid:false,reason:check.errors.join(' ')};
 if(doc.data.some(r=>r.weight!==undefined||r.censored===true||r.status==='censored'))return bad('本契约不接受额外权重或删失字段，不自动忽略其含义。','This contract does not accept additional weights or censoring; their meaning is not silently ignored.');
 // Native p/X-bar validators establish the count/subgroup contract. Check the
 // derived coordinate spans too, without truncating otherwise valid originals.
 if(Object.values(qualityBounds(doc)).some(values=>!plotRange11(values)))return bad('原值或派生坐标的跨度无法有限显示，请核对单位和基线。','Original or derived spans cannot be represented finitely; check units and baselines.');
 return {valid:true,reason:''};
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function qualityCompatibility(a,b){
 if(a?.family!==b?.family)return t('质量过程与原始数据契约不同。','Quality processes and original-data contracts differ.');
 if(a.unit!==b.unit||!same(a.axes,b.axes)||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('单位、变量含义或数据来源改变。','Units, variable meanings or data sources changed.');
 if(['target','sigma','referenceK','decisionH','lambda','limitSigma','targetRate','baselineName','processName','exposureUnit'].some(k=>a[k]!==b[k]))return t('过程、独立基线或控制参数改变。','The process, independent baseline or control parameters changed.');
 if(!same(a.data.map(recordId),b.data.map(recordId)))return t('原记录集合或采集顺序改变；不强行连接不同历史。','Original records or acquisition order changed; different histories are not forced into a continuous match.');
 if(a.family==='quality-xbar'){
  const membership=d=>xbar11(d.data).groups.map(g=>g.rows.map(recordId));
  if(!same(membership(a),membership(b)))return t('子组成员或子组顺序改变。','Subgroup membership or order changed.');
 }
 return '';
}
const range=values=>extent(values),span=(...values)=>range(values.flat());
export function qualityBounds(doc){
 const rows=doc.data,order=[0,Math.max(1,rows.length-1)];
 if(['quality-proportion','quality-defects'].includes(doc.family)){
  const p=doc.family==='quality-proportion',stats=(p?proportion11:defects11)(rows),field=p?'sampleSize':'exposure';
  return {order,rate:span(0,stats.center,stats.points.flatMap(p=>[p.value,p.low,p.high])),denominator:range(rows.map(r=>r[field]))};
 }
 if(doc.family==='quality-cusum'){const points=cusum11(doc);return {order,cumulative:span(0,-doc.decisionH,doc.decisionH,points.flatMap(p=>[p.upper,-p.lower])),contribution:span(0,points.flatMap(p=>[Math.max(0,p.z-doc.referenceK),-Math.max(0,-p.z-doc.referenceK)])),standardized:span(0,points.map(p=>p.z))};}
 if(doc.family==='quality-ewma'){const points=ewma11(doc);return {order,measurement:span(doc.target,rows.map(r=>r.value),points.flatMap(p=>[p.value,p.low,p.high])),decomposition:span(0,points.flatMap(p=>[p.value-doc.target,p.row.value-p.value]))};}
 if(doc.family==='quality-xbar'){const s=xbar11(rows);return {order:[0,Math.max(1,s.groups.length-1)],measurement:span(s.low,s.high,rows.map(r=>r.value)),within:span(0,s.groups.flatMap(g=>g.rows.map(r=>r.value-g.mean))),range:span(0,s.rangeLow,s.rangeHigh,s.groups.map(g=>g.range))};}
 const points=rows.map(r=>{const se=Math.sqrt(doc.targetRate*(1-doc.targetRate)/r.total),limits=funnelLimits16(r.total,doc.targetRate,doc.limitSigma);return {rate:r.events/r.total,se,...limits};});
 return {order,denominator:range(rows.map(r=>r.total)),rate:span(doc.targetRate,points.flatMap(p=>[p.rate,p.low,p.high])),standardized:span(0,points.flatMap(p=>[p.rate,p.low,p.high].map(v=>(v-doc.targetRate)/p.se)))};
}
// Colors indicate statistics and control status, not user-defined categories.
export const qualityColorKeys=()=>[];
export const qualityColorSubjects=()=>[];
export function qualityRecipe(){return {id:'quality-process-coordinates',get name(){return t('原始质量记录连续换坐标','Continuous original quality-record coordinates');},description:t('同一原记录与派生统计量各自保持身份，界限按原公式更新，变化坐标不覆盖原值。','Original records and derived statistics retain separate identities. Limits follow the original formula and changing coordinates never overwrites raw values.')};}
export function qualityGuide(doc,id){return [info.get(id)?.note||'',...(doc.template==='funnelcontrol'?volume16MethodNotes('funnelcontrol'):volume11MethodNotes(nativeByFamily[doc.family])),t('保留 _id、全部原字段、采集顺序、子组成员、source、unit 和基线参数。编辑入口只改原始计数或测量，派生坐标和聚合值不伪装成新观测。','Preserve _id, all raw fields, acquisition order, subgroup membership, source, unit and baseline parameters. Editors change only raw counts or measurements; derived coordinates and aggregates never impersonate new observations.'),t('控制限不是规格限或置信区间。备选分解坐标不重新报警；中间帧只表达转换，停稳后读数。','Control limits are not specification limits or confidence intervals. Alternative decomposition coordinates introduce no new alarm rules. Intermediate frames show a transformation; read settled values.')];}
export function qualityAgentGuide(english=false){return (english?'Use the original FORMA renderer: ':'使用原版 FORMA 渲染器：')+qualityViews.map(v=>v.id).join(', ')+'\n'+(english?'Preserve every _id, raw count/measurement, source, unit, axes, chronological order and X-bar subgroup membership. Keep target, sigma, referenceK, decisionH, lambda, limitSigma, targetRate, baselineName, processName and exposureUnit when supplied. Never refit an external baseline, impute nulls, reorder time, remove rows or overwrite raw fields. p and u baselines use ratio-of-sums, not mean ratios. CUSUM starts from zero, keeps complete prefixes and never resets after H; the alternative max(0,z−K), −max(0,−z−K) shows individual excess only, not their direct sum as CUSUM; retain signed decreases and the zero floor in the recurrence, without H alarm claims for individual excess. EWMA starts at target, retains startup limits and decomposes value−target=(EWMA−target)+(value−EWMA) without new control limits. X-bar uses equal original subgroup sizes and conventional A2/D3/D4; centering samples retains their own subgroup mean and does not apply mean limits to individuals. Funnel uses the supplied targetRate and clipped binomial normal limits; transform those exact limits when standardizing, rather than always replacing them with ±limitSigma. Original marks keep recordId and original editable field; aggregates/prefixes keep separate populationId and recordIds. Keep persistent geometry, exact endpoints, reverse seeks, interrupted resumption and original HTML/SVG/video export.':'保留每条 _id、原始计数/测量、source、unit、axes、采集顺序与 X-bar 子组成员。保留已提供的 target、sigma、referenceK、decisionH、lambda、limitSigma、targetRate、baselineName、processName、exposureUnit。不重新拟合外部基线，不补null、不重排时间、不删行、不把派生值写回原表。p/u 基线使用总分子除总分母，不用比例简单均值。CUSUM从零开始、包含完整历史，越过H后不重置；备选max(0,z−K)与−max(0,−z−K)只是单次超额，不能直接相加代替含回落和零下限的递推，不套用H报警。EWMA从target启动并保留启动界限；value−target=(EWMA−target)+(value−EWMA)分解不新增控制限。X-bar使用同样本量原始子组及常规A2/D3/D4，原点减去自己的子组均值，不能把均值控制限用于个体。漏斗使用明确targetRate及截至[0,1]的二项正态近似界限，标准化时转换这些原界限，不一律替换成±limitSigma。原点保持recordId和原字段编辑入口，聚合/前缀统计独立populationId、recordIds。保留持久轮廓、精确端点、倒放、中断接续及原版HTML/SVG/视频导出。');}
