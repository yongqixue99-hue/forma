import {getExample} from './catalog.js';
import {processText as t} from './process-rules.js';

export const processPresets=[{id:'process-variation',name:'过程单值与波动',category:'research',description:'先查看整段单值，再展开相邻变化的移动极差，观察同一过程的局部波动。',dataNote:'每行是同一过程的一次原始测量，按采集顺序填写。所有观测共同估计基线，第一项移动极差未定义；不使用规格限替代控制限。',relation:'同一过程 · 单值与相邻移动极差',views:['process-individual','process-imr']}];
export function processRecords(id,palette='ink'){
 const preset=processPresets.find(p=>p.id===id);if(!preset)return null;
 const doc=getExample('imr');doc.title=t('过程流量记录');doc.subtitle=t('同一批原始测量 · 控制限不等于规格限');doc.source={name:t('FORMA 场景演示 · 合成数据'),type:'demo'};
 return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}}));
}
