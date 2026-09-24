import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ExternalLink,
  PlusCircle,
  AlertTriangle,
  QrCode,
  Share2,
  Copy,
  Check,
  Clock,
  Eye,
  Lock,
  FileText,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { CreateSecretResponse } from '../types';
import { CopyButton } from './CopyButton';
import { QrCodeModal } from './QrCodeModal';
import { formatExpiresAt } from '../lib/format';
import toast from 'react-hot-toast';

interface SuccessCardProps {
  data: CreateSecretResponse;
  onReset: () => void;
}

export function SuccessCard({ data, onReset }: SuccessCardProps) {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [checksumCopied, setChecksumCopied] = useState(false);

  // Trigger canvas-confetti on mount
  useEffect(() => {
    try {
      const end = Date.now() + 1500;
      const colors = ['#6366f1', '#a855f7', '#22c55e', '#3b82f6'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch {
      // ignore
    }
  }, []);

  let finalViewUrl = data.view_url;
  if (!finalViewUrl.startsWith('http')) {
    finalViewUrl = `${window.location.origin}${finalViewUrl.startsWith('/') ? '' : '/'}${finalViewUrl}`;
  }

  const handleCopyChecksum = async () => {
    if (!data.checksum) return;
    try {
      await navigator.clipboard.writeText(data.checksum);
      setChecksumCopied(true);
      toast.success('Checksum copied');
      setTimeout(() => setChecksumCopied(false), 2000);
    } catch {
      toast.error('Failed to copy checksum');
    }
  };

  // Social Share Handlers
  const encodedUrl = encodeURIComponent(finalViewUrl);
  const shareText = encodeURIComponent('Here is a secure self-destructing secret via Ephemeral Vault:');

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${shareText}`,
    signal: `sgnl://share?text=${shareText}%20${encodedUrl}`,
    slack: `https://slack.com/app_redirect?url=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent('Confidential: Ephemeral Secret Vault Link')}&body=${shareText}%0A%0A${encodedUrl}`,
  };

  return (
    <div className="w-full max-w-[640px] mx-auto bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#262626] dark:border-[#262626] light:border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
      {/* Success Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-3">
          <svg
            className="w-8 h-8 text-[#22c55e]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" className="animate-checkmark" />
          </svg>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fafafa] dark:text-[#fafafa] light:text-slate-900">
          ✅ Secret Stored
        </h2>
        <p className="text-sm text-[#a1a1a1] dark:text-[#a1a1a1] light:text-slate-600">
          Share this link. It works only once.
        </p>
      </div>

      {/* View URL Field */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-[#a1a1a1]">
          One-Time Secret Link
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            readOnly
            value={finalViewUrl}
            onClick={(e) => e.currentTarget.select()}
            className="flex-1 px-3.5 py-3 bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 border border-[#262626] dark:border-[#262626] light:border-slate-300 rounded-xl text-sm font-mono text-[#fafafa] dark:text-[#fafafa] light:text-slate-900 select-all focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 cursor-pointer"
          />
          <div className="flex items-center gap-2 shrink-0">
            <CopyButton
              textToCopy={finalViewUrl}
              label="Copy Link"
              copiedLabel="Copied!"
              variant="primary"
              className="flex-1 sm:flex-initial"
            />
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              aria-label="Show QR code"
              title="View QR Code"
              className="p-3 rounded-xl bg-[#262626] hover:bg-[#333333] text-[#fafafa] border border-[#383838] transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metadata Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1c1c] text-[#fafafa] border border-[#262626]">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Expires {formatExpiresAt(data.expires_at)}</span>
        </span>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1c1c] text-[#fafafa] border border-[#262626]">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {data.views_remaining === 1 ? '1 view remaining' : `${data.views_remaining} views remaining`}
          </span>
        </span>

        {data.requires_password && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Lock className="w-3.5 h-3.5" />
            <span>Password protected</span>
          </span>
        )}

        {data.file_name && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate max-w-[140px]">{data.file_name}</span>
          </span>
        )}
      </div>

      {/* Social Quick Share Buttons */}
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-semibold uppercase text-[#a1a1a1] block text-center">
          Share Securely Via
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href={shareLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#1a281e] text-emerald-400 border border-emerald-500/30 hover:bg-[#223829] text-xs font-medium transition-colors"
          >
            WhatsApp
          </a>
          <a
            href={shareLinks.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#142333] text-sky-400 border border-sky-500/30 hover:bg-[#1a2e42] text-xs font-medium transition-colors"
          >
            Telegram
          </a>
          <a
            href={shareLinks.signal}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#1f1f2e] text-indigo-300 border border-indigo-500/30 hover:bg-[#28283d] text-xs font-medium transition-colors"
          >
            Signal
          </a>
          <a
            href={shareLinks.slack}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#271a25] text-fuchsia-300 border border-fuchsia-500/30 hover:bg-[#362333] text-xs font-medium transition-colors"
          >
            Slack
          </a>
          <a
            href={shareLinks.email}
            className="px-3 py-1.5 rounded-lg bg-[#262626] text-[#fafafa] border border-[#383838] hover:bg-[#333333] text-xs font-medium transition-colors"
          >
            Email
          </a>
        </div>
      </div>

      {/* Warning Banner (Amber with subtle pulse) */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs leading-relaxed animate-pulse">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <div>
          <strong>⚠️ This link is shown only once.</strong> Save it now — you cannot retrieve it later. Once revealed or expired, it is permanently purged.
        </div>
      </div>

      {/* Checksum Display */}
      {data.checksum && (
        <div className="p-3 bg-[#0a0a0a] border border-[#262626] rounded-xl flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 truncate text-[#a1a1a1]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[#a1a1a1]">SHA-256:</span>
            <span className="text-[#fafafa] truncate">
              {data.checksum.substring(0, 16)}…{data.checksum.substring(data.checksum.length - 8)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyChecksum}
            className="p-1.5 rounded text-[#a1a1a1] hover:text-white hover:bg-[#262626] transition-colors cursor-pointer shrink-0 ml-2"
            title="Copy full SHA-256 Checksum for tamper verification"
          >
            {checksumCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-[#fafafa] bg-[#262626] hover:bg-[#333333] border border-[#383838] transition-all hover:scale-[1.02] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-[#a1a1a1]" />
          <span>Create Another</span>
        </button>

        <a
          href={finalViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#6366f1] hover:bg-[#4f46e5] shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <span>Open Link</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        url={finalViewUrl}
      />
    </div>
  );
}
