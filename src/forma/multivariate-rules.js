import {uiText} from './locale.js';
import {withEntityIds,entityProblems} from './entity-identity.js';
import {recordId} from './data-identity.js';

export const multivariateViews=[
 {id:'multivariate-matrix',name:uiText('完整散点矩阵'),en:'Complete scatterplot matrix',note:uiText('同一批样本在每个变量对中保留原值，每个变量使用自己的尺度与单位。')},
 {id:'multivariate-focus',name:uiText('变量对聚焦'),en:'Focus a variable pair',note:uiText('选中的分面展开为大图，原始样本与两个测量维度保持对应；其余分面暂时收起。')}
];
export const multivariateFamily=view=>multivariateViews.some(v=>v.id===view)?'multivariate':undefined;
export const isMultivariateView=view=>!!multivariateFamily(view);
export const multivariateViewMap={splom:'multivariate-matrix'};
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e15;
const unique=a=>[...new Set(a)];
const identified=doc=>withEntityIds(doc,{legacyNamespace:'unmigrated-multivariate'});
export function multivariateVariables(input){
 const doc=identified(input),observed=new Set(doc.data.map(r=>r._variableId));
 return doc.entities.items.filter(v=>observed.has(v.id)).map(v=>{const parts=v.name.split(' / '),embedded=parts.length>1?parts.at(-1):'',explicit=doc.variableUnits?.[v.id],unit=explicit??embedded,baseName=parts.length>1?parts.slice(0,-1).join(' / '):v.name;return {...v,baseName,unit,label:explicit!==undefined?(unit?`${baseName} / ${unit}`:baseName):v.name};});
}
export function multivariateSelectedPair(input){const doc=identified(input);return [...(doc.selectedPair??multivariateVariables(doc).slice(0,2).map(v=>v.id))];}
export function withMultivariatePair(input,pair){
 const doc=identified(input),ids=new Set(multivariateVariables(doc).map(v=>v.id));
 if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||pair.some(id=>!ids.has(id)))throw new Error(uiText('请为 X 和 Y 选择两个不同的现有变量。'));
 return {...doc,selectedPair:[...pair]};
}
export function multivariateDocument(input,common){
 const doc=identified(input);
 return {...common,family:'multivariate',entities:doc.entities,sampleEntities:doc.sampleEntities,selectedPair:doc.selectedPair,variableUnits:doc.variableUnits,template:'splom',data:doc.data.map((r,row)=>({...r,label:r.sample,row}))};
}
export function multivariateEligibility(doc,view){
 const bad=reason=>({valid:false,reason});if(!isMultivariateView(view))return bad(uiText('未知的多变量图型。'));
 const errors=entityProblems(doc);if(errors.length)return bad(errors[0].message);
 const rows=doc.data||[],variables=unique(rows.map(r=>r._variableId)),samples=unique(rows.map(r=>r._sampleId));
 if(!rows.length||rows.some(r=>typeof recordId(r)!=='string'||!recordId(r))||unique(rows.map(recordId)).length!==rows.length)return bad(uiText('每条原始测量需要独立且持久的记录 ID。'));
 if(rows.some(r=>!r._variableId||!r._sampleId||!finite(r.value)))return bad(uiText('同一样本必须填写每个变量的完整原值；缺失不会被删除或填零。'));
 if(rows.length!==variables.length*samples.length||unique(rows.map(r=>JSON.stringify([r._sampleId,r._variableId]))).length!==rows.length)return bad(uiText('每个样本与变量组合只能填写一次，且所有组合必须完整。'));
 if(samples.some(id=>unique(rows.filter(r=>r._sampleId===id).map(r=>r.group)).length!==1))return bad(uiText('同一样本在每个变量中的分组必须一致。'));
 if(variables.length<2||variables.length>5||samples.length<3||samples.length>80)return bad(uiText('此多变量变形布局展示 2–5 个变量、3–80 个完整样本；原表不会截短。'));
 if(unique(rows.map(r=>r.group)).length>6)return bad(uiText('此多变量布局最多显示 6 个样本分组；原始分组不会合并。'));
 if(doc.selectedPair.some(id=>!variables.includes(id)))return bad(uiText('选中的变量已没有观测，请重新选择变量对。'));
 return {valid:true,reason:''};
}
export function multivariateBounds(doc){return Object.fromEntries(unique(doc.data.map(r=>r._variableId)).map(id=>{const values=doc.data.filter(r=>r._variableId===id).map(r=>r.value).filter(finite);return [id,values.length?[Math.min(...values),Math.max(...values)]:[0,1]];}));}
export function multivariateCompatibility(a,b){
 if(a.family!==b.family)return uiText('图型的数据结构不同。');
 const idsA=unique(a.data.map(r=>r._variableId)).sort(),idsB=unique(b.data.map(r=>r._variableId)).sort();
 if(JSON.stringify(idsA)!==JSON.stringify(idsB))return uiText('变量身份不同，不能按显示名称对应测量。');
 const unitsA=new Map(multivariateVariables(a).map(v=>[v.id,v.unit])),unitsB=new Map(multivariateVariables(b).map(v=>[v.id,v.unit]));
 if(idsA.some(id=>unitsA.get(id)!==unitsB.get(id)))return uiText('变量的测量单位不同。');
 // A rename is allowed, but a changed pair is a different measurement space.
 // Re-enter that space instead of translating an old X/Y measurement into it.
 if(JSON.stringify(a.selectedPair)!==JSON.stringify(b.selectedPair))return uiText('当前选择的变量对不同；将展开新坐标，不把不同测量当成同一点。');
 return '';
}
export function multivariateRecipe(from,to){return {id:from===to?'multivariate-update':'multivariate-zoom',name:from===to?uiText('多变量观测更新'):uiText('分面聚焦'),description:uiText('保留选中变量对中每个样本的身份，分面扩展为大图，其余分面收拢；返回时恢复全部分面。')};}
export function multivariateGuide(doc,view){return [multivariateViews.find(v=>v.id===view)?.note||'',uiText('每行填写样本、变量名称及单位、原始数值和分组。同一样本在所有变量中各占一行，分组一致。选择 X 与 Y 后，该分面可以放大阅读；不同量纲分别保留坐标，不标准化，也不逐对删掉缺测样本。'),uiText('聚焦只改变阅读范围，不计算回归、相关系数或显著性。切换变量对时，新旧坐标含义不同，会重新展开对应图面。')];}
