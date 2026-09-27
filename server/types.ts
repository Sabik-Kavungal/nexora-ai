export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBase {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface DocumentRecord {
  id: string;
  knowledge_base_id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  chunk_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  knowledge_base_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  page_number?: number;
  embedding: number[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface Conversation {
  id: string;
  knowledge_base_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
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

export interface AppSettings {
  ai_provider: 'huggingface' | 'openai' | 'anthropic' | 'gemini';
  hf_token: string;
  hf_model: string;
  hf_embedding_model: string;
  rag_top_k: number;
  rag_similarity_threshold: number;
  chunk_size: number;
  chunk_overlap: number;
  max_output_tokens: number;
}
