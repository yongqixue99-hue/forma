export const editorialCatalog=[
  {id:'barcode',no:'13',name:'刻时',en:'Ninety days, inscribed',type:'时间刻线图',category:'trend',featured:true,
    description:'一根细线对应一天，峰值落在端点，时间留下疏密。',use:'每日访问、销量、能耗与高频节律',avoid:'以等距类别假装连续日期；把缺失数据画成零',motion:'日期扫描 / 刻线伸展 / 峰值标注',duration:8,
    fields:[['date','YYYY-MM-DD','有效日期；按真实日期间隔定位'],['value','number | null','非负数值；null 保留缺失']],keywords:'刻线 日 波动 密度 时间 barcode daily',limit:'14–180 条记录，跨度不超过 180 天'},
  {id:'fan',no:'14',name:'芒序',en:'A measure of progress',type:'径向进度图',category:'comparison',
    description:'在同一组百分比刻度上，比较每个目标走到了哪里。',use:'多个项目的完成率、进度与目标达成',avoid:'比较不同目标的绝对规模；没有明确分母的比例',motion:'扇面展开 / 进度沿射线推进',duration:8,
    fields:[['label','string','项目名称'],['value','number','已完成的非负数量'],['target','number','大于 0 的目标量']],keywords:'扇面 进度 目标 完成 fan progress',limit:'6–16 项；已完成数量不能超过目标'},
  {id:'unit',no:'15',name:'点列',en:'One mark, one unit',type:'单位堆叠图',category:'comparison',dark:true,
    description:'不用面积猜数量，每一颗点都能被数出来。',use:'小规模计数、问题类型、项目产出与事件数量',avoid:'小数；超过 50 个单位的大数量；用抽样点冒充全部',motion:'由低到高堆叠 / 逐列接力',duration:8,
    fields:[['label','string','类别名称'],['value','number','0–50 的整数；一个点就是一个单位']],keywords:'点列 单位 计数 排序 dot unit count',limit:'4–12 类，每类 0–50 个单位'},
  {id:'matrix',no:'16',name:'经纬',en:'Across the matrix',type:'气泡矩阵图',category:'distribution',
    description:'把交叉关系放在经纬之间，用圆面积表达交集的分量。',use:'渠道与内容、产品与地区、多维交叉规模',avoid:'半径直接代表数值；省略格子导致零值与缺失混淆',motion:'逐行落点 / 圆面积生长',duration:8,
    fields:[['row','string','行类别'],['column','string','列类别'],['value','number','非负面积权重']],keywords:'矩阵 交叉 气泡 matrix cross',limit:'3–8 行 × 3–10 列，必须提供完整矩阵'},
  {id:'swarm',no:'17',name:'蜂群',en:'Every observation',type:'蜂群分布图',category:'distribution',
    description:'每个样本占据自己的位置，密集处自然聚拢。',use:'原始样本、群体差异、评分和耗时分布',avoid:'把垂直位移当成第二个数值；仅提供均值或汇总',motion:'沿横轴落位 / 样本依次出现',duration:8,
    fields:[['label','string','样本唯一名称'],['group','string','所属群体'],['value','number','原始观测值']],keywords:'蜂群 原始 样本 分布 beeswarm swarm',limit:'2–4 组，每组 8–40 个样本'},
  {id:'interval',no:'18',name:'区间',en:'Leave room for uncertainty',type:'区间估计图',category:'comparison',
    description:'点给出估计，细线保留不确定性。',use:'置信区间、预测范围、测量误差与估计比较',avoid:'缺少区间定义；把不同置信水平的区间直接比较',motion:'估计落点 / 区间向两端展开',duration:8,
    fields:[['label','string','估计对象'],['estimate','number','点估计'],['low','number','区间下界'],['high','number','区间上界']],keywords:'区间 置信 误差 不确定 confidence interval error',limit:'3–10 项；low ≤ estimate ≤ high；需填写 intervalLabel'},
  {id:'diverging',no:'19',name:'正负',en:'Either side of zero',type:'发散条形图',category:'comparison',
    description:'以零为中心，让增加和减少共享同一把尺。',use:'净变化、偏离基准、正负贡献与盈亏拆解',avoid:'两侧使用不同刻度；只有比例却没有基准',motion:'从零向两侧生长 / 端点注数',duration:8,
    fields:[['label','string','比较项目'],['value','number','相对于零基准的有符号数值']],keywords:'正负 发散 增减 差额 diverging signed',limit:'4–10 项，共用对称线性刻度'},
  {id:'stacked',no:'20',name:'织带',en:'The balance within',type:'百分比堆叠条形图',category:'composition',
    description:'相同的总长度，容纳不同的内部结构。',use:'多个群体的结构比较、调查结果、渠道占比',avoid:'各行不合计 100%；混用不同类别顺序',motion:'依次织入 / 分段比例展开',duration:8,
    fields:[['label','string','比较对象'],['series','string','组成类别'],['value','number','非负百分比']],keywords:'堆叠 百分比 结构 比例 stacked percent',limit:'3–8 个对象，2–5 类；每行合计 100%'},
  {id:'stream',no:'21',name:'叠流',en:'The sum of its currents',type:'堆叠面积图',category:'trend',
    description:'每一层都有来处，每个时期的总量都能读出。',use:'总规模和内部结构随时间共同变化',avoid:'负值；不完整序列；需要精确比较中间层的高度',motion:'沿时间展开 / 层次逐步显影',duration:8,
    fields:[['period','string','按时间排序的等间隔时期'],['series','string','组成类别'],['value','number','非负数值']],keywords:'堆叠 面积 总量 趋势 stream area',limit:'6–36 个时期，2–5 个完整序列'},
  {id:'boxplot',no:'22',name:'分位',en:'Inside the distribution',type:'箱须图',category:'distribution',
    description:'把四分位、典型范围与离群观测放在同一个画面。',use:'样本分布比较、耗时、评分、观测离散程度',avoid:'只提供均值；把须线误读成最小值与最大值',motion:'中位数建立 / 箱体和须线展开',duration:8,
    fields:[['group','string','分组名称'],['value','number','原始观测值']],keywords:'箱线 箱须 四分位 分布 boxplot quartile',limit:'2–6 组，每组 8–160 个原始样本'},
  {id:'arc',no:'23',name:'弧网',en:'Connections in a line',type:'弧线关系图',category:'flow',dark:true,
    description:'在一条基线上安放节点，弧线把远近关系连起来。',use:'章节引用、协作关系、共同出现与连接权重',avoid:'有方向的流量；把弧长当成关系强度',motion:'节点落位 / 弧线逐条勾勒',duration:8,
    fields:[['source','string','关系的一端'],['target','string','关系的另一端'],['value','number','大于 0 的无向关系权重']],keywords:'弧线 网络 连接 关系 arc network',limit:'4–12 个节点，3–40 对无向关系'},
  {id:'parallel',no:'24',name:'折径',en:'Profiles, side by side',type:'平行坐标图',category:'comparison',
    description:'每条折径是一份轮廓，看对象如何穿过同一组维度。',use:'多维评分、同单位性能指标、对象画像比较',avoid:'不同量纲共用一把尺；缺少某个对象的维度值',motion:'沿维度追踪 / 交点显影',duration:8,
    fields:[['label','string','对象名称'],['dimension','string','同量纲比较维度'],['value','number','数值']],keywords:'平行 坐标 画像 维度 parallel profile',limit:'3–6 个对象 × 3–6 个维度；共用同一单位与刻度'}
].map(t=>({...t,edition:2}));

let seed=204826;
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const normal=(m,s)=>m+Math.sqrt(-2*Math.log(Math.max(rnd(),.00001)))*Math.cos(2*Math.PI*rnd())*s;
const round=x=>Math.round(x*10)/10;
const barcode=Array.from({length:90},(_,i)=>({date:new Date(Date.UTC(2025,3,1+i)).toISOString().slice(0,10),value:Math.round(55+26*Math.sin(i*.11-.8)+14*Math.cos(i*.32)+rnd()*19+(i>57?27:0))}));
const fan=['长文','研究','影像','播客','访谈','工具','策展','社群','实验','译介','通讯','笔记'].map((label,i)=>({label,value:[86,74,92,58,67,43,81,62,37,76,54,95][i],target:100}));
const unit=['通讯','访谈','影像','研究','策展','播客','工具','长文','笔记'].map((label,i)=>({label,value:[5,8,11,14,17,22,26,31,38][i]}));
const matrix=['长文','教程','访谈','播客','影像','工具'].flatMap((row,i)=>['搜索','推荐','订阅','社群','直接','分享','外链'].map((column,j)=>({row,column,value:Math.round(3+rnd()*28+((i+j)%4===0?33:0))})));
const swarm=['初次阅读','每周回访','长期订阅'].flatMap((group,i)=>Array.from({length:30},(_,j)=>({label:`${group} ${j+1}`,group,value:round(Math.max(1,normal(24+i*18,10-i)))})));
const interval=['知识长文','实用教程','人物访谈','行业观察','影像记录','播客节目'].map((label,i)=>({label,estimate:[63,72,57,68,52,78][i],low:[54,66,46,59,38,71][i],high:[71,79,68,76,64,85][i]}));
const diverging=[['搜索',34],['订阅',27],['分享',18],['社群',9],['跳出',-13],['流失',-21],['下架',-8]].map(([label,value])=>({label,value}));
const stacked=['初次接触','偶尔阅读','每周回访','长期订阅'].flatMap((label,i)=>['深读','收藏','浏览','分享'].map((series,j)=>({label,series,value:[[19,16,51,14],[28,22,34,16],[36,28,17,19],[48,23,8,21]][i][j]})));
const stream=Array.from({length:18},(_,i)=>['自然搜索','订阅阅读','社群分享','其他来源'].map((series,j)=>({period:`${2024+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,series,value:Math.round(12+j*4+i*(2.4-j*.5)+Math.sin(i*.6+j)*6+rnd()*3)}))).flat();
const boxplot=['长文','教程','访谈','影像','播客'].flatMap((group,i)=>Array.from({length:40},(_,j)=>({group,value:round(Math.max(1,normal(18+i*9,5+i*2)+(j===39?29:0)))})));
const arc=[['观察','研究',26],['观察','策划',18],['观察','传播',9],['研究','策划',30],['研究','撰稿',22],['策划','设计',24],['策划','剪辑',12],['撰稿','设计',32],['撰稿','传播',17],['设计','剪辑',29],['剪辑','传播',34],['设计','归档',14],['传播','归档',27]].map(([source,target,value])=>({source,target,value}));
const parallel=['长文','教程','访谈','播客','影像'].flatMap((label,i)=>['信息密度','易读程度','记忆程度','转发意愿','完整阅读'].map((dimension,j)=>({label,dimension,value:[[87,62,81,73,68],[72,90,74,88,84],[78,73,91,67,77],[62,84,83,54,89],[67,87,76,92,62]][i][j]})));
export const editorialContents={
  barcode:{title:'九十天，一笔一笔记下来',subtitle:'每日访问量 · 2025 年 4—6 月 · 细线长度 = 当日数值',unit:'千次',data:barcode},
  fan:{title:'十二个目标，各自向前',subtitle:'射线进度 = 已完成 ÷ 目标；外圈为 100%',unit:'项',data:fan},
  unit:{title:'产出，可以一颗一颗地数',subtitle:'九类内容的季度发布数 · 一点 = 一篇',unit:'篇',data:unit},
  matrix:{title:'内容与渠道，交叉处见分量',subtitle:'六类内容 × 七个渠道 · 圆面积代表阅读量',unit:'千次',data:matrix},
  swarm:{title:'每位读者，都留下一个点',subtitle:'三组原始阅读时长 · 纵向错开仅用于避免重叠',unit:'分钟',data:swarm},
  interval:{title:'估计之外，留出不确定性',subtitle:'点为完成率估计 · 横线为模拟估计区间，不代表真实统计推断',intervalLabel:'模拟估计区间',unit:'%',data:interval},
  diverging:{title:'从零出发，看见正负贡献',subtitle:'阅读规模相对上期的净变化',unit:'千次',data:diverging},
  stacked:{title:'相同的一百份，不同的选择',subtitle:'四类读者的行为结构 · 每行合计 100%',unit:'%',data:stacked},
  stream:{title:'不同的来路，汇成总量',subtitle:'四个渠道的月度阅读量 · 2024 年 1 月—2025 年 6 月',unit:'千次',data:stream},
  boxplot:{title:'典型值之外，还有多少差异',subtitle:'原始制作时长 · 须线取 1.5 × IQR 范围内的观测值',unit:'小时',data:boxplot},
  arc:{title:'一件作品，经过多少次协作',subtitle:'八个创作环节的无向协作关系 · 线宽代表权重',unit:'次',data:arc},
  parallel:{title:'一条折径，一种内容轮廓',subtitle:'五类内容的同量纲评分 · 全部维度共用同一刻度',unit:'分',data:parallel}
};
