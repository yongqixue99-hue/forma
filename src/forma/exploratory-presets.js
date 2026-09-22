import {getExample} from './catalog.js';

export const exploratoryPresets=[
 {id:'spatial-surface-morph',name:'三维曲面连续变形',category:'research',description:'同一张采样曲面收为三维原始点，再投影到 XY 平面；可反向展开，持续保留每条记录。',dataNote:'直接使用图库三维曲面的完整规则网格，value 对应 Z；不填补缺失采样。',relation:'同一组采样 · 网格与空间',views:['spatial-surface','spatial-3d','spatial-xy']},
 {id:'spatial-size-morph',name:'三维气泡连续变形',category:'research',description:'原有三维气泡收为等大散点，再转向 XZ 平面，球体位置和大小连续变化。',dataNote:'直接使用图库三维气泡的 X、Y、Z 与 size，投影面积与真实 size 成正比。',relation:'同一批对象 · 位置与规模',views:['spatial-bubbles','spatial-3d','spatial-xz']},
 {id:'series-focus',name:'多组趋势与分面',category:'regular',description:'先在同一坐标中比较各系列，再让每条线展开到自己的分面，共用尺度保持可比。',dataNote:'同一份时期、系列、数值长表。所有系列使用相同日期集合，缺失值显式留空；分面不单独缩放。',relation:'同一份时序数据 · 共尺分面',views:['multi-line','small-multiples','grouped-columns']},
 {id:'matrix-encoding',name:'矩阵的颜色与面积',category:'regular',description:'每个交叉单元保留位置，从色格收成真实面积的圆，比较两种不同的数量编码。',dataNote:'每行一个行列组合。原值非负，面积不作绝对值转换；真实 0 与未采集 null 分开表示。',relation:'同一份数值矩阵 · 色深与面积',views:['matrix-heatmap','matrix-bubbles']},
 {id:'uncertainty-over-time',name:'趋势与不确定性',category:'research',description:'从已有点估计出发，展开连续区间带，再收为各个日期的上下界，保留同一份估计结果。',dataNote:'日期、estimate、low、high。上下界来自已有分析，并说明区间定义；未采集日期的三项一起留空。',relation:'同一份估计结果 · 日期与区间',views:['ordered-estimate-line','ordered-estimate-band','ordered-estimate-intervals']},
 {id:'time-path',name:'双指标的时间路径',category:'regular',description:'保持全部原始散点，让路径沿真实日期逐段延伸，显示同一对象的两个指标怎样共同变化。',dataNote:'日期、X、Y；在坐标名称中写明指标和单位。仅连接同一对象，不把多个对象或行顺序当作轨迹。',relation:'同一对象 · 不同日期观测',views:['trajectory-points','trajectory-path']},
 {id:'spatial-projections',name:'三维观测与平面投影',category:'research',description:'原始对象从三维空间落到 XY、XZ 与 YZ 平面，查看单个投影难以识别的重叠与分组。',dataNote:'对象、分组、X、Y、Z 均来自实际观测。隐藏一维时保留原值与记录 ID，不重新拟合，也不解释投影距离。',relation:'同一批对象 · 三维与二维',views:['spatial-3d','spatial-xy','spatial-xz','spatial-yz']}
];
export function exploratoryRecords(id,palette='ink'){
 const preset=exploratoryPresets.find(p=>p.id===id);if(!preset)return null;
 const template=({'spatial-surface-morph':'surface3d','spatial-size-morph':'bubble3d','series-focus':'smallmultiples','matrix-encoding':'heatmap','uncertainty-over-time':'ribbon','time-path':'trajectory','spatial-projections':'scatter3d'})[id],doc=getExample(template);
 doc.source={name:'FORMA 场景演示 · 合成数据',type:'demo'};
 if(id==='matrix-encoding')doc.data[0].value=0;
 if(id==='uncertainty-over-time'){doc.data[7].estimate=null;doc.data[7].low=null;doc.data[7].high=null;doc.subtitle='同一份输入区间 · 缺失日期保留断点';}
 return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}}));
}
