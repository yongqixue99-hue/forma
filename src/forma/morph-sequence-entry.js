import {mountSequencePlayer} from './morph-sequence-player.js';
import css from './morph-sequence.css?inline';
export function mount(host,project){
  const style=host.ownerDocument.createElement('style');
  style.textContent=`*{box-sizing:border-box}body{margin:0;background:#eeece7;font-family:Manrope,"PingFang SC","Microsoft YaHei",sans-serif}main{max-width:1180px;margin:32px auto;padding:0 24px}button{font:inherit;cursor:pointer}button:disabled{cursor:default}@media(max-width:600px){main{margin:16px auto;padding:0 12px}}`+css;
  host.ownerDocument.head.append(style);const player=mountSequencePlayer(host,project);
  return {destroy(){player.destroy();style.remove();}};
}
