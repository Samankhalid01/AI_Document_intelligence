import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pdfParse = require('pdf-parse');
console.log('pdf-parse type:', typeof pdfParse);
console.log('pdf-parse keys:', Object.keys(pdfParse));
console.log('pdf-parse.default type:', typeof pdfParse.default);
console.log('pdf-parse itself:', pdfParse);
