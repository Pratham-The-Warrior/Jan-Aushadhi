// ============================================================
// Home Page — search-first landing
// Hero search → live example saving → live network stats →
// how it works → why generics are safe.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ShieldCheck, FlaskConical, Building2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import usePlatformStats from '../hooks/usePlatformStats';
import { searchMedicines } from '../services/api';
import { formatINR } from '../utils/format';

const EXAMPLES = ['Telma 40', 'Pan 40', 'Dolo 650', 'Glycomet 500'];

// Animated counter
function AnimatedNumber({ target }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const duration = 1400;
        const step = (timestamp) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(progress === 1 ? target : Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString('en-IN')}</span>;
}

/** A real brand → generic comparison from the live catalogue. */
function useExampleSaving(query) {
  const [example, setExample] = useState(null);
  useEffect(() => {
    let cancelled = false;
    searchMedicines(query)
      .then((results) => {
        const hit = (results || []).find((r) => r.generic?.match_tier === 'EXACT_MATCH' && r.savings?.percentage > 0);
        if (!cancelled && hit) setExample(hit);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [query]);
  return example;
}

function HeroSearch() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const go = (q) => {
    const term = (q ?? value).trim();
    if (term) navigate(`/discovery?q=${encodeURIComponent(term)}`);
  };

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); go(); }}
        className="flex items-center bg-surface-lowest rounded-xl clinical-shadow ghost-border p-1.5 focus-within:border-primary/50"
        role="search"
      >
        <Search className="w-5 h-5 text-on-surface/40 ml-3 shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type your medicine, e.g. Telma 40"
          className="flex-1 min-w-0 py-3 px-3 bg-transparent outline-none text-base text-on-surface placeholder-on-surface/40"
          aria-label="Search for a medicine"
        />
        <button type="submit" className="btn-primary py-3 px-5 md:px-6 text-base font-semibold shrink-0">Compare</button>
      </form>
      <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
        <span className="text-on-surface/50">Try:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => go(ex)} className="px-3 py-1 rounded-full bg-surface-lowest ghost-border text-on-surface/75 hover:text-primary hover:border-primary/40 transition-colors">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExampleCard({ example }) {
  const navigate = useNavigate();
  if (!example) {
    return <div className="h-full min-h-[260px] rounded-2xl bg-surface-lowest ghost-border animate-pulse" />;
  }
  const { branded, generic, savings } = example;
  return (
    <button
      onClick={() => navigate(`/product/${branded.id}`)}
      className="w-full text-left rounded-2xl bg-surface-lowest ghost-border clinical-shadow p-6 md:p-7 hover:border-primary/30 transition-colors"
    >
      <div className="text-sm font-semibold text-primary mb-4">Real example from today's prices</div>
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-on-surface/50">Brand</div>
            <div className="font-display font-bold text-on-surface truncate">{branded.name}</div>
          </div>
          <div className="font-display text-xl font-bold text-on-surface/50 line-through decoration-2 shrink-0">{formatINR(branded.mrp)}</div>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-on-surface/50">Jan Aushadhi generic · same salt & strength</div>
            <div className="font-display font-bold text-primary leading-snug">{generic.name}</div>
          </div>
          <div className="font-display text-3xl font-bold text-primary shrink-0">{formatINR(generic.mrp)}</div>
        </div>
      </div>
      <div className="mt-6 pt-5 border-t border-outline-variant flex items-center justify-between">
        <span className="inline-block bg-success-soft text-success font-bold px-3 py-1.5 rounded-lg">You save {Math.round(savings.percentage)}%</span>
        <span className="text-sm font-semibold text-primary inline-flex items-center gap-1">See details <ArrowRight className="w-4 h-4" /></span>
      </div>
    </button>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function Home() {
  const stats = usePlatformStats();
  const example = useExampleSaving('Telma 40');

  return (
    <div className="flex-1 w-full flex flex-col">
      {/* Hero */}
      <section className="bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 md:pt-20 md:pb-20 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
          <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.08 }} className="space-y-6">
            <motion.p variants={fadeUp} className="text-sm font-semibold text-primary">For patients across India · Pradhan Mantri Bhartiya Janaushadhi Pariyojana</motion.p>
            <motion.h1 variants={fadeUp} className="font-display text-4xl md:text-[3.25rem] font-bold text-on-surface leading-[1.08] tracking-tight">
              Same medicine.<br /><span className="text-primary">Up to 90% cheaper.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg text-on-surface/70 max-w-xl leading-relaxed">
              Type the brand your doctor prescribed. We show the Jan Aushadhi generic with the same salt and strength, what you save, and the nearest Kendra that sells it.
            </motion.p>
            <motion.div variants={fadeUp}><HeroSearch /></motion.div>
            <motion.div variants={fadeUp}>
              <Link to="/fulfillment" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
                <MapPin className="w-4 h-4" /> Or find a Jan Aushadhi Kendra near you
              </Link>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
            <ExampleCard example={example} />
          </motion.div>
        </div>
      </section>

      {/* Live stats */}
      {stats && (
        <section className="bg-surface-low border-y border-outline-variant">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: stats.kendras, label: 'Kendras listed' },
              { value: stats.districts, label: 'Districts covered' },
              { value: stats.generics, label: 'Generic medicines' },
              { value: stats.exact_matches, label: 'Brands with an exact generic' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl md:text-4xl font-bold text-on-surface"><AnimatedNumber target={s.value} /></div>
                <div className="text-sm text-on-surface/60 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-on-surface mb-8">How it works</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Search, title: 'Search your brand', body: 'Type the name on your strip or prescription. We match it by salt, strength, form and release type.' },
            { icon: ShieldCheck, title: 'Compare honestly', body: 'Exact matches are marked clearly. If the strength or form differs, we tell you why — ask your doctor before switching.' },
            { icon: Building2, title: 'Collect from a Kendra', body: 'Order for pickup or delivery from a nearby Jan Aushadhi Kendra and pay the pharmacist directly.' },
          ].map((step, i) => (
            <li key={step.title} className="bg-surface-lowest rounded-2xl ghost-border p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-primary text-white font-display font-bold flex items-center justify-center text-sm">{i + 1}</span>
                <step.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1.5">{step.title}</h3>
              <p className="text-on-surface/70 leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Why generics are safe */}
      <section className="bg-primary text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <FlaskConical className="w-8 h-8 text-white/70 mb-4" />
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Why is it so much cheaper?</h2>
            <p className="text-white/85 text-lg leading-relaxed">
              A generic has the same active ingredient, in the same dose and form, as the branded medicine. You are not paying for advertising or the brand name — the medicine inside is the same.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              'Jan Aushadhi medicines are bought from WHO-GMP certified suppliers',
              'Every batch is tested at NABL-accredited laboratories before supply',
              'Prices are set by PMBI, the agency that runs the scheme, and printed on every pack',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 bg-white/10 rounded-xl p-4">
                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-white/80" />
                <span className="text-white/95">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-on-surface mb-3">Check your medicines now</h2>
        <p className="text-on-surface/65 mb-8">It takes 10 seconds and you don't need an account.</p>
        <div className="max-w-xl mx-auto text-left"><HeroSearch /></div>
      </section>
    </div>
  );
}
