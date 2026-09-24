import { useState, useEffect } from 'react';
import { X, RefreshCw, Check, KeyRound } from 'lucide-react';
import {
  generatePassword,
  DEFAULT_PASSWORD_OPTIONS,
  PasswordGeneratorOptions,
  evaluatePasswordStrength,
} from '../lib/passwordGenerator';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword: (password: string) => void;
}

export function PasswordGeneratorModal({
  isOpen,
  onClose,
  onSelectPassword,
}: PasswordGeneratorModalProps) {
  const [options, setOptions] = useState<PasswordGeneratorOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      regenerate();
    }
  }, [isOpen, options]);

  const regenerate = () => {
    const pwd = generatePassword(options);
    setPassword(pwd);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
    }
  };

  const handleUse = () => {
    onSelectPassword(password);
    onClose();
  };

  if (!isOpen) return null;

  const strength = evaluatePasswordStrength(password);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#262626] dark:border-[#262626] light:border-slate-200 rounded-2xl p-6 shadow-2xl z-10 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626] dark:border-[#262626] light:border-slate-200">
          <div className="flex items-center gap-2 text-[#fafafa] dark:text-[#fafafa] light:text-slate-900 font-semibold">
            <KeyRound className="w-5 h-5 text-[#6366f1]" />
            <h2 id="password-modal-title" className="text-lg">Random Password Generator</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close generator modal"
            className="p-1 rounded-lg text-[#a1a1a1] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Generated Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 p-3 bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 border border-[#262626] dark:border-[#262626] light:border-slate-200 rounded-xl">
            <span className="font-mono text-base break-all text-[#fafafa] dark:text-[#fafafa] light:text-slate-900 tracking-wider">
              {password}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={regenerate}
                title="Regenerate"
                aria-label="Regenerate password"
                className="p-2 text-[#a1a1a1] hover:text-white hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy password"
                aria-label="Copy password to clipboard"
                className="p-2 text-[#a1a1a1] hover:text-white hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <span className="text-xs font-semibold">Copy</span>}
              </button>
            </div>
          </div>

          {/* Strength Bar */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 grid grid-cols-4 gap-1.5 h-1.5 bg-[#262626] rounded-full overflow-hidden">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-full transition-all duration-300 ${
                    strength.score >= step ? strength.color : 'bg-transparent'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-[#a1a1a1] font-medium shrink-0">
              {strength.label}
            </span>
          </div>
        </div>

        {/* Length Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="pwd-length" className="text-[#a1a1a1]">Length</label>
            <span className="font-mono font-semibold text-[#fafafa] dark:text-[#fafafa] light:text-slate-900">
              {options.length}
            </span>
          </div>
          <input
            id="pwd-length"
            type="range"
            min={8}
            max={64}
            value={options.length}
            onChange={(e) => setOptions({ ...options, length: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Charset Checkboxes */}
        <div className="grid grid-cols-2 gap-2.5 pt-1 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-[#fafafa] dark:text-[#fafafa] light:text-slate-700">
            <input
              type="checkbox"
              checked={options.includeUppercase}
              onChange={(e) => setOptions({ ...options, includeUppercase: e.target.checked })}
              className="accent-indigo-500 rounded"
            />
            <span>Uppercase (A-Z)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[#fafafa] dark:text-[#fafafa] light:text-slate-700">
            <input
              type="checkbox"
              checked={options.includeLowercase}
              onChange={(e) => setOptions({ ...options, includeLowercase: e.target.checked })}
              className="accent-indigo-500 rounded"
            />
            <span>Lowercase (a-z)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[#fafafa] dark:text-[#fafafa] light:text-slate-700">
            <input
              type="checkbox"
              checked={options.includeNumbers}
              onChange={(e) => setOptions({ ...options, includeNumbers: e.target.checked })}
              className="accent-indigo-500 rounded"
            />
            <span>Numbers (0-9)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-[#fafafa] dark:text-[#fafafa] light:text-slate-700">
            <input
              type="checkbox"
              checked={options.includeSymbols}
              onChange={(e) => setOptions({ ...options, includeSymbols: e.target.checked })}
              className="accent-indigo-500 rounded"
            />
            <span>Symbols (!@#$)</span>
          </label>

          <label className="col-span-2 flex items-center gap-2 cursor-pointer text-[#a1a1a1] text-xs">
            <input
              type="checkbox"
              checked={options.excludeAmbiguous}
              onChange={(e) => setOptions({ ...options, excludeAmbiguous: e.target.checked })}
              className="accent-indigo-500 rounded"
            />
            <span>Exclude ambiguous characters (0, O, l, 1, etc.)</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm text-[#a1a1a1] hover:text-white bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUse}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#6366f1] hover:bg-[#4f46e5] shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
          >
            Use Password
          </button>
        </div>
      </div>
    </div>
  );
}
