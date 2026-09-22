const f=(key,type,label)=>[key,type,label], value=f('value','number','观测值'), label=f('label','string','对象名称'), group=f('group','string','分组');
const xy=[f('x','number','横坐标'),f('y','number','纵坐标')], edge=[f('source','string','起点'),f('target','string','终点'),value];
const series=[f('period','string','时期'),f('series','string','序列'),value];
const specs=[
  ['pie','饼图','Pie chart','composition',[label,value],'扇区角度表示占整体的份额。','类别占比、预算分配','类别过多或包含负数','扇区依次展开 / 份额显现','饼状 占比 pie','3–10 个唯一类别；非负且总量大于零'],
  ['polarline','极坐标折线图','Polar line','trend',[f('period','string','等间隔周期'),value],'半径从零量起，连接一个完整周期。','日内节律、周期观测','非周期数据；不等间隔时间','径向坐标建立 / 周期描线','极坐标 折线 周期 polar','8–24 个唯一周期；非负且总量大于零'],
  ['stackedcolumn','堆叠柱状图','Stacked columns','composition',series,'柱高表示总量，每一层表示分类数量。','分期构成、分类总量','负值；需要精确比较中间层','柱体逐期升起 / 分类分层','堆叠 柱状 stacked column','4–12 个时期，2–5 个完整序列；非负'],
  ['streamgraph','河流图','Streamgraph','trend',series,'流带厚度表示数量，整体沿中心线铺开。','多来源随时间的数量变化','把边界高度当成绝对值','流带延展 / 边界显现','河流 流带 面积 streamgraph','6–36 个有效日期，2–5 个完整序列；非负'],
  ['horizon','地平线图','Horizon chart','trend',[...series.slice(0,2),f('value','number | null','带符号的变化量')],'共同阈值把正负变化折叠为三层色带。','多个序列的偏差、变化监测','把折叠后的高度当成原值','色带逐层折叠 / 时间展开','地平线 色带 horizon','8–60 个有效日期，2–5 个完整序列；缺失填 null'],
  ['cycleplot','季节子序列图','Seasonal subseries','trend',[f('cycle','string','周期，如年份'),f('season','string','季节，如季度'),f('value','number | null','观测值')],'在每个季节内比较不同周期，共用数值尺度。','年度季节性、季度表现','不等长周期；顺序不明确','分面依次展开 / 均线显现','季节 周期 分面 cycle seasonal','3–8 个周期，4–12 个季节；完整组合，缺失填 null'],
  ['eventline','事件时间线','Event timeline','trend',[f('date','YYYY-MM-DD','日期'),group,label],'圆点按实际日期落位，分组展示事件。','发布日程、版本节点、项目记录','用点的大小暗示事件重要性','时间推进 / 节点显现','事件 时间线 timeline','6–18 个事件，2–3 组，每组最多 6 个'],
  ['network','网络关系图','Network graph','flow',edge,'线宽表示关系权重，节点位置由连接布局决定。','协作网络、共现关系','把布局距离当成实测距离','连接描线 / 节点落位','网络 力导向 network graph','6–24 个节点，5–50 条正权重无向边；无自环或重复'],
  ['directedchord','有向弦图','Directed chord','flow',edge,'带箭头的流带分别呈现两个方向的流量。','双向流动、类别转移','把往返方向合并；负流量','圆弧展开 / 箭头流带显现','有向 弦 流向 directed chord','3–8 个节点，最多 40 条正流量有向边；无自环'],
  ['parallelsets','平行集合图','Parallel sets','flow',[f('a','string','第一分类'),f('b','string','第二分类'),f('c','string','第三分类'),value],'每条流带保留三个分类的完整组合，带宽对应数量。','多分类交叉、路径构成','只有两两汇总，缺少完整组合','三轴建立 / 流带贯穿','平行 集合 分类 parallel sets','每轴 2–6 类，最多 36 个唯一组合；axes.a/b/c 注明分类'],
  ['edgebundle','层级边捆图','Hierarchical edge bundling','flow',[f('sourceGroup','string','起点分组'),f('source','string','起点'),f('targetGroup','string','终点分组'),f('target','string','终点'),value],'节点按层级排列，关系线沿共同分支汇束。','跨部门联系、分类间共现','把弯曲路径当成距离或数量','分组展开 / 关系束描线','层级 边捆 关系 bundle radial','2–5 组，8–32 个节点，10–50 条唯一无向边'],
  ['raincloud','雨云图','Raincloud plot','distribution',[group,value],'共同尺度展示密度轮廓、四分位和原始样本。','多组样本比较、分布偏态','只有汇总值；样本不足','密度展开 / 箱体显现 / 样本落位','雨云 密度 箱线 raincloud','2–4 组，每组 12–80 个原始样本'],
  ['qqplot','正态 Q-Q 图','Normal Q–Q plot','distribution',[label,value],'比较排序观测与拟合正态分布的对应分位数。','分布形态、尾部和偏态检查','仅凭图形给出显著性结论','分位坐标建立 / 观测显现','正态 分位 qq probability','12–240 个唯一样本，方差大于零'],
  ['survival','持续率曲线','Duration survival','trend',[label,group,f('duration','number','持续时长'),f('status','ended | censored','ended 为已结束；censored 为观测截止')],'按观测结束事件估计仍在持续的比例，保留右删失。','会话持续时长、设备运行时长','把观测截止当成已结束','阶梯展开 / 截止观测标记','持续率 阶梯 Kaplan Meier survival','2–4 组，每组 6–40 条；非负时长，明确结束状态'],
  ['vectorfield','矢量场图','Vector field','distribution',[...xy,f('u','number','水平分量'),f('v','number','竖直分量')],'等比例坐标上的箭头表示方向与矢量大小。','流速采样、位移场、方向分布','两个空间坐标使用不同量纲','网格建立 / 矢量延伸','矢量 向量 方向 vector quiver','16–100 个唯一坐标；axes.x/y 注明相同空间单位'],
  ['voronoi','泰森多边形图','Voronoi diagram','distribution',[label,group,...xy],'每个区域包含距离对应站点最近的位置。','站点覆盖、最近邻分区','把区域面积当成对象数量','分区展开 / 站点显现','泰森 最近邻 分区 voronoi','8–50 个唯一坐标，1–4 组；axes.x/y 注明相同空间单位'],
  ['gauge','仪表盘图','Gauge chart','comparison',[label,value,f('min','number','量程下限'),f('max','number','量程上限'),f('target','number','目标值')],'指针位置对应明确量程中的数值，刻线注明目标。','单项指标、目标进度','不公开量程；多指标混用','量程展开 / 指针落位','仪表 仪表盘 目标 gauge','一条记录；min < max，value 与 target 均在量程内'],
  ['likert','李克特量表图','Likert responses','comparison',[f('question','string','调查项目'),f('response','string','选项'),value],'五档回答共用百分比尺度，中立选项居中。','满意度、态度调查','各行分母含义不一致；缺少选项','左右展开 / 比例显现','量表 满意度 发散 likert','2–7 个项目，每项五档合计 100%；responses 明确顺序'],
  ['bubble3d','3D 气泡图','Spatial bubbles','spatial',[label,group,...xy,f('z','number','第三维坐标'),f('size','number','气泡面积权重')],'三维坐标定位对象，正交投影下的气泡面积表示第四指标。','三指标与规模、项目比较','把投影距离当成原始距离','坐标建立 / 球体按面积生长','3d 三维 气泡 bubble','6–60 个唯一对象，1–4 组；axes.x/y/z/size 注明指标及单位'],
  ['lines3d','3D 多线图','Spatial line series','spatial',series,'序列在底面分行，折线高度使用共同数值尺度。','多序列的等间隔阶段变化','不等间隔时间；把深度当成数值','框架建立 / 多线推进','3d 三维 多线 折线 line','4–16 个等间隔时期，2–4 个完整序列']
];
export const volume7Catalog=specs.map(([id,name,en,category,fields,description,use,avoid,motion,keywords,limit],i)=>({id,no:String(i+61),name,en,type:name,category,fields,description,use,avoid,motion,keywords,limit,edition:7,duration:8,...(category==='spatial'?{dimension:'3d'}:{})}));
const round=v=>Math.round(v*10)/10,date=i=>new Date(Date.UTC(2025,0,1+i*7)).toISOString().slice(0,10);
const names=['研究','写作','设计','影像'], proportions=[34,28,23,15];
const temporal=Array.from({length:20},(_,i)=>names.map((series,j)=>({period:date(i),series,value:round(20+j*7+Math.sin(i*.42+j)*12+i*1.5)}))).flat();
const links=Array.from({length:16},(_,i)=>({source:`团队 ${i%8+1}`,target:`团队 ${(i%8+(i<8?1:3))%8+1}`,value:8+(i*7%29)}));
const sample=(i,j)=>round(18+j*7+Math.sin(i*2.399)*6+Math.cos(i*.7)*3+(i%11===0?12:0));
export const volume7Contents={
  pie:{title:'内容支出占比',subtitle:'四类支出 · 角度对应份额',unit:'万元',data:names.map((label,i)=>({label,value:proportions[i]}))},
  polarline:{title:'日内访问量',subtitle:'24 小时 · 等角度排列',unit:'千次',data:Array.from({length:24},(_,i)=>({period:`${i} 时`,value:round(30+22*Math.cos((i-16)/24*Math.PI*2)+12*Math.sin(i*.52)**2)}))},
  stackedcolumn:{title:'各季度内容产出',subtitle:'同一零点 · 每层为分类数量',unit:'篇',data:Array.from({length:6},(_,i)=>names.map((series,j)=>({period:`Q${i%4+1}·${2024+Math.floor(i/4)}`,series,value:Math.round(12+j*4+i*4+Math.sin(i+j)*7)}))).flat()},
  streamgraph:{title:'各来源周访问量',subtitle:'带宽表示数量 · 中线居中',unit:'千次',data:temporal},
  horizon:{title:'每周阅读量偏差',subtitle:'相对基准的增减 · 正负各三层',unit:'千次',data:temporal.map((r,i)=>({...r,value:i===37?null:round(Math.sin(Math.floor(i/4)*.36+i%4)*28+Math.cos(i*.3)*9)}))},
  cycleplot:{title:'历年季度访问量',subtitle:'按季度分面 · 同一纵轴',unit:'千次',data:Array.from({length:5},(_,i)=>['春季','夏季','秋季','冬季'].map((season,j)=>({cycle:String(2021+i),season,value:round(40+i*6+j*9+Math.sin(i+j)*8)}))).flat()},
  eventline:{title:'内容项目发布节点',subtitle:'实际日期间距 · 按项目分行',unit:'事件',data:['专栏','影像','课程'].flatMap((group,j)=>['立项','初稿','审校','发布'].map((label,i)=>({group,label,date:date(i*3+j)})))},
  network:{title:'团队协作网络',subtitle:'线宽表示次数 · 位置表示连接布局',unit:'次',data:links},
  directedchord:{title:'内容类别访问转移',subtitle:'箭头指向去向 · 往返分别计量',unit:'千次',data:names.flatMap((source,i)=>names.filter(n=>n!==source).map((target,j)=>({source,target,value:8+(i*11+j*7)%26})))},
  parallelsets:{title:'内容访问路径构成',subtitle:'完整三分类组合 · 流带不拆散记录',unit:'千人',axes:{a:'访问入口',b:'内容类型',c:'后续行为'},data:['搜索','推荐','订阅'].flatMap((a,i)=>['长文','影像'].flatMap((b,j)=>['收藏','离开'].map((c,k)=>({a,b,c,value:12+(i*13+j*17+k*7)%35}))))},
  edgebundle:{title:'项目跨组协作',subtitle:'节点按分组排列 · 线宽表示协作次数',unit:'次',data:Array.from({length:24},(_,i)=>{const a=i%12,b=(a+(i<12?1:5))%12;return{sourceGroup:['策划','制作','发行'][Math.floor(a/4)],source:`项目${a+1}`,targetGroup:['策划','制作','发行'][Math.floor(b/4)],target:`项目${b+1}`,value:3+(i*7%15)};})},
  raincloud:{title:'不同内容阅读时长',subtitle:'密度、四分位与原始观测',unit:'分钟',data:['长文','教程','访谈'].flatMap((group,j)=>Array.from({length:36},(_,i)=>({group,value:sample(i,j)})))},
  qqplot:{title:'阅读时长分位数',subtitle:'观测值与拟合正态分位数对照',unit:'分钟',data:Array.from({length:60},(_,i)=>({label:`样本 ${i+1}`,value:round(20+8*Math.sin(i*2.399)*Math.sqrt(-2*Math.log((i+.5)/61))+(i>54?5:0))}))},
  survival:{title:'阅读会话持续率',subtitle:'截至观测时仍在阅读的会话保留为删失',unit:'分钟',data:['长文','教程','访谈'].flatMap((group,j)=>Array.from({length:24},(_,i)=>({label:`${group}-${i+1}`,group,duration:round(2+j*2+i*.8+Math.sin(i)*1.5),status:i%5===0?'censored':'ended'})))},
  vectorfield:{title:'展区空气流速场',subtitle:'同一坐标比例 · 箭头长度表示流速',unit:'米/秒',axes:{x:'横向距离 / 米',y:'纵向距离 / 米'},data:Array.from({length:48},(_,i)=>{const x=i%8,y=Math.floor(i/8),dx=x-3.5,dy=y-2.5;return{x,y,u:round(-dy*.32),v:round(dx*.32)};})},
  voronoi:{title:'服务站最近邻分区',subtitle:'区域内各点距离对应站点最近',unit:'公里',axes:{x:'东西距离 / 公里',y:'南北距离 / 公里'},data:Array.from({length:22},(_,i)=>({label:`站点 ${i+1}`,group:['中心站','服务站','补充站'][i%3],x:round(5+Math.cos(i*2.399)*Math.sqrt(i+1)),y:round(5+Math.sin(i*2.399)*Math.sqrt(i+1))}))},
  gauge:{title:'内容审校完成率',subtitle:'量程 0–100% · 目标 90%',unit:'%',data:[{label:'审校完成率',value:76,min:0,max:100,target:90}]},
  likert:{title:'阅读体验满意度',subtitle:'五档回答 · 每项合计 100%',unit:'%',responses:['很不满意','不满意','中立','满意','很满意'],data:['内容清晰','阅读舒适','信息实用','视觉设计'].flatMap((question,i)=>['很不满意','不满意','中立','满意','很满意'].map((response,j)=>({question,response,value:[[5,9,16,42,28],[3,8,19,37,33],[4,6,12,38,40],[6,10,14,36,34]][i][j]})))},
  bubble3d:{title:'项目表现与制作规模',subtitle:'三维坐标表示指标 · 气泡面积表示预算',unit:'原始量纲',axes:{x:'制作工时 / 小时',y:'阅读次数 / 千次',z:'完成阅读率 / %',size:'预算 / 万元'},data:Array.from({length:24},(_,i)=>({label:`项目 ${i+1}`,group:['长文','影像','课程'][i%3],x:round(20+i*2+Math.sin(i)*10),y:round(30+i*1.7+Math.cos(i)*13),z:round(40+i*1.2+Math.sin(i*.4)*15),size:4+(i*11%29)}))},
  lines3d:{title:'各栏目月度阅读量',subtitle:'月份等间隔 · 各序列共用高度尺度',unit:'千次',data:Array.from({length:12},(_,i)=>names.slice(0,3).map((series,j)=>({period:`${i+1} 月`,series,value:round(30+j*16+i*3+Math.sin(i*.6+j)*13)}))).flat()}
};
