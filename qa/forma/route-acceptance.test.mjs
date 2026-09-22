import test from 'node:test';
import assert from 'node:assert/strict';
import {routeAcceptance} from './route-acceptance.mjs';
const entry={from:'eval-roc',to:'eval-pr',engineSHA256:'build-a',fixtureSHA256:'data-a',status:'reviewed-for-fixture',conditions:'2 models, same labels, scores in [0,1]',observations:'Axes relabel at the transition; identities and colors remain matched.',browser:'Chromium 1280 × 720',exportFile:'work.html',checkpoints:[0,25,50,75,100].map(percent=>({percent,screenshot:`frame-${percent}.png`})),actions:{repeatSeek:'repeat.png',interrupt:'interrupt.png'}};
test('route acceptance never spreads across builds, direction or data conditions',()=>{
  const registry={version:1,routes:[entry]},query={engineSHA256:'build-a',from:'eval-roc',to:'eval-pr',fixtureSHA256:'data-a'};
  assert.equal(routeAcceptance(registry,query).status,'reviewed-for-fixture');
  for(const changed of [{engineSHA256:'build-b'},{from:'eval-pr',to:'eval-roc'},{fixtureSHA256:'data-b'}])assert.equal(routeAcceptance(registry,{...query,...changed}).status,'unreviewed');
});
test('incomplete checkpoints and automated-only records cannot become browser acceptance',()=>{
  const query={engineSHA256:'build-a',from:'eval-roc',to:'eval-pr'};
  for(const changed of [{status:'generated'},{checkpoints:entry.checkpoints.slice(1)},{actions:{}},{observations:''}])assert.equal(routeAcceptance({version:1,routes:[{...entry,...changed}]},query).status,'unreviewed');
  assert.equal(routeAcceptance({version:1,routes:[{...entry,verdict:'needs-polish'}]},query).status,'reviewed-with-caveats');
});
