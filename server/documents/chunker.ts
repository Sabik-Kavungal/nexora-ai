import { ExtractedDocument } from './extractor.js';

export interface ChunkOutput {
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  metadata: Record<string, any>;
}

export class DocumentChunker {
  /**
   * Splits extracted document into semantically bounded overlapping chunks,
   * respecting sentence and paragraph boundaries and preserving page numbers.
   */
  public static chunk(
    doc: ExtractedDocument,
    chunkSize: number = 800,
    chunkOverlap: number = 150
  ): ChunkOutput[] {
    const results: ChunkOutput[] = [];
    let globalIndex = 0;

    for (const page of doc.pages) {
      const pageText = this.cleanText(page.text);
      if (!pageText || pageText.trim().length === 0) continue;

      const pageChunks = this.splitTextIntoChunks(pageText, chunkSize, chunkOverlap);

      for (const textChunk of pageChunks) {
        if (textChunk.trim().length < 20) continue; // Skip meaningless fragments

        results.push({
          chunkIndex: globalIndex++,
          content: textChunk.trim(),
          pageNumber: page.pageNumber,
          metadata: {
            charCount: textChunk.length,
            pageNumber: page.pageNumber,
          },
        });
      }
    }

    return results;
  }

  /**
   * Normalizes whitespace, trims unneeded control characters
   */
  public static cleanText(raw: string): string {
    return raw
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  }

  private static splitTextIntoChunks(
    text: string,
    maxChunkSize: number,
    overlap: number
  ): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxChunkSize;

      if (end >= text.length) {
        chunks.push(text.slice(start));
        break;
      }

      // Find the best break boundary near `end`
      // Priority 1: Paragraph break (\n\n)
      // Priority 2: Sentence break (.!?)
      // Priority 3: Line break (\n)
      // Priority 4: Space (' ')
      const searchWindow = text.slice(Math.max(start, end - 150), Math.min(text.length, end + 50));
      const windowOffset = Math.max(start, end - 150);

      let splitPoint = -1;

      // Look for paragraph breaks
      const paraBreak = searchWindow.lastIndexOf('\n\n');
      if (paraBreak !== -1) {
        splitPoint = windowOffset + paraBreak + 2;
      } else {
        // Look for sentence end
        const sentenceMatch = searchWindow.search(/[.!?]\s+(?=[A-Z0-9])/);
        if (sentenceMatch !== -1) {
          splitPoint = windowOffset + sentenceMatch + 2;
        } else {
          // Look for space
          const spaceBreak = searchWindow.lastIndexOf(' ');
          if (spaceBreak !== -1) {
            splitPoint = windowOffset + spaceBreak + 1;
          }
        }
      }

      if (splitPoint === -1 || splitPoint <= start) {
        splitPoint = end;
      }

      chunks.push(text.slice(start, splitPoint).trim());

      // Advance start with overlap
      const step = splitPoint - start;
      if (step <= overlap) {
        start = splitPoint; // Prevent infinite loop if chunk is small
      } else {
        start = splitPoint - overlap;
      }
    }

    return chunks;
  }
}
