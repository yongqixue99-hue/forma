// Read the live module exports; historical release notes are not evidence.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {dataContract} from '../../src/forma/data-contract.js';
import {validateDocument} from '../../src/forma/data.js';
import {workViews,viewFamily,makeStep,stepView,stepEligibility,presetWork,transitionPlan,transitionChoices,workReport} from '../../src/forma/work-model.js';
import {scenarioPresets} from '../../src/forma/scenario-presets.js';
import {sequencePresets} from '../../src/forma/morph-sequence.js';
import {pairRecipe} from '../../src/forma/morph-rules.js';
import {seriesRecipe} from '../../src/forma/series-rules.js';
import {relationalRecipe} from '../../src/forma/relational-rules.js';
import {scientificRecipe} from '../../src/forma/scientific-rules.js';
import {routeAcceptance} from './route-acceptance.mjs';

const directory=resolve(process.argv[2]||'output/forma-audit-20260910');
const engineSHA256=createHash('sha256').update(await readFile('public/forma/work-player.js')).digest('hex');
let routeRegistry={version:1,routes:[]};
try{routeRegistry=JSON.parse(await readFile('qa/forma/route-acceptance.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
// A source inventory must not manufacture browser acceptance or carry it to a new build.
let visualAcceptance={status:'not-recorded',completedCases:0};
try{
  const recorded=JSON.parse(await readFile(resolve(directory,'browser/acceptance.json'),'utf8'));
  const engineSHA256=createHash('sha256').update(await readFile('public/forma/work-player.js')).digest('hex');
  visualAcceptance={...recorded,currentEngineMatches:recorded.engineSHA256===engineSHA256};
  if(!visualAcceptance.currentEngineMatches)visualAcceptance.status='stale-engine';
}catch(error){if(error.code!=='ENOENT')throw error;}
const families=Object.groupBy(workViews,v=>viewFamily(v.id));
const templates=catalog.map(template=>{
  const doc=getExample(template.id),step=makeStep({doc}),contract=dataContract(doc);
  return {id:template.id,no:template.no,name:template.type,galleryFamily:template.family,
    fieldFamily:contract.family,schema:contract.signature,fields:contract.fields,
    galleryLayout:template.limit,nativeMorphView:stepView(step),
    exampleDataValid:validateDocument(doc).dataValid,
    exampleNativeLayoutValid:validateDocument(doc).layoutValid,
    compatibleViewsForExample:workViews.filter(v=>stepEligibility(step,v.id).valid).map(v=>v.id),
    visualAcceptance:'not-individually-reviewed; see scoped scenario acceptance'};
});
const routes=[];
for(const [family,views] of Object.entries(families))for(const from of views)for(const to of views){
  const recipe=(family==='single'?pairRecipe:family==='series'?seriesRecipe:['paired','hierarchy'].includes(family)?relationalRecipe:scientificRecipe)(from.id,to.id);
  routes.push({family,from:from.id,to:to.id,...recipe,selfUpdate:from.id===to.id,acceptance:routeAcceptance(routeRegistry,{engineSHA256,from:from.id,to:to.id}),
    eligibility:'Requires compatible fields, layout capacity, units, observation meaning, explicit relation and persistent record IDs. Not a visual acceptance result.'});
}
const rules=Object.entries(Object.groupBy(routes,r=>r.id)).map(([id,uses])=>({id,name:uses[0].name,description:uses[0].description,families:[...new Set(uses.map(r=>r.family))],routes:uses.length}));
const scenes=scenarioPresets.map(p=>{
  const work=presetWork(p.id),report=workReport(work);
  return {...p,dataAndLayoutValid:report.valid,steps:work.steps.map(s=>({template:s.doc.template,view:stepView(s),rows:s.doc.data.length,unit:s.doc.unit})),
    transitions:work.steps.slice(1).map((s,i)=>{const plan=transitionPlan(work.steps[i],s,{steps:work.steps});return {from:stepView(work.steps[i]),to:stepView(s),mode:plan.mode,recipe:plan.recipe,effect:plan.effect,reason:plan.reason};})};
});
const counts={templates:templates.length,editorViews:workViews.length,morphDataFamilies:Object.keys(families).length,
  reusableFieldFamilies:new Set(templates.map(t=>t.fieldFamily)).size,rawSchemaSignatures:new Set(templates.map(t=>t.schema)).size,
  directNativeAdapters:templates.filter(t=>t.nativeMorphView).length,nativeEntryOnly:templates.filter(t=>!t.nativeMorphView).length,
  morphRuleNames:rules.length,potentialDirectedCrossViewRoutes:routes.filter(r=>!r.selfUpdate).length,
  scenePresets:scenes.length,effectPresets:sequencePresets.length,transitionChoices:transitionChoices.length};
const result={generatedAt:new Date().toISOString(),source:'Current source module exports, not release-note claims',counts,
  definitions:{templates:'Gallery renderer templates, including native entrance animations',editorViews:'Continuous-geometry encodings; not additional gallery templates',morphDataFamilies:'Data contracts accepted by geometry adapters',reusableFieldFamilies:'Shared editor field-card and sheet presentation families',rules:'Recipe dispatch rules, conditional on the actual data and relation; route count is not visually verified coverage',presets:'Curated example works; no extra chart type is created',nativeEntryOnly:'No direct native morph adapter; still usable as a work step with its own entrance animation'},
  families,templates,rules,routes,scenarios:scenes,effectPresets:sequencePresets,transitionChoices,
  visualAcceptance};
await mkdir(directory,{recursive:true});
await writeFile(resolve(directory,'capabilities.json'),JSON.stringify(result,null,2)+'\n');
const cell=s=>String(s??'—').replaceAll('|','\\|').replaceAll('\n',' ');
const table=(headers,rows)=>[headers.join(' | '),headers.map(()=>'---').join(' | '),...rows.map(row=>row.map(cell).join(' | '))].join('\n');
const browserSummary=visualAcceptance.currentEngineMatches
  ? `本轮真实浏览器已检查 ${visualAcceptance.completedCases} 组核心场景、${visualAcceptance.reviewedRoutes} 条方向路径及 ${visualAcceptance.reviewedScreenshots} 个检查画面；范围、实际问题和保留项见 [浏览器验收记录](./browser/acceptance.json)。这不代表全部模板或全部路径通过。`
  : '当前构建没有匹配的真实浏览器验收记录；生成清单或构建成功不能代替视觉验收。';
await writeFile(resolve(directory,'CAPABILITIES.md'),`# FORMA 当前能力清单\n\n生成时间：${result.generatedAt}。由当前源码导出，运行命令：\`node qa/forma/audit-capabilities.mjs\`。本轮没有新增图表。\n\n## 计数口径\n\n${table(['对象','数量','含义'],[
  ['图库模板',counts.templates,'原生图表渲染器'],['编辑器变形图型',counts.editorViews,'对数据重新编码的几何视图，不与模板相加'],['变形数据家族',counts.morphDataFamilies,'兼容性和统计含义的分组'],['字段展示家族',counts.reusableFieldFamilies,'共用结构卡片、表头、类型、示例和提示'],['原始字段签名',counts.rawSchemaSignatures,'不同字段键与类型组合'],['直接原生变形适配',counts.directNativeAdapters,'模板存在直接几何映射，仍须数据条件合格'],['原生入场模板',counts.nativeEntryOnly,'可作作品步骤；没有直接连续变形适配'],['变形规则名称',counts.morphRuleNames,'规则不是预先固定的 A→B 场景'],['场景预设',counts.scenePresets,'围绕具体数据和业务／科研场景'],['几何效果预设',counts.effectPresets,'传统单组数值序列'],['过渡选项',counts.transitionChoices,'含推荐过渡及完整画面入场']])}\n\n另有“独立数据”内置示例，与场景预设分开。${counts.potentialDirectedCrossViewRoutes} 条同家族有向图型路径仅表示规则可以分派，不代表每份数据适用，更不代表视觉验收通过。${browserSummary}\n\n## 图型与家族\n\n${table(['数据家族','图型数','图型'],Object.entries(families).map(([family,views])=>[family,views.length,views.map(v=>v.name+' ('+v.id+')').join('、')]))}\n\n## 变形规则\n\n${table(['规则','名称','家族'],rules.map(r=>[r.id,r.name,r.families.join('、')]))}\n\n## 原生模板逐项清单\n\n${table(['编号','模板 ID','模板','字段家族','直接变形视图','示例数据／布局'],templates.map(t=>[t.no,t.id,t.name,t.fieldFamily,t.nativeMorphView||'原生入场',t.exampleDataValid&&t.exampleNativeLayoutValid?'通过':'需检查']))}\n\n每张表的完整字段、示例、类型、布局建议，以及按当前示例计算的可用视图，见 [capabilities.json](./capabilities.json)。\n\n## 场景预设\n\n${table(['预设','名称','顺序','数据与布局'],scenes.map(p=>[p.id,p.name,p.views.join(' → '),p.dataAndLayoutValid?'通过':'需检查']))}\n`);
console.log(JSON.stringify({directory,counts,invalidTemplates:templates.filter(t=>!t.exampleDataValid||!t.exampleNativeLayoutValid).map(t=>t.id),invalidPresets:scenes.filter(s=>!s.dataAndLayoutValid).map(s=>s.id)},null,2));
