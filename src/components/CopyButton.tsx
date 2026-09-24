import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  copiedLabel?: string;
  variant?: 'primary' | 'prominent-green' | 'subtle';
  className?: string;
  ariaLabel?: string;
}

export function CopyButton({
  textToCopy,
  label = 'Copy',
  copiedLabel = 'Copied!',
  variant = 'subtle',
  className = '',
  ariaLabel = 'Copy to clipboard',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!textToCopy) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  let variantStyles = 'bg-[#262626] hover:bg-[#333333] text-[#fafafa] border border-[#383838]';
  if (variant === 'prominent-green') {
    variantStyles = 'bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold shadow-lg shadow-green-500/20';
  } else if (variant === 'primary') {
    variantStyles = 'bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium shadow-md shadow-indigo-500/20';
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-150 active:scale-[0.98] hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50 cursor-pointer ${variantStyles} ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {copied ? (
          <Check className="w-4 h-4 text-inherit transition-transform duration-200 scale-110" />
        ) : (
          <Copy className="w-4 h-4 text-inherit transition-transform duration-200 scale-100" />
        )}
      </div>
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
