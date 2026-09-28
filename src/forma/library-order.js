// Editorial recommendations for common reporting tasks, not usage analytics.
// Stable IDs keep discovery order identical in Chinese and English. Template
// numbers and the original catalog remain unchanged for saved works and APIs.
export const commonTemplateOrder = Object.freeze([
  'column', 'bar', 'singleline', 'tide', 'pie', 'donut', 'area',
  'groupedbar', 'groupedbarh', 'stackedcolumn', 'stackedbar', 'stacked',
  'percentcolumn', 'stream', 'percentarea', 'xy', 'scatter', 'comboline',
  'waterfall', 'dumbbell', 'slope', 'heatmap', 'radar', 'funnel',
  'mosaic', 'histogram', 'boxplot', 'kpi', 'progress', 'gauge', 'bullet',
  'calendar', 'gantt', 'eventline', 'smallmultiples', 'ribbon', 'range',
  'lollipop', 'diverging', 'pyramid', 'pareto', 'race', 'cohort',
  'cohortcurve', 'choropleth', 'geomap', 'alluvial', 'sunburst',
  'icicle', 'circlepack', 'network', 'dendrogram', 'treetable',
  'waffle', 'unit', 'likert', 'correlation', 'matrix', 'regression',
  'errorbar', 'paired', 'violin', 'raincloud', 'ridges', 'swarm',
  'ecdf', 'forecastfan', 'step', 'difference', 'stackedwaterfall'
]);

const priorities = new Map(commonTemplateOrder.map((id, index) => [id, index]));

export function orderLibraryCatalog(templates) {
  return [...templates].sort((a, b) => {
    const priority = (priorities.get(a.id) ?? Infinity) - (priorities.get(b.id) ?? Infinity);
    if (priority) return priority;
    // Remaining specialized templates follow their permanent catalog number.
    // New or unnumbered entries stay discoverable without needing a rank entry.
    const aNumber = Number(a.no), bNumber = Number(b.no);
    const numbered = (Number.isFinite(aNumber) ? aNumber : Infinity) - (Number.isFinite(bNumber) ? bNumber : Infinity);
    if (numbered) return numbered;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
