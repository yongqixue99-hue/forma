import {getExample} from './catalog.js';

export const analyticalPresets=[
  {id:'screening-effectiveness',name:'模型筛选效果',category:'regular',description:'ROC 与 PR 的同一批阈值点连续移动到累计增益，再展开提升倍数，比较有限筛选名额下的正类覆盖。',dataNote:'每行填写样本编号、模型、真实 0/1 标签和预测得分；不同模型评估同一批样本。同分整体进入，零筛选时提升未定义，原始记录完整保留。',relation:'同一测试集 · 判别与筛选收益',views:['eval-roc','eval-pr','eval-gains','eval-lift']},
  {id:'duration-distribution',name:'时长与累计占比',category:'regular',description:'同一批时长从等宽直方图展开为频数折线，再比较累计柱和精确的经验分布。',dataNote:'每行填写唯一编号与一次真实时长，不提前汇总频数。分箱边界共用，累计曲线保留每个实际观测值和并列值。',relation:'同一批观测 · 分箱与累计',views:['uni-histogram','uni-frequency','uni-cumulative','uni-ecdf']},
  {id:'assay-distribution',name:'实验测量分布',category:'research',description:'从测量值的累计比例回看频数分布，识别集中区间和长尾，再检查箱上界的累计占比。',dataNote:'填写每份样本的原始测量与单位。ECDF 不使用平滑和分箱；切换直方图时保留全部样本与共同范围。',relation:'同一批实验样本 · 精确与分箱分布',views:['uni-ecdf','uni-histogram','uni-frequency','uni-cumulative']},
  {id:'classifier-comparison',name:'模型判别与阈值',category:'research',description:'比较同一测试集的 ROC 和 PR，再展开得分阈值，查看检出率与误报率的取舍。',dataNote:'每行填写模型、样本编号、真实标签和得分。不同模型必须评估同一批样本；得分越大越可能属于正类，同分一起处理。',relation:'同一测试集 · 同阈值点对应',views:['eval-roc','eval-pr','eval-threshold']},
  {id:'probability-reliability',name:'判别与概率可靠性',category:'research',description:'先看概率预测的判别能力，再按概率分箱检查可靠性。阈值点收拢后重新展开分箱结果。',dataNote:'使用独立测试集的真实 0/1 标签和 0–1 预测概率。ROC、PR 与校准关注不同问题；校准图保留空箱断点和每箱样本数。',relation:'同一组概率预测 · 判别与校准',views:['eval-roc','eval-pr','eval-threshold','eval-calibration']},
  {id:'correlation-exploration',name:'多变量相关探索',category:'research',description:'完整相关热图收起对称项，再以圆面积读取强度，最后展开每对变量的排序。',dataNote:'填写样本编号、变量名和原始数值，一个样本包含全部变量。系统计算 Pearson r；常量变量显示未定义，不补零。',relation:'同一份完整样本 · 变量对始终对应',views:['corr-heatmap','corr-triangle','corr-bubbles','corr-pairs']},
  {id:'metric-redundancy',name:'指标关系与重复度',category:'regular',description:'从变量对排序找到较强的线性关联，再回到气泡矩阵与热图核对整体结构。',dataNote:'同一行观测对象的各项指标使用同一统计窗口，变量名注明各自单位。排序依据 |r|，相关不作为因果或自动删除指标的依据。',relation:'同一批对象 · 成对关系与整体结构',views:['corr-pairs','corr-bubbles','corr-heatmap']}
];

export function analyticalRecords(id,palette='ink'){
  const preset=analyticalPresets.find(p=>p.id===id);if(!preset)return null;
  let doc;
  if(id==='screening-effectiveness')doc={...getExample('cumulativegains'),title:'有限名额的筛选效果',subtitle:'同一测试集 · 阈值点保持对应 · 同分整体进入'};
  if(id==='duration-distribution')doc={...getExample('histogram'),title:'用户阅读时长',subtitle:'原始时长 · 频数与累计占比',unit:'分钟'};
  if(id==='assay-distribution')doc={...getExample('histogram'),title:'样本测量值分布',subtitle:'120 份原始测量 · 等宽分箱与精确 ECDF',unit:'mg/L',binCount:10,data:Array.from({length:120},(_,i)=>({label:`S${i+1}`,value:Math.round((18+Math.sin(i*2.399)*4+Math.cos(i*.43)*2+(i%17===0?9:0))*10)/10}))};
  if(id==='classifier-comparison')doc={...getExample('roc'),title:'两个模型的分类表现',subtitle:'同一测试集 · 正类标签保持一致'};
  if(id==='probability-reliability'){
    const data=Array.from({length:120},(_,i)=>{const score=Math.round((.03+(i*37%120)/120*.94)*100)/100,uniform=(i*53%127)/127;return {label:`T${i+1}`,model:'模型 A',score,actual:uniform<score?1:0};});
    doc={...getExample('calibration'),title:'模型概率的可靠性',subtitle:'120 个测试样本 · 判别曲线与 6 个概率分箱',data};
  }
  if(id==='correlation-exploration')doc={...getExample('correlation'),title:'实验指标的线性关系',subtitle:'36 个完整样本 · 统一 Pearson 系数尺度'};
  if(id==='metric-redundancy'){
    const names=['使用时长','活跃频次','任务完成','等待时长'],data=Array.from({length:40},(_,i)=>{const a=12+i*.8+Math.sin(i*2.3)*3,b=4+i*.27+Math.cos(i*1.7)*2,c=20+i*.52+Math.sin(i*.6)*9,d=45-i*.47+Math.cos(i*2.8)*5;return [a,b,c,d].map((v,j)=>({sample:`U${i+1}`,variable:names[j],value:Math.round(v*100)/100}));}).flat();
    doc={...getExample('correlation'),title:'产品指标的关联结构',subtitle:'40 个完整观测对象 · 4 项指标 · 相关不代表因果',data};
  }
  doc.source={name:'FORMA 统计场景演示 · 确定性合成数据',type:'demo'};
  return preset.views.map(view=>({doc:structuredClone(doc),view,dataGroup:`scenario:${id}`,options:{palette},scale:'shared',duration:1700,hold:2300}));
}
