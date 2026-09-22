import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapChartText} from '../../src/forma/text-wrap.js';
test('static and video labels keep English words intact and CJK available to wrap',()=>{
 const text='Showing the selected coordinate plane; the hidden dimension remains in the data';
 const lines=wrapChartText(text,18);assert.equal(lines.join(' '),text);for(const line of lines)assert.ok([...line].length*.57<=18+.001);
 assert.deepEqual(wrapChartText('中文标题与说明',4),['中文标题','与说明']);
 assert.deepEqual(wrapChartText('First line\n第二行',30),['First line','第二行']);
 const long='a'.repeat(150);assert.equal(wrapChartText(long,10).join(''),long);assert.ok(wrapChartText(long,10).every(s=>s.length<=17));
});
