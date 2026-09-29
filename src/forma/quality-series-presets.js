import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
import {qualityText as t} from './quality-series-rules.js';
const preset=(id,template,zh,en,description,english,views)=>({id,template,category:'research',get name(){return t(zh,en);},get description(){return t(description,english);},get dataNote(){return t('原生质量图表示例 · 合成原始数据 · 基线与原始记录完整保留。','Native quality-chart example · synthetic raw data · retain complete originals and baseline parameters.');},get relation(){return t('同一过程原记录 · 连续换坐标','Same original process records · continuous coordinates');},views});
export const qualityPresets=[
 preset('quality-proportion-story','pcontrol','批次比例与检查规模','Batch proportions and inspection size','不合格比例按采集顺序展开，再移动到真实样本量坐标，核查小批次的波动。','Unfold proportions in acquisition order, then move to actual sample sizes to inspect small-batch variability.',['quality-proportion','quality-proportion-size']),
 preset('quality-defects-story','ucontrol','缺陷率与暴露量','Defect intensity and exposure','同一批缺陷率从时间顺序移向检查暴露量，保留实际分母和对应控制界限。','Move the same defect intensities from time order to inspection exposure, retaining real denominators and corresponding limits.',['quality-defects','quality-defects-exposure']),
 preset('quality-cusum-story','cusum','单次超额如何累计','How individual excess accumulates','原始标准偏离保持可见，单次超过 K 的正负超额连续变成含完整历史的双侧累积量。','Keep original standardized departures visible as individual excess beyond K transforms into two-sided accumulation with complete histories.',['quality-cusum-contributions','quality-cusum']),
 preset('quality-ewma-story','ewma','加权漂移与当期偏离','Smoothed drift and current departures','原始测量与加权轨迹连续拆成基线偏移和当期偏离，解释平滑曲线背后的原始值。','Split raw measurements and their weighted trace into baseline drift and current departures, explaining the originals behind the smoothed series.',['quality-ewma','quality-ewma-decomposition']),
 preset('quality-subgroup-story','xbar','过程水平与组内差异','Process levels and within-group differences','保留均值与极差双面板，把每个原始样本移到自身子组的中心化坐标。','Retain mean/range panels and move each original sample to coordinates centered on its own subgroup.',['quality-xbar','quality-subgroup-residuals']),
 preset('quality-funnel-story','funnelcontrol','机构规模与标准化偏离','Unit size and standardized departure','按完整样本量展示事件比例，再以相同目标和真实二项标准误展开标准化偏离。','Show event proportions by complete sample size, then reveal standardized departures using the same target and actual binomial standard errors.',['quality-funnel','quality-funnel-standardized'])
];
export function qualityRecords(id,palette='ink'){
 const preset=qualityPresets.find(p=>p.id===id);if(!preset)return null;const source=getExample(preset.template);source.title=preset.name;source.subtitle=preset.relation;source.source={name:t('FORMA 质量过程场景 · 合成数据','FORMA quality process · synthetic data'),type:'demo'};
 const doc=withRecordIds(source,{legacyNamespace:'scenario:'+id});return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:'scenario:'+id,relation:'auto',scale:'shared',options:{palette}}));
}
