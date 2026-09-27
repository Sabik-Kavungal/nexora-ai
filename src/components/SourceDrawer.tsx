import React from 'react';
import { SourceCitation } from '../lib/api.js';
import { X, FileText, CheckCircle2, Bookmark } from 'lucide-react';

interface SourceDrawerProps {
  source: SourceCitation | null;
  onClose: () => void;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({ source, onClose }) => {
  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#010409]/80 backdrop-blur-xs flex justify-end">
      <div
        className="w-full max-w-md bg-[#161B22] border-l border-[#30363D] p-6 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200 text-[#F0F6FC]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#30363D]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#21262D] border border-[#30363D] flex items-center justify-center text-[#58A6FF]">
              <Bookmark className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#F0F6FC]">Source Citation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 space-y-6 flex-1 overflow-y-auto pr-1">
          {/* Document metadata card */}
          <div className="p-4 rounded-xl bg-[#0D1117] border border-[#30363D] space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-[#8B949E] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-[#F0F6FC] break-all">
                  {source.document_name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-[#8B949E] mt-1">
                  {source.page_number && (
                    <>
                      <span className="font-medium text-[#F0F6FC]">Page {source.page_number}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>Chunk #{source.chunk_index + 1}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[#58A6FF] font-semibold">
                    {(source.similarity_score * 100).toFixed(1)}% match
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-2.5 border-t border-[#30363D] text-xs text-[#3FB950] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
              <span>Grounding verified in vector store</span>
            </div>
          </div>

          {/* Retrieved Snippet */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E] mb-2">
              Retrieved Context Passage
            </h4>
            <div className="p-4 rounded-xl bg-[#0D1117] border border-[#30363D] text-sm text-[#F0F6FC] leading-relaxed font-sans whitespace-pre-wrap selection:bg-[#1877F2]/30 shadow-xs">
              {source.snippet}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#21262D] border border-[#30363D] text-xs text-[#8B949E] leading-relaxed">
            <strong className="font-bold text-[#58A6FF] block mb-1">RAG Grounding Integrity:</strong>
            This verbatim passage was extracted during pgvector similarity search and passed into the LLM system prompt as verified contextual truth.
          </div>
        </div>

        <div className="pt-4 border-t border-[#30363D]">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#F0F6FC] shadow-xs transition-colors cursor-pointer"
          >
            Close Citation
          </button>
        </div>
      </div>
    </div>
  );
};
