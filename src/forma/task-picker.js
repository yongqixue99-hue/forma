import {locale,isEnglish} from './locale.js';
import {recommendationGoals,chartUseCases} from './chart-use-cases.js';
import {findTemplate,getExample} from './catalog.js';
import {escapeHtml as esc} from './data.js';
import {recommendForTask,taskTable} from './task-recommendations.js';
import {textSource} from './source-table.js';
import {openDataImporter} from './data-importer.js';
import './task-picker.css';
const text=(zh,en)=>isEnglish()?en:zh;
export function mountTaskPicker(host,{onGoal=()=>{},onUse=()=>{},initialGoal='all'}={}){
 let table=null,goal=initialGoal,importer=null,disposed=false;
 host.innerHTML=`<div class="task-picker-head"><label>${text('你想说明什么？','What do you want to show?')}<select data-task-goal><option value="all">${text('选择任务','Choose a task')}</option>${Object.entries(recommendationGoals).map(([id,n])=>`<option value="${id}">${esc(n[locale()])}</option>`).join('')}</select></label><details data-task-input><summary>${text('根据我的表格选图','Match my table')}</summary><label class="task-table-label">${text('粘贴 CSV 或 Excel 表格，首行为列名','Paste CSV or an Excel table, including column headers')}<textarea data-task-table rows="4" spellcheck="false" placeholder="category,value"></textarea></label><div><button class="button small" data-task-analyze>${text('查看推荐','Find charts')}</button><label class="button small">${text('选择 CSV','Choose CSV')}<input data-task-file type="file" accept=".csv,.tsv,.txt" hidden></label><button data-task-clear class="text-button">${text('清除表格','Clear table')}</button></div><p data-task-status role="status"></p></details></div><div data-task-results class="task-results"></div>`;
 const $=s=>host.querySelector(s);
 function render(){
  const results=$('[data-task-results]');results.hidden=goal==='all'&&!table;if(results.hidden){results.replaceChildren();return;}
  const entries=recommendForTask({goal,table});
  results.innerHTML=entries.map(r=>{const t=findTemplate(r.id);return `<article data-task-chart="${r.id}"><a href="#chart/${r.id}">${esc(t.type)} ↗</a><p>${esc(r.use.choice[locale()])}</p>${table?`<small>${esc(r.status==='compatible'?text('字段与数值通过检查；仍需核对使用条件。','Fields and values pass checks. Review the use conditions.'):r.status==='mapping'?text('需要选择对应列。','Column mapping needed.'):r.errors[0])}</small>`:''}<button class="text-button" data-task-use="${r.id}">${table?text('核对字段并使用','Review fields & use'):text('使用图表','Use chart')} →</button></article>`;}).join('');
  if(table)$('[data-task-status]').textContent=text(`已读取 ${table.rows.length} 行、${table.headers.length} 列。数据仅在浏览器处理。`,`${table.rows.length} rows, ${table.headers.length} columns. Processed in this browser.`);
 }
 function analyze(){try{table=taskTable($('[data-task-table]').value);render();}catch(e){table=null;render();$('[data-task-status]').textContent=e.message;}}
 const change=async e=>{if(e.target.matches('[data-task-goal]')){goal=e.target.value;onGoal(goal);render();}if(e.target.matches('[data-task-file]')){try{const file=e.target.files?.[0];if(!file)return;if(file.size>2000000)throw Error(text('表格请控制在 2 MB 以内。','Use a table smaller than 2 MB.'));const value=await file.text();if(disposed)return;$('[data-task-table]').value=value;analyze();}catch(e){$('[data-task-status]').textContent=e.message;}}};
 const click=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-task-analyze'))analyze();if(b.hasAttribute('data-task-clear')){table=null;$('[data-task-table]').value='';$('[data-task-status]').textContent='';render();}if(b.dataset.taskUse){const example=getExample(b.dataset.taskUse);if(!table){onUse(example);return;}importer?.close();importer=openDataImporter(example,{initialSource:textSource([table.headers,...table.rows]),onApply(result){onUse(result.doc||result);},isCurrent:()=>!disposed});}};
 $('[data-task-goal]').value=goal;host.addEventListener('change',change);host.addEventListener('click',click);render();
 return {destroy(){disposed=true;importer?.close();host.removeEventListener('change',change);host.removeEventListener('click',click);}};
}
