import React, { useEffect, useState } from 'react';
import { api, DocumentChunk, DocumentRecord } from '../lib/api.js';
import { X, Layers, FileText, Loader2 } from 'lucide-react';

interface DocumentChunkModalProps {
  document: DocumentRecord | null;
  onClose: () => void;
}

export const DocumentChunkModal: React.FC<DocumentChunkModalProps> = ({ document, onClose }) => {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) return;
    setLoading(true);
    setError(null);
    api.getDocumentChunks(document.id)
      .then((res) => {
        setChunks(res.chunks);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch chunks');
      })
      .finally(() => setLoading(false));
  }, [document]);

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#010409]/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363D] bg-[#0D1117]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#21262D] border border-[#30363D] flex items-center justify-center text-[#58A6FF]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F0F6FC] truncate max-w-md">
                Document Chunks: {document.filename}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#8B949E] mt-0.5">
                <span>{document.chunk_count} Total Chunks</span>
                <span aria-hidden="true">·</span>
                <span>{(document.file_size / 1024).toFixed(1)} KB</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#3FB950] font-semibold">{document.status}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#0D1117]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#8B949E]">
              <Loader2 className="w-6 h-6 animate-spin text-[#1877F2]" />
              <p className="text-sm">Loading chunk vectors and passages...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#F85149]/15 border border-[#F85149]/30 text-[#F85149] text-sm">
              {error}
            </div>
          ) : chunks.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#8B949E]">
              No chunks generated for this document yet.
            </div>
          ) : (
            chunks.map((chunk) => (
              <div
                key={chunk.id}
                className="p-4 rounded-xl bg-[#161B22] border border-[#30363D] shadow-xs space-y-2 hover:border-[#8B949E]/50 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-[#8B949E] border-b border-[#30363D] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#58A6FF]">
                      Chunk #{chunk.chunk_index + 1}
                    </span>
                    {chunk.page_number && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#8B949E] font-medium">Page {chunk.page_number}</span>
                      </>
                    )}
                  </div>
                  <span className="font-mono text-[#8B949E]">
                    {chunk.content.length} characters
                  </span>
                </div>
                <p className="text-xs font-mono text-[#F0F6FC] whitespace-pre-wrap leading-relaxed selection:bg-[#1877F2]/30">
                  {chunk.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#0D1117] border-t border-[#30363D] flex justify-end">
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg text-xs font-semibold bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#F0F6FC] shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
