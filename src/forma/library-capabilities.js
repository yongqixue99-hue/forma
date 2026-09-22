import {catalog, getExample} from './catalog.js';
import {morphReady, workViews} from './work-model.js';

export const motionFilters = [
  {id: 'all', name: '全部动效'},
  {id: 'morph', name: '可连续变形', description: '已接入连续变形。更换图型时仍会核对数据、单位与对应关系。'},
  {id: 'entrance', name: '原生入场', description: '尚未接入连续变形，保留图表自身的生长、描线或展开动画。'}
];

// Template discovery uses the same eligibility check as the work editor.
// This describes the valid example, not arbitrary data or every possible pair.
export const libraryCatalog = catalog.map(template => ({
  ...template,
  motion: morphReady({doc: getExample(template.id)}) ? 'morph' : 'entrance'
}));

export const motionCoverage = Object.freeze({
  templates: libraryCatalog.length,
  morph: libraryCatalog.filter(template => template.motion === 'morph').length,
  entrance: libraryCatalog.filter(template => template.motion === 'entrance').length,
  encodings: workViews.length
});
