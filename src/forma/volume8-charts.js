import {uiText,uiMarkup,uiMessage} from './locale.js';
import {experiment8Renderers} from './volume8-experiments.js';
import {omics8Renderers} from './volume8-omics.js';
import {model8Renderers} from './volume8-models.js';
export const volume8Renderers={...experiment8Renderers,...omics8Renderers,...model8Renderers};
