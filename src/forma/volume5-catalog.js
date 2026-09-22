const field=(key,type,label)=>[key,type,label];
export const volume5Catalog=[
  {id:'groupedbar',no:'41',name:'分组柱状图',en:'Grouped bars',type:'分组柱状图',category:'comparison',
    description:'每组并排显示多个系列，所有柱形共用零基线。',use:'渠道比较、多个产品的分类指标、同期系列对照',avoid:'各系列单位不同；类别过多导致柱形难以分辨',motion:'坐标显现 / 分组错峰生长 / 数值落定',fields:[field('label','string','类别'),field('series','string','系列'),field('value','number','同一单位的数值')],keywords:'分组 柱形 柱状 对比 grouped bar column',limit:'3–8 类 × 2–4 个完整系列；可包含负值'},
  {id:'ribbon',no:'42',name:'区间带折线图',en:'Interval band',type:'区间带折线图',category:'trend',
    description:'折线显示估计值，带状区域显示上下界；缺失日期保留断点。',use:'带不确定性的时间趋势、预测区间、观测范围',avoid:'未注明区间含义；把范围当成置信度；把缺失补为零',motion:'时间轴建立 / 区间与折线同步展开 / 末值显现',fields:[field('period','YYYY-MM-DD','观测日期'),field('estimate','number | null','估计值'),field('low','number | null','下界'),field('high','number | null','上界')],keywords:'区间 带状 不确定性 预测 趋势 ribbon confidence band',limit:'6–48 个不重复日期；low ≤ estimate ≤ high；必须注明 intervalLabel'},
  {id:'heatmap',no:'43',name:'数值热力图',en:'Value heatmap',type:'数值热力图',category:'distribution',
    description:'每一格对应一对分类，色阶对应数值，缺失格以斜线区分。',use:'时段强度、交叉指标、不同分类间的数值模式',avoid:'用不同色阶比较同一矩阵；把缺失和零混为一谈',motion:'矩阵建立 / 色格分行显现 / 标注落定',fields:[field('row','string','行类别'),field('column','string','列类别'),field('value','number | null','观测数值，null为缺失')],keywords:'热力 矩阵 强度 heatmap matrix',limit:'3–8 行 × 3–10 列的完整矩阵；缺失明确写 null'},
  {id:'pyramid',no:'44',name:'双向条形图',en:'Mirrored bars',type:'双向条形图',category:'comparison',
    description:'两组数值从共同中心向左右展开，使用相同的长度刻度。',use:'两类人群构成、年龄结构、对称分类比较',avoid:'两边刻度不同；把左侧误读为负值',motion:'中轴建立 / 两侧同时伸展 / 数值显现',fields:[field('label','string','分层类别'),field('left','number','左侧非负数值'),field('right','number','右侧非负数值')],keywords:'人口 金字塔 双向 对称 pyramid population mirrored',limit:'4–10 类；两侧非负；必须提供 sideLabels 两个组名'},
  {id:'rose',no:'45',name:'玫瑰图',en:'Polar area',type:'等角度玫瑰图',category:'composition',
    description:'扇区角度相同，面积按数值缩放，并给出数值对应的圆形刻度。',use:'周期分段强度、少量类别的量级比较',avoid:'用半径直接代表数值；依赖扇区角度比较占比',motion:'径向刻度建立 / 扇区按面积生长 / 数值显现',fields:[field('label','string','类别'),field('value','number','非负数值')],keywords:'玫瑰 极坐标 面积 rose polar area',limit:'4–12 类，至少一个正值；以面积编码数值'},
  {id:'icicle',no:'46',name:'冰柱图',en:'Icicle hierarchy',type:'两级层级冰柱图',category:'composition',
    description:'父分类横向划分总量，子分类在同一宽度内继续细分。',use:'层级预算、类别投入、总量到细目的拆分',avoid:'把重复层级相加成总量；混合不同统计单位',motion:'总量建立 / 父分类展开 / 子分类分解',fields:[field('parent','string','一级分类'),field('label','string','子分类'),field('value','number','子分类正数值')],keywords:'层级 树 分解 矩形 icicle hierarchy',limit:'2–6 个父分类，每类 2–6 个子项，总计 6–24 个子项'},
  {id:'radar',no:'47',name:'雷达图',en:'Radar profiles',type:'多系列雷达图',category:'comparison',
    description:'各维度共用同一个上限和单位，逐轴比较每个系列。',use:'同尺度多维评分、能力指标、产品特征对照',avoid:'量纲不同；通过多边形面积计算综合分',motion:'维度框架建立 / 顶点落位 / 轮廓连接',fields:[field('series','string','系列'),field('axis','string','维度'),field('value','number','0至max之间的数值')],keywords:'雷达 多维 评分 radar profile',limit:'2–4 个系列 × 4–8 个完整维度；必须提供正数 max'},
  {id:'trajectory',no:'48',name:'轨迹散点图',en:'Connected scatter',type:'时间轨迹散点图',category:'distribution',dark:true,
    description:'用位置表示两个指标，连接线按日期顺序追踪同一对象。',use:'效率变化、两项指标的共同演变、阶段路径分析',avoid:'把连线理解为回归关系；混入多个对象却不区分',motion:'坐标建立 / 路径按时间延伸 / 观测节点显现',fields:[field('period','YYYY-MM-DD','观测日期'),field('x','number','横轴观测值'),field('y','number','纵轴观测值')],keywords:'轨迹 散点 时间 双变量 connected scatter trajectory',limit:'6–30 个不重复日期；必须写明 axes.x、axes.y及其单位'}
].map(t=>({...t,edition:5,duration:8}));
const date=i=>new Date(Date.UTC(2025,0,1+i*7)).toISOString().slice(0,10);
const r=v=>Math.round(v*10)/10;
export const volume5Contents={
  groupedbar:{title:'各渠道内容阅读量',subtitle:'三个内容系列 · 按渠道分组',unit:'千次',data:['搜索','推荐','订阅','分享','直接'].flatMap((label,i)=>['长文','教程','访谈'].map((series,j)=>({label,series,value:[[86,69,44],[65,78,51],[74,48,63],[41,58,33],[37,29,46]][i][j]})))},
  ribbon:{title:'每周阅读量及估计区间',subtitle:'2025 年 1—4 月 · 模拟估计',intervalLabel:'模拟上下界，非置信区间',unit:'千次',data:Array.from({length:16},(_,i)=>{const estimate=r(42+i*3.1+Math.sin(i*.6)*8);return {period:date(i),estimate,low:r(estimate-9-i*.55),high:r(estimate+11+i*.7)};})},
  heatmap:{title:'每周各时段访问强度',subtitle:'七天 × 六个时段 · 斜线格表示缺失',unit:'千次',data:['周一','周二','周三','周四','周五','周六','周日'].flatMap((row,i)=>['06–09','09–12','12–15','15–18','18–21','21–24'].map((column,j)=>({row,column,value:i===3&&j===2?null:Math.round(15+(Math.sin(i*.6+j*.9)+1)*24+(j===4?26:0)+(i>4?12:0))})))},
  pyramid:{title:'新读者与回访读者年龄分布',subtitle:'两侧使用相同数量刻度',unit:'人',sideLabels:['新读者','回访读者'],data:['18–24','25–29','30–34','35–39','40–44','45–49','50–59','60+'].map((label,i)=>({label,left:[620,850,1040,920,710,550,370,190][i],right:[430,610,840,970,860,670,450,270][i]}))},
  rose:{title:'各时段阅读量',subtitle:'扇区等角度 · 面积与阅读量成正比',unit:'千次',data:['00–03','03–06','06–09','09–12','12–15','15–18','18–21','21–24'].map((label,i)=>({label,value:[26,14,48,73,66,83,112,91][i]}))},
  icicle:{title:'内容项目工时分配',subtitle:'父分类宽度等于子项总和',unit:'小时',data:[['研究','资料',24],['研究','访谈',18],['研究','核查',12],['制作','撰稿',22],['制作','视觉',16],['制作','剪辑',14],['发布','排版',8],['发布','分发',6],['发布','归档',5]].map(([parent,label,value])=>({parent,label,value}))},
  radar:{title:'三类内容多维评分',subtitle:'各维度满分 100 · 逐轴比较',unit:'分',max:100,data:['长文','教程','访谈'].flatMap((series,i)=>['清晰度','完整度','信息量','易读性','记忆度','可操作'].map((axis,j)=>({series,axis,value:[[84,91,87,64,75,62],[92,76,72,86,67,93],[79,83,81,74,88,57]][i][j]})))},
  trajectory:{title:'阅读时长与完成率变化',subtitle:'同一内容系列 · 观测按日期连接',unit:'观测值',axes:{x:'平均阅读时长 / 分钟',y:'完成阅读率 / %'},data:Array.from({length:14},(_,i)=>({period:date(i),x:r(4+i*.43+Math.sin(i*.6)*1.4),y:r(45+i*2.9+Math.sin(i*.46)*10)}))}
};
