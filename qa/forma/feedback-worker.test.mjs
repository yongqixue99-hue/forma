import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../src/forma/feedback-worker.js';
const origin='https://forma.ovocode.xyz';
const request=(body,options={})=>new Request(origin+'/api/feedback',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...options.headers},body:JSON.stringify(body),...options});
const setup=()=>{const sent=[];return {sent,env:{FEEDBACK_EMAIL:{async send(v){sent.push(v);return {messageId:'test'};}},FEEDBACK_LIMIT:{async limit(){return {success:true};}},ASSETS:{fetch:async()=>new Response('asset')}}};};
test('feedback sends only title and content to the fixed recipient',async()=>{
 const {env,sent}=setup();const response=await worker.fetch(request({title:' 图表建议 ',content:'测试内容\nsecond line',to:'other@example.com',doc:'PRIVATE',usage:{private:1}}),env);
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});assert.equal(sent.length,1);assert.equal(sent[0].to,'yongqixue99@gmail.com');assert.equal(sent[0].subject,'[FORMA] 图表建议');assert.equal(sent[0].text,'测试内容\nsecond line');assert.doesNotMatch(JSON.stringify(sent),/PRIVATE|other@example.com|usage/);
});
test('invalid input, cross-origin requests and oversized bodies do not send mail',async()=>{
 const {env,sent}=setup();for(const body of [{},{title:' ',content:'x'},{title:'x\nBcc: bad',content:'x'},{title:'x',content:' '},{title:'x',content:'x'.repeat(6001)},null])assert.equal((await worker.fetch(request(body),env)).status,400);
 assert.equal((await worker.fetch(request({title:'x',content:'x'},{headers:{Origin:'https://elsewhere.example','Content-Type':'application/json'}}),env)).status,403);
 assert.equal((await worker.fetch(request({title:'x',content:'x'.repeat(33000)}),env)).status,413);
 assert.equal((await worker.fetch(new Request(origin+'/api/feedback'),env)).status,405);assert.equal(sent.length,0);
});
test('rate limits and provider failures never report successful sending',async()=>{
 const {env,sent}=setup();env.FEEDBACK_LIMIT.limit=async()=>({success:false});assert.equal((await worker.fetch(request({title:'x',content:'x'}),env)).status,429);assert.equal(sent.length,0);
 env.FEEDBACK_LIMIT.limit=async()=>({success:true});env.FEEDBACK_EMAIL.send=async()=>{throw Object.assign(new Error('private provider detail'),{code:'E_DELIVERY_FAILED'})};
 const r=await worker.fetch(request({title:'x',content:'x'}),env);assert.equal(r.status,503);assert.deepEqual(await r.json(),{ok:false,error:'send'});
});
test('static content goes to the asset binding',async()=>{const {env}=setup();assert.equal(await (await worker.fetch(new Request(origin+'/'),env)).text(),'asset');});
