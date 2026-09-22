import {findTemplate} from './catalog.js';
import {getDataGuide} from './data-guides.js';
import {validateDocument} from './data.js';
import {newWork,cleanWork,workReport,stepReport,transitionPlan,transitionChoices,STEP_LIMIT} from './work-model.js';
import {importedTableDocument} from './table-data.js';
import {annotationWarnings} from './annotations.js';
import {palettes} from './palettes.js';
import {cleanOptions} from './project-file.js';
export const API_VERSION=1;
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v),clone=v=>structuredClone(v);
const invalid=(path,message,code='invalid')=>{throw Object.assign(new Error(message),{path,code});};
function keys(value,allowed,path){if(!plain(value))invalid(path,'Expected an object');for(const key of Object.keys(value))if(!allowed.includes(key))invalid(`${path}.${key}`,'Unknown field','unknown_field');}
function checkedOptions(value,path){
 if(value===undefined)return {};
 keys(value,['palette','dark','ratio','duration','colors','colorBindings','valueColors','brand','annotations','colorMode','camera3d','exportSettings'],path);
 if(value.palette!==undefined&&!Object.hasOwn(palettes,value.palette))invalid(path+'.palette','Unknown palette');
 if(value.ratio!==undefined&&!['wide','landscape','square','portrait','story'].includes(value.ratio))invalid(path+'.ratio','Unknown canvas ratio');
 if(value.duration!==undefined&&![5,8,12].includes(value.duration))invalid(path+'.duration','Native duration must be 5, 8 or 12 seconds');
 if(value.dark!==undefined&&typeof value.dark!=='boolean')invalid(path+'.dark','Expected boolean');
 if(value.colorMode!==undefined&&!['categorical','emphasis'].includes(value.colorMode))invalid(path+'.colorMode','Expected categorical or emphasis');
 if(value.colors!==undefined&&(!Array.isArray(value.colors)||value.colors.length<1||value.colors.length>12||value.colors.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))))invalid(path+'.colors','Supply 1–12 six-digit hex colors');
 if(value.camera3d!==undefined){keys(value.camera3d,['azimuth','elevation'],path+'.camera3d');for(const key of ['azimuth','elevation'])if(!Number.isFinite(value.camera3d[key]))invalid(path+'.camera3d.'+key,'Expected a finite number');}
 if(value.exportSettings!==undefined){
  keys(value.exportSettings,['format','ratio','longEdge','fps','duration','hold','transparent','chartOnly','frame','pptxMode'],path+'.exportSettings');
  const normalized=cleanOptions(value).exportSettings;
  for(const [key,setting]of Object.entries(value.exportSettings))if(setting!==normalized[key])invalid(path+'.exportSettings.'+key,'Unsupported export setting');
 }
 cleanOptions(value);
 return clone(value);
}
function documentFor(step,path){
 const t=findTemplate(step.chart);if(!t)invalid(path+'.chart','Unknown chart ID','unknown_chart');
 if(step.document!==undefined){if(step.table!==undefined||step.metadata!==undefined||step.parameters!==undefined)invalid(path,'Use document OR table/metadata/parameters');if(step.document?.template!==step.chart)invalid(path+'.document.template','Document template must match chart');return clone(step.document);}
 keys(step.metadata,['title','subtitle','unit','source'],path+'.metadata');
 if(!plain(step.table))invalid(path+'.table','Supply headers, rows and explicit mapping');
 keys(step.table,['headers','rows','mapping','idColumn'],path+'.table');
 const {headers,rows,mapping,idColumn=-1}=step.table;
 if(!Array.isArray(headers)||!headers.length||headers.length>32||headers.some(h=>typeof h!=='string'))invalid(path+'.table.headers','Supply 1–32 text headers');
 if(!Array.isArray(rows)||!rows.length||rows.length>1500||rows.some(r=>!Array.isArray(r)||r.length!==headers.length||r.some(v=>v!==null&&typeof v!=='string'&&(typeof v!=='number'||!Number.isFinite(v)))))invalid(path+'.table.rows','Supply 1–1500 rectangular rows of strings, finite numbers or null');
 keys(mapping,t.fields.map(f=>f[0]),path+'.table.mapping');
 for(const [key]of t.fields)if(!Number.isInteger(mapping[key]))invalid(path+'.table.mapping.'+key,'Explicit zero-based column index required','mapping');
 const parameters=step.parameters||{},required=getDataGuide(step.chart).parameters.map(p=>p.key);
 keys(parameters,required,path+'.parameters');
 for(const key of required)if(!Object.hasOwn(parameters,key))invalid(path+'.parameters.'+key,'Set this chart parameter explicitly; see chart contract','parameter_required');
 const doc={...clone(parameters),version:1,template:step.chart,title:step.metadata.title,subtitle:step.metadata.subtitle||'',unit:step.metadata.unit,source:{type:'user',name:step.metadata.source},data:[]};
 const table={headers,rows:rows.map(r=>r.map(v=>v===null?'':String(v)))};
 const result=importedTableDocument(doc,table,t.fields.map(f=>mapping[f[0]]),{idColumn});
 result.doc.source=clone(doc.source);return result.doc;
}
/** Pure configuration, shared by browser UI, public module and Node helper.
 * Never writes storage, fetches source URLs or executes dataset contents. */
export function validate(input){
 const errors=[],warnings=[];let work;
 try{
  if(new TextEncoder().encode(JSON.stringify(input)).length>8000000)invalid('$','Configuration exceeds 8 MB','size');
  if(input?.kind==='forma-work'){work=cleanWork(input);}
  else{
   keys(input,['kind','version','name','steps'],'$');
   if(input.kind!=='forma-agent-request'||input.version!==API_VERSION)invalid('$.version','Expected forma-agent-request version 1','version');
   if(typeof input.name!=='string'||!input.name.trim()||input.name.length>80)invalid('$.name','Supply a work name of 1–80 characters');
   if(!Array.isArray(input.steps)||!input.steps.length||input.steps.length>STEP_LIMIT)invalid('$.steps',`Supply 1–${STEP_LIMIT} steps`);
   const records=[];
   for(const [i,s]of input.steps.entries()){
    const path=`$.steps[${i}]`;
    try{
     keys(s,['chart','document','table','metadata','parameters','options','view','transition','duration','hold','dataGroup','relation','scale'],path);
     const doc=documentFor(s,path),report=validateDocument(doc);if(!report.dataValid){report.errors.forEach(message=>errors.push({path:path+'.document',code:'data',message}));continue;}
     const options=checkedOptions(s.options,path+'.options');
     if(s.transition!==undefined&&!transitionChoices.some(([id])=>id===s.transition))invalid(path+'.transition','Unknown transition');
     for(const [k,min,max]of [['duration',600,5000],['hold',500,12000]])if(s[k]!==undefined&&(!Number.isFinite(s[k])||s[k]<min||s[k]>max))invalid(path+'.'+k,`Use ${min}–${max} milliseconds`);
     records.push({...clone(s),doc,options});
    }catch(e){errors.push({path:e.path||path,code:e.code||'invalid',message:e.message});}
   }
   if(errors.length)return {version:API_VERSION,valid:false,errors,warnings};
   work=newWork(records,input.name);
  }
  for(const [i,step]of work.steps.entries()){
   const report=stepReport(step);if(!report.valid)errors.push({path:`$.steps[${i}]`,code:'layout',message:report.errors?.[0]||report.cellErrors?.[0]?.message||'Unsupported data for this view'});
   for(const warning of annotationWarnings(step))warnings.push({path:`$.steps[${i}].options.annotations`,code:'annotation',message:warning.reason});
   if(i){const plan=transitionPlan(work.steps[i-1],step,{steps:work.steps});if(step.transition!=='auto'&&['smooth','arc','turn','cascade'].includes(step.transition)&&plan.mode!=='morph')errors.push({path:`$.steps[${i}].transition`,code:'correspondence',message:'Requested morph needs compatible data, identities and units. Use auto or an entrance.'});}
  }
 }catch(e){errors.push({path:e.path||'$',code:e.code||'invalid',message:e.message});}
 return {version:API_VERSION,valid:errors.length===0,errors,warnings,...(!errors.length?{work}:{})};
}
export function configure(input){const report=validate(input);if(!report.valid)throw Object.assign(new Error(report.errors.map(e=>`${e.path}: ${e.message}`).join('\n')),{report});return report.work;}
export function serialize(input){return JSON.stringify(configure(input),null,2);}
export const capabilities=()=>({version:API_VERSION,inputKinds:['forma-agent-request','forma-work'],maxSteps:STEP_LIMIT,maxBytes:8000000,palettes:Object.keys(palettes),ratios:['wide','landscape','square','portrait','story'],storage:'none',network:'none',output:'forma-work version 1'});

export {prepareReportUpdate,createNextReport} from './work-repeat.js';
