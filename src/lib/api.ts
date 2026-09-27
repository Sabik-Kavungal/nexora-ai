// API client for Nexora — AI Knowledge & RAG Platform
const API_BASE = '/api';

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface KnowledgeBase {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  document_count?: number;
  ready_document_count?: number;
  chunk_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  knowledge_base_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  chunk_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_name: string;
  chunk_index: number;
  page_number?: number;
  snippet: string;
  similarity_score: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SourceCitation[];
  created_at: string;
}

export interface Conversation {
  id: string;
  knowledge_base_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  ai_provider: string;
  hf_token_masked?: string;
  has_custom_token?: boolean;
  hf_model: string;
  hf_embedding_model: string;
  rag_top_k: number;
  rag_similarity_threshold: number;
  chunk_size: number;
  chunk_overlap: number;
  max_output_tokens: number;
}

export interface DashboardStats {
  stats: {
    knowledge_bases: number;
    documents: number;
    conversations: number;
    chunks: number;
  };
  recent_documents: DocumentRecord[];
  recent_conversations: Conversation[];
  knowledge_bases: KnowledgeBase[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('nexora_token') || localStorage.getItem('knowledgeai_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // --- Auth ---
  async register(email: string, password: string):Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('nexora_token', data.token);
    return data;
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('nexora_token', data.token);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Session expired');
    return data;
  },

  logout() {
    localStorage.removeItem('nexora_token');
    localStorage.removeItem('knowledgeai_token');
  },

  // --- Knowledge Bases ---
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    const res = await fetch(`${API_BASE}/knowledge-bases`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch knowledge bases');
    return data;
  },

  async getKnowledgeBase(id: string): Promise<KnowledgeBase & { documents: DocumentRecord[] }> {
    const res = await fetch(`${API_BASE}/knowledge-bases/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch knowledge base');
    return data;
  },

  async createKnowledgeBase(name: string, description?: string): Promise<KnowledgeBase> {
    const res = await fetch(`${API_BASE}/knowledge-bases`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create knowledge base');
    return data;
  },

  async updateKnowledgeBase(id: string, updates: { name?: string; description?: string }): Promise<KnowledgeBase> {
    const res = await fetch(`${API_BASE}/knowledge-bases/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update knowledge base');
    return data;
  },

  async deleteKnowledgeBase(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/knowledge-bases/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete knowledge base');
    }
  },

  // --- Documents ---
  async getDocumentsByKb(kbId: string): Promise<DocumentRecord[]> {
    const res = await fetch(`${API_BASE}/documents/kb/${kbId}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch documents');
    return data;
  },

  async uploadDocument(kbId: string, file: File): Promise<DocumentRecord> {
    const formData = new FormData();
    formData.append('knowledge_base_id', kbId);
    formData.append('file', file);

    const token = localStorage.getItem('nexora_token') || localStorage.getItem('knowledgeai_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to process document');
    return data.document;
  },

  async getDocumentChunks(docId: string): Promise<{ document: DocumentRecord; total_chunks: number; chunks: DocumentChunk[] }> {
    const res = await fetch(`${API_BASE}/documents/${docId}/chunks`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch chunks');
    return data;
  },

  async deleteDocument(docId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete document');
    }
  },

  // --- Chat & Conversations ---
  async getConversations(kbId?: string): Promise<Conversation[]> {
    const url = kbId ? `${API_BASE}/chat/conversations?knowledge_base_id=${kbId}` : `${API_BASE}/chat/conversations`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch conversations');
    return data;
  },

  async getConversation(id: string): Promise<{ conversation: Conversation; knowledge_base: KnowledgeBase; messages: Message[] }> {
    const res = await fetch(`${API_BASE}/chat/conversations/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch conversation');
    return data;
  },

  async createConversation(kbId: string, title?: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/chat/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ knowledge_base_id: kbId, title }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create conversation');
    return data;
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/conversations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete conversation');
    }
  },

  // --- Settings & Stats ---
  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch settings');
    return data;
  },

  async updateSettings(settings: Partial<AppSettings & { hf_token?: string }>): Promise<{ message: string; settings: AppSettings }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data;
  },

  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/settings/stats`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch dashboard stats');
    return data;
  },
};
