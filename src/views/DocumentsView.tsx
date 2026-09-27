import React, { useEffect, useState, useRef } from 'react';
import { api, KnowledgeBase, DocumentRecord } from '../lib/api.js';
import {
  FileText,
  Upload,
  ArrowLeft,
  Trash2,
  Layers,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import { DocumentChunkModal } from '../components/DocumentChunkModal.js';

interface DocumentsViewProps {
  knowledgeBaseId: string;
  onNavigate: (view: string, param?: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  knowledgeBaseId,
  onNavigate,
}) => {
  const [kb, setKb] = useState<(KnowledgeBase & { documents: DocumentRecord[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inspectDoc, setInspectDoc] = useState<DocumentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; filename: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchKbDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getKnowledgeBase(knowledgeBaseId);
      setKb(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load knowledge base documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKbDetails();
  }, [knowledgeBaseId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB maximum limit.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'docx', 'txt', 'md', 'markdown'].includes(ext)) {
      setUploadError(`Unsupported format .${ext}. Only PDF, DOCX, TXT, and Markdown are supported.`);
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await api.uploadDocument(knowledgeBaseId, file);
      await fetchKbDetails();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err.message || 'Upload processing failed.');
    } finally {
      setUploading(false);
    }
  };

  const promptDeleteDoc = (e: React.MouseEvent, id: string, filename: string) => {
    e.stopPropagation();
    setDeleteTarget({ id, filename });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteDocument(deleteTarget.id);
      setKb((prev) =>
        prev
          ? {
              ...prev,
              documents: prev.documents.filter((d) => d.id !== deleteTarget.id),
              document_count: Math.max(0, (prev.document_count || 1) - 1),
            }
          : null
      );
      setDeleteFeedback({
        type: 'success',
        message: `"${deleteTarget.filename}" and its vector embeddings were removed.`,
      });
      setDeleteTarget(null);
      setTimeout(() => setDeleteFeedback(null), 4000);
    } catch (err: any) {
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'Failed to delete document',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3 text-[#8B949E]">
        <Loader2 className="w-7 h-7 animate-spin text-[#1877F2]" />
        <p className="text-sm font-medium text-[#8B949E]">Loading document index...</p>
      </div>
    );
  }

  if (error || !kb) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <button
          onClick={() => onNavigate('knowledge-bases')}
          className="text-xs text-[#58A6FF] hover:underline font-medium flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Knowledge Bases</span>
        </button>
        <div className="p-4 rounded-xl bg-[#F85149]/10 border border-[#F85149]/30 text-[#F85149] text-sm">
          {error || 'Knowledge base not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#8B949E]">
        <button
          onClick={() => onNavigate('knowledge-bases')}
          className="hover:text-[#F0F6FC] transition-colors flex items-center gap-1 cursor-pointer font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Knowledge Bases</span>
        </button>
        <span aria-hidden="true" className="text-[#30363D]">/</span>
        <span className="text-[#F0F6FC] font-semibold">{kb.name}</span>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#30363D]">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#F0F6FC]">{kb.name}</h1>
          <p className="text-sm text-[#8B949E] max-w-2xl">
            {kb.description || 'Upload documents below to parse, chunk, and embed them into the vector repository.'}
          </p>
        </div>

        <button
          onClick={() => onNavigate('chat', `kb:${kb.id}`)}
          className="px-4 py-2 text-xs font-semibold text-[#F0F6FC] bg-[#1877F2] hover:bg-[#166FE5] rounded-lg shadow-xs transition-colors flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ask Assistant</span>
        </button>
      </div>

      {/* Delete Feedback Banner */}
      {deleteFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            deleteFeedback.type === 'success'
              ? 'bg-[#3FB950]/15 border border-[#3FB950]/30 text-[#3FB950]'
              : 'bg-[#F85149]/15 border border-[#F85149]/30 text-[#F85149]'
          }`}
        >
          <div className="flex items-center gap-2">
            {deleteFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{deleteFeedback.message}</span>
          </div>
          <button
            onClick={() => setDeleteFeedback(null)}
            className="text-xs hover:opacity-75 cursor-pointer font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Document Upload Area */}
      <div className="rounded-xl border border-dashed border-[#30363D] hover:border-[#58A6FF] bg-[#161B22] p-8 text-center space-y-4 shadow-xs transition-colors">
        <div className="w-12 h-12 rounded-xl bg-[#21262D] border border-[#30363D] flex items-center justify-center text-[#58A6FF] mx-auto">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#1877F2]" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[#F0F6FC]">
            {uploading ? 'Processing & Vectorizing Document...' : 'Upload Knowledge Document'}
          </h2>
          <p className="text-xs text-[#8B949E] max-w-md mx-auto">
            PDF (multi-page text), Word (.docx), Plain Text (.txt), or Markdown (.md) up to 15MB.
          </p>
        </div>

        {uploadError && (
          <div className="p-3 rounded-lg bg-[#F85149]/10 border border-[#F85149]/30 text-[#F85149] text-xs max-w-md mx-auto">
            {uploadError}
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload-input"
          />
          <label
            htmlFor="file-upload-input"
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              uploading
                ? 'bg-[#21262D] text-[#8B949E] cursor-not-allowed border border-[#30363D]'
                : 'bg-[#1877F2] hover:bg-[#166FE5] text-[#F0F6FC] shadow-xs'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Select File to Index</span>
          </label>
        </div>
      </div>

      {/* Documents List Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F0F6FC]">Indexed Documents</h2>
          <span className="text-xs font-mono text-[#8B949E] bg-[#21262D] px-2 py-0.5 rounded border border-[#30363D]">
            {kb.documents.length} Total
          </span>
        </div>

        <div className="rounded-xl border border-[#30363D] bg-[#161B22] shadow-xs overflow-hidden">
          {kb.documents.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <FileText className="w-8 h-8 text-[#8B949E] mx-auto" />
              <p className="text-sm font-medium text-[#F0F6FC]">No documents in this knowledge base</p>
              <p className="text-xs text-[#8B949E]">
                Upload your files above to automatically extract chunks and generate vector embeddings.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0D1117] border-b border-[#30363D] text-[#8B949E] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Chunks</th>
                    <th className="py-3 px-4 text-right">Size</th>
                    <th className="py-3 px-4 text-right">Uploaded</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D] text-[#F0F6FC]">
                  {kb.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#21262D]/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#F0F6FC]">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#8B949E] shrink-0" />
                          <span className="truncate max-w-xs">{doc.filename}</span>
                        </div>
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
                          <span className="inline-flex items-center gap-1.5 text-[#F85149] font-medium font-mono text-[11px] bg-[#F85149]/15 px-2 py-0.5 rounded-md border border-[#F85149]/30" title={doc.error_message}>
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
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setInspectDoc(doc)}
                            title="Inspect chunk breakdown and text passages"
                            className="p-1 px-2.5 rounded-md text-[#F0F6FC] bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] transition-colors flex items-center gap-1 text-xs cursor-pointer font-medium"
                          >
                            <Layers className="w-3.5 h-3.5 text-[#8B949E]" />
                            <span>Chunks</span>
                          </button>
                          <button
                            onClick={(e) => promptDeleteDoc(e, doc.id, doc.filename)}
                            title="Delete document and its chunks"
                            className="p-1.5 rounded text-[#8B949E] hover:text-[#F85149] hover:bg-[#F85149]/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Chunk Modal */}
      <DocumentChunkModal document={inspectDoc} onClose={() => setInspectDoc(null)} />

      {/* In-App Delete Confirmation Modal (no blocked window.confirm) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-[#010409]/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F85149]/15 border border-[#F85149]/30 flex items-center justify-center text-[#F85149] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F0F6FC]">Delete Document</h2>
                <p className="text-xs text-[#8B949E]">Permanent removal from vector store</p>
              </div>
            </div>

            <p className="text-xs text-[#F0F6FC] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white break-all">"{deleteTarget.filename}"</span>?
              All associated vector embeddings and text passages will be removed. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#30363D]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-medium text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#F85149] hover:bg-[#DA3633] disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
