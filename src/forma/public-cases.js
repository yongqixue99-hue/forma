import {uiText,uiMarkup,uiMessage} from './locale.js';
import penguins from './datasets/penguins.json' with {type:'json'};
import growth from './datasets/gdp-growth.json' with {type:'json'};
import revenue from './datasets/apple-revenue.json' with {type:'json'};
import flowrate from './datasets/nist-flowrate.json' with {type:'json'};
import {getExample} from './catalog.js';
import {importedTableDocument} from './table-data.js';
export const publicCases=[
 {id:'public-growth',name:uiText('冲击之后，经济如何恢复'),category:'regular',description:uiText('从 2020 年的冲击到次年的反弹，对照中国、德国与美国十年的实际 GDP 增速。'),dataNote:uiText('2014–2023 年中国、德国、美国的年度实际 GDP 增速，共 30 条。百分数直接按 % 读取；不同国家的增长率不能相加，不用于堆叠或饼图。来源：世界银行 WDI，CC BY 4.0；2026-09-11 下载。'),relation:uiText('公开数据案例 · 增长率'),views:['multi-line','grouped-columns','grouped-bars'],dataUrl:'/data/worldbank-gdp-growth.csv',sourceUrl:'https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG'},
 {id:'public-penguins',name:uiText('三种企鹅，谁更重'),category:'research',description:uiText('342 只企鹅的体重实测值，从每只个体到箱线与密度，观察 Gentoo 与另外两种企鹅的分布差异。'),dataNote:uiText('Palmer Penguins 原表 344 条，体重有观测的 342 条纳入分析；第 5、273 行体重缺测，不补零。保留全部其他列及原表行号，可下载本例的 342 条观测，或完整 344 条原表核对。Gorman 等（2014），Horst 等整理，CC0。'),relation:uiText('公开数据案例 · 原始样本'),views:['sample-swarm','sample-box','sample-raincloud'],dataUrl:'/data/palmer-penguins-observed.csv',rawUrl:'/data/palmer-penguins.csv',sourceUrl:'https://allisonhorst.github.io/palmerpenguins/'}
];
publicCases.push(
 {id:'public-revenue',name:uiText('Apple 的收入构成'),category:'regular',description:uiText('iPhone 占全年收入约一半。用条形、环形与矩形树图，比较五类业务的金额和份额。'),dataNote:uiText('截至 2025-09-27 的完整财年，单位为百万美元。五类收入合计 416,161；不混入季度数据或重复计入总计行。数值转录自 Apple 财务报表第 1 页。'),relation:uiText('公开数据案例 · 收入构成'),views:['bars','donut','treemap'],dataUrl:'/data/apple-revenue-2025.csv',sourceUrl:'https://www.apple.com/newsroom/pdfs/fy2025-q4/FY25_Q4_Consolidated_Financial_Statements.pdf'},
 {id:'public-process',name:uiText('检查过程波动'),category:'research',description:uiText('用 NIST 的十批流量示例，保留原始测量，再展开相邻批次的移动极差。'),dataNote:uiText('NIST 公开教学示例，共 10 批。原文未注明物理单位，本例明确保留为原文单位。全部输入估计控制限；用于回顾这批观测，不提供固定历史基线的在线监控。'),relation:uiText('公开数据案例 · 过程回顾'),views:['process-individual','process-imr'],dataUrl:'/data/nist-flowrate.csv',sourceUrl:'https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm'}
);
export function publicCaseRecords(id,palette){
 const preset=publicCases.find(p=>p.id===id);if(!preset)return null;
 let doc;
 if(id==='public-growth'){
  const original={...getExample('tide'),title:uiText('三国实际 GDP 增速'),subtitle:uiText('2014–2023 · 年度同比 · 增长率不可相加'),unit:'%',source:{type:'user',name:uiText('世界银行 WDI · CC BY 4.0'),url:preset.sourceUrl}},table={headers:['year','country','growth'],rows:growth.map(r=>[r.year,r.country,String(r.growth)])};
  doc=importedTableDocument(original,table,[0,1,2]).doc;doc.axes={x:uiText('年份'),y:uiText('实际 GDP 年增长率 / %')};
 }else if(id==='public-revenue'){
  const original={...getExample('bar'),title:uiText('Apple 2025 财年收入构成'),subtitle:uiText('完整财年 · 五类收入合计 416,161 百万美元'),unit:'USD million',source:{type:'public',name:'Apple FY2025 financial statements',url:preset.sourceUrl}};
  doc=importedTableDocument(original,{headers:['category','revenue_usd_million','fiscal_year'],rows:revenue.map(r=>[r.category,String(r.revenue_usd_million),String(r.fiscal_year)])},[0,1]).doc;
  doc.axes={x:uiText('收入 / 百万美元'),y:uiText('业务类别')};
 }else if(id==='public-process'){
  const original={...getExample('imr'),title:uiText('十批流量与相邻波动'),subtitle:uiText('NIST 教学示例 · 全部输入估计基线'),unit:uiText('原文单位未注明'),source:{type:'public',name:'NIST/SEMATECH e-Handbook 6.3.2.2',url:preset.sourceUrl}};
  doc=importedTableDocument(original,{headers:['batch','flowrate'],rows:flowrate.map((v,i)=>[String(i+1),String(v)])},[0,1]).doc;
  doc.axes={x:uiText('批次'),y:uiText('流量 / 原文单位')};
 }else{
  const original={...getExample('swarm'),title:uiText('三种企鹅的体重分布'),subtitle:uiText('2007–2009 · 342 / 344 条体重观测 · 2 条缺测未参与计算'),unit:'g',source:{type:'user',name:uiText('Gorman 等（2014）· Palmer Penguins · CC0'),url:preset.sourceUrl}},headers=['source_row','species','body_mass_g','island','bill_length_mm','bill_depth_mm','flipper_length_mm','sex','year'];
  const table={headers,rows:penguins.filter(r=>r.body_mass_g!=='NA').map(r=>headers.map(h=>String(r[h])))};
  doc=importedTableDocument(original,table,[0,1,2]).doc;doc.data.forEach(r=>r.label=uiText('原表行 ')+r.label);doc.axes={x:uiText('物种'),y:uiText('体重 / g')};
 }
 doc.source={...doc.source,type:'public',url:preset.sourceUrl};
 doc.provenance={origin:'public',dataset:id,retrieved:['public-revenue','public-process'].includes(id)?'2026-09-13':'2026-09-11',...(id==='public-penguins'?{excluded:{field:'body_mass_g',reason:uiText('原表 NA；不参与体重统计，不补零'),sourceRows:[5,273],originalCount:344,observedCount:342}}:{})};
 // Method and provenance notes live below the preview; the plot stays unobstructed.
 return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`public:${id}`,duration:1600,hold:2400,options:{palette:palette??({'public-revenue':'ochre','public-growth':'cobalt','public-penguins':'mauve'}[id]||'ink'),ratio:'landscape',brand:{name:uiText('FORMA · 公开数据案例'),typography:'sans'},annotations:[]},scale:'shared'}));
}
