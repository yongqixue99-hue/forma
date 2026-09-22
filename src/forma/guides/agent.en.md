# Use FORMA with a browser-capable Agent

Website: https://forma.ovocode.xyz/
Guide: https://forma.ovocode.xyz/#guide

You are helping me make an animated data presentation in FORMA. Use the website and my supplied data, then deliver the exported files. If my request lacks the dataset or the intended comparison, ask for the missing information. Do not invent values, sources, confidence intervals, or findings.

## 1. Choose a starting point

Open FORMA. The first screen introduces the product; scroll down for the full example player. Choose Revenue, Growth, or Penguins, then **Edit this example** to open a copy in the Editor. Use **Chart library** for a single chart, or **Motion gallery → Use preset** for a ready-made sequence. Starting from an example does not make its data mine: replace it when I supply a dataset.

Each chart detail has **Recommended use cases**, with a question it answers and alternatives. Check **When to choose this chart** before importing. To shortlist by task, read https://forma.ovocode.xyz/forma/chart-recommendations.json and then the chosen chart’s contract. The installable FORMA skill is available in **Guide → Work with your Agent**.

Use the site's visible controls with your browser tools. Do not edit browser storage or undocumented internal state. The site starts in English; the top-right language switch also offers Chinese. This changes the interface, not my original titles or data.

## 2. Import and check data

In the Editor, select a step and open **Data → Import table**. Supply XLSX, CSV, TSV, or pasted cells. Select the sheet/range, confirm headers, and map columns to the chart fields. Inspect the import preview before applying. Use **Original / Fields** to inspect retained columns. The question mark beside the data table explains this chart's fields and limits.

- Preserve original values, units, dates, missing observations and sources. A blank is not zero.
- Check row counts, negative values, percentages and category names against the source. Do not drop rows to fit a chart; choose a suitable chart or ask before aggregating.
- Spreadsheet formulas use their saved values; FORMA does not recalculate them.
- For country maps, use a full country name or ISO code, such as Germany / DE / DEU. Choose from the country suggestions when a prefix is ambiguous; one initial is not a unique country.
- XLSX input: at most 8 MB. Text input: at most 2 MB. A selected range supports up to 1,501 rows including its header and 32 columns. If a limit is hit, resolve it with me; do not silently truncate.

After applying, check the chart title, units, signs, labels and source. Table edits and paste support Undo. Errors retain the last valid chart, so do not mistake a stale preview for a successful edit.

## 3. Build the sequence

Use **Add step → Reuse current data** for another compatible view of the same records. Each step keeps an independent copy. After changing data, use **Sync data**, inspect the affected steps and apply the intended selection.

Use chart types that fit the meaning of the data. Shares need an additive, nonnegative whole; growth rates are not additive. Use continuous morphing for matched observations with compatible meanings. For unrelated datasets, use a complete scene change. A moving shape is not an extra measured result.

Select a step to edit its title and **Style**. Use **Annotations** for a short note or a marker attached to a record; apply it and check the settled chart. Keep notes clear of the plotted data. Use a consistent palette, legible labels and the requested aspect ratio.

## 4. Set timing and watch the whole work

Use **Preview → Play all** to check entrance animation, transitions and static holds from the beginning. Drag the red timeline thumb to seek. To shorten or extend a static hold, drag the small grip on that step's timeline segment left or right; the tooltip shows seconds. Holds support 0.5–12 seconds. The grip also supports arrow keys.

The preview speed options are 0.5×, 1×, 2× and 3×. They change motion speed during preview and leave holds at their actual duration; they do not rewrite exported timing. Use **Timing** or the between-step **Transition** settings to change the saved animation duration. Replay after changing timing. Respect reduced-motion settings; do not disable a user's preference without asking.

## 5. Save and deliver

Click **Save project**. Projects live in the current browser at the current site address; there is no account sync. Download an editable project file before changing browser, device or site. Restore project files through **My projects → Restore backup**; inspect the restore preview, which creates a copy. Never clear storage or overwrite another work to finish this task.

Choose the format requested:

| Destination | Action |
| --- | --- |
| Static image in PowerPoint or Word | **Copy prompt → dropdown → Copy image**, then paste into the destination app, or export PNG. This is a picture, not an editable Office chart. |
| PowerPoint presentation | In chart details or the Editor, choose **Export → PowerPoint · PPTX**. Use static charts or embedded animation; a multi-step static work has one slide per step. |
| Animation as a separate video | Export MP4, then insert the file using **Insert → Video**. Clipboard image copy cannot carry animation. |
| Interactive playback in a browser | Export interactive HTML; open the downloaded file and test playback. |
| Vector layout | Export SVG. SVG code in the clipboard is not a universally pasteable Office image. |
| Continue editing in FORMA | Export the editable project JSON. |

Before handing over, compare the exported chart with the input: values, labels, units, sources, missing data, and annotations. Watch the start, transitions and end of the exported animation. Report the actual delivered files and anything you could not verify. Do not claim a successful download or paste without checking it.

## Handing the work to an Agent that writes code

The primary **Copy prompt** button on every chart and in the Editor copies its Agent instructions. Image copy is available from the adjacent dropdown. The prompt includes data, style, steps, timing and ready-to-run HTML referencing the original version-pinned FORMA player. Give it and your Excel table to the Agent; no separate HTML attachment is needed. The Agent should update the data and download the original player alongside the result for offline delivery.

This tutorial explains how to operate FORMA; it does not include my current work or authorize sharing it. FORMA does not call a model API or send my tables to an Agent automatically.


## Structured configuration and repeated reports

Guide → Open Agent configuration accepts a version 1 request or work JSON, validates it, then opens an independent project. API and offline helper reference: https://forma.ovocode.xyz/forma/agent-api.md . Use this documented interface or visible controls; do not modify storage directly.

For another reporting period, choose Editor → Next report. Import the new table, choose stable IDs or unique identity fields, review changed objects/units and annotation warnings, then create the new report. The original is retained. For PowerPoint, Export → PowerPoint downloads either one static image slide per step or a slide with embedded animation. Keep the editable JSON to change chart data.
