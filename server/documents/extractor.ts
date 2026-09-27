import * as pdfParseModule from 'pdf-parse';
import mammoth from 'mammoth';

const PDFParseClass: any =
  (pdfParseModule as any).PDFParse || (pdfParseModule as any).default || pdfParseModule;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  text: string;
  pages: ExtractedPage[];
  metadata: Record<string, any>;
}

export class TextExtractor {
  /**
   * Extracts clean structured text and pages from raw file buffer based on mimetype/extension
   */
  public static async extract(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<ExtractedDocument> {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext === 'pdf' || mimeType.includes('pdf')) {
      return this.extractPdf(buffer);
    } else if (
      ext === 'docx' ||
      mimeType.includes('wordprocessingml') ||
      mimeType.includes('officedocument')
    ) {
      return this.extractDocx(buffer);
    } else if (
      ext === 'txt' ||
      ext === 'md' ||
      ext === 'markdown' ||
      mimeType.includes('text')
    ) {
      return this.extractPlainText(buffer);
    } else {
      throw new Error(
        `Unsupported document format: .${ext} (${mimeType}). Supported: PDF, DOCX, TXT, Markdown.`
      );
    }
  }

  private static async extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
    try {
      const pages: ExtractedPage[] = [];
      const uint8 = new Uint8Array(buffer);

      // 1. Modern class-based PDFParse (pdf-parse v2)
      if (typeof PDFParseClass === 'function' && PDFParseClass.prototype?.getText) {
        const parser = new PDFParseClass(uint8);
        const result = await parser.getText();

        if (result && Array.isArray(result.pages)) {
          for (let i = 0; i < result.pages.length; i++) {
            const p = result.pages[i];
            const pText = (p.text || '').trim();
            if (pText) {
              pages.push({
                pageNumber: p.num || i + 1,
                text: pText,
              });
            }
          }

          const fullText =
            typeof result.text === 'string' && result.text.trim().length > 0
              ? result.text
              : pages.map((p) => p.text).join('\n\n');

          return {
            text: fullText,
            pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText }],
            metadata: { total: result.total || pages.length },
          };
        }
      }

      // 2. Functional legacy pdf-parse fallback
      if (
        typeof (pdfParseModule as any).default === 'function' ||
        typeof pdfParseModule === 'function'
      ) {
        const parseFn = (pdfParseModule as any).default || pdfParseModule;
        const data = await parseFn(buffer);
        const text = data.text || '';
        return {
          text,
          pages: [{ pageNumber: 1, text }],
          metadata: { numpages: data.numpages },
        };
      }

      // 3. Fallback text stream extraction
      const raw = buffer.toString('latin1');
      const textMatches = raw.match(/\((.*?)\)\s*Tj/g) || [];
      const extractedText = textMatches
        .map((m) => m.replace(/^\(|\)\s*Tj$/g, ''))
        .join(' ');

      if (extractedText.trim().length > 0) {
        return {
          text: extractedText,
          pages: [{ pageNumber: 1, text: extractedText }],
          metadata: {},
        };
      }

      throw new Error('No readable text content found in PDF.');
    } catch (err: any) {
      console.error('[Extractor] PDF parsing error:', err);
      throw new Error(`Failed to parse PDF document: ${err.message}`);
    }
  }

  private static async extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value || '';
      const rawPages = text.split(/\n\s*\n\s*\n+/);
      const pages: ExtractedPage[] = rawPages
        .map((chunk, idx) => ({
          pageNumber: idx + 1,
          text: chunk.trim(),
        }))
        .filter((p) => p.text.length > 0);

      return {
        text,
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text }],
        metadata: {
          messages: result.messages,
        },
      };
    } catch (err: any) {
      throw new Error(`Failed to extract text from DOCX: ${err.message}`);
    }
  }

  private static extractPlainText(buffer: Buffer): Promise<ExtractedDocument> {
    const text = buffer.toString('utf-8');
    return Promise.resolve({
      text,
      pages: [{ pageNumber: 1, text }],
      metadata: {},
    });
  }
}
