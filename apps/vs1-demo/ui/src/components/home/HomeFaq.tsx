import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { GoldWord } from '../providers/SectionHeading';

// ─── S8 — FAQ · Figma 1641:1196 ─────────────────────────────────────────────
// "What you're probably wondering." A centered, borderless disclosure list
// (single-open) over the page's recurring promises: free, not-legal-advice,
// vetting, cost, data, coverage. Token-based, mirrors the Compass Accordion
// motion (height auto, chevron rotates) in the marketing divider-list style.

type QA = { q: string; a: string };

const FAQS: QA[] = [
  {
    q: 'Is the assessment really free?',
    a: 'Yes. No account, no credit card. You get a structured risk map at the end. Registering after — to keep it, to match with providers, to receive alerts — is the optional next step.',
  },
  {
    q: 'Are you giving me legal advice?',
    a: "No. CompliHub maps obligations and surfaces what is likely to apply to your operation — it is not legal advice. When a matter needs a binding opinion, we connect you to a Verified Partner who can give one.",
  },
  {
    q: 'How are Verified Partners vetted?',
    a: 'Every partner is reviewed by us on domain coverage, response time, and named real-world outcomes — not a self-listed directory. Each engagement is contractual, with shared accountability for the matter.',
  },
  {
    q: 'What does an engagement cost?',
    a: 'Each Verified Partner publishes a fixed estimate before you accept — no discovery calls just to learn the price. You see the range and scope up front, and approve it before any work begins.',
  },
  {
    q: 'How is my data handled?',
    a: 'The assessment runs in your browser and needs no account. If you register, your dossier is stored under EU data-protection rules, encrypted, and never sold or shared without your instruction.',
  },
  {
    q: "What if my market isn't covered yet?",
    a: 'Tell us where you operate. We add markets continuously, and early registrants help set the priority — we will alert you the moment your market goes live.',
  },
];

function FaqRow({ qa, open, onToggle }: { qa: QA; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-stroke-subtle">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-4 py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
      >
        <span className="flex-1 text-[18px] font-bold text-fg">{qa.q}</span>
        <ChevronDown
          size={22}
          className={`shrink-0 text-fg-secondary transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="max-w-[680px] pb-6 text-[15px] leading-relaxed text-fg-secondary">{qa.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HomeFaq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="bg-surface py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1320px] px-4 md:px-6 lg:px-10">
        {/* Header (centered) */}
        <motion.div
          className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-brand">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            Frequently asked
          </span>
          <h2 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-fg sm:text-[2.75rem]">
            What you&rsquo;re <GoldWord>probably</GoldWord> wondering.
          </h2>
        </motion.div>

        {/* List */}
        <motion.div
          className="mx-auto mt-12 max-w-[760px] border-t border-stroke-subtle"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          {FAQS.map((qa, i) => (
            <FaqRow key={qa.q} qa={qa} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
