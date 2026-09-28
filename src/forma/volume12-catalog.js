// Deterministic synthetic observations, never inferred measurements.
const str=(key,label)=>[key,'string',label],num=(key,label)=>[key,'number',label];
const observations=[str('label','唯一观测编号'),num('value','原始观测值')],groups=[str('label','唯一观测编号'),str('group','分组名称'),num('value','原始观测值')],points=[str('label','唯一观测编号'),num('x','原始 X 测量值'),num('y','原始 Y 测量值')];
const specs=[
 ['lorenz','洛伦兹曲线','Lorenz curve',observations,'以从小到大排序的非负原值，比较累计人数与累计资源份额，并计算样本 Gini。','收入分配、客户集中度、资源分配','把等权样本当加权人口；将负数收入强行归零','3–300 个等权非负观测，至少一个正值'],
 ['ppplot','正态 P–P 图','Normal P–P plot',observations,'比较指定正态模型的累计概率和样本的经验累计概率，突出分布中心的偏差。','已知参考分布检查、模拟校准、质量诊断','与 Q–Q 图混淆；把图形接近直线当显著性检验','5–300 个观测；referenceMean 为已知均值，referenceSD > 0'],
 ['deltaplot','分位数差异图','Quantile difference plot',groups,'展示两组在相同分位概率上的原值之差，观察差异是否随分布位置变化。','组间分布差异、尾部变化、性能延迟比较','把两组独立分位数差当配对个体变化或因果效果','恰好 2 组，每组 5–300 个原始值；差值为第二组减第一组'],
 ['ecdfdiff','经验分布差异图','ECDF difference',groups,'在合并观测值处比较两组经验分布函数，阶梯保留重复观测带来的跳跃。','整体分布比较、阈值覆盖差异、漂移探索','将概率差写成原始单位；将最大差自动解释为显著性','恰好 2 组，每组 5–300 个原始值；不拟合平滑曲线'],
 ['quantiledot','分位数点阵图','Quantile dotplot',observations,'以等概率分位点表示完整样本分布，每个点代表同一份概率质量。','不确定性沟通、模拟输出、分布摘要','把摘要点当真实观测；将点数当样本量','5–500 个原始观测；dotCount 为 20–100 的整数'],
 ['histogram2d','二维频数分箱','Bivariate histogram',points,'对两轴等宽矩形分箱计数，色深表示箱内原始样本数量，原始点可追溯。','二维样本密集区、双变量测量分布','把频数当密度；漏掉边界值；随意裁掉离群点','5–500 个完整坐标对；每轴 3–20 个箱；两轴均须有非零跨度'],
 ['density2d','二维核密度等高线','Bivariate density contours',points,'在原始坐标单位中计算二维高斯核密度，等高线表示密度水平。','二维分布结构、样本簇、密集区域探索','把密度等高线当置信区间、计数或概率覆盖率','5–400 个坐标对；带宽为对应跨度的 1/32（X）、1/24（Y）至 4 倍'],
 ['halfeye','半眼分布与区间','Half-eye distribution',groups,'每组以半侧高斯核密度、样本中位数及 50%/90% 中央分位区间组合呈现。','实验分布比较、模拟样本、概率分布沟通','把样本分位区间称作均值置信区间；混用单位','1–5 组，每组 8–200 个原值；共用正带宽为全部样本跨度的 1/64–4 倍']
];
export const volume12Catalog=specs.map(([id,name,en,fields,description,use,avoid,limit],i)=>({id,no:String(129+i),name,en,type:name,category:'research',fields,description,use,avoid,limit,motion:'坐标建立 / 分布逐层展开 / 原始点定位',keywords:`${name} ${en} ${use}`,edition:12,research:true,dataMode:'observations',duration:8}));
const values=Array.from({length:64},(_,i)=>+(40+12*Math.sin(i*2.399)+7*Math.cos(i*.71)+i*.22).toFixed(3));
const single=values.map((value,i)=>({label:`S${String(i+1).padStart(2,'0')}`,value}));
const grouped=['A','B'].flatMap((group,j)=>values.slice(0,48).map((v,i)=>({label:`${group}${i+1}`,group,value:+(j?v*1.16-4+Math.sin(i)*2:v).toFixed(3)})));
const cloud=Array.from({length:160},(_,i)=>{const cluster=i<95?0:1,a=i*2.39996323,r=Math.sqrt((i*37%97+1)/98);return{label:`P${i+1}`,x:+(30+cluster*32+14*r*Math.cos(a)).toFixed(3),y:+(42+cluster*23+9*r*Math.sin(a)+5*r*Math.cos(a)).toFixed(3)};});
export const volume12Contents={
 lorenz:{title:'资源分配集中度',subtitle:'确定性合成观测 · 等权样本 · 未做有限样本校正',unit:'千元',data:Array.from({length:48},(_,i)=>({label:`H${i+1}`,value:+(2+(i+1)**1.7*.32).toFixed(3)}))},
 ppplot:{title:'参考正态分布校准',subtitle:'确定性合成观测 · 已知参考 N(47, 12²)',unit:'ms',referenceMean:47,referenceSD:12,data:single},
 deltaplot:{title:'分布不同位置的差异',subtitle:'确定性合成观测 · B − A · Type 7 分位数',unit:'ms',data:grouped},
 ecdfdiff:{title:'阈值累计覆盖率差异',subtitle:'确定性合成观测 · F_B(x) − F_A(x)',unit:'ms',data:grouped},
 quantiledot:{title:'用等概率点理解分布',subtitle:'确定性合成观测 · 每个分位点代表 2% 概率质量',unit:'ms',dotCount:50,data:single},
 histogram2d:{title:'二维观测频数',subtitle:'确定性合成坐标 · 等宽分箱 · 每条记录计数一次',unit:'观测数',axes:{x:'长度 / mm',y:'质量 / g'},binsX:12,binsY:10,data:cloud},
 density2d:{title:'二维分布密度轮廓',subtitle:'确定性合成坐标 · 高斯乘积核 · 非置信区域',unit:'1/(mm·g)',axes:{x:'长度 / mm',y:'质量 / g'},bandwidthX:4,bandwidthY:3,data:cloud},
 halfeye:{title:'分布、位置与中央区间',subtitle:'确定性合成观测 · 中位数 + 50% / 90% 分位区间',unit:'ms',bandwidth:3,data:[...grouped,...values.slice(0,48).map((v,i)=>({label:`C${i+1}`,group:'C',value:+(v*.8+18+Math.cos(i*.4)*3).toFixed(3)}))]}
};
const english=[
 ['lorenz','Cumulative population and resource shares from sorted, equally weighted nonnegative observations, with sample Gini.','Resource concentration, income distributions and customer concentration','Using equal-weight rows as population weights or zero-filling negative observations','3–300 equally weighted nonnegative observations; at least one positive value.','One row is one equally weighted person or entity and its original nonnegative resource amount.'],
 ['ppplot','Compare a specified normal CDF with the empirical CDF at each original observation.','Known-reference distribution checks and calibration','Confusing P–P with Q–Q plots or treating visual agreement as a significance test','5–300 observations; finite referenceMean and positive referenceSD.','One row is one original observation, not a probability or normal score.'],
 ['deltaplot','Compare original-unit quantiles at the same probability across two groups.','Distribution shifts, tail changes and latency comparisons','Interpreting independent-group quantile differences as paired or causal effects','Exactly 2 groups, 5–300 observations each. Difference = second group minus first.','One row is one original observation with a unique label and its group. Group order follows first appearance.'],
 ['ecdfdiff','A right-continuous step curve compares empirical CDFs at every distinct pooled value.','Threshold coverage, distribution comparison and drift exploration','Labeling probability differences with measurement units or inventing significance','Exactly 2 groups, 5–300 observations each; no smoothing.','One row is one original observation and its group; repeated values retain their full sample mass.'],
 ['quantiledot','Equally weighted midpoint quantiles summarize the complete empirical sample.','Distribution summaries and uncertainty communication','Presenting quantile dots as raw observations or confusing dot count with sample size','5–500 observations; integer dotCount from 20 to 100.','One row is one original observation. Displayed quantile dots are derived summaries.'],
 ['histogram2d','Equal-width rectangular bins count complete original coordinate pairs.','Bivariate concentration and measurement distributions','Confusing counts with density, losing boundary values or trimming outliers','5–500 observations; integer binsX/binsY from 3 to 20; nonzero span on both axes.','One row is one original paired X and Y observation in the units named by axes.'],
 ['density2d','Product Gaussian kernels in original coordinate units produce density-level contours.','Bivariate sample structure and concentration','Interpreting contours as confidence regions, counts or probability coverage','5–400 complete pairs; positive bandwidths from 1/32 (X), 1/24 (Y) to 4 times the respective axis span.','One row is one original paired observation. Bandwidths are kernel standard deviations in X and Y units.'],
 ['halfeye','Half-densities share one scale and bandwidth, with medians and central 50%/90% sample-quantile intervals.','Comparing measured distributions and simulation draws','Calling sample-quantile intervals confidence intervals for a mean','1–5 groups, 8–200 observations each; shared positive bandwidth from 1/64 to 4 times the full sample span (positive bandwidth for a constant sample).','One row is one original observation in a group; all groups must use the same measurement unit.']
];
export const volume12English=Object.fromEntries(english.map(([id,description,use,avoid,limit,rowMeaning])=>[id,{description,use,avoid,limit,rowMeaning}]));

const fieldEnglish={label:'Unique original observation identifier',group:'Group in first-appearance order',value:'Original measurement in unit',x:'Original X value in axes.x units',y:'Original Y value in axes.y units'};
for(const t of volume12Catalog)volume12English[t.id].fields=t.fields.map(([key,type])=>[key,type,fieldEnglish[key]]);
