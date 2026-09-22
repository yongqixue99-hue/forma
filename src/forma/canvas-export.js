import {agentHandoff} from './agent-handoff.js';
import {cleanCanvas,canvasDuration,canvasEffects,canvasSize} from './canvas-model.js';
import {findTemplate} from './catalog.js';
import {getDataGuide} from './data-guides.js';
import {escapeHtml as esc} from './data.js';
import {download} from './export.js';

export function canvasAgentBrief(value){
  const project=cleanCanvas(value),size=canvasSize(project.ratio);
  if(!project.assets.length)throw new Error('先在画布中加入图表，再复制制作说明书。');
  return `# FORMA 自由画布制作说明书

请根据这份说明书和用户提供的数据，直接制作可打开的图表演示页面与完整代码。成品在用户自己的环境中使用。交付可独立运行的 HTML，保留播放、暂停、重播、逐页切换和时间轴；不需要把 JSON 导回 FORMA。本提示词已附原版 FormaCanvas 播放器的 HTML 模板；无需用户另附 HTML，编辑 forma-canvas-document 数据区即可沿用原版图形与动效。

画布「${project.name}」共 ${project.scenes.length} 页，设计尺寸 ${size.width} × ${size.height}，总时长 ${canvasDuration(project).toFixed(1)} 秒。界面使用中性${project.dark?'炭黑':'纸白'}背景，各图沿用素材中的配色、标题、单位与来源。所有内容按比例缩放；编辑选择框、控制面板不进入演示画面。

## 页面与转换

${project.scenes.map((s,i)=>`第 ${i+1} 页「${s.name}」放置 ${s.panels.length} 张图，完整停留 ${s.hold} 秒；${i===0?'先用 1 秒展示图表入场':`进入本页使用「${canvasEffects.find(([id])=>id===s.transition)[1]}」，时长 ${s.seconds} 秒`}。`).join('\n')}

scenes 是有序页面，assets 是图表数据的独立快照。panel.assetId 关联素材，panel.id 在复制页面时保持不变，用来识别同一对象。x、y、w、h 使用 0–100 的百分比，范围对应画布内容区（画布左侧 3.5%、顶部 11%、宽 93%、高 83%）。保留这套位置关系，也保留每张图的原始数据、单位、颜色和来源。

smart 转场只在前后页面拥有相同 panel.id 和 assetId 时连接位置与大小；其他对象使用叠化。view 为 native 时使用该模板的原生图型与入场动画；view 为 bars、columns、bubbles、pie、donut、treemap、rose、stacked 时，使用同一份类别与正数数据进行形状插值。只有同一素材、相同类别身份的数据才能连续变形，颜色跟随类别，气泡和玫瑰按面积编码，不能虚构两个独立数据集之间的对应关系。fade、slide、rise、zoom、wipe 分别为叠化、水平推移、上移、缩放、幕布；这些是场景转场，不代表数值变化。时间轴必须能够按任意时刻确定性还原，暂停不会改变数据。

## 每份素材的数据规则

${project.assets.map((a,i)=>{const t=findTemplate(a.doc.template),g=getDataGuide(a.doc.template);return `素材 ${i+1}：${t.name}（${a.id} / ${t.id}）。${t.description||t.use}。${g.rowMeaning}\n字段：${t.fields.map(f=>`${f[0]}：${f[1]}，${f[2]}`).join('；')}。\n约束：${t.limit}。${g.notes.join(' ')}`;}).join('\n\n')}

用户需要提供与这些字段一致的真实数据。缺少必要信息时先询问；缺失不补零，样例数值不能拿来补缺，科研统计量不能杜撰。若替换数据后不再适合连续变形，请保留原生图型并改用场景转场。图表与画布仍需核对字段、重复记录、数量、统计口径和单位。

## 可编辑的完整画布结构

以下 JSON 是制作素材与布局说明，成品需要 HTML 与代码，不能只返回这段 JSON。用户的新数据替换相应 asset.doc，布局和播放参数按需求保留。

\`\`\`json
${JSON.stringify(project,null,2)}
\`\`\`

使用下方模板与原版播放器，不要从零重写动画。替换数据后核对各页与转场，并交付可直接打开的文件。

${agentHandoff('canvas',project,project.name,'zh-CN')}`;
}
export function canvasStandaloneHTML(value,engine){
  const project=cleanCanvas(value);if(!project.assets.length)throw new Error('画布中还没有图表。');
  const payload=JSON.stringify(project,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(project.name)} · FORMA</title><body><main id="forma-canvas"></main>
<!-- 编辑区：完整素材、页面布局与转场。Agent 可以替换数据并保留播放器。 -->
<script id="forma-canvas-document" type="application/json">${payload}</script>
<script>${engine.replace(/<\/script/gi,'<\\/script')}
FormaCanvas.mount(document.getElementById('forma-canvas'),JSON.parse(document.getElementById('forma-canvas-document').textContent));</script></body></html>`;
}
export async function downloadCanvasHTML(project){
  const response=await fetch(`${import.meta.env.BASE_URL}forma/canvas-player.js`);if(!response.ok)throw new Error('画布播放器尚未就绪，请重新构建。');
  download(new Blob([canvasStandaloneHTML(project,await response.text())],{type:'text/html;charset=utf-8'}),`FORMA-${project.name.replace(/[<>:"/\\|?*]/g,'').slice(0,40)}-画布.html`);
}
