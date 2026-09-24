import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, isLoading = false }: ConfirmModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setAcknowledged(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
    >
      <div className="fixed inset-0" onClick={isLoading ? undefined : onClose} />

      <div className="relative w-full max-w-md bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#262626] dark:border-[#262626] light:border-slate-200 rounded-2xl p-6 shadow-2xl z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl shrink-0 text-[#ef4444]">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 id="confirm-modal-title" className="text-lg font-bold tracking-tight text-[#fafafa] dark:text-[#fafafa] light:text-slate-900">
              Are you sure?
            </h2>
            <p id="confirm-modal-desc" className="text-xs sm:text-sm text-[#a1a1a1] dark:text-[#a1a1a1] light:text-slate-600 leading-relaxed">
              This secret will be permanently destroyed after you click Reveal. It cannot be recovered. Make sure you are ready to save it.
            </p>
          </div>
        </div>

        {/* Required Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#0a0a0a] border border-[#262626] text-xs text-[#fafafa] cursor-pointer hover:border-[#383838] transition-colors select-none">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 accent-red-500 rounded cursor-pointer"
          />
          <span>I understand this cannot be undone and the secret will be burned forever.</span>
        </label>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-[#a1a1a1] hover:text-[#fafafa] bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2e2e2e] transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={!acknowledged || isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#ef4444] hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Burning Secret…</span>
              </>
            ) : (
              <span>Yes, Reveal Secret</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
