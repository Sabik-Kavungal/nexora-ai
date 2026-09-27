import React, { useState } from 'react';
import { api, KnowledgeBase } from '../lib/api.js';
import { X, FolderPlus, Loader2 } from 'lucide-react';

interface CreateKbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (kb: KnowledgeBase) => void;
}

export const CreateKbModal: React.FC<CreateKbModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for the knowledge base.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newKb = await api.createKnowledgeBase(name.trim(), description.trim());
      setName('');
      setDescription('');
      onSuccess(newKb);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create knowledge base');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#010409]/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#30363D]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#21262D] border border-[#30363D] flex items-center justify-center text-[#58A6FF]">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#F0F6FC]">Create Knowledge Base</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#F85149]/15 border border-[#F85149]/30 text-[#F85149] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#F0F6FC] mb-1">
              Knowledge Base Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Employee Handbook 2026, Q3 Financial Reports"
              className="w-full px-3.5 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F0F6FC] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what kind of documents will be organized here..."
              className="w-full px-3.5 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#30363D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{loading ? 'Creating...' : 'Create Knowledge Base'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
