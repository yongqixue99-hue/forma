export const volume4Catalog = [
  {id:'lollipop',no:'33',name:'端点',en:'The distance from zero',type:'棒棒糖比较图',category:'comparison',dark:true,
    description:'把条形的重量收成一条细线，让数值停在清晰的端点。',use:'同一量纲的类别比较、轻量排名、长名称指标',avoid:'负值或混合量纲；依靠圆点面积判断大小',motion:'共同刻度建立 / 细线伸展 / 数值端点落位',fields:[['label','string','唯一类别名称'],['value','number','非负数值']],keywords:'棒棒糖 端点 比较 排名 lollipop dot',limit:'4–12 项；从零量起，保持输入次序'},
  {id:'pareto',no:'34',name:'主因',en:'A few make the difference',type:'帕累托累计图',category:'comparison',
    description:'按贡献从高到低排列，再用一条累计曲线把整体连起来。',use:'问题归因、来源贡献、品类集中度与优先级判断',avoid:'把累计百分比当成计数；先认定一定存在“二八规律”',motion:'分类依贡献落位 / 刻线生长 / 累计比例连成一线',fields:[['label','string','唯一分类名称'],['value','number','非负整数计数']],keywords:'帕累托 二八 主因 累计 pareto contribution',limit:'4–10 类，至少一类大于零；自动按计数降序排列'},
  {id:'violin',no:'35',name:'琴形',en:'The contour of a sample',type:'原始样本小提琴图',category:'distribution',
    description:'对称的轮廓保留密度，细小的观测刻痕保留样本。',use:'连续变量分布、偏态、双峰、多个群体的密度比较',avoid:'把轮廓宽度理解为人数；对少量样本作过度解读',motion:'原始观测落位 / 密度轮廓展开 / 四分位与中位线定格',fields:[['group','string','分组名称'],['value','number','原始连续观测值']],keywords:'小提琴 分布 密度 样本 violin KDE',limit:'2–5 组，每组 12–160 个原始样本；共用带宽、横轴和密度尺度'},
  {id:'correlation',no:'36',name:'共振',en:'How measures move together',type:'原始样本相关矩阵',category:'distribution',
    description:'从成对的原始观测计算相关系数，让方向和强度各有位置。',use:'多变量线性关系探索、指标冗余、研究样本的相关分析',avoid:'从相关推出因果；遗漏样本后仍声称使用相同样本量',motion:'维度框架建立 / 成对关系显影 / 相关系数落定',fields:[['sample','string','唯一观测编号，同一观测包含全部变量'],['variable','string','变量名称，可标注自身单位'],['value','number','该变量的原始数值']],keywords:'相关 皮尔逊 矩阵 变量 correlation Pearson',limit:'3–6 个变量 × 8–120 个完整样本；常量变量显示未定义'},
  {id:'marimekko',no:'37',name:'织幅',en:'Share within a share',type:'变宽马赛克图',category:'composition',featured:true,
    description:'横向看每组的总量，纵向看组内的结构；每一格面积都能核对。',use:'渠道与品类交叉占比、不同规模群体的内部构成',avoid:'只比较格子高度而忽略组宽；用装饰间距破坏面积比例',motion:'组宽按总量铺开 / 组内结构展开 / 数量旁注显影',fields:[['group','string','分组名称'],['series','string','组内分类'],['value','number','非负数量']],keywords:'变宽 马赛克 占比 交叉 mekko marimekko mosaic',limit:'3–6 组 × 2–5 类，交叉表完整；每组总量大于零'},
  {id:'smallmultiples',no:'38',name:'分镜',en:'A common scale, many stories',type:'共尺分面折线图',category:'trend',featured:true,
    description:'每个序列拥有一小块安静的画面，所有画面共用同一把尺。',use:'多个地区或内容类别的趋势比较，避免多线交叠',avoid:'各面板独立缩放；用等距类别压缩真实的日期间隔',motion:'分面框架建立 / 观测按日期展开 / 末值显影',fields:[['series','string','序列名称'],['period','YYYY-MM-DD','有效日期，按时间升序'],['value','number | null','观测值，缺失明确写 null']],keywords:'分面 小多图 趋势 共尺 small multiple facet',limit:'2–6 个序列 × 6–36 个日期；日期集合一致，允许不等距和缺失'},
  {id:'slope',no:'39',name:'两岸',en:'Where a change takes us',type:'两期斜率图',category:'comparison',
    description:'连接起点与终点，同时保留数值的高度和每一个对象的身份。',use:'两个时期的变化、对象间位次变动、同量纲的前后比较',avoid:'把线的斜率解释为连续变化过程；改变两侧纵轴范围',motion:'两岸刻度建立 / 起点连向终点 / 标签避让落定',fields:[['label','string','唯一对象名称'],['before','number','期初数值'],['after','number','期末数值']],keywords:'斜率 前后 两期 slope before after',limit:'3–8 个对象；必须提供 periodLabels 两个时期名称'},
  {id:'range',no:'40',name:'日幅',en:'What happened within a day',type:'高低开收区间图',category:'trend',
    description:'一条竖线容纳高低范围，左右短刻度分别记下起始和结束。',use:'每日温度、区间观测、包含起始和结束的高低值记录',avoid:'把最高最低当成置信区间；将区间中心误认为均值',motion:'日期刻度展开 / 观测区间伸展 / 起始与结束刻度落位',fields:[['period','YYYY-MM-DD','有效日期，按时间升序'],['open','number','起始值'],['high','number','最高值'],['low','number','最低值'],['close','number','结束值']],keywords:'高低 区间 开收 温度 OHLC range',limit:'8–40 个日期；最低 ≤ 起始、结束 ≤ 最高；日期可以不等距'}
].map(template=>({...template,edition:4,duration:8}));

let seed=94026;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const normal=()=>Math.sqrt(-2*Math.log(Math.max(random(),.000001)))*Math.cos(2*Math.PI*random());
const round=value=>Math.round(value*10)/10;
const days=Array.from({length:24},(_,i)=>new Date(Date.UTC(2025,5,1+i*2)).toISOString().slice(0,10));
const violin=['清晨','午后','入夜','周末'].flatMap((group,i)=>Array.from({length:64},(_,j)=>({group,value:round(29+i*6+normal()*(4+i*1.5)+(i===2&&j%3===0?15:0))})));
const variables=['深度','完成','复访','分心','收藏'];
const correlation=Array.from({length:36},(_,i)=>{
  const latent=normal(),second=normal();
  const values=[60+latent*12,52+latent*9+normal()*4,44+latent*7+second*7,38-latent*8+normal()*7,48+latent*5+second*9+normal()*2];
  return variables.map((variable,j)=>({sample:`样本 ${String(i+1).padStart(2,'0')}`,variable,value:round(values[j])}));
}).flat();
const mekkoGroups=['研究笔记','实用教程','人物访谈','影像记录','声音节目'],mekkoSeries=['直接到访','站内发现','朋友分享'];
const mekkoValues=[[260,170,90],[150,210,70],[190,80,80],[100,90,80],[60,90,40]];
const smallmultiples=['研究笔记','实用教程','人物访谈','影像记录'].flatMap((series,i)=>days.map((period,j)=>({series,period,value:(i===1&&j===11)||(i===2&&j===8)?null:round(34+i*13+j*(1.9-i*.35)+Math.sin(j*.46+i)*9+random()*4)})));
const range=Array.from({length:22},(_,i)=>{
  const open=round(19+Math.sin(i*.39)*3+random()*1.8),close=round(open+Math.cos(i*.62)*2.4+random()*1.2),low=round(Math.min(open,close)-2-random()*1.4),high=round(Math.max(open,close)+3+random()*2.4);
  return {period:new Date(Date.UTC(2025,5,1+i)).toISOString().slice(0,10),open,high,low,close};
});

export const volume4Contents={
  lollipop:{title:'把差别，留在每一条线的尽头',subtitle:'七类内容的完成阅读次数 · 共用从零开始的线性刻度',unit:'千次',data:['研究笔记','实用教程','人物访谈','影像记录','声音节目','现场观察','每周书信'].map((label,i)=>({label,value:[86,72,61,54,43,32,24][i]}))},
  pareto:{title:'先看清，哪些问题贡献最多',subtitle:'演示审校记录 · 左轴为问题数，右轴为累计占比 · 80% 为参考线',unit:'条',data:['来源缺失','表述含混','口径混用','引用错误','版本过期','数字笔误','版式问题'].map((label,i)=>({label,value:[68,49,37,24,16,10,6][i]}))},
  violin:{title:'时长相近，阅读的形状却不同',subtitle:'四个时段的原始阅读时长 · 共用平滑带宽与密度尺度 · 细棒为四分位',unit:'分钟',data:violin},
  correlation:{title:'五个指标，如何一起变化',subtitle:'36 个完整模拟样本 · Pearson 线性相关 · 相关不表示因果',unit:'原始量纲',data:correlation},
  marimekko:{title:'每一类内容，有自己的来路',subtitle:'组宽代表总阅读量 · 格高代表组内来源占比 · 格子面积代表整体份额',unit:'千次',data:mekkoGroups.flatMap((group,i)=>mekkoSeries.map((series,j)=>({group,series,value:mekkoValues[i][j]})))},
  smallmultiples:{title:'不同的故事，放在同一把尺上',subtitle:'四类内容的隔日阅读记录 · 所有分面共用坐标范围 · 缺失处保留断点',unit:'千次',data:smallmultiples},
  slope:{title:'两次记录之间，位置悄悄改变',subtitle:'六类内容的完成阅读率 · 两侧共用纵轴 · 连接线只表示两次观测',unit:'%',periodLabels:['春季','夏季'],data:['研究笔记','实用教程','人物访谈','影像记录','声音节目','每周书信'].map((label,i)=>({label,before:[72,64,59,48,43,38][i],after:[81,68,74,52,60,42][i]}))},
  range:{title:'一天的温度，不止一个数字',subtitle:'模拟日内温度 · 竖线为最低至最高 · 左刻度为起始，右刻度为结束',unit:'°C',data:range}
};
