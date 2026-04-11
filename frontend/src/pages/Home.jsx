// ============================================================
// Home Page — Landing, Science Hub, Animated Stats
// Reference: Image 1 (Science Hub / Landing)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Search, MapPin, TrendingUp, Beaker, BookOpen, ChevronRight, FlaskConical } from 'lucide-react';

// Animated counter
function AnimatedNumber({ target, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const duration = 1800;
        const step = (timestamp) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
}

const BLOG_POSTS = [
  { title: 'Generic vs Branded: The Science of Bio-Equivalence', excerpt: 'Understanding how generic medicines undergo rigorous testing to prove therapeutic equivalence with their branded counterparts.', category: 'Science', readTime: '5 min' },
  { title: 'How PMBJP is Transforming Healthcare Access in India', excerpt: 'The government initiative that has opened 10,000+ affordable medicine outlets across the nation.', category: 'Policy', readTime: '4 min' },
  { title: 'Understanding Your Prescription: A Patient\'s Guide', excerpt: 'Decode the abbreviations, dosages, and instructions on your prescription slip.', category: 'Education', readTime: '6 min' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 w-full flex flex-col">

      {/* Hero */}
      <div className="bg-surface relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8 z-10">
            <div className="text-xs font-bold tracking-widest text-primary/70 uppercase">Government Initiative</div>
            <h1 className="font-display text-5xl md:text-[3.5rem] font-bold text-on-surface leading-[1.1] tracking-tight">
              Quality Healthcare <br /><span className="text-primary block mt-2">For Every Citizen.</span>
            </h1>
            <p className="text-lg text-on-surface/70 max-w-lg leading-[1.6]">Pradhan Mantri Bhartiya Janaushadhi Pariyojana provides quality generic medicines at affordable prices through dedicated outlets across India.</p>
            <div className="flex items-center gap-4 pt-4">
              <button onClick={() => navigate('/discovery')} className="btn-primary py-3.5 px-8">Find Generic Medicines</button>
              <button onClick={() => navigate('/fulfillment')} className="btn-secondary py-3.5 px-8">Locate Store</button>
            </div>
          </div>
          
          <div className="flex-1 relative z-10 w-full">
            <div className="bg-primary rounded-lg overflow-hidden shadow-none">
              <div className="p-12 text-white">
                <div className="text-xs font-bold tracking-widest text-white/70 uppercase mb-8">How It Works</div>
                <div className="space-y-8">
                  {[
                    { icon: <Search className="w-5 h-5" />, title: '1. Search Your Medicine', desc: 'Enter the branded name you currently take.' },
                    { icon: <TrendingUp className="w-5 h-5" />, title: '2. Compare & Save', desc: 'See generic equivalent and potential savings.' },
                    { icon: <MapPin className="w-5 h-5" />, title: '3. Get From Nearest Kendra', desc: 'Locate closest Jan Aushadhi Kendra and order.' },
                  ].map((s, i) => (
                    <div key={i} className="flex gap-5">
                      <div className="w-10 h-10 bg-white/10 rounded-md flex items-center justify-center shrink-0 border border-white/20">{s.icon}</div>
                      <div><div className="font-display font-semibold text-lg mb-1">{s.title}</div><div className="text-sm text-white/80 leading-relaxed">{s.desc}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Overlay Metric */}
            <div className="absolute -bottom-8 -left-8 bg-surface-lowest p-6 rounded-lg ghost-border max-w-xs z-20 clinical-shadow">
              <div className="font-display text-3xl font-bold text-primary mb-1">90%</div>
              <div className="text-sm font-medium text-on-surface/70">Potential cost reduction compared to branded alternatives.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Stats */}
      <div className="w-full bg-surface-low border-y border-outline-variant py-16 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-outline-variant">
          <div>
            <div className="font-display text-4xl font-bold text-on-surface mb-2"><AnimatedNumber target={10000} suffix="+" /></div>
            <div className="text-xs tracking-widest font-semibold text-on-surface/60 uppercase">Kendra Outlets</div>
          </div>
          <div>
            <div className="font-display text-4xl font-bold text-on-surface mb-2"><AnimatedNumber target={1800} suffix="+" /></div>
            <div className="text-xs tracking-widest font-semibold text-on-surface/60 uppercase">Product Basket</div>
          </div>
          <div>
            <div className="font-display text-4xl font-bold text-on-surface mb-2"><AnimatedNumber target={700} suffix="+" /></div>
            <div className="text-xs tracking-widest font-semibold text-on-surface/60 uppercase">Districts Covered</div>
          </div>
          <div className="border-none md:border-solid">
            <div className="font-display text-4xl font-bold text-on-surface mb-2"><AnimatedNumber target={20000} prefix="₹" suffix="Cr" /></div>
            <div className="text-xs tracking-widest font-semibold text-on-surface/60 uppercase">Public Savings</div>
          </div>
        </div>
      </div>

      {/* Feature Section - Clinical Tonal Shift */}
      <div className="w-full bg-surface max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-16 max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-on-surface mb-4">Uncompromising Quality</h2>
          <p className="text-on-surface/70 text-lg leading-[1.6]">Every tablet dispensed under PMBJP undergoes rigorous multi-tier testing to ensure clinical efficacy and safety.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { icon: <ShieldCheck className="w-5 h-5 text-primary" />, title: 'NABL Lab Testing', desc: 'Each batch of medicine is tested at labs accredited by National Accreditation Board for Testing and Calibration Laboratories.' },
            { icon: <TrendingUp className="w-5 h-5 text-primary" />, title: 'Generic vs Branded', desc: 'Therapeutically equivalent to branded medicines in dosage, strength, and quality, but at a fraction of the cost.' },
            { icon: <MapPin className="w-5 h-5 text-primary" />, title: 'WHO-GMP Compliant', desc: 'All medicines are procured from World Health Organization-Good Manufacturing Practices certified suppliers only.' },
          ].map((f, i) => (
            <div key={i} className="bg-surface-lowest p-8 rounded-lg ghost-border">
              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center mb-6">
                {f.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-on-surface mb-3">{f.title}</h3>
              <p className="text-on-surface/70 text-sm leading-[1.6]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Science Hub */}
      <div className="w-full bg-surface-low border-t border-outline-variant py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <div className="inline-flex items-center gap-2 text-primary text-xs font-bold mb-4 tracking-wider uppercase">
                <BookOpen className="w-3.5 h-3.5" /> Science Hub
              </div>
              <h2 className="font-display text-3xl font-bold text-on-surface">Medicine Transparency</h2>
              <p className="text-on-surface/70 mt-2 text-lg">Educational resources to help you make informed healthcare decisions.</p>
            </div>
            <button className="text-primary font-semibold text-sm flex items-center gap-1 hover:underline transition-all">View All <ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post, i) => (
              <div key={i} className="bg-surface-lowest rounded-lg p-8 ghost-border transition-all hover:border-primary/30 cursor-pointer group">
                <div className="flex items-center gap-3 mb-5">
                  <span className="bg-surface-low text-primary text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider">{post.category}</span>
                  <span className="text-[10px] text-on-surface/50 font-medium uppercase tracking-wider">{post.readTime}</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-on-surface mb-3 group-hover:text-primary transition-colors leading-[1.4]">{post.title}</h3>
                <p className="text-sm text-on-surface/70 leading-[1.6] mb-6">{post.excerpt}</p>
                <div className="text-primary text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">Read More <ChevronRight className="w-4 h-4" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bio-Equivalence Section */}
      <div className="w-full bg-surface max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex flex-col md:flex-row bg-surface-lowest rounded-lg ghost-border overflow-hidden">
          <div className="w-full md:w-7/12 p-12 lg:p-16">
            <div className="inline-flex items-center gap-2 text-primary text-xs font-bold mb-6 tracking-wider uppercase"><FlaskConical className="w-3.5 h-3.5" /> Clinical Proof</div>
            <h2 className="font-display text-3xl font-bold text-on-surface mb-6">The Science of Bio-Equivalence</h2>
            <p className="text-on-surface/70 mb-8 leading-[1.6] text-lg">Generic medicines contain the same active pharmaceutical ingredient (API) in the same dose, same form, and produce the same blood concentration levels as the branded version.</p>
            
            <div className="bg-surface-low rounded-lg p-6 mb-8 ghost-border">
              <div className="font-display text-sm font-semibold text-on-surface mb-3">The Generic Advantage:</div>
              <ul className="space-y-3 text-sm text-on-surface/70">
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-sm bg-primary mt-1.5 shrink-0" /> Same molecule — identical therapeutic outcome</li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-sm bg-primary mt-1.5 shrink-0" /> No patent premium — 50-90% cost reduction</li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-sm bg-primary mt-1.5 shrink-0" /> Government quality oversight — bulk synthesis</li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-sm bg-primary mt-1.5 shrink-0" /> WHO-GMP manufacturing — strict regulation</li>
              </ul>
            </div>
            
            <button onClick={() => navigate('/dashboard')} className="btn-primary py-3.5 px-8">Compare Prices Now</button>
          </div>
          
          <div className="w-full md:w-5/12 bg-primary p-12 lg:p-16 flex flex-col justify-center text-white">
            <Beaker className="w-10 h-10 mb-8 text-white/80" />
            <h3 className="font-display text-2xl font-bold mb-4">CDSCO Approved</h3>
            <p className="text-white/80 text-sm leading-[1.6] mb-10">The Central Drugs Standard Control Organisation (CDSCO) ensures every generic medicine meets strict pharmacological standards before market approval.</p>
            
            <div className="space-y-5">
              {[
                'NABL Accredited Lab Testing',
                'ISO 9001:2015 Manufacturing',
                'WHO-GMP Production Standards'
              ].map((text, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-white/50" />
                  <span className="text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
