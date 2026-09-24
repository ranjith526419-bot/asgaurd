import { Ghost, ArrowLeft, PlusCircle } from 'lucide-react';

interface NotFoundPageProps {
  onNavigateHome: () => void;
}

export function NotFoundPage({ onNavigateHome }: NotFoundPageProps) {
  return (
    <div className="w-full max-w-md mx-auto text-center py-12 px-4 space-y-6 animate-in fade-in">
      <div className="mx-auto w-20 h-20 rounded-full bg-neutral-900 border border-[#262626] flex items-center justify-center text-[#a1a1a1]">
        <Ghost className="w-10 h-10 animate-bounce" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#fafafa]">
          404 — Page Not Found
        </h1>
        <p className="text-sm text-[#a1a1a1] leading-relaxed">
          The page or vault route you requested does not exist or has already burned out of existence.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onNavigateHome}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#6366f1] hover:bg-[#4f46e5] shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <button
          type="button"
          onClick={onNavigateHome}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-[#a1a1a1] hover:text-[#fafafa] bg-[#1f1f1f] hover:bg-[#2b2b2b] border border-[#2e2e2e] transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Secret</span>
        </button>
      </div>
    </div>
  );
}
