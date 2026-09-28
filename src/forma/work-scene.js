import {comparisonColorKeys} from './comparison-series-rules.js';
import {networkColorKeys} from './network-series-rules.js';
import {structuralColorKeys} from './structural-series-rules.js';
import {businessSeriesColorKeys} from './business-series-rules.js';
import {uiText,uiMarkup,uiMessage} from './locale.js';
import {applyChartBrand} from './brand-view.js';
import {annotateScene} from './annotation-view.js';
import {validateDocument} from './data.js';
import {recordId,populationId} from './data-identity.js';
import {entityKey} from './entity-identity.js';
import {workRenderers} from './work-renderers.js';
import {isScientificView} from './scientific-rules.js';
import {isPairedView,isHierarchyView,isRelationalView} from './relational-rules.js';
import {isSeriesView} from './series-rules.js';
import {findTemplate} from './catalog.js';
import {viewName,viewIcon} from './morph-sequence-player.js';
import {morphDocument,stepMorphDocument,morphReady,stepView,relatedSteps} from './work-model.js';

export const stepName=step=>step.view?viewName(step.view):findTemplate(step.doc.template).name;
export const stepIcon=step=>viewIcon(stepView(step)||'columns');

export function createStepScene(host,step,options={}){
  if(options.nativeChart||!morphReady(step)){const report=validateDocument(step.doc);if(!report.valid){host.replaceChildren();const message=host.ownerDocument.createElement('p');message.className='we-render-error';message.textContent=report.errors[0];host.append(message);return {render(){},destroy(){host.replaceChildren();}};}if(!workRenderers.native)throw new Error(uiText('此网页未包含新图型的渲染器，请在 FORMA 中打开作品并重新导出。'));const scene=new workRenderers.native(host,step.doc,{...step.options,...options});applyChartBrand(scene.svg,{...step.options,...options});return scene;}
  const family=isScientificView(stepView(step))?'scientific':isPairedView(stepView(step))?'paired':isHierarchyView(stepView(step))?'hierarchy':isSeriesView(stepView(step))?'series':'single',Renderer=workRenderers[family];
  if(!Renderer)throw new Error(uiText('此网页未包含新图型的渲染器，请在 FORMA 中打开作品并重新导出。'));
  const scene=new Renderer(host,stepMorphDocument(step),{...step.options,...options,view:stepView(step)});
  if(options.editable&&!isScientificView(stepView(step))&&!isSeriesView(stepView(step))&&!isRelationalView(stepView(step)))for(const [key,item] of scene.nodes){const index=step.doc.data.findIndex(r=>recordId(r)===key);if(index<0)continue;item.group.dataset.editRow=index;item.group.dataset.editField='value';item.group.setAttribute('role','button');item.group.setAttribute('tabindex','0');}
  scene.render(options.progress??1);
  // A renderer may use canonical field aliases; editing must address the
  // original table, including native forest lower/upper interval fields.
  if(options.editable){const fields=new Set(findTemplate(step.doc.template).fields.map(f=>f[0]));for(const mark of host.querySelectorAll('[data-edit-field]')){const field=mark.dataset.editField,alias=step.doc.template==='surface3d'&&field==='z'?'value':step.doc.template==='forest'?({low:'lower',high:'upper'})[field]:null;if(alias&&fields.has(alias))mark.dataset.editField=alias;else if(!fields.has(field)){delete mark.dataset.editRow;delete mark.dataset.editField;mark.removeAttribute('role');}else mark.setAttribute('tabindex','0');}}
  applyChartBrand(scene.svg,{...step.options,...options});return annotateScene(scene,step,{...step.options,...options});
}

export function workColorMap(step,steps){
  const colors=new Map();
  for(const s of relatedSteps(step,steps)){
    const doc=stepMorphDocument(s),rows=doc?.data||[];
    const keys=doc?.family?.startsWith('comparison-')?comparisonColorKeys(doc):doc?.family?.startsWith('network-')?networkColorKeys(doc):['matrix-cell','contingency','hierarchy-tree'].includes(doc?.family)?structuralColorKeys(doc):doc?.family?.startsWith('business-')?businessSeriesColorKeys(doc):['samples','spatial','distribution','frequency-response','statistical-observations','statistical-survival'].includes(doc?.family)
      ? [...new Set(rows.map(r=>r.group))].map(group=>populationId(doc.family==='spatial'?'exploratory-group':'sample-group',rows.filter(r=>r.group===group)))
      : doc?.family==='evaluation'?rows.map(r=>entityKey(r,'model')):rows.map(r=>r.parent?entityKey(r,'parent'):r.series?entityKey(r,'series'):r.group||recordId(r));
    for(const key of keys)if(!colors.has(key))colors.set(key,colors.size);
  }
  return colors;
}
