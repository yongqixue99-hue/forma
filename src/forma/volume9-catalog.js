// Basic templates use small, explicit tables; display names describe the chart itself.
const str=(key,label)=>[key,'string',label], num=(key,label)=>[key,'number',label];
const label=str('label','类别名称'), value=num('value','数值'), period=str('period','按顺序排列的等间隔时期');
const time=[period,['value','number | null','观测数值；null 保留缺口']];
const grouped=[label,str('series','序列名称'),value];
const specs=[
  ['column','基础柱状图','Column chart','comparison',[label,value],'类别从左到右排列，柱高从零开始。','月度收入、产品销量、分类比较','截断零基线；用柱宽暗示额外数值','柱体逐项升起 / 数值落位','基础 单序列 垂直 column bar','2–24 个不重复类别；支持正负值与零'],
  ['bar','基础条形图','Horizontal bar','comparison',[label,value],'横向条形共用零基线，适合读取类别名称。','部门业绩、渠道比较、排行榜','将输入顺序误当成自动排名','条形舒展 / 端点数值显现','基础 横向 条形 horizontal bar','2–24 个不重复类别；保留输入顺序'],
  ['singleline','基础折线图','Single line','trend',time,'两列数据即可展示一条趋势，缺失观测保留断点。','日常监测、月度指标、周期变化','时间间隔不等；缺失值补零','时间推进 / 折线描绘 / 终点显现','基础 单序列 折线 line','2–90 个等间隔时期，至少 2 个有效观测'],
  ['area','基础面积图','Area chart','trend',time,'以零为基线填充单条趋势，保留每次观测。','订单规模、流量走势、产量变化','负数面积；把面积本身当成累计总量','轮廓推进 / 色面展开','基础 单序列 面积 area','2–90 个等间隔时期；非负值或 null'],
  ['xy','基础散点图','Scatter plot','distribution',[label,num('x','横轴数值'),num('y','纵轴数值')],'所有观测使用相同点径，直接比较两个变量。','投入与产出、两项指标关系、异常点检查','仅凭相关性判断因果；点大小无意改变权重','坐标建立 / 观测依次落位','基础 二维 散点 scatter','3–300 个唯一对象；axes.x/y 写明指标与单位'],
  ['groupedbarh','分组条形图','Grouped horizontal bars','comparison',grouped,'同一类别的多个序列并排，共用横向数值轴。','同期对照、部门比较、多产品业绩','不同单位混用；缺少类别却默认补零','组内并排展开 / 组间错峰','基础 分组 横向 条形 grouped bar','2–8 个类别，2–3 个完整序列；非负值'],
  ['stackedbar','堆叠条形图','Stacked horizontal bars','composition',grouped,'横向段长对应原始数值，总长度对应类别总量。','费用构成、部门产出、渠道贡献','把段长误读为占比；遗漏分项','总量展开 / 分项逐段接续','基础 堆叠 横向 绝对值 stacked bar','2–10 个类别，2–5 个完整序列；非负值'],
  ['percentcolumn','百分比堆叠柱图','100% stacked columns','composition',[period,str('series','构成分项'),value],'每期原值归一到 100%，便于比较构成变化。','渠道份额、用户构成、业务结构','只看占比忽略总量；把输入单位改成百分比','共同尺度建立 / 分项展开','基础 百分比 堆叠 柱状 normalized','2–16 个时期，2–5 个完整序列；每期总量大于零'],
  ['percentarea','百分比面积图','100% stacked area','trend',[period,str('series','构成分项'),value],'每期按总量计算比例，用连续色带追踪结构。','长期份额变化、渠道占比、内容构成','无数据的时期补零；用色带厚度表示绝对量','时间揭示 / 色带连续展开','基础 百分比 面积 normalized area','3–60 个等间隔时期，2–5 个完整序列；每期总量大于零'],
  ['comboline','柱线组合图','Column & line','comparison',[period,num('bar','柱状序列数值'),['line','number | null','折线序列数值；null 保留缺口']],'柱和线使用同一单位、同一纵轴，直接比较实际与参照。','实际与目标、销量与基准、当期与同期','不同单位共用坐标；双轴随意缩放制造相关','柱体建立 / 参照折线描绘','基础 柱线 组合 combo','3–24 个等间隔时期；非负值；seriesLabels 明确柱与线'],
  ['progress','目标进度条','Target progress','comparison',[label,value,num('target','大于零的目标值')],'长度表示完成比例，超过目标的部分继续延伸。','项目完成、团队目标、额度使用','把超额裁掉；将不同目标值的原数值直接比长度','完成比例推进 / 目标刻线保持','基础 目标 进度 完成 progress','1–10 个唯一项目；value ≥ 0，target > 0'],
  ['kpi','指标卡','Metric cards','comparison',[label,value,num('previous','前期数值'),str('metricUnit','本指标的单位')],'以当前数值、前期值与变化量组成简洁指标组。','经营概览、日报周报、关键指标','前期为零仍计算增长率；将所有增长都标为利好','数值递进 / 前期与变化显现','基础 指标 数字 KPI metric','1–4 个唯一指标；每项注明单位，前期 ≤ 0 时仅展示差值']
];
export const volume9Catalog=specs.map(([id,name,en,category,fields,description,use,avoid,motion,keywords,limit],i)=>({id,no:String(101+i),name,en,type:name,category,fields,description,use,avoid,motion,keywords,limit,edition:9,basic:true,duration:8}));

const months=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const values=[42,48,45,58,64,60,76,82,78,91,98,112];
const categories=['官网','门店','合作伙伴','电商','其他'];
const amounts=[[42,23,15],[34,28,19],[30,18,12],[55,35,24],[16,11,8]];
const groupedData=categories.flatMap((label,i)=>['一季度','二季度'].map((series,j)=>({label,series,value:amounts[i][j]+(j?24:0)})));
const components=categories.flatMap((label,i)=>['产品 A','产品 B','服务'].map((series,j)=>({label,series,value:amounts[i][j]})));
const shares=months.map((period,i)=>['直销','合作','线上'].map((series,j)=>({period,series,value:[54-i*1.6,28+i*.5,18+i*2.8][j]}))).flat();
export const volume9Contents={
  column:{title:'月度销售额',subtitle:'2025 年 · 单序列比较',unit:'万元',data:months.slice(0,8).map((label,i)=>({label,value:values[i]}))},
  bar:{title:'渠道销售额',subtitle:'按销售额降序排列',unit:'万元',data:categories.map((label,i)=>({label,value:[128,104,82,65,39][i]}))},
  singleline:{title:'月度订单量',subtitle:'2025 年 · 每月观测',unit:'千单',data:months.map((period,i)=>({period,value:values[i]}))},
  area:{title:'月度访问量',subtitle:'2025 年 · 零基线面积',unit:'万次',data:months.map((period,i)=>({period,value:values[i]*3}))},
  xy:{title:'投入与销售额',subtitle:'每个点代表一家门店 · 等大标记',unit:'原始量纲',axes:{x:'月度投入 / 万元',y:'月度销售额 / 万元'},data:Array.from({length:42},(_,i)=>({label:`门店 ${i+1}`,x:+(4+i*.63+Math.sin(i*2.4)*3).toFixed(1),y:+(18+i*1.46+Math.cos(i*2.4)*16).toFixed(1)}))},
  groupedbarh:{title:'渠道季度对比',subtitle:'一季度与二季度 · 同单位比较',unit:'万元',data:groupedData},
  stackedbar:{title:'渠道收入构成',subtitle:'分项为原始收入 · 端点为合计',unit:'万元',data:components},
  percentcolumn:{title:'季度收入占比',subtitle:'原始收入按每季总量归一化',unit:'万元',data:shares.filter((_,i)=>Math.floor(i/3)%3===0).map(d=>({...d,period:`Q${Math.floor(months.indexOf(d.period)/3)+1}`}))},
  percentarea:{title:'销售渠道占比',subtitle:'2025 年 · 各月合计为 100%',unit:'万元',data:shares},
  comboline:{title:'销售额与目标',subtitle:'同一单位 · 共用纵轴',unit:'万元',seriesLabels:['实际','目标'],data:months.map((period,i)=>({period,bar:values[i],line:48+i*5}))},
  progress:{title:'季度目标完成率',subtitle:'完成值 ÷ 目标值 · 超额继续延伸',unit:'万元',data:[['华东',120,100],['华南',86,100],['华北',76,90],['西部',48,80]].map(([label,value,target])=>({label,value,target}))},
  kpi:{title:'本月经营指标',subtitle:'当前值与前期比较',unit:'按指标',data:[{label:'销售额',value:128.6,previous:112.4,metricUnit:'万元'},{label:'订单量',value:8460,previous:7920,metricUnit:'单'},{label:'客单价',value:152,previous:142,metricUnit:'元'},{label:'退款率',value:2.1,previous:2.6,metricUnit:'%'}]}
};

// A curated collection spanning editions; purpose and visual family remain available.
export const basicTemplateIds=new Set('column bar singleline area xy groupedbarh stackedbar percentcolumn percentarea comboline progress kpi tide pie donut groupedbar stackedcolumn stacked stream scatter histogram boxplot waterfall funnel heatmap radar gauge bullet gantt'.split(' '));
