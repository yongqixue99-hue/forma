// This module is replaced with a smaller registry for standalone work profiles.
import {ChartScene} from './charts.js';
import {MorphChart} from './morph.js';
import {SeriesMorphChart} from './series-morph.js';
import {PairedMorphChart} from './paired-morph.js';
import {HierarchyMorphChart} from './hierarchy-morph.js';
import {ScientificMorphChart} from './scientific-morph.js';
export const workRenderers={native:ChartScene,single:MorphChart,series:SeriesMorphChart,paired:PairedMorphChart,hierarchy:HierarchyMorphChart,scientific:ScientificMorphChart};
