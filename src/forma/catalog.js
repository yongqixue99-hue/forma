import {volume19Catalog,volume19Contents} from './volume19-catalog.js';
import {volume18Catalog,volume18Contents} from './volume18-catalog.js';
import {volume17Catalog,volume17Contents} from './volume17-catalog.js';
import {volume14Catalog,volume14Contents} from './volume14-catalog.js';
import {volume15Catalog,volume15Contents} from './volume15-catalog.js';
import {volume16Catalog,volume16Contents} from './volume16-catalog.js';
import {volume10Catalog,volume10Contents} from './volume10-catalog.js';
import {volume11Catalog,volume11Contents} from './volume11-catalog.js';
import {volume12Catalog,volume12Contents} from './volume12-catalog.js';
import {volume13Catalog,volume13Contents} from './volume13-catalog.js';
import {localizeCatalogEntry,englishDemo} from './locale-catalog.js';
import { volume9Catalog, volume9Contents, basicTemplateIds } from './volume9-catalog.js';
import { volume8Catalog, volume8Contents } from './volume8-catalog.js';
import { volume7Catalog, volume7Contents } from './volume7-catalog.js';
import { assignChartFamilies } from './chart-families.js';
export { families } from './chart-families.js';
import { volume6Catalog, volume6Contents } from './volume6-catalog.js';
import { volume5Catalog, volume5Contents } from './volume5-catalog.js';
import { applyCatalogLanguage, exampleTitle } from './catalog-language.js';
import { volume4Catalog, volume4Contents } from './volume4-catalog.js';
import { atlasCatalog, atlasContents } from './atlas-catalog.js';
import { editorialCatalog, editorialContents } from './editorial-catalog.js';
export const categories = [
  { id: 'all', name: '全部图表' }, { id: 'basic', name: '基础常用' }, { id: 'research', name: '科研常用' }, { id: 'trend', name: '趋势与时间' },
  { id: 'composition', name: '构成与占比' }, { id: 'distribution', name: '分布与关系' },
  { id: 'comparison', name: '比较与排名' }, { id: 'flow', name: '流动与连接' }, { id: 'spatial', name: '3D 与空间' }
];

export const catalog = [
  { id: 'tide', no: '01', name: '潮汐', en: 'Tidal lines', type: '多序列折线图', category: 'trend', featured: true,
    description: '沿着时间铺开细密的刻线，让趋势浮出水面。', use: '内容表现、长期增长、多个指标随时间变化', avoid: '量纲不同的系列；时间间距不同却没有显式标注的数据', motion: '时间推进 / 线条生长 / 终点跟随', duration: 8,
    fields: [['period','string','按输入顺序排列的时期'],['series','string','序列名称'],['value','number | null','同一量纲的数值；null 保留断点']], keywords: '折线 趋势 时间 增长 line trend', limit: '2–60 个时期，1–6 个序列' },
  { id: 'orbit', no: '02', name: '年轮', en: 'A year in rings', type: '径向柱状图', category: 'trend',
    description: '把一个周期折成圆环，每一根径向刻度都是一次记录。', use: '每周产出、季节节律、周期强度', avoid: '需要精准比较相近数值；非周期数据', motion: '顺时针展开 / 刻度生长', duration: 8,
    fields: [['period','string','等间隔周期标签'],['value','number','非负数值']], keywords: '年轮 周期 径向 时间 radial cycle', limit: '8–80 个等间隔记录' },
  { id: 'alluvial', no: '03', name: '流域', en: 'Where it flows', type: '桑基图', category: 'flow',
    description: '一束束流带交汇与分开，把来路和去向连成完整的故事。', use: '用户路径、内容转化、预算流向', avoid: '含循环的网络；中间节点流入和流出不守恒', motion: '流带展开 / 方向描线', duration: 8,
    fields: [['source','string','起点节点'],['target','string','终点节点'],['value','number','大于 0 的流量']], keywords: '流动 桑基 流向 路径 sankey flow', limit: '2–16 个节点，1–40 条边' },
  { id: 'ridges', no: '04', name: '层峦', en: 'Quiet distributions', type: '山脊分布图', category: 'distribution',
    description: '让原始样本堆起山峦，用同一把尺读懂不同人群。', use: '时长分布、群体差异、评分分布', avoid: '仅有均值或中位数；样本太少却暗示连续分布', motion: '逐层抬升 / 样本显影', duration: 8,
    fields: [['group','string','分组名称'],['value','number','一条真实样本的数值']], keywords: '山脊 分布 样本 density ridgeline', limit: '2–6 组，每组至少 12 个样本，总计最多 1,200 条' },
  { id: 'race', no: '05', name: '竞逐', en: 'Changing places', type: '排名变化图', category: 'comparison',
    description: '把名次的交错留在纸上，每条线都保有自己的身份。', use: '榜单演变、系列竞争、份额名次变化', avoid: '更关心数值差距而非名次；序列或时期缺失', motion: '路径追踪 / 排名节点显影', duration: 8,
    fields: [['period','string','按时间排序的时期'],['series','string','对象名称'],['value','number','用于降序排名的原始数值']], keywords: '排名 竞逐 排序 bump ranking', limit: '2–10 个时期，2–6 个完整序列' },
  { id: 'scatter', no: '06', name: '星群', en: 'A constellation', type: '气泡散点图', category: 'distribution',
    description: '用位置回答关系，用面积补充体量。每一颗星都有数据坐标。', use: '内容效率、产品比较、二维指标与规模', avoid: '用气泡半径代表数值；仅凭相关性断言因果', motion: '坐标落位 / 面积生长', duration: 8,
    fields: [['label','string','对象唯一名称'],['group','string','类别'],['x','number','横轴数值'],['y','number','纵轴数值'],['size','number','大于 0 的面积权重']], keywords: '气泡 散点 关系 scatter bubble correlation', limit: '3–120 个对象，最多 6 个类别' },
  { id: 'calendar', no: '07', name: '织历', en: 'Days, woven together', type: '日历热力图', category: 'trend',
    description: '每一天都是一枚色格。深浅交织成有迹可循的节奏。', use: '每日活跃、内容发布、持续记录', avoid: '把未采集的日期填成零；把连续色谱当类别色', motion: '按周展开 / 每日显影', duration: 8,
    fields: [['date','YYYY-MM-DD','不重复的有效日期'],['value','number | null','非负数值；null 表示缺失']], keywords: '日历 热力 活跃 日期 heatmap calendar', limit: '跨度不超过 366 天' },
  { id: 'waterfall', no: '08', name: '阶序', en: 'The shape of change', type: '瀑布图', category: 'comparison',
    description: '增长和折损一层层落下，最后的结果来自每一步变化。', use: '收入拆解、增长归因、预算增减', avoid: '末项总计与累计结果不一致；遗漏关键变动项', motion: '逐项累加 / 连接线延续', duration: 8,
    fields: [['label','string','项目名称'],['value','number','总值或带正负号的变动'],['kind','total | change','首尾为 total，中间为 change']], keywords: '瀑布 增减 拆解 waterfall bridge', limit: '4–12 项，首尾总计必须一致' },
  { id: 'mosaic', no: '09', name: '构成', en: 'Parts of a whole', type: '矩形树图', category: 'composition',
    description: '面积是最安静的分量。块面之间，整体的结构逐渐清晰。', use: '内容构成、资源分配、类别规模', avoid: '包含负值；需要精确比较相近面积', motion: '块面展开 / 标注显影', duration: 8,
    fields: [['label','string','类别名称'],['value','number','大于 0 的权重']], keywords: '矩形 树图 构成 treemap mosaic', limit: '3–12 个类别' },
  { id: 'chord', no: '10', name: '弦桥', en: 'Threads between us', type: '弦图', category: 'flow', dark: true,
    description: '在圆周上安放彼此，让关系在中间找到交点。', use: '团队协作、共同出现、双向连接权重', avoid: '有方向的流量；同一对对象被重复记录', motion: '圆弧展开 / 关系交织', duration: 8,
    fields: [['source','string','关系的一端'],['target','string','关系的另一端'],['value','number','大于 0 的无向关系权重']], keywords: '弦图 关系 连接 协作 chord network', limit: '3–8 个节点，最多 28 对无向关系' },
  { id: 'waffle', no: '11', name: '百格', en: 'Every single percent', type: '百分比点阵图', category: 'composition',
    description: '把抽象比例还原为一百个单位，小数也保留自己的位置。', use: '受众组成、调查占比、结构对照', avoid: '合计不为 100%；用取整掩盖小数误差', motion: '逐行归位 / 类别着色', duration: 8,
    fields: [['label','string','类别名称'],['value','number','非负百分比，合计 100']], keywords: '百分比 占比 点阵 waffle percent', limit: '2–6 个类别，合计 100%' },
  { id: 'dumbbell', no: '12', name: '对照', en: 'Before meets after', type: '哑铃对比图', category: 'comparison',
    description: '一根线连接改变前后，距离就是最直接的回答。', use: '前后效果、双组比较、目标与实际', avoid: '两端单位不一致；没有共同的比较口径', motion: '基准落点 / 连线推进', duration: 8,
    fields: [['label','string','对象名称'],['before','number','改变前的值'],['after','number','改变后的值']], keywords: '哑铃 前后 对比 dumbbell comparison', limit: '3–10 个对象' }
];

catalog.forEach(t=>t.edition=1);
catalog.push(...editorialCatalog,...atlasCatalog,...volume4Catalog,...volume5Catalog,...volume6Catalog,...volume7Catalog,...volume8Catalog,...volume9Catalog,...volume10Catalog,...volume11Catalog,...volume12Catalog,...volume13Catalog,...volume14Catalog,...volume15Catalog,...volume16Catalog,...volume17Catalog,...volume18Catalog,...volume19Catalog);
catalog.forEach(t=>t.basic=basicTemplateIds.has(t.id));
applyCatalogLanguage(catalog);
assignChartFamilies(catalog);
catalog.forEach(localizeCatalogEntry);

const round = (n, places = 1) => +n.toFixed(places);
let seed = 826;
function random() { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; }
function normal(mean, sd) { return mean + Math.sqrt(-2 * Math.log(Math.max(.0001, random()))) * Math.cos(2 * Math.PI * random()) * sd; }
const month = (i) => `${2024 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`;
const series = ['深度内容','实用教程','行业观察'];
const tide = Array.from({length:24},(_,i) => series.map((s,j) => ({period:month(i),series:s,value:round(22+j*6+i*(2.3-j*.62)+Math.sin(i*.56+j)*7+Math.cos(i*1.71+j)*2.4)}))).flat();
const orbit = Array.from({length:52},(_,i)=>({period:`第 ${String(i+1).padStart(2,'0')} 周`,value:Math.max(1,Math.round(12+8*Math.sin(i*.15-.4)+5*Math.sin(i*.65)+random()*6))}));
const sourceLinks = [['搜索','长文',180],['搜索','短视频',60],['搜索','工具页',90],['推荐','长文',120],['推荐','短视频',220],['推荐','工具页',40],['直接','长文',50],['直接','短视频',40],['直接','工具页',100],['长文','收藏',210],['长文','离开',140],['短视频','收藏',128],['短视频','离开',192],['工具页','收藏',161],['工具页','离开',69]];
const groups=['第一次接触','偶尔阅读','每周回访','深度读者','长期订阅'];
const ridges=groups.flatMap((group,i)=>Array.from({length:56},()=>({group,value:round(Math.max(0,Math.min(100,normal(23+i*12,8+i*.4))))})));
const rankValues=[[84,68,54,42,32],[81,75,65,49,39],[78,80,72,64,43],[80,77,91,74,55],[82,88,85,98,62],[90,86,103,95,80]];
const rankNames=['深读','灵感','视野','实验','日常'];
const race=rankValues.flatMap((values,i)=>values.map((value,j)=>({period:`${i+1} 月`,series:rankNames[j],value})));
const scatter=Array.from({length:30},(_,i)=>({label:`内容 ${String(i+1).padStart(2,'0')}`,group:['知识','创意','生活'][i%3],x:round(1+random()*17),y:round(24+random()*60),size:Math.round(8+random()*180)}));
const calendar=Array.from({length:181},(_,i)=>({date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),value:Math.max(0,Math.round(5+Math.sin(i*.12)*3+Math.cos(i*.37)*2+random()*5))}));
const waterfall=[{label:'期初',value:100,kind:'total'},{label:'内容',value:42,kind:'change'},{label:'搜索',value:28,kind:'change'},{label:'活动',value:18,kind:'change'},{label:'流失',value:-24,kind:'change'},{label:'折损',value:-12,kind:'change'},{label:'期末',value:152,kind:'total'}];
const mosaic=[['知识长文',34],['实用教程',22],['人物访谈',16],['影像记录',11],['行业观察',8],['灵感笔记',5],['其他',4]].map(([label,value])=>({label,value}));
const chord=[['策划','设计',26],['策划','研究',32],['策划','制作',14],['策划','传播',18],['设计','研究',12],['设计','制作',38],['设计','传播',16],['研究','制作',20],['研究','传播',10],['制作','传播',30]].map(([source,target,value])=>({source,target,value}));
const waffle=[['深度阅读',37],['实用收藏',24],['轻量浏览',19],['转发分享',12],['其他',8]].map(([label,value])=>({label,value}));
const dumbbell=[['标题清晰度',52,81],['信息密度',61,78],['视觉吸引力',43,88],['叙事完整度',58,76],['记忆点',39,72],['阅读舒适度',64,85]].map(([label,before,after])=>({label,before,after}));
const contents={
  tide:{title:'好内容，正在被更多人看见',subtitle:'三类内容的月度阅读量 · 2024—2025',unit:'千次',data:tide},
  orbit:{title:'一整年的创作节律',subtitle:'52 周，让日常留下刻度',unit:'篇',data:orbit},
  alluvial:{title:'注意力，流向何处',subtitle:'从内容入口到阅读去向',unit:'千次',data:sourceLinks.map(([source,target,value])=>({source,target,value}))},
  ridges:{title:'读得越深，停留越久',subtitle:'五类读者的阅读时长分布',unit:'分钟',data:ridges},
  race:{title:'每一次交错，都是新的名次',subtitle:'五个内容栏目的半年排名',unit:'千次',data:race},
  scatter:{title:'投入与回响之间',subtitle:'30 条内容的效率观察',unit:'千次',axes:{x:'制作时长 / 小时',y:'完播率 / %',size:'阅读量 / 千次'},data:scatter},
  calendar:{title:'把每一天，织成半年',subtitle:'2025 上半年的每日创作记录',unit:'条',data:calendar},
  waterfall:{title:'增长，来自每一次增减',subtitle:'从期初到期末的完整拆解',unit:'千人',data:waterfall},
  mosaic:{title:'一份内容，一种分量',subtitle:'七类内容的年度投入构成',unit:'份',data:mosaic},
  chord:{title:'好作品，在彼此之间发生',subtitle:'五个创作团队的协作关系',unit:'次',data:chord},
  waffle:{title:'一百份注意力，如何分配',subtitle:'把受众行为还原成可数的比例',unit:'%',data:waffle},
  dumbbell:{title:'让改变，有迹可循',subtitle:'同一组内容，改版前与改版后',unit:'分',data:dumbbell}
};

export function getExample(id) {
  const content=contents[id]||editorialContents[id]||atlasContents[id]||volume4Contents[id]||volume5Contents[id]||volume6Contents[id]||volume7Contents[id]||volume8Contents[id]||volume9Contents[id]||volume10Contents[id]||volume11Contents[id]||volume12Contents[id]||volume13Contents[id]||volume14Contents[id]||volume15Contents[id]||volume17Contents[id]||volume18Contents[id]||volume19Contents[id]||volume16Contents[id];
  return englishDemo(structuredClone({version:1,template:id,source:{name:'FORMA 设计演示 · 确定性合成数据',type:'demo'},...content,title:exampleTitle(id,content?.title)}),findTemplate(id)?.en);
}

export const findTemplate = (id) => catalog.find(t=>t.id===id);
