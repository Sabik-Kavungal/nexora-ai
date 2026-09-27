import { Router, Response } from 'express';
import multer from 'multer';
import { AuthenticatedRequest, requireAuth } from '../auth/security.js';
import { db } from '../db.js';
import { TextExtractor } from '../documents/extractor.js';
import { DocumentChunker } from '../documents/chunker.js';
import { getAIProvider } from '../ai/factory.js';
import crypto from 'crypto';

export const documentsRouter = Router();

documentsRouter.use(requireAuth);

// 15MB file size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// GET /api/documents/kb/:knowledgeBaseId
documentsRouter.get('/kb/:knowledgeBaseId', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const kbId = req.params.knowledgeBaseId;

  const kb = db.getKnowledgeBaseById(kbId, userId);
  if (!kb) {
    return res.status(404).json({ error: 'Knowledge base not found or access denied.' });
  }

  const docs = db.getDocuments(kbId, userId);
  return res.json(docs);
});

// GET /api/documents/:id
documentsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const doc = db.getDocumentById(req.params.id, userId);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  return res.json(doc);
});

// GET /api/documents/:id/chunks
documentsRouter.get('/:id/chunks', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const doc = db.getDocumentById(req.params.id, userId);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  const chunks = db.getChunksByDocumentId(doc.id);
  // Return chunks without full raw embeddings to save bandwidth
  const sanitized = chunks.map((c) => ({
    id: c.id,
    document_id: c.document_id,
    chunk_index: c.chunk_index,
    content: c.content,
    page_number: c.page_number,
    metadata: c.metadata,
    created_at: c.created_at,
  }));

  return res.json({
    document: doc,
    total_chunks: chunks.length,
    chunks: sanitized,
  });
});

// POST /api/documents/upload
documentsRouter.post('/upload', upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const knowledgeBaseId = req.body.knowledge_base_id;
  const file = req.file;

  if (!knowledgeBaseId) {
    return res.status(400).json({ error: 'knowledge_base_id is required.' });
  }

  const kb = db.getKnowledgeBaseById(knowledgeBaseId, userId);
  if (!kb) {
    return res.status(404).json({ error: 'Target knowledge base does not exist or access denied.' });
  }

  if (!file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  // File type validation
  const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
  const allowedExts = ['pdf', 'docx', 'txt', 'md', 'markdown'];
  if (!allowedExts.includes(ext)) {
    return res.status(400).json({
      error: `Invalid file format .${ext}. Only PDF, DOCX, TXT, and Markdown files are supported.`,
    });
  }

  const now = new Date().toISOString();
  const docId = crypto.randomUUID();

  // 1. Create document record in UPLOADING/PROCESSING state
  const docRecord = db.createDocument({
    id: docId,
    knowledge_base_id: knowledgeBaseId,
    user_id: userId,
    filename: file.originalname,
    file_type: file.mimetype || `application/${ext}`,
    file_size: file.size,
    status: 'PROCESSING',
    chunk_count: 0,
    created_at: now,
    updated_at: now,
  });

  try {
    const settings = db.getSettings();

    // 2. Extract structured text and page information
    const extracted = await TextExtractor.extract(file.buffer, file.originalname, file.mimetype);

    if (!extracted.text || extracted.text.trim().length === 0) {
      throw new Error('No readable text content could be extracted from this document.');
    }

    // 3. Chunk text with configured size and overlap
    const rawChunks = DocumentChunker.chunk(
      extracted,
      settings.chunk_size || 800,
      settings.chunk_overlap || 150
    );

    if (rawChunks.length === 0) {
      throw new Error('Document resulted in zero valid text chunks after filtering.');
    }

    // 4. Generate embeddings via AI Provider
    const provider = getAIProvider();
    const contents = rawChunks.map((c) => c.content);
    const embeddings = await provider.createEmbeddings(contents);

    // 5. Store chunks with embeddings
    const chunkRecords = rawChunks.map((c, idx) => ({
      id: crypto.randomUUID(),
      document_id: docId,
      knowledge_base_id: knowledgeBaseId,
      user_id: userId,
      chunk_index: c.chunkIndex,
      content: c.content,
      page_number: c.pageNumber,
      embedding: embeddings[idx],
      metadata: c.metadata,
      created_at: now,
    }));

    db.saveChunks(chunkRecords);

    // 6. Mark document as READY
    db.updateDocument(docId, userId, {
      status: 'READY',
      chunk_count: chunkRecords.length,
    });

    return res.status(201).json({
      message: 'Document successfully processed and indexed.',
      document: db.getDocumentById(docId, userId),
    });
  } catch (err: any) {
    console.error(`[Documents] Processing failed for ${file.originalname}:`, err);
    db.updateDocument(docId, userId, {
      status: 'FAILED',
      error_message: err.message || 'Unknown processing error',
    });

    return res.status(422).json({
      error: `Document processing failed: ${err.message}`,
      document: db.getDocumentById(docId, userId),
    });
  }
});

// DELETE /api/documents/:id
documentsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const success = db.deleteDocument(req.params.id, userId);

  if (!success) {
    return res.status(404).json({ error: 'Document not found or access denied.' });
  }

  return res.json({ message: 'Document and its chunks deleted successfully.' });
});
