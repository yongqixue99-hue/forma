// A short-lived, tab-owned checkpoint. IndexedDB stores workbook bytes and large
// undo histories without competing with localStorage's small synchronous quota.
import {uiText} from './locale.js';
const NAME='forma.locale-session.v1',KEY='forma.locale.checkpoint';
const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('sessions',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function transaction(mode,fn){const db=await open();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction('sessions',mode);let result;
 const timeout=setTimeout(()=>{try{tx.abort();}catch{}reject(new Error(uiText('保存编辑现场超时，请重试。')));},10000);
 tx.oncomplete=()=>{clearTimeout(timeout);resolve(result);};tx.onabort=()=>{clearTimeout(timeout);reject(tx.error||new Error(uiText('编辑现场保存失败，请重试。')));};
 try{const r=fn(tx.objectStore('sessions'));if(r)r.onsuccess=()=>result=r.result;}catch(e){clearTimeout(timeout);tx.abort();reject(e);}
 });}finally{db.close();}}

export async function saveLocaleSession(value){
 const id=crypto.randomUUID(),at=Date.now(),payload=structuredClone(value),file=payload?.editor?.workspace?.importer?.file;
 // WebKit can stall an IndexedDB transaction containing a live File. Store its
 // bytes instead, and rebuild the File only when the importer is resumed.
 if(file instanceof Blob)payload.editor.workspace.importer.file={name:file.name,type:file.type,lastModified:file.lastModified,bytes:await file.arrayBuffer()};
 await transaction('readwrite',store=>{const r=store.openCursor();r.onsuccess=()=>{const c=r.result;if(c){if(at-c.value.at>86400000)c.delete();c.continue();}};store.put({id,at,value:payload});});
 // If this fails, do not reload: the caller still has its entire editing session.
 sessionStorage.setItem(KEY,id);return id;
}
export async function takeLocaleSession(){
 const id=sessionStorage.getItem(KEY);if(!id)return null;
 const result=await transaction('readonly',s=>s.get(id));
 if(!result||Date.now()-result.at>=86400000){await clearLocaleSession();return null;}
 return result&&Date.now()-result.at<86400000?result.value:null;
}
export async function clearLocaleSession(){const id=sessionStorage.getItem(KEY);if(id)await transaction('readwrite',s=>s.delete(id));sessionStorage.removeItem(KEY);}
const escapeSelector=value=>(globalThis.CSS||globalThis.window?.CSS).escape(value);
const address=node=>node.id?`#${escapeSelector(node.id)}`:[...node.attributes].filter(a=>a.name.startsWith('data-')&&!['data-state','data-active'].includes(a.name)).map(a=>`[${a.name}="${escapeSelector(a.value)}"]`).join('');
export function captureForm(root){
 if(!root)return null;
 return {fields:[...root.querySelectorAll('input:not([type=file]),textarea,select')].map(node=>({selector:address(node),value:node.value,checked:node.checked,focus:node===node.ownerDocument.activeElement,start:node.selectionStart,end:node.selectionEnd})).filter(r=>r.selector),details:[...root.querySelectorAll('details[id],details[class]')].map(node=>({selector:node.id?`#${escapeSelector(node.id)}`:`details.${[...node.classList].map(escapeSelector).join('.')}`,open:node.open})),scroll:[...root.querySelectorAll('[id], [class]')].filter(n=>n.scrollTop||n.scrollLeft).map(n=>({selector:n.id?`#${escapeSelector(n.id)}`:n.classList.length?'.'+[...n.classList].map(escapeSelector).join('.'):null,top:n.scrollTop,left:n.scrollLeft})).filter(r=>r.selector)};
}
export function restoreForm(root,state){
 if(!root||!state)return;
 for(const f of state.fields||[]){const n=root.querySelector(f.selector);if(!n||n.type==='file')continue;n.value=f.value;if('checked'in n)n.checked=f.checked;if(f.focus){n.focus({preventScroll:true});if(f.start!==null&&n.setSelectionRange)try{n.setSelectionRange(f.start,f.end);}catch{}}}
 for(const d of state.details||[]){const n=root.querySelector(d.selector);if(n)n.open=d.open;}
 for(const s of state.scroll||[]){const n=root.querySelector(s.selector);if(n){n.scrollTop=s.top;n.scrollLeft=s.left;}}
}
