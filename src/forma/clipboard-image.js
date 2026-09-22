import {uiText} from './locale.js';

// Start write during the click, before decoding the image. Safari requires
// transient user activation even when the ClipboardItem contains a promise.
export async function copyPNGImage(render){
  const clipboard=globalThis.navigator?.clipboard;
  if(!clipboard?.write||typeof globalThis.ClipboardItem!=='function')throw new Error(uiText('当前浏览器不支持复制图片，可以使用「导出 PNG」保存。'));
  const blob=Promise.resolve().then(render);
  void blob.catch(()=>{});
  try{await clipboard.write([new ClipboardItem({'image/png':blob})]);}
  catch(error){throw new Error(uiText('图片未复制。请允许剪贴板访问后重试，或使用「导出 PNG」。'),{cause:error});}
}
