import {extent} from 'd3';
import {isEnglish} from './locale.js';
import {recordId} from './data-identity.js';
import {validateDocument} from './data.js';
import {marimekkoLayout} from './volume4-data.js';
import {likertLayout} from './volume7-data.js';
import {nomogram16,labbe16} from './volume16-data.js';
import {variwide18,waterfall18} from './volume18-data.js';

export const completionBusinessText=(zh,en)=>isEnglish()?en:zh;
const t=completionBusinessText,prefix='complete-business-',specs=[
 ['waterfall','瀑布桥接','Waterfall bridge','deltas','原始增减量','Original signed changes','起终项始终是总量，中间项是带正负号的变化。','Initial and final records remain totals; intermediate records are signed changes.'],
 ['marimekko','变宽构成','Variable-width composition','counts','绝对数量构成','Absolute composition counts','宽度与组内比例共同编码面积；备选视图明确改为原始数量长度。','Width and within-group proportions jointly encode area; the alternative explicitly uses raw-count length.'],
 ['range','高低开收区间','Observed OHLC range','departures','相对起始值的区间','Ranges relative to the opening value','使用实际日期间隔；相对坐标减去本条 open，完整原值保留。','Use actual date spacing; relative coordinates subtract that record’s open while retaining every original value.'],
 ['pyramid','双向数量','Mirrored quantities','paired','并列正数量','Paired positive quantities','两组使用共同数量尺度；镜像左侧不是负值。','Both groups share one quantity scale; the mirrored left side is not negative.'],
 ['dendrogram','两级归属树','Two-level membership tree','radial','径向归属树','Radial membership tree','复用原父子关系与叶值面积；距离和角度仅为结构位置。','Retain original parent-child membership and leaf-value area; distances and angles are structural positions only.'],
 ['likert','中立居中的回答比例','Neutral-centered response proportions','stacked','从零开始的回答比例','Zero-based response proportions','保留五档响应显式顺序与所有零值；中立选项居中或完整放在第三档。','Retain the explicit five-response order and all zeros; the neutral response is centered or occupies the complete third segment.'],
 ['forecastfan','外部预测与中央区间','External forecasts and central intervals','departures','相对最后观测的预测','Forecasts relative to the last observation','只换显示坐标；不拟合模型、不改区间、不把历史观测当预测。','Change display coordinates only: no model fit, interval changes or historical observations masquerading as forecasts.'],
 ['tornado','单参数情景敏感性','Single-parameter scenario sensitivity','plane','两情景输出对照','Paired scenario output comparison','low/high 表示低高输入情景，可倒序或在基准同侧，不是置信界限。','Low/high identify input scenarios, may reverse or lie on one side of the baseline, and are not confidence bounds.'],
 ['variwide','数量与单位率','Quantity and unit rate','amount','数量乘率的总量','Amounts from quantity times rate','原图面积=width×rate；备选长度展示同一乘积，原数量和率不被覆盖。','Native area equals width×rate; the alternative length shows the same product without overwriting quantity or rate.'],
 ['stackedwaterfall','分量瀑布桥接','Component waterfall bridge','deltas','原始分量增减','Original component changes','每一步正负分别从前一净额累计；备选从零展示每个原分量，不把分量抵消。','Within each step positive and negative components stack separately from the previous net balance; the alternative shows every raw component from zero without cancellation.'],
 ['nomogram','固定系数线性评分','Fixed-coefficient linear scoring','cumulative','线性贡献累计','Cumulative linear contributions','intercept+Σ coefficient×(value−reference)，不重新拟合，不变成风险概率。','intercept+Σ coefficient×(value−reference): no refitting or conversion into risk probabilities.'],
 ['labbe','双组事件比例','Paired-arm event proportions','difference','对照比例与比例差','Control proportion and risk difference','保留四项原计数，气泡面积为合计样本量，不是逆方差权重。','Retain all four raw counts; bubble area is combined sample size, not inverse-variance weight.']
];
const view=(id,family,zh,en,note,english)=>({id,family,get name(){return t(zh,en);},en,get note(){return t(note,english);}});
export const completionBusinessViews=specs.flatMap(([native,zh,en,alt,azh,aen,note,english])=>[view(prefix+native,prefix+native,zh,en,note,english),view(prefix+native+'-'+alt,prefix+native,azh,aen,note,english)]);
export const completionBusinessViewMap=Object.fromEntries(specs.map(([native])=>[native,prefix+native]));
const info=new Map(completionBusinessViews.map(v=>[v.id,v]));
export const isCompletionBusinessView=id=>info.has(id);
export const completionBusinessFamily=id=>info.get(id)?.family;
const nativeOf=doc=>doc.template||doc.family?.slice(prefix.length);
const unique=a=>[...new Set(a)],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function completionBusinessOrderFields(doc){return nativeOf(doc)==='marimekko'?{groupOrder:'group',seriesOrder:'series'}:nativeOf(doc)==='likert'?{questionOrder:'question',responses:'response'}:nativeOf(doc)==='stackedwaterfall'?{stepOrder:'step',components:'component'}:{};}
export function completionBusinessDocument(doc,common={}){
 const family=completionBusinessFamily(completionBusinessViewMap[doc?.template]);if(!family)return null;
 return {...doc,...common,family,data:doc.data.map((r,row)=>({...r,row}))};
}
export function completionBusinessEligibility(doc,id){
 const bad=(zh,en)=>({valid:false,reason:t(zh,en)});
 if(!info.has(id)||doc?.family!==completionBusinessFamily(id)||!Array.isArray(doc.data)||!doc.data.length||doc.data.some(r=>!r||typeof r!=='object'))return bad('请选择该图表的完整原始数据。','Select complete original data for this chart.');
 if(doc.data.some(r=>typeof r._id!=='string'||!r._id)||new Set(doc.data.map(recordId)).size!==doc.data.length)return bad('原记录 _id 必须稳定且唯一。','Original record _id must be stable and unique.');
 const native=nativeOf(doc);if(completionBusinessViewMap[native]!==doc.family)return bad('原模板与变形数据契约不一致。','The native template and morph data contract disagree.');
 const report=validateDocument({...doc,template:native});if(!report.valid)return{valid:false,reason:report.errors.join(' ')};
 if(native==='waterfall'){
  const model=businessWaterfall(doc.data),calculated=model.at(-2).end,final=doc.data.at(-1).value,scale=Math.max(Math.abs(final),Math.abs(calculated),...doc.data.map(r=>Math.abs(r.value)),Number.MIN_VALUE);
  if(Math.abs(calculated-final)>scale*1e-10||model.some(p=>p.row.kind==='change'&&p.row.value!==0&&p.start===p.end))return bad('起终总量须按原变化守恒，且每次变化须在当前单位下可分辨。','Initial/final totals must reconcile with original changes, and each change must remain distinguishable in the current unit.');
 }
 for(const[field,column]of Object.entries(completionBusinessOrderFields(doc))){const order=doc[field];if(order!==undefined&&(!Array.isArray(order)||order.some(v=>typeof v!=='string'||!v.trim())||new Set(order).size!==order.length||!same([...order].sort(),unique(doc.data.map(r=>r[column])).sort())))return bad('显式顺序必须完整包含原表的唯一类别。','Explicit order must contain exactly the complete original categories.');}
 try{const bounds=completionBusinessBounds(doc);if(Object.values(bounds).some(values=>!Array.isArray(values)||!values.every(Number.isFinite)||!Number.isFinite(values[1]-values[0])))return bad('派生数值或坐标跨度无法有限表示，请换算单位。','Derived values or coordinate spans cannot be represented finitely; rescale units.');}catch{return bad('原数据不能生成完整有限的图表。','Original data cannot produce a complete finite chart.');}
 return{valid:true,reason:''};
}
export function completionBusinessCompatibility(a,b){
 if(a?.family!==b?.family)return t('原图的数据契约不同。','Native data contracts differ.');
 if(a.unit!==b.unit||!same(a.axes,b.axes)||['name','type','url'].some(k=>a.source?.[k]!==b.source?.[k]))return t('单位、变量含义或来源改变。','Units, variable meanings or sources changed.');
 for(const k of['sideLabels','responses','baseline','intercept','stepOrder','components','groupOrder','seriesOrder','questionOrder','forecastOrigin','modelName','intervalDefinition'])if(!same(a[k],b[k]))return t('显式分类、评分系数或情景基准改变。','Declared categories, scoring rules or scenario references changed.');
 if(!same(a.data.map(recordId),b.data.map(recordId)))return t('记录集合或原始顺序改变。','The record population or original order changed.');
 const fields={waterfall:['kind'],marimekko:['group','series'],range:['period'],dendrogram:['parent'],likert:['question','response'],forecastfan:['period'],stackedwaterfall:['step','component'],nomogram:['variable','minimum','maximum','coefficient','reference']};
 for(const field of fields[nativeOf(a)]||[])if(!same(a.data.map(r=>r[field]),b.data.map(r=>r[field])))return t('记录归属、时间或固定评分规则改变。','Record membership, time or fixed scoring rules changed.');
 if(nativeOf(a)==='forecastfan'&&!same(a.data.map(r=>r.observed===null),b.data.map(r=>r.observed===null)))return t('历史与预测的分段改变。','The history/forecast partition changed.');
 return '';
}
export function businessWaterfall(rows){let balance=0;return rows.map((row,i)=>{const start=row.kind==='total'?0:balance;if(row.kind==='total'){if(i===0)balance=row.value;return{row,start,end:row.value};}balance+=row.value;return{row,start,end:balance};});}
const span=(...values)=>extent(values.flat()),amounts=rows=>rows.map(r=>r.width*r.rate);
export function completionBusinessBounds(doc){
 const rows=doc.data,native=nativeOf(doc),order=[0,Math.max(1,rows.length-1)];
 if(native==='waterfall')return{order,value:span(0,businessWaterfall(rows).flatMap(p=>[p.start,p.end]),rows.map(r=>r.value))};
 if(native==='marimekko'){const m=marimekkoLayout(rows);return{order,value:span(0,m.groups.map(g=>g.total)),share:[0,1]};}
 if(native==='range')return{order,date:extent(rows.map(r=>Date.parse(r.period))),value:span(rows.flatMap(r=>[r.low,r.high])),departure:span(0,rows.flatMap(r=>[r.low-r.open,r.high-r.open]))};
 if(native==='pyramid')return{order,value:span(0,rows.flatMap(r=>[r.left,r.right]))};
 if(native==='dendrogram')return{order,value:span(0,rows.map(r=>r.value))};
 if(native==='likert')return{order,value:span(0,100,likertLayout(doc).flatMap(g=>g.segments.flatMap(s=>[s.start,s.end])))};
 if(native==='forecastfan'){const history=rows.filter(r=>r.observed!==null),ref=history.at(-1).observed,values=rows.flatMap(r=>r.observed!==null?[r.observed]:['lower95','upper95'].map(k=>r[k]));return{order,value:span(values),departure:span(0,values.map(v=>v-ref))};}
 if(native==='tornado')return{order,value:span(doc.baseline,rows.flatMap(r=>[r.low,r.high]))};
 if(native==='variwide'){const m=variwide18(rows);return{order,width:[0,m.totalWidth],rate:span(0,rows.map(r=>r.rate)),amount:span(0,amounts(rows))};}
 if(native==='stackedwaterfall'){const m=waterfall18(doc);return{order:[0,doc.stepOrder.length+1],value:span(0,doc.baseline,doc.finalTotal,m.steps.flatMap(p=>[p.positive,p.negative,p.end]),rows.map(r=>r.value))};}
 if(native==='nomogram'){const m=nomogram16(doc);let cumulative=doc.intercept;const positions=m.rows.flatMap(p=>{const start=cumulative;cumulative+=p.contribution;return[start+p.low,start+p.high,cumulative];});return{order,value:span(0,m.domain,doc.intercept,m.total,positions),contribution:m.domain};}
 const model=labbe16(rows);return{order,rate:[0,1],difference:span(0,model.map(p=>p.treatment-p.control)),size:span(0,model.map(p=>p.size))};
}
// These views retain the native semantic palette. Counts do not acquire
// arbitrary row-index colors merely because a new coordinate view exists.
export const completionBusinessColorSubjects=()=>[];
export const completionBusinessColorKeys=()=>[];
export function completionBusinessRecipe(){return{id:'complete-business-native-coordinates',get name(){return t('原图连续换坐标','Continuous native-chart coordinates');},description:t('完整原记录与独立派生几何持续对应，原值和统计含义保持明确。','Complete original records and separate derived geometry retain continuous correspondence and explicit statistical meaning.')};}
export function completionBusinessGuide(doc,id){return[info.get(id)?.note||'',t('保留全部 _id、原始字段、source、unit、axes 与显式顺序。派生几何保持独立 recordIds，编辑修改原输入。动画中间帧不作读数。','Preserve every _id, raw field, source, unit, axes and explicit order. Derived geometry retains separate recordIds; editing changes original inputs. Do not read intermediate animation frames.'),t('零值保留完整身份与基线标记；不得删行、补零、重新拟合、改写分母或将不同对象强行对应。','Zeros retain complete identities and baseline markers. Do not remove rows, impute zeros, refit models, rewrite denominators or force different objects into correspondence.')];}
export function completionBusinessAgentGuide(english=false){return(english?'Use the original FORMA native renderer: ':'使用原版 FORMA 原生渲染器：')+completionBusinessViews.map(v=>v.id).join(', ')+'\n'+(english?'Preserve _id, original raw fields, source, unit, axes, sideLabels, responses, baseline, intercept, stepOrder, components, groupOrder, seriesOrder and questionOrder. Retain exact original rows and stable recordId; derived geometry has separate populationId and recordIds. Waterfall total/change kinds must reconcile, with opposing component contributions visible. Marimekko width×within-group share represents global area, while count stacks use raw amounts. OHLC and forecasts preserve all original endpoints; OHLC uses actual ISO date spacing and forecast fans accept only supplied nested intervals, never refitting. Mirror bars are positive quantities. Tree distances are structural only. Likert keeps five responses, explicit zeros and neutral placement. Tornado low/high are input scenarios, not ordered confidence bounds. Variwide area=width×rate and zero rate has zero area. Nomogram score=intercept+Σ coefficient×(value−reference), with fixed coefficients and no risk link. L’Abbé uses original events and denominators, area=combined sample size, difference=treatmentEvents/treatmentTotal−controlEvents/controlTotal; no pooled effect or inverse-variance claim. Keep persistent keyed contours, exact endpoints, reverse seeks, interrupted resumption and HTML/SVG/video export.':'保留 _id、原始字段、source、unit、axes、sideLabels、responses、baseline、intercept、stepOrder、components、groupOrder、seriesOrder、questionOrder。完整原表和稳定 recordId 不变，派生几何独立 populationId、recordIds。瀑布首尾 total 与 change 守恒，分解瀑布正负分量均显示。变宽构成面积=组宽×组内份额，备选数量堆叠展示原值。OHLC 与预测保留所有原端点，OHLC 使用实际 ISO 日期间隔，预测仅用已提供的嵌套区间而不拟合。双向条形左侧仍为正数量。树的距离仅为结构。李克特保留五档顺序、显式零值和中立位置。龙卷风 low/high 是输入情景而非置信界限。变宽图面积=width×rate，零率不占正面积。列线图评分=intercept+Σ coefficient×(value−reference)，固定系数，不生成风险概率。L’Abbé 保留事件数及分母，面积=合计样本量，差值=treatmentEvents/treatmentTotal−controlEvents/controlTotal，不计算合并效应或逆方差权重。保留持久轮廓、精确端点、倒放、中断接续及 HTML/SVG/视频导出。');}
