import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,getExample} from '../../src/forma/catalog.js';
import {libraryCatalog,motionCoverage} from '../../src/forma/library-capabilities.js';
import {filterCatalog,facetCounts} from '../../src/forma/library-filter.js';
import {morphReady} from '../../src/forma/work-model.js';

test('library animation counts partition templates and use actual work eligibility',()=>{
  assert.deepEqual(motionCoverage,{templates:204,morph:112,entrance:92,encodings:153});
  assert.deepEqual(libraryCatalog.map(t=>t.id),catalog.map(t=>t.id));
  for(const t of libraryCatalog)assert.equal(t.motion==='morph',morphReady({doc:getExample(t.id)}),t.id);
  const morph=filterCatalog(libraryCatalog,{motion:'morph'}),entrance=filterCatalog(libraryCatalog,{motion:'entrance'});
  assert.equal(new Set([...morph,...entrance].map(t=>t.id)).size,204);
  assert.ok(entrance.every(t=>!morph.some(m=>m.id===t.id)));
});

test('animation filters compose with research, visual family, search and favorites',()=>{
  const filters={motion:'morph',category:'research',family:'line',query:'ROC',onlyFavorites:true,favorites:['roc','pca']};
  assert.deepEqual(filterCatalog(libraryCatalog,filters).map(t=>t.id),['roc']);
  assert.deepEqual(filterCatalog(libraryCatalog,{...filters,motion:'entrance'}),[]);
  assert.equal(filterCatalog(libraryCatalog,{family:'spatial',motion:'morph'}).length,3);
  assert.equal(filterCatalog(libraryCatalog,{family:'spatial',motion:'entrance'}).length,3);
  assert.equal(filterCatalog(libraryCatalog).length,204);
});

test('facets preserve other conditions and remove only their own dimension',()=>{
  const filters={motion:'morph',family:'scatter'};
  const motion=facetCounts(libraryCatalog,filters,'motion');
  assert.equal(motion.all,36);assert.equal(motion.morph+motion.entrance,motion.all);
  assert.equal(motion.morph,filterCatalog(libraryCatalog,filters).length);
  assert.equal(facetCounts(libraryCatalog,filters,'family').all,112);
  const favorites=facetCounts(libraryCatalog,{motion:'morph',onlyFavorites:true,favorites:['roc','pca']},'motion');
  assert.deepEqual(favorites,{all:2,morph:1,entrance:1});
});

test('discovery metadata does not override the eligibility of user-edited data',()=>{
  const doc=getExample('pie');doc.data[0].value=-10;
  assert.equal(libraryCatalog.find(t=>t.id==='pie').motion,'morph');
  assert.equal(morphReady({doc}),false);
});
