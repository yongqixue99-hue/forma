import {uiText,uiMarkup,uiMessage} from './locale.js';
import {runBackupWorker} from './backup-worker-client.js';
import {BACKUP_SET_LIMIT} from './work-store.js';
import {sha256} from './legacy-collections.js';

export const BACKUP_PART_BYTES=8*1024*1024;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const fail=message=>{throw new Error(message);};
const cancelled=signal=>{if(signal?.aborted)throw new DOMException(uiText('备份操作已取消'),'AbortError');};

export async function makeBackupSet(backup,{partBytes=BACKUP_PART_BYTES,signal,onProgress=()=>{}}={}){
  cancelled(signal);
  if(!Number.isInteger(partBytes)||partBytes<256||partBytes>BACKUP_PART_BYTES)fail(uiText('备份分卷尺寸无效。'));
  const bytes=encoder.encode(JSON.stringify(backup));
  if(bytes.length>BACKUP_SET_LIMIT)fail(uiText('本次完整备份超过 256 MiB，请先保留逐份作品备份；没有裁剪任何数据或历史。'));
  const files=new Map(),parts=[],id=crypto.randomUUID();
  for(let offset=0;offset<bytes.length;offset+=partBytes){
    cancelled(signal);const name=`part-${String(parts.length+1).padStart(4,'0')}.forma-part`,data=bytes.slice(offset,offset+partBytes);
    files.set(name,data);parts.push({name,bytes:data.length,sha256:await sha256(data)});onProgress(parts.length/Math.ceil(bytes.length/partBytes));
  }
  const manifest={kind:'forma-backup-set',version:1,id,bytes:bytes.length,sha256:await sha256(bytes),parts};
  files.set('manifest.json',encoder.encode(JSON.stringify(manifest)));return {manifest,files};
}

export async function readBackupSet(files,{signal,onProgress=()=>{}}={}){
  cancelled(signal);
  const raw=files.get('manifest.json');if(!raw||raw.byteLength>1024*1024)fail(uiText('缺少有效的分卷清单 manifest.json。'));
  let manifest;try{manifest=JSON.parse(decoder.decode(raw));}catch{fail(uiText('分卷清单不是有效的 UTF-8 JSON。'));}
  if(manifest.kind!=='forma-backup-set'||manifest.version!==1||!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.length>4096||!Number.isSafeInteger(manifest.bytes)||manifest.bytes<1||manifest.bytes>BACKUP_SET_LIMIT)fail(uiText('分卷清单格式或总容量无效。'));
  const names=new Set(),parts=[];let total=0;
  for(const [i,part] of manifest.parts.entries()){
    if(part.name!==`part-${String(i+1).padStart(4,'0')}.forma-part`||names.has(part.name)||!Number.isSafeInteger(part.bytes)||part.bytes<1||part.bytes>BACKUP_PART_BYTES)fail(uiText('分卷编号重复或尺寸无效。'));
    names.add(part.name);total+=part.bytes;if(total>manifest.bytes)fail(uiText('分卷容量与清单不一致。'));
    const data=files.get(part.name);if(!data)fail(uiMessage`缺少第 ${i+1} 卷，尚未恢复任何作品。`);
    cancelled(signal);if(data.length!==part.bytes||await sha256(data)!==part.sha256)fail(uiMessage`第 ${i+1} 卷校验失败，可能来自另一份备份；尚未恢复任何作品。`);
    parts.push(data);onProgress((i+1)/manifest.parts.length);
  }
  if(total!==manifest.bytes||files.size!==parts.length+1)fail(uiText('文件数量或总容量不符合清单，尚未恢复任何作品。'));
  const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  if(await sha256(bytes)!==manifest.sha256)fail(uiText('整份备份校验失败，尚未恢复任何作品。'));
  cancelled(signal);try{const backup=JSON.parse(decoder.decode(bytes));if(backup.kind!=='forma-local-backup'||![1,2,3].includes(backup.version))fail(uiText('不支持的备份格式。'));return backup;}catch{fail(uiText('备份内容无法完整解析，尚未恢复任何作品。'));}
}

export async function backupBlob(backup,options={}){
  if(typeof document!=='undefined'&&typeof Worker!=='undefined')return runBackupWorker('pack',backup,options);
  const {files,manifest}=await makeBackupSet(backup,options);cancelled(options.signal);
  const {zipSync}=await import('fflate');
  // STORE keeps packing bounded and avoids costly recompression of large histories.
  const archive=zipSync(Object.fromEntries(files),{level:0});
  return {blob:new Blob([archive],{type:'application/zip'}),filename:uiText('FORMA-全部作品.forma-backup.zip'),parts:manifest.parts.length,bytes:manifest.bytes};
}

export async function readBackupFiles(input,options={}){
  if(typeof document!=='undefined'&&typeof Worker!=='undefined')return runBackupWorker('read',Array.from(input),options);
  const files=Array.from(input),single=files.length===1?files[0]:null;
  if(!files.length)fail(uiText('请选择备份文件。'));
  if(single&&/\.zip$/i.test(single.name)){
    if(single.size>BACKUP_SET_LIMIT+1024*1024)fail(uiText('备份包超过 256 MiB。'));
    const {unzipSync}=await import('fflate');let total=0;const seen=new Set();
    const entries=unzipSync(new Uint8Array(await single.arrayBuffer()),{filter(entry){
      if(seen.has(entry.name)||!(/^(manifest\.json|part-\d{4}\.forma-part)$/.test(entry.name)))fail(uiText('备份包包含重复或不支持的文件。'));
      seen.add(entry.name);const limit=entry.name==='manifest.json'?1024*1024:BACKUP_PART_BYTES;
      total+=entry.originalSize;if(entry.originalSize>limit||total>BACKUP_SET_LIMIT+1024*1024||seen.size>4097)fail(uiText('备份解包容量超出限制。'));
      return true;
    }});
    return readBackupSet(new Map(Object.entries(entries)),options);
  }
  if(files.some(f=>f.name==='manifest.json'||/\.forma-part$/i.test(f.name))){
    const map=new Map();let total=0;for(const file of files){cancelled(options.signal);if(map.has(file.name)||file.size>BACKUP_PART_BYTES)fail(uiText('分卷重复或超出尺寸。'));total+=file.size;if(total>BACKUP_SET_LIMIT+1024*1024)fail(uiText('分卷总容量超出限制。'));map.set(file.name,new Uint8Array(await file.arrayBuffer()));}
    return readBackupSet(map,options);
  }
  if(!single||single.size>BACKUP_SET_LIMIT)fail(uiText('请选择一个作品文件，或一整套分卷文件（最多 256 MiB）。'));
  try{const raw=await single.text(),value=JSON.parse(raw);options.onReadRaw?.(raw);return value;}catch{fail(uiText('文件不是有效的 JSON，尚未恢复任何作品。'));}
}
