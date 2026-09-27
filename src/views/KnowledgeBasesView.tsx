import React, { useEffect, useState } from 'react';
import { api, KnowledgeBase } from '../lib/api.js';
import {
  FolderKanban,
  Plus,
  Trash2,
  Edit2,
  FileText,
  MessageSquare,
  ArrowRight,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';

interface KnowledgeBasesViewProps {
  onNavigate: (view: string, param?: string) => void;
  onOpenCreateKbModal: () => void;
}

export const KnowledgeBasesView: React.FC<KnowledgeBasesViewProps> = ({
  onNavigate,
  onOpenCreateKbModal,
}) => {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [kbToDelete, setKbToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingKb, setDeletingKb] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchKbs = async () => {
    try {
      setLoading(true);
      const data = await api.getKnowledgeBases();
      setKbs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKbs();
  }, []);

  const promptDeleteKb = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setKbToDelete({ id, name });
  };

  const confirmDeleteKb = async () => {
    if (!kbToDelete) return;
    setDeletingKb(true);
    try {
      await api.deleteKnowledgeBase(kbToDelete.id);
      setKbs((prev) => prev.filter((k) => k.id !== kbToDelete.id));
      setFeedback({
        type: 'success',
        message: `Knowledge base "${kbToDelete.name}" was successfully deleted.`,
      });
      setKbToDelete(null);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete knowledge base',
      });
    } finally {
      setDeletingKb(false);
    }
  };

  const startEdit = (kb: KnowledgeBase) => {
    setEditingKb(kb);
    setEditName(kb.name);
    setEditDesc(kb.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKb || !editName.trim()) return;

    try {
      setSavingEdit(true);
      const updated = await api.updateKnowledgeBase(editingKb.id, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setKbs((prev) => prev.map((k) => (k.id === updated.id ? { ...k, ...updated } : k)));
      setEditingKb(null);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#30363D]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F0F6FC]">Knowledge Bases</h1>
          <p className="text-sm text-[#8B949E] mt-1">
            Collections of isolated documents indexed for similarity retrieval and RAG grounding.
          </p>
        </div>

        <button
          onClick={onOpenCreateKbModal}
          className="px-4 py-2 text-xs font-semibold text-[#F0F6FC] bg-[#1877F2] hover:bg-[#166FE5] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Create Knowledge Base</span>
        </button>
      </div>

      {/* Delete / Action Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-[#3FB950]/15 border border-[#3FB950]/30 text-[#3FB950]'
              : 'bg-[#F85149]/15 border border-[#F85149]/30 text-[#F85149]'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs hover:opacity-75 cursor-pointer font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#8B949E]">
          <Loader2 className="w-7 h-7 animate-spin text-[#1877F2]" />
          <p className="text-sm font-medium text-[#8B949E]">Fetching knowledge repositories...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-[#F85149]/10 border border-[#F85149]/30 text-[#F85149] text-sm">
          {error}
        </div>
      ) : kbs.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-[#30363D] bg-[#161B22] p-8 space-y-4 max-w-lg mx-auto shadow-xs">
          <FolderKanban className="w-10 h-10 text-[#8B949E] mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#F0F6FC]">No knowledge bases yet</h2>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Create your first knowledge base to organize PDF manuals, policies, or documentation.
            </p>
          </div>
          <button
            onClick={onOpenCreateKbModal}
            className="px-4 py-2 text-xs font-semibold text-[#F0F6FC] bg-[#1877F2] hover:bg-[#166FE5] rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Create First Knowledge Base</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kbs.map((kb) => (
            <div
              key={kb.id}
              className="p-5 rounded-xl bg-[#161B22] border border-[#30363D] shadow-xs flex flex-col justify-between hover:border-[#8B949E]/50 transition-colors group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#21262D] border border-[#30363D] flex items-center justify-center text-[#58A6FF]">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-semibold text-[#F0F6FC] truncate max-w-[200px]">
                      {kb.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(kb)}
                      title="Edit knowledge base details"
                      className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => promptDeleteKb(e, kb.id, kb.name)}
                      title="Delete knowledge base"
                      className="p-1 rounded text-[#8B949E] hover:text-[#F85149] hover:bg-[#F85149]/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#8B949E] line-clamp-2 leading-relaxed min-h-[32px]">
                  {kb.description || 'No description provided.'}
                </p>

                {/* Metadata row */}
                <div className="flex items-center gap-2 text-xs text-[#8B949E] pt-3 border-t border-[#30363D]">
                  <span className="font-mono tabular-nums text-[#F0F6FC] font-medium">
                    {kb.document_count || 0} docs
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-[#8B949E]">
                    {kb.chunk_count || 0} chunks
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(kb.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-5 pt-3 border-t border-[#30363D]">
                <button
                  onClick={() => onNavigate('knowledge-bases', kb.id)}
                  className="flex-1 py-1.5 px-3 text-xs font-medium text-[#F0F6FC] bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#8B949E]" />
                  <span>Documents</span>
                </button>
                <button
                  onClick={() => onNavigate('chat', `kb:${kb.id}`)}
                  className="flex-1 py-1.5 px-3 text-xs font-semibold text-[#F0F6FC] bg-[#1877F2] hover:bg-[#166FE5] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask Assistant</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingKb && (
        <div className="fixed inset-0 z-50 bg-[#010409]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-2xl space-y-4 text-[#F0F6FC]">
            <h2 className="text-base font-bold text-[#F0F6FC]">Edit Knowledge Base</h2>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#F0F6FC] mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#F0F6FC] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setEditingKb(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-1.5 text-xs font-semibold text-[#F0F6FC] bg-[#1877F2] hover:bg-[#166FE5] rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Knowledge Base Confirmation Modal */}
      {kbToDelete && (
        <div className="fixed inset-0 z-50 bg-[#010409]/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F85149]/15 border border-[#F85149]/30 flex items-center justify-center text-[#F85149] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F0F6FC]">Delete Knowledge Base</h2>
                <p className="text-xs text-[#8B949E]">Permanent deletion</p>
              </div>
            </div>

            <p className="text-xs text-[#F0F6FC] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white">"{kbToDelete.name}"</span>?
              All of its indexed documents, chunks, and vector embeddings will be permanently removed. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#30363D]">
              <button
                type="button"
                disabled={deletingKb}
                onClick={() => setKbToDelete(null)}
                className="px-3.5 py-2 text-xs font-medium text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingKb}
                onClick={confirmDeleteKb}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#F85149] hover:bg-[#DA3633] disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {deletingKb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deletingKb ? 'Deleting...' : 'Delete Knowledge Base'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
