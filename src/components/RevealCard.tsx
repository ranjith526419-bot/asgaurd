import { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Ghost,
  AlertTriangle,
  EyeOff,
  Eye,
  ShieldCheck,
  Download,
  QrCode,
  WifiOff,
  RefreshCw,
  KeyRound,
  FileText,
  Clock,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { CopyButton } from './CopyButton';
import { CountdownTimer } from './CountdownTimer';
import { QrCodeModal } from './QrCodeModal';
import { burnSecret, VaultApiError, getDemoSecretMetadata } from '../lib/api';
import { BurnSecretResponse } from '../types';
import toast from 'react-hot-toast';

interface RevealCardProps {
  secretId: string;
  onNavigateHome: () => void;
  onNavigateAbout?: () => void;
}

type RevealState = 'ready' | 'burning' | 'password_prompt' | 'revealed' | 'not_found' | 'network_error';

export function RevealCard({ secretId, onNavigateHome, onNavigateAbout }: RevealCardProps) {
  const [state, setState] = useState<RevealState>('ready');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [burnResult, setBurnResult] = useState<BurnSecretResponse | null>(null);

  // Recipient Hint from metadata or payload
  const demoMeta = getDemoSecretMetadata(secretId);
  const [hint, setHint] = useState<string | null>(demoMeta?.hint || null);

  // Password Prompt state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordAttemptsLeft, setPasswordAttemptsLeft] = useState(3);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(300); // 5 min lockout
  const [isPasswordShaking, setIsPasswordShaking] = useState(false);
  const [isDecryptingPassword, setIsDecryptingPassword] = useState(false);

  // Shoulder surfing protection (blur toggle)
  const [isBlurredByChoice, setIsBlurredByChoice] = useState(false);
  const [isExpiredCountdown, setIsExpiredCountdown] = useState(false);

  // QR Modal for URLs
  const [isQrOpen, setIsQrOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle lockout countdown if locked out
  useEffect(() => {
    if (!isLockedOut) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false);
          setPasswordAttemptsLeft(3);
          clearInterval(interval);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLockedOut]);

  // Execute Secret Burn
  const executeBurn = async (pwd?: string) => {
    if (pwd) {
      setIsDecryptingPassword(true);
    } else {
      setState('burning');
    }
    try {
      const response = await burnSecret(secretId, pwd);
      setBurnResult(response);
      if (response.hint) setHint(response.hint);
      setIsConfirmModalOpen(false);
      setState('revealed');
      toast.success('Secret revealed & burned from server!');
    } catch (err: unknown) {
      setIsConfirmModalOpen(false);
      if (err instanceof VaultApiError) {
        if (err.requiresPassword) {
          setState('password_prompt');
          if (pwd) {
            // Wrong password attempt
            setIsPasswordShaking(true);
            setTimeout(() => setIsPasswordShaking(false), 500);
            const remaining = passwordAttemptsLeft - 1;
            setPasswordAttemptsLeft(remaining);
            if (remaining <= 0) {
              setIsLockedOut(true);
              toast.error('Too many failed attempts. Locked for 5 minutes.');
            } else {
              toast.error(`Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
            }
          }
          return;
        }

        if (err.status === 404) {
          setState('not_found');
          return;
        }

        if (err.isNetworkError) {
          setState('network_error');
          return;
        }

        toast.error(err.message || 'Error revealing secret.');
        setState('ready');
      } else {
        setState('network_error');
      }
    } finally {
      setIsDecryptingPassword(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLockedOut) return;
    executeBurn(password);
  };

  // Download attached file
  const handleDownloadFile = () => {
    if (!burnResult?.secret) return;
    try {
      const link = document.createElement('a');
      link.href = burnResult.secret;
      link.download = burnResult.file_name || 'vault-secret-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('File download initiated');
    } catch {
      toast.error('Failed to download file');
    }
  };

  // Verify deletion after auto-hide countdown
  const handleVerifyDeletion = async () => {
    try {
      await burnSecret(secretId);
      toast.error('Secret still unexpectedly found.');
    } catch (err: unknown) {
      if (err instanceof VaultApiError && err.status === 404) {
        toast.success('Confirmed! Secret is completely gone (404 Not Found).');
        setState('not_found');
      } else {
        setState('not_found');
      }
    }
  };

  // ─────────────────────────────────────────────
  // STATE: NETWORK ERROR
  // ─────────────────────────────────────────────
  if (state === 'network_error') {
    return (
      <div className="w-full max-w-[520px] mx-auto bg-[#141414] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4 animate-in fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[#ef4444]">
          <WifiOff className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#fafafa]">Connection Failed</h2>
        <p className="text-sm text-[#a1a1a1]">
          Could not reach the vault server. Check your connection or verify that the backend is active.
        </p>
        <button
          type="button"
          onClick={() => executeBurn(password || undefined)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-lg shadow-indigo-500/20 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // STATE: 404 / EXPIRED / BURNED
  // ─────────────────────────────────────────────
  if (state === 'not_found') {
    return (
      <div className="w-full max-w-[520px] mx-auto bg-[#141414] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-[#a1a1a1]">
          <Ghost className="w-8 h-8 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-[#fafafa]">
            Secret Not Found
          </h2>
          <p className="text-sm text-[#a1a1a1] max-w-sm mx-auto leading-relaxed">
            This secret has expired, already been read, or never existed.
          </p>
          <p className="text-xs text-amber-400 font-medium">
            Secrets are destroyed immediately after reading.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#6366f1] hover:bg-[#4f46e5] shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            Create Your Own
          </button>
          {onNavigateAbout && (
            <button
              type="button"
              onClick={onNavigateAbout}
              className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-medium text-[#a1a1a1] hover:text-[#fafafa] bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2e2e2e] transition-all cursor-pointer"
            >
              Learn More
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // STATE: PASSWORD PROMPT
  // ─────────────────────────────────────────────
  if (state === 'password_prompt') {
    return (
      <div
        className={`w-full max-w-[520px] mx-auto bg-[#141414] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in ${
          isPasswordShaking ? 'animate-shake' : ''
        }`}
      >
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#fafafa]">
            🔑 Enter Secret Password
          </h2>
          <p className="text-xs sm:text-sm text-[#a1a1a1]">
            This secret was encrypted with an additional passphrase. Enter it below to unlock.
          </p>
        </div>

        {hint && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start gap-2">
            <span>💡</span>
            <span><strong>Hint:</strong> {hint}</span>
          </div>
        )}

        {isLockedOut ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center space-y-1">
            <p className="text-sm font-semibold text-[#ef4444]">
              Too many attempts.
            </p>
            <p className="text-xs text-[#a1a1a1]">
              Secret locked for security. Try again in {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="unlock-pwd" className="text-[#a1a1a1]">Password</label>
                <span className="font-mono text-amber-400 text-[11px]">
                  {passwordAttemptsLeft} attempt{passwordAttemptsLeft === 1 ? '' : 's'} remaining
                </span>
              </div>
              <div className="relative">
                <input
                  id="unlock-pwd"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secret password"
                  className="w-full h-11 px-4 pr-10 bg-[#0a0a0a] border border-[#262626] rounded-xl text-sm font-mono text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#a1a1a1] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!password.trim() || isDecryptingPassword}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDecryptingPassword ? 'Decrypting…' : 'Unlock & Burn Secret'}
            </button>
          </form>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // STATE: REVEALED (200 OK)
  // ─────────────────────────────────────────────
  if (state === 'revealed' && burnResult) {
    const isFile = burnResult.secret_type === 'file' || burnResult.secret.startsWith('data:');
    const isUrl = burnResult.secret_type === 'url' || /^https?:\/\//.test(burnResult.secret.trim());

    return (
      <div className="w-full max-w-[560px] mx-auto bg-[#141414] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#22c55e]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#fafafa]">Secret Revealed</h2>
              <p className="text-[11px] text-emerald-400 font-mono">
                {burnResult.burned ? 'Status: Permanently Burned on Server' : `${burnResult.views_remaining} view remaining`}
              </p>
            </div>
          </div>

          {/* Blur Toggle for Shoulder-surfing protection */}
          <button
            type="button"
            onClick={() => setIsBlurredByChoice(!isBlurredByChoice)}
            aria-label={isBlurredByChoice ? 'Unblur secret' : 'Blur secret for shoulder privacy'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1c1c1c] text-[#a1a1a1] hover:text-[#fafafa] border border-[#262626] transition-colors cursor-pointer"
            title="Toggle shoulder surfing protection"
          >
            {isBlurredByChoice ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isBlurredByChoice ? 'Reveal' : 'Hide'}</span>
          </button>
        </div>

        {/* 60s Countdown Timer */}
        {!isExpiredCountdown && (
          <CountdownTimer
            initialSeconds={60}
            onExpire={() => setIsExpiredCountdown(true)}
          />
        )}

        {/* Secret Display */}
        <div className="relative">
          {isFile ? (
            <div className="p-6 bg-[#0a0a0a] border border-[#262626] rounded-xl text-center space-y-3">
              <FileText className="w-10 h-10 text-[#6366f1] mx-auto" />
              <div>
                <p className="text-sm font-semibold text-[#fafafa]">
                  {burnResult.file_name || 'Encrypted File Payload'}
                </p>
                {burnResult.file_size && (
                  <p className="text-xs text-[#a1a1a1] font-mono">
                    {(burnResult.file_size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleDownloadFile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Attached File</span>
              </button>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              readOnly
              rows={8}
              value={burnResult.secret}
              onClick={() => textareaRef.current?.select()}
              className={`w-full p-4 bg-[#0a0a0a] border border-[#262626] rounded-xl text-sm font-mono text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 transition-all resize-y select-all ${
                isExpiredCountdown || isBlurredByChoice
                  ? 'filter blur-md select-none pointer-events-none opacity-40'
                  : 'cursor-pointer'
              }`}
            />
          )}

          {/* Overlay when expired */}
          {isExpiredCountdown && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/75 backdrop-blur-md rounded-xl space-y-3 animate-in fade-in">
              <EyeOff className="w-8 h-8 text-[#a1a1a1]" />
              <p className="text-sm font-semibold text-[#fafafa]">
                Secret hidden automatically.
              </p>
              <p className="text-xs text-[#a1a1a1] max-w-xs">
                The session time expired to prevent unauthorized viewers.
              </p>
              <button
                type="button"
                onClick={handleVerifyDeletion}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#262626] hover:bg-[#333333] border border-[#383838] transition-all cursor-pointer"
              >
                Verify Deletion (Check 404)
              </button>
            </div>
          )}
        </div>

        {/* Action Row */}
        {!isExpiredCountdown && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              {isUrl && (
                <>
                  <a
                    href={burnResult.secret}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#262626] hover:bg-[#333333] text-[#fafafa] border border-[#383838] transition-colors"
                  >
                    <span>Open URL</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsQrOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#262626] hover:bg-[#333333] text-[#fafafa] border border-[#383838] transition-colors"
                    title="View QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR</span>
                  </button>
                </>
              )}
            </div>

            <CopyButton
              textToCopy={burnResult.secret}
              label="Copy Secret"
              copiedLabel="Secret Copied!"
              variant="prominent-green"
              className="flex-1 sm:flex-initial"
            />
          </div>
        )}

        {/* Warning Banner (Red) */}
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#ef4444]" />
          <div>
            <strong>⚠️ This secret is now destroyed on the server.</strong> Save it now before closing or leaving this tab.
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-xs text-[#a1a1a1] hover:text-[#fafafa] transition-colors cursor-pointer"
          >
            ← Create your own self-destructing secret
          </button>
        </div>

        {/* QR Modal for URLs */}
        {isUrl && (
          <QrCodeModal
            isOpen={isQrOpen}
            onClose={() => setIsQrOpen(false)}
            url={burnResult.secret}
          />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // STATE: READY (BEFORE REVEAL)
  // ─────────────────────────────────────────────
  return (
    <>
      <div className="w-full max-w-[520px] mx-auto bg-[#141414] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in">
        {/* Animated Lock Icon with subtle glow */}
        <div className="mx-auto w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-[#6366f1] animate-pulse">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-[#fafafa]">
            You've received a secure secret
          </h1>
          <p className="text-xs text-[#a1a1a1]">
            Encrypted with AES-256-GCM. Decrypt and burn upon access.
          </p>
        </div>

        {/* Hint if provided */}
        {hint && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start justify-center gap-2">
            <span>💡</span>
            <span><strong>Hint:</strong> {hint}</span>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-[#0a0a0a] border border-[#262626] rounded-xl text-xs text-left">
          <div className="space-y-1">
            <span className="text-[#a1a1a1] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Expires</span>
            </span>
            <p className="font-semibold text-[#fafafa]">Active link</p>
          </div>
          <div className="space-y-1">
            <span className="text-[#a1a1a1] flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#ef4444]" />
              <span>Views remaining</span>
            </span>
            <p className="font-semibold text-[#fafafa]">1 view (Burns now)</p>
          </div>
        </div>

        {/* Big Red Button with hover glow pulse */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setIsConfirmModalOpen(true)}
            aria-label="Reveal and destroy secret"
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-base font-semibold text-white bg-[#ef4444] hover:bg-red-600 transition-all duration-200 reveal-pulse shadow-xl shadow-red-500/25 active:scale-[0.98] hover:scale-[1.01] cursor-pointer"
          >
            <span>🔥</span>
            <span>Reveal and Destroy Secret</span>
          </button>
          <p className="text-xs text-[#a1a1a1]">
            This secret will be permanently deleted after you click.
          </p>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-[#262626] flex items-center justify-between text-xs text-[#a1a1a1]">
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-[#fafafa] transition-colors cursor-pointer"
          >
            Create secret instead →
          </button>
          {onNavigateAbout && (
            <button
              type="button"
              onClick={onNavigateAbout}
              className="hover:text-[#fafafa] transition-colors cursor-pointer"
            >
              How it works
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={() => executeBurn()}
        isLoading={state === 'burning'}
      />
    </>
  );
}
