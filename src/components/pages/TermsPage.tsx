import { FileText, AlertCircle, Scale, CheckCircle } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-6 px-4 animate-in fade-in duration-200">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <FileText className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#fafafa]">
          Terms of Service
        </h1>
        <p className="text-xs text-[#a1a1a1]">
          Last updated: September 2026
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-[#a1a1a1] leading-relaxed">
        <section className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
          <h2 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400" />
            <span>1. Acceptance of Terms</span>
          </h2>
          <p>
            By accessing or using Ephemeral Secret Vault ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
          <h2 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>2. Acceptable Use Policy</span>
          </h2>
          <p>
            You agree not to use the Service to transmit:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li>Malicious software, trojans, ransomware, or exploits.</li>
            <li>Content that promotes illegal activities, harassment, hate speech, or child sexual abuse material (CSAM).</li>
            <li>Stolen intellectual property or unauthorized trade secrets.</li>
            <li>Denial of service (DoS) attempts against the vault infrastructure or API endpoints.</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
          <h2 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>3. No Warranty & Limitation of Liability</span>
          </h2>
          <p>
            The Service is provided strictly <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> without warranties of any kind. Because secrets are automatically destroyed upon revelation or expiration, the Service cannot be used as an archival storage service. Under no circumstances shall the operators be liable for lost data, expired secrets, or transmission interruptions.
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-3">
          <h2 className="text-base font-semibold text-[#fafafa]">
            4. Changes to Service
          </h2>
          <p>
            We reserve the right to modify, suspend, or discontinue any aspect of the service at any time to enhance security protocols, upgrade encryption suites, or perform scheduled maintenance.
          </p>
        </section>
      </div>
    </div>
  );
}
