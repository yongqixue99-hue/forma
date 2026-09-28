import {interpolateLab,color as parseColor} from 'd3';
import {themeFor} from './palettes.js';
import {entitySpec,multivariateGroupKey,withEntityIds} from './entity-identity.js';
import {populationId} from './data-identity.js';
const hex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const scalarTemplates=new Set('column bar pie donut mosaic waffle lollipop rose circlepack pareto funnel orbit unit'.split(' '));
const sampleTemplates=new Set('swarm boxplot violin raincloud errorbar halfeye deltaplot ecdfdiff andrews biplot lexis swimmer radviz'.split(' '));
export const valueColorTemplates=new Set(['heatmap','correlation','choropleth','clusterheatmap','histogram2d','density2d','adjacency','spectrogram']);
export function normalizeColorBindings(value){
 if(value===undefined)return undefined;
 if(!Array.isArray(value)||value.length>1500||value.some(r=>!r||typeof r.id!=='string'||!r.id||r.id.length>100000||!hex(r.color))||new Set(value.map(r=>r.id)).size!==value.length)return null;
 return value.map(r=>({id:r.id,color:r.color.toLowerCase()}));
}
export function normalizeValueColors(value){
 if(value===undefined)return undefined;
 if(!value||!['sequential','diverging'].includes(value.mode)||![value.low,value.middle,value.high].every(hex)||!Number.isFinite(value.center))return null;
 return {mode:value.mode,low:value.low.toLowerCase(),middle:value.middle.toLowerCase(),high:value.high.toLowerCase(),center:value.center};
}
export function colorSubjects(doc){
 if(valueColorTemplates.has(doc?.template))return [];
 const rows=doc?.data||[],spec=entitySpec(doc);
 if(doc?.template==='splom'){const identified=withEntityIds(doc,{legacyNamespace:'unmigrated-multivariate'});return [...new Set(rows.map(r=>r.group))].map(label=>({id:multivariateGroupKey(identified,label),label}));}
 // Map labels to existing entity IDs only to find their current render slots.
 // Binding keys are persistent entity/record IDs, never labels or row indices.
 if(spec&&doc.entities?.kind===spec.kind){const byName=new Map(doc.entities.items.map(e=>[e.name,e]));return [...new Set(rows.map(r=>r[spec.field]))].flatMap(name=>byName.has(name)?[{id:byName.get(name).id,label:name}]:[]);}
 if(sampleTemplates.has(doc?.template)&&rows.every(r=>r._id))return [...new Set(rows.map(r=>r.group))].map(label=>({id:populationId('sample-group',rows.filter(r=>r.group===label)),label}));
 if(scalarTemplates.has(doc?.template)&&rows.every(r=>r._id))return rows.map(r=>({id:r._id,label:String(r.label??r.period??r._id)}));
 return [];
}
export function resolveBoundColor(options,key,fallback){return options?.colorBindings?.find(r=>r.id===key)?.color||fallback;}
export function valueColorFor(options,value,domain,fallback){
 const scheme=normalizeValueColors(options?.valueColors);
 if(!scheme||!Number.isFinite(value)||!Array.isArray(domain)||domain.length!==2||!domain.every(Number.isFinite))return fallback;
 let [low,high]=domain;if(high<low)[low,high]=[high,low];
 const clamp=q=>Math.min(1,Math.max(0,q));let result;
 if(scheme.mode==='diverging'){
  // Symmetric colour distance from the explicit neutral reference. This does
  // not change chart coordinates, numerical values or the displayed legend.
  const extent=Math.max(Math.abs(low-scheme.center),Math.abs(high-scheme.center));
  if(!extent)return scheme.middle;
  result=interpolateLab(scheme.middle,value<scheme.center?scheme.low:scheme.high)(clamp(Math.abs(value-scheme.center)/extent));
 }else result=interpolateLab(scheme.low,scheme.high)(high===low?.5:clamp((value-low)/(high-low)));
 return parseColor(result).formatHex();
}
export function chartTheme(doc,options={}){
 const theme=themeFor(options.palette||'ink',options.dark??false,options.colors),subjects=colorSubjects(doc);
 if(options.colorBindings?.length&&subjects.length){
  const original=theme.color;theme.colors=Array.from({length:Math.max(theme.colors.length,subjects.length)},(_,i)=>resolveBoundColor(options,subjects[i]?.id,original(i)));
  theme.color=i=>theme.colors[((Math.trunc(i)||0)%theme.colors.length+theme.colors.length)%theme.colors.length];theme.custom=true;
 }
 // Native layouts may sort records, and native colour defaults may emphasise a
 // maximum. Resolve an explicit binding by identity at the mark, not its slot.
 const bindings=new Map((options.colorBindings||[]).map(r=>[r.id,r.color])),byName=new Map(subjects.map(r=>[r.label,r.id])),spec=entitySpec(doc);
 theme.objectColor=(rowOrId,fallback)=>{
  const id=typeof rowOrId==='string'?rowOrId:spec?rowOrId?.[spec.ref]??byName.get(rowOrId?.[spec.field]):rowOrId?._id;
  return bindings.get(id)||fallback;
 };
 // The display name only locates its current entity/population ID. It is never
 // persisted as a binding key; rename and row sorting leave identity intact.
 theme.groupColor=(name,fallback)=>bindings.get(byName.get(name))||fallback;
 theme.valueColor=(value,domain,fallback)=>valueColorFor(options,value,domain,fallback);
 return theme;
}
export function fixedColorBindings(doc,options){const theme=chartTheme(doc,options);return colorSubjects(doc).map((subject,i)=>({id:subject.id,color:resolveBoundColor(options,subject.id,theme.color(i))}));}
