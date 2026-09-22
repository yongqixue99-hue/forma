// beta.1 inserted these method notes over the plot in every public preset.
// Remove only the untouched generated notes when reopening those works.
// Edited, moved, retimed and user-authored annotations remain intact.
const legacyNotes={
  'public-revenue':['同一财年的互斥收入类别；份额由原始金额计算。','Non-overlapping categories from one fiscal year; shares derive from original amounts.'],
  'public-growth':['同一年度比较各国增长率，不将百分数相加。','Compare countries within the same year. Do not add their growth percentages.'],
  'public-penguins':['体重缺测 2 条未参与计算；密度宽度不表示样本数量。','Two missing body masses are excluded. Density width does not represent sample count.'],
  'public-process':['首项移动极差未定义；控制限不是产品规格限。','The first moving range is undefined; control limits are not specification limits.']
};
export function removeLegacyPublicNotes(doc,options){
  const texts=doc.provenance?.origin==='public'&&legacyNotes[doc.provenance.dataset];
  if(!texts||!options.annotations?.length)return options;
  const annotations=options.annotations.filter(a=>!(a.kind==='note'&&texts.includes(a.text)&&a.placement==='top-left'&&!a.position&&a.when.start===.6&&a.when.end===1&&!a.showValue&&!a.targets.length));
  if(annotations.length===options.annotations.length)return options;
  const next={...options};if(annotations.length)next.annotations=annotations;else delete next.annotations;return next;
}
