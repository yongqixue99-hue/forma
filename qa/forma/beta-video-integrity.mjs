import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

export const betaVideoIds=['public-revenue','public-growth','public-penguins','public-process'];
const hash=value=>createHash('sha256').update(value).digest('hex');
export function videoManifest(engine,recipe,videos){
  return {version:1,engine:hash(engine),recipe:hash(recipe),videos:Object.fromEntries(betaVideoIds.map(id=>[id,hash(videos[id])]))};
}
export function assertVideoManifest(actual,expected){
  assert.equal(actual?.version,1,'Demo video manifest is missing. Run the browser video export first.');
  assert.equal(actual.engine,expected.engine,'Demo videos use an older renderer. Regenerate all four before deployment.');
  assert.equal(actual.recipe,expected.recipe,'Demo video presets changed. Regenerate all four before deployment.');
  assert.deepEqual(actual.videos,expected.videos,'A demo video differs from its verified export.');
}
async function currentManifest(root){
  const engine=await readFile(join(root,'forma/work-player.js')),recipe=await readFile(new URL('../../src/forma/package-beta.mjs',import.meta.url));
  const videos=Object.fromEntries(await Promise.all(betaVideoIds.map(async id=>[id,await readFile(join(root,`forma/beta/en/${id}.mp4`))])));
  return videoManifest(engine,recipe,videos);
}
// Called only after all four browser exports finish successfully.
export async function recordBetaVideos(root='public'){
  await writeFile(join(root,'forma/beta/video-manifest.json'),JSON.stringify(await currentManifest(root),null,2)+'\n');
}
export async function verifyBetaVideos(root='dist'){
  const manifest=JSON.parse(await readFile(join(root,'forma/beta/video-manifest.json'),'utf8'));
  assertVideoManifest(manifest,await currentManifest(root));
}
