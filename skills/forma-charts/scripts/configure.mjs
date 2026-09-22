#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
const [input,output]=process.argv.slice(2);
if(!input||!output){console.error('Usage: node scripts/configure.mjs request.json output.forma-work.json');process.exit(2);}
try{
 globalThis.__FORMA_LOCALE__='en';
 const {validate}=await import('./agent-api.mjs');
 const raw=await readFile(input);if(raw.byteLength>8000000)throw Error('Configuration exceeds 8 MB');
 const result=validate(JSON.parse(raw.toString('utf8')));
 if(!result.valid){console.error(JSON.stringify(result,null,2));process.exitCode=1;}
 else{await writeFile(output,JSON.stringify(result.work,null,2),{flag:'wx'});console.log(JSON.stringify({version:1,valid:true,file:output,steps:result.work.steps.length,warnings:result.warnings}));}
}catch(e){console.error(e.message);process.exitCode=1;}
