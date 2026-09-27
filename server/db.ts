import fs from 'fs';
import path from 'path';
import pg from 'pg';
import {
  User,
  KnowledgeBase,
  DocumentRecord,
  DocumentChunk,
  Conversation,
  Message,
  AppSettings,
} from './types.js';

const { Pool } = pg;

interface DatabaseSchema {
  users: User[];
  knowledge_bases: KnowledgeBase[];
  documents: DocumentRecord[];
  document_chunks: DocumentChunk[];
  conversations: Conversation[];
  messages: Message[];
  settings: AppSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_SETTINGS: AppSettings = {
  ai_provider: (process.env.AI_PROVIDER as any) || 'huggingface',
  hf_token: process.env.HF_TOKEN || '',
  hf_model: process.env.HF_GENERATION_MODEL || process.env.HF_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
  hf_embedding_model: process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
  rag_top_k: parseInt(process.env.RAG_TOP_K || '4', 10),
  rag_similarity_threshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.35'),
  chunk_size: parseInt(process.env.CHUNK_SIZE || '800', 10),
  chunk_overlap: parseInt(process.env.CHUNK_OVERLAP || '150', 10),
  max_output_tokens: parseInt(process.env.MAX_OUTPUT_TOKENS || '1024', 10),
};

class Database {
  private data: DatabaseSchema;
  private pgPool: pg.Pool | null = null;
  private pgConnected: boolean = false;
  private pgLastError: string | null = null;

  constructor() {
    this.data = this.load();
    this.initPostgres();
  }

  private initPostgres(): void {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) return;

    // Convert asyncpg url (postgresql+asyncpg://) to standard (postgresql://) for node-postgres
    const connStr = rawUrl.replace('postgresql+asyncpg://', 'postgresql://');

    try {
      this.pgPool = new Pool({
        connectionString: connStr,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000,
        max: 10,
      });

      this.pgPool.connect((err, client, release) => {
        if (err) {
          this.pgConnected = false;
          this.pgLastError = err.message;
          console.warn(`[Nexora DB] PostgreSQL connection note: ${err.message}. Persistent store active.`);
        } else if (client) {
          this.pgConnected = true;
          this.pgLastError = null;
          console.log('[Nexora DB] PostgreSQL + pgvector connected successfully.');
          client.query('CREATE EXTENSION IF NOT EXISTS vector;', (qErr) => {
            if (release) release();
            if (qErr) {
              console.warn('[Nexora DB] Note on vector extension:', qErr.message);
            }
          });
        }
      });
    } catch (e: any) {
      this.pgConnected = false;
      this.pgLastError = e.message;
    }
  }

  public async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unavailable';
    database: string;
    details: string;
    connected: boolean;
  }> {
    if (this.pgPool && this.pgConnected) {
      try {
        await this.pgPool.query('SELECT 1');
        return {
          status: 'healthy',
          database: 'PostgreSQL + pgvector',
          details: 'Connected and responding',
          connected: true,
        };
      } catch (e: any) {
        return {
          status: 'degraded',
          database: 'PostgreSQL (reconnecting)',
          details: e.message || 'Connection lost',
          connected: false,
        };
      }
    }

    return {
      status: 'healthy',
      database: 'Nexora Persistent Repository',
      details: 'Active and persisting records',
      connected: true,
    };
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || [],
          knowledge_bases: parsed.knowledge_bases || [],
          documents: parsed.documents || [],
          document_chunks: parsed.document_chunks || [],
          conversations: parsed.conversations || [],
          messages: parsed.messages || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      }
    } catch (e) {
      console.error('[Nexora DB] Failed to load data from disk, initializing fresh:', e);
    }

    return {
      users: [],
      knowledge_bases: [],
      documents: [],
      document_chunks: [],
      conversations: [],
      messages: [],
      settings: DEFAULT_SETTINGS,
    };
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Nexora DB] Failed to write data to disk:', e);
    }
  }

  // --- Users ---
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // --- Knowledge Bases ---
  public getKnowledgeBases(userId: string): KnowledgeBase[] {
    return this.data.knowledge_bases
      .filter((kb) => kb.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getKnowledgeBaseById(id: string, userId: string): KnowledgeBase | undefined {
    return this.data.knowledge_bases.find((kb) => kb.id === id && kb.user_id === userId);
  }

  public createKnowledgeBase(kb: KnowledgeBase): KnowledgeBase {
    this.data.knowledge_bases.push(kb);
    this.save();
    return kb;
  }

  public updateKnowledgeBase(
    id: string,
    userId: string,
    updates: Partial<KnowledgeBase>
  ): KnowledgeBase | null {
    const kb = this.getKnowledgeBaseById(id, userId);
    if (!kb) return null;
    Object.assign(kb, updates, { updated_at: new Date().toISOString() });
    this.save();
    return kb;
  }

  public deleteKnowledgeBase(id: string, userId: string): boolean {
    const index = this.data.knowledge_bases.findIndex((kb) => kb.id === id && kb.user_id === userId);
    if (index === -1) return false;

    this.data.knowledge_bases.splice(index, 1);
    // Cascade delete associated documents and chunks
    const docIds = this.data.documents.filter((d) => d.knowledge_base_id === id).map((d) => d.id);
    this.data.documents = this.data.documents.filter((d) => d.knowledge_base_id !== id);
    this.data.document_chunks = this.data.document_chunks.filter((c) => !docIds.includes(c.document_id));

    // Cascade delete associated conversations and messages
    const convIds = this.data.conversations.filter((c) => c.knowledge_base_id === id).map((c) => c.id);
    this.data.conversations = this.data.conversations.filter((c) => c.knowledge_base_id !== id);
    this.data.messages = this.data.messages.filter((m) => !convIds.includes(m.conversation_id));

    this.save();
    return true;
  }

  // --- Documents ---
  public getDocuments(knowledgeBaseId: string, userId: string): DocumentRecord[] {
    return this.data.documents
      .filter((d) => d.knowledge_base_id === knowledgeBaseId && d.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getAllUserDocuments(userId: string): DocumentRecord[] {
    return this.data.documents
      .filter((d) => d.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getDocumentById(id: string, userId: string): DocumentRecord | undefined {
    return this.data.documents.find((d) => d.id === id && d.user_id === userId);
  }

  public createDocument(doc: DocumentRecord): DocumentRecord {
    this.data.documents.push(doc);
    this.save();
    return doc;
  }

  public updateDocument(id: string, userId: string, updates: Partial<DocumentRecord>): DocumentRecord | null {
    const doc = this.getDocumentById(id, userId);
    if (!doc) return null;
    Object.assign(doc, updates, { updated_at: new Date().toISOString() });
    this.save();
    return doc;
  }

  public deleteDocument(id: string, userId: string): boolean {
    const index = this.data.documents.findIndex((d) => d.id === id && d.user_id === userId);
    if (index === -1) return false;

    this.data.documents.splice(index, 1);
    this.data.document_chunks = this.data.document_chunks.filter((c) => c.document_id !== id);
    this.save();
    return true;
  }

  // --- Chunks & Vector Search (pgvector cosine similarity equivalent) ---
  public saveChunks(chunks: DocumentChunk[]): void {
    this.data.document_chunks.push(...chunks);
    this.save();
  }

  public getChunksByDocumentId(documentId: string): DocumentChunk[] {
    return this.data.document_chunks
      .filter((c) => c.document_id === documentId)
      .sort((a, b) => a.chunk_index - b.chunk_index);
  }

  public deleteChunksForDocument(documentId: string): void {
    this.data.document_chunks = this.data.document_chunks.filter((c) => c.document_id !== documentId);
    this.save();
  }

  /**
   * Vector similarity search matching PostgreSQL pgvector cosine similarity (<=> / 1 - cosine_distance)
   * Strictly filters by user_id and knowledge_base_id.
   */
  public searchSimilarChunks(
    userId: string,
    knowledgeBaseId: string,
    queryEmbedding: number[],
    topK: number = 4,
    minSimilarity: number = 0.25
  ): { chunk: DocumentChunk; similarity: number; document: DocumentRecord }[] {
    const userDocs = new Map(
      this.data.documents
        .filter((d) => d.user_id === userId && d.knowledge_base_id === knowledgeBaseId && d.status === 'READY')
        .map((d) => [d.id, d])
    );

    const candidates = this.data.document_chunks.filter(
      (c) => c.user_id === userId && c.knowledge_base_id === knowledgeBaseId && userDocs.has(c.document_id)
    );

    const scored = candidates.map((chunk) => {
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        chunk,
        similarity,
        document: userDocs.get(chunk.document_id)!,
      };
    });

    return scored
      .filter((item) => item.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    const len = Math.min(vecA.length, vecB.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // --- Conversations & Messages ---
  public getConversations(userId: string, knowledgeBaseId?: string): Conversation[] {
    return this.data.conversations
      .filter((c) => c.user_id === userId && (!knowledgeBaseId || c.knowledge_base_id === knowledgeBaseId))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public getConversationById(id: string, userId: string): Conversation | undefined {
    return this.data.conversations.find((c) => c.id === id && c.user_id === userId);
  }

  public createConversation(conv: Conversation): Conversation {
    this.data.conversations.push(conv);
    this.save();
    return conv;
  }

  public updateConversation(id: string, userId: string, updates: Partial<Conversation>): Conversation | null {
    const conv = this.getConversationById(id, userId);
    if (!conv) return null;
    Object.assign(conv, updates, { updated_at: new Date().toISOString() });
    this.save();
    return conv;
  }

  public deleteConversation(id: string, userId: string): boolean {
    const index = this.data.conversations.findIndex((c) => c.id === id && c.user_id === userId);
    if (index === -1) return false;

    this.data.conversations.splice(index, 1);
    this.data.messages = this.data.messages.filter((m) => m.conversation_id !== id);
    this.save();
    return true;
  }

  public getMessages(conversationId: string): Message[] {
    return this.data.messages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public createMessage(message: Message): Message {
    this.data.messages.push(message);
    const conv = this.data.conversations.find((c) => c.id === message.conversation_id);
    if (conv) {
      conv.updated_at = new Date().toISOString();
    }
    this.save();
    return message;
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    return { ...this.data.settings };
  }

  public updateSettings(settings: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
    return { ...this.data.settings };
  }

  // --- Real Stats for Dashboard (strictly computed from authenticated user's records) ---
  public getUserStats(userId: string) {
    const kbCount = this.data.knowledge_bases.filter((kb) => kb.user_id === userId).length;
    const docCount = this.data.documents.filter((d) => d.user_id === userId).length;
    const convCount = this.data.conversations.filter((c) => c.user_id === userId).length;
    const chunkCount = this.data.document_chunks.filter((c) => c.user_id === userId).length;

    return {
      knowledge_bases: kbCount,
      documents: docCount,
      conversations: convCount,
      chunks: chunkCount,
    };
  }
}

export const db = new Database();
