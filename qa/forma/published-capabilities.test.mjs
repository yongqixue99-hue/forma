import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalog} from '../../src/forma/catalog.js';
import {workViews} from '../../src/forma/work-model.js';
import {scenarioPresets} from '../../src/forma/scenario-presets.js';
import {motionCoverage} from '../../src/forma/library-capabilities.js';

test('downloadable capability inventory describes the shipped library and morph registry',async()=>{
 const publicInventory=JSON.parse(await readFile('public/forma/capabilities.json','utf8'));
 assert.equal(publicInventory.counts.templates,catalog.length);
 assert.equal(publicInventory.counts.editorViews,workViews.length);
 assert.equal(publicInventory.counts.directNativeAdapters,motionCoverage.morph);
 assert.equal(publicInventory.counts.scenePresets,scenarioPresets.length);
 assert.deepEqual(publicInventory.templates.map(t=>t.id),catalog.map(t=>t.id));
 assert.deepEqual(publicInventory.scenarios.map(p=>p.id),scenarioPresets.map(p=>p.id));
 const checklist=await readFile('public/forma/morph-coverage.md','utf8');
 for(const id of ['series-rank','sample-ridge','matrix-clustered'])assert.ok(checklist.includes(id),id);
});
