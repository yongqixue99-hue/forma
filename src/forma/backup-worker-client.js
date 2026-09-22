import {locale,uiText,uiMarkup,uiMessage} from './locale.js';
// One worker per operation; termination also cancels CPU-bound ZIP/JSON work.
export function runBackupWorker(action,input,{signal,onProgress=()=>{},onReadRaw=()=>{},partBytes}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException(uiText('备份操作已取消'),'AbortError'));return;}
  let worker;try{worker=new Worker(new URL('./backup-worker.js',import.meta.url),{type:'module'});}catch(error){reject(error);return;}
  const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',abort);};
  const abort=()=>{cleanup();reject(new DOMException(uiText('备份操作已取消'),'AbortError'));};
  signal?.addEventListener('abort',abort,{once:true});
  worker.onerror=()=>{cleanup();reject(new Error(uiText('备份处理未完成，请重试；当前作品保持不变。')));};
  worker.onmessage=({data})=>{if(data.type==='progress'){onProgress(data.value);return;}if(data.type==='raw'){onReadRaw(data.value);return;}cleanup();if(data.type==='error'){const error=new Error(data.message);error.name=data.name;reject(error);}else resolve(data.value);};
  try{worker.postMessage({action,input,partBytes,locale:locale()});}catch(error){cleanup();reject(error);}
 });
}
