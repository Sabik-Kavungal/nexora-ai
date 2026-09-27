import React, { useState, useEffect } from 'react';
import { api, User } from './lib/api.js';
import { Navbar } from './components/Navbar.js';
import { LoginView } from './views/LoginView.js';
import { RegisterView } from './views/RegisterView.js';
import { DashboardView } from './views/DashboardView.js';
import { KnowledgeBasesView } from './views/KnowledgeBasesView.js';
import { DocumentsView } from './views/DocumentsView.js';
import { ChatView } from './views/ChatView.js';
import { SettingsView } from './views/SettingsView.js';
import { CreateKbModal } from './components/CreateKbModal.js';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [viewParam, setViewParam] = useState<string | undefined>(undefined);
  const [isCreateKbOpen, setIsCreateKbOpen] = useState(false);

  // Check existing session on load
  useEffect(() => {
    const token = localStorage.getItem('nexora_token') || localStorage.getItem('knowledgeai_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.getMe()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        api.logout();
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleNavigate = (view: string, param?: string) => {
    setCurrentView(view);
    setViewParam(param);
  };

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCurrentView('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center gap-3 text-[#8B949E]">
        <Loader2 className="w-7 h-7 animate-spin text-[#1877F2]" />
        <p className="text-xs font-medium text-[#8B949E]">Restoring Nexora session...</p>
      </div>
    );
  }

  // Unauthenticated routing
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex flex-col text-[#F0F6FC]">
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          user={null}
          onLogout={handleLogout}
        />
        <main className="flex-1">
          {currentView === 'register' ? (
            <RegisterView onSuccess={handleLoginSuccess} onNavigate={handleNavigate} />
          ) : (
            <LoginView onSuccess={handleLoginSuccess} onNavigate={handleNavigate} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#F0F6FC] flex flex-col font-sans selection:bg-[#1877F2]/25 selection:text-[#F0F6FC]">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {currentView === 'dashboard' && (
          <DashboardView
            onNavigate={handleNavigate}
            onOpenCreateKbModal={() => setIsCreateKbOpen(true)}
          />
        )}

        {currentView === 'knowledge-bases' && (
          viewParam ? (
            <DocumentsView
              knowledgeBaseId={viewParam}
              onNavigate={handleNavigate}
            />
          ) : (
            <KnowledgeBasesView
              onNavigate={handleNavigate}
              onOpenCreateKbModal={() => setIsCreateKbOpen(true)}
            />
          )
        )}

        {currentView === 'chat' && (
          <ChatView
            initialConversationId={viewParam && !viewParam.startsWith('kb:') ? viewParam : undefined}
            initialKbId={viewParam && viewParam.startsWith('kb:') ? viewParam.slice(3) : undefined}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'settings' && <SettingsView />}
      </main>

      {/* Global Create Knowledge Base Modal */}
      <CreateKbModal
        isOpen={isCreateKbOpen}
        onClose={() => setIsCreateKbOpen(false)}
        onSuccess={(kb) => {
          handleNavigate('knowledge-bases', kb.id);
        }}
      />
    </div>
  );
}
