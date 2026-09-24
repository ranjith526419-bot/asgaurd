import { useState } from 'react';
import { HelpCircle, ChevronDown, Search, ArrowRight } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'General' | 'Security' | 'Usage';
}

const FAQS: FaqItem[] = [
  {
    id: 'how-long',
    question: 'How long do secrets last?',
    answer:
      'You choose the lifespan (TTL) when creating the secret: from 5 minutes up to 7 days (or any custom duration). Regardless of TTL, once the secret reaches its maximum view count (default: 1 view), it is immediately and permanently expunged from the database.',
    category: 'General',
  },
  {
    id: 'retrieve-after-read',
    question: 'Can I retrieve a secret after it is read?',
    answer:
      'No. This is mathematically and architecturally impossible. Once the secret is revealed, the database row is deleted and internal memory pointers are wiped. Neither you nor our engineers can recover it.',
    category: 'Security',
  },
  {
    id: 'close-browser',
    question: 'What happens if I close the browser without revealing?',
    answer:
      'The secret remains safely encrypted on the server until someone confirms revelation in the UI or until the TTL expiration timer lapses. Merely opening the URL does not burn the secret — only clicking "Reveal and Destroy Secret" triggers redemption.',
    category: 'Usage',
  },
  {
    id: 'is-encrypted',
    question: 'Is my secret encrypted?',
    answer:
      'Yes. Secrets are encrypted using AES-256-GCM with a unique 96-bit initialization vector (IV) per record. Additionally, you can specify an optional unlock password, adding a second tier of protection.',
    category: 'Security',
  },
  {
    id: 'can-service-read',
    question: 'Can you (the service) read my secrets?',
    answer:
      'We do not log secret payloads or IP addresses, and we do not maintain backups of encrypted secrets. If password protection is enabled, even a server administrator cannot decrypt your secret without your password.',
    category: 'Security',
  },
  {
    id: 'lose-link',
    question: 'What if I lose the link?',
    answer:
      'If you lose the link before sharing it, the secret cannot be retrieved. You will need to generate a new secret. The unread secret will simply expire and delete itself when its TTL timer elapses.',
    category: 'Usage',
  },
  {
    id: 'send-files',
    question: 'Can I send files?',
    answer:
      'Yes! Ephemeral Vault supports file attachments up to 100KB (ideal for SSH private keys, TLS certificates, environment variable files, credentials, and JSON configurations).',
    category: 'Usage',
  },
  {
    id: 'works-on-mobile',
    question: 'Does it work on mobile?',
    answer:
      'Yes, the interface is completely responsive. You can also generate and display a QR code from the share dialog to easily open and burn secrets on mobile devices.',
    category: 'General',
  },
  {
    id: 'is-there-an-api',
    question: 'Is there an API?',
    answer:
      'Yes. You can integrate directly using standard REST endpoints: POST /api/secret to generate links and POST /api/secret/:id/burn to consume secrets. Ideal for CI/CD pipelines and deployment scripts.',
    category: 'Usage',
  },
  {
    id: 'is-it-free',
    question: 'Is it free?',
    answer:
      'Ephemeral Vault is 100% free and open-source. There are no tracking scripts, third-party analytics cookies, or hidden subscription gates.',
    category: 'General',
  },
];

interface FaqPageProps {
  onNavigateHome: () => void;
}

export function FaqPage({ onNavigateHome }: FaqPageProps) {
  const [search, setSearch] = useState('');
  const [openIds, setOpenIds] = useState<string[]>(['how-long', 'retrieve-after-read']);

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = FAQS.filter(
    (item) =>
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-10 py-6 px-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Knowledge Base</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#fafafa]">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-[#a1a1a1] max-w-lg mx-auto">
          Everything you need to know about secret expiration, encryption, and burn policies.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#a1a1a1] absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions or keywords (e.g. encryption, files, TTL)..."
          className="w-full h-11 pl-10 pr-4 bg-[#141414] border border-[#262626] rounded-xl text-sm text-[#fafafa] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Accordion list */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center text-[#a1a1a1] bg-[#141414] border border-[#262626] rounded-2xl">
            No matching questions found.
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden transition-all duration-150"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-medium text-[#fafafa] pr-4">
                    {faq.question}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-[#262626] text-[#a1a1a1]">
                      {faq.category}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#a1a1a1] transition-transform duration-200 ${
                        isOpen ? 'transform rotate-180 text-indigo-400' : ''
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-[#1f1f1f] text-xs sm:text-sm text-[#a1a1a1] leading-relaxed animate-in fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer CTA */}
      <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] text-center space-y-3">
        <h3 className="text-base font-semibold text-[#fafafa]">Still have questions?</h3>
        <p className="text-xs text-[#a1a1a1]">
          Ephemeral Vault is built to be simple, self-explanatory, and zero-trust.
        </p>
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6366f1] hover:bg-[#4f46e5] transition-all cursor-pointer"
        >
          <span>Create a secret now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
