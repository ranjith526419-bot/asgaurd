import { Shield, Key, Flame, Lock, CheckCircle2, XCircle, ArrowRight, Server, Cpu, Database, Eye } from 'lucide-react';

interface AboutPageProps {
  onNavigateHome: () => void;
}

export function AboutPage({ onNavigateHome }: AboutPageProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-16 py-6 px-4 animate-in fade-in duration-200">
      {/* Hero */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Shield className="w-3.5 h-3.5" />
          <span>Security Architecture & Threat Model</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#fafafa]">
          How the Vault Works
        </h1>

        <p className="text-sm sm:text-base text-[#a1a1a1] leading-relaxed">
          Traditional channels leave unencrypted secrets in chat backups, email archives, and server logs.
          Ephemeral Vault destroys your data the second it is consumed.
        </p>
      </div>

      {/* 3-Step Visual Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] relative space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl font-bold">
            1
          </div>
          <h3 className="text-lg font-semibold text-[#fafafa] flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Encrypted at Rest</span>
          </h3>
          <p className="text-xs sm:text-sm text-[#a1a1a1] leading-relaxed">
            You paste a secret. The backend encrypts it using <strong>AES-256-GCM</strong> with an ephemeral initialization vector (IV) and cryptographic authentication tag.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] relative space-y-3">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xl font-bold">
            2
          </div>
          <h3 className="text-lg font-semibold text-[#fafafa] flex items-center gap-2">
            <Key className="w-4 h-4 text-violet-400" />
            <span>One-Time Link</span>
          </h3>
          <p className="text-xs sm:text-sm text-[#a1a1a1] leading-relaxed">
            You receive a single-use URL. Share this link through WhatsApp, Slack, Signal, or email. The link can never be read a second time.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] relative space-y-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[#ef4444] text-xl font-bold">
            3
          </div>
          <h3 className="text-lg font-semibold text-[#fafafa] flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#ef4444]" />
            <span>Burned Forever</span>
          </h3>
          <p className="text-xs sm:text-sm text-[#a1a1a1] leading-relaxed">
            The recipient clicks Reveal. The secret payload is decrypted, sent over TLS, and instantly expunged from the database and memory.
          </p>
        </div>
      </div>

      {/* Security Deep Dive */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-[#262626] space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-[#fafafa]">
            Cryptographic Guarantees
          </h2>
          <p className="text-xs sm:text-sm text-[#a1a1a1]">
            Our zero-knowledge principles and tamper-resistant pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#262626] space-y-2">
            <div className="font-semibold text-[#fafafa] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>AES-256-GCM Encryption</span>
            </div>
            <p className="text-[#a1a1a1] text-xs leading-relaxed">
              Galois/Counter Mode provides both confidentiality and built-in message authentication. Any alteration to encrypted bytes causes decryption to abort.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#262626] space-y-2">
            <div className="font-semibold text-[#fafafa] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Unique IV Per Secret</span>
            </div>
            <p className="text-[#a1a1a1] text-xs leading-relaxed">
              Every secret uses a freshly generated 96-bit cryptographic nonce, making replay attacks and pattern frequency analysis statistically impossible.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#262626] space-y-2">
            <div className="font-semibold text-[#fafafa] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Zero Plaintext on Disk</span>
            </div>
            <p className="text-[#a1a1a1] text-xs leading-relaxed">
              The application runtime never writes unencrypted passwords or keys to persistent disk files or crash logs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[#262626] space-y-2">
            <div className="font-semibold text-[#fafafa] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Hard Memory Scrubbing</span>
            </div>
            <p className="text-[#a1a1a1] text-xs leading-relaxed">
              Upon burning or TTL expiration, internal memory references are immediately cleared, and database records are deleted with zero audit log trails.
            </p>
          </div>
        </div>
      </div>

      {/* Threat Model Diagram */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-[#262626] space-y-6">
        <h2 className="text-xl font-bold text-[#fafafa]">Threat Model Breakdown</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#0a0a0a] rounded-xl border border-[#262626] space-y-2">
            <span className="text-amber-400 font-semibold uppercase text-[10px]">Threat 1</span>
            <p className="text-sm font-semibold text-[#fafafa]">Interception in Transit</p>
            <p className="text-[#a1a1a1] leading-relaxed">
              Protected by TLS 1.3 encryption. Eavesdroppers only see an opaque random link identifier, never the secret contents.
            </p>
          </div>

          <div className="p-4 bg-[#0a0a0a] rounded-xl border border-[#262626] space-y-2">
            <span className="text-amber-400 font-semibold uppercase text-[10px]">Threat 2</span>
            <p className="text-sm font-semibold text-[#fafafa]">Database Breach</p>
            <p className="text-[#a1a1a1] leading-relaxed">
              If the database snapshot is stolen, stored values are ciphertexts with isolated master keys. Expired secrets are already gone.
            </p>
          </div>

          <div className="p-4 bg-[#0a0a0a] rounded-xl border border-[#262626] space-y-2">
            <span className="text-amber-400 font-semibold uppercase text-[10px]">Threat 3</span>
            <p className="text-sm font-semibold text-[#fafafa]">Shoulder Surfing</p>
            <p className="text-[#a1a1a1] leading-relaxed">
              Recipient view features a one-click shoulder privacy toggle and an automated 60-second blur timer to avoid accidental exposure.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-[#262626] space-y-6 overflow-x-auto">
        <h2 className="text-xl font-bold text-[#fafafa]">
          Vault vs. Other Channels
        </h2>

        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#262626] text-[#a1a1a1]">
              <th className="pb-3 font-semibold">Security Feature</th>
              <th className="pb-3 font-semibold text-indigo-400">Ephemeral Vault</th>
              <th className="pb-3 font-semibold">Slack / Teams</th>
              <th className="pb-3 font-semibold">Email</th>
              <th className="pb-3 font-semibold">Pastebin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            <tr>
              <td className="py-3 font-medium text-[#fafafa]">Burns after 1 read</td>
              <td className="py-3 text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Yes
              </td>
              <td className="py-3 text-[#a1a1a1]">No (stored forever)</td>
              <td className="py-3 text-[#a1a1a1]">No (inbox archives)</td>
              <td className="py-3 text-[#a1a1a1]">No</td>
            </tr>
            <tr>
              <td className="py-3 font-medium text-[#fafafa]">Zero logs retained</td>
              <td className="py-3 text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Yes
              </td>
              <td className="py-3 text-red-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> Audit logged
              </td>
              <td className="py-3 text-red-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> Relayed & cached
              </td>
              <td className="py-3 text-red-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> Public index
              </td>
            </tr>
            <tr>
              <td className="py-3 font-medium text-[#fafafa]">Password lock option</td>
              <td className="py-3 text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Yes
              </td>
              <td className="py-3 text-[#a1a1a1]">No</td>
              <td className="py-3 text-[#a1a1a1]">No</td>
              <td className="py-3 text-[#a1a1a1]">Paid only</td>
            </tr>
            <tr>
              <td className="py-3 font-medium text-[#fafafa]">Custom TTL Expiry</td>
              <td className="py-3 text-emerald-400 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> 5m - 7 days
              </td>
              <td className="py-3 text-[#a1a1a1]">Admin retention</td>
              <td className="py-3 text-[#a1a1a1]">Never expires</td>
              <td className="py-3 text-[#a1a1a1]">Configurable</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Call to action */}
      <div className="text-center pt-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-[#6366f1] hover:bg-[#4f46e5] shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <span>Create a Secret Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
