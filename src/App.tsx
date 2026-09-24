import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Shield, Sparkles, Server, Github, ExternalLink } from 'lucide-react';
import { CreateSecretForm } from './components/CreateSecretForm';
import { SuccessCard } from './components/SuccessCard';
import { RevealCard } from './components/RevealCard';
import { RecentSecrets } from './components/RecentSecrets';
import { ThemeToggle } from './components/ThemeToggle';
import { AboutPage } from './components/pages/AboutPage';
import { FaqPage } from './components/pages/FaqPage';
import { PrivacyPage } from './components/pages/PrivacyPage';
import { TermsPage } from './components/pages/TermsPage';
import { StatusPage } from './components/pages/StatusPage';
import { NotFoundPage } from './components/pages/NotFoundPage';
import { CreateSecretResponse } from './types';
import { isDemoModeActive, setDemoModeActive, getApiBaseUrl } from './lib/api';
import toast from 'react-hot-toast';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });
  const [createdSecret, setCreatedSecret] = useState<CreateSecretResponse | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => isDemoModeActive());

  // Handle browser popstate navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync demo mode state
  useEffect(() => {
    const handleDemoChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      setIsDemoMode(customEvent.detail.active);
    };
    window.addEventListener('vault_demo_mode_changed', handleDemoChange);
    return () => window.removeEventListener('vault_demo_mode_changed', handleDemoChange);
  }, []);

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleDemoMode = () => {
    const next = !isDemoMode;
    setIsDemoMode(next);
    setDemoModeActive(next);
    if (next) {
      toast('Demo Vault Sandbox active (in-memory secrets for testing)', {
        icon: '✨',
      });
    } else {
      toast(`Switched to live backend API (${getApiBaseUrl()})`, {
        icon: '🌐',
      });
    }
  };

  // Route matching:
  const viewMatch = currentPath.match(/^\/view\/([^/?#]+)/);
  const secretId = viewMatch ? viewMatch[1] : null;

  // Determine which page content to render
  const renderContent = () => {
    if (secretId) {
      return (
        <RevealCard
          secretId={secretId}
          onNavigateHome={() => {
            setCreatedSecret(null);
            navigate('/');
          }}
          onNavigateAbout={() => navigate('/about')}
        />
      );
    }

    switch (currentPath) {
      case '/':
        if (createdSecret) {
          return (
            <SuccessCard
              data={createdSecret}
              onReset={() => setCreatedSecret(null)}
            />
          );
        }
        return (
          <div className="w-full space-y-6">
            <CreateSecretForm onSuccess={(data) => setCreatedSecret(data)} />
            <RecentSecrets />
          </div>
        );

      case '/about':
        return <AboutPage onNavigateHome={() => navigate('/')} />;

      case '/faq':
        return <FaqPage onNavigateHome={() => navigate('/')} />;

      case '/privacy':
        return <PrivacyPage />;

      case '/terms':
        return <TermsPage />;

      case '/status':
        return <StatusPage />;

      default:
        return <NotFoundPage onNavigateHome={() => navigate('/')} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between vault-bg-glow selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* react-hot-toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#141414',
            color: '#fafafa',
            border: '1px solid #262626',
            fontSize: '13px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#141414',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#141414',
            },
          },
        }}
      />

      {/* Top Header Bar */}
      <header className="w-full border-b border-[#262626] dark:border-[#262626] light:border-slate-200 bg-[#0a0a0a]/85 dark:bg-[#0a0a0a]/85 light:bg-white/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setCreatedSecret(null);
              navigate('/');
            }}
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-[#fafafa] dark:text-[#fafafa] light:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Shield className="w-5 h-5 text-[#6366f1]" />
            <span className="font-bold">Ephemeral Vault</span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#a1a1a1] dark:text-[#a1a1a1] light:text-slate-600">
            <button
              type="button"
              onClick={() => {
                setCreatedSecret(null);
                navigate('/');
              }}
              className={`transition-colors hover:text-[#fafafa] dark:hover:text-white light:hover:text-slate-900 cursor-pointer ${
                currentPath === '/' ? 'text-[#fafafa] dark:text-white font-semibold' : ''
              }`}
            >
              Create Secret
            </button>

            <button
              type="button"
              onClick={() => navigate('/about')}
              className={`transition-colors hover:text-[#fafafa] dark:hover:text-white light:hover:text-slate-900 cursor-pointer ${
                currentPath === '/about' ? 'text-[#fafafa] dark:text-white font-semibold' : ''
              }`}
            >
              How it works
            </button>

            <button
              type="button"
              onClick={() => navigate('/faq')}
              className={`transition-colors hover:text-[#fafafa] dark:hover:text-white light:hover:text-slate-900 cursor-pointer ${
                currentPath === '/faq' ? 'text-[#fafafa] dark:text-white font-semibold' : ''
              }`}
            >
              FAQ
            </button>

            <button
              type="button"
              onClick={() => navigate('/status')}
              className={`transition-colors hover:text-[#fafafa] dark:hover:text-white light:hover:text-slate-900 cursor-pointer flex items-center gap-1.5 ${
                currentPath === '/status' ? 'text-[#fafafa] dark:text-white font-semibold' : ''
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Status</span>
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            {/* Demo Sandbox Mode Switcher */}
            <button
              type="button"
              onClick={toggleDemoMode}
              aria-label={isDemoMode ? 'Demo Sandbox Mode Active' : 'Live API Mode Active'}
              title={
                isDemoMode
                  ? 'Demo Sandbox: In-memory simulation. Click to switch to backend API.'
                  : `Connecting to ${getApiBaseUrl()}. Click to switch to Demo Sandbox.`
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer ${
                isDemoMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-[#141414] dark:bg-[#141414] light:bg-slate-100 border-[#262626] dark:border-[#262626] light:border-slate-300 text-[#a1a1a1] hover:text-[#fafafa]'
              }`}
            >
              {isDemoMode ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Demo Sandbox</span>
                  <span className="sm:hidden">Demo</span>
                </>
              ) : (
                <>
                  <Server className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span className="hidden sm:inline">Live API</span>
                  <span className="sm:hidden">Live</span>
                </>
              )}
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 my-auto">
        <div className="w-full">
          {renderContent()}
        </div>
      </main>

      {/* Footer with 8-route links & security tags */}
      <footer className="w-full border-t border-[#262626] dark:border-[#262626] light:border-slate-200 py-8 text-xs text-[#a1a1a1] dark:text-[#a1a1a1] light:text-slate-500 bg-[#0a0a0a]/50">
        <div className="max-w-6xl mx-auto px-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#6366f1]" />
              <span className="font-semibold text-[#fafafa] dark:text-[#fafafa] light:text-slate-900">
                Ephemeral Secret Vault
              </span>
              <span>— Single-use, zero-knowledge secret sharing</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="hover:text-[#fafafa] transition-colors"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => navigate('/faq')}
                className="hover:text-[#fafafa] transition-colors"
              >
                FAQ
              </button>
              <button
                type="button"
                onClick={() => navigate('/privacy')}
                className="hover:text-[#fafafa] transition-colors"
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() => navigate('/terms')}
                className="hover:text-[#fafafa] transition-colors"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => navigate('/status')}
                className="hover:text-[#fafafa] transition-colors"
              >
                Status
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#1f1f1f] text-[11px]">
            <p>© {new Date().getFullYear()} Ephemeral Secret Vault. All secrets burned upon revelation.</p>
            <div className="flex items-center gap-3">
              <span>AES-256-GCM Encrypted</span>
              <span>•</span>
              <span>Zero Persistent Logs</span>
              <span>•</span>
              <span>Open Source Protocol</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
