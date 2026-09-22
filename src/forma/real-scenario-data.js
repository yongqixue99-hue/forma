import {isEnglish} from './locale.js';
import {getExample} from './catalog.js';
import {importedTableDocument} from './table-data.js';
import penguins from './datasets/penguins.json' with {type:'json'};
import growth from './datasets/gdp-growth.json' with {type:'json'};
import revenue from './datasets/apple-revenue.json' with {type:'json'};
import economy from './datasets/us-inflation-unemployment.json' with {type:'json'};

const t=(zh,en)=>isEnglish()?en:zh;
const appleUrl='https://www.apple.com/newsroom/pdfs/fy2025-q4/FY25_Q4_Consolidated_Financial_Statements.pdf';
const penguinUrl='https://allisonhorst.github.io/palmerpenguins/';
const inflationUrl='https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG';
export function realPresetDetails(id){
  const details={
    'paired-evaluation':{name:t('Apple：两年的收入变化','Apple: revenue year to year'),description:t('同一业务在 2024 与 2025 财年的收入：从配对端点到变化量，穿戴及配件的下降也如实保留。','Compare each business in FY2024 and FY2025, from paired endpoints to changes. The decline in wearables and accessories stays visible.'),dataNote:t('Apple 财报第 1 页，两列均为完整财年收入，单位百万美元。变化量 = FY2025 − FY2024，不是增长率。五类业务合计分别为 391,035 与 416,161。','Apple financial statements, page 1. Both columns are full fiscal years, in USD millions. Change = FY2025 − FY2024, not a growth rate. Totals are 391,035 and 416,161.'),dataUrl:'/data/apple-revenue-paired.csv',sourceUrl:appleUrl},
    'matrix-encoding':{name:t('企鹅分布在哪些岛屿','Penguins across islands'),description:t('用 344 条原始记录统计物种与岛屿的交叉数量，从颜色切换到圆面积，保留没有样本的零格。','Count species by island across all 344 source records. Switch from color to circle area, keeping cells with no sampled penguins at zero.'),dataNote:t('Palmer Penguins，2007–2009，CC0。对全部 344 行按 species × island 计数，形成 3 × 3 矩阵。零表示原表中没有该组合，不代表岛上没有此物种。','Palmer Penguins, 2007–2009, CC0. All 344 rows are counted by species × island in a 3 × 3 matrix. Zero means no record of that combination in this sample, not absence of that species on the island.'),dataUrl:'/data/penguin-island-counts.csv',rawUrl:'/data/palmer-penguins.csv',sourceUrl:penguinUrl},
    'values-to-ranks':{name:t('增长率与年度名次','Growth rates and ranks'),description:t('中国、德国和美国十年的 GDP 增速，先比较幅度，再对照每一年三国的名次。','Compare ten years of GDP growth in China, Germany and the United States, then compare their ranks within each year.'),dataNote:t('世界银行 WDI，2014–2023，CC BY 4.0。排名只比较本例三个国家，不是全球排名。数值仍为实际 GDP 年增长率，不能相加；原值未改为名次。','World Bank WDI, 2014–2023, CC BY 4.0. Ranks compare only these three countries, not the world. Values remain annual real GDP growth rates, which are not additive.'),dataUrl:'/data/worldbank-gdp-growth.csv',sourceUrl:'https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG'},
    'time-path':{name:t('美国：通胀与就业的轨迹','US: inflation and employment'),description:t('把 2000–2024 年的年度点按时间连接，观察金融危机、疫情与随后高通胀时期的路径。','Connect the annual points from 2000–2024 to follow the path through the financial crisis, the pandemic and the subsequent inflation surge.'),dataNote:t('世界银行 WDI，2026-09-13 下载，CC BY 4.0。X 为失业率（ILO 模型估计，SL.UEM.TOTL.ZS），Y 为 CPI 年通胀率（FP.CPI.TOTL.ZG），均为 %。25 对完整年度值，以年末日期标记年度；不插补，不推断因果。','World Bank WDI, retrieved 2026-09-13, CC BY 4.0. X: unemployment, modeled ILO estimate (SL.UEM.TOTL.ZS). Y: annual CPI inflation (FP.CPI.TOTL.ZG). Both are percentages. The 25 complete annual pairs use year-end dates as year labels; no imputation or causal inference.'),dataUrl:'/data/us-inflation-unemployment.csv',sourceUrl:inflationUrl}
  };
  const detail=details[id];return detail?{...detail,relation:t('公开数据 · 同一批记录的不同读法','Public data · Multiple views of the same records')}:null;
}

export function realScenarioRecords(id,views,palette='ink'){
  const detail=realPresetDetails(id);if(!detail)return null;
  let template,headers,rows,mapping,title,subtitle,unit,axes,extra={};
  if(id==='paired-evaluation'){
    template='slope';headers=['category','fy2024_usd_million','fy2025_usd_million'];rows=revenue.map((r,i)=>[r.category,[201183,29984,26694,37005,96169][i],r.revenue_usd_million]);mapping=[0,1,2];
    title=t('Apple：哪些业务增长了','Apple: which businesses grew?');subtitle=t('FY2024 → FY2025 · 完整财年 · 百万美元','FY2024 → FY2025 · Full fiscal years · USD millions');unit='USD million';extra={periodLabels:['FY2024','FY2025']};
  }else if(id==='matrix-encoding'){
    template='heatmap';headers=['species','island','sample_count'];const species=['Adelie','Chinstrap','Gentoo'],islands=['Biscoe','Dream','Torgersen'];rows=species.flatMap(s=>islands.map(i=>[s,i,penguins.filter(r=>r.species===s&&r.island===i).length]));mapping=[0,1,2];
    title=t('企鹅样本的物种与岛屿','Penguin samples by species and island');subtitle=t('2007–2009 · 344 条记录 · 零表示样本中没有该组合','2007–2009 · 344 records · Zero means no sampled combination');unit=t('只企鹅','penguins');axes={x:t('岛屿','Island'),y:t('物种','Species')};
  }else if(id==='values-to-ranks'){
    template='race';headers=['year','country','gdp_growth_percent'];rows=growth.map(r=>[String(r.year),r.country,r.growth]);mapping=[0,1,2];
    title=t('三个国家的增速与名次','Growth and ranks in three countries');subtitle=t('2014–2023 · 仅比较本例三国 · 保留增长率原值','2014–2023 · Ranks within these three countries · Original rates retained');unit='%';axes={x:t('年份','Year'),y:t('实际 GDP 年增长率 / %','Annual real GDP growth / %')};
  }else{
    template='trajectory';headers=['year_end','unemployment_percent','inflation_percent'];rows=economy.map(r=>[`${r.year}-12-31`,r.unemployment,r.inflation]);mapping=[0,1,2];
    title=t('美国通胀与失业率的 25 年','25 years of US inflation and unemployment');subtitle=t('2000–2024 · 年度值以年末标记 · 失业率为 ILO 模型估计','2000–2024 · Annual values labeled at year end · Unemployment: ILO modeled estimate');unit='%';axes={x:t('失业率 / %','Unemployment / %'),y:t('CPI 年通胀率 / %','Annual CPI inflation / %')};
  }
  const source={type:'public',name:id==='paired-evaluation'?'Apple FY2025 financial statements':id==='matrix-encoding'?'Palmer Penguins · Gorman et al. (2014) · CC0':'World Bank WDI · CC BY 4.0',url:detail.sourceUrl};
  const original={...getExample(template),title,subtitle,unit,...extra,source};if(axes)original.axes=axes;else delete original.axes;
  const doc=importedTableDocument(original,{headers,rows:rows.map(r=>r.map(String))},mapping).doc;
  doc.source=source;doc.provenance={origin:'public',dataset:`scenario:${id}`,retrieved:'2026-09-13',...(id==='time-path'?{indicators:['SL.UEM.TOTL.ZS','FP.CPI.TOTL.ZG'],sources:[inflationUrl,'https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS']}:{})};
  return views.map(view=>({doc:structuredClone(doc),view,dataGroup:`public:${id}`,relation:'auto',scale:'shared',duration:1600,hold:2400,options:{palette:palette==='ink'?({'paired-evaluation':'ochre','matrix-encoding':'mauve','values-to-ranks':'cobalt','time-path':'ink'})[id]:palette,ratio:'landscape',brand:{name:'FORMA · Public data',typography:'sans'}}}));
}
