import { ShieldCheck, EyeOff, ServerOff, Clock, FileCheck } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-6 px-4 animate-in fade-in duration-200">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Knowledge Privacy Commitment</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#fafafa]">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#a1a1a1]">
          Last updated: September 2026 • Effective immediately
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-[#a1a1a1] leading-relaxed">
        <section className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
          <h2 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-emerald-400" />
            <span>1. What We Collect (And What We Don't)</span>
          </h2>
          <p>
            The core architecture of Ephemeral Vault is designed so that we never learn the content of your secrets or your identity:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li><strong>No Plaintext:</strong> Your secret text, passwords, or files are encrypted immediately upon receipt.</li>
            <li><strong>No IP Logging:</strong> We do not log client IP addresses, browser fingerprints, or referrer headers in persistent access logs.</li>
            <li><strong>No User Accounts:</strong> No registration, phone number, email address (unless you opt-in for delivery notification), or tracking cookies are required.</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
          <h2 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
            <ServerOff className="w-4 h-4 text-indigo-400" />
            <span>2. Data Retention & The "Burn" Cycle</span>
          </h2>
          <p>
            Data retention is strictly ephemeral:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li><strong>Single-use destruction:</strong> The moment a recipient confirms revelation, the database row is hard-deleted. We do not use "soft deletes" or archive tables.</li>
            <li><strong>Automatic TTL deletion:</strong> If a link is never opened, background pruning automatically deletes all expired records once the TTL timestamp passes.</li>
            <li><strong>Zero Backup Archival:</strong> Ephemeral secrets are stored in high-performance transient stores that are excluded from long-term database backups.</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
          <h2 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>3. Local Storage Policy</span>
          </h2>
          <p>
            Any feature labeled "Recent Secret Links" stores only the random link identifier and expiration timestamp locally in your browser's <code className="px-1.5 py-0.5 rounded bg-[#262626] text-[#fafafa]">localStorage</code>.
            The secret content itself is never written to client storage, and you can clear this local history at any time with a single click.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
          <h2 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-sky-400" />
            <span>4. Sub-processors and Third Parties</span>
          </h2>
          <p>
            We do not sell, rent, or monetize your data. We do not include third-party marketing tags, Google Analytics, Facebook pixels, or tracking beacons. All operations are self-contained.
          </p>
        </section>
      </div>
    </div>
  );
}
