import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth/security.js';
import { db } from '../db.js';
import { getAIProvider } from '../ai/factory.js';
import { DocumentChunker } from '../documents/chunker.js';
import crypto from 'crypto';

export const knowledgeBasesRouter = Router();

knowledgeBasesRouter.use(requireAuth);

// GET /api/knowledge-bases
knowledgeBasesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const kbs = db.getKnowledgeBases(userId);
  const docs = db.getAllUserDocuments(userId);

  // Augment with document count and chunk count
  const augmented = kbs.map((kb) => {
    const kbDocs = docs.filter((d) => d.knowledge_base_id === kb.id);
    const readyDocs = kbDocs.filter((d) => d.status === 'READY');
    const totalChunks = kbDocs.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
    return {
      ...kb,
      document_count: kbDocs.length,
      ready_document_count: readyDocs.length,
      chunk_count: totalChunks,
    };
  });

  return res.json(augmented);
});

// POST /api/knowledge-bases
knowledgeBasesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Knowledge base name is required.' });
  }

  const now = new Date().toISOString();
  const newKb = db.createKnowledgeBase({
    id: crypto.randomUUID(),
    user_id: userId,
    name: name.trim(),
    description: (description || '').trim(),
    created_at: now,
    updated_at: now,
  });

  return res.status(201).json(newKb);
});

// GET /api/knowledge-bases/:id
knowledgeBasesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const kb = db.getKnowledgeBaseById(req.params.id, userId);

  if (!kb) {
    return res.status(404).json({ error: 'Knowledge base not found or access denied.' });
  }

  const docs = db.getDocuments(kb.id, userId);
  return res.json({
    ...kb,
    documents: docs,
    document_count: docs.length,
  });
});

// PUT /api/knowledge-bases/:id
knowledgeBasesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, description } = req.body;

  const updates: any = {};
  if (name && typeof name === 'string') updates.name = name.trim();
  if (description !== undefined && typeof description === 'string') updates.description = description.trim();

  const updated = db.updateKnowledgeBase(req.params.id, userId, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Knowledge base not found or access denied.' });
  }

  return res.json(updated);
});

// DELETE /api/knowledge-bases/:id
knowledgeBasesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const success = db.deleteKnowledgeBase(req.params.id, userId);

  if (!success) {
    return res.status(404).json({ error: 'Knowledge base not found or access denied.' });
  }

  return res.json({ message: 'Knowledge base and all associated documents deleted successfully.' });
});

