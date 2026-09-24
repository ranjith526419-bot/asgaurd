import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => {
        let borderClass = 'border-[#ef4444]/40 bg-[#1c1212] text-red-200';
        let Icon = AlertCircle;

        if (t.type === 'warning') {
          borderClass = 'border-amber-500/40 bg-[#1c1810] text-amber-200';
          Icon = AlertTriangle;
        } else if (t.type === 'success') {
          borderClass = 'border-green-500/40 bg-[#0f1c12] text-green-200';
          Icon = CheckCircle2;
        } else if (t.type === 'info') {
          borderClass = 'border-indigo-500/40 bg-[#12141e] text-indigo-200';
          Icon = Info;
        }

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-2 ${borderClass}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium leading-snug">
              <p>{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  onClick={t.action.onClick}
                  className="mt-2 text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss toast"
              className="text-inherit opacity-70 hover:opacity-100 transition-opacity p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
