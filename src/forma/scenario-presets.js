import {qualityPresets,qualityRecords} from './quality-series-presets.js';
import {timePlanningPresets,timePlanningRecords} from './time-planning-presets.js';
import {engineeringPresets,engineeringRecords} from './engineering-series-presets.js';
import {multivariateExtendedPresets,multivariateExtendedRecords} from './multivariate-extended-presets.js';
import {advancedRelationsPresets,advancedRelationsRecords} from './advanced-relations-presets.js';
import {temporalPresets,temporalRecords} from './temporal-series-presets.js';
import {regressionDiagnosticPresets,regressionDiagnosticRecords} from './regression-diagnostic-presets.js';
import {comparisonPresets,comparisonRecords} from './comparison-series-presets.js';
import {networkPresets,networkRecords} from './network-series-presets.js';
import {businessSeriesPresets,businessSeriesRecords} from './business-series-presets.js';
import {structuralPresets,structuralRecords} from './structural-series-presets.js';
import {statisticalPresets,statisticalRecords} from './statistical-series-presets.js';
import {distributionPresets,distributionRecords} from './distribution-presets.js';
import {frequencyPresets,frequencyRecords} from './frequency-presets.js';
import {realPresetDetails,realScenarioRecords} from './real-scenario-data.js';
import {narrativePresets,narrativeRecords} from './narrative-presets.js';
import {processPresets,processRecords} from './process-presets.js';
import {multivariatePresets,multivariateRecords} from './multivariate-presets.js';
import {publicCases,publicCaseRecords} from './public-cases.js';
import {mappedAxes} from './data-contract.js';
import {diagnosticPresets,diagnosticRecords} from './diagnostic-presets.js';
import {analyticalPresets,analyticalRecords} from './analytical-presets.js';
import {scientificPresets,scientificRecords} from './scientific-presets.js';
import {getExample} from './catalog.js';
import {exploratoryPresets,exploratoryRecords} from './exploratory-presets.js';
import {refinementPresets,refinementRecords} from './refinement-presets.js';

export const scenarioPresets=[
  ...analyticalPresets.filter(p=>p.id==='screening-effectiveness'),
  ...advancedRelationsPresets,
  ...multivariateExtendedPresets,
  ...engineeringPresets,
  ...timePlanningPresets,
  ...qualityPresets,
  ...temporalPresets,
  ...regressionDiagnosticPresets,
  ...networkPresets,
  ...comparisonPresets,
  ...statisticalPresets,
  ...structuralPresets,
  ...businessSeriesPresets,
  ...distributionPresets,
  ...frequencyPresets,
  ...publicCases,
  ...narrativePresets,
  ...processPresets,
  ...multivariatePresets,
  ...refinementPresets,
  ...exploratoryPresets,
  ...diagnosticPresets,
  ...analyticalPresets.filter(p=>p.id!=='screening-effectiveness'),
  ...scientificPresets,
  {id:'paired-evaluation',name:'前后测评',description:'同一批对象的前后两次记录，从端点与连线，到成对柱，再查看每个对象的变化量。',dataNote:'三列：对象、前值、后值。名称唯一，前后使用同一单位，保留完整配对。五种图型之间可以任意切换，无需按预设顺序播放。',relation:'同一批对象 · 前后配对',views:['paired-slope','paired-dumbbell','paired-bars','paired-points','paired-change']},
  {id:'paired-study',name:'配对样本观察',description:'保留每个样本的两次测量，再把前值对齐为零，观察每一对的真实变化。',dataNote:'三列：唯一样本、第一次观测、第二次观测。支持最多 50 对，不能把未配对的两组数据按行凑在一起；本图不生成显著性检验。',relation:'20 对合成样本 · 个体变化',views:['paired-points','paired-change']},
  {id:'research-budget',name:'科研经费分配',description:'同一份项目预算，从环形层级展开成冰柱，再按面积读取各子项。',dataNote:'三列：父类别、子项、金额。只填写子项，父级由系统求和；每笔支出只归属一个子项，所有金额使用同一单位。',relation:'同一份预算 · 两级层级',views:['hierarchy-sunburst','hierarchy-icicle','hierarchy-treemap']},
  {id:'unit-counts',name:'逐项计数',description:'把每根柱拆成可数的圆点，再合拢比较。每个点代表一个单位，数量不取整。',dataNote:'两列：类别、数量。填写 0–50 的整数，最多 12 类。圆点按数量升序排列，同一类别保持颜色。',relation:'同一组数据 · 每点一个单位',views:['columns','unit','lollipop','bars']},
  {id:'inventory',name:'库存变更',description:'每次补货或出库后，库存保持到下一次变更。阶梯宽度对应真实时间间隔。',dataNote:'两列：变更日期、变更后库存。日期使用 YYYY-MM-DD；记录的是当时库存，不是进出库增量。缺失记录留空。',relation:'同一组数据 · 变更后持续生效',views:['line','step','area']},
  {id:'cyclic',name:'周期变化',description:'查看一天内每两小时的访问量，让直角坐标中的观测环绕成一个完整周期。',dataNote:'两列：等间隔周期、非负数值。按周期顺序排列；只有首尾相接的周期数据适合闭合。半径表示数值。',relation:'同一组数据 · 等间隔完整周期',views:['columns','radialbars','polarline']},
  {id:'channel-comparison',name:'渠道分项对比',description:'从渠道内的分项比较，到渠道总量，再读取各项占比。横向布局给较长的名称留出空间。',dataNote:'三列：渠道、收入分项、金额。每个渠道填写全部分项，金额同单位、互不重复。占比由原始金额计算。',relation:'同一份数据 · 类别与分项',views:['grouped-columns','grouped-bars','stacked-bars','percent-bars']},
  {id:'series-revenue',name:'多渠道收入',description:'同一份季度收入，从系列对比、整体规模看到份额变化。每个分项在变形中保持对应。',dataNote:'三列：时期、系列、数值。每期包含全部渠道，收入使用同一单位且互不重复。百分比由原始金额自动计算，表格始终保留原值。',relation:'同一份数据 · 多系列联动',views:['grouped-columns','stacked-columns','percent-columns','percent-area','stacked-area','multi-line']},
  {id:'series-change',name:'多组趋势',description:'比较两条业务线的月度变化，保留负数、零值与缺失月份。',dataNote:'三列：月份、业务线、净变化。按月份排列，每期都填写两条业务线。未采集的观测留空；负号表示减少，真实不变才填写 0。',relation:'同一份数据 · 正负与缺失',views:['grouped-columns','multi-line']},
  {id:'monthly',name:'月度趋势',description:'同一指标的全年记录，从每月数量看到走势。缺失月份保留缺口。',dataNote:'两列：月份、数值。按时间顺序填写；未采集的月份留空，不填写 0。',relation:'同一组数据 · 有序时间',views:['columns','line','area']},
  {id:'channels',name:'渠道构成',description:'同一期间、互不重叠的渠道收入，先比较数量，再观察整体构成。',dataNote:'两列：渠道、收入。各渠道口径一致、金额可相加；不要混入总计行。',relation:'同一组数据 · 整体与部分',views:['bars','bubbles','treemap','donut']},
  {id:'comparison',name:'前后对比',description:'比较同一批渠道在两个季度的收入。固定刻度，保留渠道颜色。',dataNote:'每一步填写对应季度的数据，渠道名称保持一致；新增或退出的渠道单独进出。',relation:'两组数据 · 同一批对象',views:['columns','columns','bars']},
  {id:'contribution',name:'累计贡献',description:'从各项支出到累计占比，再看它们如何累加成总支出。',dataNote:'两列：支出项目、金额。填写互不重复的正向支出，不含已经汇总的总计。',relation:'同一组数据 · 可加总项目',views:['columns','pareto','waterfall']},
  {id:'cashflow',name:'收支变化',description:'每月净现金流允许正数、负数与零值，围绕共同零基线观察变化。',dataNote:'两列：月份、净现金流。流入减流出得到净值，保留负号；真实没有变化才填写 0。',relation:'同一组数据 · 正负数值',views:['columns','diverging','line','dot']},
  {id:'conversion',name:'转化阶段',description:'追踪同一批访客从访问到付费的去向，按阶段顺序查看人数。',dataNote:'两列：阶段、人数。每一阶段来自前一阶段的同一批对象；不要把不同人群混在一起。',relation:'同一批对象 · 有序阶段',views:['bars','funnel-bars']}
].map(p=>Object.defineProperties({}, {...Object.getOwnPropertyDescriptors(p),...Object.getOwnPropertyDescriptors(realPresetDetails(p.id)||{})}));

export const scenarioCategory=p=>p.category==='research'||['paired-study','research-budget'].includes(p.id)?'research':'regular';

export function morphBaseDocument(doc){
  const gaps=doc.data.some(r=>r.value===null),base=getExample(gaps?'singleline':'bar');
  const mapped={...base,title:doc.title,subtitle:doc.subtitle||'',unit:doc.unit,source:structuredClone(doc.source),...(doc.provenance?{provenance:structuredClone(doc.provenance)}:{}),data:doc.data.map(r=>({... (r._id?{_id:r._id}:{}),...(r._extra?{_extra:structuredClone(r._extra)}:{}),...(gaps?{period:r.label,value:r.value}:{label:r.label,value:r.value})}))};
  if(doc.tableInput){mapped.tableInput=structuredClone(doc.tableInput);const columns=mapped.tableInput.fieldColumns,category=columns.label??columns.period??columns.date;delete columns.label;delete columns.period;delete columns.date;columns[gaps?'period':'label']=category;}
  const axes=mappedAxes(doc,base.template);if(axes)mapped.axes=axes;
  return mapped;
}

export function scenarioRecords(id,palette){
  const publicRecords=publicCaseRecords(id,palette);if(publicRecords)return publicRecords;
  palette??='ink';
  const advancedRelations=advancedRelationsRecords(id,palette);if(advancedRelations)return advancedRelations;
  const multivariateExtended=multivariateExtendedRecords(id,palette);if(multivariateExtended)return multivariateExtended;
  const engineering=engineeringRecords(id,palette);if(engineering)return engineering;
  const timePlanning=timePlanningRecords(id,palette);if(timePlanning)return timePlanning;
  const quality=qualityRecords(id,palette);if(quality)return quality;
  const temporal=temporalRecords(id,palette);if(temporal)return temporal;
  const regressionDiagnostic=regressionDiagnosticRecords(id,palette);if(regressionDiagnostic)return regressionDiagnostic;
  const network=networkRecords(id,palette);if(network)return network;
  const comparison=comparisonRecords(id,palette);if(comparison)return comparison;
  const statistical=statisticalRecords(id,palette);if(statistical)return statistical;
  const structural=structuralRecords(id,palette);if(structural)return structural;
  const businessSeries=businessSeriesRecords(id,palette);if(businessSeries)return businessSeries;
  const distribution=distributionRecords(id,palette);if(distribution)return distribution;
  const frequency=frequencyRecords(id,palette);if(frequency)return frequency;
  const real=realScenarioRecords(id,scenarioPresets.find(p=>p.id===id)?.views,palette);if(real)return real;
  const narrative=narrativeRecords(id,palette);if(narrative)return narrative;
  const process=processRecords(id,palette);if(process)return process;
  const multivariate=multivariateRecords(id,palette);if(multivariate)return multivariate;
  const refinement=refinementRecords(id,palette);if(refinement)return refinement;
  const exploratory=exploratoryRecords(id,palette);if(exploratory)return exploratory;
  const diagnostic=diagnosticRecords(id,palette);if(diagnostic)return diagnostic;
  const analytical=analyticalRecords(id,palette);if(analytical)return analytical;
  const scientific=scientificRecords(id,palette);if(scientific)return scientific;
  const preset=scenarioPresets.find(p=>p.id===id);if(!preset)return null;
  if(['paired-evaluation','paired-study','research-budget'].includes(id)){
    let doc;
    if(id==='paired-evaluation')doc={...getExample('slope'),title:'两次测评结果',subtitle:'8 个对象 · 同一指标、同一单位 · 连线表示配对关系',unit:'分',periodLabels:['第一次测评','第二次测评'],data:['对象 A','对象 B','对象 C','对象 D','对象 E','对象 F','对象 G','对象 H'].map((label,i)=>({label,before:[42,58,71,38,65,52,76,46][i],after:[63,68,65,59,79,70,76,61][i]}))};
    else if(id==='paired-study')doc={...getExample('paired'),title:'个体测量与变化',subtitle:'同一样本两次测量 · 变化量 = 后值 − 前值'};
    else doc={...getExample('icicle'),title:'科研项目经费分配',subtitle:'父类别由子项汇总 · 同一份预算的三种读法',unit:'万元',data:[['实验','耗材',24],['实验','设备',18],['实验','检测',12],['采集','田野',22],['采集','访谈',16],['采集','问卷',14],['计算','算力',8],['计算','存储',6],['计算','服务',5]].map(([parent,label,value])=>({parent,label,value}))};
    doc.source={name:'FORMA 场景演示 · 合成数据',type:'demo'};
    return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,options:{palette},scale:'shared'}));
  }
  if(id==='channel-comparison'){
    const doc={...getExample('stackedbar'),title:'渠道收入分项',subtitle:'比较分项、合计与占比 · 表格保留原始金额'};
    return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,options:{palette}}));
  }
  if(id.startsWith('series-')){
    const revenue=id==='series-revenue',periods=revenue?['Q1','Q2','Q3','Q4']:['1月','2月','3月','4月','5月','6月'];
    const names=revenue?['直销','合作','线上']:['业务 A','业务 B'];
    const values=revenue?[[54,28,18],[61,34,31],[65,42,49],[73,51,68]]:[[24,16],[18,-8],[null,21],[-12,0],[32,26],[42,38]];
    const doc={...getExample('tide'),title:revenue?'季度渠道收入':'业务月度净变化',subtitle:revenue?'同一组原始金额 · 比较、总量与构成':'同单位 · 3 月业务 A 未采集，保留断点',unit:'万元',source:{name:'FORMA 场景演示 · 合成数据',type:'demo'},data:periods.flatMap((period,i)=>names.map((series,j)=>({period,series,value:values[i][j]})))};
    return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}}));
  }
  const months=Array.from({length:12},(_,i)=>`${i+1}月`);
  const samples={
    'unit-counts':{title:'本月完成项目',unit:'项',labels:['研究','视觉','产品','交互','工程','内容'],values:[18,12,24,9,32,16],subtitle:'一点代表一项 · 按真实数量拆分与合拢'},
    inventory:{title:'仓库库存变更',unit:'件',labels:['2026-08-01','2026-08-03','2026-08-08','2026-08-09','2026-08-16','2026-08-19','2026-08-23','2026-08-31'],values:[32,46,28,54,null,39,52,44],subtitle:'每次记录为变更后的库存 · 8 月 16 日未采集'},
    cyclic:{title:'全天访问节律',unit:'千次',labels:Array.from({length:12},(_,i)=>`${String(i*2).padStart(2,'0')} 时`),values:[18,11,8,15,32,47,39,51,46,62,48,29],subtitle:'每两小时一次观测 · 首尾相接的完整周期'},
    monthly:{title:'月度销售额',unit:'万元',labels:months,values:[42,48,45,58,null,61,68,76,72,85,93,106],subtitle:'全年月度记录 · 5 月未采集，保留断点'},
    channels:{title:'各渠道收入构成',unit:'万元',labels:['官网','门店','电商','合作伙伴','海外'],values:[128,104,82,65,39],subtitle:'同一季度 · 每笔收入只归属一个渠道'},
    comparison:{title:'第一季度渠道收入',unit:'万元',labels:['官网','门店','电商','合作伙伴','海外','其他'],values:[68,92,58,41,27,16],subtitle:'同一批渠道 · 前后使用共同刻度'},
    contribution:{title:'项目支出构成',unit:'万元',labels:['研发','运营','采购','营销','物流','服务'],values:[42,18,26,12,8,5],subtitle:'各项支出互不重复 · 累计占比基于总支出'},
    cashflow:{title:'月度净现金流',unit:'万元',labels:months,values:[24,-12,18,0,-8,36,42,-15,28,54,39,62],subtitle:'净现金流 = 流入 − 流出 · 正负值共用零基线'},
    conversion:{title:'访客转化阶段',unit:'人',labels:['访问','注册','激活','试用','付费'],values:[9000,4200,2800,1400,620],subtitle:'同一批访客 · 后续阶段是前一阶段的子集'}
  };
  const data=samples[id],doc=morphBaseDocument({...data,source:{name:'FORMA 场景演示 · 合成数据',type:'demo'},data:data.labels.map((label,i)=>({label,value:data.values[i]}))});
  return preset.views.map((view,i)=>{
    const copy=structuredClone(doc);
    if(id==='comparison'&&i>0){copy.title='第二季度渠道收入';copy.data.forEach((r,k)=>r.value=[96,84,103,46,55,0][k]);}
    return {doc:copy,view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}};
  });
}
