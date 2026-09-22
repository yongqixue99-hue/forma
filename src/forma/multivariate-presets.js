import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
export const multivariatePresets=[{id:'matrix-to-focus',name:'散点矩阵与局部聚焦',category:'research',description:'从多变量全貌中放大一个变量对，保留同一批样本的原始测量，再回到矩阵比较其他关系。',dataNote:'每行记录一个样本在一个变量上的原值。全部样本的变量完整，保留各变量自己的单位；聚焦不会重新拟合或删去样本。',relation:'同一批样本 · 同一变量对放大',views:['multivariate-matrix','multivariate-focus']}];
export function multivariateRecords(id,palette='ink'){
 if(id!=='matrix-to-focus')return null;
 const doc=withRecordIds(getExample('splom'),{legacyNamespace:`scenario:${id}`});doc.source={name:'FORMA 场景演示 · 合成数据',type:'demo'};
 return multivariatePresets[0].views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}}));
}
