import { mountMotion } from './motion-studio.js';
import css from './motion.css?inline';

export function mount(host,options={}) {
  const style=document.createElement('style');
  style.textContent=`*{box-sizing:border-box}body{margin:0;background:#eeece6;color:#262626;font:13px/1.6 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}button,a{color:inherit}button{background:transparent}a{text-decoration:none}h2,h3,p,figure{margin:0}#forma-motion{max-width:1320px;margin:32px auto;padding:0 20px}:root{--serif:Georgia,'Songti SC',serif;--sans:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;--mono:ui-monospace,monospace}${css}`;
  document.head.append(style);
  const controller=mountMotion(host,{...options,persist:false,player:true});
  return {destroy(){controller.destroy();style.remove();}};
}
