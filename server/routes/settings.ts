import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth/security.js';
import { db } from '../db.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

// GET /api/settings
settingsRouter.get('/', (_req: AuthenticatedRequest, res: Response) => {
  const settings = db.getSettings();
  // Mask HF token for security
  const maskedToken = settings.hf_token
    ? settings.hf_token.length > 8
      ? `${settings.hf_token.slice(0, 4)}...${settings.hf_token.slice(-4)}`
      : '********'
    : '';

  return res.json({
    ...settings,
    hf_token_masked: maskedToken,
    has_custom_token: Boolean(settings.hf_token && !settings.hf_token.startsWith('hf_your_')),
  });
});

// POST /api/settings
settingsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const {
    ai_provider,
    hf_token,
    hf_model,
    hf_embedding_model,
    rag_top_k,
    rag_similarity_threshold,
    chunk_size,
    chunk_overlap,
    max_output_tokens,
  } = req.body;

  const updates: any = {};
  if (ai_provider) updates.ai_provider = ai_provider;
  if (hf_token !== undefined && !hf_token.includes('...')) {
    updates.hf_token = hf_token.trim();
  }
  if (hf_model) updates.hf_model = hf_model.trim();
  if (hf_embedding_model) updates.hf_embedding_model = hf_embedding_model.trim();
  if (rag_top_k !== undefined) updates.rag_top_k = Math.max(1, Math.min(20, parseInt(rag_top_k, 10)));
  if (rag_similarity_threshold !== undefined) {
    updates.rag_similarity_threshold = Math.max(0, Math.min(1, parseFloat(rag_similarity_threshold)));
  }
  if (chunk_size !== undefined) updates.chunk_size = Math.max(200, Math.min(4000, parseInt(chunk_size, 10)));
  if (chunk_overlap !== undefined) updates.chunk_overlap = Math.max(0, Math.min(1000, parseInt(chunk_overlap, 10)));
  if (max_output_tokens !== undefined) updates.max_output_tokens = Math.max(100, Math.min(4096, parseInt(max_output_tokens, 10)));

  const updated = db.updateSettings(updates);
  return res.json({
    message: 'Settings updated successfully.',
    settings: {
      ...updated,
      hf_token_masked: updated.hf_token ? `${updated.hf_token.slice(0, 4)}...` : '',
      has_custom_token: Boolean(updated.hf_token && !updated.hf_token.startsWith('hf_your_')),
    },
  });
});

// GET /api/stats (Dashboard Overview)
settingsRouter.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const stats = db.getUserStats(userId);
  const recentDocs = db.getAllUserDocuments(userId).slice(0, 5);
  const recentConvs = db.getConversations(userId).slice(0, 5);
  const kbs = db.getKnowledgeBases(userId);

  return res.json({
    stats,
    recent_documents: recentDocs,
    recent_conversations: recentConvs,
    knowledge_bases: kbs,
  });
});
