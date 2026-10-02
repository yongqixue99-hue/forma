import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
import {completionBusinessViews,completionBusinessText as t} from './completion-business-rules.js';
const specs=[
 ['waterfall','增长桥接与真实增减','Growth bridges and original changes','把累计净额桥接连续展开为原始正负变化，首尾总量保持独立。','Unfold a running-balance bridge into original signed changes while keeping initial/final totals distinct.'],
 ['marimekko','构成面积与绝对规模','Composition area and absolute size','同一完整交叉表从变宽构成连续移动到各组的绝对数量堆叠。','Move the same complete cross-table from variable-width composition into absolute-count group stacks.'],
 ['range','日内范围与起始偏离','Daily ranges and opening departures','真实日期间隔保留，高低开收原点连续移动到相对本条起始值的坐标。','Retain actual date spacing and move the same OHLC marks to departures from each record’s opening value.'],
 ['pyramid','两组分布换一种比较','Compare two populations in another way','镜像数量条形连续展开为同一正数量轴上的并列条形。','Unfold mirrored quantity bars into paired bars on a common positive quantity axis.'],
 ['dendrogram','目录树的径向展开','A directory tree unfolds radially','原父子归属与叶值面积完整保留，树的节点和联系连续换位置。','Retain original parent-child membership and leaf-value area while nodes and links continuously change positions.'],
 ['likert','态度分布的完整构成','Complete attitude-response composition','保留五档回答的身份和比例，从中立居中连续移动到零起点堆叠。','Retain all five response identities and proportions while moving from neutral-centered to zero-based stacks.'],
 ['forecastfan','预测范围与当前偏离','Forecast intervals and current departures','输入中位数与三层预测范围同时换坐标，解释相对最后实际值的偏离。','Move the supplied median and three interval layers together to explain departures from the last actual value.'],
 ['tornado','敏感性与两情景对照','Sensitivity and paired scenarios','保留低高输入情景，按影响排序的输出连续移动到两情景对照平面。','Retain low/high input scenarios and move impact-ordered outputs to a paired-scenario comparison plane.'],
 ['variwide','数量率量与实际总量','Quantity, rate and resulting amount','原数量与原单位率组成的矩形连续展成同一乘积的总量条形。','Unfold rectangles encoding original quantities and unit rates into amount bars for their identical products.'],
 ['stackedwaterfall','分量桥接与原始增减','Component bridges and original changes','正负分量从逐步净额连续展开为原始增减，始末总量完整保留。','Unfold opposing components from running net balances into raw changes while retaining initial/final totals.'],
 ['nomogram','输入贡献如何形成总分','How input contributions form a score','固定原系数与参考值，把共同贡献刻度连续展开为累计线性分数。','Retain fixed supplied coefficients and references while unfolding contribution rulers into cumulative linear scores.'],
 ['labbe','双组比例与绝对比例差','Paired rates and absolute differences','原研究气泡从对照与处理事件比例连续移动到对照比例与两组比例差。','Move original study bubbles from paired control/treatment event rates to control rates and between-arm risk differences.']
];
export const completionBusinessPresets=specs.map(([template,zh,en,description,english])=>({id:'complete-business-'+template+'-story',template,...(['forecastfan','nomogram','labbe'].includes(template)?{category:'research'}:{}),get name(){return t(zh,en);},get description(){return t(description,english);},get dataNote(){return t('原生图表示例 · 确定性合成数据 · 保留全部原始字段、身份与单位。','Native chart example · deterministic synthetic data · retain all raw fields, identities and units.');},get relation(){return t('同一批完整原记录 · 连续换坐标','Same complete original records · continuous coordinates');},views:completionBusinessViews.filter(v=>v.family==='complete-business-'+template).map(v=>v.id)}));
export function completionBusinessRecords(id,palette='ink'){
 const preset=completionBusinessPresets.find(p=>p.id===id);if(!preset)return null;
 const source=getExample(preset.template);source.title=preset.name;source.subtitle=preset.relation;source.source={name:t('FORMA 完整图表场景 · 合成原始数据','FORMA complete chart scenario · synthetic original data'),type:'demo'};
 const doc=withRecordIds(source,{legacyNamespace:'scenario:'+id});return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:'scenario:'+id,relation:'auto',scale:'shared',options:{palette}}));
}
