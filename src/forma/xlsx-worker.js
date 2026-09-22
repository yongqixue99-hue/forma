import {setLocale} from './locale.js';
import {readWorkbook,workbookSheets,workbookRange} from './xlsx-reader.js';
let book;
self.onmessage=({data})=>{try{setLocale(data.locale);const value=data.action==='read'?(book=readWorkbook(data.bytes),workbookSheets(book)):workbookRange(book,data.sheet,data.range);self.postMessage({id:data.id,value});}catch(error){self.postMessage({id:data.id,error:error.message});}};
