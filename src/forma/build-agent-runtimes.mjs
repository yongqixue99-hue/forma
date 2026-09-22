import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Content-addressed releases keep already-copied prompts on the same renderer.
// Keep previous files in this directory when publishing a new release.
export async function buildAgentRuntimes(){
  const directory=new URL('../../public/forma/agent-runtimes/',import.meta.url);
  await mkdir(directory,{recursive:true});
  const files={chart:'player.js',work:'work-player.js',sequence:'morph-sequence-player.js',canvas:'canvas-player.js'};
  const manifest={version:1,runtimes:{}};
  for(const [kind,file] of Object.entries(files)){
    const source=await readFile(new URL(`../../public/forma/${file}`,import.meta.url));
    const sha256=createHash('sha256').update(source).digest('hex');
    const name=`${kind}-${sha256}.js`;
    await writeFile(new URL(name,directory),source);
    manifest.runtimes[kind]={path:`/forma/agent-runtimes/${name}`,sha256,integrity:`sha384-${createHash('sha384').update(source).digest('base64')}`,bytes:source.length};
  }
  await writeFile(new URL('./agent-runtimes.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
}
