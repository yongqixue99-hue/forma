import {uiText,uiMarkup,uiMessage} from './locale.js';
const properties={maxLag:uiText('最大滞后'),variableUnits:uiText('变量单位'),unit:uiText('单位'),frequencyUnit:uiText('频率单位'),source:uiText('来源'),axes:uiText('坐标含义'),periodLabels:uiText('前后观测'),pairLabels:uiText('配对观测'),methodLabels:uiText('测量方法'),intervalLabel:uiText('区间定义'),positiveLabel:uiText('正类定义'),doseUnit:uiText('剂量单位')};
export function semanticChanges(before,after){
  const display=(doc,key)=>key==='variableUnits'?Object.fromEntries(Object.entries(doc.variableUnits||{}).map(([id,unit])=>[doc.entities?.items.find(v=>v.id===id)?.name||id,unit])):doc[key];
  const changes=Object.entries(properties).flatMap(([key,label])=>JSON.stringify(before[key])===JSON.stringify(after[key])?[]:[{key,label,before:display(before,key),after:display(after,key)}]);
  if(JSON.stringify(before.entities)!==JSON.stringify(after.entities)&&after.entities){
    const old=before.entities?.items||[],next=after.entities.items,changesText=[];
    for(const e of next){const prior=old.find(p=>p.id===e.id);if(!prior)changesText.push(uiMessage`新身份：${e.name}`);else if(prior.name!==e.name)changesText.push(uiMessage`改名：${prior.name} → ${e.name}`);}
    for(const e of old)if(!next.some(n=>n.id===e.id))changesText.push(uiMessage`移除旧身份：${e.name}`);
    changes.push({key:'entities',label:({model:uiText('模型身份与名称'),variable:uiText('变量身份与排列'),series:uiText('系列身份与排列'),parent:uiText('父类别身份与排列')})[after.entities.kind],before:old.map(e=>e.name).join('、')||uiText('未登记'),after:changesText.join('；')||uiText('调整显示顺序，记录身份保持不变')});
  }
  return changes;
}
export function semanticValue(value){
  if(value===undefined||value===null)return uiText('未设置');
  if(Array.isArray(value))return value.map(semanticValue).join(' / ');
  if(typeof value==='object'){
    const labels={name:uiText('名称'),type:uiText('类型'),url:uiText('链接'),x:uiText('X 轴'),y:uiText('Y 轴')};
    return Object.entries(value).map(([key,v])=>key==='name'?String(v):key==='type'?({demo:uiText('示例数据'),user:uiText('用户数据')}[v]||String(v)):`${labels[key]||key}：${semanticValue(v)}`).join(' · ');
  }
  return String(value);
}
export function encodingMeaning(view){
  if(view==='distribution-sina')return uiText('数值轴保留原值；另一方向仅按密度抖动');
  if(view==='distribution-boxen')return uiText('嵌套箱表示尾部分位区间，箱宽不是频数密度');
  if(view==='distribution-halfeye')return uiText('密度与中央 50%/90% 样本分位区间，不是均值置信区间');
  if(view==='distribution-quantiledot')return uiText('上方为等概率分位摘要，下方为全部原始观测');
  if(view?.startsWith('freq-'))return uiText('实心点与外环是同一采样的两种投影；只使用输入的正频率响应');
  if(view?.startsWith('serial-'))return uiText('无量纲系数共用 [-1,1] 轴；ACF 未调整，PACF 使用 Yule–Walker；白噪声参考带不是预测区间');
  if(view?.startsWith('process-'))return uiText('全部输入估计控制限，首项移动极差未定义；控制限不是规格限');
  if(view?.startsWith('multivariate-'))return uiText('同一样本在各变量对中重复呈现；各变量保留原单位与范围，不做标准化');
  if(view==='series-rank')return uiText('名次按原值降序，同值并列；名次差不表示数值差');
  if(view==='sample-ridge')return uiText('共用带宽与密度幅度；山脊高度不表示样本量');
  if(view==='matrix-clustered')return uiText('欧氏距离与平均连接；只重排，不标准化，不代表显著性');
  if(view==='small-multiples')return uiText('所有分面共用时间范围与数值尺度；缺失处保持断点');
  if(view==='matrix-bubbles')return uiText('圆面积对应非负原值；0 是零值，斜线是缺失');
  if(view==='matrix-heatmap')return uiText('色深对应原值，不是相关系数；斜线表示缺失');
  if(view?.startsWith('ordered-estimate-'))return uiText('区间来自输入的上下界，保留原定义与真实日期间距');
  if(view==='trajectory-path')return uiText('路径按真实日期连接同一对象，不是回归线');
  if(view?.startsWith('spatial-'))return view==='spatial-surface'?uiText('完整网格的原始高度；相邻采样点之间线性连接'):view==='spatial-bubbles'?uiText('正交投影面积与真实 size 成正比；三个坐标保持原值'):view==='spatial-3d'?uiText('正交投影；屏幕距离不能当作三维原始距离'):uiText('只展示选定坐标平面，隐藏维度的数据仍保留');
  if(view==='eval-roc')return uiText('同阈值：假阳性率 FPR 与真阳性率 TPR');
  if(view==='eval-pr')return uiText('同阈值：召回率与精确率；AP 不等于 ROC AUC');
  if(view==='eval-gains')return uiText('同阈值：已筛选样本比例与已覆盖正类比例');
  if(view==='eval-lift')return uiText('提升倍数 = 正类覆盖比例 / 筛选比例；零筛选时未定义');
  if(view==='eval-threshold')return uiText('阈值从高到低（严格到宽松）；对应检出率与误报率');
  if(view==='hierarchy-sunburst')return uiText('同层扇区角度表示份额；不同环的面积不可直接比较');
  if(view==='hierarchy-icicle')return uiText('同层宽度表示份额；上层为子项合计');
  if(view==='hierarchy-treemap')return uiText('叶块面积表示份额；父级边框包含其子项');
  if(view==='eval-calibration')return uiText('按预测概率分箱；阈值点不等于分箱统计');
  if(view?.startsWith('corr-'))return uiText('Pearson 相关系数；相关不代表因果');
  if(view?.startsWith('percent')||['pie','donut','semidonut','stacked','waffle'].includes(view))return uiText('占比：按各自总量归一，原值保留');
  if(view==='paired-change')return uiText('配对变化：后值 − 前值');
  if(view==='sample-sd')return uiText('均值 ± 样本 SD，不是置信区间');
  if(view==='obs-confidence')return uiText('均值响应的 95% 置信带，不是个体预测区间');
  if(view?.includes('confusion'))return view==='confusion-rows'?uiText('真实类别内比例；对角项为召回率'):view==='confusion-columns'?uiText('预测类别内比例；对角项为精确率'):uiText('分类组合计数');
  if(view==='prediction-absolute')return uiText('绝对误差：|观测值 − 预测值|');
  if(view?.includes('residual')||view==='prediction-ranked')return uiText('残差：观测值 − 预测值');
  if(view?.includes('bland')||view==='method-delta')return uiText('方法差异：A − B；一致性不等于相关性');
  if(view?.includes('ecdf'))return uiText('经验累计分布：截至当前数值的样本比例');
  if(view?.includes('density')||view?.includes('violin')||view?.includes('raincloud'))return uiText('轮廓宽度表示密度，不表示样本量');
  return '';
}

export function frameMeaning(view,{progress=1,mode,fromView}={}){
  if(mode==='morph'&&progress>0&&progress<1&&fromView==='series-rank'&&view!=='series-rank')return uiText('变形中，请在停稳后读数。由名次返回原值，名次差不表示数值差。');
  const meaning=encodingMeaning(view);
  return mode==='morph'&&progress>0&&progress<1&&/^(eval|corr|hierarchy|sample|distribution|freq|matrix|ordered|spatial|series|process|multivariate)-/.test(view)?uiMessage`变形中，请在停稳后读数。${meaning}`:meaning;
}
