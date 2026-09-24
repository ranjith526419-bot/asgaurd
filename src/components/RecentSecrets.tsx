import { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp, Copy, Trash2, Check, Clock, ShieldAlert } from 'lucide-react';
import { getRecentSecrets, removeRecentSecret, clearAllRecentSecrets } from '../lib/recentSecrets';
import { RecentSecretItem } from '../types';
import { formatExpiresAt } from '../lib/format';
import toast from 'react-hot-toast';

export function RecentSecrets() {
  const [isOpen, setIsOpen] = useState(false);
  const [secrets, setSecrets] = useState<RecentSecretItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadSecrets = () => {
    setSecrets(getRecentSecrets());
  };

  useEffect(() => {
    loadSecrets();
    const handleUpdate = () => loadSecrets();
    window.addEventListener('vault_recent_secrets_updated', handleUpdate);
    return () => window.removeEventListener('vault_recent_secrets_updated', handleUpdate);
  }, []);

  const handleCopy = async (item: RecentSecretItem) => {
    try {
      await navigator.clipboard.writeText(item.view_url);
      setCopiedId(item.id);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecentSecret(id);
    toast.success('Removed from local history');
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAllRecentSecrets();
    toast.success('Local history cleared');
  };

  if (secrets.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-[640px] mx-auto mt-6 bg-[#141414]/90 dark:bg-[#141414]/90 light:bg-white border border-[#262626] dark:border-[#262626] light:border-slate-200 rounded-xl overflow-hidden shadow-lg transition-all">
      {/* Header bar / accordion toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1a1a1a] dark:hover:bg-[#1a1a1a] light:hover:bg-slate-50 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <History className="w-4 h-4 text-[#6366f1]" />
          <span className="text-xs sm:text-sm font-semibold text-[#fafafa] dark:text-[#fafafa] light:text-slate-900">
            Recent Secret Links
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#262626] text-[#a1a1a1]">
            {secrets.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[#a1a1a1]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#a1a1a1]" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-1 border-t border-[#262626] dark:border-[#262626] light:border-slate-200 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] text-[#a1a1a1] dark:text-[#a1a1a1] light:text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>Stored locally on your device only • Secret content is never cached</span>
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[#ef4444] hover:underline font-medium cursor-pointer"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {secrets.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 border border-[#262626] dark:border-[#262626] light:border-slate-200 rounded-lg text-xs"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-[#fafafa] dark:text-[#fafafa] light:text-slate-900 truncate">
                      #{item.id}
                    </span>
                    {item.secret_type && item.secret_type !== 'text' && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {item.secret_type}
                      </span>
                    )}
                    {item.has_password && (
                      <span className="text-[10px] text-amber-400 font-medium">🔒 locked</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#a1a1a1]">
                    <Clock className="w-3 h-3" />
                    <span>Expires {formatExpiresAt(item.expires_at)}</span>
                    {item.hint && (
                      <>
                        <span>•</span>
                        <span className="truncate italic">"{item.hint}"</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(item)}
                    aria-label={`Copy link for secret ${item.id}`}
                    className="p-1.5 rounded-md bg-[#1f1f1f] hover:bg-[#2b2b2b] text-[#fafafa] border border-[#333333] transition-colors cursor-pointer"
                    title="Copy link"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    aria-label={`Remove secret ${item.id} from local history`}
                    className="p-1.5 rounded-md text-[#a1a1a1] hover:text-[#ef4444] hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
