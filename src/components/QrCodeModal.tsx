import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Copy, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export function QrCodeModal({ isOpen, onClose, url }: QrCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const downloadQrCode = () => {
    try {
      const canvas = qrRef.current?.querySelector('canvas');
      if (!canvas) {
        toast.error('Unable to export QR code');
        return;
      }
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'ephemeral-vault-qr.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('QR Code saved as PNG');
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#262626] dark:border-[#262626] light:border-slate-200 rounded-2xl p-6 shadow-2xl z-10 space-y-5 animate-in zoom-in-95 text-center">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626] dark:border-[#262626] light:border-slate-200">
          <div className="flex items-center gap-2 text-[#fafafa] dark:text-[#fafafa] light:text-slate-900 font-semibold">
            <QrCode className="w-5 h-5 text-[#6366f1]" />
            <h2 id="qr-modal-title" className="text-base font-semibold">Scan Secret QR</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR modal"
            className="p-1 rounded-lg text-[#a1a1a1] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#a1a1a1] dark:text-[#a1a1a1] light:text-slate-600">
          Scan with a mobile camera to open and burn this secret.
        </p>

        {/* QR Canvas */}
        <div
          ref={qrRef}
          className="p-4 bg-white rounded-xl mx-auto inline-block shadow-inner"
        >
          <QRCodeCanvas
            value={url}
            size={200}
            level="M"
            marginSize={2}
          />
        </div>

        <p className="text-[11px] font-mono break-all text-[#a1a1a1] px-2">
          {url}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={copyUrl}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#262626] hover:bg-[#333333] text-[#fafafa] border border-[#383838] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Link</span>
          </button>

          <button
            type="button"
            onClick={downloadQrCode}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
