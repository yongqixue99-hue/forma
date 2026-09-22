import {validateDocument} from './data.js';
import {withRecordIds} from './data-identity.js';
import {createEditorModel} from './editor-model.js';

export const SYNC_HISTORY_LIMIT=5;
const id=value=>typeof value==='string'&&/^[a-zA-Z0-9:_-]{1,100}$/.test(value);
const clone=value=>structuredClone(value);
// History is browser-local recovery data, deliberately outside exported works.
// Bad recovery metadata must not make otherwise valid projects unreadable.
export function cleanSyncHistory(input,workId){
  if(!Array.isArray(input))return [];
  const seen=new Set();
  return input.filter(t=>{
    try{
      if(!id(t.id)||seen.has(t.id)||t.workId!==workId||!id(t.sourceId)||!Number.isFinite(t.createdAt)||!Number.isFinite(new Date(t.createdAt).getTime())||typeof t.sourceTitle!=='string'||t.sourceTitle.length>500)return false;
      if(!Array.isArray(t.entries)||!t.entries.length||t.entries.length>20||new Set(t.entries.map(e=>e.id)).size!==t.entries.length)return false;
      for(const e of t.entries){
        if(!id(e.id)||!validateDocument(e.before?.doc).dataValid||typeof e.after!=='string')return false;
        const after=JSON.parse(e.after);if(!Array.isArray(after)||after.length!==2||!validateDocument(after[0]).dataValid)return false;
        // Sync only accepts complete target documents; optional old drafts are
        // retained verbatim after basic shape checks, never executed as code.
        if(e.before.draft&&(!Array.isArray(e.before.draft.cells)||!e.before.draft.meta))return false;
      }
      seen.add(t.id);return true;
    }catch{return false;}
  }).slice(0,SYNC_HISTORY_LIMIT).map(clone);
}
export function cleanSyncHistories(input,workIds,works=[]){
  const latest=new Map(works.map(work=>[work.id,work]));
  return Object.fromEntries([...workIds].map(workId=>[workId,cleanSyncHistory(input?.[workId],workId).map(transaction=>{
    // Existing browser histories predate entity registries. Migrate their
    // snapshots with the same namespace as the corresponding saved step.
    for(const entry of transaction.entries){
      const step=latest.get(workId)?.steps.find(s=>s.id===entry.id);if(!step)continue;
      const migrate=(doc,draft)=>{const next=withRecordIds(doc,{legacyNamespace:step.dataGroup});return [next,draft?createEditorModel(next,draft).snapshot:null];};
      const [before,draft]=migrate(entry.before.doc,entry.before.draft);entry.before={doc:before,...(draft?{draft}:{})};
      const [after,afterDraft]=JSON.parse(entry.after);entry.after=JSON.stringify(migrate(after,afterDraft));
    }
    return transaction;
  })]).filter(([,history])=>history.length));
}
export function hasInvalidSyncHistory(input,workIds){
  if(input===undefined)return false;
  if(!input||typeof input!=='object'||Array.isArray(input))return true;
  return [...workIds].some(workId=>input[workId]!==undefined&&(!Array.isArray(input[workId])||cleanSyncHistory(input[workId],workId).length!==Math.min(input[workId].length,SYNC_HISTORY_LIMIT)));
}
