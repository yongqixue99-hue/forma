# Selection distinctions

Use these distinctions with the chosen chart's live contract. Capacities are FORMA implementation limits, not universal statistical sample-size rules. A chart passing validation can still answer the wrong question.

| Question or input | Starting choice | Check before proceeding |
| --- | --- | --- |
| Compare long category labels, signed profits or independent rates | `bar` | Preserve units/order. Negative values or unrelated rates are not parts of a pie. |
| Compare several series in categories | `groupedbar`, `groupedbarh` | FORMA's horizontal grouped bars require nonnegative values; grouped columns support negatives. |
| Show parts of one whole | `donut`, `mosaic`, `pie` | Same denominator, mutually exclusive additive nonnegative parts. Use bars for close values; missing categories can change the total. |
| Show percentages across groups | `stacked`, `percentcolumn` | `stacked` expects existing percentages totaling 100; `percentcolumn` derives shares from nonnegative amounts. Never add growth rates as though they were volume. |
| One regular time series | `singleline` | Do not collapse irregular timestamps onto equal intervals. For several series with a common irregular date set, `smallmultiples` retains real spacing. If none fits, explain rather than distort time. |
| Group-level before/after estimates | `dumbbell` or `slope` | Individual matched subjects belong in `paired`. Never invent pairing by sorting unrelated groups. |
| Raw observations by group | `swarm`, `boxplot`, `raincloud`, `violin` | Raw samples are required. Means and error bounds alone belong in `interval`; do not synthesize a distribution from summaries. |
| Proportion below a threshold | `ecdf` | Requires individual measurements. A histogram answers concentration across bins instead. |
| Two numeric measures | `xy` | `scatter` additionally requires a real size measure. Do not assign arbitrary bubbles to make the picture interesting. |
| Many variables in matched samples | `splom`, `correlation` | Correlation is linear and not causation. Keep matching sample IDs. FORMA's parallel coordinates require comparable units/scales. |
| Map absolute counts | `geomap` or `bar` | Use actual coordinates, not fabricated centroids. A choropleth is usually for comparable rates/density, with unknown regions left unmeasured. Consult the live country contract for supported codes; a single initial is ambiguous. |
| Estimate and uncertainty | `interval`, `ribbon` | Supplied bounds need their actual definition. `forest` supports positive ratio estimates and does not pool studies. |
| Two measurement methods | `blandaltman` | Same subjects and units; correlation alone does not measure agreement. |
| Rare positive retrieval | `precisionrecall` | Raw scores and binary outcomes, matched across models. `roc` asks about discrimination, `calibration` asks whether probabilities are trustworthy. A confusion-count matrix cannot reconstruct score curves. |
| PCA, differential analysis, association or enrichment results | `pca`, `pcaloadings`, `volcano`, `manhattan`, `enrichment` | These need already-computed results. Sample scores are not variable loadings. The display does not run the underlying analysis. |
| Serial dependence | `acf`, `pacf` | Complete, nonconstant, equally spaced raw sequence; no silent interpolation. Read the estimator notes. Plots alone do not identify a model. |
| Process stability | `imr` | Ordered single measurements; all supplied data estimate one baseline. Control limits are not specification limits; a fixed external baseline is a different task. |
| Conserved flows vs general connections | `alluvial` vs `network` / `directedchord` | Sankey requires acyclic conserved intermediate flow. Network proximity is a layout, not a measurement. |
| Spatial surface or vector field | `contour`, `surface3d`, `vectorfield` | Surfaces need a complete uniform grid; vectors need measured components and consistent spatial units. Do not turn a few points into a claimed measurement field. |

For static reports, prefer a readable two-dimensional view when depth or overlapping marks hide values. Avoid extra animation steps that change the statistical meaning. If the available data cannot support the intended chart, ask for the missing data or deliver a simpler supported representation and explain its scope.
