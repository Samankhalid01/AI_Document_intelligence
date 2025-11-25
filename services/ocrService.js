// OCR Service using Tesseract.js
import Tesseract from 'tesseract.js';
import { createRequire } from 'module';

// Load pdf-parse using CommonJS require
const require = createRequire(import.meta.url);
let PDFParse = null;

function getPdfParser() {
  if (!PDFParse) {
    try {
      const pdfModule = require('pdf-parse');
      // pdf-parse exports a PDFParse class
      PDFParse = pdfModule.PDFParse || pdfModule;
    } catch (error) {
      console.error('Failed to load pdf-parse:', error);
      throw new Error('pdf-parse module not available');
    }
  }
  return PDFParse;
}

export class OCRService {
  constructor() {
    this.worker = null;
  }

  async initialize() {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng');
    }
  }

  async processImage(imageBuffer) {
    await this.initialize();

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    const { data } = await this.worker.recognize(imageBuffer);

    const lines = data.lines.map((line) => ({
      text: line.text,
      confidence: line.confidence,
      bbox: {
        x: line.bbox.x0,
        y: line.bbox.y0,
        width: line.bbox.x1 - line.bbox.x0,
        height: line.bbox.y1 - line.bbox.y0,
      },
    }));

    return {
      text: data.text,
      confidence: data.confidence,
      lines,
      raw: data,
    };
  }

  async processPDF(pdfBuffer) {
    try {
      // Get PDFParse class
      const PDFParseClass = getPdfParser();
      
      if (!PDFParseClass) {
        throw new Error('PDFParse class not available');
      }
      
      // Create parser instance and extract text using getText method
      const parser = new PDFParseClass({ data: pdfBuffer });
      const result = await parser.getText();
      const data = { text: result.text, numpages: result.total };
      
      // Create a simple line structure similar to image OCR
      const lines = data.text.split('\n').map((text, index) => ({
        text: text,
        confidence: 95, // PDFs with text have high confidence
        bbox: { x: 0, y: index * 20, width: 800, height: 20 }
      }));

      return {
        text: data.text,
        confidence: 95,
        lines: lines.filter(line => line.text.trim().length > 0),
        pages: data.numpages,
        info: data.info,
      };
    } catch (error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();
