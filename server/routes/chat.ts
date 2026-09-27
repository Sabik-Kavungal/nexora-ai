import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth/security.js';
import { db } from '../db.js';
import { RAGPipeline } from '../rag/pipeline.js';
import crypto from 'crypto';

export const chatRouter = Router();

chatRouter.use(requireAuth);

// GET /api/conversations
chatRouter.get('/conversations', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const kbId = req.query.knowledge_base_id as string | undefined;
  const convs = db.getConversations(userId, kbId);
  return res.json(convs);
});

// POST /api/conversations
chatRouter.post('/conversations', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { knowledge_base_id, title } = req.body;

  if (!knowledge_base_id) {
    return res.status(400).json({ error: 'knowledge_base_id is required.' });
  }

  const kb = db.getKnowledgeBaseById(knowledge_base_id, userId);
  if (!kb) {
    return res.status(404).json({ error: 'Knowledge base not found or access denied.' });
  }

  const now = new Date().toISOString();
  const conv = db.createConversation({
    id: crypto.randomUUID(),
    knowledge_base_id,
    user_id: userId,
    title: (title || 'New Inquiry').trim(),
    created_at: now,
    updated_at: now,
  });

  return res.status(201).json(conv);
});

// GET /api/conversations/:id
chatRouter.get('/conversations/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const conv = db.getConversationById(req.params.id, userId);

  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found or access denied.' });
  }

  const messages = db.getMessages(conv.id);
  const kb = db.getKnowledgeBaseById(conv.knowledge_base_id, userId);

  return res.json({
    conversation: conv,
    knowledge_base: kb,
    messages,
  });
});

// PUT /api/conversations/:id
chatRouter.put('/conversations/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { title } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Conversation title is required.' });
  }

  const updated = db.updateConversation(req.params.id, userId, { title: title.trim() });
  if (!updated) {
    return res.status(404).json({ error: 'Conversation not found or access denied.' });
  }

  return res.json(updated);
});

// DELETE /api/conversations/:id
chatRouter.delete('/conversations/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const success = db.deleteConversation(req.params.id, userId);

  if (!success) {
    return res.status(404).json({ error: 'Conversation not found or access denied.' });
  }

  return res.json({ message: 'Conversation deleted successfully.' });
});

// POST /api/chat (SSE Streaming RAG)
chatRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { knowledge_base_id, conversation_id, message } = req.body;

  if (!knowledge_base_id) {
    return res.status(400).json({ error: 'knowledge_base_id is required.' });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'A non-empty question or message is required.' });
  }

  // 1. Verify KB ownership
  const kb = db.getKnowledgeBaseById(knowledge_base_id, userId);
  if (!kb) {
    return res.status(404).json({ error: 'Target knowledge base not found or access denied.' });
  }

  // 2. Validate or create conversation
  let activeConvId = conversation_id;
  if (activeConvId) {
    const existingConv = db.getConversationById(activeConvId, userId);
    if (!existingConv) {
      return res.status(404).json({ error: 'Target conversation not found or access denied.' });
    }
  } else {
    const now = new Date().toISOString();
    const autoTitle = message.trim().slice(0, 36) + (message.trim().length > 36 ? '...' : '');
    const newConv = db.createConversation({
      id: crypto.randomUUID(),
      knowledge_base_id,
      user_id: userId,
      title: autoTitle,
      created_at: now,
      updated_at: now,
    });
    activeConvId = newConv.id;
  }

  // 3. Save User Message
  const now = new Date().toISOString();
  db.createMessage({
    id: crypto.randomUUID(),
    conversation_id: activeConvId,
    role: 'user',
    content: message.trim(),
    created_at: now,
  });

  // 4. Setup Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send conversation info event
  res.write(`event: conversation\ndata: ${JSON.stringify({ conversation_id: activeConvId })}\n\n`);

  let fullAssistantText = '';

  try {
    // 5. Execute RAG query
    const ragResult = await RAGPipeline.query(userId, knowledge_base_id, message.trim());

    // Stream sources event early so frontend can render source citations
    res.write(`event: sources\ndata: ${JSON.stringify(ragResult.sources)}\n\n`);

    // 6. Stream tokens
    for await (const chunk of ragResult.stream) {
      fullAssistantText += chunk;
      res.write(`event: token\ndata: ${JSON.stringify({ token: chunk })}\n\n`);
    }

    // 7. Save Assistant Message with sources to DB
    const assistantMsg = db.createMessage({
      id: crypto.randomUUID(),
      conversation_id: activeConvId,
      role: 'assistant',
      content: fullAssistantText,
      sources: ragResult.sources,
      created_at: new Date().toISOString(),
    });

    // 8. Stream done event
    res.write(`event: done\ndata: ${JSON.stringify({ message_id: assistantMsg.id, sources: ragResult.sources })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('[Chat] RAG processing error:', err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || 'Error generating RAG response' })}\n\n`);
    res.end();
  }
});
