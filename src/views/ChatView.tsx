import React, { useEffect, useState, useRef } from 'react';
import {
  api,
  KnowledgeBase,
  Conversation,
  Message,
  SourceCitation,
} from '../lib/api.js';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Bookmark,
  Sparkles,
  StopCircle,
  RotateCcw,
  Loader2,
  FolderKanban,
  FileText,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { MarkdownView } from '../components/MarkdownView.js';
import { SourceDrawer } from '../components/SourceDrawer.js';

interface ChatViewProps {
  initialConversationId?: string;
  initialKbId?: string;
  onNavigate: (view: string, param?: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  initialConversationId,
  initialKbId,
  onNavigate,
}) => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingSources, setStreamingSources] = useState<SourceCitation[]>([]);
  const [activeCitation, setActiveCitation] = useState<SourceCitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Suggested prompts
  const suggestedQueries = [
    'What is the customer refund policy?',
    'What are the employee core collaboration hours?',
    'What are the corporate password requirements?',
    'What is the Recovery Time Objective (RTO)?',
  ];

  // Load KBs and initial conversation
  useEffect(() => {
    api.getKnowledgeBases()
      .then((kbs) => {
        setKnowledgeBases(kbs);
        if (initialKbId && kbs.some((k) => k.id === initialKbId)) {
          setSelectedKbId(initialKbId);
        } else if (kbs.length > 0) {
          setSelectedKbId(kbs[0].id);
        }
      })
      .catch((err) => console.error('Error fetching KBs:', err));

    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await api.getConversations();
      setConversations(convs);
      if (initialConversationId && convs.some((c) => c.id === initialConversationId)) {
        loadConversationMessages(initialConversationId);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const loadConversationMessages = async (convId: string) => {
    try {
      const res = await api.getConversation(convId);
      setCurrentConvId(convId);
      setSelectedKbId(res.conversation.knowledge_base_id);
      setMessages(res.messages);
      scrollToBottom();
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const handleStartNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setStreamingText('');
    setStreamingSources([]);
    setError(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConvId === id) {
        handleStartNewChat();
      }
    } catch (err: any) {
      setError(`Delete failed: ${err.message}`);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || streaming) return;

    if (!selectedKbId) {
      setError('Please select or create a knowledge base before asking questions.');
      return;
    }

    setError(null);
    setInputMessage('');

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConvId || '',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    setStreaming(true);
    setStreamingText('');
    setStreamingSources([]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const token = localStorage.getItem('nexora_token') || localStorage.getItem('knowledgeai_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          knowledge_base_id: selectedKbId,
          conversation_id: currentConvId || undefined,
          message: text,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No streaming response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let activeSources: SourceCitation[] = [];
      let accumulatedText = '';
      let assignedConvId = currentConvId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            const nextLine = lines[i + 1];
            if (nextLine && nextLine.startsWith('data: ')) {
              const dataStr = nextLine.slice(6).trim();
              i++; // consume data line
              try {
                const parsed = JSON.parse(dataStr);
                if (eventType === 'conversation') {
                  assignedConvId = parsed.conversation_id;
                  if (!currentConvId) {
                    setCurrentConvId(assignedConvId);
                    loadConversations();
                  }
                } else if (eventType === 'sources') {
                  activeSources = parsed;
                  setStreamingSources(parsed);
                } else if (eventType === 'token') {
                  accumulatedText += parsed.token;
                  setStreamingText(accumulatedText);
                } else if (eventType === 'done') {
                  // Finalize message
                  const assistantMsg: Message = {
                    id: parsed.message_id || `asst-${Date.now()}`,
                    conversation_id: assignedConvId || '',
                    role: 'assistant',
                    content: accumulatedText,
                    sources: parsed.sources || activeSources,
                    created_at: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                  setStreamingText('');
                  setStreamingSources([]);
                } else if (eventType === 'error') {
                  setError(parsed.error || 'RAG inference error');
                }
              } catch {
                // ignore SSE json decode error
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User clicked stop
        if (streamingText.trim()) {
          const partialMsg: Message = {
            id: `partial-${Date.now()}`,
            conversation_id: currentConvId || '',
            role: 'assistant',
            content: streamingText + ' *(Generation stopped by user)*',
            sources: streamingSources,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, partialMsg]);
        }
      } else {
        setError(err.message || 'Network error streaming RAG answer.');
      }
    } finally {
      setStreaming(false);
      setStreamingText('');
      setStreamingSources([]);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-6">
      {/* Sidebar: Conversation history & KB switcher */}
      <div className="w-full md:w-72 flex flex-col shrink-0 rounded-xl bg-[#161B22] border border-[#30363D] p-4 space-y-4 shadow-xs">
        {/* Knowledge Base selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
            Target Knowledge Base
          </label>
          {knowledgeBases.length === 0 ? (
            <button
              onClick={() => onNavigate('knowledge-bases')}
              className="w-full py-2 px-3 text-xs bg-[#0D1117] hover:bg-[#21262D] text-[#58A6FF] font-semibold rounded-lg border border-[#30363D] transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>+ Create Knowledge Base</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <select
              value={selectedKbId}
              onChange={(e) => setSelectedKbId(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-[#0D1117] border border-[#30363D] rounded-lg text-[#F0F6FC] font-medium focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2]"
            >
              {knowledgeBases.map((kb) => (
                <option key={kb.id} value={kb.id} className="bg-[#161B22] text-[#F0F6FC]">
                  {kb.name} ({kb.document_count || 0} docs)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleStartNewChat}
          className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>New Inquiry</span>
        </button>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8B949E] px-2 py-1">
            Previous Conversations
          </div>
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#8B949E]">
              No conversations yet.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadConversationMessages(conv.id)}
                className={`group flex items-center justify-between py-2 px-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  currentConvId === conv.id
                    ? 'bg-[#21262D] text-[#F0F6FC] font-semibold border border-[#30363D]'
                    : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${currentConvId === conv.id ? 'text-[#58A6FF]' : 'text-[#8B949E] group-hover:text-[#F0F6FC]'}`} />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#8B949E] hover:text-[#F85149] transition-opacity cursor-pointer"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col rounded-xl bg-[#161B22] border border-[#30363D] shadow-xs overflow-hidden">
        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#0D1117]">
          {error && (
            <div className="p-3.5 rounded-lg bg-[#F85149]/15 border border-[#F85149]/30 text-[#F85149] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {messages.length === 0 && !streaming && (
            <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-[#21262D] border border-[#30363D] flex items-center justify-center text-[#58A6FF] mx-auto shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-[#F0F6FC]">
                  Ask Nexora Anything
                </h2>
                <p className="text-xs text-[#8B949E] leading-relaxed">
                  Questions are answered strictly using retrieved vector context from your chosen knowledge base with verifiable source references.
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="space-y-2 pt-2 text-left">
                <div className="text-xs font-semibold text-[#8B949E]">Sample Inquiries:</div>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedQueries.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="p-3 rounded-xl bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] hover:border-[#58A6FF]/50 text-xs font-medium text-[#F0F6FC] transition-colors text-left flex items-center justify-between cursor-pointer group"
                    >
                      <span>{q}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#8B949E] group-hover:text-[#58A6FF] transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Render historical messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-[#8B949E] mb-1 px-1">
                <span className="font-medium text-[#8B949E]">{msg.role === 'user' ? 'You' : 'Nexora Assistant'}</span>
                <span aria-hidden="true">·</span>
                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#21262D] border border-[#30363D] text-[#F0F6FC] rounded-tr-sm shadow-xs'
                    : 'bg-[#161B22] border border-[#30363D] text-[#F0F6FC] rounded-tl-sm space-y-3 shadow-xs'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <>
                    <MarkdownView content={msg.content} />

                    {/* Sources citations badge bar */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-3 border-t border-[#30363D] space-y-2">
                        <div className="text-xs font-semibold text-[#8B949E] flex items-center gap-1.5">
                          <Bookmark className="w-3.5 h-3.5 text-[#58A6FF]" />
                          <span>Sources Cited ({msg.sources.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => setActiveCitation(src)}
                              className="px-2.5 py-1 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-xs text-[#F0F6FC] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs group"
                            >
                              <FileText className="w-3 h-3 text-[#8B949E] group-hover:text-[#58A6FF]" />
                              <span className="truncate max-w-[160px] font-medium">{src.document_name}</span>
                              {src.page_number && (
                                <span className="text-[#8B949E] text-[10px]">p.{src.page_number}</span>
                              )}
                              <span className="font-mono text-[#58A6FF] text-[10px] font-semibold">
                                {(src.similarity_score * 100).toFixed(0)}%
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Active Streaming Token Display */}
          {streaming && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 text-xs text-[#8B949E] mb-1 px-1">
                <span className="font-medium text-[#8B949E]">Nexora Assistant</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-[#58A6FF] font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating RAG synthesis...
                </span>
              </div>

              <div className="max-w-[85%] rounded-2xl rounded-tl-sm p-4 text-sm bg-[#161B22] border border-[#30363D] text-[#F0F6FC] space-y-3 shadow-xs">
                <MarkdownView content={streamingText || 'Searching pgvector index and retrieving relevant chunks...'} />

                {streamingSources.length > 0 && (
                  <div className="pt-2 border-t border-[#30363D] flex items-center gap-2 text-xs text-[#8B949E] font-medium">
                    <Bookmark className="w-3.5 h-3.5 text-[#58A6FF]" />
                    <span>Retrieved {streamingSources.length} verified context passages</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input composer */}
        <div className="p-4 border-t border-[#30363D] bg-[#161B22]">
          <div className="flex items-center justify-between pb-2 text-xs text-[#8B949E] px-1">
            <span>Shift + Enter for new line · Enter to query</span>
            {streaming && (
              <button
                onClick={handleStopStreaming}
                className="text-[#F85149] hover:text-[#ff7b72] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Stop generation</span>
              </button>
            )}
          </div>

          <div className="flex items-end gap-2 bg-[#0D1117] rounded-xl border border-[#30363D] p-2 focus-within:border-[#1877F2] focus-within:ring-1 focus-within:ring-[#1877F2] transition-colors">
            <textarea
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              placeholder="Ask a question about your uploaded documents..."
              className="flex-1 bg-transparent text-sm text-[#F0F6FC] placeholder:text-[#8B949E] focus:outline-none resize-none px-2 py-1 leading-relaxed"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={streaming || !inputMessage.trim()}
              className="p-2.5 rounded-lg bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-40 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
              title="Send question"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Citation Inspector Drawer */}
      <SourceDrawer source={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
};
