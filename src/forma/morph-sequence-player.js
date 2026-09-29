import {uiText,uiMarkup,uiMessage} from './locale.js';
import {MorphChart,morphViews} from './morph.js';
import {cleanSequence} from './morph-sequence.js';
import {themeFor} from './palettes.js';
import {escapeHtml as esc} from './data.js';

import {scientificViews} from './scientific-rules.js';
import {seriesViews} from './series-rules.js';
import {relationalViews} from './relational-rules.js';
const icons={columns:'<path d="M3 18V9h4v9m3 0V3h4v15m3 0V6h4v12"/>',line:'<path d="m3 16 6-7 5 4 7-9"/><circle cx="9" cy="9" r="1.3"/><circle cx="14" cy="13" r="1.3"/>',area:'<path d="m3 16 6-7 5 4 7-9v14H3Z"/>',bars:'<path d="M3 5h18M3 11h13M3 17h8"/>',bubbles:'<circle cx="8" cy="12" r="6"/><circle cx="18" cy="6" r="3"/><circle cx="19" cy="16" r="2"/>',pie:'<circle cx="12" cy="11" r="9"/><path d="M12 2v9h9m-9 0-6 6"/>',donut:'<circle cx="12" cy="11" r="9"/><circle cx="12" cy="11" r="4"/><path d="M12 2v5m9 4h-5"/>',treemap:'<path d="M2 3h20v16H2Zm12 0v16m0-8h8"/>',rose:'<path d="m12 11-6-7a9 9 0 0 1 12 0Zm0 0 9 1a9 9 0 0 1-7 8Zm0 0-2 8a8 8 0 0 1-7-6Z"/>',stacked:'<path d="M2 6h20v11H2Zm8 0v11m6-11v11"/>'};
Object.assign(icons,{
 "relationx-adjacency": "<path d=\"M3 3h18v18H3Zm6 0v18m6-18v18M3 9h18M3 15h18\"/>",
 "relationx-adjacency-radial": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m5 6 14 12M4 15 19 5M3 12h18\"/>",
 "relationx-bipartite": "<path d=\"M4 3h3v4H4Zm0 14h3v4H4ZM17 3h3v4h-3Zm0 14h3v4h-3ZM7 5h10M7 19l10-14M7 5l10 14\"/>",
 "relationx-bipartite-circle": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m5 6 14 12M5 18 19 6M12 3v18\"/>",
 "relationx-ego": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 9V2m0 13v7M9 12H2m13 0h7M10 10 4 4m10 10 6 6\"/>",
 "relationx-ego-arc": "<path d=\"M2 20h20M4 19a8 14 0 0 1 16 0M8 19a4 8 0 0 1 8 0M12 19V4\"/>",
 "relationx-bundle": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M5 6q14 5 14 12M5 18q9-2 14-12M12 3q-4 8 0 18\"/>",
 "relationx-bundle-linear": "<path d=\"M3 3v18m18-18v18M3 4q12 4 18 14M3 18Q9 8 21 4M3 10q9 7 18 3\"/>",
 "relationx-hive": "<path d=\"M12 12V2m0 10L3 21m9-9 9 9M12 4q10 5 5 13M12 9q-7 1-6 9M5 19q7-7 14 0\"/>",
 "relationx-hive-parallel": "<path d=\"M3 2v20M12 2v20M21 2v20M3 6q4-3 9 3t9-4M3 16q5 6 9-1t9 3\"/>",
 "relationx-parallelsets": "<path d=\"M3 2v20M12 2v20M21 2v20M3 5l9 7 9-7v5l-9 6-9-6Z\"/>",
 "relationx-parallelsets-radial": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m12 3-6 15 15-6L12 7 9 17l9-5Z\"/>",
 "relationx-upset": "<path d=\"M3 12h18M5 12V5m7 7V2m7 10V7M5 17v5m7-5v5\"/><circle cx=\"5\" cy=\"17\" r=\"1\"/><circle cx=\"12\" cy=\"22\" r=\"1\"/>",
 "relationx-intersections": "<path d=\"M3 3h18v4H3Zm0 7h13v4H3Zm0 7h8v4H3Z\"/>",
 "relationx-venn": "<circle cx=\"8\" cy=\"14\" r=\"6\"/><circle cx=\"16\" cy=\"14\" r=\"6\"/><circle cx=\"12\" cy=\"7\" r=\"6\"/>",
 "mvx-parallel": "<path d=\"M3 2v20M9 2v20M15 2v20M21 2v20M3 6l6 10 6-7 6 9M3 16l6-8 6 6 6-10\"/>",
 "mvx-profile-matrix": "<path d=\"M3 3h18v18H3Zm6 0v18m6-18v18M3 9h18M3 15h18\"/>",
 "mvx-radar": "<path d=\"m12 2 10 8-4 11H6L2 10Zm0 0v10M2 10l10 2 10-2M6 21l6-9 6 9m-6-15 6 5-4 6-7-1-1-7Z\"/>",
 "mvx-radar-unfold": "<path d=\"M3 2v20M9 2v20M15 2v20M21 2v20M3 6l6 10 6-7 6 9\"/>",
 "mvx-ternary": "<path d=\"m12 2 10 19H2Zm-5 10h10M7 21 17 12M7 12l10 9\"/><circle cx=\"12\" cy=\"14\" r=\"1.5\"/>",
 "mvx-composition": "<path d=\"M3 3v18M12 3v18M21 3v18M3 8l9 7 9-4M3 18l9-11 9 8\"/>",
 "mvx-pca": "<path d=\"M2 12h20M12 2v20\"/><circle cx=\"7\" cy=\"16\" r=\"2\"/><circle cx=\"17\" cy=\"8\" r=\"2\"/>",
 "mvx-pca-components": "<path d=\"M6 2v20M18 2v20M6 6l12 11M6 17 18 7\"/><circle cx=\"6\" cy=\"6\" r=\"1.5\"/><circle cx=\"18\" cy=\"17\" r=\"1.5\"/>",
 "mvx-loadings": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m12 12 7-6m-3 0h3v3m-7 3-6 7m0-3v3h3M12 12 6 5\"/>",
 "mvx-loading-components": "<path d=\"M6 2v20M18 2v20M6 12V4m12 8v7M4 6l2-2 2 2m8 11 2 2 2-2\"/>",
 "mvx-scree": "<path d=\"M3 2v19h19M4 4l5 9 6 4 6 2\"/><circle cx=\"9\" cy=\"13\" r=\"1.5\"/>",
 "mvx-cumulative": "<path d=\"M3 2v19h19M4 18l5-9 6-4 6-2\"/><circle cx=\"9\" cy=\"9\" r=\"1.5\"/>",
 "mvx-andrews": "<path d=\"M2 12h20M2 14c4-20 9 20 13-3s6-5 7 1M2 16c4-6 7-15 12-3s7 9 8-2\"/>",
 "mvx-coefficients": "<path d=\"M3 2v20M10 2v20M17 2v20M3 6l7 12 7-9 5 4M3 16l7-8 7 7 5-9\"/>",
 "mvx-radviz": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m12 3 2 8 7 1m-7-1-2 10m2-10L3 12\"/><circle cx=\"14\" cy=\"11\" r=\"2\"/>",
 "mvx-normalized-profiles": "<path d=\"M3 3v18h18M4 17l5-9 6 6 6-9M4 10l5 6 6-9 6 11\"/>",
 "engineering-smith": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"16\" cy=\"12\" r=\"6\"/><circle cx=\"19\" cy=\"12\" r=\"3\"/><path d=\"M2 12h20M5 5q7 3 17 7M5 19q7-3 17-7\"/>",
 "engineering-impedance": "<path d=\"M3 2v19h19M3 12h19\"/><circle cx=\"8\" cy=\"8\" r=\"2\"/><circle cx=\"15\" cy=\"16\" r=\"2\"/>",
 "engineering-polar": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 2v20M2 12h20m-10 0 5-6\"/><circle cx=\"17\" cy=\"6\" r=\"1.5\"/>",
 "engineering-bearing-radius": "<path d=\"M3 2v19h19\"/><circle cx=\"7\" cy=\"13\" r=\"2\"/><circle cx=\"13\" cy=\"7\" r=\"2\"/><circle cx=\"19\" cy=\"15\" r=\"2\"/>",
 "engineering-phasor": "<path d=\"M12 12V2m-3 3 3-3 3 3M12 12l9 6m-4 0 4 0-1-4M12 12 3 18m1-4-1 4h4\"/>",
 "engineering-phasor-chain": "<path d=\"M3 19 8 4l11 4-3 11M5 7l3-3 2 4m5-4 4 4-5 1m0 6 2 4 3-3M3 19h13\"/>",
 "engineering-iq": "<path d=\"M2 12h20M12 2v20\"/><circle cx=\"6\" cy=\"6\" r=\"2\"/><circle cx=\"18\" cy=\"6\" r=\"2\"/><circle cx=\"6\" cy=\"18\" r=\"2\"/><circle cx=\"18\" cy=\"18\" r=\"2\"/>",
 "engineering-symbol-polar": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m12 12 6-6m-6 6 6 6m-6-6-6 6m6-6L6 6\"/>",
 "engineering-polezero": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M2 12h20M12 2v20M5 8l4 4m-4 0 4-4\"/><circle cx=\"16\" cy=\"7\" r=\"2\"/>",
 "engineering-root-polar": "<path d=\"M3 2v19h19M5 8l4 4m-4 0 4-4\"/><circle cx=\"16\" cy=\"7\" r=\"2\"/>",
 "engineering-hodograph": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 12 5 14l2-7 6-2 6 4-1 6\"/>",
 "engineering-height-speed": "<path d=\"M3 2v19h19m-15-3 10-4-5-5 7-5\"/><circle cx=\"7\" cy=\"18\" r=\"1.5\"/>",
 "engineering-windrose": "<path d=\"m12 12-4-10h8Zm0 0 10-4v8Zm0 0 4 10H8Zm0 0L2 16V8Z\"/>",
 "engineering-wind-sectors": "<path d=\"M3 3h18v5H3Zm0 7h13v5H3Zm0 7h18v5H3ZM9 3v5m2 2v5m5 2v5\"/>",
 "engineering-campbell": "<path d=\"M3 2v19h19M3 21 21 3M3 21 21 12\"/><circle cx=\"10\" cy=\"14\" r=\"2\"/><circle cx=\"17\" cy=\"7\" r=\"3\"/>",
 "engineering-speed-amplitude": "<path d=\"M3 2v19h19M4 18l5-9 6 4 6-7\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><circle cx=\"15\" cy=\"13\" r=\"1.5\"/>"
});
Object.assign(icons,{
 'temporal-stream':'<path d="M2 10c6-10 8 10 20 0v7c-8 9-13-6-20-1Zm0 2c7-5 11 8 20 1"/>',
 'temporal-horizon':'<path d="M2 4h20M2 12h20M2 20h20m-20-2 6-6 4 5 6-5 4 3M2 10l6-6 4 5 6-5 4 3"/>',
 'temporal-lines':'<path d="M2 3v18h20M3 16l5-7 5 4 8-8M3 10l5 5 5-9 8 5"/>',
 'temporal-season':'<path d="M2 20h20M7 3v17M16 3v17M3 14l4-4 4 5m2-5 3-5 5 3"/>',
 'temporal-season-lines':'<path d="M2 3v18h20m-18-5 4-6 4 5 4-9 5 4M4 10l4-4 4 6 4-9 5 3"/>',
 'temporal-rankclock':'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 3v9l6 3M6 6l10 3-4 10-7-6"/>',
 'temporal-ranklines':'<path d="M3 4h18M3 12h18M3 20h18m-18-8 6-8 6 16 6-8M3 20l6-8 6-8 6 16"/>',
 'temporal-cohort':'<path d="M2 2h20v6H2Zm0 7h14v6H2Zm0 7h8v6H2ZM8 2v20m7-20v13"/>',
 'temporal-retention':'<path d="M3 2v19h19M3 4c3 10 8 12 18 13M3 4c5 4 10 7 18 7"/>',
 'regression-scale-location':'<path d="M3 3v18h19M4 16l16-9"/><circle cx="7" cy="14" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="17" cy="8" r="1"/>',
 'regression-fitted-residual':'<path d="M3 2v19h19M3 11h19"/><circle cx="7" cy="7" r="1"/><circle cx="13" cy="15" r="1"/><circle cx="18" cy="8" r="1"/>',
 'regression-leverage':'<path d="M3 2v19h19M5 2c2 5 6 7 16 8M5 20c2-5 6-7 16-8"/><circle cx="9" cy="12" r="1"/><circle cx="17" cy="6" r="1"/>',
 'regression-cook':'<path d="M3 2v19h19M6 21v-5m4 5V9m4 12v-8m4 8V4M3 10h19"/>',
 'regression-added':'<path d="M3 3v18h19M4 18 20 4"/><circle cx="7" cy="17" r="1.4"/><circle cx="12" cy="10" r="1.4"/><circle cx="18" cy="7" r="1.4"/>',
 'regression-adjusted-deviation':'<path d="M3 3v18h19M3 12h19M7 12V7m6 5v5m6-5V8"/><circle cx="7" cy="7" r="1"/><circle cx="13" cy="17" r="1"/>',
 'regression-component':'<path d="M3 3v18h19M4 18 21 4M7 15V9m6 1v7m6-12v5"/><circle cx="7" cy="9" r="1"/><circle cx="13" cy="17" r="1"/>',
 'regression-ordinary':'<path d="M3 2v19h19M3 12h19M7 12V6m5 6v6m6-6V8"/><circle cx="7" cy="6" r="1.3"/><circle cx="12" cy="18" r="1.3"/><circle cx="18" cy="8" r="1.3"/>',
 'regression-funnel':'<path d="m12 3-9 18h18ZM12 3v18"/><circle cx="10" cy="10" r="1"/><circle cx="15" cy="17" r="1"/>',
 'regression-study-standardized':'<path d="M3 2v19h19M3 6h19M3 17h19"/><circle cx="7" cy="13" r="1"/><circle cx="12" cy="9" r="1"/><circle cx="18" cy="12" r="1"/>'
});
Object.assign(icons,{
 'process-individual':'<path d="M3 3v17h19M4 11h17M4 5h17M4 17h17m-17-5 4-3 4 5 4-6 5 4"/>',
 'process-imr':'<path d="M3 2v8h19M3 13v8h19M4 6h17m-17 0 4-2 4 3 4-4 5 3M4 18l4-3 4 4 4-2 5-3"/>',
 'multivariate-matrix':'<path d="M2 2h20v20H2Zm7 0v20m6-20v20M2 9h20M2 15h20"/><circle cx="5" cy="12" r=".8"/><circle cx="12" cy="18" r=".8"/>',
 'multivariate-focus':'<path d="M3 3v18h18M14 2h8v8m0-8-8 8"/><circle cx="8" cy="16" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="17" cy="12" r="1"/>',
 'series-rank':'<path d="m3 5 6 10 6-7 6 9M3 16l6-9 6 8 6-12"/><circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="8" r="1.5"/>',
 'sample-ridge':'<path d="M2 8c3 0 3-6 6-6s3 6 6 6h8M2 14c5 0 4-6 9-6s4 6 11 6M2 21c4 0 6-6 10-6s3 6 10 6"/>',
 'matrix-clustered':'<path d="M7 7h15v15H7Zm5 0v15m5-15v15M7 12h15M7 17h15M2 9v9h3M2 9h3M9 2h9v3M9 2v3"/>',
 'small-multiples':'<path d="M2 2v8h8M14 2v8h8M2 14v8h8m4-8v8h8M3 7l3-3 3 1m6 2 3-2 3 2M3 19l3-2 3 1m6 1 3-3 3 1"/>',
 'matrix-heatmap':'<path d="M2 2h20v20H2Zm7 0v20m6-20v20M2 9h20M2 15h20"/>',
 'matrix-bubbles':'<circle cx="6" cy="6" r="4"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="4"/>',
 'ordered-estimate-line':'<path d="m2 17 6-6 7 2 7-9"/><circle cx="8" cy="11" r="1.5"/><circle cx="15" cy="13" r="1.5"/>',
 'ordered-estimate-band':'<path d="m2 12 6-7 7 3 7-6v9l-7 9-7-4-6 7Zm0 5 6-6 7 2 7-9"/>',
 'ordered-estimate-intervals':'<path d="M5 5v14M2 5h6m-6 14h6M12 2v13m-3-13h6m-6 13h6M19 8v13m-3-13h6m-6 13h6"/>',
 'trajectory-points':'<circle cx="4" cy="15" r="2"/><circle cx="11" cy="6" r="2"/><circle cx="19" cy="14" r="2"/><circle cx="16" cy="20" r="2"/>',
 'trajectory-path':'<path d="m4 15 7-9 8 8-3 6"/><circle cx="4" cy="15" r="2"/><circle cx="11" cy="6" r="2"/><circle cx="19" cy="14" r="2"/>',
 'spatial-3d':'<path d="m12 2 10 6v10l-10 4L2 18V8Zm0 0v20M2 8l10 5 10-5"/><circle cx="9" cy="10" r="1.2"/><circle cx="15" cy="16" r="1.2"/>',
 'spatial-bubbles':'<path d="m12 2 10 6v10l-10 4L2 18V8Zm0 0v20M2 8l10 5 10-5"/><circle cx="9" cy="10" r="1.2"/><circle cx="15" cy="16" r="1.2"/>',
 'spatial-surface':'<path d="m12 2 10 6v10l-10 4L2 18V8Zm0 0v20M2 8l10 5 10-5"/><circle cx="9" cy="10" r="1.2"/><circle cx="15" cy="16" r="1.2"/>',
 'spatial-xy':'<path d="M3 2v19h19"/><circle cx="8" cy="13" r="2"/><circle cx="16" cy="6" r="2"/>',
 'spatial-xz':'<path d="m3 20 19-7M3 20V2"/><circle cx="8" cy="9" r="2"/><circle cx="16" cy="11" r="2"/>',
 'spatial-yz':'<path d="m21 20-19-7m19 7V2"/><circle cx="8" cy="9" r="2"/><circle cx="16" cy="11" r="2"/>'
});
Object.assign(icons,{
 'process-individual':'<path d="M3 3v17h19M4 11h17M4 5h17M4 17h17m-17-5 4-3 4 5 4-6 5 4"/>',
 'process-imr':'<path d="M3 2v8h19M3 13v8h19M4 6h17m-17 0 4-2 4 3 4-4 5 3M4 18l4-3 4 4 4-2 5-3"/>',
 'multivariate-matrix':'<path d="M2 2h20v20H2Zm7 0v20m6-20v20M2 9h20M2 15h20"/><circle cx="5" cy="12" r=".8"/><circle cx="12" cy="18" r=".8"/>',
 'multivariate-focus':'<path d="M3 3v18h18M14 2h8v8m0-8-8 8"/><circle cx="8" cy="16" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="17" cy="12" r="1"/>',
  lollipop:'<path d="M5 18V9m7 9V5m7 13v-6"/><circle cx="5" cy="7" r="2"/><circle cx="12" cy="3" r="2"/><circle cx="19" cy="10" r="2"/>',
  dot:'<path d="M3 4v15h19M3 7h17M3 13h17"/><circle cx="15" cy="7" r="2" fill="currentColor"/><circle cx="9" cy="13" r="2" fill="currentColor"/>',
  squares:'<path d="M2 7h10v10H2Zm13 4h6v6h-6Z"/>',
  semidonut:'<path d="M2 17a10 10 0 0 1 20 0h-5a5 5 0 0 0-10 0ZM12 7v5m7-2-3.5 3.5"/>',
  radialbars:'<circle cx="12" cy="11" r="3"/><path d="M10 8V2h4v6m1 1h6v4h-6m-5 1v6h4v-6m-5-5H5v4h4"/>',
  radar:'<path d="m12 2 9 7-3 11H6L3 9Zm0 0v10m9-3-9 3m6 8-6-8m-6 8 6-8M3 9l9 3m0-7 6 5-4 6-7 1-1-7Z"/>',
  waterfall:'<path d="M2 14h5v5H2Zm7-6h5v6H9Zm7-6h5v6h-5ZM7 14h2m5-6h2"/>',
  funnel:'<path d="m2 3 3 4h14l3-4Zm4 7 3 4h6l3-4Zm4 7 2 3 2-3Z"/>',
  pareto:'<path d="M3 18V9h4v9m3 0v-6h4v6m3 0v-3h4v3M3 8l7-4 6-2h5"/>',
  waffle:'<path d="M3 2h18v18H3Zm6 0v18m6-18v18M3 8h18M3 14h18"/>'
});
Object.assign(icons,{
 'process-individual':'<path d="M3 3v17h19M4 11h17M4 5h17M4 17h17m-17-5 4-3 4 5 4-6 5 4"/>',
 'process-imr':'<path d="M3 2v8h19M3 13v8h19M4 6h17m-17 0 4-2 4 3 4-4 5 3M4 18l4-3 4 4 4-2 5-3"/>',
 'multivariate-matrix':'<path d="M2 2h20v20H2Zm7 0v20m6-20v20M2 9h20M2 15h20"/><circle cx="5" cy="12" r=".8"/><circle cx="12" cy="18" r=".8"/>',
 'multivariate-focus':'<path d="M3 3v18h18M14 2h8v8m0-8-8 8"/><circle cx="8" cy="16" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="17" cy="12" r="1"/>','grouped-columns':'<path d="M2 19V9h3v10m2 0V4h3v15m4 0V6h3v13m2 0V2h3v17"/>','stacked-columns':'<path d="M3 19V5h6v14m6 0V2h6v17M3 11h6m6-3h6"/>','percent-columns':'<path d="M3 2h6v17H3Zm12 0h6v17h-6ZM3 9h6m6 5h6"/>','multi-line':'<path d="m2 16 6-8 6 3 8-9M2 9l6 6 6-8 8 6"/>','stacked-area':'<path d="m2 8 6-2 7 4 7-8v18H2Zm0 6 6-2 7 4 7-5"/>','percent-area':'<path d="M2 3h20v17H2Zm0 6 6 4 7-6 7 3M2 15l6 2 7-5 7 3"/>'});
Object.assign(icons,{
 'process-individual':'<path d="M3 3v17h19M4 11h17M4 5h17M4 17h17m-17-5 4-3 4 5 4-6 5 4"/>',
 'process-imr':'<path d="M3 2v8h19M3 13v8h19M4 6h17m-17 0 4-2 4 3 4-4 5 3M4 18l4-3 4 4 4-2 5-3"/>',
 'multivariate-matrix':'<path d="M2 2h20v20H2Zm7 0v20m6-20v20M2 9h20M2 15h20"/><circle cx="5" cy="12" r=".8"/><circle cx="12" cy="18" r=".8"/>',
 'multivariate-focus':'<path d="M3 3v18h18M14 2h8v8m0-8-8 8"/><circle cx="8" cy="16" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="17" cy="12" r="1"/>',
  diverging:'<path d="M12 2v18M12 4h8v4h-8m0 4H3v4h9"/>',step:'<path d="M2 18h5v-6h5V6h5v4h5"/>',
  polarline:'<circle cx="12" cy="11" r="9" stroke-dasharray="1 3"/><path d="m12 3 5 5 3 7-8 3-6-6 2-4Z"/>',
  unit:'<path d="M3 19h18"/><path d="M6 15h.01M6 11h.01M12 15h.01M12 11h.01M12 7h.01M18 15h.01M18 11h.01M18 7h.01M18 3h.01" stroke-width="3"/>',
  'funnel-bars':'<path d="M2 3h20v3H2Zm0 6h14v3H2Zm0 6h8v3H2Z"/>',
  'grouped-bars':'<path d="M2 2h12v3H2Zm0 5h18v3H2Zm0 6h16v3H2Zm0 5h10v3H2Z"/>',
  'stacked-bars':'<path d="M2 3h20v5H2Zm0 10h16v5H2ZM10 3v5m-2 5v5"/>',
  'percent-bars':'<path d="M2 3h20v5H2Zm0 10h20v5H2ZM9 3v5m5 5v5"/>'
});
Object.assign(icons,{
 'process-individual':'<path d="M3 3v17h19M4 11h17M4 5h17M4 17h17m-17-5 4-3 4 5 4-6 5 4"/>',
 'process-imr':'<path d="M3 2v8h19M3 13v8h19M4 6h17m-17 0 4-2 4 3 4-4 5 3M4 18l4-3 4 4 4-2 5-3"/>',
 'multivariate-matrix':'<path d="M2 2h20v20H2Zm7 0v20m6-20v20M2 9h20M2 15h20"/><circle cx="5" cy="12" r=".8"/><circle cx="12" cy="18" r=".8"/>',
 'multivariate-focus':'<path d="M3 3v18h18M14 2h8v8m0-8-8 8"/><circle cx="8" cy="16" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="17" cy="12" r="1"/>',
  'paired-slope':'<path d="m5 17 14-13M5 8l14 8"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="4" r="2"/><circle cx="5" cy="8" r="2"/><circle cx="19" cy="16" r="2"/>',
  'paired-dumbbell':'<path d="M5 5h13M8 16h7"/><circle cx="5" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="8" cy="16" r="2"/><circle cx="15" cy="16" r="2"/>',
  'paired-bars':icons['grouped-columns'],
  'paired-points':'<path d="m5 16 14-9M4 11l16-8M6 19l11-6"/><path d="M5 16h.01M4 11h.01M6 19h.01M19 7h.01M20 3h.01M17 13h.01" stroke-width="3"/>',
  'paired-change':'<path d="M2 13h20M5 13V6m7 7v5m7-5V3"/><circle cx="5" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="3" r="2"/>',
  'hierarchy-sunburst':'<circle cx="12" cy="11" r="9"/><circle cx="12" cy="11" r="5"/><path d="M12 2v9l8 4M3 11h9m-6 7 3-3"/>',
  'hierarchy-icicle':'<path d="M2 3h20v16H2Zm0 7h20M10 3v16m-4-9v9m11-9v9"/>',
  'hierarchy-treemap':'<path d="M2 3h20v16H2Zm12 0v16M2 12h12m0-4h8M8 3v9m10-4v11"/>'
});
Object.assign(icons,{
 'process-individual':'<path d="M3 3v17h19M4 11h17M4 5h17M4 17h17m-17-5 4-3 4 5 4-6 5 4"/>',
 'process-imr':'<path d="M3 2v8h19M3 13v8h19M4 6h17m-17 0 4-2 4 3 4-4 5 3M4 18l4-3 4 4 4-2 5-3"/>',
 'multivariate-matrix':'<path d="M2 2h20v20H2Zm7 0v20m6-20v20M2 9h20M2 15h20"/><circle cx="5" cy="12" r=".8"/><circle cx="12" cy="18" r=".8"/>',
 'multivariate-focus':'<path d="M3 3v18h18M14 2h8v8m0-8-8 8"/><circle cx="8" cy="16" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="17" cy="12" r="1"/>',
  'obs-scatter':'<circle cx="5" cy="15" r="1.5"/><circle cx="9" cy="8" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="20" cy="4" r="1.5"/>',
  'obs-bubble':'<circle cx="6" cy="15" r="3"/><circle cx="13" cy="7" r="5"/><circle cx="20" cy="15" r="2"/>',
  'obs-regression':'<path d="m2 18 20-15"/><circle cx="7" cy="10" r="1.5"/><circle cx="15" cy="12" r="1.5"/>',
  'obs-confidence':'<path d="m2 13 20-12v8L2 22Zm0 5L22 3"/>',
  'sample-swarm':'<path d="M3 8h.1m3-3h.1m0 6h.1m3-3h.1m7 8h.1m3-3h.1m0 6h.1" stroke-width="3"/>',
  'sample-box':'<path d="M7 2v6m0 7v6M4 2h6m-6 19h6M3 8h8v7H3Zm12-2h7v10h-7m3-14v4m0 10v5"/>',
  'sample-violin':'<path d="M7 2C2 7 2 17 7 21c5-5 5-13 0-19Zm11 0c-5 10-5 10 0 19 5-10 5-10 0-19Z"/>',
  'sample-raincloud':'<path d="M2 12c5 0 5-10 10-10s5 10 10 10ZM5 17h.1m4 3h.1m4-3h.1m5 2h.1"/>',
  'sample-sd':'<path d="M6 2v18m-3-18h6m-6 18h6M18 5v12m-3-12h6m-6 12h6"/><circle cx="6" cy="10" r="2"/><circle cx="18" cy="11" r="2"/>',
  'estimate-points':'<path d="M2 20h20"/><circle cx="6" cy="6" r="2"/><circle cx="12" cy="13" r="2"/><circle cx="19" cy="9" r="2"/>',
  'estimate-horizontal':'<path d="M3 6h15M3 3v6m15-6v6M8 16h14M8 13v6m14-6v6"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="16" r="2"/>',
  'estimate-vertical':'<path d="M6 2v18m-3-18h6m-6 18h6M18 5v12m-3-12h6m-6 12h6"/><circle cx="6" cy="10" r="2"/><circle cx="18" cy="11" r="2"/>'
});
Object.assign(icons,{
 'process-individual':'<path d="M3 3v17h19M4 11h17M4 5h17M4 17h17m-17-5 4-3 4 5 4-6 5 4"/>',
 'process-imr':'<path d="M3 2v8h19M3 13v8h19M4 6h17m-17 0 4-2 4 3 4-4 5 3M4 18l4-3 4 4 4-2 5-3"/>',
 'multivariate-matrix':'<path d="M2 2h20v20H2Zm7 0v20m6-20v20M2 9h20M2 15h20"/><circle cx="5" cy="12" r=".8"/><circle cx="12" cy="18" r=".8"/>',
 'multivariate-focus':'<path d="M3 3v18h18M14 2h8v8m0-8-8 8"/><circle cx="8" cy="16" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="17" cy="12" r="1"/>',
  'uni-histogram':'<path d="M2 19h20M3 19v-6h4v6m0 0V5h5v14m0 0V2h5v17m0 0V9h4v10"/>',
  'uni-frequency':'<path d="M2 19h20M3 16l5-8 5-4 5 10 3 3"/><circle cx="8" cy="8" r="1.4"/><circle cx="13" cy="4" r="1.4"/>',
  'uni-cumulative':'<path d="M2 19h20M3 19v-4h4v4m0 0v-8h5v8m0 0V6h5v13m0 0V2h4v17"/>',
  'uni-ecdf':'<path d="M2 19h4v-4h4v-4h5V6h4V2h3"/>',
  'eval-roc':'<path d="M3 2v17h19M3 19l4-10 5-4 10-3M3 19l19-17"/>',
  'eval-pr':'<path d="M3 2v17h19M3 3h6v3h5v4h5v5h3"/>',
  'eval-threshold':'<path d="M3 2v17h19M4 3l5 2 5 5 7 6M4 7l5 3 5 5 7 3"/>',
  'eval-calibration':'<path d="M3 2v17h19M3 19L22 2M4 17l5-3 6-7 6-2"/><circle cx="9" cy="14" r="1.7"/><circle cx="15" cy="7" r="1.7"/>',
  'corr-heatmap':'<path d="M3 2h18v18H3Zm6 0v18m6-18v18M3 8h18M3 14h18"/>',
  'corr-triangle':'<path d="M3 2h6v6h6v6h6v6H3Zm0 6h6v12m-6-6h12v6"/>',
  'corr-bubbles':'<circle cx="6" cy="5" r="3"/><circle cx="17" cy="5" r="1.5"/><circle cx="6" cy="16" r="1.5"/><circle cx="17" cy="16" r="3"/>',
  'corr-pairs':'<path d="M12 2v18M12 4h9v3h-9m0 3H5v3h7m0 3h5v3h-5"/>'
});
Object.assign(icons,{
 'process-individual':'<path d="M3 3v17h19M4 11h17M4 5h17M4 17h17m-17-5 4-3 4 5 4-6 5 4"/>',
 'process-imr':'<path d="M3 2v8h19M3 13v8h19M4 6h17m-17 0 4-2 4 3 4-4 5 3M4 18l4-3 4 4 4-2 5-3"/>',
 'multivariate-matrix':'<path d="M2 2h20v20H2Zm7 0v20m6-20v20M2 9h20M2 15h20"/><circle cx="5" cy="12" r=".8"/><circle cx="12" cy="18" r=".8"/>',
 'multivariate-focus':'<path d="M3 3v18h18M14 2h8v8m0-8-8 8"/><circle cx="8" cy="16" r="1"/><circle cx="12" cy="13" r="1"/><circle cx="17" cy="12" r="1"/>',
  'method-scatter':'<path d="M4 4v16h16M7 16l10-10"/><circle cx="9" cy="13" r="1.4"/><circle cx="15" cy="8" r="1.4"/>',
  'method-bland':'<path d="M4 4v16h16M5 11h15M6 6h3m3 0h3m3 0h2M6 16h3m3 0h3m3 0h2"/><circle cx="10" cy="9" r="1"/><circle cx="16" cy="13" r="1"/>',
  'method-delta':'<path d="M12 3v18M7 7h5m0 5h6m-9 5h3"/><circle cx="7" cy="7" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="9" cy="17" r="1.5"/>',
  'method-pairs':'<path d="M8 7h8M6 16h12"/><circle cx="6" cy="7" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="4" cy="16" r="2"/><circle cx="20" cy="16" r="2"/>',
  'prediction-scatter':'<path d="M4 4v16h16M6 18L18 6"/><circle cx="8" cy="14" r="1.5"/><circle cx="16" cy="7" r="1.5"/>',
  'prediction-residual':'<path d="M4 4v16h16M4 12h16"/><circle cx="8" cy="8" r="1.3"/><circle cx="12" cy="15" r="1.3"/><circle cx="17" cy="9" r="1.3"/>',
  'prediction-absolute':'<path d="M4 4v16h16M8 20v-8m5 8V8m5 12v-7"/><circle cx="8" cy="10" r="1.5"/><circle cx="13" cy="6" r="1.5"/><circle cx="18" cy="11" r="1.5"/>',
  'prediction-ranked':'<path d="M10 3v18m0-14h10M4 12h6m0 5h5"/><circle cx="20" cy="7" r="1.3"/><circle cx="4" cy="12" r="1.3"/><circle cx="15" cy="17" r="1.3"/>',
  'confusion-counts':'<rect x="4" y="4" width="16" height="16"/><path d="M4 12h16M12 4v16M6 6h4v4H6zM14 14h4v4h-4z"/>',
  'confusion-bubbles':'<circle cx="7" cy="7" r="3.5"/><circle cx="17" cy="7" r="1.5"/><circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="3.5"/>',
  'confusion-rows':'<rect x="3" y="5" width="18" height="5"/><rect x="3" y="14" width="18" height="5"/><path d="M14 5v5M8 14v5"/>',
  'confusion-columns':'<rect x="5" y="3" width="5" height="18"/><rect x="14" y="3" width="5" height="18"/><path d="M5 14h5M14 8h5"/>'
});
const originalViewName=id=>scientificViews.find(v=>v.id===id)?.name||relationalViews.find(v=>v.id===id)?.name||seriesViews.find(v=>v.id===id)?.name||({columns:uiText('柱状图'),line:uiText('折线图'),area:uiText('面积图'),bars:uiText('条形图'),bubbles:uiText('气泡图'),pie:uiText('饼状图'),donut:uiText('环形图'),treemap:uiText('矩形树图'),rose:uiText('玫瑰图'),stacked:uiText('份额带'),lollipop:uiText('棒棒糖图'),dot:uiText('点图'),squares:uiText('比例方块'),semidonut:uiText('半环图'),radialbars:uiText('径向柱图'),radar:uiText('雷达图'),waterfall:uiText('瀑布图'),funnel:uiText('漏斗图'),pareto:uiText('帕累托图'),waffle:uiText('华夫图'),diverging:uiText('发散条形图'),step:uiText('阶梯折线图'),polarline:uiText('极坐标折线图'),unit:uiText('单位堆叠图'),'funnel-bars':uiText('转化漏斗')})[id]||id;
Object.assign(icons,{
 'eval-ks':'<path d="M3 2v18h19M3 18h5v-5h5V7h6V3h3M3 19h9v-2h6v-5h4M13 7v10"/>',
 'eval-gains':'<path d="M3 2v18h19M3 20 9 9l6-4 7-3M3 20 22 2"/>',
 'eval-lift':'<path d="M3 2v18h19M3 15h19M3 3l5 2 5 5 9 5"/>',
 'distribution-sina':'<path d="M3 20h19M7 4h.01M9 7h.01M6 10h.01M11 12h.01M8 16h.01M16 5h.01M18 9h.01M15 13h.01M18 17h.01" stroke-width="2.6"/>',
 'distribution-boxen':'<path d="M12 2v18M9 3h6v14H9Zm-3 3h12v8H6Zm-3 2h18v4H3Z"/>',
 'distribution-halfeye':'<path d="M2 16h20M4 16c2-1 2-12 7-12s4 11 9 12M5 20h12m-9-2h6v4H8Z"/>',
 'distribution-quantiledot':'<path d="M2 21h20M4 18h.01M8 18h.01M12 18h.01M16 18h.01M20 18h.01M8 14h.01M12 14h.01M16 14h.01M12 10h.01M12 6h.01" stroke-width="2.5"/>',
 'freq-bode':'<path d="M3 2v8h19M3 13v8h19M4 4h7l5 2 5 3M4 15h5l5 4h7"/>',
 'freq-nyquist':'<path d="M2 11h20M12 2v19M18 5c-8-7-18 9-10 13s15-6 6-9"/>',
 'freq-nichols':'<path d="M3 2v18h19M5 17c0-13 5-15 9-10s6 6 7 6"/>'
});
export const viewName=id=>uiText(originalViewName(id));
Object.assign(icons,{
 'serial-acf':'<path d="M2 11h20M4 11V3m4 8V6m4 5v5m4-5V8m4 3v2"/>',
 'serial-pacf':'<path d="M2 11h20M4 11V3m4 8v6m4-6V9m4 2v2m4-2v-1"/>'
});
Object.assign(icons,{
 "stat-qq": "<path d=\"M3 2v18h19M5 17 20 3M7 16h.1M10 12h.1M14 8h.1M18 5h.1\"/>",
 "stat-pp": "<path d=\"M3 2v18h19M3 20 22 2M6 16h.1M11 14h.1M16 7h.1M20 4h.1\"/>",
 "stat-weibull": "<path d=\"M3 2v18h19M5 18 19 4M8 15h.1M11 10h.1M16 6h.1\"/>",
 "stat-meanexcess": "<path d=\"M3 2v18h19M5 13 8 10l4 2 5-7 4-2M7 19v2M12 19v2M19 19v2\"/>",
 "stat-ttt": "<path d=\"M3 2v18h19M3 20Q8 5 22 2M3 20 22 2\"/>",
 "stat-lorenz": "<path d=\"M3 2v18h19M3 20Q19 19 22 2M3 20 22 2\"/>",
 "stat-ecdfband": "<path d=\"M3 2v18h19M3 18h5v-4h5v-5h5V4h4M3 15h5v-4h5V6h5V2h4\"/>",
 "stat-survival": "<path d=\"M3 2v18h19M3 3h5v4h5v5h5v4h4M10 5v4m-2-2h4\"/>",
 "stat-nelsonaalen": "<path d=\"M3 2v18h19M3 19h5v-3h5v-4h5V5h4M9 14v4m-2-2h4\"/>",
 "structural-bubbles": "<path d=\"M3 2v18h19M7 6h.1M14 6h.1M20 6h.1M7 13h.1M14 13h.1M20 13h.1\"/>",
 "structural-radial": "<path d=\"M12 1v20M2 11h20M5 4l14 14M5 18 19 4M12 2a9 9 0 1 0 0 18 9 9 0 1 0 0-18M12 6a5 5 0 1 0 0 10 5 5 0 1 0 0-10\"/>",
 "structural-agreement": "<path d=\"M3 2h18v18H3zM3 2h8v8H3zM11 10h10v10H11z\"/>",
 "structural-association": "<path d=\"M3 11h18M4 3h5v8H4zM12 11h8v7h-8z\"/>",
 "structural-mosaic": "<path d=\"M3 2h18v18H3zM11 2v18M3 8h8m0 6h10\"/>",
 "structural-pack": "<path d=\"M12 2a9 9 0 1 0 0 18 9 9 0 1 0 0-18M8 5a4 4 0 1 0 0 8 4 4 0 1 0 0-8M16 10a4 4 0 1 0 0 8 4 4 0 1 0 0-8\"/>",
 "structural-tree": "<path d=\"M12 11 4 4m8 7 8-7m-8 7v9M4 4 2 9m2-5 5-2m11 2 2 5m-2-5-5-2M12 20l-5-3m5 3 5-3\"/>",
 "structural-table": "<path d=\"M3 3h18v3H3zM6 9h15v3H6zM9 15h12v3H9zM3 7v10h4\"/>",
 "target-progress": "<path d=\"M3 4h18v4H3zM3 13h18v4H3zM15 2v8M12 11v8\"/>",
 "target-fan": "<path d=\"M12 11 3 6a10 10 0 0 1 9-5zM12 11V1a10 10 0 0 1 10 10zM12 11h8a8 8 0 0 1-8 8z\"/>",
 "target-bullet": "<path d=\"M3 4h18v13H3zM3 8h12v5H3M18 3v15M10 4v13\"/>",
 "target-gauge": "<path d=\"M3 17a9 9 0 0 1 18 0M12 17l5-9M3 17h18\"/>",
 "target-pairs": "<path d=\"M4 5h15M4 15h12M4 3v4m15-4v4M4 13v4m12-4v4\"/>",
 "metric-cards": "<path d=\"M3 3h8v7H3zM14 3h8v7h-8zM3 13h8v7H3zM14 13h8v7h-8z\"/>",
 "metric-pairs": "<path d=\"M3 4h17M3 11h17M3 18h17M7 2v4m8-4v4M5 9v4m12-4v4M9 16v4m8-4v4\"/>",
 "paired-combo": "<path d=\"M3 2v18h19M6 20v-8h3v8m4 0V8h3v12m4 0V5h2v15M4 12l6-8 6 3 6-5\"/>",
 "paired-difference": "<path d=\"M3 2v18h19M4 14l6-9 6 6 6-8M4 6l6 8 6-9 6 9\"/>",
 "paired-lines": "<path d=\"M3 2v18h19M4 16l6-7 6 3 6-8M4 10l6 4 6-8 6 3\"/>"
});
Object.assign(icons,{
 "network-chord": "<path d=\"M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18M5 5q3 9 14 11M4 14Q15 15 16 3M6 18Q12 9 20 9\"/>",
 "network-arc": "<path d=\"M3 18h18M4 18a8 12 0 0 1 16 0M4 18a4 7 0 0 1 8 0M12 18a4 6 0 0 1 8 0\"/>",
 "network-force": "<path d=\"M5 4 12 10l8-5M12 10l-8 8m8-8 7 8M4 18l15 0M5 4l-1 14M19 18l1-13\"/>",
 "flow-sankey": "<path d=\"M3 2v18M21 2v18M3 5c8 0 8 10 18 10M3 10c8 0 8-5 18-5M3 17c8 0 8-8 18-8\"/>",
 "flow-chord": "<path d=\"M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18M5 5q4 8 13 10m-5 0h5v-5M5 15q9 1 11-11m-4 2 4-2 1 5\"/>",
 "flow-cycle": "<path d=\"M3 4h6v5H3zM16 4h6v5h-6zM9 15h6v5H9zM9 6h7m-3-2 3 2-3 2M19 9v8h-4M9 17H5V9\"/>",
 "compare-qq": "<path d=\"M3 2v18h19M4 19 21 3M7 16h.1M11 11h.1M14 8h.1M18 6h.1\"/>",
 "compare-delta": "<path d=\"M3 2v18h19M3 12h19M5 15l5-4 5 2 6-8\"/>",
 "compare-ecdf": "<path d=\"M3 2v18h19M3 18h4v-5h5v-5h5V3h5M3 18h7v-3h4v-4h6V5h2\"/>",
 "compare-rootogram": "<path d=\"M3 11h19M4 5h4v9H4zM10 2h4v14h-4zM16 6h4v7h-4zM4 5Q12-1 20 6\"/>",
 "compare-counts": "<path d=\"M3 2v18h19M5 20V9h3v11m3 0V4h3v16m3 0V8h3v12M4 12l8-9 9 7\"/>",
 "compare-worm": "<path d=\"M3 2v18h19M3 11h19M4 16q5-11 9-5t8-7\"/>",
 "compare-residual-qq": "<path d=\"M3 2v18h19M4 18 21 3M6 17h.1M10 12h.1M16 8h.1M20 6h.1\"/>",
 "compare-spreadlevel": "<path d=\"M3 2v18h19M5 17l5-5 5-1 6-7M7 16h.1M12 10h.1M18 8h.1\"/>",
 "compare-group-intervals": "<path d=\"M3 2v18h19M7 7v10m-2-10h4m-4 10h4M14 4v9m-2-9h4m-4 9h4M20 8v10m-2-10h4m-4 10h4\"/>"
});
export const viewIcon=id=>`<svg viewBox="0 0 24 22" width="23" height="21" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[id]||''}</svg>`;
const playIcon='<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="m7 4 9 6-9 6Z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const stopIcon='<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M6 4v12m8-12v12" stroke="currentColor" stroke-width="1.5"/></svg>';
const fmt=n=>new Intl.NumberFormat('zh-CN',{maximumSignificantDigits:6}).format(n);

export function mountSequencePlayer(host,value,{onView,onEdit,onReorder,embedded=false}={}){
  let project=cleanSequence(value),scene,automatic=false,disposed=false,timer=null,visible=true;
  const win=host.ownerDocument.defaultView,media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  host.innerHTML=uiMarkup`<section class="ms-player ${embedded?'ms-embedded':''}" aria-label="图型连续变形画布"><figure class="ms-figure"><header class="ms-figure-head"><div><p class="ms-eyebrow">FORMA <span>/</span> MORPH STUDY</p><h2 data-ms-title></h2><p class="ms-subtitle" data-ms-subtitle></p></div><div class="ms-total"><strong data-ms-total></strong><span data-ms-unit></span></div></header><div class="ms-chart"></div><figcaption><span data-ms-note></span><span data-ms-status role="status"></span></figcaption><div class="ms-legend" aria-label="各类别原始数据"></div></figure><div class="ms-composer"><div class="ms-sequence-heading"><div><span>变形顺序</span><small>点击预览${onReorder?uiText(' · 拖动排序'):''}</small></div>${onEdit?uiText('<button type="button" class="ms-edit-sequence" data-ms-edit>调整顺序 <span aria-hidden="true">↗</span></button>'):''}</div><div class="ms-sequence" role="group" aria-label="点击切换图型"></div></div><footer class="ms-playback"><button type="button" data-ms-play></button><span data-ms-caption></span><span class="ms-source" data-ms-source></span></footer></section>`;
  const $=s=>host.querySelector(s),root=$('.ms-player');
  function stopTimer(){win.clearTimeout(timer);timer=null;}
  function schedule(){stopTimer();if(automatic&&visible&&!disposed&&!win.document.hidden&&!scene?.animating)timer=win.setTimeout(()=>switchView(project.views[(project.views.indexOf(project.currentView)+1)%project.views.length],false),project.hold);}
  function playButton(){const button=$('[data-ms-play]');button.innerHTML=`${automatic?stopIcon:playIcon}<span>${automatic?uiText('停止演示'):uiText('自动演示')}</span>`;button.setAttribute('aria-pressed',String(automatic));button.disabled=!!media?.matches;$('[data-ms-caption]').textContent=media?.matches?uiText('已开启减少动态效果'):uiMessage`形变 ${(project.duration/1000).toFixed(1)}s · 停留 ${(project.hold/1000).toFixed(1)}s`;}
  function changed({view,animating}){
    project.currentView=view;root.dataset.animating=String(animating);
    host.querySelectorAll('[data-ms-view]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.msView===view));});
    const strip=$('.ms-sequence'),active=host.querySelector(`[data-ms-view="${view}"]`);
    if(active){const left=active.offsetLeft-strip.offsetLeft;if(left<strip.scrollLeft)strip.scrollLeft=left;else if(left+active.offsetWidth>strip.scrollLeft+strip.clientWidth)strip.scrollLeft=left+active.offsetWidth-strip.clientWidth;}
    $('[data-ms-note]').textContent=morphViews.find(v=>v.id===view).note;
    $('[data-ms-status]').textContent=animating?uiText('正在变形'):viewName(view);
    if(animating)stopTimer();else schedule();onView?.(view,animating);
  }
  function render(){
    const t=themeFor(project.palette,project.dark,project.colors),total=project.doc.data.reduce((sum,r)=>sum+r.value,0);
    root.style.cssText=`--ms-paper:${t.bg};--ms-ink:${t.fg};--ms-muted:${t.secondary};--ms-line:${t.line};--ms-tint:${t.soft};--ms-accent:${t.accent}`;
    $('[data-ms-title]').textContent=project.doc.title;$('[data-ms-subtitle]').textContent=project.doc.subtitle||uiText('同一份数据，在不同图型中连续变形');
    $('[data-ms-total]').textContent=fmt(total);$('[data-ms-unit]').textContent=uiMessage`合计 / ${project.doc.unit}`;
    $('[data-ms-source]').textContent=`${project.doc.source.type==='demo'?uiText('演示数据 · '):''}${project.doc.source.name}`;
    $('.ms-legend').innerHTML=project.doc.data.map((r,i)=>`<div><span><i style="background:${t.colors[i%t.colors.length]}"></i><em>${String(i+1).padStart(2,'0')}</em>${esc(r.label)}</span><strong>${fmt(r.value)}<small>${(r.value/total*100).toFixed(1)}%</small></strong></div>`).join('');
    $('.ms-legend').style.setProperty('--ms-columns',project.doc.data.length);
    $('.ms-sequence').innerHTML=project.views.map((id,i)=>uiMarkup`<button type="button" data-ms-view="${id}" ${onReorder?'draggable="true"':''} aria-label="变换为${viewName(id)}" aria-pressed="${id===project.currentView}"><small>${String(i+1).padStart(2,'0')}</small>${viewIcon(id)}<span>${viewName(id)}</span></button>`).join('');
    playButton();
  }
  function createScene(){scene=new MorphChart($('.ms-chart'),project.doc,{palette:project.palette,dark:project.dark,colors:project.colors,view:project.currentView,onChange:changed});}
  function switchView(view,manual=true){if(disposed||!project.views.includes(view))return;if(manual){automatic=false;playButton();}stopTimer();scene.setView(view,{effect:project.effect,duration:project.duration,animate:!media?.matches});}
  render();createScene();
  $('.ms-sequence').addEventListener('click',e=>{const b=e.target.closest('[data-ms-view]');if(b)switchView(b.dataset.msView);});
  let draggedView=null;
  $('.ms-sequence').addEventListener('dragstart',e=>{if(!onReorder)return;const b=e.target.closest('[data-ms-view]');if(!b)return;draggedView=b.dataset.msView;e.dataTransfer?.setData('text/plain',draggedView);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';});
  $('.ms-sequence').addEventListener('dragover',e=>{if(draggedView&&e.target.closest('[data-ms-view]')){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';}});
  $('.ms-sequence').addEventListener('drop',e=>{const b=e.target.closest('[data-ms-view]');if(draggedView&&b){e.preventDefault();onReorder(project.views.indexOf(draggedView),project.views.indexOf(b.dataset.msView));}draggedView=null;});
  $('.ms-sequence').addEventListener('dragend',()=>{draggedView=null;});
  $('[data-ms-edit]')?.addEventListener('click',()=>{automatic=false;stopTimer();playButton();onEdit();});
  $('[data-ms-play]').addEventListener('click',()=>{automatic=!automatic;playButton();if(automatic)switchView(project.views[(project.views.indexOf(project.currentView)+1)%project.views.length],false);else stopTimer();});
  const resize=new win.ResizeObserver(()=>scene?.resize());resize.observe($('.ms-chart'));
  const observer=win.IntersectionObserver?new win.IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?schedule():stopTimer();}):null;observer?.observe(host);
  const visibility=()=>win.document.hidden?stopTimer():schedule();win.document.addEventListener('visibilitychange',visibility);
  const reduce=()=>{if(media.matches){automatic=false;stopTimer();}playButton();};media?.addEventListener('change',reduce);
  return {setProject(value,{animate=true}={}){
    const next=cleanSequence(value),dataChanged=JSON.stringify(next.doc)!==JSON.stringify(project.doc);project=next;automatic=false;stopTimer();render();
    if(dataChanged){scene.destroy();createScene();}else{scene.options.colors=project.colors;scene.setPalette(project.palette,project.dark);scene.setView(project.currentView,{animate,duration:project.duration,effect:project.effect});}
  },switchView,stop(){automatic=false;stopTimer();playButton();},destroy(){disposed=true;stopTimer();resize.disconnect();observer?.disconnect();win.document.removeEventListener('visibilitychange',visibility);media?.removeEventListener('change',reduce);scene.destroy();host.replaceChildren();}};
}
