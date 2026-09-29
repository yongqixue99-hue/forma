import {getExample} from './catalog.js';
import {withRecordIds} from './data-identity.js';
import {temporalText as t} from './temporal-series-rules.js';
const preset=(id,template,views,zh,en,zhDescription,enDescription,zhNote,enNote)=>({id,template,views,category:'regular',get name(){return t(zh,en);},get description(){return t(zhDescription,enDescription);},get dataNote(){return t(zhNote,enNote);},get relation(){return t('同一时间原表 · 不补缺测','One temporal table · no imputation');}});
export const temporalPresets=[
 preset('temporal-source-story','streamgraph',['temporal-stream','temporal-horizon','temporal-lines'],'日期流带折成地平线','Dated ribbons fold into horizons','相同来源的访问量保持真实日期间距，从居中河流带折叠为三层地平线，再展开到原值曲线。','Source visits keep actual date spacing while centered ribbons fold into three-band horizons and unfold into original-value curves.','河流带宽与原值对应；地平线使用共同三层阈值，折叠高度不是原值。','Stream width encodes original value. Horizons share three thresholds; folded height is not the original value.'),
 preset('temporal-season-story','cycleplot',['temporal-season','temporal-season-lines'],'季节比较与周期趋势','Seasonal comparison and cycle trends','完整季度原表从季内年度比较，连续合并到相同年份坐标，保留缺测断点。','Complete quarterly observations morph from within-season annual comparisons onto one common cycle axis, retaining missing-value gaps.','四季和年份顺序固定；缺测不补零，均线只使用有效观测。','Season and cycle order remain fixed. Missing values are not zero-filled and means use observed values only.'),
 preset('temporal-rank-story','rankclock',['temporal-rankclock','temporal-ranklines'],'排名时钟展开成轨迹','Rank clocks unfold into trajectories','原始指标的竞争名次从圆周展开为共同时间轴，保留并列名次与每个原值。','Competition ranks unfold from a clock onto a common period axis, preserving ties and every original metric.','保留原始指标；排名采用1,1,3，不补首尾闭环。','Original metrics remain intact. Competition ties are 1,1,3 and the series stays open.'),
 preset('temporal-retention-story','cohort',['temporal-cohort','temporal-retention'],'留存矩阵连续展开','Retention matrices unfold continuously','同一批同期群从月龄矩阵展开为留存曲线，缺少的未来月份始终留白。','The same cohorts unfold from an age matrix into retention curves, leaving unobserved future months blank.','每群分母固定为起始人数；允许回访反弹，不将留存误作生存。','Each denominator is the initial cohort size. Returns may rebound; retention is not survival.')
];
export function temporalRecords(id,palette='ink'){
 const preset=temporalPresets.find(p=>p.id===id);if(!preset)return null;let doc=getExample(preset.template);doc={...doc,title:preset.name};
 if(id==='temporal-source-story'){const names=t(['搜索来源','订阅来源','推荐来源'],['Search','Subscription','Referral']);doc={...doc,data:Array.from({length:14},(_,i)=>names.map((series,j)=>({period:new Date(Date.UTC(2025,0,1+i*i)).toISOString().slice(0,10),series,value:Math.round(18+j*9+i*2.5+Math.sin(i*.6+j)*9)}))).flat()};}
 if(id==='temporal-season-story')doc.data=doc.data.map((r,i)=>({...r,value:i===7?null:r.value+7}));
 if(id==='temporal-rank-story'){const first=doc.data[0];doc.data=doc.data.map((r,i)=>({...r,value:r.period===first.period&&i<2?first.value:r.value+3}));}
 const identified=withRecordIds(doc,{legacyNamespace:`scenario:${id}`});return preset.views.map(view=>({doc:structuredClone(identified),view,dataGroup:`scenario:${id}`,relation:'auto',scale:'shared',options:{palette}}));
}
