import { useState, useRef, useEffect, useId } from 'react';
import {
  FileText,
  KeyRound,
  FileUp,
  Link2,
  ClipboardPaste,
  X,
  Eye,
  EyeOff,
  Clock,
  Flame,
  Shield,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  Info,
  Sliders,
  Check,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { CreateSecretResponse, SecretType } from '../types';
import { createSecret, VaultApiError, isDemoModeActive } from '../lib/api';
import { formatTTL } from '../lib/format';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import { evaluatePasswordStrength } from '../lib/passwordGenerator';
import { saveRecentSecret } from '../lib/recentSecrets';
import toast from 'react-hot-toast';

interface CreateSecretFormProps {
  onSuccess: (data: CreateSecretResponse) => void;
  onToast?: (message: string, type?: 'error' | 'warning' | 'info' | 'success') => void;
}

const PRESET_TTLS = [
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '1h', seconds: 3600 },
  { label: '6h', seconds: 21600 },
  { label: '24h', seconds: 86400 },
  { label: '7d', seconds: 604800 },
];

const PRESET_VIEWS = [1, 2, 3, 5, 10];

export function CreateSecretForm({ onSuccess }: CreateSecretFormProps) {
  // Secret Type
  const [secretType, setSecretType] = useState<SecretType>('text');

  // Secret Content
  const [secretContent, setSecretContent] = useState('');
  const [showPasswordMask, setShowPasswordMask] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  // Field 3: Hint
  const [hint, setHint] = useState('');

  // Field 4: TTL
  const [ttlSeconds, setTtlSeconds] = useState(3600); // 1 hour default
  const [isCustomTtl, setIsCustomTtl] = useState(false);
  const [customTtlNum, setCustomTtlNum] = useState(2);
  const [customTtlUnit, setCustomTtlUnit] = useState<'minutes' | 'hours' | 'days'>('hours');

  // Field 5: Max Views
  const [maxViews, setMaxViews] = useState(1);
  const [isCustomViews, setIsCustomViews] = useState(false);
  const [customViewsNum, setCustomViewsNum] = useState(4);

  // Field 6: Password Protection
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [protectionPassword, setProtectionPassword] = useState('');
  const [confirmProtectionPassword, setConfirmProtectionPassword] = useState('');
  const [showProtectionPassword, setShowProtectionPassword] = useState(false);

  // Field 7: Advanced Options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selfDestructSeconds, setSelfDestructSeconds] = useState(60);

  // Modals & UI States
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const secretInputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + K to focus secret input
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        secretInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Update custom TTL
  useEffect(() => {
    if (isCustomTtl) {
      let multiplier = 60;
      if (customTtlUnit === 'hours') multiplier = 3600;
      if (customTtlUnit === 'days') multiplier = 86400;
      setTtlSeconds(Math.max(60, customTtlNum * multiplier));
    }
  }, [isCustomTtl, customTtlNum, customTtlUnit]);

  // Update custom Views
  useEffect(() => {
    if (isCustomViews) {
      setMaxViews(Math.max(1, customViewsNum));
    }
  }, [isCustomViews, customViewsNum]);

  // Handle Paste
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSecretContent(text);
        setFieldError(null);
        toast.success('Pasted from clipboard');
      }
    } catch {
      toast.error('Unable to access clipboard. Please paste manually.');
    }
  };

  // Handle Clear
  const handleClearSecret = () => {
    setSecretContent('');
    setFileDetails(null);
    setFieldError(null);
  };

  // Handle File Upload
  const handleFileDrop = (file: File) => {
    if (file.size > 102400) {
      // 100KB limit
      toast.error('File size exceeds the 100KB limit for ephemeral secrets.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSecretContent(result);
      setFileDetails({
        name: file.name,
        size: file.size,
      });
      setFieldError(null);
      toast.success(`Loaded file: ${file.name}`);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  // Validation Checks
  const isPasswordMismatch =
    isPasswordProtected &&
    protectionPassword.length > 0 &&
    protectionPassword !== confirmProtectionPassword;

  const isEmailInvalid =
    notifyEmail.trim().length > 0 &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail.trim());

  const isSubmitDisabled =
    isLoading ||
    !secretContent.trim() ||
    (isPasswordProtected && (!protectionPassword || isPasswordMismatch)) ||
    isEmailInvalid;

  // Handle Submit
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!secretContent.trim()) {
      setFieldError('Secret content cannot be empty.');
      secretInputRef.current?.focus();
      return;
    }

    if (secretType === 'url') {
      try {
        new URL(secretContent.trim());
      } catch {
        setFieldError('Please enter a valid URL (including https://).');
        return;
      }
    }

    if (isPasswordProtected) {
      if (!protectionPassword) {
        setFieldError('Please enter a password or disable password protection.');
        return;
      }
      if (protectionPassword !== confirmProtectionPassword) {
        setFieldError('Protection passwords do not match.');
        return;
      }
    }

    setFieldError(null);
    setIsLoading(true);

    try {
      const response = await createSecret({
        secret: secretContent,
        ttl_seconds: ttlSeconds,
        max_views: maxViews,
        password: isPasswordProtected ? protectionPassword : undefined,
        hint: hint.trim() || undefined,
        secret_type: secretType,
        custom_slug: customSlug.trim() || undefined,
        notify_email: notifyEmail.trim() || undefined,
        webhook_url: webhookUrl.trim() || undefined,
        burn_after_seconds: selfDestructSeconds,
        file_name: fileDetails?.name,
        file_size: fileDetails?.size,
      });

      // Save to local recent secrets (no content stored)
      saveRecentSecret({
        id: response.id,
        view_url: response.view_url,
        created_at: new Date().toISOString(),
        expires_at: response.expires_at,
        secret_type: secretType,
        hint: hint.trim() || undefined,
        has_password: isPasswordProtected,
      });

      toast.success('Secret created successfully!');
      onSuccess(response);
    } catch (err: unknown) {
      if (err instanceof VaultApiError) {
        if (err.status === 400) {
          setFieldError(err.message || 'Invalid secret payload.');
        } else if (err.isNetworkError) {
          toast.error('Connection failed. Make sure API is running or use Demo Sandbox.', {
            id: 'net-err',
          });
        } else {
          toast.error(err.message || 'Failed to create secret.');
        }
      } else {
        toast.error('Unexpected error while creating secret.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = evaluatePasswordStrength(secretContent);
  const protectionStrength = evaluatePasswordStrength(protectionPassword);

  return (
    <div className="w-full space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-3.5 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm animate-pulse">
          <Shield className="w-3.5 h-3.5" />
          <span>End-to-End Encrypted</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#fafafa] dark:text-[#fafafa] light:text-slate-900">
          Share secrets that <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">self-destruct</span>
        </h1>

        <p className="text-sm sm:text-base text-[#a1a1a1] dark:text-[#a1a1a1] light:text-slate-600 max-w-md mx-auto leading-relaxed">
          Encrypted at rest. Burned after reading. Zero traces.
        </p>

        <div className="flex items-center justify-center gap-3 pt-1 text-xs text-[#a1a1a1] dark:text-[#a1a1a1] light:text-slate-500 font-mono">
          <span>AES-256-GCM</span>
          <span>•</span>
          <span>Zero-knowledge</span>
          <span>•</span>
          <span>Open source</span>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-[640px] mx-auto bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#262626] dark:border-[#262626] light:border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#262626] dark:border-[#262626] light:border-slate-200 text-xs font-medium text-[#a1a1a1] dark:text-[#a1a1a1] light:text-slate-500">
          <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
            <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Paste</span>
          </span>
          <span className="text-[#383838]">→</span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-[#262626] text-[#a1a1a1] flex items-center justify-center text-[10px]">2</span>
            <span>Configure</span>
          </span>
          <span className="text-[#383838]">→</span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-[#262626] text-[#a1a1a1] flex items-center justify-center text-[10px]">3</span>
            <span>Share</span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* FIELD 1: Secret Type Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wide uppercase text-[#a1a1a1]">
                Secret Type
              </label>
              <span className="text-[11px] text-[#a1a1a1] font-mono">
                Press <kbd className="px-1 py-0.5 bg-[#262626] rounded text-[10px]">⌘/Ctrl+K</kbd> to focus
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-100 rounded-xl border border-[#262626] dark:border-[#262626] light:border-slate-300">
              {[
                { type: 'text', label: 'Text', icon: FileText },
                { type: 'password', label: 'Password', icon: KeyRound },
                { type: 'file', label: 'File', icon: FileUp },
                { type: 'url', label: 'URL', icon: Link2 },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSecretType(type as SecretType);
                    setFieldError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    secretType === type
                      ? 'bg-[#1f1f1f] dark:bg-[#1f1f1f] light:bg-white text-white dark:text-white light:text-slate-900 shadow-sm border border-[#333333]'
                      : 'text-[#a1a1a1] hover:text-[#fafafa]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* FIELD 2: Secret Input depending on type */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="secret-content"
                className="text-sm font-medium text-[#fafafa] dark:text-[#fafafa] light:text-slate-900"
              >
                {secretType === 'password'
                  ? 'Password to share'
                  : secretType === 'file'
                  ? 'Attach file (max 100KB)'
                  : secretType === 'url'
                  ? 'Target Secret URL'
                  : 'Paste your secret'}
                <span className="text-[#ef4444] ml-1">*</span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                {secretType === 'text' && (
                  <button
                    type="button"
                    onClick={() => setShowLineNumbers(!showLineNumbers)}
                    className="text-[#a1a1a1] hover:text-[#fafafa] transition-colors cursor-pointer flex items-center gap-1"
                    title="Toggle line numbers"
                  >
                    <Hash className="w-3 h-3" />
                    <span>{showLineNumbers ? 'Hide lines' : 'Lines'}</span>
                  </button>
                )}

                {secretContent && (
                  <button
                    type="button"
                    onClick={handleClearSecret}
                    className="text-[#a1a1a1] hover:text-[#ef4444] transition-colors cursor-pointer flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              </div>
            </div>

            {/* Input renders according to Secret Type */}
            {secretType === 'text' ? (
              <div className="relative">
                <textarea
                  id="secret-content"
                  ref={secretInputRef as React.RefObject<HTMLTextAreaElement>}
                  required
                  rows={6}
                  value={secretContent}
                  onChange={(e) => {
                    setSecretContent(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="e.g. postgres://user:pass@host/db or private SSH key"
                  className={`w-full min-h-[140px] p-4 bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 border rounded-xl text-sm font-mono text-[#fafafa] dark:text-[#fafafa] light:text-slate-900 placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 transition-all resize-y ${
                    fieldError ? 'border-[#ef4444]' : 'border-[#262626] dark:border-[#262626] light:border-slate-300'
                  }`}
                />
              </div>
            ) : secretType === 'password' ? (
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    id="secret-content"
                    ref={secretInputRef as React.RefObject<HTMLInputElement>}
                    type={showPasswordMask ? 'text' : 'password'}
                    required
                    value={secretContent}
                    onChange={(e) => {
                      setSecretContent(e.target.value);
                      if (fieldError) setFieldError(null);
                    }}
                    placeholder="Enter or generate secret password"
                    className="w-full h-12 px-4 pr-20 bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 border border-[#262626] rounded-xl text-sm font-mono text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPasswordMask(!showPasswordMask)}
                      className="p-1.5 text-[#a1a1a1] hover:text-white"
                      title={showPasswordMask ? 'Hide' : 'Show'}
                    >
                      {showPasswordMask ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsGeneratorOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-md shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Gen</span>
                    </button>
                  </div>
                </div>

                {secretContent && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex-1 grid grid-cols-4 gap-1 h-1.5 bg-[#262626] rounded-full overflow-hidden">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full transition-all duration-300 ${
                            passwordStrength.score >= step ? passwordStrength.color : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#a1a1a1] font-medium">
                      Strength: {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>
            ) : secretType === 'file' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileDrop(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-[#262626] hover:border-[#383838] bg-[#0a0a0a]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileDrop(e.target.files[0]);
                    }
                  }}
                />
                <FileUp className="w-8 h-8 text-[#6366f1] mx-auto mb-2" />
                {fileDetails ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-emerald-400 flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>{fileDetails.name}</span>
                    </p>
                    <p className="text-xs text-[#a1a1a1] font-mono">
                      {(fileDetails.size / 1024).toFixed(1)} KB (Encoded in payload)
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileDetails(null);
                        setSecretContent('');
                      }}
                      className="text-xs text-[#ef4444] hover:underline pt-1 inline-block"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-[#fafafa] font-medium">
                      Drag & drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-[#a1a1a1] mt-1">
                      Max file size: 100KB (JSON, certificates, configs, keys, small documents)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // URL type
              <div className="relative">
                <input
                  id="secret-content"
                  ref={secretInputRef as React.RefObject<HTMLInputElement>}
                  type="url"
                  required
                  value={secretContent}
                  onChange={(e) => {
                    setSecretContent(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="https://internal.company.com/one-time-token?auth=xyz"
                  className="w-full h-12 px-4 bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 border border-[#262626] rounded-xl text-sm font-mono text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50"
                />
              </div>
            )}

            {/* Bottom Counter & Error */}
            <div className="flex items-center justify-between text-xs text-[#a1a1a1] pt-1">
              <div>
                {fieldError ? (
                  <span className="text-[#ef4444] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fieldError}</span>
                  </span>
                ) : (
                  <span>Never stored in browser storage</span>
                )}
              </div>
              <span className="font-mono tabular-nums">
                {secretContent.length} / 65536
              </span>
            </div>
          </div>

          {/* FIELD 3: Hint (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="secret-hint" className="text-xs font-semibold uppercase text-[#a1a1a1]">
              Recipient Hint (Optional)
            </label>
            <input
              id="secret-hint"
              type="text"
              maxLength={100}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. This is the production database password"
              className="w-full h-10 px-3.5 bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 border border-[#262626] rounded-lg text-sm text-[#fafafa] placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50"
            />
          </div>

          {/* FIELD 4 & 5: TTL & Max Views Segmented Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* TTL Expiry */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[#a1a1a1]">
                  <Clock className="w-3.5 h-3.5 text-[#6366f1]" />
                  <span>Expiry (TTL)</span>
                </label>
                <span className="text-xs text-indigo-400 font-medium">
                  {formatTTL(ttlSeconds)}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 p-1 bg-[#0a0a0a] rounded-xl border border-[#262626]">
                {PRESET_TTLS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setIsCustomTtl(false);
                      setTtlSeconds(preset.seconds);
                    }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      !isCustomTtl && ttlSeconds === preset.seconds
                        ? 'bg-[#6366f1] text-white shadow-sm'
                        : 'text-[#a1a1a1] hover:text-[#fafafa]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomTtl(true)}
                  className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    isCustomTtl
                      ? 'bg-[#6366f1] text-white shadow-sm'
                      : 'text-[#a1a1a1] hover:text-[#fafafa]'
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomTtl && (
                <div className="flex items-center gap-2 p-2 bg-[#0a0a0a] border border-[#262626] rounded-lg animate-in fade-in">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customTtlNum}
                    onChange={(e) => setCustomTtlNum(Math.max(1, Number(e.target.value)))}
                    className="w-20 px-2 py-1 bg-[#141414] border border-[#262626] rounded text-sm text-center text-[#fafafa]"
                  />
                  <select
                    value={customTtlUnit}
                    onChange={(e) => setCustomTtlUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                    className="flex-1 py-1 px-2 bg-[#141414] border border-[#262626] rounded text-xs text-[#fafafa]"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              )}
            </div>

            {/* Max Views */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[#a1a1a1]">
                  <Flame className="w-3.5 h-3.5 text-[#ef4444]" />
                  <span>Max Views</span>
                </label>
                {maxViews === 1 && (
                  <span className="text-[11px] text-amber-400 font-medium inline-flex items-center gap-1">
                    <Flame className="w-3 h-3 text-[#ef4444]" />
                    <span>Burns on 1st read</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-6 gap-1 p-1 bg-[#0a0a0a] rounded-xl border border-[#262626]">
                {PRESET_VIEWS.map((views) => (
                  <button
                    key={views}
                    type="button"
                    onClick={() => {
                      setIsCustomViews(false);
                      setMaxViews(views);
                    }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      !isCustomViews && maxViews === views
                        ? 'bg-[#6366f1] text-white shadow-sm'
                        : 'text-[#a1a1a1] hover:text-[#fafafa]'
                    }`}
                  >
                    {views}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomViews(true)}
                  className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    isCustomViews
                      ? 'bg-[#6366f1] text-white shadow-sm'
                      : 'text-[#a1a1a1] hover:text-[#fafafa]'
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomViews && (
                <div className="flex items-center gap-2 p-2 bg-[#0a0a0a] border border-[#262626] rounded-lg animate-in fade-in">
                  <span className="text-xs text-[#a1a1a1]">Views allowed:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={customViewsNum}
                    onChange={(e) => setCustomViewsNum(Math.max(1, Number(e.target.value)))}
                    className="w-20 px-2 py-1 bg-[#141414] border border-[#262626] rounded text-sm text-center text-[#fafafa]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* FIELD 6: Password Protection (Collapsible) */}
          <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#0d0d0d]">
            <button
              type="button"
              onClick={() => setIsPasswordProtected(!isPasswordProtected)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-[#141414] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Lock className={`w-4 h-4 ${isPasswordProtected ? 'text-amber-400' : 'text-[#a1a1a1]'}`} />
                <span className="text-xs sm:text-sm font-medium text-[#fafafa]">
                  Require password to unlock
                </span>
                {isPasswordProtected && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full">
                    Enabled
                  </span>
                )}
              </div>
              {isPasswordProtected ? (
                <ChevronUp className="w-4 h-4 text-[#a1a1a1]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#a1a1a1]" />
              )}
            </button>

            {isPasswordProtected && (
              <div className="p-4 pt-1 border-t border-[#262626] space-y-3 animate-in fade-in">
                <p className="text-xs text-[#a1a1a1]">
                  Recipient must enter this password to decrypt and reveal the secret.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type={showProtectionPassword ? 'text' : 'password'}
                      value={protectionPassword}
                      onChange={(e) => setProtectionPassword(e.target.value)}
                      placeholder="Unlock password"
                      className="w-full h-10 px-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-sm text-[#fafafa] placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProtectionPassword(!showProtectionPassword)}
                      className="absolute right-2.5 top-2.5 text-[#a1a1a1] hover:text-white"
                    >
                      {showProtectionPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <input
                    type="password"
                    value={confirmProtectionPassword}
                    onChange={(e) => setConfirmProtectionPassword(e.target.value)}
                    placeholder="Confirm password"
                    className={`w-full h-10 px-3 bg-[#0a0a0a] border rounded-lg text-sm text-[#fafafa] placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 ${
                      isPasswordMismatch ? 'border-[#ef4444]' : 'border-[#262626]'
                    }`}
                  />
                </div>

                {protectionPassword && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 grid grid-cols-4 gap-1 h-1.5 bg-[#262626] rounded-full overflow-hidden">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full transition-all duration-300 ${
                            protectionStrength.score >= step ? protectionStrength.color : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#a1a1a1]">
                      {isPasswordMismatch ? (
                        <span className="text-[#ef4444]">Passwords don't match</span>
                      ) : (
                        <span>Strength: {protectionStrength.label}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FIELD 7: Advanced Options (Collapsible) */}
          <div className="border border-[#262626] rounded-xl overflow-hidden bg-[#0d0d0d]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3.5 text-left hover:bg-[#141414] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-[#a1a1a1]" />
                <span className="text-xs sm:text-sm font-medium text-[#fafafa]">
                  Advanced Security & Delivery Options
                </span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-[#a1a1a1]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#a1a1a1]" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-4 pt-1 border-t border-[#262626] space-y-4 animate-in fade-in text-xs">
                {/* Custom Slug */}
                <div className="space-y-1">
                  <label htmlFor="custom-slug" className="text-[#a1a1a1] font-medium">
                    Custom Link Slug (optional)
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-[#1a1a1a] border border-r-0 border-[#262626] rounded-l-lg text-[#a1a1a1] font-mono text-xs">
                      /view/
                    </span>
                    <input
                      id="custom-slug"
                      type="text"
                      maxLength={32}
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                      placeholder="my-confidential-token"
                      className="flex-1 h-9 px-3 bg-[#0a0a0a] border border-[#262626] rounded-r-lg text-xs font-mono text-[#fafafa] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                    />
                  </div>
                </div>

                {/* Email notification */}
                <div className="space-y-1">
                  <label htmlFor="notify-email" className="text-[#a1a1a1] font-medium">
                    Notify me when secret is burned (optional)
                  </label>
                  <input
                    id="notify-email"
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="engineer@company.com"
                    className="w-full h-9 px-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-xs text-[#fafafa] placeholder-[#555555] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  />
                  {isEmailInvalid && (
                    <p className="text-[#ef4444] text-[11px]">Please enter a valid email format</p>
                  )}
                </div>

                {/* Webhook */}
                <div className="space-y-1">
                  <label htmlFor="webhook-url" className="text-[#a1a1a1] font-medium">
                    Webhook notification URL (POST on burn)
                  </label>
                  <input
                    id="webhook-url"
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://api.mycompany.com/vault-burn-audit"
                    className="w-full h-9 px-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-xs font-mono text-[#fafafa] placeholder-[#555555] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                  />
                </div>

                {/* Self-destruct after viewing seconds */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="self-destruct" className="text-[#a1a1a1] font-medium">
                      Recipient auto-hide countdown
                    </label>
                    <span className="font-mono text-indigo-400 font-semibold">
                      {selfDestructSeconds}s
                    </span>
                  </div>
                  <input
                    id="self-destruct"
                    type="range"
                    min={15}
                    max={300}
                    step={15}
                    value={selfDestructSeconds}
                    onChange={(e) => setSelfDestructSeconds(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              aria-label="Create secure link"
              className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 active:scale-[0.99] hover:scale-[1.01] shadow-xl shadow-indigo-500/25 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Encrypting with AES-256-GCM…</span>
                </>
              ) : (
                <>
                  <span>🔐</span>
                  <span>Create Secure Link</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-[#a1a1a1] mt-2">
              By creating, you acknowledge this secret is burned upon redemption.
            </p>
          </div>
        </form>
      </div>

      {/* Password Generator Modal */}
      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onSelectPassword={(pwd) => {
          setSecretContent(pwd);
          setFieldError(null);
        }}
      />
    </div>
  );
}
