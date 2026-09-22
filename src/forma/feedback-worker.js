const RECIPIENT='yongqixue99@gmail.com';
const MAX_BYTES=32768;
/** @param {number} status @param {string} [error] */
const reply=(status,error)=>Response.json(error?{ok:false,error}:{ok:true},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

// Only this endpoint invokes the Worker; static files retain asset-first routing.
/** @satisfies {ExportedHandler<Env>} */
const worker = {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname!=='/api/feedback')return env.ASSETS.fetch(request);
    if(request.method!=='POST')return reply(405,'method');
    if(request.headers.get('Origin')!==url.origin)return reply(403,'origin');
    if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return reply(415,'format');
    if(Number(request.headers.get('Content-Length'))>MAX_BYTES)return reply(413,'size');
    const reader=request.body?.getReader();if(!reader)return reply(400,'fields');
    const chunks=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();return reply(413,'size');}chunks.push(value);}}catch{return reply(400,'format');}
    let body;try{const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(400,'format');}
    if(!body||typeof body.title!=='string'||typeof body.content!=='string')return reply(400,'fields');
    const title=body.title.trim(),content=body.content.trim();
    if(!title||title.length>160||/[\r\n\x00-\x1f]/.test(title)||!content||content.length>6000)return reply(400,'fields');
    const ip=request.headers.get('CF-Connecting-IP')||'local';
    try{
      if(!env.FEEDBACK_LIMIT)return reply(503,'send');
      if(!(await env.FEEDBACK_LIMIT.limit({key:ip})).success)return reply(429,'rate');
      const result=await env.FEEDBACK_EMAIL.send({from:{email:'feedback@ovocode.xyz',name:'FORMA feedback'},to:RECIPIENT,subject:`[FORMA] ${title}`,text:content});
      console.info(JSON.stringify({event:'feedback-sent',messageId:result.messageId}));
      return reply(200);
    }catch(error){console.error(JSON.stringify({event:'feedback-send-failed',code:error instanceof Error && 'code' in error ? error.code : 'send'}));return reply(503,'send');}
  }
};

export default worker;
