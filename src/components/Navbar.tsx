import React, { useState, useRef, useEffect } from 'react';
import { User } from '../lib/api.js';
import {
  Database,
  MessageSquare,
  FolderKanban,
  Settings as SettingsIcon,
  LogOut,
  BookOpen,
  Menu,
  X,
  LayoutDashboard,
  Sun,
  Moon,
  Laptop,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../lib/theme.js';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  user,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const { mode, effectiveTheme, setMode, toggleTheme } = useTheme();
  const themeDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (view: string, param?: string) => {
    onNavigate(view, param);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-[#30363D] bg-[#010409] sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-md bg-[#1877F2] flex items-center justify-center text-white font-bold shadow-xs">
              <Database className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-bold tracking-tight text-[#F0F6FC] group-hover:text-white transition-colors leading-tight">
                Nexora
              </span>
              <span className="hidden sm:inline-block text-[9px] text-[#8B949E] font-medium leading-none">
                AI Knowledge & RAG Platform
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation tabs */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => handleNav('dashboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currentView === 'dashboard'
                  ? 'text-[#F0F6FC] bg-[#21262D] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/60'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleNav('knowledge-bases')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currentView === 'knowledge-bases' || currentView.startsWith('kb-')
                  ? 'text-[#F0F6FC] bg-[#21262D] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/60'
              }`}
            >
              Knowledge Bases
            </button>
            <button
              onClick={() => handleNav('chat')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currentView === 'chat'
                  ? 'text-[#F0F6FC] bg-[#21262D] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/60'
              }`}
            >
              Assistant Chat
            </button>
            <button
              onClick={() => handleNav('settings')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                currentView === 'settings'
                  ? 'text-[#F0F6FC] bg-[#21262D] border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/60'
              }`}
            >
              Settings
            </button>
          </nav>
        )}

        {/* Actions: Theme Toggle + User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Mode Toggle Button with quick switcher dropdown */}
          <div className="relative" ref={themeDropdownRef}>
            <div className="flex items-center bg-[#0D1117] border border-[#30363D] rounded-md overflow-hidden">
              <button
                onClick={toggleTheme}
                title={`Current: ${mode === 'auto' ? `Auto (${effectiveTheme})` : effectiveTheme}. Click to toggle Dark / Light`}
                className="px-2.5 py-1.5 text-xs font-medium text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] transition-colors flex items-center gap-1.5 cursor-pointer"
                aria-label="Toggle dark/light theme"
              >
                {effectiveTheme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-[#58A6FF]" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-[#D29922]" />
                )}
                <span className="hidden sm:inline text-[11px] capitalize font-medium text-[#F0F6FC]">
                  {mode === 'auto' ? 'Auto' : effectiveTheme}
                </span>
              </button>
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                title="Select Theme Mode (Dark, Light, Auto)"
                className="px-1 py-1.5 text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] border-l border-[#30363D] cursor-pointer"
                aria-label="Theme options"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {themeDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-[#161B22] border border-[#30363D] rounded-lg shadow-xl py-1 z-50 text-xs animate-in fade-in duration-100">
                <button
                  onClick={() => {
                    setMode('dark');
                    setThemeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#21262D] text-left cursor-pointer transition-colors ${
                    mode === 'dark' ? 'text-[#58A6FF] font-semibold' : 'text-[#8B949E] hover:text-[#F0F6FC]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                  </div>
                  {mode === 'dark' && <span className="text-xs">✓</span>}
                </button>

                <button
                  onClick={() => {
                    setMode('light');
                    setThemeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#21262D] text-left cursor-pointer transition-colors ${
                    mode === 'light' ? 'text-[#58A6FF] font-semibold' : 'text-[#8B949E] hover:text-[#F0F6FC]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-3.5 h-3.5 text-[#D29922]" />
                    <span>White / Light</span>
                  </div>
                  {mode === 'light' && <span className="text-xs">✓</span>}
                </button>

                <button
                  onClick={() => {
                    setMode('auto');
                    setThemeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#21262D] text-left cursor-pointer transition-colors ${
                    mode === 'auto' ? 'text-[#58A6FF] font-semibold' : 'text-[#8B949E] hover:text-[#F0F6FC]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Auto (OS)</span>
                  </div>
                  {mode === 'auto' && <span className="text-xs">✓</span>}
                </button>
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden sm:inline-block text-xs font-mono text-[#8B949E] max-w-[180px] truncate bg-[#0D1117] px-2.5 py-1 rounded-md border border-[#30363D]">
                {user.email}
              </span>
              <button
                onClick={onLogout}
                title="Log out"
                className="px-2.5 py-1.5 text-xs font-medium text-[#8B949E] hover:text-[#F85149] hover:bg-[#F85149]/10 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 rounded-md text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] border border-[#30363D] cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNav('login')}
                className="px-3 py-1.5 text-xs font-medium text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D] rounded-md transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNav('register')}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#1877F2] hover:bg-[#166FE5] rounded-md transition-colors cursor-pointer shadow-xs"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile navigation drawer dropdown */}
      {user && mobileMenuOpen && (
        <div className="md:hidden border-t border-[#30363D] bg-[#010409] px-4 py-3 space-y-2 animate-in fade-in duration-150">
          <button
            onClick={() => handleNav('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
              currentView === 'dashboard'
                ? 'text-[#F0F6FC] bg-[#21262D] border border-[#30363D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => handleNav('knowledge-bases')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
              currentView === 'knowledge-bases' || currentView.startsWith('kb-')
                ? 'text-[#F0F6FC] bg-[#21262D] border border-[#30363D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/60'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Knowledge Bases</span>
          </button>
          <button
            onClick={() => handleNav('chat')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
              currentView === 'chat'
                ? 'text-[#F0F6FC] bg-[#21262D] border border-[#30363D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Assistant Chat</span>
          </button>
          <button
            onClick={() => handleNav('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left cursor-pointer ${
              currentView === 'settings'
                ? 'text-[#F0F6FC] bg-[#21262D] border border-[#30363D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#21262D]/60'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>

          {/* Mobile Theme Selector */}
          <div className="pt-2 border-t border-[#30363D] flex items-center justify-between text-xs text-[#8B949E]">
            <span>Theme Appearance:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMode('dark')}
                className={`px-2 py-1 rounded text-[11px] ${
                  mode === 'dark' ? 'bg-[#1877F2] text-white font-semibold' : 'hover:bg-[#21262D] text-[#8B949E]'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setMode('light')}
                className={`px-2 py-1 rounded text-[11px] ${
                  mode === 'light' ? 'bg-[#1877F2] text-white font-semibold' : 'hover:bg-[#21262D] text-[#8B949E]'
                }`}
              >
                White
              </button>
              <button
                onClick={() => setMode('auto')}
                className={`px-2 py-1 rounded text-[11px] ${
                  mode === 'auto' ? 'bg-[#1877F2] text-white font-semibold' : 'hover:bg-[#21262D] text-[#8B949E]'
                }`}
              >
                Auto
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
