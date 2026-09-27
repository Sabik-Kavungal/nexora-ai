import React, { useEffect, useState } from 'react';
import { api, AppSettings } from '../lib/api.js';
import {
  Settings as SettingsIcon,
  Cpu,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Save,
  Loader2,
  AlertCircle,
  Database,
  Layers,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useTheme } from '../lib/theme.js';

export const SettingsView: React.FC = () => {
  const { mode, effectiveTheme, setMode } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [provider, setProvider] = useState('huggingface');
  const [hfToken, setHfToken] = useState('');
  const [hfModel, setHfModel] = useState('');
  const [hfEmbeddingModel, setHfEmbeddingModel] = useState('');
  const [ragTopK, setRagTopK] = useState(4);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.35);
  const [chunkSize, setChunkSize] = useState(800);
  const [chunkOverlap, setChunkOverlap] = useState(150);
  const [maxTokens, setMaxTokens] = useState(1024);

  useEffect(() => {
    api.getSettings()
      .then((data) => {
        setSettings(data);
        setProvider(data.ai_provider);
        setHfModel(data.hf_model);
        setHfEmbeddingModel(data.hf_embedding_model);
        setRagTopK(data.rag_top_k);
        setSimilarityThreshold(data.rag_similarity_threshold);
        setChunkSize(data.chunk_size);
        setChunkOverlap(data.chunk_overlap);
        setMaxTokens(data.max_output_tokens);
      })
      .catch((err) => setError(err.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const updates: any = {
        ai_provider: provider,
        hf_model: hfModel,
        hf_embedding_model: hfEmbeddingModel,
        rag_top_k: ragTopK,
        rag_similarity_threshold: similarityThreshold,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        max_output_tokens: maxTokens,
      };

      if (hfToken.trim()) {
        updates.hf_token = hfToken.trim();
      }

      const res = await api.updateSettings(updates);
      setSettings(res.settings);
      setHfToken('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-3 text-[#8B949E]">
        <Loader2 className="w-7 h-7 animate-spin text-[#1877F2]" />
        <p className="text-sm font-medium text-[#8B949E]">Retrieving system configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#30363D]">
        <h1 className="text-2xl font-bold tracking-tight text-[#F0F6FC]">System & AI Settings</h1>
        <p className="text-sm text-[#8B949E] mt-1">
          Configure the modular AI inference provider, embedding models, and RAG retrieval boundaries.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-[#3FB950]/15 border border-[#3FB950]/30 text-[#3FB950] text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">Settings successfully applied and vector pipeline reconfigured.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-[#F85149]/15 border border-[#F85149]/30 text-[#F85149] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 0: Appearance / Theme Mode */}
        <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#F0F6FC] font-semibold text-sm">
              <Sun className="w-4 h-4 text-[#8B949E]" />
              <span>Interface Appearance & Theme</span>
            </div>
            <span className="text-xs text-[#8B949E]">
              Current: <strong className="text-[#F0F6FC] capitalize">{effectiveTheme}</strong> {mode === 'auto' && '(Auto OS)'}
            </span>
          </div>
          <p className="text-xs text-[#8B949E] leading-relaxed">
            Choose your preferred workspace aesthetic. Switch between ChatGPT/GitHub dark mode, clean white light mode, or automatically sync with your device.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Dark Mode */}
            <button
              type="button"
              onClick={() => setMode('dark')}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                mode === 'dark'
                  ? 'bg-[#21262D] border-[#1877F2] text-[#F0F6FC] shadow-xs ring-1 ring-[#1877F2]'
                  : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:border-[#8B949E]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-[#58A6FF]" />
                  <span className="font-semibold text-sm text-[#F0F6FC]">Dark Mode</span>
                </div>
                {mode === 'dark' && (
                  <span className="text-[10px] font-mono text-[#58A6FF] bg-[#58A6FF]/15 px-1.5 py-0.5 rounded border border-[#58A6FF]/30 font-semibold">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-[#8B949E] mt-2 leading-relaxed">
                ChatGPT and GitHub developer dark mode with deep charcoal surfaces.
              </p>
            </button>

            {/* White / Light Mode */}
            <button
              type="button"
              onClick={() => setMode('light')}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                mode === 'light'
                  ? 'bg-[#21262D] border-[#1877F2] text-[#F0F6FC] shadow-xs ring-1 ring-[#1877F2]'
                  : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:border-[#8B949E]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-[#D29922]" />
                  <span className="font-semibold text-sm text-[#F0F6FC]">White / Light</span>
                </div>
                {mode === 'light' && (
                  <span className="text-[10px] font-mono text-[#58A6FF] bg-[#58A6FF]/15 px-1.5 py-0.5 rounded border border-[#58A6FF]/30 font-semibold">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-[#8B949E] mt-2 leading-relaxed">
                Product Hunt-inspired clean white background with crisp typography.
              </p>
            </button>

            {/* Auto (System) */}
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                mode === 'auto'
                  ? 'bg-[#21262D] border-[#1877F2] text-[#F0F6FC] shadow-xs ring-1 ring-[#1877F2]'
                  : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:border-[#8B949E]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-[#3FB950]" />
                  <span className="font-semibold text-sm text-[#F0F6FC]">Auto (System)</span>
                </div>
                {mode === 'auto' && (
                  <span className="text-[10px] font-mono text-[#3FB950] bg-[#3FB950]/15 px-1.5 py-0.5 rounded border border-[#3FB950]/30 font-semibold">ACTIVE</span>
                )}
              </div>
              <p className="text-xs text-[#8B949E] mt-2 leading-relaxed">
                Automatically adjusts to dark or light based on your OS or browser theme.
              </p>
            </button>
          </div>
        </div>

        {/* Section 1: Modular AI Provider Abstraction */}
        <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#F0F6FC] font-semibold text-sm">
            <Cpu className="w-4 h-4 text-[#8B949E]" />
            <span>AI Provider Abstraction (Swappable Architecture)</span>
          </div>
          <p className="text-xs text-[#8B949E] leading-relaxed">
            The application is decoupled from any single vendor via our abstract provider interface (<code className="text-[#58A6FF] font-semibold bg-[#21262D] px-1.5 py-0.5 rounded border border-[#30363D]">AIProvider</code>).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* Hugging Face (Active) */}
            <div
              onClick={() => setProvider('huggingface')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                provider === 'huggingface'
                  ? 'bg-[#21262D] border-[#1877F2] text-[#F0F6FC] shadow-xs'
                  : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:border-[#8B949E]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[#F0F6FC]">Hugging Face</span>
                <span className="text-[10px] font-mono text-[#3FB950] bg-[#3FB950]/15 px-1.5 py-0.5 rounded border border-[#3FB950]/30 font-semibold">ACTIVE</span>
              </div>
              <p className="text-xs text-[#8B949E] mt-2 leading-relaxed">
                Inference API & Router for open weights (Llama 3.1, MiniLM embeddings).
              </p>
            </div>

            {/* OpenAI (Extension Point) */}
            <div className="p-4 rounded-xl border bg-[#0D1117]/60 border-[#30363D] text-[#6E7681] cursor-not-allowed">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[#6E7681]">OpenAI</span>
                <span className="text-[10px] font-mono text-[#6E7681] bg-[#21262D] px-1.5 py-0.5 rounded border border-[#30363D]">EXT. POINT</span>
              </div>
              <p className="text-xs text-[#6E7681] mt-2 leading-relaxed">
                Future drop-in provider for text-embedding-3-small and GPT-4o.
              </p>
            </div>

            {/* Anthropic (Extension Point) */}
            <div className="p-4 rounded-xl border bg-[#0D1117]/60 border-[#30363D] text-[#6E7681] cursor-not-allowed">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[#6E7681]">Anthropic</span>
                <span className="text-[10px] font-mono text-[#6E7681] bg-[#21262D] px-1.5 py-0.5 rounded border border-[#30363D]">EXT. POINT</span>
              </div>
              <p className="text-xs text-[#6E7681] mt-2 leading-relaxed">
                Future drop-in provider for Claude 3.5 Sonnet synthesis.
              </p>
            </div>
          </div>

          {/* Hugging Face Credentials */}
          <div className="pt-4 border-t border-[#30363D] space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#F0F6FC]">
                  Hugging Face User Access Token (HF_TOKEN)
                </label>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#58A6FF] hover:underline font-medium flex items-center gap-1"
                >
                  <span>Get Token on HF</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                placeholder={settings?.hf_token_masked || 'hf_... (optional, fallback synthesizer active)'}
                className="w-full px-3.5 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-xs font-mono text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
              />
              <p className="text-[11px] text-[#8B949E] mt-1">
                If omitted, the applet operates in standalone mode using our deterministic semantic vectorizer and context synthesizer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#F0F6FC] mb-1.5">
                  LLM Generation Model
                </label>
                <input
                  type="text"
                  value={hfModel}
                  onChange={(e) => setHfModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-xs font-mono text-[#F0F6FC] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F0F6FC] mb-1.5">
                  Embedding Model (384 dimensions)
                </label>
                <input
                  type="text"
                  value={hfEmbeddingModel}
                  onChange={(e) => setHfEmbeddingModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-xs font-mono text-[#F0F6FC] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: RAG & Chunking Parameters */}
        <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-[#F0F6FC] font-semibold text-sm">
            <Sliders className="w-4 h-4 text-[#8B949E]" />
            <span>RAG & Chunking Hyperparameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-[#F0F6FC]">Top K Retrieved Chunks</span>
                <span className="font-mono text-[#58A6FF] font-bold">{ragTopK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={ragTopK}
                onChange={(e) => setRagTopK(parseInt(e.target.value, 10))}
                className="w-full accent-[#1877F2] cursor-pointer"
              />
              <p className="text-[11px] text-[#8B949E] mt-1">
                Number of vector-similar chunks passed to context.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-[#F0F6FC]">Min Similarity Threshold</span>
                <span className="font-mono text-[#58A6FF] font-bold">{(similarityThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#1877F2] cursor-pointer"
              />
              <p className="text-[11px] text-[#8B949E] mt-1">
                Filters out chunks below this cosine relevance score.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-[#F0F6FC]">Chunk Size</span>
                <span className="font-mono text-[#58A6FF] font-bold">{chunkSize} chars</span>
              </div>
              <input
                type="range"
                min="300"
                max="2000"
                step="50"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value, 10))}
                className="w-full accent-[#1877F2] cursor-pointer"
              />
              <p className="text-[11px] text-[#8B949E] mt-1">
                Maximum character window per document passage.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-[#F0F6FC]">Chunk Overlap</span>
                <span className="font-mono text-[#58A6FF] font-bold">{chunkOverlap} chars</span>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                step="25"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value, 10))}
                className="w-full accent-[#1877F2] cursor-pointer"
              />
              <p className="text-[11px] text-[#8B949E] mt-1">
                Sliding window overlap to prevent splitting mid-sentence.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Architecture & Multi-Tenant Security Info */}
        <div className="p-6 rounded-xl bg-[#161B22] border border-[#30363D] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#F0F6FC] font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-[#3FB950]" />
            <span>Multi-Tenant Vector Isolation Verified</span>
          </div>
          <p className="text-xs text-[#8B949E] leading-relaxed">
            All vector similarity searches enforce parameterized <code className="text-[#58A6FF] font-semibold bg-[#21262D] px-1.5 py-0.5 rounded border border-[#30363D]">user_id</code> and <code className="text-[#58A6FF] font-semibold bg-[#21262D] px-1.5 py-0.5 rounded border border-[#30363D]">knowledge_base_id</code> scoping at the repository level. Cross-user document leakage is architecturally impossible.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
