import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
import {statisticalText as t} from './statistical-series-rules.js';

const preset=(id,zh,en,description,descriptionEn,dataNote,noteEn,views)=>({id,get name(){return t(zh,en);},category:'research',get description(){return t(description,descriptionEn);},get dataNote(){return t(dataNote,noteEn);},get relation(){return t('同一批完整记录 · 原值保留','Same complete records · original values retained');},views});
export const statisticalPresets=[
 preset('statistical-lifetime-story','寿命样本的七种读法','Seven views of lifetime observations','完整寿命从 Weibull 坐标转到总试验时间、资源集中度和尾部超额，再比较正态参考及经验分布置信带。','Complete lifetimes move through Weibull coordinates, total time on test, time concentration and mean excess, then normal references and an empirical-CDF confidence band.','同一份正寿命演示样本。N(80,35²) 是明确预设的参考模型，不是 P–P 自动拟合。Gini 表示总观测时长集中度，不是风险率。','One complete positive-lifetime demonstration table. N(80,35²) is a declared reference, not a P–P automatic fit. Gini describes concentration of total observed time, not a hazard rate.',['stat-weibull','stat-ttt','stat-lorenz','stat-meanexcess','stat-qq','stat-pp','stat-ecdfband']),
 preset('statistical-probability-story','概率参考与分布不确定性','Probability references and distribution uncertainty','同一份原样本先与拟合正态分位数对照，再与指定正态概率对照，最后展开经验分布与 DKW 同时带。','The same observations compare with fitted-normal quantiles and declared normal probabilities, then unfold into an empirical CDF with a DKW simultaneous band.','Q–Q 使用样本拟合；P–P 参考 N(47,12²) 来自显式参数；95% DKW 同时带要求独立同分布样本。','Q–Q fits the sample normal. P–P explicitly uses N(47,12²). The 95% DKW simultaneous band assumes IID observations.',['stat-qq','stat-pp','stat-ecdfband']),
 preset('statistical-survival-story','持续比例与累积风险','Survival and cumulative hazard','同一批右删失记录连续变换 Kaplan–Meier 持续比例与 Nelson–Aalen 累积风险，所有事件与删失点留在画面中。','The same right-censored records continuously transform between Kaplan–Meier survival and Nelson–Aalen cumulative hazard, retaining every event and censor marker.','同刻先计事件后移出记录。S(t) 是持续比例；H(t)=Σd/n 不是概率，也不等于有限样本的 −log(S)。','Tied events precede withdrawals. S(t) is survival; H(t)=Σd/n is not probability and differs from finite-sample −log(S).',['stat-survival','stat-nelsonaalen'])
];
export function statisticalRecords(id,palette='ink'){
 const preset=statisticalPresets.find(p=>p.id===id);if(!preset)return null;
 const source=getExample(id==='statistical-survival-story'?'survival':id==='statistical-probability-story'?'ppplot':'weibull');
 source.title=preset.name;
 source.source={name:t('FORMA 统计场景 · 合成数据','FORMA statistical scenario · synthetic data'),type:'demo'};
 if(id==='statistical-lifetime-story'){source.referenceMean=80;source.referenceSD=35;}
 if(id!=='statistical-survival-story'){source.alpha=.05;source.minExceedances=5;}
 const doc=withRecordIds(source,{legacyNamespace:'scenario:'+id});
 return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:'scenario:'+id,relation:'auto',scale:'shared',options:{palette}}));
}
