import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import XLSX from 'xlsx';
import {agentRuntime,agentStarterHTML} from '../../src/forma/agent-handoff.js';
import {agentBrief} from '../../src/forma/data-guides.js';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {setLocale} from '../../src/forma/locale.js';
import {workAgentBrief} from '../../src/forma/work-export.js';
import {presetWork,cleanWork,workReport} from '../../src/forma/work-model.js';
import {mount as mountChart} from '../../src/forma/player.js';

const htmlFrom=brief=>{
  const match=brief.match(/(`{3,})html\n([\s\S]*?)\n\1(?:\n|$)/);
  assert.ok(match,'Copied prompt contains runnable HTML');return match[2];
};
const parsed=html=>{const win=new Window();win.document.body.innerHTML=html;return win;};

test('all chart prompts carry original-player HTML in both languages and preserve user payloads',async()=>{
  try{for(const language of ['zh-CN','en']){setLocale(language);
    for(const item of catalog){
      const doc=getExample(item.id),options={palette:'cobalt',duration:5,ratio:'portrait'};
      doc.title='用户标题 </script><script>window.INJECTED=1</script> ```html';
      const brief=agentBrief(doc,options),win=parsed(htmlFrom(brief));
      assert.deepEqual(JSON.parse(win.document.querySelector('#forma-document').textContent),{doc,options});
      assert.equal(win.document.querySelectorAll('script').length,4);
      assert.equal(win.document.querySelector('#forma-original-runtime').src,agentRuntime('chart').url);
      assert.equal(win.INJECTED,undefined);
      assert.doesNotMatch(brief,/With only this brief, implement|如果没有 HTML 附件/);
      await win.happyDOM.close();
    }
  }}finally{setLocale('zh-CN');}
});

test('pinned downloads match both their hashes and the actual bundled FORMA players',async()=>{
  const files={chart:'player.js',work:'work-player.js',sequence:'morph-sequence-player.js',canvas:'canvas-player.js'};
  for(const [kind,file] of Object.entries(files)){
    const r=agentRuntime(kind),bytes=await readFile('public'+r.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);
    assert.equal('sha384-'+createHash('sha384').update(bytes).digest('base64'),r.integrity);
    assert.deepEqual(bytes,await readFile('public/forma/'+file));
    assert.equal(new URL(r.url).hostname,'forma.ovocode.xyz');
  }
  assert.match(await readFile('public/_headers','utf8'),/\/forma\/agent-runtimes\/\*\n  Access-Control-Allow-Origin: \*/);
});

function install(win){
  const old=new Map();
  for(const [key,value] of Object.entries({window:win,document:win.document,XMLSerializer:win.XMLSerializer,ResizeObserver:win.ResizeObserver,requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win)})){
    old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  }
  return ()=>{for(const [key,value] of old){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}};
}
function geometry(win,selector){
  const svg=win.document.querySelector(selector);assert.ok(svg,'Player rendered an SVG');
  let result=svg.outerHTML;
  for(const [i,node] of [...svg.querySelectorAll('[id]')].entries())result=result.replaceAll(node.id,`normalized-id-${i}`);
  assert.doesNotMatch(result,/NaN|Infinity/);
  return result;
}
async function originalFrames(kind,payload,mount,times){
  const win=new Window(),restore=install(win);let player;
  try{
    const host=win.document.createElement('main');host.id=agentRuntime(kind).host;win.document.body.append(host);
    player=mount(host,structuredClone(payload));
    return times.map(t=>{player.seek(t);return geometry(win,kind==='chart'?'.fp-chart svg':'.wp-graphic svg');});
  }finally{player?.destroy();restore();await win.happyDOM.close();}
}
async function copiedFrames(kind,html,times){
  const win=new Window({settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  win.structuredClone=structuredClone;
  win.document.body.innerHTML=html;
  try{
    for(const script of win.document.querySelectorAll('script')){
      if(script.type==='application/json')continue;
      if(script.src){
        win.eval(await readFile('public'+new URL(script.src).pathname,'utf8'));
        const r=agentRuntime(kind),mount=win[r.global].mount;
        win[r.global].mount=(...args)=>(win.__view=mount(...args));
      }else win.eval(script.textContent);
    }
    assert.ok(win.__view,'Copied HTML mounts the supplied original runtime');
    return times.map(t=>{win.__view.seek(t);return geometry(win,kind==='chart'?'.fp-chart svg':'.wp-graphic svg');});
  }finally{win.__view?.destroy();await win.happyDOM.close();}
}
function excelRows(rows){
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(rows),'数据');
  const bytes=XLSX.write(book,{type:'buffer',bookType:'xlsx'}),read=XLSX.read(bytes,{type:'buffer'});
  return XLSX.utils.sheet_to_json(read.Sheets['数据']);
}

test('Excel replacement in copied single-chart HTML matches original renderer at five animation frames',async()=>{
  const doc=getExample('column'),rows=excelRows(doc.data.map((r,i)=>({类别:r.label,收入:(i+1)*17.125})));
  doc.data=rows.map(r=>({label:r.类别,value:r.收入}));doc.title='Excel 收入';doc.source={type:'user',name:'用户 Excel'};
  const payload={doc,options:{palette:'ink',duration:6,ratio:'wide'}};
  const html=htmlFrom(agentBrief(doc,payload.options)),times=[0,.25,.5,.75,1];
  assert.deepEqual(await copiedFrames('chart',html,times),await originalFrames('chart',payload,mountChart,times));
});

test('Excel replacement preserves work identity and exact original geometry through both morph transitions',async()=>{
  const work=presetWork('channels'),rows=excelRows(work.steps[0].doc.data.map((r,i)=>({类别:r.label,收入:(i+1)*11.75})));
  const values=new Map(rows.map(r=>[r.类别,r.收入]));
  for(const step of work.steps){for(const row of step.doc.data)row.value=values.get(row.label);step.doc.source={type:'user',name:'用户 Excel'};}
  assert.equal(workReport(work).valid,true);
  const html=htmlFrom(workAgentBrief(work)),win=parsed(html);
  assert.deepEqual(JSON.parse(win.document.querySelector('#forma-work').textContent),cleanWork(work));await win.happyDOM.close();
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  try{
    const {mount}=await server.ssrLoadModule('/src/forma/work-player-entry.js');
    const times=[0,500,1700,3000,4600,5900,7200,9000,12000];
    assert.deepEqual(await copiedFrames('work',html,times),await originalFrames('work',cleanWork(work),mount,times));
  }finally{await server.close();}
});
