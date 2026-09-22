import {getExample} from './catalog.js';

export const refinementPresets=[
 {id:'values-to-ranks',name:'数值与名次',category:'regular',description:'先看各系列的原始变化，再把同一观测移到当期名次，区分数量差与顺序变化。',dataNote:'时期、系列、原值完整填写。同值并列，排名使用 1、1、3；表格始终保存原值，不能把名次当作原始数值输入。',relation:'同一份系列观测 · 原值与排名',views:['multi-line','series-rank','grouped-columns']},
 {id:'distribution-ridges',name:'样本与分布山脊',category:'research',description:'让每个原始样本留在图中，依次展开山脊、雨云与小提琴，比较同一批样本的分布。',dataNote:'每行一条原始样本及分组。各组共用高斯带宽、数值轴和密度幅度；密度高度不是样本数量。',relation:'同一批原始样本 · 密度与摘要',views:['sample-swarm','sample-ridge','sample-raincloud','sample-violin']},
 {id:'matrix-reordering',name:'矩阵的原序与聚类',category:'research',description:'保留每个格子的数值与颜色，先调整行、再调整列，查看原序中不易识别的相似模式。',dataNote:'完整的同量纲行列矩阵。欧氏距离、平均连接，不自动标准化，不填补缺测；树枝表示合并距离。',relation:'同一份测量矩阵 · 原序与聚类',views:['matrix-heatmap','matrix-clustered','matrix-bubbles']}
];
export function refinementRecords(id,palette='ink'){
 const preset=refinementPresets.find(p=>p.id===id);if(!preset)return null;
 const doc=getExample(({'values-to-ranks':'race','distribution-ridges':'ridges','matrix-reordering':'clusterheatmap'})[id]);
 doc.source={name:'FORMA 场景演示 · 合成数据',type:'demo'};
 if(id==='values-to-ranks'){
  // Include an actual tie in the synthetic scenario so its semantics are visible.
  const first=doc.data[0];doc.data.find(r=>r.period===first.period&&r.series!==first.series).value=first.value;
  doc.subtitle='原始值与降序名次 · 同值采用竞赛排名';
 }
 return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}}));
}
