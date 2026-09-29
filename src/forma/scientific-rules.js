import {qualityViews,qualityFamily,qualityViewMap,qualityDocument,qualityEligibility,qualityCompatibility,qualityBounds,qualityRecipe,qualityGuide,isQualityView} from './quality-series-rules.js';
import {timePlanningViews,timePlanningFamily,timePlanningViewMap,timePlanningDocument,timePlanningEligibility,timePlanningCompatibility,timePlanningBounds,timePlanningRecipe,timePlanningGuide,isTimePlanningView} from './time-planning-rules.js';
import {engineeringViews,engineeringFamily,engineeringViewMap,engineeringDocument,engineeringEligibility,engineeringCompatibility,engineeringBounds,engineeringRecipe,engineeringGuide,isEngineeringView} from './engineering-series-rules.js';
import {multivariateExtendedViews,multivariateExtendedFamily,multivariateExtendedViewMap,multivariateExtendedDocument,multivariateExtendedEligibility,multivariateExtendedCompatibility,multivariateExtendedBounds,multivariateExtendedRecipe,multivariateExtendedGuide,isMultivariateExtendedView} from './multivariate-extended-rules.js';
import {advancedRelationsViews,advancedRelationsFamily,advancedRelationsViewMap,advancedRelationsDocument,advancedRelationsEligibility,advancedRelationsCompatibility,advancedRelationsBounds,advancedRelationsRecipe,advancedRelationsGuide,isAdvancedRelationsView} from './advanced-relations-rules.js';
import {regressionDiagnosticViews,regressionDiagnosticFamily,isRegressionDiagnosticView,regressionDiagnosticViewMap,regressionDiagnosticDocument,regressionDiagnosticEligibility,regressionDiagnosticCompatibility,regressionDiagnosticBounds,regressionDiagnosticRecipe,regressionDiagnosticGuide} from './regression-diagnostic-rules.js';
import {temporalViews,temporalFamily,isTemporalView,temporalViewMap,temporalDocument,temporalEligibility,temporalCompatibility,temporalBounds,temporalRecipe,temporalGuide} from './temporal-series-rules.js';
import {comparisonViews,comparisonFamily,isComparisonView,comparisonViewMap,comparisonDocument,comparisonEligibility,comparisonCompatibility,comparisonBounds,comparisonRecipe,comparisonGuide} from './comparison-series-rules.js';
import {networkViews,networkFamily,isNetworkView,networkViewMap,networkDocument,networkEligibility,networkCompatibility,networkBounds,networkRecipe,networkGuide} from './network-series-rules.js';
import {businessSeriesViews,businessSeriesFamily,isBusinessSeriesView,businessSeriesViewMap,businessSeriesDocument,businessSeriesEligibility,businessSeriesCompatibility,businessSeriesBounds,businessSeriesRecipe,businessSeriesGuide} from './business-series-rules.js';
import {structuralViews,structuralFamily,isStructuralView,structuralViewMap,structuralDocument,structuralEligibility,structuralCompatibility,structuralBounds,structuralRecipe,structuralGuide} from './structural-series-rules.js';
import {statisticalViews,statisticalFamily,isStatisticalView,statisticalViewMap,statisticalDocument,statisticalEligibility,statisticalCompatibility,statisticalBounds,statisticalRecipe,statisticalGuide} from './statistical-series-rules.js';
import {distributionViews,distributionFamily,isDistributionView,distributionViewMap,distributionDocument,distributionEligibility,distributionCompatibility,distributionBounds,distributionRecipe,distributionGuide} from './distribution-rules.js';
import {frequencyViews,frequencyFamily,isFrequencyView,frequencyViewMap,frequencyDocument,frequencyEligibility,frequencyCompatibility,frequencyBounds,frequencyRecipe,frequencyGuide} from './frequency-rules.js';
import {serialViews,isSerialView,serialViewMap,serialDocument,serialEligibility,serialCompatibility,serialBounds,serialRecipe,serialGuide} from './serial-rules.js';
import {withRecordIds} from './data-identity.js';
import {multivariateViews,multivariateFamily,isMultivariateView,multivariateViewMap,multivariateDocument,multivariateEligibility,multivariateCompatibility,multivariateBounds,multivariateRecipe,multivariateGuide} from './multivariate-rules.js';
import {processViews,processFamily,isProcessView,processViewMap,processDocument,processEligibility,processCompatibility,processBounds,processRecipe,processGuide} from './process-rules.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {exploratoryViews,exploratoryFamily,isExploratoryView,exploratoryViewMap,exploratoryDocument,exploratoryEligibility,exploratoryCompatibility,exploratoryBounds,exploratoryRecipe,exploratoryGuide} from './exploratory-rules.js';
import {diagnosticViews,diagnosticFamily,isDiagnosticView,diagnosticViewMap,diagnosticDocument,diagnosticEligibility,diagnosticCompatibility,diagnosticBounds,diagnosticRecipe,diagnosticGuide} from './diagnostic-rules.js';
import {analyticalViews,analyticalFamily,isAnalyticalView,analyticalViewMap,analyticalDocument,analyticalEligibility,analyticalCompatibility,analyticalBounds,analyticalSharedBounds,analyticalRecipe,analyticalGuide} from './analytical-rules.js';
export {analyticalCorrespondence as scientificCorrespondence} from './analytical-rules.js';
import {extent} from 'd3';
import {validateDocument} from './data.js';
import {findTemplate} from './catalog.js';
import {violinDensity} from './volume4-data.js';
import {groupStats,linearFit} from './volume8-data.js';

export const observationViews=[
  {id:'obs-scatter',name:uiText('等大散点图'),en:'Equal-size observations',note:uiText('每个对象保留一个等大点，横纵坐标对应原始 X、Y。适合比较两个指标、发现分群和异常点。')},
  {id:'obs-bubble',name:uiText('规模气泡图'),en:'Magnitude as area',note:uiText('坐标保持不动，圆点按真实 size 字段展开，面积与 size 成正比。只有实际填写第三个正数指标时才能使用。')},
  {id:'obs-regression',name:uiText('散点与回归线'),en:'Observed & fitted',note:uiText('保留所有原始点，展开一元最小二乘直线。适合独立观测的线性标定；拟合不代表因果，也不强行连接每个点。')},
  {id:'obs-confidence',name:uiText('回归置信带'),en:'Mean-response interval',note:uiText('在回归线外展开均值响应的点态 95% 置信带，使用 Student t（n−2 自由度）。它不是个体预测区间，也不是同时置信带。')}
];
export const sampleViews=[
  {id:'sample-ridge',name:uiText('分布山脊与样本'),en:'Ridgelines & samples',note:uiText('各组密度在同一横轴逐层展开，全部样本留在各自基线旁；共用高斯带宽与密度高度，不按组单独归一化。')},
  {id:'sample-swarm',name:uiText('原始样本蜂群'),en:'Every sample',note:uiText('每个原始样本保留一个点，仅在非数值方向避让重叠。适合先观察分布、样本量和离群值。')},
  {id:'sample-box',name:uiText('箱线与样本'),en:'Quartiles & samples',note:uiText('在原始点旁展开箱线：箱体为 Q1–Q3，中线为中位数，须线到 1.5 × IQR 范围内最远的实际样本。')},
  {id:'sample-violin',name:uiText('小提琴与样本'),en:'Density & samples',note:uiText('在原始样本外展开对称密度轮廓。各组共用高斯核带宽、数值轴和密度尺度；宽度表示密度，不能当作样本量。')},
  {id:'sample-raincloud',name:uiText('雨云分布图'),en:'Raincloud observations',note:uiText('同一组数据展开成半密度轮廓、四分位箱体与原始散点。适合多组分布比较，样本始终保留。')},
  {id:'sample-sd',name:uiText('均值与标准差'),en:'Mean & sample SD',note:uiText('在原始点旁展开均值 ± 样本标准差（SD，分母 n−1）。适合独立重复的离散程度比较；SD 不是 SEM 或置信区间。')}
];
export const estimateViews=[
  {id:'estimate-points',name:uiText('点估计图'),en:'Point estimates',note:uiText('用等大点比较输入的估计值。原区间仍保留在数据表中，可切换至区间图查看不确定性。')},
  {id:'estimate-horizontal',name:uiText('横向区间图'),en:'Horizontal intervals',note:uiText('从估计点向输入上下界展开区间；不根据样本量重新计算置信区间。较长的对象名称适合横向排列。')},
  {id:'estimate-vertical',name:uiText('纵向误差区间图'),en:'Vertical intervals',note:uiText('把同一组点估计和输入区间转向纵轴。区间水平、单位与线性或对数尺度均保持不变。')}
];
export const scientificViews=[...qualityViews,...timePlanningViews,...engineeringViews,...multivariateExtendedViews,...advancedRelationsViews,...regressionDiagnosticViews,...temporalViews,...comparisonViews,...networkViews,...businessSeriesViews,...structuralViews,...statisticalViews,...distributionViews,...frequencyViews,...serialViews,...observationViews,...sampleViews,...estimateViews,...analyticalViews,...diagnosticViews,...exploratoryViews,...processViews,...multivariateViews];
const families=new Map([...observationViews.map(v=>[v.id,'observations']),...sampleViews.map(v=>[v.id,'samples']),...estimateViews.map(v=>[v.id,'estimates'])]);
export const scientificFamily=view=>qualityFamily(view)||timePlanningFamily(view)||engineeringFamily(view)||multivariateExtendedFamily(view)||advancedRelationsFamily(view)||regressionDiagnosticFamily(view)||temporalFamily(view)||comparisonFamily(view)||networkFamily(view)||businessSeriesFamily(view)||structuralFamily(view)||statisticalFamily(view)||(isSerialView(view)?'serial':null)||frequencyFamily(view)||distributionFamily(view)||families.get(view)||analyticalFamily(view)||diagnosticFamily(view)||exploratoryFamily(view)||processFamily(view)||multivariateFamily(view);
export const isScientificView=view=>isQualityView(view)||isTimePlanningView(view)||isEngineeringView(view)||isMultivariateExtendedView(view)||isAdvancedRelationsView(view)||isRegressionDiagnosticView(view)||isTemporalView(view)||isComparisonView(view)||isNetworkView(view)||isBusinessSeriesView(view)||isStructuralView(view)||isStatisticalView(view)||isSerialView(view)||isFrequencyView(view)||isDistributionView(view)||families.has(view)||isAnalyticalView(view)||isDiagnosticView(view)||isExploratoryView(view)||isProcessView(view)||isMultivariateView(view);
export const scientificViewMap={...qualityViewMap,...timePlanningViewMap,...engineeringViewMap,...multivariateExtendedViewMap,...advancedRelationsViewMap,...regressionDiagnosticViewMap,...temporalViewMap,...comparisonViewMap,...networkViewMap,...businessSeriesViewMap,...structuralViewMap,...statisticalViewMap,...distributionViewMap,...frequencyViewMap,...serialViewMap,...processViewMap,...multivariateViewMap,...exploratoryViewMap,...diagnosticViewMap,...analyticalViewMap,xy:'obs-scatter',scatter:'obs-bubble',regression:'obs-confidence',ridges:'sample-ridge',swarm:'sample-swarm',boxplot:'sample-box',violin:'sample-violin',raincloud:'sample-raincloud',errorbar:'sample-sd',interval:'estimate-horizontal',forest:'estimate-horizontal'};
const key=(...parts)=>JSON.stringify(parts),finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e15,text=x=>typeof x==='string'&&!!x.trim();

export function scientificDocument(step){
  const doc=step?.doc,family=scientificFamily(scientificViewMap[doc?.template]);
  if(!family||!validateDocument(doc,{layout:false}).valid)return null;
  const common={template:doc.template,title:doc.title,subtitle:doc.subtitle||'',unit:doc.unit,source:structuredClone(doc.source),family};
  if(isAdvancedRelationsView(scientificViewMap[doc.template]))return advancedRelationsDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isMultivariateExtendedView(scientificViewMap[doc.template]))return multivariateExtendedDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isEngineeringView(scientificViewMap[doc.template]))return engineeringDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isTimePlanningView(scientificViewMap[doc.template]))return timePlanningDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isQualityView(scientificViewMap[doc.template]))return qualityDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isTemporalView(scientificViewMap[doc.template]))return temporalDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isRegressionDiagnosticView(scientificViewMap[doc.template]))return regressionDiagnosticDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isNetworkView(scientificViewMap[doc.template]))return networkDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isComparisonView(scientificViewMap[doc.template]))return comparisonDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isStatisticalView(scientificViewMap[doc.template]))return statisticalDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isStructuralView(scientificViewMap[doc.template]))return structuralDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isBusinessSeriesView(scientificViewMap[doc.template]))return businessSeriesDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isFrequencyView(scientificViewMap[doc.template]))return frequencyDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isDistributionView(scientificViewMap[doc.template]))return distributionDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isSerialView(scientificViewMap[doc.template]))return serialDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isProcessView(scientificViewMap[doc.template]))return processDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isMultivariateView(scientificViewMap[doc.template]))return multivariateDocument(withRecordIds(doc,{legacyNamespace:step.dataGroup||'legacy-native:'+doc.template}),common);
  if(isExploratoryView(scientificViewMap[doc.template]))return exploratoryDocument(doc,common);
  if(isDiagnosticView(scientificViewMap[doc.template]))return diagnosticDocument(doc,common);
  if(isAnalyticalView(scientificViewMap[doc.template]))return analyticalDocument(doc,common);
  if(family==='observations')return {...common,axes:{...doc.axes},data:doc.data.map((r,row)=>({...r,row,group:r.group||uiText('观测')}))};
  if(family==='samples'){
    // Retain persisted row IDs. Legacy display labels only provide names for
    // schemas without a sample label; they never replace a stored record ID.
    const occurrences=new Map(),identified=doc.data.every(r=>text(r.label));
    return {...common,identity:identified?'label':'multiset',data:doc.data.map((r,row)=>{
      const token=key(r.group,r.value),occurrence=occurrences.get(token)||0;occurrences.set(token,occurrence+1);
      return {...r,row,label:identified?key('id',r.label):key('sample',r.group,r.value,occurrence),sampleName:identified?r.label:uiMessage`${r.group} · 样本 ${row+1}`};
    })};
  }
  const log=doc.template==='forest';
  return {...common,scale:log?'log':'linear',reference:log?1:null,intervalLabel:doc.intervalLabel,
    data:doc.data.map((r,row)=>({...r,row,group:uiText('估计'),low:log?r.lower:r.low,high:log?r.upper:r.high}))};
}

export function scientificEligibility(doc,view){
  const bad=reason=>({valid:false,reason}),family=scientificFamily(view);
  if(!family||doc?.family!==family)return bad(uiText('此图型需要对应的原始样本或区间数据。'));
  if(!text(doc.title)||!text(doc.unit)||!text(doc.source?.name)||!Array.isArray(doc.data)||!doc.data.length)return bad(uiText('请填写标题、单位、来源与原始记录。'));
  const rows=doc.data;
  if(isAdvancedRelationsView(view))return advancedRelationsEligibility(doc,view);
  if(isMultivariateExtendedView(view))return multivariateExtendedEligibility(doc,view);
  if(isEngineeringView(view))return engineeringEligibility(doc,view);
  if(isTimePlanningView(view))return timePlanningEligibility(doc,view);
  if(isQualityView(view))return qualityEligibility(doc,view);
  if(isTemporalView(view))return temporalEligibility(doc,view);
  if(isRegressionDiagnosticView(view))return regressionDiagnosticEligibility(doc,view);
  if(isNetworkView(view))return networkEligibility(doc,view);
  if(isComparisonView(view))return comparisonEligibility(doc,view);
  if(isStatisticalView(view))return statisticalEligibility(doc,view);
  if(isStructuralView(view))return structuralEligibility(doc,view);
  if(isBusinessSeriesView(view))return businessSeriesEligibility(doc,view);
  if(isFrequencyView(view))return frequencyEligibility(doc,view);
  if(isDistributionView(view))return distributionEligibility(doc,view);
  if(isSerialView(view))return serialEligibility(doc,view);
  if(isProcessView(view))return processEligibility(doc,view);
  if(isMultivariateView(view))return multivariateEligibility(doc,view);
  if(isExploratoryView(view))return exploratoryEligibility(doc,view);
  if(rows.some(r=>!text(r.label))||new Set(rows.map(r=>r.label)).size!==rows.length)return bad(uiText('对象或样本需要唯一标识。'));
  if(isDiagnosticView(view))return diagnosticEligibility(doc,view);
  if(isAnalyticalView(view))return analyticalEligibility(doc,view);
  if(family==='observations'){
    if(rows.length<3||rows.length>300||rows.some(r=>!finite(r.x)||!finite(r.y))||!text(doc.axes?.x)||!text(doc.axes?.y))return bad(uiText('需要 3–300 个对象的 X、Y 观测，轴名称写明指标与单位。'));
    if(view==='obs-bubble'&&(rows.some(r=>!finite(r.size)||r.size<=0)||!text(doc.axes.size)))return bad(uiText('气泡需要每个对象真实的正数 size，以及大小指标的名称与单位。'));
    if(['obs-regression','obs-confidence'].includes(view)){
      if(rows.length<4||new Set(rows.map(r=>r.group)).size>1||new Set(rows.map(r=>r.x)).size<2)return bad(uiText('回归需要至少 4 个独立观测、一个分析组，并且 X 有变化；不能自动合并不同分组。'));
      const fit=linearFit(rows);if(![fit.slope,fit.intercept,fit.sd].every(Number.isFinite))return bad(uiText('当前数值范围不能稳定拟合，请核对数值和量纲。'));
    }
  }else if(family==='samples'){
    if(rows.some(r=>!text(r.group)||!finite(r.value)))return bad(uiText('每个样本填写分组与实际数值，缺失观测不能填成 0。'));
    const groups=[...new Set(rows.map(r=>r.group))],density=['sample-violin','sample-raincloud','sample-ridge'].includes(view),min=density?12:3;
    if(groups.length<2||groups.length>6||groups.some(g=>{const n=rows.filter(r=>r.group===g).length;return n<min||n>160;}))return bad(uiMessage`支持 2–6 组，每组 ${min}–160 个原始样本${density?uiText('；密度图需要足够样本'):''}。`);
    if(!['label','multiset'].includes(doc.identity))return bad(uiText('样本标识方式无效。'));
  }else{
    if(rows.length<3||rows.length>12||!text(doc.intervalLabel)||!['linear','log'].includes(doc.scale))return bad(uiText('需要 3–12 项估计结果，并说明输入区间的水平与定义。'));
    if(rows.some(r=>![r.estimate,r.low,r.high].every(finite)||r.low>r.estimate||r.estimate>r.high||doc.scale==='log'&&r.low<=0))return bad(uiText('须满足下界 ≤ 估计值 ≤ 上界；对数尺度的全部值必须大于 0。'));
  }
  return {valid:true,reason:''};
}

export function scientificCompatibility(a,b){
  if(a?.family!==b?.family)return uiText('图型数据结构不同');
  if(a.family?.startsWith('relationx-'))return advancedRelationsCompatibility(a,b);
  if(a.family?.startsWith('mvx-'))return multivariateExtendedCompatibility(a,b);
  if(a.family?.startsWith('engineering-'))return engineeringCompatibility(a,b);
  if(a.family?.startsWith('planning-'))return timePlanningCompatibility(a,b);
  if(a.family?.startsWith('quality-'))return qualityCompatibility(a,b);
  if(a.family?.startsWith('temporal-'))return temporalCompatibility(a,b);
  if(a.family?.startsWith('regression-'))return regressionDiagnosticCompatibility(a,b);
  if(['network-undirected', 'network-directed'].includes(a.family))return networkCompatibility(a,b);
  if(['comparison-samples', 'comparison-counts', 'comparison-residuals', 'comparison-spread'].includes(a.family))return comparisonCompatibility(a,b);
  if(['statistical-observations', 'statistical-survival'].includes(a.family))return statisticalCompatibility(a,b);
  if(['matrix-cell', 'contingency', 'hierarchy-tree'].includes(a.family))return structuralCompatibility(a,b);
  if(['business-target', 'business-metrics', 'business-paired'].includes(a.family))return businessSeriesCompatibility(a,b);
  if(a.family==='frequency-response')return frequencyCompatibility(a,b);
  if(a.family==='distribution')return distributionCompatibility(a,b);
  if(a.family==='serial')return serialCompatibility(a,b);
  if(a.family==='process')return processCompatibility(a,b);
  if(a.family==='multivariate')return multivariateCompatibility(a,b);
  if(['matrix','ordered-estimates','trajectory','spatial'].includes(a.family))return exploratoryCompatibility(a,b);
  if(['method','prediction','confusion'].includes(a.family))return diagnosticCompatibility(a,b);
  if(['univariate','evaluation','correlation'].includes(a.family))return analyticalCompatibility(a,b);
  if(a.family==='observations'&&(a.axes.x!==b.axes.x||a.axes.y!==b.axes.y||(a.axes.size&&b.axes.size&&a.axes.size!==b.axes.size)))return uiText('坐标或大小指标的含义、单位不同');
  if(a.family==='samples'&&a.identity!==b.identity)return uiText('样本标识方式不同');
  if(a.family==='estimates'&&(a.scale!==b.scale||a.intervalLabel!==b.intervalLabel||a.reference!==b.reference))return uiText('区间定义、尺度或参考值不同');
  return '';
}
export function scientificBounds(doc,view){
  if(isAdvancedRelationsView(view))return advancedRelationsBounds(doc,view);
  if(isMultivariateExtendedView(view))return multivariateExtendedBounds(doc,view);
  if(isEngineeringView(view))return engineeringBounds(doc,view);
  if(isTimePlanningView(view))return timePlanningBounds(doc,view);
  if(isQualityView(view))return qualityBounds(doc,view);
  if(isTemporalView(view))return temporalBounds(doc,view);
  if(isRegressionDiagnosticView(view))return regressionDiagnosticBounds(doc,view);
  if(isNetworkView(view))return networkBounds(doc,view);
  if(isComparisonView(view))return comparisonBounds(doc,view);
  if(isStatisticalView(view))return statisticalBounds(doc,view);
  if(isStructuralView(view))return structuralBounds(doc,view);
  if(isBusinessSeriesView(view))return businessSeriesBounds(doc,view);
  if(isFrequencyView(view))return frequencyBounds(doc,view);
  if(isDistributionView(view))return distributionBounds(doc,view);
  if(isSerialView(view))return serialBounds(doc,view);
  if(isProcessView(view))return processBounds(doc);
  if(isMultivariateView(view))return multivariateBounds(doc);
  if(isExploratoryView(view))return exploratoryBounds(doc);
  if(isDiagnosticView(view))return diagnosticBounds(doc);
  if(isAnalyticalView(view))return analyticalBounds(doc);
  if(doc.family==='observations'){
    const x=extent(doc.data,r=>r.x),values=doc.data.map(r=>r.y);
    if(['obs-regression','obs-confidence'].includes(view)&&scientificEligibility(doc,view).valid){const fit=linearFit(doc.data);for(const at of x){const p=fit.interval(at);values.push(p.lower,p.upper);}}
    return {x,y:extent(values)};
  }
  if(doc.family==='samples'){
    const groups=groupStats(doc.data),density=violinDensity(groups.map(g=>({name:g.name,values:g.rows.map(r=>r.value)})),63);
    return {value:extent([...density.domain,...groups.flatMap(g=>[g.mean-g.sd,g.mean+g.sd])])};
  }
  return {value:extent([...doc.data.flatMap(r=>[r.low,r.high]),...(doc.reference===null?[]:[doc.reference])])};
}
export function scientificRecipe(from,to){
  if(isAdvancedRelationsView(to))return advancedRelationsRecipe(from,to);
  if(isMultivariateExtendedView(to))return multivariateExtendedRecipe(from,to);
  if(isEngineeringView(to))return engineeringRecipe(from,to);
  if(isTimePlanningView(to))return timePlanningRecipe(from,to);
  if(isQualityView(to))return qualityRecipe(from,to);
  if(isTemporalView(to))return temporalRecipe(from,to);
  if(isRegressionDiagnosticView(to))return regressionDiagnosticRecipe(from,to);
  if(isNetworkView(to))return networkRecipe(from,to);
  if(isComparisonView(to))return comparisonRecipe(from,to);
  if(isStatisticalView(to))return statisticalRecipe(from,to);
  if(isStructuralView(to))return structuralRecipe(from,to);
  if(isBusinessSeriesView(to))return businessSeriesRecipe(from,to);
  if(isFrequencyView(to))return frequencyRecipe(from,to);
  if(isDistributionView(to))return distributionRecipe(from,to);
  if(isSerialView(to))return serialRecipe(from,to);
  if(isProcessView(to))return processRecipe(from,to);
  if(isMultivariateView(to))return multivariateRecipe(from,to);
  if(isExploratoryView(to))return exploratoryRecipe(from,to);
  if(isDiagnosticView(to))return diagnosticRecipe(from,to);
  if(isAnalyticalView(to))return analyticalRecipe(from,to);
  const family=scientificFamily(to);
  if(from===to)return {id:'science-update',name:uiText('对应观测更新'),description:uiText('保留对象标识，位置和范围随实际数据更新。')};
  if(family==='observations')return [from,to].includes('obs-bubble')?{id:'science-size',name:uiText('按真实面积展开'),description:uiText('每个点保留 X、Y 位置，面积随真实大小指标展开或收起。')}:{id:'science-fit',name:uiText('趋势与区间展开'),description:uiText('保留原始散点，回归线与均值响应置信带逐步展开。')};
  if(family==='samples')return {id:'science-distribution',name:uiText('样本与摘要展开'),description:uiText('原始样本始终保留，改变排列方向，再展开由这些样本计算的分位数、密度或均值与 SD。')};
  return {id:'science-interval',name:uiText('估计点与区间转向'),description:uiText('估计点与上下界一起移动；区间定义、尺度和参考值保持不变。')};
}

export function scientificGuide(doc,view){
  if(isAdvancedRelationsView(view))return advancedRelationsGuide(doc,view);
  if(isMultivariateExtendedView(view))return multivariateExtendedGuide(doc,view);
  if(isEngineeringView(view))return engineeringGuide(doc,view);
  if(isTimePlanningView(view))return timePlanningGuide(doc,view);
  if(isQualityView(view))return qualityGuide(doc,view);
  if(isTemporalView(view))return temporalGuide(doc,view);
  if(isRegressionDiagnosticView(view))return regressionDiagnosticGuide(doc,view);
  if(isNetworkView(view))return networkGuide(doc,view);
  if(isComparisonView(view))return comparisonGuide(doc,view);
  if(isStatisticalView(view))return statisticalGuide(doc,view);
  if(isStructuralView(view))return structuralGuide(doc,view);
  if(isBusinessSeriesView(view))return businessSeriesGuide(doc,view);
  if(isFrequencyView(view))return frequencyGuide(doc,view);
  if(isDistributionView(view))return distributionGuide(doc,view);
  if(isSerialView(view))return serialGuide(doc,view);
  if(isProcessView(view))return processGuide(doc,view);
  if(isMultivariateView(view))return multivariateGuide(doc,view);
  if(isExploratoryView(view))return exploratoryGuide(doc,view);
  if(isDiagnosticView(view))return diagnosticGuide(doc,view);
  if(isAnalyticalView(view))return analyticalGuide(doc,view);
  const family=scientificFamily(view),intro=scientificViews.find(v=>v.id===view)?.note||'';
  const limit=findTemplate(doc?.template)?.limit||'';
  const text=family==='observations'?uiText('每行填写一个对象，名称唯一，X、Y 都是实际数值，并在坐标名称中写清单位。有真实规模指标时可选气泡；没有 size 时保持等大点。回归仅用于单组独立观测的线性关系，置信带依赖线性、独立、同方差和正态误差等假设。'):family==='samples'?uiMessage`每行是一份独立样本，填写分组和原始观测值，已有样本名称时请保持唯一。不要把均值、总计或已经算好的四分位数当成原始样本。本模板建议的展示范围：${limit}。容量按当前图型检查，完整原始记录仍会保留；密度视图每组至少需要 12 个样本。`:uiText('每行填写对象、点估计和已经计算好的上下界，并说明区间类型与置信水平。森林图继续使用比值对数轴和参考值 1，样本量只作信息展示，不当成合并权重，也不自动合并效应。');
  const detail=family==='samples'?uiText('箱线采用线性插值分位数和 1.5 × IQR 须线；密度使用共用高斯核带宽。标准差采用 n−1 分母，全部重复值和离群样本都保留。记录 ID 随数据保存，修改名称、数值或顺序不改变身份。旧作品首次迁移时无法恢复缺失的个人编号，关联关系需由用户确认。全部观测相同时，密度宽度由回退带宽决定，不能解读为估计出的分布宽度。'):uiText('在「沿用当前数据」中选择适用图型，可以直接跳步或反向试播；轴含义、区间定义不同或数据独立时，改用图表本身的入场动画。');
  return [intro,text,detail];
}

export function scientificSharedBounds(entries){
  if(!entries.length)return undefined;
  const list=entries.map(({doc,view})=>scientificBounds(doc,view)),bounds=Object.fromEntries(Object.keys(list[0]).map(k=>{const values=list.flatMap(b=>b[k]||[]);return [k,[Math.min(...values),Math.max(...values)]];}));
  return analyticalSharedBounds(entries,bounds);
}
