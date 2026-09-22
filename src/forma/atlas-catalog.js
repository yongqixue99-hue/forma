export const atlasCatalog = [
  {id:'histogram',no:'25',name:'频谱',en:'How often, how far',type:'等宽直方图',category:'distribution',
    description:'把原始观测放进等宽区间，读出分布的轮廓与尾部。',use:'耗时、得分、尺寸等连续变量的频数分布',avoid:'把类别计数伪装成连续区间；使用不等宽区间却只比较高度',motion:'区间建立 / 频数生长 / 原始观测显影',duration:8,
    fields:[['label','string','唯一观测编号'],['value','number','原始连续观测值']],keywords:'直方 频数 分箱 分布 histogram bin',limit:'24–600 个原始观测；binCount 为 6–24，默认 12'},
  {id:'ecdf',no:'26',name:'累阶',en:'At or below this point',type:'经验累积分布图',category:'distribution',
    description:'每一级台阶，都是不超过这个数值的样本比例。',use:'分位数、等待时间、阈值覆盖率、分布尾部',avoid:'把累计概率读成当前区间的频率；对台阶做曲线平滑',motion:'样本沿数轴落位 / 累计台阶逐级前进',duration:8,
    fields:[['label','string','唯一观测编号'],['value','number','原始连续观测值']],keywords:'累计 经验 分布 分位 阈值 ECDF cumulative',limit:'16–300 个原始观测；重复数值合并为同一次跳跃'},
  {id:'cohort',no:'27',name:'留序',en:'Who returns, month by month',type:'同期群留存矩阵',category:'trend',
    description:'把加入时间对齐，看同一批人如何在后续月份回来。',use:'月度留存、同期群回访、订阅群体对比',avoid:'把尚未发生的月份填成零；每期更换分母',motion:'同期群逐行展开 / 已观察月份显影',duration:8,
    fields:[['cohort','YYYY-MM','加入月份，连续且从早到晚'],['age','number','加入后月数，从 0 连续递增'],['active','number','当月活跃人数，非负整数'],['size','number','该同期群初始人数，正整数且保持一致']],keywords:'留存 同期群 用户 回访 cohort retention',limit:'2–8 个连续月度同期群；3–12 个观察月；unit 必须为 %'},
  {id:'bullet',no:'28',name:'准绳',en:'Performance in context',type:'子弹目标图',category:'comparison',
    description:'把实际值、目标线和定性区间放在同一把尺上。',use:'目标跟踪、服务质量、带明确评估区间的指标',avoid:'隐藏区间定义；各行使用不同量纲；把人工阈值当成统计结论',motion:'评估区间显影 / 实际值推进 / 目标线落位',duration:8,
    fields:[['label','string','指标名称'],['value','number','非负实际值'],['target','number','目标值，大于 0'],['low','number','第一段上界，大于 0'],['mid','number','第二段上界，大于 low'],['high','number','第三段上界，大于 mid']],keywords:'子弹 目标 阈值 指标 bullet target KPI',limit:'3–8 项；value、target 不超过 high；需提供三个 bandLabels'},
  {id:'funnel',no:'29',name:'递进',en:'What makes it through',type:'线性转化漏斗',category:'flow',
    description:'每一步的长度都从零量起，损耗与转化可以直接核对。',use:'注册、阅读、报名与处理流程的逐步转化',avoid:'用梯形面积暗示人数；混合不同人群或时间窗口',motion:'流程逐步展开 / 条形沿共同刻度生长',duration:8,
    fields:[['step','number','从 1 起连续递增的步骤'],['label','string','步骤名称'],['value','number','该步骤剩余数量，非负整数']],keywords:'漏斗 转化 损耗 步骤 funnel conversion',limit:'4–8 步；首步大于 0，后续数量不得增加'},
  {id:'sunburst',no:'30',name:'环枝',en:'A whole, with branches',type:'两级层级旭日图',category:'composition',featured:true,
    description:'内环容纳一级分类，外环继续拆开，角度始终对应同一个总量。',use:'预算结构、内容分类、两级目录与资源分配',avoid:'把外环更大的面积当成更多数量；提供无法核对的父子汇总',motion:'内环建立 / 叶节点展开 / 层级注释显影',duration:8,
    fields:[['parent','string','一级分类名称'],['label','string','该分类下的子项名称'],['value','number','大于 0 的叶节点数量；父项自动求和']],keywords:'层级 旭日 分类 目录 sunburst hierarchy',limit:'2–5 个一级分类，每类 2–6 个子项；总计 6–24 个叶节点'},
  {id:'gantt',no:'31',name:'时段',en:'Work unfolds in time',type:'甘特区间排程',category:'trend',
    description:'在真实日历上标出开始、结束与完成进度。',use:'制作计划、项目排程、活动阶段与任务重叠',avoid:'把日期间隔压缩成等距类别；把完成进度理解为已过时间',motion:'日历建立 / 时间区间铺开 / 完成进度推进',duration:8,
    fields:[['label','string','唯一任务名称'],['start','YYYY-MM-DD','开始日期，包含当日'],['end','YYYY-MM-DD','结束日期，不含当日；必须晚于 start'],['progress','number','实际完成百分比，0–100']],keywords:'甘特 排程 计划 区间 项目 gantt schedule timeline',limit:'4–10 项，按开始日期排序；总跨度不超过 366 天'},
  {id:'ledger',no:'32',name:'列传',en:'Numbers, with a memory',type:'迷你趋势数据表',category:'comparison',dark:true,
    description:'整齐的数字保留精度，细小的折线补足每一行的时间上下文。',use:'多个指标的最新值、期初变化与同口径趋势对照',avoid:'迷你图分别缩放却暗示同一量级；混用不一致的日期与单位',motion:'行与分隔线递次落位 / 迷你趋势逐笔展开',duration:8,
    fields:[['label','string','指标名称'],['period','YYYY-MM','连续月份，每个指标都必须完整'],['value','number','非负数值；所有指标同一单位']],keywords:'数据表 表格 迷你 趋势 排行 ledger table sparkline',limit:'3–8 个指标 × 4–24 个连续月份；所有迷你图共用纵轴'}
].map(template => ({...template, edition:3}));

let seed = 20260908;
const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
const normal = () => Math.sqrt(-2*Math.log(Math.max(random(),.00001)))*Math.cos(2*Math.PI*random());
const observations = Array.from({length:180},(_,i)=>({label:`观测 ${String(i+1).padStart(3,'0')}`,value:Math.round(Math.max(4,Math.exp(3.08+normal()*.39))*10)/10}));
const cohort = Array.from({length:6},(_,i)=>Array.from({length:8-i},(_,age)=>{
  const size = [480,520,560,610,630,690][i];
  const rate = age===0 ? 1 : .66-.048*age+.014*i+Math.sin(age+i)*.012;
  return {cohort:`2025-${String(i+1).padStart(2,'0')}`,age,active:Math.round(size*rate),size};
})).flat();
const bullet = ['研究深度','资料完成','审校覆盖','内容交付','档案整理'].map((label,i)=>({label,value:[82,68,94,76,57][i],target:[85,80,90,90,75][i],low:45,mid:75,high:100}));
const funnel = ['看见内容','打开详情','阅读过半','完整阅读','加入收藏','继续订阅'].map((label,i)=>({step:i+1,label,value:[12000,8640,6480,4536,2812,1856][i]}));
const sunburst = [
  ['观察','田野',16],['观察','访谈',12],['观察','问卷',8],
  ['研究','资料',14],['研究','考据',10],['研究','分析',9],
  ['表达','写作',11],['表达','视觉',8],['表达','声音',5],
  ['归档','索引',4],['归档','整理',3]
].map(([parent,label,value])=>({parent,label,value}));
const gantt = [
  ['议题发现','2025-06-02','2025-06-12',100],['背景研究','2025-06-05','2025-06-23',100],
  ['访谈采集','2025-06-10','2025-06-29',86],['结构起稿','2025-06-19','2025-07-09',62],
  ['视觉制作','2025-06-26','2025-07-14',38],['事实审校','2025-07-03','2025-07-17',15],
  ['整理发布','2025-07-14','2025-07-22',0]
].map(([label,start,end,progress])=>({label,start,end,progress}));
const ledger = ['长篇阅读','实用教程','人物访谈','影像记录','研究笔记','声音节目'].flatMap((label,i)=>Array.from({length:12},(_,j)=>({label,period:`2025-${String(j+1).padStart(2,'0')}`,value:Math.round(31+i*7+j*(5.8-i*.9)+Math.sin(j*.71+i)*8+random()*4)})));

export const atlasContents = {
  histogram:{title:'一次阅读，会停留多久',subtitle:'180 个原始观测 · 12 个等宽区间 · 柱高为区间内样本数',unit:'分钟',binCount:12,data:observations},
  ecdf:{title:'多少次阅读，不超过这个时长',subtitle:'同一组 180 个原始观测 · 台阶高度 = 累计样本占比',unit:'分钟',data:observations.map(row=>({...row}))},
  cohort:{title:'留下来的人，按加入月份重看',subtitle:'分母固定为该月初始人数 · 未发生的月份留空，不计为零',unit:'%',data:cohort},
  bullet:{title:'一条目标线，还需要一把准绳',subtitle:'五项完成评分 · 背景区间为演示设定的评估阈值',unit:'分',bandLabels:['待提升','稳健','充分'],data:bullet},
  funnel:{title:'从看见，到愿意继续',subtitle:'同一批读者的六步流程 · 条长代表人数 · 注释为相邻步骤转化率',unit:'人',data:funnel},
  sunburst:{title:'一百份投入，层层展开',subtitle:'两级内容制作投入 · 每个扇区的角度代表其占总量的比例',unit:'小时',data:sunburst},
  gantt:{title:'一件作品，慢慢成为完整的样子',subtitle:'创作排程 · 结束日不含当日 · 填充比例为实际完成进度',unit:'天',data:gantt},
  ledger:{title:'数字有当下，也有来路',subtitle:'六类内容的月度阅读量 · 迷你折线共用纵轴 · 变化相对于期初',unit:'千次',data:ledger}
};
