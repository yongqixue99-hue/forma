import {extent,max,median} from 'd3';
import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {validateDocument} from './data.js';
import {groupStats,manhattanLayout} from './volume8-data.js';
import {taylor14,target14,volume14MethodNotes} from './volume14-data.js';
import {volume15MethodNotes} from './volume15-data.js';
export const completionResearchText=(zh,en)=>isEnglish()?en:zh;
const t=completionResearchText,unique=items=>[...new Set(items)],specs=[
 ['volcano','火山图','Volcano plot','横置差异证据','Horizontal differential evidence','log₂FC 与 −log₁₀ padj 连续转向 90°；备选纵轴从上到下递增，预设筛选和原始校正 p 值不变。','Rotate the display axes for log₂FC and −log₁₀ padj by 90°; the alternate vertical axis increases downwards. Retain original adjusted p-values and explicit thresholds.'],
 ['ma','MA 图','MA plot','横置表达量','Horizontal expression levels','平均表达量保持真实对数轴；备选表达量纵轴从上到下递增，倍数变化与原 padj 不变。','Retain the actual logarithmic mean-expression axis; the alternate expression axis increases downwards. Fold changes and original padj remain unchanged.'],
 ['dose','剂量响应','Dose response','横置剂量响应','Horizontal dose response','每个重复原值与均值 ± 样本 SD 一起旋转；备选剂量纵轴从上到下递增，只连接均值，不拟合 4PL。','Rotate every original replicate together with mean ± sample SD; the alternate dose axis increases downwards. Connect means without fitting 4PL.'],
 ['enrichment','富集比例气泡','Enrichment-ratio bubbles','富集命中气泡','Enrichment-count bubbles','横轴在 count/total 与 count 间切换；面积始终为 count，颜色始终为 −log₁₀ padj。','Switch X between count/total and count; bubble area remains count and color remains −log₁₀ padj.'],
 ['manhattan','曼哈顿图','Manhattan plot','横置基因组证据','Horizontal genomic evidence','保持染色体顺序、真实 bp 长度和间隔；备选物理位置纵轴从上到下递增，连续转向 90°。','Retain chromosome order, actual bp lengths and gaps; rotate the display axes by 90° with the alternate physical-position axis increasing downwards.'],
 ['lexis','Lexis 生命线','Lexis lifelines','出生队列生命线','Birth-cohort lifelines','出生年=entryPeriod−entryAge；同一生命线切换到出生队列与真实日历年。','Birth year=entryPeriod−entryAge; move the same lifeline to birth-cohort and calendar-year coordinates.'],
 ['swimmer','个体观察泳道','Individual observation lanes','竖置观察泳道','Vertical observation lanes','保留原始 start/end、首次 response、null 与 ongoing 标记，不延伸虚构未来。','Retain original start/end, first response, nulls and ongoing markers without inventing future intervals.'],
 ['eventhistory','状态历程泳道','State-history lanes','竖置状态历程','Vertical state histories','原 [start,end) 区间旋转，状态颜色一致，空档仍留白。','Rotate original [start,end) intervals, retain state colors and leave unrecorded gaps blank.'],
 ['biplot','PCA 得分与载荷','PCA scores and loadings','PCA 旋转坐标','Rotated PCA coordinates','PC2 为横轴、−PC1 为纵轴，原 PC 平面连续旋转 90°；外部得分、载荷、loadingScale 与 scaling 不变。','Use PC2 on X and −PC1 on Y to continuously rotate the PC plane by 90° while preserving supplied scores, loadings, loadingScale and scaling.'],
 ['taylor','泰勒图','Taylor diagram','相关与标准差比','Correlation and SD ratio','同一模型从泰勒极坐标移到 correlation 与 sd/referenceSD；不补均值偏差。','Move the same models from Taylor coordinates to correlation versus sd/referenceSD without inventing mean bias.'],
 ['targetdiagram','目标图','Target diagram','标准差比与偏差','SD ratio and bias','同一模型从带符号中心 RMSE 移到标准差比；气泡大小辅助显示原中心 RMSE 比，零值保留可见小标记。','Move the same models from signed centered RMSE to SD ratio; bubble size additionally shows the original centered-RMSE ratio, with a visible small marker for zero.'],
 ['youden','Youden 配对测量','Youden paired measurements','均值与样本差','Means and sample differences','同一实验室 A/B 转为 (A+B)/2 与 A−B；不新增一致性界限或判定。','Transform the same laboratory A/B measurements to (A+B)/2 and A−B without adding agreement limits or decisions.']
];
export const completionResearchViews=specs.flatMap(([id,zh,en,azh,aen,note,english])=>[false,true].map(alt=>({id:'complete-research-'+id+(alt?'-alternate':''),family:'complete-research-'+id,en:alt?aen:en,get name(){return t(alt?azh:zh,alt?aen:en);},get note(){return t(note,english);}})));
export const completionResearchViewMap=Object.fromEntries(specs.map(([id])=>[id,'complete-research-'+id]));
const info=new Map(completionResearchViews.map(v=>[v.id,v])),nativeMap=new Map(specs.map(([id])=>['complete-research-'+id,id]));
export const isCompletionResearchView=view=>info.has(view);
export const completionResearchFamily=view=>info.get(view)?.family;
export function completionResearchDocument(doc,common={}){const family=completionResearchFamily(completionResearchViewMap[doc?.template]);return family?{...doc,...common,family,data:doc.data.map((r,row)=>({...r,row}))}:null;}
export const completionResearchOrderFields=()=>({});
const ex=values=>{const finite=values.filter(Number.isFinite);return finite.length?extent(finite):[0,1];};
export function completionResearchBounds(doc){
 const rows=doc.data,template=nativeMap.get(doc.family)||doc.template;
 if(template==='volcano')return {fold:ex([-doc.fcThreshold*1.4,doc.fcThreshold*1.4,...rows.map(r=>r.log2FC)]),evidence:[0,Math.max(-Math.log10(doc.qThreshold)*1.2,...rows.map(r=>-Math.log10(r.padj)))]};
 if(template==='ma')return {expression:ex(rows.map(r=>r.mean)),fold:ex([0,...rows.map(r=>r.log2FC)])};
 if(template==='dose'){const g=groupStats(rows,'dose');return {dose:ex(rows.map(r=>r.dose)),response:ex([...rows.map(r=>r.value),...g.flatMap(r=>[r.mean-r.sd,r.mean+r.sd])])};}
 if(template==='enrichment')return {ratio:[0,max(rows,r=>r.count/r.total)],count:[0,max(rows,r=>r.count)],evidence:[0,max(rows,r=>-Math.log10(r.padj))]};
 if(template==='manhattan'){const m=manhattanLayout(doc);return {position:[0,m.total],evidence:[0,Math.max(-Math.log10(doc.threshold)*1.1,max(m.points,r=>r.y)*1.12)]};}
 if(template==='lexis')return {period:ex(rows.flatMap(r=>[r.entryPeriod,r.exitPeriod])),age:ex(rows.flatMap(r=>[r.entryAge,r.entryAge+r.exitPeriod-r.entryPeriod])),birth:ex(rows.map(r=>r.entryPeriod-r.entryAge))};
 if(template==='swimmer'||template==='eventhistory')return {time:ex(rows.flatMap(r=>[r.start,r.end]))};
 if(template==='biplot'){const limit=max(rows,r=>Math.max(Math.abs(r.x),Math.abs(r.y))*(r.kind==='loading'?doc.loadingScale:1))*1.23||1;return {component:[-limit,limit]};}
 if(template==='taylor'){const m=taylor14(doc);return {ratio:[0,Math.max(1.2,max(m,r=>r.ratio)*1.17)],correlation:[-1,1]};}
 if(template==='targetdiagram'){const m=target14(doc);return {normalized:[0,Math.max(1.2,...m.flatMap(r=>[Math.abs(r.x),Math.abs(r.y)]))*1.24],ratio:ex([1,...rows.map(r=>r.sd/doc.referenceSD)]),centered:[0,max(rows,r=>r.centeredRMSE/doc.referenceSD)]};}
 const ma=median(rows,r=>r.sampleA),mb=median(rows,r=>r.sampleB),span=Math.max(max(rows,r=>Math.abs(r.sampleA-ma)),max(rows,r=>Math.abs(r.sampleB-mb)))*1.22;
 return {sampleA:[ma-span,ma+span],sampleB:[mb-span,mb+span],mean:ex(rows.map(r=>r.sampleA/2+r.sampleB/2)),difference:ex(rows.map(r=>r.sampleA-r.sampleB))};
}
export function completionResearchEligibility(doc,view){
 const fail=(zh,en)=>({valid:false,reason:t(zh,en)}),family=completionResearchFamily(view);
 if(!family||family!==doc?.family||!Array.isArray(doc?.data)||!doc.data.length)return fail('请选择对应契约的完整原始记录。','Select complete original records for the matching contract.');
 if(doc.data.some(r=>typeof r._id!=='string'||!r._id)||new Set(doc.data.map(recordId)).size!==doc.data.length)return fail('每条原记录需要唯一持久的 _id。','Every original record requires a unique persistent _id.');
 let report;try{report=validateDocument({...doc,template:nativeMap.get(family)});}catch{return fail('原始字段或必需元数据不完整。','Original fields or required metadata are incomplete.');}
 if(!report.valid)return {valid:false,reason:report.errors.map(e=>typeof e==='string'?e:e.message).join(' ')};
 let bounds;try{bounds=completionResearchBounds(doc);}catch{return fail('原始记录无法形成完整坐标。','Original records cannot form complete coordinates.');}
 if(Object.values(bounds).some(d=>d.some(v=>!Number.isFinite(v))||!Number.isFinite(d[1]-d[0])))return fail('坐标范围超出有限数值，请换算原单位。','Coordinate spans exceed finite numbers; convert original units.');
 return {valid:true,reason:''};
}
const metadata=['qThreshold','fcThreshold','doseUnit','chromosomes','loadingScale','scaling','variance1','variance2','referenceSD','axes'];
export function completionResearchCompatibility(a,b){
 if(a?.family!==b?.family||a.template!==b.template)return t('原始研究记录结构不同。','Original research-record structures differ.');
 if(a.unit!==b.unit||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k])||metadata.some(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])))return t('原单位、来源、模型定义或阈值不同。','Original units, provenance, model definitions or thresholds differ.');
 if(JSON.stringify(a.data.map(recordId).sort())!==JSON.stringify(b.data.map(recordId).sort()))return t('原始记录集合不同。','Original record populations differ.');
 const old=new Map(a.data.map(r=>[recordId(r),r]));
 const fields=a.template==='eventhistory'?['subject','state']:a.template==='biplot'?['kind','group']:['lexis','swimmer'].includes(a.template)?['group']:a.template==='dose'?['dose']:a.template==='manhattan'?['chromosome','position']:[];
 if(b.data.some(r=>fields.some(k=>old.get(recordId(r))[k]!==r[k])))return t('原记录分组、角色或物理定位改变。','Original grouping, roles or physical positions changed.');
 return '';
}
const groupField=doc=>doc?.template==='eventhistory'?'state':'group';
export function completionResearchColorSubjects(doc){if(!['biplot','lexis','swimmer','eventhistory'].includes(doc?.template))return [];const field=groupField(doc);return unique((doc.data||[]).map(r=>r[field])).map(label=>({id:populationId('sample-group',doc.data.filter(r=>r[field]===label)),label}));}
export function completionResearchColorKeys(doc){const field=groupField(doc),subjects=new Map(completionResearchColorSubjects(doc).map(r=>[r.label,r.id]));return (doc?.data||[]).map(r=>subjects.get(r[field])||recordId(r));}
export function completionResearchRecipe(){return {id:'complete-research-original-coordinates',get name(){return t('原记录连续换坐标','Continuous original-record coordinates');},description:t('同一持久点、箭头或区间轮廓连续展开；原值、日期、状态与统计定义完整保留。','Unfold the same persistent points, arrows and interval contours while retaining original values, dates, states and statistical definitions.')};}
export function completionResearchGuide(doc,view){return [info.get(view)?.note||'',...volume14MethodNotes(doc.template),...volume15MethodNotes(doc.template),t('保留 _id、label、全部原字段、unit、source、axes 与明确模型参数。派生坐标不写回原表；停稳后再读数。点击原标记编辑原字段，重排不更换记录身份。','Preserve _id, label, all original fields, unit, source, axes and explicit model parameters. Derived coordinates never overwrite originals; read values after settling. Original marks edit original fields, and reordering retains identity.'),t('不删观测、不补零、不拟合 PCA/差异/富集/关联/剂量模型，不把探索性参考线当成置信区间。观察区间保留空档、响应空值和继续观察标记。','Never trim observations, zero-fill or fit PCA, differential, enrichment, association or dose models. Exploratory reference lines are not confidence intervals. Observation intervals retain gaps, null responses and ongoing markers.')];}
export function completionResearchAgentGuide(english=false){
 const methodGuide=(english?'Use original FORMA renderer and HTML/SVG/video export. Preserve _id, recordId, populationId, label, all raw fields, unit, source, axes, qThreshold, fcThreshold, doseUnit, chromosomes, loadingScale, scaling, variance1, variance2 and referenceSD. Derived coordinates do not overwrite input. Dose summaries are mean±sample SD, not SEM/CI or 4PL. padj/pvalue are supplied external analyses, never computed here. Manhattan preserves true bp and chromosome gaps. Lexis birth=entryPeriod−entryAge; exitAge=entryAge+exitPeriod−entryPeriod. Swimmer preserves response:null and ongoing only at recorded end. State intervals are [start,end), retaining gaps. Biplot preserves supplied scores and loadings; loadingScale is display only. Taylor uses referenceSD, correlation and centered RMSE without invented bias. Target signed center RMSE uses sd<referenceSD for negative sign. Youden mean=A/2+B/2 and difference=A−B has no new agreement intervals. Exact endpoints, reverse seek and interrupted-frame resumption are required.':'使用原版 FORMA 渲染器及 HTML/SVG/视频导出。保留 _id、recordId、populationId、label、全部原字段、unit、source、axes、qThreshold、fcThreshold、doseUnit、chromosomes、loadingScale、scaling、variance1、variance2、referenceSD。派生坐标不覆盖输入。剂量摘要为均值±样本SD，不是SEM/CI或4PL。padj/pvalue是外部分析，不在图内计算。Manhattan保留真实bp与染色体间隔。Lexis出生年=entryPeriod−entryAge，退出年龄=entryAge+exitPeriod−entryPeriod。Swimmer保留response:null，ongoing只标原end。状态区间为[start,end)，空档保留。Biplot保留外部得分和载荷，loadingScale仅显示倍率。Taylor保留referenceSD、correlation与中心RMSE，不补偏差。Target在sd<referenceSD时中心RMSE取负。Youden均值=A/2+B/2、差=A−B，不新增一致性区间。保证精确端点、倒放及中断接续。');
 const inputGuide=english?[
  'Volcano/MA: log2FC is already log₂ transformed. padj is the original adjusted p-value itself, such as 0.003, in (0,1]; never enter −log₁₀(padj), zero or missing values. Use supplied results from completed external analysis rather than fitting differential or enrichment tests.',
  'qThreshold is the significance threshold in (0,1]; fcThreshold is a positive threshold on absolute log2FC. Preserve both intended analysis thresholds. MA mean must be positive for the logarithmic expression axis.',
  'Dose: dose must be positive for the logarithmic dose axis; zero-dose controls require separate analysis. Retain original repeated measurements at every dose rather than replacing them with group means. Preserve doseUnit, and connect means without fitting 4PL or estimating IC50.',
  'Enrichment: count and total are original positive integers with count≤total; GeneRatio=count/total. total is the number of input genes for the stated analysis; explain any differing denominators in source. Bubble area encodes count, and color encodes −log₁₀(padj) from supplied raw adjusted p-values.',
  'Manhattan: position is the real base-pair coordinate within chromosomes-declared lengths, never a row rank. pvalue is the supplied p-value itself in (0,1], never its negative logarithm; retain explicit chromosome order and length.'
 ]:[
  'Volcano/MA：log2FC 填已经过 log₂ 变换的变化倍数；padj 填原始校正 p 值本身，例如 0.003，范围为 (0,1]，不能填 −log₁₀(padj)、零或缺失值。使用已完成的外部分析结果，不在图内拟合差异或富集检验。',
  'qThreshold 是 (0,1] 内的显著性阈值；fcThreshold 是绝对 log2FC 的正变化幅度阈值，均保留分析所用的原阈值。MA 的 mean 必须大于 0，使用真实对数表达量轴。',
  'Dose：dose 必须大于 0，使用对数剂量轴；零剂量对照须单独分析。保留每剂量原始重复测量，不能用组均值替代。保留 doseUnit，只连接均值，不拟合 4PL 或估计 IC50。',
  'Enrichment：count、total 为原始正整数且 count≤total；GeneRatio=count/total。total 是所述分析的输入基因总数，分母不同时须在 source 说明。气泡面积编码 count，颜色编码从原校正 p 值得到的 −log₁₀(padj)。',
  'Manhattan：position 是 chromosomes 声明长度内的真实碱基位置，不能换成行排名。pvalue 填原 p 值本身，范围为 (0,1]，不能填其负对数；保留明确的染色体顺序和长度。'
 ];
 return [methodGuide,...inputGuide,completionResearchViews.map(v=>v.id).join(', ')].join('\n');
}
