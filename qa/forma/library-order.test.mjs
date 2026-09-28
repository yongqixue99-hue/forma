import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {catalog} from '../../src/forma/catalog.js';
import {libraryCatalog} from '../../src/forma/library-capabilities.js';
import {filterCatalog} from '../../src/forma/library-filter.js';
import {commonTemplateOrder,orderLibraryCatalog} from '../../src/forma/library-order.js';

test('common charts lead discovery while all permanent template IDs and numbers remain intact',()=>{
  const original=structuredClone(catalog),libraryOriginal=structuredClone(libraryCatalog);
  const ordered=orderLibraryCatalog(libraryCatalog),ids=ordered.map(t=>t.id);
  assert.deepEqual(ids.slice(0,7),['column','bar','singleline','tide','pie','donut','area']);
  for(const id of ['groupedbar','stackedbar','xy','waterfall','heatmap'])assert.ok(ids.indexOf(id)<24,id);
  for(const id of ['bode','smith','campbell','cooksdistance','rootogram'])assert.ok(ids.indexOf(id)>100,id);
  assert.equal(ordered.length,204);
  assert.equal(new Set(ids).size,204);
  assert.deepEqual([...ids].sort(),catalog.map(t=>t.id).sort());
  for(const item of ordered)assert.equal(item,libraryCatalog.find(t=>t.id===item.id),'discovery reuses original entries');
  assert.deepEqual(catalog,original);
  assert.deepEqual(libraryCatalog,libraryOriginal);
  assert.equal(new Set(commonTemplateOrder).size,commonTemplateOrder.length);
  assert.ok(commonTemplateOrder.every(id=>ids.includes(id)),'recommendations only name actual templates');
});

test('search, category, motion and favorites retain the same recommendation order',()=>{
  const ordered=orderLibraryCatalog(libraryCatalog);
  for(const filters of [
    {family:'bar'}, {category:'research'}, {motion:'morph'},
    {query:'柱'}, {query:'scatter'},
    {onlyFavorites:true,favorites:['smith','donut','column','waterfall','tide']}
  ]){
    const filtered=filterCatalog(ordered,filters);
    assert.ok(filtered.length>0,JSON.stringify(filters));
    assert.deepEqual(filtered,orderLibraryCatalog(filterCatalog(libraryCatalog,filters)),JSON.stringify(filters));
    assert.deepEqual(filtered,orderLibraryCatalog([...filtered].reverse()),'order does not depend on previous filter results');
  }
});

test('new specialized templates remain discoverable after common charts without a manual rank',()=>{
  const input=[{id:'future-unlisted',no:'205',edition:20},{id:'column',no:'101',edition:9},{id:'smith',no:'197',edition:19}];
  const frozen=input.map(entry=>Object.freeze(entry));Object.freeze(frozen);
  assert.deepEqual(orderLibraryCatalog(frozen).map(t=>t.id),['column','smith','future-unlisted']);
  assert.deepEqual(frozen.map(t=>t.id),['future-unlisted','column','smith']);
});

test('English catalog uses the same recommendation order as Chinese',()=>{
  const script=`globalThis.__FORMA_LOCALE__='en';
    const {catalog}=await import(${JSON.stringify(new URL('../../src/forma/catalog.js',import.meta.url).href)});
    const {orderLibraryCatalog}=await import(${JSON.stringify(new URL('../../src/forma/library-order.js',import.meta.url).href)});
    console.log(JSON.stringify({firstName:catalog.find(t=>t.id==='column').name,ids:orderLibraryCatalog(catalog).map(t=>t.id)}));`;
  const english=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{...process.env,NODE_NO_WARNINGS:'1'}}));
  assert.equal(english.firstName,'Column chart');
  assert.deepEqual(english.ids,orderLibraryCatalog(catalog).map(t=>t.id));
});
