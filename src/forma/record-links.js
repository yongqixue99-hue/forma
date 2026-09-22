import {uiText,uiMarkup,uiMessage} from './locale.js';
import {createElement,ArrowLeft,ArrowRight,Copy,X} from 'lucide';
import {multivariateVariables,multivariateSelectedPair} from './multivariate-rules.js';
import {toClipboardTSV} from './sheet-range.js';

// Summary marks refer to a set of persistent record IDs. This is a viewing
// selection, separate from the rectangular sheet selection used for edits.
export function mountRecordLinks(host,{getScope,getRecordIds,getCells,getHeaders,focusRow,copyText,getDoc=()=>null,onInspect=()=>{},prepare=()=>{},revealRow=()=>{}}){
  const doc=host.ownerDocument;let selection=null,hover=null,scope=getScope(),bar=null,alive=true;
  const markIDs=mark=>{try{return JSON.parse(mark.dataset.recordIds).filter(id=>typeof id==='string');}catch{return [];}};
  const rowMap=()=>new Map(getRecordIds().map((id,i)=>[id,i]).filter(([id])=>typeof id==='string'));
  const markKey=mark=>mark.dataset.morphKey||JSON.stringify(markIDs(mark));
  const summaryMarks=()=>[...host.querySelectorAll('[data-record-ids]')].filter(m=>m.getAttribute('aria-hidden')!=='true');
  function ensureBar(){
    if(bar?.isConnected)return;
    const grid=host.querySelector('#dw-grid');if(!grid)return;
    bar=doc.createElement('div');bar.className='dw-record-links';bar.hidden=true;bar.setAttribute('aria-label',uiText('关联的原始记录'));
    const info=doc.createElement('div'),title=doc.createElement('strong'),position=doc.createElement('span');title.dataset.recordTitle='';position.dataset.recordPosition='';title.setAttribute('role','status');title.setAttribute('aria-live','polite');const measurements=doc.createElement('div');measurements.dataset.recordMeasurements='';info.append(title,position,measurements);bar.append(info);
    const actions=doc.createElement('div');actions.className='dw-record-actions';
    for(const [action,label,Icon,text] of [['previous',uiText('上一条关联记录'),ArrowLeft],['next',uiText('下一条关联记录'),ArrowRight],['copy',uiText('复制这些原始行，包含表头'),Copy,uiText('复制关联行')],['clear',uiText('清除关联'),X]]){
      const button=doc.createElement('button');button.type='button';button.className=text?'text-button':'icon-button';button.dataset.recordAction=action;button.title=label;button.setAttribute('aria-label',label);
      button.append(createElement(Icon,{width:14,height:14,'aria-hidden':'true'}));if(text)button.append(doc.createTextNode(text));actions.append(button);
    }
    bar.append(actions);grid.before(bar);
  }
  function rowsForSelection(){const indices=rowMap();return (selection?.ids||[]).filter(id=>indices.has(id)).map(id=>({id,row:indices.get(id)})).sort((a,b)=>a.row-b.row);}
  function paint(){
    if(!alive)return;ensureBar();if(!bar)return;
    const indices=rowMap(),ids=new Set(selection?.ids||hover||[]),rows=new Set([...ids].map(id=>indices.get(id)));
    host.querySelectorAll('[data-dw-row]').forEach(el=>el.classList.toggle('dw-related-row',rows.has(Number(el.dataset.dwRow))));
    host.querySelectorAll('[data-edit-row]').forEach(el=>el.classList.toggle('dw-related-mark',rows.has(Number(el.dataset.editRow))));
    for(const mark of summaryMarks()){const selected=markIDs(mark).some(id=>ids.has(id));mark.classList.toggle('dw-related-mark',selected);if(mark.getAttribute('role')==='button')mark.setAttribute('aria-pressed',String(!!selection&&markIDs(mark).some(id=>selection.ids.includes(id))));}
    const linked=rowsForSelection();bar.hidden=!linked.length;
    if(!linked.length)return;
    let index=linked.findIndex(r=>r.id===selection.current);if(index<0){index=0;selection.current=linked[0].id;}
    const title=bar.querySelector('[data-record-title]'),label=uiMessage`${selection.label} · ${linked.length} 条原始记录`;if(title.textContent!==label)title.textContent=label;
    bar.querySelector('[data-record-position]').textContent=uiMessage`第 ${index+1} / ${linked.length} 条 · 表格第 ${linked[index].row+1} 行`;
    for(const action of ['previous','next']){const button=bar.querySelector(`[data-record-action="${action}"]`);button.disabled=linked.length<2;button.hidden=!!selection.sampleId;}
    const measurements=bar.querySelector('[data-record-measurements]');bar.querySelector('[data-record-position]').hidden=!!selection.sampleId;
    const current=getDoc(),variables=selection.sampleId&&current?.template==='splom'?multivariateVariables(current):[];
    const entries=variables.length?selection.ids.map((id,i)=>{const row=indices.get(id),record=current.data.find(r=>r._id===id),variable=variables.find(v=>v.id===record?._variableId);return {id,text:`${i?'Y':'X'} · ${variable?.label||''}: ${record?.value??'—'} · ${uiMessage`表格第 ${row+1} 行`}`};}):[];
    // Keep focused row buttons alive when values, labels, or pagination change.
    if(measurements.children.length!==entries.length)measurements.replaceChildren(...entries.map(()=>{const b=doc.createElement('button');b.type='button';return b;}));
    entries.forEach((entry,i)=>{const b=measurements.children[i];b.dataset.recordLocate=entry.id;b.textContent=entry.text;b.title=uiText('定位原始测量');});
  }
  function refresh(){
    if(scope!==getScope()){scope=getScope();selection=null;hover=null;}
    if(selection){
      const marks=summaryMarks(),live=rowMap(),surviving=selection.originIds.filter(id=>live.has(id));
      // Deleting rows may change a summary's population key. Keep a viewing
      // selection only when exactly the surviving population has one matching
      // statistical role. Never follow names, a subset, or an ambiguous merge.
      const candidates=surviving.length<selection.originIds.length?marks.filter(m=>m.dataset.scienceRole===selection.role&&(()=>{const ids=markIDs(m);return ids.length===surviving.length&&ids.every(id=>surviving.includes(id));})()):[];
      const pair=selection.sampleId&&getDoc()?.template==='splom'?multivariateSelectedPair(getDoc()):null;
      const mark=pair?marks.find(m=>m.dataset.sampleId===selection.sampleId&&m.dataset.variableX===pair[0]&&m.dataset.variableY===pair[1]):marks.find(m=>markKey(m)===selection.originKey)||marks.find(m=>markKey(m)===selection.key)||(candidates.length===1?candidates[0]:null);
      if(mark){selection.key=markKey(mark);selection.ids=markIDs(mark);selection.label=mark.dataset.recordLabel||uiText('统计摘要');}
      else selection=null;
    }
    paint();
  }
  function choose(mark,{locate=true}={}){
    prepare();selection={key:markKey(mark),originKey:markKey(mark),sampleId:mark.dataset.sampleId,role:mark.dataset.scienceRole,originIds:markIDs(mark),ids:markIDs(mark),label:mark.dataset.recordLabel||uiText('统计摘要')};hover=null;
    const rows=rowsForSelection();if(!rows.length){selection=null;paint();return;}
    selection.current=rows[0].id;onInspect();if(locate){if(selection.sampleId)revealRow(rows[0].row);else focusRow(rows[0].row);}paint();
  }
  async function onClick(event){
    const mark=event.target.closest('[data-record-ids]');if(mark&&mark.getAttribute('aria-hidden')!=='true'){choose(mark);return;}
    const locate=event.target.closest('[data-record-locate]')?.dataset.recordLocate;if(locate){const row=rowMap().get(locate);if(row!==undefined){selection.current=locate;focusRow(row);paint();}return;}
    const action=event.target.closest('[data-record-action]')?.dataset.recordAction;if(!action)return;
    if(action==='clear'){const origin=summaryMarks().find(m=>markKey(m)===selection?.key);selection=null;hover=null;paint();origin?.focus({preventScroll:true});return;}
    const rows=rowsForSelection();if(!rows.length)return;
    if(action==='copy'){const cells=getCells();await copyText(toClipboardTSV([getHeaders(),...rows.map(r=>cells[r.row])]));return;}
    const index=Math.max(0,rows.findIndex(r=>r.id===selection.current)),next=rows[(index+(action==='next'?1:-1)+rows.length)%rows.length];
    selection.current=next.id;focusRow(next.row);paint();
  }
  function onKey(event){
    const mark=event.target.closest('[data-record-ids]');
    if(mark&&mark.getAttribute('aria-hidden')!=='true'&&['Enter',' '].includes(event.key)){event.preventDefault();choose(mark);}
  }
  function onHover(event){
    const mark=event.target.closest('[data-record-ids]'),row=event.target.closest('[data-dw-row]'),raw=event.target.closest('[data-edit-row]');
    hover=mark&&mark.getAttribute('aria-hidden')!=='true'?markIDs(mark):row||raw?[getRecordIds()[Number(row?.dataset.dwRow??raw.dataset.editRow)]]:null;paint();
  }
  function clearHover(){hover=null;paint();}
  host.addEventListener('click',onClick);host.addEventListener('keydown',onKey);host.addEventListener('pointerover',onHover);host.addEventListener('pointerleave',clearHover);
  return {refresh,choose,capture:()=>selection?{scope,selection:structuredClone(selection)}:null,restore(state){if(state?.scope===getScope()){selection=structuredClone(state.selection);refresh();}},destroy(){alive=false;bar?.remove();host.removeEventListener('click',onClick);host.removeEventListener('keydown',onKey);host.removeEventListener('pointerover',onHover);host.removeEventListener('pointerleave',clearHover);}};
}
