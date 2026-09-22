import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {presetWork,cleanWork} from '../../src/forma/work-model.js';
import {getExample} from '../../src/forma/catalog.js';
import {ChartScene} from '../../src/forma/charts.js';
import {videoManifest,assertVideoManifest,betaVideoIds} from './beta-video-integrity.mjs';

test('explicit public-case palettes are honored and old saved palettes survive reopening',()=>{
  for(const [id,preferred] of [['public-revenue','ochre'],['public-growth','cobalt'],['public-penguins','mauve']]){
    const original=presetWork(id),saved=cleanWork(original);
    assert.ok(original.steps.every(s=>s.options.palette===preferred));
    for(const palette of ['ink','cobalt','mono']){
      const chosen=presetWork(id,palette);
      assert.ok(chosen.steps.every(s=>s.options.palette===palette));
      assert.deepEqual(chosen.steps[0].doc.data.map(r=>r.value),original.steps[0].doc.data.map(r=>r.value));
    }
    assert.deepEqual(cleanWork(JSON.parse(JSON.stringify(saved))),saved);
  }
});

test('dark spatial charts render CSS alpha as material opacity without invalid Three colours',()=>{
  const win=new Window(),oldDocument=globalThis.document,oldSerializer=globalThis.XMLSerializer,oldWarn=console.warn,warnings=[];
  globalThis.document=win.document;globalThis.XMLSerializer=win.XMLSerializer;console.warn=(...parts)=>warnings.push(parts.join(' '));
  try{for(const id of ['scatter3d','bars3d','surface3d','trajectory3d','bubble3d','lines3d']){
    const scene=new ChartScene(document.createElement('div'),getExample(id),{width:760,height:440,dark:true,interactive:false});
    const grids=scene.spatial.scene.children.filter(n=>n.isLine&&n.material.color.getHexString()==='ffffff');
    assert.equal(grids.length,12);assert.ok(grids.every(n=>Math.abs(n.material.opacity-.85*34/255)<1e-9));
    assert.doesNotMatch(scene.serialize(),/NaN|Infinity/);scene.destroy();
  }assert.deepEqual(warnings,[]);}finally{globalThis.document=oldDocument;globalThis.XMLSerializer=oldSerializer;console.warn=oldWarn;win.happyDOM.abort();}
});

test('deployment rejects demo videos from a stale renderer, preset recipe or changed file',()=>{
  const videos=Object.fromEntries(betaVideoIds.map(id=>[id,Buffer.from(id)])),original=videoManifest('renderer-a','recipe-a',videos);
  assert.doesNotThrow(()=>assertVideoManifest(original,videoManifest('renderer-a','recipe-a',videos)));
  assert.throws(()=>assertVideoManifest(original,videoManifest('renderer-b','recipe-a',videos)),/older renderer/);
  assert.throws(()=>assertVideoManifest(original,videoManifest('renderer-a','recipe-b',videos)),/presets changed/);
  assert.throws(()=>assertVideoManifest(original,videoManifest('renderer-a','recipe-a',{...videos,'public-revenue':Buffer.from('stale file')})),/differs/);
});
