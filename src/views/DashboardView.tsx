import React, { useEffect, useState } from 'react';
import { api, DashboardStats, KnowledgeBase, DocumentRecord, Conversation } from '../lib/api.js';
import {
  FolderKanban,
  FileText,
  MessageSquare,
  Layers,
  Plus,
  Upload,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: string, param?: string) => void;
  onOpenCreateKbModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenCreateKbModal,
}) => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getStats();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3 text-[#8B949E]">
        <Loader2 className="w-7 h-7 animate-spin text-[#1877F2]" />
        <p className="text-sm font-medium text-[#8B949E]">Aggregating knowledge base telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-4 rounded-xl bg-[#F85149]/10 border border-[#F85149]/30 text-[#F85149] text-sm">
          {error || 'Unable to load dashboard.'}
        </div>
      </div>
    );
  }

  const { stats, recent_documents, recent_conversations, knowledge_bases } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#30363D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F0F6FC]">
            Workspace Overview
          </h1>
          <p className="text-sm text-[#8B949E] mt-1">
            Manage your personal vector knowledge bases, documents, and RAG conversations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenCreateKbModal}
            className="px-3.5 py-2 text-xs font-semibold text-[#F0F6FC] bg-[#1877F2] hover:bg-[#166FE5] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Knowledge Base</span>
          </button>

          {knowledge_bases.length > 0 && (
            <button
              onClick={() => onNavigate('knowledge-bases', knowledge_bases[0].id)}
              className="px-3.5 py-2 text-xs font-medium text-[#F0F6FC] bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#8B949E]" />
              <span>Upload Document</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('chat')}
            className="px-3.5 py-2 text-xs font-medium text-[#F0F6FC] bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#8B949E]" />
            <span>Open Chat</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (GitHub card #161B22 with #30363D border) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] space-y-1">
          <div className="flex items-center justify-between text-[#8B949E] text-xs font-medium">
            <span>Knowledge Bases</span>
            <FolderKanban className="w-4 h-4 text-[#8B949E]" />
          </div>
          <div className="text-2xl font-bold text-[#F0F6FC] font-mono tabular-nums">
            {stats.knowledge_bases}
          </div>
          <div className="text-xs text-[#8B949E]">
            Isolated tenant collections
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] space-y-1">
          <div className="flex items-center justify-between text-[#8B949E] text-xs font-medium">
            <span>Indexed Documents</span>
            <FileText className="w-4 h-4 text-[#8B949E]" />
          </div>
          <div className="text-2xl font-bold text-[#F0F6FC] font-mono tabular-nums">
            {stats.documents}
          </div>
          <div className="text-xs text-[#8B949E]">
            PDF, DOCX, TXT & Markdown
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] space-y-1">
          <div className="flex items-center justify-between text-[#8B949E] text-xs font-medium">
            <span>Vector Chunks Stored</span>
            <Layers className="w-4 h-4 text-[#8B949E]" />
          </div>
          <div className="text-2xl font-bold text-[#F0F6FC] font-mono tabular-nums">
            {stats.chunks}
          </div>
          <div className="text-xs text-[#8B949E]">
            384-dimension dense embeddings
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] space-y-1">
          <div className="flex items-center justify-between text-[#8B949E] text-xs font-medium">
            <span>Chat Sessions</span>
            <MessageSquare className="w-4 h-4 text-[#8B949E]" />
          </div>
          <div className="text-2xl font-bold text-[#F0F6FC] font-mono tabular-nums">
            {stats.conversations}
          </div>
          <div className="text-xs text-[#8B949E]">
            Streaming RAG queries with sources
          </div>
        </div>
      </div>

      {/* Zero State / Onboarding Banner */}
      {stats.knowledge_bases === 0 && (
        <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#58A6FF]" />
              <h3 className="text-base font-semibold text-[#F0F6FC]">
                Welcome to Nexora — AI Knowledge & RAG Platform
              </h3>
            </div>
            <p className="text-xs text-[#8B949E] max-w-2xl leading-relaxed">
              Create your first knowledge base to upload PDF, Word (.docx), Plain Text, or Markdown documents. Real pgvector embeddings and Hugging Face inference provide grounded answers with citations.
            </p>
          </div>
          <button
            onClick={onOpenCreateKbModal}
            className="px-4 py-2 text-xs font-semibold bg-[#1877F2] hover:bg-[#166FE5] text-[#F0F6FC] rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Create First Knowledge Base</span>
          </button>
        </div>
      )}

      {/* Main Grid: Recent Documents & Recent Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Table (2 columns wide) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F0F6FC]">Recent Documents</h2>
            <button
              onClick={() => onNavigate('knowledge-bases')}
              className="text-xs text-[#58A6FF] hover:underline font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>View all knowledge bases</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
            {recent_documents.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <FileText className="w-8 h-8 text-[#8B949E] mx-auto" />
                <p className="text-sm font-medium text-[#F0F6FC]">No documents uploaded yet</p>
                <p className="text-xs text-[#8B949E]">
                  Upload a PDF, DOCX, TXT, or Markdown file to start extracting chunks.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D1117] border-b border-[#30363D] text-[#8B949E] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Filename</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Chunks</th>
                      <th className="py-3 px-4 text-right">Size</th>
                      <th className="py-3 px-4 text-right">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363D] text-[#F0F6FC]">
                    {recent_documents.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => onNavigate('knowledge-bases', doc.knowledge_base_id)}
                        className="hover:bg-[#21262D]/60 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-[#F0F6FC] truncate max-w-[200px]">
                          {doc.filename}
                        </td>
                        <td className="py-3.5 px-4">
                          {doc.status === 'READY' ? (
                            <span className="inline-flex items-center gap-1.5 text-[#3FB950] font-medium font-mono text-[11px] bg-[#3FB950]/15 px-2 py-0.5 rounded-md border border-[#3FB950]/30">
                              <CheckCircle2 className="w-3 h-3" />
                              READY
                            </span>
                          ) : doc.status === 'PROCESSING' ? (
                            <span className="inline-flex items-center gap-1.5 text-[#D29922] font-medium font-mono text-[11px] bg-[#D29922]/15 px-2 py-0.5 rounded-md border border-[#D29922]/30">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              PROCESSING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[#F85149] font-medium font-mono text-[11px] bg-[#F85149]/15 px-2 py-0.5 rounded-md border border-[#F85149]/30">
                              <AlertCircle className="w-3 h-3" />
                              FAILED
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#8B949E]">
                          {doc.chunk_count}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#8B949E]">
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#8B949E] whitespace-nowrap">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Conversations (1 column wide) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F0F6FC]">Recent Inquiries</h2>
            <button
              onClick={() => onNavigate('chat')}
              className="text-xs text-[#58A6FF] hover:underline font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>New inquiry</span>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-xl border border-[#30363D] bg-[#161B22] divide-y divide-[#30363D] overflow-hidden">
            {recent_conversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-[#8B949E] mx-auto" />
                <p className="text-sm font-medium text-[#F0F6FC]">No chat sessions yet</p>
                <p className="text-xs text-[#8B949E]">
                  Ask a question about your knowledge bases to generate answers.
                </p>
              </div>
            ) : (
              recent_conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onNavigate('chat', conv.id)}
                  className="w-full p-4 text-left hover:bg-[#21262D]/60 transition-colors flex items-start justify-between gap-3 group cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-semibold text-[#F0F6FC] group-hover:text-[#58A6FF] transition-colors truncate">
                      {conv.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#8B949E] mt-1">
                      <Clock className="w-3 h-3 text-[#8B949E]" />
                      <span>{new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(conv.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8B949E] group-hover:text-[#58A6FF] shrink-0 mt-0.5 transition-colors" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
