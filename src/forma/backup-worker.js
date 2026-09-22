import {setLocale} from './locale.js';
import {backupBlob,readBackupFiles} from './work-backup.js';
self.onmessage=async({data})=>{
 setLocale(data.locale);
 const options={...(data.partBytes?{partBytes:data.partBytes}:{}),onProgress:value=>self.postMessage({type:'progress',value}),onReadRaw:value=>self.postMessage({type:'raw',value})};
 try{const value=await(data.action==='pack'?backupBlob(data.input,options):readBackupFiles(data.input,options));self.postMessage({type:'result',value});}
 catch(error){self.postMessage({type:'error',name:error.name,message:error.message});}
};
