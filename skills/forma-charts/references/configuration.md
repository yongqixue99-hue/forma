# FORMA configuration API v1

The browser and the included Node helper share the same validator. Configuration stays on the local device. No account, network POST, storage token or paid model is required. This interface creates new works; it does not overwrite the current project.

## Routes

- In the site, use `window.FormaAgent.validate(request)` and `await window.FormaAgent.open(request)` through a browser tool that supports page JavaScript. `open` waits for the existing editor to save, then opens an independent work.
- With Node 22 or newer, run `node scripts/configure.mjs request.json output.forma-work.json`. The bundled module works offline. It will not overwrite an existing output file.
- With file uploads only, open Guide → Open Agent configuration. Upload or paste JSON, Validate, then Open in Editor. This accepts either a request or a canonical `forma-work` file.
- Standalone ES module: `https://forma.ovocode.xyz/forma/agent-api.mjs` exports `API_VERSION`, `capabilities`, `validate`, `configure`, `serialize`, `prepareReportUpdate`, `createNextReport`. The module has no `open` operation outside the website.

`validate` returns `{version:1,valid,errors:[{path,code,message}],warnings,work?}`. It performs no writes. `configure` returns the canonical work, throwing an error with `.report` on failure. `serialize` returns its JSON. IDs are allocated per configuration; retain the returned work when updating it. `open` waits until the new editor is mounted, rejects concurrent open calls, accepts a valid request/work and returns `{version,id,url,steps}`; `url` opens the editor on this device, not a public sharing link.

## Request

```json
{
  "kind": "forma-agent-request",
  "version": 1,
  "name": "Regional results",
  "steps": [{
    "chart": "bar",
    "metadata": {"title":"Net change by region","subtitle":"Illustrative format example","unit":"units","source":"Replace with the user's source"},
    "table": {
      "headers": ["record_id","Region","Change","Source note"],
      "rows": [["north","North",12,"Example"],["south","South",-3,"Example"],["west","West",0,"Example"]],
      "mapping": {"label":1,"value":2},
      "idColumn": 0
    },
    "options": {"palette":"ink","ratio":"landscape"},
    "duration": 1500,
    "hold": 2500
  }]
}
```

Replace illustrative observations with the user's records. Up to 20 steps; request size 8 MB; each table up to 1500 rows and 32 columns, subject to chart-specific limits. Every required field needs an explicit zero-based column index. Rows accept strings, finite numbers and null. Unmapped columns and original headers are retained. Missing numeric values are never filled with zero.

Use either:
1. `chart`, `table`, `metadata` and, if needed, `parameters`; or
2. `chart` and a complete `document` matching that chart's published `exampleDocument` structure.

For table configuration, all entries in the chart contract's `parameters` list must be explicitly supplied in `parameters`. Copy a structural setting only when it fits the user's data. Do not silently inherit demo confidence definitions, model results, dates, units or labels. Axis/parameter editing stays available in the Editor.

Optional step properties: `options`, `view`, `transition`, `duration` (600–5000 ms), `hold` (500–12000 ms), `dataGroup`, `relation` (`auto`, `related`, `separate`), `scale` (`shared`, `step`). Options follow the normal work format: palette, dark, ratio, native duration (5/8/12 seconds), colors, brand, annotations and color mappings. Unknown fields and incompatible explicit morphs return errors.

For continuous morphs, use stable record IDs via `table.idColumn` (or document `_id`), the same explicit `dataGroup`, compatible data/units, and real shared identities. Declaring a group alone does not make rows equivalent. Use `transition:"auto"` for the validated default or `"entrance"` for independent steps. An alternative chart is not necessarily a morph view; read `animation.compatibleExampleViews` and recheck the actual data.

Keep the canonical returned work for further changes. A canonical `forma-work` version 1 file can be passed back to `validate` or `open`; original step and record IDs remain intact. `open` allocates an independent project ID.

## Validation and delivery

Do not treat a valid shape as proof of statistical suitability. Review warnings and check the rendered labels, scales, intervals, row counts, sources and playback. Export with the website's normal controls. Preserve an editable JSON alongside the requested image, video, HTML or presentation.

## Recurring reports

Start from a canonical saved work and a complete replacement chart document using the source step's schema. These functions are pure; they do not change storage or the input work.

```js
const proposal = FormaAgent.prepareReportUpdate(originalWork, {
  sourceStepId: originalWork.activeStep,
  document: nextPeriodDocument,
  matchBy: ['_id']
});
// Inspect proposal.summary and proposal.sync.targets before applying.
const nextWork = FormaAgent.createNextReport(originalWork, proposal, {
  name: 'Next quarter',
  stepIds: proposal.sync.targets.filter(t => t.eligible).map(t => t.id)
});
await FormaAgent.open(nextWork);
```

`matchBy: ['_id']` requires an explicit stable source ID column in both periods. Otherwise choose an appropriate unique text field such as `['label']`, or a complete composite of text fields. An empty list treats every row as a new object. Never match by row order or measured values. Renamed objects need stable IDs to retain their annotations. Name-based matching preserves internal record IDs but no longer designates the incoming ID column as their owner; that column remains in the source table.

The proposal reports matched/added/removed objects, changed mapped cells, headers, meaning/unit changes and annotation warnings. Only explicitly related eligible steps may be updated; `stepIds: []` updates only the source step. Styles, view choices and timing remain. Removed identities and changed units leave affected annotations for review, never silently point at another row. Review dates and narrative text in retained step titles. Changing the original after preview rejects the update; build a fresh proposal. The result gets a new project ID and leaves the original untouched.

## PowerPoint delivery

Use Editor → Export → PowerPoint. Static mode creates one high-resolution image slide per step; animated mode embeds the full MP4 in one slide. Both keep the selected canvas ratio. They are not native editable Office charts. Preserve a FORMA project JSON for data changes. Cancel export with the visible button or close the export panel.
