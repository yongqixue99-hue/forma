import {locale} from './locale.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {createElement,FolderOpen,Upload,Download,Trash2,RotateCcw,X,ArrowRight,Search} from 'lucide';
import {createStepScene,stepName} from './work-scene.js';
import {readBackupFiles,backupBlob} from './work-backup.js';
import {inspectLegacy,BACKUP_SET_LIMIT} from './work-store.js';
import {sha256,inspectLegacyCollection} from './legacy-collections.js';
import {cleanWork,newWork} from './work-model.js';
import {readProject} from './project-file.js';
import {escapeHtml as esc} from './data.js';
import './work-collection.css';

const icons={FolderOpen,Upload,Download,Trash2,RotateCcw,X,ArrowRight,Search};
const icon=(name,size=16)=>createElement(icons[name],{width:size,height:size,'stroke-width':1.5,'aria-hidden':'true'}).outerHTML;
const date=value=>new Date(value).toLocaleString(locale(),{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
export async function normalizeBackupInput(value,{raw:originalRaw}={}){
  if(value?.kind==='forma-local-backup')return value;
  let works,legacy=[];
  if(Array.isArray(value)||value?.kind==='forma-morph-sequence'||value?.projects?.some?.(p=>p?.kind==='forma-morph-sequence')){
    const raw=originalRaw??JSON.stringify(value),sequence=!Array.isArray(value),key=sequence?'forma.morph-sequences.v1':value.some(item=>item?.key!==undefined)?'forma.editor.v1':'forma.documents.v1';
    const inspected=await inspectLegacyCollection(key,value?.kind==='forma-morph-sequence'?JSON.stringify({projects:[value]}):raw);
    if(!inspected.entries.length)throw new Error(uiText('旧文件中没有可恢复的图表，原文件保留。'));
    return {kind:'forma-local-backup',version:1,records:inspected.entries.map(({work})=>({work,sync:[],recovery:[]})),legacy:[{raw,hash:await sha256(raw),sourceKeys:[key],warnings:inspected.warnings,at:Date.now()}]};
  }
  if(Array.isArray(value?.projects)||Array.isArray(value?.drafts)){
    const raw=originalRaw??JSON.stringify(value),inspection=inspectLegacy(raw);if(!inspection.works.length)throw new Error(uiText('旧文件中没有可恢复的作品。'));
    works=inspection.works.map(x=>x.work);legacy=[{raw,hash:await sha256(raw),warnings:inspection.warnings,at:Date.now()}];
    return {kind:'forma-local-backup',version:1,activeId:inspection.activeId,records:works.map(work=>({work,sync:[],recovery:[],legacyHistory:inspection.histories[work.id]})),legacy};
  }
  works=[value?.kind==='forma-work'?cleanWork(value):newWork([readProject(JSON.stringify(value),{maxBytes:BACKUP_SET_LIMIT})],String(value?.doc?.title||value?.title||uiText('我的图表')).slice(0,80))];
  return {kind:'forma-local-backup',version:1,records:works.map(work=>({work,sync:[],recovery:[]})),activeId:works[0].id,legacy};
}

export function mountWorkCollection(host,{repository,onOpen,toast=()=>{}}){
  const win=host.ownerDocument.defaultView,events=new win.AbortController();let tab='works',query='',confirmId=null,observer,scenes=new Map(),generation=0,panelTrigger,pendingBackup=null,disposed=false,operation=0,task;
  host.innerHTML=uiMarkup`<section class="collection-page"><header class="collection-heading"><div><p class="eyebrow">YOUR PRIVATE COLLECTION</p><h1>我的作品</h1><p>单图、草稿和组合都在这里继续编辑。</p></div><div><button class="button small" data-collection="backup">${icon('Download')}备份全部</button><button class="button small" data-collection="import">${icon('Upload')}恢复备份</button></div></header><div class="collection-toolbar"><div class="collection-tabs" role="group" aria-label="作品与回收站"><button data-collection-tab="works" aria-pressed="true">全部作品 <span data-work-count></span></button><button data-collection-tab="trash" aria-pressed="false">${icon('Trash2',14)}回收站 <span data-trash-count></span></button></div><label class="collection-search">${icon('Search',14)}<input placeholder="搜索作品名称" aria-label="搜索作品名称"></label></div><div data-collection-items></div><aside class="collection-panel" hidden role="dialog" aria-modal="false"></aside><input type="file" data-collection-files accept=".json,.zip,.forma-part" multiple hidden></section>`;
  const $=s=>host.querySelector(s),panel=$('.collection-panel');
  function clearScenes(){generation++;observer?.disconnect();scenes.forEach(scene=>scene.destroy());scenes.clear();}
  function close(){operation++;task?.abort();pendingBackup=null;panel.hidden=true;panel.replaceChildren();panelTrigger?.focus();}
  function open(title,content){panelTrigger=win.document.activeElement;panel.hidden=false;panel.setAttribute('aria-label',title);panel.innerHTML=uiMarkup`<header><h2>${esc(title)}</h2><button data-collection="close" aria-label="关闭${esc(title)}">${icon('X')}</button></header><div class="collection-panel-body">${content}</div>`;panel.querySelector('button').focus();}
  function showError(error){if(disposed)return;open(uiText('暂未完成'),uiMarkup`<p role="alert">${esc(error.message)}</p><p>现有作品保持不变，可以修正文件后重新选择。</p><button class="button" data-collection="import">重新选择文件</button>`);}
  function render(){
    if(disposed)return;clearScenes();const all=repository.summaries?repository.summaries():repository.list().map(w=>({id:w.id,name:w.name,revision:repository.peek(w.id).revision,stepCount:w.steps.length,rows:w.steps.reduce((n,s)=>n+s.doc.data.length,0),draft:w.steps.some(s=>s.draft),first:w.steps[0]})),trash=repository.trash();$('[data-work-count]').textContent=all.length;$('[data-trash-count]').textContent=trash.length;
    host.querySelectorAll('[data-collection-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.collectionTab===tab)));
    const items=(tab==='works'?all:trash).filter(w=>w.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())),list=$('[data-collection-items]');
    if(!items.length){list.className='collection-empty';list.innerHTML=`${icon(tab==='trash'?'Trash2':'FolderOpen',28)}<h2>${query?uiText('没有匹配的作品'):tab==='trash'?uiText('回收站是空的'):uiText('从第一张图开始')}</h2><p>${query?uiText('换一个名称试试。'):tab==='trash'?uiText('移除的作品会保留在这里，不会自动清空。'):uiText('选择图表，填写数据，再保存为自己的作品。')}</p>${tab==='works'&&!query?uiText('<a class="button" href="#library">浏览图表库</a>'):''}`;return;}
    if(tab==='trash'){
      list.className='collection-trash';list.innerHTML=uiMarkup`<p class="collection-trash-note">作品与版本记录一起保留；只有永久删除才会释放这部分空间。</p>`+items.map(r=>uiMarkup`<article data-trash-id="${esc(r.id)}"><div><h2>${esc(r.name)}</h2><p>${r.steps} 步 · ${r.rows} 条记录 · ${date(r.deletedAt)} 移除</p></div><div>${confirmId===r.id?uiMarkup`<span>永久删除后无法恢复</span><button class="button small danger" data-collection="purge" data-id="${esc(r.id)}" data-revision="${r.revision}">确定永久删除</button><button class="button small" data-collection="cancel-purge">取消</button>`:uiMarkup`<button class="button small" data-collection="restore" data-id="${esc(r.id)}" data-revision="${r.revision}">${icon('RotateCcw',13)}恢复</button><button class="text-button" data-collection="confirm-purge" data-id="${esc(r.id)}">永久删除</button>`}</div></article>`).join('');return;
    }
    list.className='collection-grid';list.innerHTML=items.map(w=>uiMarkup`<article class="collection-tile"><button class="collection-open" data-collection="open" data-id="${esc(w.id)}"><div class="collection-preview" data-collection-preview="${esc(w.id)}" aria-hidden="true"></div><h2>${esc(w.name)}</h2><p>${w.stepCount===1?esc(stepName(w.first)):uiMessage`${w.stepCount} 步组合`} · ${w.rows} 条记录${w.draft?uiText(' · 含编辑草稿'):''}</p></button><button class="collection-remove" data-collection="remove" data-id="${esc(w.id)}" data-revision="${w.revision}" aria-label="将${esc(w.name)}移到回收站" title="移到回收站">${icon('Trash2',14)}</button></article>`).join('');
    const current=generation,pending=new Set();
    observer=new win.IntersectionObserver(entries=>{for(const entry of entries){
      const node=entry.target,id=node.dataset.collectionPreview;node.dataset.inView=String(entry.isIntersecting);
      if(!entry.isIntersecting){scenes.get(id)?.destroy();scenes.delete(id);continue;}
      if(scenes.has(id)||pending.has(id))continue;pending.add(id);
      repository.get(id).then(record=>{if(disposed||generation!==current||!node.isConnected||node.dataset.inView!=='true'||!record)return;
        const work=record.work;try{const scene=createStepScene(node,work.steps.find(s=>s.id===work.activeStep)||work.steps[0],{compact:true,progress:1,width:320,height:160});scene.render(1);scenes.set(id,scene);}catch{node.textContent=stepName(work.steps[0]);}
      }).catch(()=>{if(node.isConnected)node.textContent=uiText('点击打开作品');}).finally(()=>pending.delete(id));
    }},{rootMargin:'80px'});
    host.querySelectorAll('[data-collection-preview]').forEach(node=>observer.observe(node));
  }
  async function previewFiles(files){
    const current=++operation;task?.abort();task=new AbortController();
    open(uiText('读取备份'),uiText('<p role="status">正在校验文件、分卷与版本记录…</p>'));
    try{
      let originalRaw;const raw=await readBackupFiles(files,{signal:task.signal,onReadRaw:text=>originalRaw=text}),backup=await normalizeBackupInput(raw,{raw:originalRaw});
      if(backup.records.some(r=>r.legacyHistory)){const {packSyncHistory}=await import('./storage-delta.js');backup.records.forEach(r=>{r.sync=packSyncHistory(r.work,r.legacyHistory||[]);delete r.legacyHistory;});}
      const summary=await repository.importBackup(backup,{preview:true,signal:task.signal});if(disposed||current!==operation)return;
      open(uiText('恢复这份备份'),uiMarkup`<p>将恢复 <strong>${summary.works} 份作品</strong>${summary.trash?uiMessage`及 ${summary.trash} 份回收站作品`:''}，并保留 ${summary.versions} 个版本记录${summary.brands?uiMessage`与 ${summary.brands} 套品牌方案`:""}。所有内容会成为独立副本。</p><p>当前作品不会被替换；回收站内容仍留在回收站。</p>${summary.warnings?.length?uiMarkup`<p role="note">原文件有 ${summary.warnings.length} 项需要核对：${esc(summary.warnings.slice(0,2).join('；'))} 完整原文会随备份保留。</p>`:''}<div class="collection-file-names">${summary.names.slice(0,4).map(n=>`<span>${esc(n)}</span>`).join('')}${summary.names.length>4?uiMarkup`<small>另有 ${summary.names.length-4} 份</small>`:''}</div><button class="button dark" data-collection="apply-import">恢复副本</button>`);pendingBackup=backup;
    }catch(error){if(!disposed&&current===operation)showError(error);}
  }
  host.addEventListener('click',async event=>{
    const target=event.target.closest('[data-collection],[data-collection-tab]');if(!target)return;
    if(target.dataset.collectionTab){tab=target.dataset.collectionTab;confirmId=null;render();return;}
    const action=target.dataset.collection,id=target.dataset.id;
    try{
      if(action==='open')await onOpen(id);
      else if(action==='close')close();
      else if(action==='import')$('[data-collection-files]').click();
      else if(action==='remove'){target.disabled=true;await repository.remove(id,Number(target.dataset.revision));toast(uiText('已移到回收站，可以随时恢复。'));}
      else if(action==='restore'){target.disabled=true;await repository.restoreTrash(id,Number(target.dataset.revision));toast(uiText('已恢复到全部作品，数据与版本记录均保留。'));}
      else if(action==='confirm-purge'){confirmId=id;render();}
      else if(action==='cancel-purge'){confirmId=null;render();}
      else if(action==='purge'){target.disabled=true;await repository.purge(id,Number(target.dataset.revision));confirmId=null;toast(uiText('已永久删除。'));}
      else if(action==='backup'){
        const current=++operation;task?.abort();task=new AbortController();
        open(uiText('备份全部作品'),uiText('<p role="status" data-backup-progress>正在读取作品与版本记录…</p>'));
        const backup=await repository.backup(),result=await backupBlob(backup,{signal:task.signal,onProgress:p=>{const status=$('[data-backup-progress]');if(status)status.textContent=uiMessage`正在校验分卷 · ${Math.round(p*100)}%`;}});if(disposed||current!==operation)return;
        open(uiText('备份已就绪'),uiMarkup`<p>${backup.records.filter(r=>!r.deletedAt).length} 份作品${backup.records.some(r=>r.deletedAt)?uiText('，含回收站内容'):''}及全部保留的版本记录${backup.brands?.length?uiMessage`、${backup.brands.length} 套品牌方案`:""}，已校验并打包为 ${result.parts} 卷。</p><p>下载一个 ZIP 文件即可。恢复时选择这个 ZIP，或解压后同时选择清单与全部分卷。</p><a class="button dark" data-backup-download download="${result.filename}">下载备份包</a>`);const url=URL.createObjectURL(result.blob);$('[data-backup-download]').href=url;urls.add(url);
      }else if(action==='apply-import'&&pendingBackup){target.disabled=true;target.textContent=uiText('正在恢复…');const current=++operation;task?.abort();task=new AbortController();await repository.importBackup(pendingBackup,{signal:task.signal});if(disposed||current!==operation)return;close();render();toast(uiText('已恢复为独立副本，原有作品保留。'));}
    }catch(error){if(error.name==='AbortError')return;toast(error.message);if(target.isConnected)target.disabled=false;if(['backup','apply-import'].includes(action))showError(error);}
  },{signal:events.signal});
  host.addEventListener('input',e=>{if(e.target.matches('.collection-search input')){query=e.target.value;render();}},{signal:events.signal});
  host.addEventListener('change',e=>{if(e.target.matches('[data-collection-files]')){const files=Array.from(e.target.files||[]);e.target.value='';if(files.length)previewFiles(files);}},{signal:events.signal});
  win.document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();close();}},{signal:events.signal});
  let refreshFrame;const urls=new Set(),unsubscribe=repository.subscribe(()=>{win.cancelAnimationFrame(refreshFrame);refreshFrame=win.requestAnimationFrame(render);});render();
  return {render,openImport:()=>$('[data-collection-files]').click(),previewFiles,destroy(){disposed=true;operation++;task?.abort();win.cancelAnimationFrame(refreshFrame);unsubscribe();events.abort();clearScenes();urls.forEach(url=>URL.revokeObjectURL(url));}};
}
