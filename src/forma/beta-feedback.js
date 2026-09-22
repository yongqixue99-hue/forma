import {uiText as t,uiMarkup} from './locale.js';
import {escapeHtml as esc} from './data.js';
import './beta.css';

export function mountBetaFeedback(host){
  const win=host.ownerDocument.defaultView,events=new win.AbortController();
  let draft={},pending=false;try{draft=JSON.parse(win.sessionStorage.getItem('forma.feedback.draft')||'{}');}catch{}
  host.innerHTML=uiMarkup`<section class="beta-feedback"><p class="eyebrow">FORMA / FEEDBACK</p><h1>反馈</h1><p class="beta-lede">遇到问题，或有个建议？写在这里。</p><form data-beta-feedback><label>反馈标题<input name="title" maxlength="160" autocomplete="off" required value="${esc(draft.title||'')}"></label><label>反馈内容<textarea name="content" maxlength="6000" rows="9" required>${esc(draft.content||draft.problem||'')}</textarea></label><div class="beta-feedback-send"><button class="button dark" type="submit">发送反馈 ↗</button><a href="mailto:yongqixue99@gmail.com">yongqixue99@gmail.com</a></div><p data-beta-feedback-status role="status" aria-live="polite"></p></form></section>`;
  const form=host.querySelector('form'),button=form.querySelector('button'),status=form.querySelector('[role=status]');
  const fields=()=>({title:form.elements.title.value.trim(),content:form.elements.content.value.trim()});
  form.addEventListener('input',()=>{status.textContent='';try{win.sessionStorage.setItem('forma.feedback.draft',JSON.stringify(fields()));}catch{}},{signal:events.signal});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(pending||!form.reportValidity())return;
    const body=fields();if(!body.title||!body.content){status.textContent=t('请填写标题和内容。');return;}
    pending=true;button.disabled=true;button.textContent=t('正在发送…');
    try{
      const response=await win.fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:events.signal});
      const result=await response.json().catch(()=>null);
      if(!response.ok||result?.ok!==true){status.textContent=t(response.status===429?'发送太频繁，请稍等一分钟再试。':'暂时未能发送。内容已保留，请重试或点击邮箱联系。');return;}
      // Do not erase text the user edited while the request was in flight.
      if(JSON.stringify(fields())===JSON.stringify(body)){form.elements.title.value='';form.elements.content.value='';try{win.sessionStorage.removeItem('forma.feedback.draft');}catch{}}
      status.textContent=t('反馈已发送，谢谢。');
    }catch(error){if(error.name!=='AbortError')status.textContent=t('暂时未能发送。内容已保留，请重试或点击邮箱联系。');}
    finally{pending=false;button.disabled=false;button.textContent=t('发送反馈 ↗');}
  },{signal:events.signal});
  return {destroy(){events.abort();}};
}
