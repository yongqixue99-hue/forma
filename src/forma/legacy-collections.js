import {cleanWork,workFromSequence} from './work-model.js';

export const LEGACY_COLLECTION_KEYS=['forma.editor.v1','forma.documents.v1','forma.morph-sequences.v1'];
export const sha256=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value))].map(v=>v.toString(16).padStart(2,'0')).join('');
const timestamp=value=>Number.isFinite(value)?value:Number.isFinite(Date.parse(value))?Date.parse(value):0;

// Source slots only locate missing legacy IDs during this one-time migration.
// They never become chart-object IDs or a way to match independent observations.
export async function inspectLegacyCollection(key,raw){
  const warnings=[],entries=[];let input;
  try{input=JSON.parse(raw);}catch{return {entries,warnings:['旧文件无法解析，原文已保留。']};}
  const sequence=key==='forma.morph-sequences.v1';
  if(sequence){
    if(!Array.isArray(input?.projects)){warnings.push('旧组合列表格式异常，原文已保留。');}
    input=[...(Array.isArray(input?.projects)?input.projects:[]),...(input?.draft?[input.draft]:[])];
  }
  if(!Array.isArray(input))return {entries,warnings:['旧列表格式异常，原文已保留。']};
  for(const [index,item] of input.entries()){
    try{
      const sourceId=sequence?item?.id:key==='forma.editor.v1'?item?.key:item?.id;
      const itemKey=sourceId===undefined||sourceId===null||sourceId===''?`missing-id:${index}`:String(sourceId);
      let work;
      if(sequence)work=workFromSequence(item);
      else{
        if(!item?.doc)throw new Error('缺少图表数据');
        const prefix=key==='forma.editor.v1'?'record:':'chart:';
        const candidate=prefix+itemKey,id=/^[a-zA-Z0-9:_-]{1,90}$/.test(candidate)?candidate:`legacy:${(await sha256(key+'\0'+itemKey)).slice(0,48)}`;
        const group=`legacy:${(await sha256(id)).slice(0,32)}`;
        work=cleanWork({kind:'forma-work',version:1,id,name:String(item.doc.title||'旧图表').slice(0,80),updated:timestamp(item.updated),activeStep:`${id}:0`,steps:[{id:`${id}:0`,doc:item.doc,options:item.options||{},dataGroup:group,relation:'auto',scale:'shared',transition:'auto',duration:1500,hold:2200,...(item.draft?{draft:item.draft}:{})}]});
        if(item.draft&&JSON.stringify(work.steps[0].draft?.cells)!==JSON.stringify(item.draft.cells))throw new Error('草稿结构无法完整恢复，请从迁移原文核对');
      }
      if(itemKey.startsWith('missing-id:'))warnings.push(`第 ${index+1} 项缺少旧编号，已分配迁移编号并保留原文。`);
      entries.push({work,itemKey,saved:key!=='forma.editor.v1',fingerprint:await sha256(JSON.stringify({...work,updated:0}))});
    }catch(error){warnings.push(`第 ${index+1} 项：${error.message}`);}
  }
  return {entries,warnings};
}
