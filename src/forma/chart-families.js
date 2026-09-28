// One primary visual family per template; purpose remains an independent facet.
const definitions=[
  ['pie','饼状图类','pie donut sunburst rose windrose'],
  ['line','折线图类','tide race parallel smallmultiples slope radar trajectory step polarline cycleplot eventline survival roc precisionrecall calibration dose learning singleline comboline acf pacf imr pcontrol ucontrol cusum ewma xbar periodogram cohortcurve andrews lexis cumulativegains decisioncurve rankclock nomogram nelsonaalen ksplot liftcurve thresholdmetrics costcurve bode nyquist nichols hodograph eyediagram campbell'],
  ['bar','柱状图类','orbit waterfall diverging stacked lollipop pareto groupedbar pyramid stackedcolumn funnel scree column bar groupedbarh stackedbar percentcolumn cooksdistance variwide stackedwaterfall'],
  ['area','面积图类','stream ribbon difference streamgraph horizon area percentarea forecastfan'],
  ['scatter','散点图类','scatter circlepack ternary vectorfield paired regression blandaltman volcano ma pca residual enrichment manhattan metafunnel xy splom pcaloadings lagplot biplot taylor targetdiagram youden radviz funnelcontrol labbe worm spreadlevel scalelocation residualleverage addedvariable componentresidual polezero smith polarscatter phasor constellation'],
  ['matrix','矩阵与分区','calendar barcode unit waffle matrix cohort ledger correlation heatmap contour hexbin voronoi confusion kpi clusterheatmap histogram2d density2d adjacency agreement association recurrence spectrogram radialheatmap spiralheatmap'],
  ['relation','层级与关系','alluvial mosaic chord arc marimekko icicle dendrogram network directedchord parallelsets edgebundle upset circlehierarchy radialtree venn sankeycycle mosaicplot hiveplot bipartite egonetwork treetable'],
  ['distribution','分布统计图','ridges swarm boxplot histogram ecdf violin raincloud qqplot lorenz ppplot deltaplot ecdfdiff quantiledot halfeye weibull meanexcess ttt boxen sina rootogram ecdfband qqcompare'],
  ['interval','区间与目标','fan dumbbell interval bullet gantt range gauge likert errorbar forest progress tornado swimmer eventhistory'],
  ['geo','地图类','choropleth geomap geoflow'],
  ['spatial','3D 图表','scatter3d bars3d surface3d trajectory3d bubble3d lines3d']
];
export const families=[{id:'all',name:'全部图型'},...definitions.map(([id,name])=>({id,name}))];
const lookup=new Map(definitions.flatMap(([family,,ids])=>ids.split(' ').map(id=>[id,family])));
export function assignChartFamilies(catalog){for(const template of catalog){const family=lookup.get(template.id);if(!family)throw new Error(`Missing chart family: ${template.id}`);template.family=family;}}
