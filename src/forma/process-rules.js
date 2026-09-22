import {isEnglish} from './locale.js';
import {imr10} from './volume10-data.js';
import {recordId} from './data-identity.js';

export const processMessages={
 '过程单值图':'Individual measurements',
 '单值与移动极差':'Individuals & moving ranges',
 '按采集顺序保留每次过程测量，均值与控制限使用全部输入估计。控制限不是规格限。':'Keep each process measurement in acquisition order. All inputs estimate the center and control limits; control limits are not specification limits.',
 '单值留在上区，下区展开相邻两次测量的绝对差；第一项移动极差不存在，不填零。':'Individuals remain in the upper panel while successive absolute differences unfold below. The first moving range is undefined, never zero-filled.',
 '需要单值过程测量数据。':'Individual process measurements are required.',
 '填写 4–300 条完整的有序过程测量，原表不会为适配画面而删行。':'Provide 4–300 complete ordered process measurements. Source rows are not removed to fit the display.',
 '每次测量须保留唯一记录 ID，时期仅作显示，数值须为实际有限数。':'Each measurement needs a unique stored record ID. Period labels are for display; values must be finite observed numbers.',
 '恒定序列没有可估计的非零过程波动，请保留原表并核对。':'A constant sequence cannot estimate nonzero process variation. Keep and review the source table.',
 '请填写该过程的单位和数据来源。':'Provide the process measurement unit and source.',
 '过程单位或来源不同，保留各自图表正常切换。':'Process units or sources differ; switch between the independent charts.',
 '观测顺序或相邻关系改变，重新建立移动极差。':'Observation order or adjacency changed; moving ranges must be reconstructed.',
 '输入观测改变，整段估计的过程基线已改变。':'Input observations changed, so the baseline estimated from the whole sequence has changed.',
 '观测指标或坐标含义不同，保留各自的测量定义。':'Observation or axis meanings differ; preserve each measurement definition.',
 '单值与波动展开':'Unfold process variation',
 '保留同一批单值测量，先缩放上区，再从零基线展开移动极差；反向先收起下区。':'Retain every individual measurement, resize its panel, then unfold moving ranges from their zero baseline. Reverse playback folds the lower panel first.',
 '每行一次原始测量，按实际采集顺序填写 period 与 value。请勿把已计算的移动极差作为原始值，勿混入不同过程或不同单位。':'Enter one original measurement per row as period and value in acquisition order. Do not substitute calculated moving ranges for observations or mix processes or units.',
 '全部输入估计一条基线，不自动筛除异常点。仅标记越限，不执行连续偏向等额外运行规则；控制限不是产品规格限，也不是置信区间。':'All inputs estimate one baseline without removing outliers. Only outside-limit points are flagged; no additional run rules are evaluated. Control limits are neither product specification limits nor confidence intervals.',
 '移动极差由有序相邻记录对计算，首项未定义。改名保留记录身份；重排、增删或改变观测后，使用新基线正常切换。':'Moving ranges derive from ordered adjacent record pairs; the first is undefined. Renaming keeps identity. Reordering, adding, removing or editing measurements uses the new baseline with a normal chart entrance.',
 '采集顺序':'Acquisition order',
 '单值 I':'Individuals I',
 '移动极差 MR':'Moving range MR',
 '全部输入估计基线 · 仅检查越限':'Whole-sequence baseline · Outside-limit checks only',
 '控制限不是规格限':'Control limits are not specification limits',
 '首项 MR 未定义':'First MR undefined',
 '相邻原始测量':'Adjacent original measurements',
 '原始测量':'Original measurement',
 '超出控制限':'Outside control limits',
 '过程单值与波动':'Process values and variation',
 '先查看整段单值，再展开相邻变化的移动极差，观察同一过程的局部波动。':'Inspect individual measurements, then unfold their successive moving ranges to examine local process variation.',
 '每行是同一过程的一次原始测量，按采集顺序填写。所有观测共同估计基线，第一项移动极差未定义；不使用规格限替代控制限。':'Each row is one original measurement from the same process in acquisition order. All observations estimate the baseline. The first moving range is undefined; specification limits must not replace control limits.',
 '同一过程 · 单值与相邻移动极差':'One process · Individuals and successive moving ranges',
 '过程流量记录':'Process flow measurements',
 '同一批原始测量 · 控制限不等于规格限':'The same original measurements · Control limits are not specification limits',
 'FORMA 场景演示 · 合成数据':'FORMA scenario demonstration · Synthetic data'
};
export const processText=key=>isEnglish()?processMessages[key]??key:key;
const info=(id,name,note)=>({id,get name(){return processText(name);},en:processMessages[name],get note(){return processText(note);}});
export const processViews=[
 info('process-individual','过程单值图','按采集顺序保留每次过程测量，均值与控制限使用全部输入估计。控制限不是规格限。'),
 info('process-imr','单值与移动极差','单值留在上区，下区展开相邻两次测量的绝对差；第一项移动极差不存在，不填零。')
];
export const isProcessView=view=>processViews.some(v=>v.id===view);
export const processFamily=view=>isProcessView(view)?'process':undefined;
export const processViewMap={imr:'process-imr'};
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e15;
const text=s=>typeof s==='string'&&!!s.trim();

export function processDocument(doc,common={}){
 if(doc?.template!=='imr')return null;
 return {...common,template:doc.template,title:doc.title,subtitle:doc.subtitle||'',unit:doc.unit,source:structuredClone(doc.source),...(doc.axes?{axes:structuredClone(doc.axes)}:{}),family:'process',baseline:'all-inputs',data:doc.data.map((r,row)=>({...r,row,label:r.period,group:processText('原始测量')}))};
}
export function processEligibility(doc,view){
 const bad=key=>({valid:false,reason:processText(key)});
 if(!isProcessView(view)||doc?.family!=='process')return bad('需要单值过程测量数据。');
 const rows=doc.data;
 if(!Array.isArray(rows)||rows.length<4||rows.length>300)return bad('填写 4–300 条完整的有序过程测量，原表不会为适配画面而删行。');
 if(rows.some(r=>!text(r._id)||!text(r.period)||!finite(r.value))||new Set(rows.map(recordId)).size!==rows.length||new Set(rows.map(r=>r.period)).size!==rows.length)return bad('每次测量须保留唯一记录 ID，时期仅作显示，数值须为实际有限数。');
 if(!text(doc.unit)||!text(doc.source?.name))return bad('请填写该过程的单位和数据来源。');
 const s=imr10(rows);if(!(s.mrMean>0)||![s.mean,s.low,s.high,s.mrHigh].every(Number.isFinite))return bad('恒定序列没有可估计的非零过程波动，请保留原表并核对。');
 return {valid:true,reason:''};
}
export function processCompatibility(a,b){
 if(a?.family!=='process'||b?.family!=='process'||a.unit!==b.unit||a.source?.name!==b.source?.name||a.source?.type!==b.source?.type||a.source?.url!==b.source?.url)return processText('过程单位或来源不同，保留各自图表正常切换。');
 if(JSON.stringify(a.axes||null)!==JSON.stringify(b.axes||null))return processText('观测指标或坐标含义不同，保留各自的测量定义。');
 if(a.data.length!==b.data.length||a.data.some((r,i)=>recordId(r)!==recordId(b.data[i])))return processText('观测顺序或相邻关系改变，重新建立移动极差。');
 // The current native template estimates its baseline from ALL original inputs.
 // Even an edit preserving the final mean may change MR and its limits; never
 // infer equivalence from summary numbers or animate it as the same baseline.
 if(a.baseline!==b.baseline||a.data.some((r,i)=>r.value!==b.data[i].value))return processText('输入观测改变，整段估计的过程基线已改变。');
 return '';
}
export function processBounds(doc){
 const s=imr10(doc.data);
 return {individual:[Math.min(s.low,...doc.data.map(r=>r.value)),Math.max(s.high,...doc.data.map(r=>r.value))],moving:[0,Math.max(s.mrHigh,...s.moving.filter(v=>v!==null))]};
}
export const processRecipe=()=>({id:'process-unfold',name:processText('单值与波动展开'),description:processText('保留同一批单值测量，先缩放上区，再从零基线展开移动极差；反向先收起下区。')});
export function processGuide(doc,view){return [processViews.find(v=>v.id===view)?.note||'',processText('每行一次原始测量，按实际采集顺序填写 period 与 value。请勿把已计算的移动极差作为原始值，勿混入不同过程或不同单位。'),processText('全部输入估计一条基线，不自动筛除异常点。仅标记越限，不执行连续偏向等额外运行规则；控制限不是产品规格限，也不是置信区间。'),processText('移动极差由有序相邻记录对计算，首项未定义。改名保留记录身份；重排、增删或改变观测后，使用新基线正常切换。')];}
