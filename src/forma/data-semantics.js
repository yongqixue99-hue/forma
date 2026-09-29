import {uiText,uiMarkup,uiMessage} from './locale.js';
const properties={referenceImpedance:uiText("参考阻抗"),heightUnit:uiText("高度单位"),systemDomain:uiText("系统域"),phaseConvention:uiText("相位与幅值约定"),frequency:uiText("相量频率"),phasorOrder:uiText("相量连接顺序"),calmThreshold:uiText("静风阈值"),windSectors:uiText("风向分区数"),speedBreaks:uiText("风速分段"),orders:uiText("阶次参考"),nodes:uiText("矩阵节点顺序"),leftNodes:uiText("左侧节点顺序"),rightNodes:uiText("右侧节点顺序"),ego:uiText("中心节点"),sets:uiText("集合顺序"),axisOrder:uiText("轴顺序"),dimensionOrder:uiText("维度顺序"),variableOrder:uiText("变量次序"),variables:uiText("曲线变量顺序"),componentOrder:uiText("主成分顺序"),sampleOrder:uiText("样本顺序"),objectOrder:uiText("对象顺序"),seriesOrder:uiText("系列顺序"),seasonOrder:uiText("季节顺序"),cycleOrder:uiText("周期顺序"),periodOrder:uiText("时期顺序"),cohortOrder:uiText("同期群顺序"),max:uiText("雷达刻度上限"),pc1Variance:uiText("PC1 解释方差"),pc2Variance:uiText("PC2 解释方差"),parameterCount:uiText("模型参数数（含截距）"),coefficient:uiText("外部模型线性系数"),referenceEffect:uiText("参考效应"),rankOrder:uiText("排名方向"),periodUnit:uiText("群龄单位"),modelName:uiText('外部分析模型'),groupOrder:uiText('分组比较顺序'),referenceMean:uiText('参考模型均值'),referenceSD:uiText('参考模型标准差'),alpha:uiText('显著水平参数'),minExceedances:uiText('最少超额样本数'),bandLabels:uiText('定性区间名称'),maxLag:uiText('最大滞后'),variableUnits:uiText('变量单位'),unit:uiText('单位'),frequencyUnit:uiText('频率单位'),source:uiText('来源'),axes:uiText('坐标含义'),periodLabels:uiText('前后观测'),pairLabels:uiText('配对观测'),methodLabels:uiText('测量方法'),intervalLabel:uiText('区间定义'),positiveLabel:uiText('正类定义'),doseUnit:uiText('剂量单位')};
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
  if(view==="relationx-adjacency")return uiText("每格对应原始节点对与权重；零值保留，缺边不补造");
  if(view==="relationx-adjacency-radial")return uiText("同一批节点对展开到环形；布局距离不表示关系强弱");
  if(view==="relationx-bipartite")return uiText("连线保留左右集合身份与原权重");
  if(view==="relationx-bipartite-circle")return uiText("双集合沿环排列；节点身份和连线权重保持不变");
  if(view==="relationx-ego")return uiText("以指定中心展示原始关系；不推断未输入的联系");
  if(view==="relationx-ego-arc")return uiText("同一网络展开为弧线；弧线高度不表示距离");
  if(view==="relationx-bundle")return uiText("捆绑仅改变连线路径，不合并边或修改权重");
  if(view==="relationx-bundle-linear")return uiText("层次关系展开排列；全部原始连线仍一一对应");
  if(view==="relationx-hive")return uiText("节点按原分组分轴；位置使用输入的 0–1 属性");
  if(view==="relationx-hive-parallel")return uiText("蜂巢轴展开为平行轴；关系与节点次序保持不变");
  if(view==="relationx-parallelsets")return uiText("带宽表示原始路径数量，不把类别当作连续数值");
  if(view==="relationx-parallelsets-radial")return uiText("同一批类别路径绕环展开；总量与各路径记录保留");
  if(view==="relationx-upset")return uiText("显示排他交集计数，不把包含交集误作排他交集");
  if(view==="relationx-intersections")return uiText("逐项保留集合组合和原始计数，包括零交集");
  if(view==="relationx-venn")return uiText("圆面积不编码数量；以各排他区域的原始计数为准");
  if(view==="mvx-parallel")return uiText("各维度保留原值和对应刻度；折线连接同一对象");
  if(view==="mvx-profile-matrix")return uiText("原始对象与维度展开为矩阵；各维度量纲保持不变");
  if(view==="mvx-radar")return uiText("雷达各轴共用声明尺度；轮廓面积不作总分");
  if(view==="mvx-radar-unfold")return uiText("同一批雷达观测展开为平行刻度；不重算数据");
  if(view==="mvx-ternary")return uiText("三成分位置由原始比例确定，总和约束保持不变");
  if(view==="mvx-composition")return uiText("三项成分逐一展开；原始比例和样本身份保留");
  if(view==="mvx-pca")return uiText("展示已输入的主成分得分；不在动画中重新拟合模型");
  if(view==="mvx-pca-components")return uiText("把同一得分点展开为 PC1、PC2 分量，保留正负号");
  if(view==="mvx-loadings")return uiText("箭头表示输入的相关载荷，不是样本得分");
  if(view==="mvx-loading-components")return uiText("变量载荷按两个主成分展开；保留相关系数正负");
  if(view==="mvx-scree")return uiText("单项解释率使用全部输入特征值为分母");
  if(view==="mvx-cumulative")return uiText("累计解释率沿声明的主成分次序累加，不覆盖原特征值");
  if(view==="mvx-andrews")return uiText("傅里叶曲线依赖变量固定顺序；曲线位置不是原始量纲");
  if(view==="mvx-coefficients")return uiText("显示构成曲线的原始系数；变量顺序保持不变");
  if(view==="mvx-radviz")return uiText("使用原生逐变量归一化与锚点；位置不等于原始数值");
  if(view==="mvx-normalized-profiles")return uiText("展开同一批归一化分量，原值仍完整保留在表格中");
  if(view==="engineering-smith")return uiText("原阻抗映射到反射系数平面；原始欧姆值不被覆盖");
  if(view==="engineering-impedance")return uiText("展开原始电阻与电抗；参考阻抗保持不变");
  if(view==="engineering-polar")return uiText("方位角北起顺时针，半径保留原始单位");
  if(view==="engineering-bearing-radius")return uiText("方位与半径展开为两轴，保留原始观测");
  if(view==="engineering-phasor")return uiText("相量保留同频约定、实部与虚部，不自动改变幅值定义");
  if(view==="engineering-phasor-chain")return uiText("仅平移同一组向量首尾相接；向量和不冒充原观测");
  if(view==="engineering-iq")return uiText("原始 I/Q 符号保留，不额外推断调制类型");
  if(view==="engineering-symbol-polar")return uiText("幅相来自原实部与虚部；零符号相位标为未定义");
  if(view==="engineering-polezero")return uiText("极点和零点身份保持不变；稳定性参考沿用原系统域");
  if(view==="engineering-root-polar")return uiText("同一组根展开为模和辐角；零根相位未定义");
  if(view==="engineering-hodograph")return uiText("风矢量位置表示 u/v，颜色表示测量高度");
  if(view==="engineering-height-speed")return uiText("从原 u/v 计算风速并按原高度排列；不插补层位");
  if(view==="engineering-windrose")return uiText("频率分母包含静风观测；方向缺失不被补成北风");
  if(view==="engineering-wind-sectors")return uiText("相同方向和速度区间展开；每条原观测仍可追踪");
  if(view==="engineering-campbell")return uiText("气泡面积对应幅值；转速、频率与模态来自原记录");
  if(view==="engineering-speed-amplitude")return uiText("转速与幅值展开比较；频率仍保留在原始表格中");

  if(view==='temporal-stream')return uiText("带厚表示原值，河流基线用于布局；不将纵坐标当作单个系列值");
  if(view==='temporal-horizon')return uiText("色带折叠保留正负方向和原值；未采集处保持断点");
  if(view==='temporal-lines')return uiText("各系列使用共同原值尺度；缺失记录不连接或补零");
  if(view==='temporal-season')return uiText("按输入季节顺序比较各周期；不把季节间距当作连续时间");
  if(view==='temporal-season-lines')return uiText("同一批季节观测展开为趋势；保留周期和季节归属");
  if(view==='temporal-rankclock')return uiText("半径仅表示竞争名次；并列保留，不补出下一期");
  if(view==='temporal-ranklines')return uiText("名次差不等于原值差；全部原始数值仍保留");
  if(view==='temporal-cohort')return uiText("颜色表示同期群当期比例；分母保留原始起始人数");
  if(view==='temporal-retention')return uiText("比例按各群固定起始人数计算；不同群体不合并");
  if(view==='regression-scale-location')return uiText("纵轴为标准化残差绝对值的平方根；不重新拟合原模型");
  if(view==='regression-fitted-residual')return uiText("保留外部拟合值与带正负号的标准化残差");
  if(view==='regression-leverage')return uiText("杠杆与残差来自同一模型；Cook 等值线不是删除规则");
  if(view==='regression-cook')return uiText("Cook 距离保留每个观测身份；参考线不代表自动剔除阈值");
  if(view==='regression-added')return uiText("比较控制同一批协变量后的残差对；条件关系不代表因果");
  if(view==='regression-adjusted-deviation')return uiText("展示偏回归平面的偏离；保留原始残差对");
  if(view==='regression-component')return uiText("部分残差等于原残差加已知线性成分；系数来自外部模型");
  if(view==='regression-ordinary')return uiText("显示外部完整模型残差；不把部分残差当作预测值");
  if(view==='regression-funnel')return uiText("研究效应对照标准误；漏斗形态不直接判定发表偏倚");
  if(view==='regression-study-standardized')return uiText("效应相对参考值按标准误缩放；参考带不是单项研究置信区间");

  if(view==='network-chord')return uiText("无向关系宽度表示权重；端点名称不表示方向");
  if(view==='network-arc')return uiText("弧宽表示关系权重；弧高仅用于布局");
  if(view==='network-force')return uiText("连线宽度表示权重，节点距离不代表数值差异");
  if(view==='flow-sankey')return uiText("流带宽度表示原始流量；中间节点遵守输入的流量守恒");
  if(view==='flow-chord')return uiText("箭头表示从来源到目标；保留每条有向边");
  if(view==='flow-cycle')return uiText("循环边和净流入保留；总边权不可当作去重总人数");
  if(view==='compare-qq')return uiText("比较两组分位数，不将两个独立样本按行配对");
  if(view==='compare-delta')return uiText("纵轴为两组同概率分位数之差；派生点不是新增样本");
  if(view==='compare-ecdf')return uiText("第二组 CDF 减第一组 CDF；并列值共同计入");
  if(view==='compare-rootogram')return uiText("根号尺度比较观测与预期计数；预期值来自输入");
  if(view==='compare-counts')return uiText("保留原始观测与预期计数，不从图形自动拟合模型");
  if(view==='compare-worm')return uiText("标准化残差减去理论正态分位数；不自动给出检验结论");
  if(view==='compare-residual-qq')return uiText("输入的标准化残差对照理论正态分位数");
  if(view==='compare-spreadlevel')return uiText("分组水平与离散度的对数关系；保留全部原始观测");
  if(view==='compare-group-intervals')return uiText("展示原始分组观测及分布区间；不是均值置信区间");

  if(view?.startsWith('target-'))return uiText('原值和目标保持不变；量程与区间只采用输入值');
  if(view?.startsWith('metric-'))return uiText('各指标使用自己的单位和刻度，不跨单位比较长短');
  if(view?.startsWith('paired-')&&['paired-combo','paired-lines','paired-difference'].includes(view))return uiText('同两条序列与真实时间间距；缺失处不连线或填充');
  if(view==='stat-qq')return uiText('横轴为拟合正态分位数，纵轴保留原值；不自动判定正态性');
  if(view==='stat-pp')return uiText('比较显式参考模型与右连续经验概率，不自动拟合参数');
  if(view==='stat-weibull')return uiText('完整正寿命的 Weibull 概率坐标；未进行参数拟合');
  if(view==='stat-meanexcess')return uiText('阈值以上平均超额为派生摘要，短线保留全部原样本');
  if(view==='stat-ttt')return uiText('累计总试验时间份额，不是风险率');
  if(view==='stat-lorenz')return uiText('等权样本和资源的累计份额；保留原值');
  if(view==='stat-ecdfband')return uiText('DKW 同时置信带依赖独立同分布假设，不是均值区间');
  if(view==='stat-survival')return uiText('Kaplan–Meier 持续比例；加号表示右删失');
  if(view==='stat-nelsonaalen')return uiText('累积风险 Σd/n 不是概率，也不是 −log(S)');
  if(view==='structural-bubbles')return uiText('圆面积表示非负原值；缺失与真实零分别标记');
  if(view==='structural-radial')return uiText('仅颜色表示原值；扇区面积不表示数量');
  if(view==='structural-association')return uiText('面积表示 |O−E|，带符号高度为 Pearson 残差；不输出显著性');
  if(view==='structural-mosaic')return uiText('矩形面积表示联合频数；行内高度表示条件占比');
  if(view==='structural-agreement')return uiText('对角方块与边际比较一致性，完整表保留非对角计数');
  if(view==='structural-pack')return uiText('仅叶圆面积表示叶值，父圆是包络');
  if(view==='structural-tree')return uiText('连线表示父子关系，角度与枝长仅用于布局');
  if(view==='structural-table')return uiText('父级是叶值汇总，父子合计不可重复相加');

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
  if(view==='eval-ks')return uiText('右连续 CDF 包含同分样本；D 为最大类别内累计比例差，不是准确率');
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
  return mode==='morph'&&progress>0&&progress<1&&/^(relationx|mvx|engineering|temporal|regression|network|flow|compare|stat|structural|target|metric|paired|eval|corr|hierarchy|sample|distribution|freq|matrix|ordered|spatial|series|process|multivariate)-/.test(view)?uiMessage`变形中，请在停稳后读数。${meaning}`:meaning;
}
