import manifest from './agent-runtimes.json' with {type:'json'};
import {locale} from './locale.js';

const origin='https://forma.ovocode.xyz';
const players={
  chart:{global:'FormaPlayer',host:'forma-player',data:'forma-document'},
  work:{global:'FormaWorkPlayer',host:'forma-work-player',data:'forma-work'},
  sequence:{global:'FormaMorphSequence',host:'forma-player',data:'forma-morph-sequence'},
  canvas:{global:'FormaCanvas',host:'forma-canvas',data:'forma-canvas-document'}
};
const escapeHTML=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const safeJSON=value=>JSON.stringify(value,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

export function agentRuntime(kind){
  const runtime=manifest.runtimes[kind];
  if(!runtime||!players[kind])throw new Error('Unknown FORMA player');
  return {...runtime,url:origin+runtime.path,...players[kind]};
}

export function agentStarterHTML(kind,payload,title,language=locale()){
  const r=agentRuntime(kind);
  return `<!doctype html>
<html lang="${language==='en'?'en':'zh-CN'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(title)} · FORMA</title></head>
<body><main id="${r.host}"></main>
<script id="${r.data}" type="application/json">${safeJSON(payload)}</script>
<script>globalThis.__FORMA_LOCALE__=${JSON.stringify(language==='en'?'en':'zh-CN')};</script>
<script id="forma-original-runtime" src="${r.url}" integrity="${r.integrity}" crossorigin="anonymous"></script>
<script>
const payload=JSON.parse(document.getElementById('${r.data}').textContent);
if(!globalThis.${r.global}){
  document.getElementById('${r.host}').textContent=${JSON.stringify(language==='en'?'The original player could not load. Check your connection and reopen this file.':'原版播放器未能加载，请检查网络后重新打开。')};
}else{
  const view=${r.global}.mount(document.getElementById('${r.host}'),payload);
}
</script></body></html>`;
}

export function agentHandoff(kind,payload,title,language=locale()){
  const r=agentRuntime(kind),html=agentStarterHTML(kind,payload,title,language);
  const fence='`'.repeat(Math.max(3,...(html.match(/`+/g)||[]).map(s=>s.length+1)));
  const en=language==='en';
  const instructions=en?`## Original FORMA animation — ready-to-run HTML

The complete starter HTML below already references the exact original FORMA player. Use it as the deliverable, updating only the JSON data and requested display settings. Do not rebuild the charts, approximate the animation, substitute another library, or ask the user for an HTML attachment. Earlier geometry descriptions explain the data contract; the supplied player implements them.

When the user attaches Excel/CSV, use that table as the replacement data by default. Read its sheet, headers and units; map columns to the documented fields, retain full precision, missing values and stable record identities. For a work, update every linked step in the same data group consistently. For a canvas, update the relevant asset.doc; for a single chart/sequence, update doc.data. Preserve the selected views, colors, layout and timing unless requested otherwise. Ask only when sheets, units or unrelated data groups make the mapping ambiguous. Validate the chosen chart's input requirements before rendering; never silently truncate data or invent statistics.

Runtime URL: ${r.url}
SHA-256: ${r.sha256}

For the final standalone delivery, download this exact JavaScript file, verify its SHA-256, and save it unchanged next to index.html as forma-runtime.js. Replace only the src attribute on script#forma-original-runtime with ./forma-runtime.js and remove crossorigin/integrity for this local copy. Deliver BOTH files together (or inline the unchanged source, escaping closing script tags) so it works offline. The template below can also run online as written. If the download fails, report the failure and retain the original URL; do not silently substitute a recreated engine or claim offline delivery.

Open the result and verify the user's values, units, colors, start/middle/end frames, playback, pause and replay. For morphing sequences check that matching records retain identity throughout. Return the actual working files, not only configuration JSON.`:
`## 原版动效与可直接运行的 HTML

下面已经附上完整 HTML 模板，直接调用本次复制对应的 FORMA 原版播放器。用它制作成品，只替换 JSON 数据区及用户要求的显示设置。不要重新实现图表、近似仿制动画、换用其他图表库，也不需要用户另附 HTML。前面的几何说明用于理解数据规则，实际图形与动效由原版播放器执行。

用户附上 Excel/CSV 时，默认用该表替换示例数据。读取工作表、表头和单位，按上述字段要求映射，保留精度、缺失值和稳定记录身份。多步作品应同步替换同一 dataGroup 内的关联步骤；自由画布替换对应 asset.doc；单图与形变序列替换 doc.data。保留所选图型、颜色、布局和节奏，除非用户要求修改。只有工作表、单位或多个独立数据组存在歧义时才询问。生成前校验图型的数据要求，不截断数据，也不编造统计结果。

原版播放器地址：${r.url}
SHA-256：${r.sha256}

最终交付时，下载这份确切的 JavaScript，核对 SHA-256，原样保存为 index.html 同目录的 forma-runtime.js。只把 script#forma-original-runtime 的 src 改为 ./forma-runtime.js，并移除本地副本的 crossorigin/integrity。将两个文件一起交付，或把原样源码内嵌到 HTML 并转义 script 结束标签，确保离线也能使用。下面模板不改动时可直接联网播放。下载失败应说明失败并保留原版地址，不得悄悄换成重写的引擎或声称离线交付成功。

打开成品，检查用户的数据、单位和颜色，检查起始、中间与结束帧，以及播放、暂停和重播。连续变形要核对前后记录身份。交付实际可运行的文件，不要只返回配置 JSON。`;
  return `${instructions}\n\n${fence}html\n${html}\n${fence}`;
}
