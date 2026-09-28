import {extent} from 'd3';
import {isEnglish,uiText} from './locale.js';
import {recordId} from './data-identity.js';

export const distributionText=(zh,en)=>isEnglish()?en:uiText(zh);
const t=distributionText;
export const distributionViews=[
 {id:'distribution-sina',get name(){return t('密度抖动原始点','Sina observations');},en:'Sina observations',get note(){return t('原始点沿数值轴准确定位，横向范围由共用高斯带宽和密度尺度决定。横向抖动不是另一个测量值。','Original values retain their exact axis coordinate. A shared Gaussian bandwidth and density scale determine transverse jitter; jitter is not another measurement.');}},
 {id:'distribution-boxen',get name(){return t('嵌套尾部分位箱','Nested tail quantiles');},en:'Nested tail quantiles',get note(){return t('同一批原始点旁展开逐层尾部分位箱；箱宽表示分位层级，不表示频数密度。','Nested tail-quantile boxes unfold beside the same raw observations. Box width encodes quantile depth, not frequency density.');}},
 {id:'distribution-halfeye',get name(){return t('半眼密度与区间','Half-eye density and intervals');},en:'Half-eye density and intervals',get note(){return t('原始点转到横向数值轴，展开半侧密度、中位数及中央 50%/90% 样本分位区间；不是均值置信区间。','Raw observations turn onto a horizontal value axis with a half-density, median and central 50%/90% sample-quantile intervals, not confidence intervals for a mean.');}},
 {id:'distribution-quantiledot',get name(){return t('等概率分位点阵','Equal-mass quantile dots');},en:'Equal-mass quantile dots',get note(){return t('原始观测保留为下方点列，另外展开等概率摘要点。摘要点不是原样本，堆叠高度仅用于避让。','Raw observations remain in a separate lower strip while equal-mass quantile summaries unfold above them. Summary dots are not observations; stacking only avoids overlap.');}}
];
export const distributionViewMap={boxen:'distribution-boxen',sina:'distribution-sina',halfeye:'distribution-halfeye',quantiledot:'distribution-quantiledot'};
const viewIds=new Set(distributionViews.map(v=>v.id));
export const isDistributionView=view=>viewIds.has(view);
export const distributionFamily=view=>isDistributionView(view)?'distribution':undefined;
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15;
const text=v=>typeof v==='string'&&!!v.trim();
const groups=rows=>[...new Set(rows.map(r=>r.group))];

// The native table remains the editable/saved document. Canonical fields are
// view metadata only; no synthetic observation or missing value is introduced.
export function distributionDocument(doc,common={}){
 const [lo,hi]=extent(doc.data,r=>r.value),fallback=(hi-lo)/12||Math.abs(lo)*.05||1;
 return {...doc,...common,family:'distribution',bandwidth:doc.bandwidth??fallback,bandwidthMode:doc.bandwidth===undefined?'span':'input',dotCount:doc.dotCount??50,
  data:doc.data.map((r,row)=>({...r,row,group:r.group??t('全部观测','All observations')}))};
}
export function distributionEligibility(doc,view){
 const bad=reason=>({valid:false,reason}),rows=doc?.data;
 if(!isDistributionView(view)||doc?.family!=='distribution'||!Array.isArray(rows)||!rows.length)return bad(t('请选择此系列的原始观测。','Choose original observations for this series.'));
 if(rows.some(r=>!text(r.label)||!text(recordId(r))||!text(r.group)||!finite(r.value))||new Set(rows.map(recordId)).size!==rows.length)return bad(t('每个观测须有唯一记录 ID、名称、分组和完整有限原值；缺失不删行或补零。','Each observation needs a unique record ID, label, group and complete finite value. Missing observations are neither dropped nor zero-filled.'));
 const names=groups(rows),count=group=>rows.filter(r=>r.group===group).length;
 if(view==='distribution-quantiledot'){
  if(names.length!==1||rows.length<5||rows.length>500)return bad(t('分位点阵使用一个群体的 5–500 个原始观测；不会自动合并不同分组。','Quantile dots require 5–500 observations from one population; groups are never silently pooled.'));
 }else{
  const min=view==='distribution-boxen'?16:8,max=view==='distribution-boxen'?240:200;
  if(names.length>5||names.some(g=>count(g)<min||count(g)>max))return bad(t(`此视图支持 1–5 组，每组 ${min}–${max} 个完整观测。`,`This view supports 1–5 groups with ${min}–${max} complete observations per group.`));
 }
 if(!Number.isInteger(doc.dotCount)||doc.dotCount<20||doc.dotCount>100)return bad(t('分位摘要点数须为 20–100 的整数。','Quantile summary dot count must be an integer from 20 to 100.'));
 const [lo,hi]=extent(rows,r=>r.value),span=hi-lo,h=doc.bandwidth;
 if(!finite(h)||h<=0||!Number.isFinite(1/h)||span>0&&(h<span/64||h>span*4)||!(hi+3*h>lo-3*h))return bad(t('共用密度带宽须为正且在原值跨度的 1/64–4 倍之间；请核对数值单位。','The shared positive density bandwidth must lie between 1/64 and 4 times the observed span. Check the measurement unit.'));
 return {valid:true,reason:''};
}
export function distributionBounds(doc){const [lo,hi]=extent(doc.data,r=>r.value);return {value:[lo-3*doc.bandwidth,hi+3*doc.bandwidth]};}
export function distributionCompatibility(a,b){
 if(a?.family!=='distribution'||b?.family!=='distribution')return t('图型数据结构不同','Different data structures');
 if(a.unit!==b.unit||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('观测单位或来源不同','Different observation units or sources');
 const axes=new Set([...Object.keys(a.axes||{}),...Object.keys(b.axes||{})]);
 if([...axes].some(k=>a.axes?.[k]!==b.axes?.[k]))return t('观测坐标的指标含义或单位不同','Observation-axis measurement definitions or units differ');
 if(a.dotCount!==b.dotCount)return t('分位摘要点数与每点概率质量不同','Quantile dot counts and per-dot probability masses differ');
 return '';
}
export function distributionRecipe(from,to){return {id:from===to?'distribution-update':'distribution-unfold',get name(){return t('原样本与分布摘要连续展开','Continuous observations and summaries');},description:t('每个原始点保留记录 ID 与原值，连续移动和转向；分位区间与密度从所属群体展开，摘要使用独立身份。','Every original point keeps its record ID and value while moving and turning continuously. Quantile intervals and densities unfold from their population; summaries have distinct identities.')};}
export function distributionGuide(doc,view){
 const notes={
  'distribution-sina':t('Sina 只抖动非数值方向，密度决定宽度；稳定记录 ID 决定抖动位置，重命名不重新随机。','Sina jitters only the non-value direction. Density controls width; a stable record ID fixes jitter across renaming.'),
  'distribution-boxen':t('Type 7 分位数；第 k 层区间为 [Q(2⁻ᵏ⁻²), Q(1−2⁻ᵏ⁻²)]，尾部至少保留四个样本。箱宽逐层减半。','Type 7 quantiles: level k spans [Q(2⁻ᵏ⁻²), Q(1−2⁻ᵏ⁻²)], retaining at least four observations per tail. Width halves at each depth.'),
  'distribution-halfeye':t('半眼粗线为 Q25–Q75，细线为 Q05–Q95，点为中位数；这些是样本分位区间，不是均值置信区间。','Half-eye: thick interval Q25–Q75, thin interval Q05–Q95, point at the median. These are sample-quantile intervals, not mean confidence intervals.'),
  'distribution-quantiledot':t('摘要点 i 位于 Q((i+0.5)/dotCount)，每点质量 1/dotCount；仅一个群体可使用，原始观测单独显示。','Summary dot i is Q((i+0.5)/dotCount), with mass 1/dotCount. Only one population is accepted; raw observations remain separately visible.')
 };
 return [t('每行填写唯一 label、group 与实际 value，并保留 _id。分位点阵模板没有 group 时，整表是一个群体；不删重复值，不填补缺失。','Each row holds a unique label, group and actual value; retain _id. A quantile-dot table without group is one population. Ties are retained and missing values are never filled.'),notes[view]||'',t('各视图共享原值轴范围与单位。高斯密度共用 bandwidth；未提供时使用全部原值跨度 / 12，常量使用 |值| × 0.05（全零为 1）。密度范围延伸三个带宽，未作边界修正。','Views share the value domain and unit. Gaussian densities share bandwidth; when absent, use total observed span / 12, or |value| × 0.05 for a constant sample (1 for all zero). Density extends three bandwidths without boundary correction.'),t('所有样本在每一帧可见且可编辑。派生摘要关联所属记录，但不当作原始观测；分组与容量不兼容时保留原数据并使用原生入场。','All observations remain visible and editable in every frame. Derived summaries reference their source records but never impersonate observations. Incompatible grouping or capacity keeps the data intact and uses native entrance.')];
}

export function distributionAgentGuide(english=false){return english?`Use the existing distribution-sina, distribution-boxen, distribution-halfeye and distribution-quantiledot views from the original FORMA player, not a recreated renderer. Preserve the editable native label/group/value table, unit, source and _id. A quantiledot native table without group denotes one population. Never pool groups, delete repeated values or fill missing samples.
Every raw observation retains its own _id, editable value and visible sample mark throughout a morph. Rename/reorder must not create a new observation. Use populationId('sample-group', rows) for group color identity. Derived density, median, quantile intervals and quantile-summary dots have separate identities plus their source recordIds; they never impersonate a raw sample.
Sina retains the exact value coordinate; a stable record-ID hash only jitters the other axis within the Gaussian density width. All groups share bandwidth and density scaling. Without explicit bandwidth use total observed span/12, or |value|*0.05 for constant samples (1 for all zero). Density extends three bandwidths with no boundary correction. Half-eye intervals are Type 7 Q25–Q75 and Q05–Q95, not confidence intervals; boxen level k spans Q(2^(-k-2)) to Q(1-2^(-k-2)), with depth min(5,max(1,floor(log2(n))-3)).
Quantile dots require one population of 5–500 samples, dotCount 20–100, p=(i+0.5)/dotCount and mass=1/dotCount. Keep all raw observations as a separate strip. Stack only vertically without snapping quantile values. Boxen needs 16–240 observations per group; Sina and half-eye need 8–200, with 1–5 groups. Incompatible limits or populations use native entrance without modifying the table.
Continuously move the same raw point contours, rotate density contours in their value/width frame, and unfold summaries from their actual population. Preserve reverse, direct jump and interrupted-frame continuity. Validate 0/25/50/75/100% frames, original values, every _id, editable targets and summary meanings.`:`使用原版 FORMA 播放器的 distribution-sina、distribution-boxen、distribution-halfeye、distribution-quantiledot 视图，不重新仿写。保留可编辑的原生 label/group/value 原表、单位、来源和 _id。quantiledot 原生表没有 group 时表示一个群体，不自动合组，不删重复观测，不补缺失值。
每个原始点在连续变形全程保留自己的 _id、可编辑 value 和可见 sample 标记，重命名或重排不创建新观测。群体颜色身份使用 populationId('sample-group',rows)。密度、中位数、分位区间与 quantile-summary 均使用独立派生身份并关联原始 recordIds，不冒充原样本。
Sina 的数值坐标保持原值，稳定记录 ID 哈希仅在另一轴按高斯密度宽度抖动，各组共用带宽与密度尺度。未指定 bandwidth 时取总跨度/12，常量取 |值|×0.05（全零为 1）；密度延伸三个带宽且不作边界修正。半眼区间为 Type 7 Q25–Q75 和 Q05–Q95，非均值置信区间；boxen 第 k 层使用 Q(2^(-k-2)) 至 Q(1-2^(-k-2))，深度 min(5,max(1,floor(log2(n))-3))。
分位点阵只允许一个群体、5–500 个样本，dotCount 为 20–100，p=(i+0.5)/dotCount，每点质量 1/dotCount；全部原样本单独保留在下方。只垂直堆叠避让，不横向吸附分位值。boxen 每组 16–240，Sina/半眼每组 8–200，共 1–5 组；不兼容时保留原表并使用原生入场。
同一原始点轮廓连续移动；密度轮廓在数值/宽度局部坐标中转向，摘要从所属群体展开。保持反向、跳步和中断当前帧接续；核对 0/25/50/75/100% 帧、原值、全部 _id、编辑目标和摘要含义。`;}
