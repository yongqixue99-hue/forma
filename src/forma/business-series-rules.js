import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';

export const businessSeriesText=(zh,en)=>isEnglish()?en:zh;
const t=businessSeriesText;
const view=(id,zh,en,note,noteEn)=>({id,get name(){return t(zh,en);},en,get note(){return t(note,noteEn);}});
export const businessSeriesViews=[
 view('target-progress','目标完成进度','Target progress','按 value / target 展开，超额保留，不把不同目标的长度当成绝对数量。','Lengths encode value / target, retaining overruns. Different target denominators are not absolute quantities.'),
 view('target-fan','径向目标进度','Radial target progress','同一完成率刻度沿射线展开；只接受未超过目标的 6–16 项。','One completion-ratio scale unfolds on radial rays, accepting 6–16 items that have not exceeded their targets.'),
 view('target-bullet','目标与评估区间','Bullet targets and ranges','绝对数量共用刻度，定性区间完全来自输入的 low / mid / high。','Absolute amounts share a scale; qualitative ranges come entirely from the supplied low / mid / high.'),
 view('target-gauge','量程与目标仪表','Gauge range and target','一条真实记录的 value / target 在明确的 min–max 量程内移动。','The value and target of one actual record move within its declared min–max range.'),
 view('target-pairs','完成值与目标端点','Actual and target endpoints','同一记录的完成值与目标值在原单位共同刻度上比较。','Actual and target endpoints for each record share a scale in the original unit.'),
 view('metric-cards','原始指标卡','Original metric cards','每项独立保留当前值、前期值和单位，不跨指标求和。','Each metric retains its current value, previous value and unit. Unrelated metrics are never summed.'),
 view('metric-pairs','指标前后对照','Per-metric before and after','每项独立刻度展示本期与前期，明确标注单位与刻度。','Each metric uses its own explicitly labelled scale and unit for current/previous comparison.'),
 view('paired-combo','同轴柱线对照','Shared-axis columns and line','第一序列从零长为柱，第二序列保留原始点与缺失断点。','The first series grows from zero into columns; the second retains original points and missing-value gaps.'),
 view('paired-lines','双序列原始折线','Two original series','两组原始值沿真实日期、轮次或等间隔类别相连；缺失不补零。','Both series connect actual dates, epochs or ordered equally spaced categories, without filling missing values.'),
 view('paired-difference','双序列差异面积','Difference between series','线性插值确定交叉位置，正负差异区域独立展开；缺失处留空。','Linear interpolation locates crossings. Positive and negative difference areas unfold separately, retaining gaps.')
];
export const businessSeriesViewMap={progress:'target-progress',fan:'target-fan',bullet:'target-bullet',gauge:'target-gauge',kpi:'metric-cards',comboline:'paired-combo',difference:'paired-difference',learning:'paired-lines'};
const ids=new Set(businessSeriesViews.map(v=>v.id));
export const isBusinessSeriesView=view=>ids.has(view);
export const businessSeriesFamily=view=>!ids.has(view)?undefined:view.startsWith('target-')?'business-target':view.startsWith('metric-')?'business-metrics':'business-paired';
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15;
const text=v=>typeof v==='string'&&!!v.trim();
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const signature=axes=>JSON.stringify(Object.entries(axes||{}).sort(([a],[b])=>a.localeCompare(b)));
const fields={comboline:['bar','line'],difference:['a','b'],learning:['train','validation']};
export function businessSeriesColorKeys(doc){const pair=doc.businessFields||fields[doc.template];return pair?pair.map(field=>populationId(`business-series:${field}`,doc.data)):doc.data.map(recordId);}

export function businessSeriesDocument(doc,common={}){
 const mapped=businessSeriesViewMap[doc?.template];if(!mapped)return null;
 const family=businessSeriesFamily(mapped),paired=family==='business-paired',timeMode=doc.template==='difference'?'date':doc.template==='learning'?'epoch':'ordered';
 const declared=Array.isArray(doc.seriesLabels)?[...doc.seriesLabels]:doc.template==='learning'?[t('训练损失','Training loss'),t('验证损失','Validation loss')]:undefined;
 return {...doc,...common,family,...(paired?{businessFields:fields[doc.template],timeMode,seriesLabels:declared}:{}),data:doc.data.map((r,row)=>({...r,row,...(paired?{position:timeMode==='date'?Date.parse(r.period):timeMode==='epoch'?r.epoch:row}:{})}))};
}
export function businessSeriesEligibility(doc,view){
 const bad=(zh,en)=>({valid:false,reason:t(zh,en)}),d=doc?.data,family=businessSeriesFamily(view);
 if(!family||doc?.family!==family||!Array.isArray(d)||!d.length)return bad('请选择同一系列的完整原始数据。','Choose complete original data from the same series.');
 if(!text(doc.unit)||!text(doc.source?.name)||d.some(r=>!text(recordId(r)))||new Set(d.map(recordId)).size!==d.length)return bad('记录须有唯一持久 ID，并声明单位和来源。','Records require unique persistent IDs, a unit and a source.');
 if(family==='business-target'){
  if(d.length>16||d.some(r=>!text(r.label)||![r.value,r.target].every(finite)))return bad('支持 1–16 项完整的名称、完成值和目标值；不删行或补值。','Use 1–16 complete labels, actual values and targets; rows and values are not invented or removed.');
  if(view==='target-progress'&&(d.length>10||d.some(r=>r.value<0||r.target<=0||!Number.isFinite(r.value/r.target)||r.value/r.target>1e6)))return bad('进度条需要 1–10 项，完成值非负、目标为正；允许超额至目标的一百万倍。','Progress needs 1–10 items, nonnegative actual values and positive targets; overruns up to one million times the target are retained.');
  if(view==='target-fan'&&(d.length<6||d.some(r=>r.value<0||r.target<=0||r.value>r.target)))return bad('径向进度需要 6–16 项，0 ≤ 完成值 ≤ 正目标；超额保留在其他视图。','Radial progress needs 6–16 items with 0 ≤ actual ≤ positive target. Retain overruns in another view.');
  if(view==='target-bullet'&&(d.length<3||d.length>8||!Array.isArray(doc.bandLabels)||doc.bandLabels.length!==3||doc.bandLabels.some(v=>!text(v))||d.some(r=>![r.low,r.mid,r.high].every(finite)||!(0<r.low&&r.low<r.mid&&r.mid<r.high)||r.value<0||r.target<=0||r.value>r.high||r.target>r.high)))return bad('子弹图需要 3–8 项及真实输入的三个递增阈值、区间名称；不自动补造区间。','Bullet charts need 3–8 items and three supplied increasing thresholds with range labels. No ranges are synthesized.');
  if(view==='target-gauge'&&(d.length!==1||d.some(r=>![r.min,r.max].every(finite)||!(r.min<r.max)||r.value<r.min||r.value>r.max||r.target<r.min||r.target>r.max)))return bad('仪表仅接收一条记录和明确 min / max；完成值与目标须在量程内。','A gauge accepts exactly one record with supplied min / max, and actual/target values within that range.');
 }else if(family==='business-metrics'){
  if(d.length>4||d.some(r=>!text(r.label)||!text(r.metricUnit)||![r.value,r.previous].every(finite)||r.previous>0&&(!Number.isFinite((r.value-r.previous)/r.previous)||Math.abs((r.value-r.previous)/r.previous)>1e8)))return bad('指标卡需要 1–4 项，每项保留自己的单位、当前值与前期值，并核对极端增长率。','Metric cards need 1–4 items, each retaining its own unit, current and previous values; review extreme growth ratios.');
 }else{
  const keys=doc.businessFields;
  if(!Array.isArray(keys)||keys.length!==2||!Array.isArray(doc.seriesLabels)||doc.seriesLabels.length!==2||doc.seriesLabels.some(s=>!text(s))||doc.seriesLabels[0]===doc.seriesLabels[1]||d.length<3||d.length>120)return bad('双序列需要 3–120 个位置和两个不同名称，使用同一原始单位。','Paired series need 3–120 positions and two distinct series names using the same original unit.');
  if(d.some(r=>!finite(r.position)||keys.some(k=>r[k]!==null&&!finite(r[k])))||keys.some(k=>d.filter(r=>r[k]!==null).length<2)||new Set(d.map(r=>r.position)).size!==d.length)return bad('每个位置须唯一、至少各有两个有限观测；缺失请显式保留 null。','Positions must be unique, with at least two finite observations per series. Retain missing values explicitly as null.');
  if(doc.timeMode==='date'&&d.some(r=>!date(r.period))||doc.timeMode==='epoch'&&d.some(r=>!Number.isInteger(r.epoch)||r.epoch<1)||!['ordered','date','epoch'].includes(doc.timeMode))return bad('日期或轮次坐标无效。','Invalid date or epoch coordinates.');
  if(view==='paired-combo'&&(d.length>24||d.some(r=>r[keys[0]]===null||keys.some(k=>r[k]!==null&&r[k]<0))))return bad('柱线图需要至多 24 个位置、完整且非负的柱值；负值或缺失柱值保留在折线视图。','Columns and line need at most 24 positions, complete nonnegative columns and nonnegative line values. Keep negative/missing columns in the line view.');
 }
 return {valid:true,reason:''};
}
export function businessSeriesCompatibility(a,b){
 if(a?.family!==b?.family||a.unit!==b.unit||signature(a.axes)!==signature(b.axes)||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('系列、单位、来源或坐标定义不同。','Series, units, sources or axis definitions differ.');
 const map=new Map(a.data.map(r=>[recordId(r),r]));
 if(map.size!==b.data.length||b.data.some(r=>!map.has(recordId(r))))return t('原始记录身份不同；保留各自数据。','Original record identities differ; retain their separate data.');
 if(a.family==='business-target'){
  if(signature(a.bandLabels)!==signature(b.bandLabels)||b.data.some(r=>['min','max','low','mid','high'].some(k=>map.get(recordId(r))[k]!==r[k])))return t('原始量程或定性阈值不同，不能混为同一目标系列。','Supplied ranges or qualitative thresholds differ and cannot be treated as one target series.');
 }else if(a.family==='business-metrics'){
  if(b.data.some(r=>map.get(recordId(r)).metricUnit!==r.metricUnit))return t('同一指标的原始单位改变。','The original unit of a metric changed.');
 }else if(a.family==='business-paired'){
  if(a.timeMode!==b.timeMode||JSON.stringify(a.businessFields)!==JSON.stringify(b.businessFields)||JSON.stringify(a.seriesLabels)!==JSON.stringify(b.seriesLabels)||b.data.some(r=>{const p=map.get(recordId(r));return p.position!==r.position||a.businessFields.some(k=>(p[k]===null)!==(r[k]===null));}))return t('时期网格、序列定义或缺失位置不同；不补齐或重新配对。','Position grid, series definitions or missing locations differ; do not fill or rematch them.');
 }
 return '';
}
export function businessSeriesBounds(doc){
 if(doc.family==='business-target'){const values=doc.data.flatMap(r=>[r.value,r.target,r.min,r.max,r.low,r.mid,r.high]).filter(finite),ratios=doc.data.filter(r=>r.target>0).map(r=>r.value/r.target).filter(Number.isFinite);return {value:[Math.min(0,...values),Math.max(0,...values)],ratio:[0,Math.max(1,...ratios)]};}
 if(doc.family==='business-metrics')return Object.fromEntries(doc.data.map(r=>[`metric:${recordId(r)}`,[Math.min(0,r.value,r.previous),Math.max(0,r.value,r.previous)]]));
 const values=doc.data.flatMap(r=>doc.businessFields.map(k=>r[k])).filter(finite);return {position:[Math.min(...doc.data.map(r=>r.position)),Math.max(...doc.data.map(r=>r.position))],value:[Math.min(0,...values),Math.max(0,...values)]};
}
export function businessSeriesRecipe(from,to){return {id:businessSeriesFamily(to),get name(){return t('原始记录连续换形','Continuous original-record geometry');},description:t('记录身份不变，原始值轮廓、目标端点与相邻线段连续移动；不同尺度的坐标在停稳后显示。','Record identities stay fixed as value contours, target endpoints and adjacent links move continuously. Different coordinate scales appear only when settled.')};}
export function businessSeriesGuide(doc,view){return [businessSeriesViews.find(v=>v.id===view)?.note||'',t('每行保留 _id、全部原始字段、单位和来源。缺失不补零，未给定的量程与定性区间不自动推断。','Keep _id, every original field, unit and source in every row. Missing values are not filled and undeclared ranges are not inferred.'),doc.family==='business-metrics'?t('每个指标保留独立 metricUnit 和独立刻度。previous ≤ 0 时只显示差值，不报告增长率，不给涨跌自动附加利好含义。','Each metric retains its metricUnit and its own scale. When previous ≤ 0, show only the difference, without a growth percentage or automatic good/bad judgement.'):doc.family==='business-paired'?t('保持原日期或轮次间距，null 两侧不连接、不填充面积。差异交叉使用原生线性插值算法；区间内部不是额外观测。','Keep actual date/epoch spacing, without connections or area across nulls. Difference crossings use the native linear-interpolation algorithm; positions inside an interval are not extra observations.'):t('完成率为 value / target；子弹图区间仅来自 low / mid / high 与 bandLabels，仪表量程仅来自 min / max。','Completion is value / target. Bullet ranges come only from low / mid / high and bandLabels; gauge ranges come only from min / max.')];}
export function businessSeriesAgentGuide(english=false){return english?`Use FORMA's business-target, business-metrics and business-paired families and original shared player. Keep each native row, _id, source including url, unit and axes. Never recreate the renderer or substitute chart crossfades. target-progress, target-fan, target-bullet, target-gauge and target-pairs retain value and target. Never invent min/max or low/mid/high/bandLabels; unavailable views stay disabled. Gauges require exactly one record. Fan completion is value/target and accepts 6–16 non-overrun items; progress accepts 1–10 and preserves overruns. Native bullet input has 3–8 items and 0<low<mid<high. metric-cards and metric-pairs retain value, previous and metricUnit for each item, with independent scales and no mixed-unit sums. previous<=0 has no relative growth rate. paired-combo, paired-lines and paired-difference retain native bar/line, a/b or train/validation fields and actual period/epoch locations. Keep null gaps, never join lines or fill bands across them; retain source fields as editing targets. Crossings use the native linear difference interpolation, not extra samples. The same _id and stable field-role keys must keep their nodes in reverse, direct jump, interrupted seek and HTML/SVG/video output. Do not change time grids, unit, series semantics, supplied range/threshold metadata or missing locations to force compatibility.`:`使用 FORMA 原始播放器的 business-target、business-metrics、business-paired 系列。完整保留原生表每行、_id、含 url 的 source、unit 与 axes，不重写渲染器，不以淡入淡出冒充变形。target-progress、target-fan、target-bullet、target-gauge、target-pairs 均保留 value / target，禁止补造 min/max 或 low/mid/high/bandLabels；缺元数据则禁用对应视图。仪表严格一条记录，径向 6–16 项且不超目标；进度 1–10 项并保留超额；原生子弹图 3–8 项且 0<low<mid<high。metric-cards、metric-pairs 保留逐项 value、previous、metricUnit 与独立刻度，禁止混单位求和；previous<=0 不报告增长率。paired-combo、paired-lines、paired-difference 保留 bar/line、a/b 或 train/validation 原字段及真实 period/epoch 位置；null 断点不能补零、跨越连接或填面积。交叉位置复用原生线性差异算法，并非额外观测。原始字段可编辑，_id 加固定字段 role 的节点在倒放、跳步、中断及 HTML/SVG/视频中保持连续。不能改时期网格、单位、序列口径、量程阈值或缺失位置强行兼容。`;}
