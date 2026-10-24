import { useState, useEffect } from 'react';
import { Server, Check, AlertCircle, X, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { getApiBaseUrl, getCustomBackendUrl, setCustomBackendUrl, pingBackend, isGitHubPages } from '../lib/api';
import toast from 'react-hot-toast';

interface BackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (url: string) => void;
}

export function BackendSettingsModal({ isOpen, onClose, onSaved }: BackendSettingsModalProps) {
  const [url, setUrl] = useState(() => getCustomBackendUrl() || (isGitHubPages() ? '' : getApiBaseUrl()));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(getCustomBackendUrl() || (isGitHubPages() ? '' : getApiBaseUrl()));
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestResult({ ok: false, message: 'Please enter a valid backend URL.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await pingBackend(url.trim());
      if (res.ok) {
        setTestResult({
          ok: true,
          message: `Connected! Server status: ${res.status || 'operational'} (${res.encryption || 'AES-256-GCM'}).`,
        });
      } else {
        setTestResult({
          ok: false,
          message: res.error || 'Could not connect to /api/health on this server.',
        });
      }
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    setCustomBackendUrl(cleanUrl || null);
    toast.success(cleanUrl ? `Backend API set to ${cleanUrl}` : 'Reset to default backend URL');
    if (onSaved) onSaved(cleanUrl);
    onClose();
  };

  const handleResetDefault = () => {
    setCustomBackendUrl(null);
    setUrl(isGitHubPages() ? '' : 'http://localhost:3000');
    setTestResult(null);
    toast('Reset to default backend configuration');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[#6366f1]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#fafafa]">Backend API Settings</h2>
              <p className="text-[11px] text-[#a1a1a1]">Configure server endpoint for secret encryption</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#a1a1a1] hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational banner for GitHub Pages */}
        {isGitHubPages() && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>🌐</span>
              <span>Running on GitHub Pages</span>
            </p>
            <p className="text-[#a1a1a1] leading-relaxed">
              GitHub Pages is a static host. Enter your deployed <strong>Render</strong> or cloud backend URL below (e.g.{' '}
              <code className="text-amber-200">https://asgaurd.onrender.com</code>) to connect to live AES-256-GCM encryption.
            </p>
          </div>
        )}

        {/* Input Form */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="backend-url-input" className="text-xs font-medium text-[#a1a1a1]">
              Backend API URL
            </label>
            <input
              id="backend-url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://asgaurd.onrender.com"
              className="w-full h-11 px-3.5 bg-[#0a0a0a] border border-[#262626] rounded-xl text-xs sm:text-sm font-mono text-[#fafafa] placeholder:text-[#555] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !url.trim()}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-[#222] hover:bg-[#2c2c2c] text-[#fafafa] border border-[#333] transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing…' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefault}
              className="text-xs text-[#a1a1a1] hover:text-white px-2 py-1.5 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 animate-in fade-in ${
                testResult.ok
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}
            >
              {testResult.ok ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#262626]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#a1a1a1] hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6366f1] hover:bg-[#4f46e5] shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
}
