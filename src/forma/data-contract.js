import {uiText,uiMarkup,uiMessage} from './locale.js';
import {isEnglish} from './locale.js';
import {fieldNames} from './locale-catalog.js';
import {findTemplate,getExample} from './catalog.js';

const names={defectives:'不合格件数',sampleSize:'检查件数',defects:'缺陷数',exposure:'暴露量',observed:'历史观测',median:'预测中位数',lower50:'50% 下界',upper50:'50% 上界',lower80:'80% 下界',upper80:'80% 上界',lower95:'95% 下界',upper95:'95% 上界',parameter:'参数',retained:'留存人数',sourceLongitude:'起点经度',sourceLatitude:'起点纬度',targetLongitude:'终点经度',targetLatitude:'终点纬度',id:'节点 ID',label:uiText('名称'),period:uiText('时期'),date:uiText('日期'),value:uiText('数值'),series:uiText('系列'),group:uiText('分组'),before:uiText('前值'),after:uiText('后值'),source:uiText('起点'),target:uiText('终点'),start:uiText('开始日期'),end:uiText('结束日期'),progress:uiText('完成进度'),members:uiText('所属集合'),count:uiText('计数'),total:uiText('总数'),low:uiText('下界'),high:uiText('上界'),lower:uiText('下界'),upper:uiText('上界'),estimate:uiText('估计值'),padj:uiText('校正 p 值'),pvalue:uiText('p 值'),se:uiText('标准误'),dose:uiText('剂量'),epoch:uiText('训练轮次'),train:uiText('训练损失'),validation:uiText('验证损失')};
export const fieldLabel=(field,template)=>{
  // Sensitivity endpoints are scenario outcomes, not ordered interval bounds.
  if(template==='tornado'&&['low','high'].includes(field[0]))return isEnglish()?(field[0]==='low'?'Low-input outcome':'High-input outcome'):(field[0]==='low'?'低情景输出':'高情景输出');
  return isEnglish()?(fieldNames[field[0]]||field[0]):names[field[0]]||(field[2]?.length<=18?field[2]:field[0]);
};
const axisRoles={bar:['value','category'],column:['category','value'],singleline:['category','value'],area:['category','value']};
export function observedMeasure(doc){const roles=axisRoles[doc.template];return roles&&doc.axes?doc.axes[roles.indexOf('value')===0?'x':'y']:undefined;}
export function dataOrigin(doc){return doc.source.type==='demo'?uiText('示例数据'):doc.provenance?.origin==='demo'?uiText('基于示例编辑'):doc.source.type==='public'?uiText('公开来源数据'):doc.provenance?.origin==='public'?uiText('基于公开数据编辑'):uiText('用户数据');}
export function mappedAxes(source,targetTemplate){
  const from=axisRoles[source.template],to=axisRoles[targetTemplate];
  if(!source.axes||!from||!to)return source.axes?structuredClone(source.axes):undefined;
  const meaning=Object.fromEntries(from.map((role,i)=>[role,source.axes[i?'y':'x']]));
  return Object.fromEntries(to.map((role,i)=>[i?'y':'x',meaning[role]]));
}
export function fieldType(type){if(isEnglish())return `${type.includes('number')?'Number':type.startsWith('YYYY')?'Date':'Text'}${type.includes('null')?' · Nullable':''}`;return `${type.includes('number')?uiText('数字'):type.startsWith('YYYY')?uiText('日期'):uiText('文字')}${type.includes('null')?uiText(' · 可空'):''}`;}
export function withDataUnit(doc,unit){
  const suffix=` / ${doc.unit}`,axes=doc.axes&&Object.fromEntries(Object.entries(doc.axes).map(([key,label])=>[key,typeof label==='string'&&label.endsWith(suffix)?label.slice(0,-suffix.length)+` / ${unit}`:label]));
  return {...doc,unit,...(axes?{axes}:{})};
}
export function fieldRule(doc,key){
  const type=findTemplate(doc?.template)?.fields.find(f=>f[0]===key)?.[1];
  if(type?.startsWith('YYYY'))return {format:type,note:uiText('必须是真实存在的日期，不自动顺延。')};
  if(['padj','pvalue'].includes(key))return {min:0,max:1,exclusiveMin:true,note:uiText('范围 (0, 1]；不要用 0 代替缺失或下溢结果')};
  if(key==='progress')return doc?.template==='gantt'?{min:0,max:100,note:uiText('范围 0–100，例如 60 表示 60%')}:{min:0,max:1,note:uiText('范围 0–1，例如 0.6 表示 60%')};
  if(['count','active'].includes(key))return {min:0,integer:true,note:uiText('非负整数，缺失不等于零')};
  if(key==='n')return {min:1,integer:true,note:uiText('正整数样本量')};
  return null;
}
export function fieldProblem(value,type,{doc,key}={}){
  if(type.includes('number')){
    if(value===null&&type.includes('null'))return '';
    if(typeof value!=='number'||!Number.isFinite(value))return uiText('请填写有效数字，缺失仅可填入允许为空的字段；单位单独设置。');
    const rule=fieldRule(doc,key);
    if(rule&&(rule.integer&&!Number.isInteger(value)||rule.min!==undefined&&(rule.exclusiveMin?value<=rule.min:value<rule.min)||rule.max!==undefined&&value>rule.max))return rule.note;
    return '';
  }
  if(type.startsWith('YYYY')){
    const day=type==='YYYY-MM'?`${value}-01`:value;
    const valid=typeof value==='string'&&(type==='YYYY-MM'?/^\d{4}-\d{2}$/:/^\d{4}-\d{2}-\d{2}$/).test(value)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;
    return valid?'':uiMessage`请填写真实有效的 ${type} 日期。`;
  }
  return typeof value==='string'&&value.trim()&&value.length<=80?'':uiText('需要 1–80 字文本。');
}
export function dataContract(doc){
  const template=findTemplate(doc.template),example=getExample(doc.template),keys=template.fields.map(f=>f[0]),has=(...required)=>required.every(k=>keys.includes(k));
  const family=doc.template==='tornado'?(isEnglish()?'Sensitivity scenarios':'敏感性情景'):has('source','target')?uiText('关系记录'):has('parent','label')?uiText('层级记录'):has('before','after')?uiText('配对观测'):has('x','y')?uiText('多维观测'):has('actual','predicted')?uiText('分类评估'):has('series','value')?uiText('多系列长表'):has('group','value')?uiText('分组样本'):has('low','high')||has('lower','upper')?uiText('区间估计'):keys.length===2&&has('value')?uiText('类别与数值'):uiText('结构化记录');
  return {family,signature:template.fields.map(([k,t])=>`${k}:${t}`).join('|'),description:template.description||template.note||template.limit,
    fields:template.fields.map((f,index)=>{const sourceColumn=doc.tableInput?.fieldColumns?.[f[0]],sourceHeader=Number.isInteger(sourceColumn)?doc.tableInput.headers?.[sourceColumn]:undefined;
      return {key:f[0],type:f[1],label:fieldLabel(f,doc.template),header:sourceHeader??fieldLabel(f,doc.template),sourceColumn,description:f[2],typeLabel:fieldType(f[1]),rule:fieldRule(doc,f[0]),nullable:f[1].includes('null'),example:example.data[0]?.[f[0]],index};})};
}

// Row constraints return field locations, used by both document validation and
// the editor. They never reorder, drop or repair the user's original records.
export function recordProblems(doc,fields=findTemplate(doc.template).fields){
  const errors=[],rows=doc.data,keys=fields.map(f=>f[0]),id=doc.template;
  const add=(row,fields,message)=>fields.forEach(key=>{const col=keys.indexOf(key);if(col>=0&&!errors.some(e=>e.row===row&&e.col===col&&e.message===message))errors.push({row,col,message});});
  const validDate=(row,key)=>!fieldProblem(row[key],fields.find(f=>f[0]===key)?.[1]||'string',{doc,key});
  for(const [r,row]of rows.entries()){
    const low=keys.includes('low')?'low':'lower',high=keys.includes('high')?'high':'upper';
    // Tornado endpoints are outcomes for low/high input scenarios, not ordered
    // outcome bounds: a negatively sensitive parameter can have low > high.
    if(id!=='tornado'&&Number.isFinite(row[low])&&Number.isFinite(row[high])){
      if(row[low]>row[high])add(r,[low,high],uiText('区间下界不能大于上界。'));
      for(const key of id==='range'?['open','close']:['estimate'])if(Number.isFinite(row[key])&&(row[key]<row[low]||row[key]>row[high]))add(r,[low,key,high],uiMessage`${key} 必须落在下界与上界之间。`);
    }
    if(id==='ribbon'&&['low','estimate','high'].some(k=>row[k]===null)&&!['low','estimate','high'].every(k=>row[k]===null))add(r,['low','estimate','high'],uiText('缺失观测的估计值与上下界需要一起留空。'));
    if(id==='gantt'&&validDate(row,'start')&&validDate(row,'end')&&row.start>=row.end)add(r,['start','end'],uiText('结束日期必须晚于开始日期，结束当日不计入时长。'));
  }
  const ordered=id==='gantt'?'start':id==='range'?'period':id==='learning'?'epoch':null;
  if(ordered)for(let i=1;i<rows.length;i++){
    const prev=rows[i-1][ordered],curr=rows[i][ordered],valid=ordered==='epoch'?Number.isFinite(prev)&&Number.isFinite(curr):validDate(rows[i-1],ordered)&&validDate(rows[i],ordered);
    if(valid&&(id==='gantt'?curr<prev:curr<=prev)){add(i-1,[ordered],uiText('相邻记录需要按时间升序排列。'));add(i,[ordered],uiText('相邻记录需要按时间升序排列。'));}
  }
  const unique=({calendar:['date'],barcode:['date'],range:['period'],ribbon:['period'],trajectory:['period'],step:['period'],difference:['period'],trajectory3d:['period'],smallmultiples:['series','period']})[id];
  if(unique){const seen=new Map();rows.forEach((row,r)=>{if(unique.some(k=>row[k]==null||row[k]===''))return;const key=JSON.stringify(unique.map(k=>row[k]));if(seen.has(key)){add(seen.get(key),unique,uiText('这组字段与另一条记录重复，请核对原始数据。'));add(r,unique,uiText('这组字段与另一条记录重复，请核对原始数据。'));}else seen.set(key,r);});}
  return errors;
}
