import {agentHandoff} from './agent-handoff.js';
import {cleanSequence} from './morph-sequence.js';
import {morphViews,morphEffects} from './morph.js';
import {viewName} from './morph-sequence-player.js';
import {configuredColors} from './palettes.js';
import {escapeHtml as esc} from './data.js';
import {download} from './export.js';

export function sequenceAgentBrief(value){
  const p=cleanSequence(value);
  return `# FORMA 图型连续变形 · Agent 制作说明书

请用用户提供的数据制作「${p.name}」。交付可直接打开、可交互播放的 HTML 和完整源代码，让用户在同一画面点击图型后，看到柱体、线段、圆形、扇区等数据标记连续变形。用户需要的是可用的图表成品。以下配置是给你阅读和制作的说明，不是要求你只返回 JSON 或让用户回网站导入。

## 画布与数据

画布内始终只有一张图表。图型顺序为 ${p.views.map(viewName).join(' → ')}，点击任意一个选项即可从当前轮廓变成目标图型；自动演示按该顺序循环。采用「${morphEffects.find(e=>e.id===p.effect).name}」，形变持续 ${p.duration/1000} 秒，完成后停留 ${p.hold/1000} 秒。切换只改变编码方式，原始数值、类别身份、单位与来源保持不变。不要制作四宫格、叠加多个图表截图、页面滑动或仅靠交叉淡入淡出来替代形状变形。

数据是一列类别 label 与一列数值 value，通常支持 2–24 个唯一类别。负数、零值和缺失是否有效，由所选图型决定；单位图需 0–50 的整数且最多 12 类，阶梯线最多 48 项，径向柱与周期折线最多 80 项。用户如果提供多指标或不满足所选图型要求的数据，先说明如何整理，并取得所需信息；不要丢弃字段、编造记录或将缺失补零。折线与面积按原表顺序连接，只有具有顺序含义的数据才应解读为趋势。占比图要求类别构成可加总的整体；不满足时应向用户说明并选择合适的图型。示例数据必须继续标注为示例，不能作为用户真实数据。

## 图型编码与连续变形

${p.views.map(id=>`${viewName(id)}（${id}）：${morphViews.find(v=>v.id===id).note}`).join('\n\n')}

每个类别拥有一个常驻的 SVG path，并优先用每行保存的 _id 作为稳定 key；未迁移的旧序列在读取时沿用旧类别对应，迁入作品后保存 ID，不能在后续编辑中用显示名称重新认定身份。常规布局为每个类别生成 128 个有序轮廓点；单位图按整数数量生成多个圆点的复合轮廓，跨图型时先匹配两端轮廓的点数。矩形沿四条边采样，圆沿周长采样，环与扇区沿外弧正向、内弧反向采样。条形和柱形使用共同零基线；气泡面积与 value 成正比；饼图和环形的角度为 value / 总和 × 2π；矩形树按面积划分总和；玫瑰等角扇区的半径按数值平方根缩放；份额带宽度与占比成正比。

折线每个类别对应一段从前一个中点、经过本观测点、到下一个中点的窄带，最终相邻窄带无缝连接，并在真实观测点绘制圆点。纵坐标按原始数值计算；中点颜色交接表示类别身份。面积图使用同样的顶部折线，向零基线闭合，不把面积大小解释为类别份额。这两种布局也采样为每类别 128 点，使柱体可以直接收成线段，再展开成扇区。

点图使用大小相同的圆点，以观测范围计算横坐标；棒棒糖图由细杆与圆形端点组成闭合轮廓，端点高度线性对应 value。比例方块的边长为常数 × sqrt(value)，让面积而非边长表示数值。半环的角度为 value / 总和 × π。径向柱从共同内圈开始，外半径为内半径 + 常数 × value；读取径向长度。雷达图的轴使用相同单位与最大值，顶点半径线性对应 value，相邻点之间的中点分隔各类别轮廓，整体面积没有份额含义。

瀑布图保留输入顺序，把每项正值作为增量，上下边对应前一项与当前项的累计总数。漏斗图保留输入的阶段顺序，梯形上边宽度线性对应当前 value，下边宽度衔接下一阶段；数据上升时也保留原值，不自动排序或推断转化率。帕累托图只改变类别的屏幕位置，按 value 稳定降序排列柱体；累计占比折线使用单独的 0–100% 右轴，不能把百分比画在原始数量的轴上。稳定 key 和颜色继续使用原始类别身份。

华夫图为 10×10 网格，每格代表整体的 1%。各类别的区间为累计 value / 总和 × 100，跨行拆成矩形片段，小数占比保留部分填充，不取整。多个片段通过面积为零的来回线段连接成一个闭合轮廓，保留原始顶点后补齐到 128 点；关闭此轮廓描边，最后叠加网格线。不能用整格四舍五入改变类别的实际份额。

动画在 requestAnimationFrame 中对当前与目标轮廓逐点插值。默认 cubic ease-in-out，逐项接力增加类别延迟；弧线迁移给中途纵坐标增加正弦偏移；汇聚展开在中途缩向中心再展开；旋转落位在中途围绕各自中心做小角度旋转。五种方式都必须在结束时精确回到目标数据几何。用户快速连续点击时，从屏幕当前的中间轮廓继续，取消旧帧回调，不能跳回旧图型。坐标轴、文字和数值标签在形变中退场，接近结束时进入；主要数据路径持续可见。

## 视觉与交互

背景 ${p.dark?'炭黑 #202020':'纸白 #f8f7f4'}，采用细边框、充足的图表留白和清晰的文字。类别配色按原始数据顺序固定为 ${configuredColors(p).join('、')}，不足时循环使用，变换过程不能重新分配颜色。默认前两个类别用实心，其他类别用细斜线与浅填充；折线、点图、棒棒糖与华夫图采用清晰的实心标记。顶部显示标题与合计，图下显示类别、原始数值与占比，再放置可横向滚动的图型顺序条。图形占据主要空间，工具区内部滚动，播放栏在常见桌面尺寸内可见。保留键盘焦点状态、播放控制、数据来源、响应式布局与 prefers-reduced-motion 偏好。浏览器页签不可见时暂停轮播。

## 配置结构

doc 是唯一数据源，views 是有序图型数组，currentView 是起始图型。effect、duration、hold 控制真正的几何形变与阅读停留，单位为毫秒。复制用户的数据替换 doc.data，保留真实单位与来源，重新计算全部几何，不复用示例数值生成的截图。

\`\`\`json
${JSON.stringify(p,null,2)}
\`\`\`

## 代码组织与交付

原版 FormaMorphSequence 播放器和可直接运行的 HTML 模板已经随本提示词提供。保留播放器，只修改 forma-morph-sequence 数据区。无需用户另附 HTML，也不要自行重写 MorphChart 或近似复刻插值效果。核对各图型合计一致、快速切换连续、暂停及重新打开正常。

${agentHandoff('sequence',p,p.name,'zh-CN')}`;
}

export function sequenceStandaloneHTML(value,engine){
  const p=cleanSequence(value),payload=JSON.stringify(p,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.name)} · FORMA</title></head><body><main id="forma-player"></main><script type="application/json" id="forma-morph-sequence">${payload}</script><script>${engine.replace(/<\/script/gi,'<\\/script')}
FormaMorphSequence.mount(document.getElementById('forma-player'),JSON.parse(document.getElementById('forma-morph-sequence').textContent));</script></body></html>`;
}
export async function downloadSequenceHTML(project){
  const response=await fetch(`${import.meta.env.BASE_URL}forma/morph-sequence-player.js`);if(!response.ok)throw new Error('形变播放器尚未就绪，请重新构建。');
  download(new Blob([sequenceStandaloneHTML(project,await response.text())],{type:'text/html;charset=utf-8'}),`FORMA-${project.name.replace(/[<>:"/\\|?*]/g,'').slice(0,40)}-连续变形.html`);
}
