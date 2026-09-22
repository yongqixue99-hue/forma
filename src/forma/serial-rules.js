import {t10,autocorrelation10,pacf10} from './volume10-data.js';
import {recordId} from './data-identity.js';
export const serialViews=[
 {id:'serial-acf',name:t10('序列自相关 ACF','Autocorrelation ACF'),en:'Autocorrelation ACF',note:t10('同一等间隔原始序列，使用未调整中心化乘积估计自相关；各滞后共用分母。','One equally spaced raw sequence; unadjusted centered-product autocorrelations share a denominator.')},
 {id:'serial-pacf',name:t10('序列偏自相关 PACF','Partial autocorrelation PACF'),en:'Partial autocorrelation PACF',note:t10('Yule–Walker / Levinson–Durbin 估计。切换时旧系数先回零，再展开新估计器；不能把两种系数当作同一个量平移。','Yule–Walker / Levinson–Durbin estimates. Retract the previous coefficients to zero before expanding the new estimator.')}
];
export const isSerialView=v=>serialViews.some(x=>x.id===v);
export const serialViewMap={acf:'serial-acf',pacf:'serial-pacf'};
export function serialDocument(doc,common){return {...common,family:'serial',maxLag:doc.maxLag,axes:doc.axes,data:doc.data.map((r,row)=>({...r,row,label:r.period,group:'sequence'}))};}
export function serialEligibility(doc,view){
 const bad=reason=>({valid:false,reason}),rows=doc?.data||[];
 if(!isSerialView(view)||rows.length<8||rows.length>500||rows.some(r=>!Number.isFinite(r.value)||!recordId(r))||new Set(rows.map(recordId)).size!==rows.length||new Set(rows.map(r=>r.period)).size!==rows.length||new Set(rows.map(r=>r.value)).size<2)return bad(t10('需要 8–500 条非恒定、完整、等间隔的原始观测，按采集顺序保留唯一记录。','Supply 8–500 complete, nonconstant, equally spaced raw observations in acquisition order with unique records.'));
 if(!Number.isInteger(doc.maxLag)||doc.maxLag<1||doc.maxLag>60||doc.maxLag>=rows.length)return bad(t10('最大滞后需要为 1–60，且小于样本数。','Maximum lag must be 1–60 and less than the sample count.'));
 try{(view==='serial-pacf'?pacf10:autocorrelation10)(rows.map(r=>r.value),doc.maxLag);}catch(e){return bad(e.message);}
 return {valid:true,reason:''};
}
export function serialCompatibility(a,b){
 if(a.maxLag!==b.maxLag)return t10('最大滞后定义改变','Maximum lag changed');
 if(JSON.stringify([a.unit,a.source?.name,a.source?.type,a.source?.url,a.axes])!==JSON.stringify([b.unit,b.source?.name,b.source?.type,b.source?.url,b.axes]))return t10('原始序列来源、指标或单位改变','Sequence source, measure or unit changed');
 if(JSON.stringify(a.data.map(r=>[recordId(r),r.value]))!==JSON.stringify(b.data.map(r=>[recordId(r),r.value])))return t10('原始序列数值、记录或采集顺序改变','Sequence values, records or acquisition order changed');
 return '';
}
export const serialBounds=()=>({coefficient:[-1,1]});
export const serialRecipe=()=>({id:'serial-estimator',name:t10('回零后切换估计器','Retract and change estimator'),description:t10('保留滞后位置与 [-1,1] 共轴。旧系数先回零，再展开新系数；参考带为白噪声假设下 ±1.96/√n。','Keep lag positions and the shared [-1,1] axis. Retract old coefficients to zero before expanding new ones; reference limits are ±1.96/√n under white noise.')});
export function serialGuide(doc,view){return [serialViews.find(v=>v.id===view)?.note,serialRecipe().description,t10('输入每行是等间隔原始测量，不是已算好的系数。保留全部记录 ID 与采集顺序；参考带不属于原测量单位，也不是模型预测区间。','Each input row is an equally spaced raw measurement, not a computed coefficient. Preserve all record IDs and acquisition order. Reference limits are dimensionless, not model prediction intervals.')];}
