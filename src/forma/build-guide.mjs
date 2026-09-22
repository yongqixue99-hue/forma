import {copyFile} from 'node:fs/promises';
for(const [source,target]of [['en','agent-guide.en.md'],['zh-CN','agent-guide.md']])await copyFile(new URL(`./guides/agent.${source}.md`,import.meta.url),new URL(`../../public/forma/${target}`,import.meta.url));

await import('./build-skill.mjs');
