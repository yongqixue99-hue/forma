import {uiText,uiMarkup,uiMessage} from './locale.js';
import {escapeHtml as esc} from './data.js';

/** An input occupies the clicked label/mark. Values commit on Enter or blur. */
export function openChartInlineEditor({target,container,fields,onCommit,onClose}){
  const form=document.createElement('form');form.className='dw-inline-editor';form.setAttribute('aria-label',uiText('图上原位编辑'));
  const textTarget=target.tagName.toLowerCase()==='text'||target.hasAttribute('data-edit-meta'),title=target.dataset.editMeta==='title';
  form.classList.toggle('dw-inline-title',title);
  form.innerHTML=uiMarkup`<div class="dw-inline-fields">${fields.map((f,i)=>`<label>${fields.length>1?`<span>${esc(f.label)}</span>`:''}<input data-inline-index="${i}" aria-label="${esc(f.label)}" value="${esc(f.value)}" ${f.numeric?'inputmode="decimal"':''} ${f.maxlength?`maxlength="${f.maxlength}"`:''} autocomplete="off"></label>`).join('')}<button type="submit" aria-label="确认原位编辑" title="确认">✓</button></div><p class="dw-inline-error" role="status"></p>`;
  let open=true,blurTimer;
  function place(){if(!open)return;const box=target.getBoundingClientRect(),base=container.getBoundingClientRect(),available=container.clientWidth||base.width||600;
    const desired=fields.length>1?Math.min(340,fields.length*125):Math.max(title?260:135,box.width+(title?35:48));const width=Math.min(desired,available-32);
    form.style.width=`${width}px`;form.style.left=`${Math.max(16,Math.min(box.left-base.left,available-width-16))}px`;
    form.style.top=`${Math.max(3,box.top-base.top+container.scrollTop-(title?0:6))}px`;
  }
  function close(){if(!open)return;open=false;clearTimeout(blurTimer);target.classList.remove('dw-inline-editing');form.remove();window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true);onClose?.();}
  function commit(){if(!open)return true;const values=[...form.querySelectorAll('input')].map(el=>el.value);
    try{const error=onCommit(values);if(error){form.querySelector('.dw-inline-error').textContent=error;form.querySelectorAll('input').forEach(el=>el.setAttribute('aria-invalid','true'));return false;}close();return true;}
    catch(error){form.querySelector('.dw-inline-error').textContent=error.message;return false;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();e.stopPropagation();commit();});
  form.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();if(target.isConnected)target.focus();}});
  form.addEventListener('input',()=>{form.querySelector('.dw-inline-error').textContent='';form.querySelectorAll('input').forEach(el=>el.removeAttribute('aria-invalid'));});
  form.addEventListener('focusout',()=>{clearTimeout(blurTimer);blurTimer=setTimeout(()=>{if(open&&!form.contains(document.activeElement))commit();},0);});
  container.append(form);place();if(textTarget)target.classList.add('dw-inline-editing');window.addEventListener('resize',place);document.addEventListener('scroll',place,true);form.querySelector('input').focus();form.querySelector('input').select();
  return{close,commit,get active(){return open;}};
}
