import {extent,max,sum} from 'd3';
import {isEnglish} from './locale.js';
import {recordId,populationId} from './data-identity.js';
import {validateDocument} from './data.js';
import {table7} from './volume7-data.js';
export const temporalText=(zh,en)=>isEnglish()?en:zh;
const t=temporalText,unique=a=>[...new Set(a)],view=(id,family,zh,en,zhNote,enNote)=>({id,family,get name(){return t(zh,en);},en,get note(){return t(zhNote,enNote);}});
export const temporalViews=[
 view('temporal-stream','temporal-series','居中河流带','Centered stream ribbons','厚度表示原量；日期按实际间距，居中边界不是绝对值。','Thickness encodes original quantity. Dates keep their actual spacing; centered boundaries are not absolute values.'),
 view('temporal-horizon','temporal-series','三层地平线','Three-band horizon','共用正负三层阈值；保留原始断点，不把折叠高度当原值。','Share three positive and negative thresholds. Retain gaps; folded height is not the original value.'),
 view('temporal-lines','temporal-series','日期原值曲线','Dated original-value curves','实际日期间距与共同原值尺度，缺测断线并保留原行。','Actual date spacing and one original-value scale; missing values break lines and retain their rows.'),
 view('temporal-season','temporal-season','季节分面子序列','Seasonal subseries facets','在每季内按周期顺序比较；虚线为该季有效观测均值。','Compare cycles within each season. Dashed references are means of observed values within that season.'),
 view('temporal-season-lines','temporal-season','周期同轴季节线','Seasonal curves on one cycle axis','季节共用周期横轴和原值纵轴；完整记录保留缺测断点。','Seasons share the cycle axis and original-value scale, retaining explicit missing observations.'),
 view('temporal-rankclock','temporal-rank','竞争排名时钟','Competition-rank clock','外圈为第一名，竞争并列 1,1,3；首尾不补连线。','The outer ring is rank one. Competition ties are 1,1,3; no end-to-start link is invented.'),
 view('temporal-ranklines','temporal-rank','竞争排名轨迹','Competition-rank trajectories','同一原始指标展开为竞争名次，原值仍可读取与编辑。','The same original metrics unfold into competition ranks; raw values remain readable and editable.'),
 view('temporal-cohort','temporal-retention','同期群留存矩阵','Cohort retention matrix','每格为活跃人数/固定初始人数；未达到的群龄留白，不补零。','Each cell is active count divided by fixed initial size. Future ages stay blank, never zero-filled.'),
 view('temporal-retention','temporal-retention','同期群留存曲线','Cohort retention curves','固定分母按相同群龄展开，保留回访反弹；不冒充生存概率。','Compare equal cohort ages with fixed denominators, retaining rebounds without claiming survival probabilities.')
];
export const temporalViewMap={streamgraph:'temporal-stream',horizon:'temporal-horizon',cycleplot:'temporal-season',rankclock:'temporal-rankclock',cohort:'temporal-cohort',cohortcurve:'temporal-retention'};
const info=new Map(temporalViews.map(v=>[v.id,v]));
export const isTemporalView=v=>info.has(v);
export const temporalFamily=v=>info.get(v)?.family;
export function temporalOrderFields(doc){return ['streamgraph','horizon'].includes(doc.template)?{seriesOrder:'series',periodOrder:'period'}:doc.template==='cycleplot'?{cycleOrder:'cycle',seasonOrder:'season'}:doc.template==='rankclock'?{periodOrder:'period',objectOrder:'label'}:['cohort','cohortcurve'].includes(doc.template)?{cohortOrder:'cohort'}:{};}
export function temporalDocument(doc,common={}){
 const family=temporalFamily(temporalViewMap[doc.template]),order=field=>unique(doc.data.map(r=>r[field])),declared=(key,field)=>doc[key]===undefined?order(field):doc[key],cohort=doc.template==='cohort';
 return {...doc,...common,family,...(family==='temporal-series'?{seriesOrder:declared('seriesOrder','series'),periodOrder:doc.periodOrder===undefined?order('period').sort():doc.periodOrder}:family==='temporal-season'?{cycleOrder:declared('cycleOrder','cycle'),seasonOrder:declared('seasonOrder','season')}:family==='temporal-rank'?{periodOrder:declared('periodOrder','period'),objectOrder:declared('objectOrder','label')}:{cohortOrder:declared('cohortOrder','cohort'),ageUnit:cohort?'month':doc.periodUnit}),data:doc.data.map((r,inputIndex)=>({...r,inputIndex,...(family==='temporal-retention'?{ageValue:cohort?r.age:r.period,activeValue:cohort?r.active:r.retained,activeField:cohort?'active':'retained'}:{})}))};
}
export function temporalEligibility(doc,view){
 const fail=reason=>({valid:false,reason}),family=temporalFamily(view);if(!family||doc?.family!==family||!doc?.data?.length)return fail(t('请选择同一时间数据契约的完整原表。','Choose a complete original table with the same temporal contract.'));
 if(doc.data.some(r=>typeof recordId(r)!=='string'||!recordId(r))||new Set(doc.data.map(recordId)).size!==doc.data.length)return fail(t('每条原始观测必须保留唯一 _id。','Each original observation must retain a unique _id.'));
 const orders=family==='temporal-series'?[['seriesOrder','series'],['periodOrder','period']]:family==='temporal-season'?[['cycleOrder','cycle'],['seasonOrder','season']]:family==='temporal-rank'?[['periodOrder','period'],['objectOrder','label']]:[['cohortOrder','cohort']];
 for(const [name,field]of orders){const names=unique(doc.data.map(r=>r[field])),order=doc[name];if(!Array.isArray(order)||order.length!==names.length||new Set(order).size!==names.length||order.some(n=>typeof n!=='string'||!names.includes(n)))return fail(t('顺序必须是覆盖全部类别的唯一完整数组。','Orders must be complete arrays covering every category exactly once.'));}
 if(family==='temporal-series'&&JSON.stringify(doc.periodOrder)!==JSON.stringify([...doc.periodOrder].sort()))return fail(t('日期顺序必须按真实时间递增。','Dates must be ordered chronologically.'));
 const target=view==='temporal-stream'?'streamgraph':view==='temporal-horizon'?'horizon':doc.template,check=validateDocument({...doc,template:target});if(!check.valid)return fail(check.errors.map(e=>typeof e==='string'?e:e.message).join(' '));
 return {valid:true,reason:''};
}
export const temporalGroupField=doc=>doc.family==='temporal-series'||['streamgraph','horizon'].includes(doc.template)?'series':doc.family==='temporal-season'||doc.template==='cycleplot'?'season':doc.family==='temporal-rank'||doc.template==='rankclock'?'label':'cohort';
export function temporalGroups(doc){const field=temporalGroupField(doc),names=unique(doc.data.map(r=>r[field])),supplied=doc.seriesOrder??doc.seasonOrder??doc.objectOrder??doc.cohortOrder,order=Array.isArray(supplied)&&supplied.length===names.length&&new Set(supplied).size===names.length&&supplied.every(n=>names.includes(n))?supplied:names;return order.map(name=>({name,rows:doc.data.filter(r=>r[field]===name)}));}

export const temporalGroupKey=rows=>populationId('temporal-group',rows);
export function temporalColorKeys(doc){const groups=new Map(temporalGroups(doc).map(g=>[g.name,temporalGroupKey(g.rows)])),field=temporalGroupField(doc);return doc.data.map(r=>groups.get(r[field]));}
export const temporalColorSubjects=doc=>['horizon','cohort'].includes(doc.template)?[]:temporalGroups(doc).map(g=>({id:temporalGroupKey(g.rows),label:g.name}));
export function temporalCompatibility(a,b){
 if(a.family!==b.family)return t('时间数据结构不同。','Temporal data structures differ.');
 if(a.unit!==b.unit||a.rankOrder!==b.rankOrder||a.ageUnit!==b.ageUnit||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('单位、排名方向、群龄单位或来源不同。','Units, ranking direction, cohort-age units or provenance differ.');
 const old=new Map(a.data.map(r=>[recordId(r),r]));if(old.size!==b.data.length||b.data.some(r=>!old.has(recordId(r))))return t('原始记录集合不同。','Original record populations differ.');
 const key=doc=>temporalGroups(doc).map(g=>temporalGroupKey(g.rows));if(JSON.stringify(key(a))!==JSON.stringify(key(b)))return t('序列或同期群归属/顺序改变。','Series or cohort membership/order changed.');
 const periodField=a.family==='temporal-season'?'cycle':a.family==='temporal-retention'?'ageValue':'period';
 if(b.data.some(r=>old.get(recordId(r))[periodField]!==r[periodField]||a.family==='temporal-retention'&&old.get(recordId(r)).size!==r.size))return t('原观测时间、群龄或固定留存分母改变。','Original observation times, cohort ages or fixed retention denominators changed.');
 for(const field of['periodOrder','cycleOrder'])if(JSON.stringify(a[field])!==JSON.stringify(b[field]))return t('时间或周期顺序改变。','Temporal or cycle order changed.');
 return '';
}
export function temporalBounds(doc){
 if(doc.family==='temporal-retention')return {age:[0,max(doc.data,r=>r.ageValue)],rate:[0,1]};
 if(doc.family==='temporal-rank')return {rank:[1,temporalGroups(doc).length]};
 const values=doc.data.filter(r=>r.value!==null).map(r=>r.value),bounds={value:extent(values)};
 if(doc.family==='temporal-series'){const tab=table7(doc.data,'period','series',true);return {...bounds,time:extent(tab.columns,p=>Date.parse(p)),magnitude:[0,max(values,Math.abs)],total:[0,max(tab.rows,r=>sum(tab.groups,k=>r.values[k]??0))]};}
 return bounds;
}
export function temporalRecipe(){return {id:'temporal-unfold',get name(){return t('同一时间记录连续展开','Continuous unfolding of the same temporal records');},description:t('原记录保持稳定身份；带宽、时间点与分组曲线连续换坐标，缺测和未成熟群龄不补成零。','Original records retain stable identity. Ribbons, time points and grouped curves change coordinates continuously without zero-filling missing or future observations.')};}
export function temporalGuide(doc,view){return [info.get(view)?.note||'',t('每行保留稳定 _id、原始字段、单位与来源。缺测用原 null，曲线断开；原记录可编辑，连接/均线是派生摘要。','Keep stable _id, raw fields, unit and source on every row. Preserve nulls and line gaps; raw rows remain editable and connections/means are derived summaries.'),doc.family==='temporal-series'?t('日期按真实毫秒间隔排列；河流带使用 silhouette 居中堆积，仅完整非负数据可用。地平线复用共同阈值 max|value|/3，正负各三层。','Dates retain actual elapsed-time spacing. Stream ribbons use centered silhouette stacking and require complete nonnegative data. Horizon thresholds share max|value|/3, with three bands for each sign.'):doc.family==='temporal-season'?t('周期和季节分别保留首次声明顺序；每季均值只含有效观测，不把缺测当零。','Cycles and seasons retain their declared first-appearance order. Seasonal means only use observed values, never missing-as-zero.'):doc.family==='temporal-rank'?t('竞争名次=1+严格优于当前对象的数量；rankOrder 决定大优还是小优。时期等间距、首尾不闭合。','Competition rank=1+the number of strictly better peers. rankOrder determines whether high or low is better. Periods are equally spaced and the path stays open.'):t('cohort 保留 age/active，cohortcurve 保留 period/retained；仅渲染用统一群龄/活跃别名，不改原表。每群 size 固定；回访可反弹，未来不外推。','Cohort keeps age/active and cohortcurve keeps period/retained. Only rendering aliases unify age/count; the raw table stays intact. Each cohort has fixed size; returns may rebound and future ages are not extrapolated.'),t('转场中展示坐标转换，停稳后读取数值。','Read values after the coordinate transition settles.')];}
export function temporalAgentGuide(english=false){return (english?'Use original FORMA views ':'使用原版 FORMA 视图 ')+temporalViews.map(v=>v.id).join(', ')+(english?'. Preserve every _id, native field, source, unit, true date spacing and explicit order. Never delete nulls or zero-fill gaps/future cohort ages. Stream uses d3 silhouette stacking for complete nonnegative data; horizon folds signed data into three common max-absolute/3 bands and retains gaps. Cycles/seasons keep first-appearance order and observed-only means. Rank clock/lines use competition ties 1,1,3 with explicit rankOrder, equal time steps, no end closure. Cohort uses age/active; cohortcurve uses period/retained and periodUnit; retain raw schemas. Ratios use fixed positive size, age zero equals size, returns can rebound. Raw marks remain editable; links, bands and means carry source recordIds as derived summaries. Preserve all contour roles across forward/reverse/seek/resume and use the original HTML/SVG/video player.': '。保留每个 _id、原生字段、source、unit、真实日期间隔和明确顺序。不得删 null、填补断点或未来群龄。河流图仅完整非负数据，复用 d3 silhouette；地平线按共同 max绝对值/3 折成正负各三层并断开缺测。周期/季节保持首次声明顺序，均值只计有效值。排名时钟/线采用竞争并列1,1,3和明确rankOrder，时间等距且首尾不闭合。cohort保留age/active，cohortcurve保留period/retained及periodUnit；原数据契约不改。分母size固定正数，第0期活跃等于size，允许回访反弹。原值可编辑，连接/流带/均线携带来源recordIds作为派生摘要。保留所有轮廓角色，支持正反跳步和中断接续，使用原版HTML/SVG/视频播放器。');}
