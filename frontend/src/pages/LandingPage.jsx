import React, { useState } from 'react';
import {
  CheckCircle2,
  PlayCircle
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import LandingStory, { FinalCta } from '../landing/LandingStory';
import { HELP_VIDEO_URL, HELP_VIDEO_POSTER } from '../data/helpGuide';

const DEMO_CHAPTERS = [
  ['0:07', 'Website & sign-up'],
  ['0:30', 'The menu'],
  ['0:48', 'Add your team & permissions'],
  ['1:01', 'Add buyers (leads)'],
  ['2:12', 'Daily activity'],
  ['2:45', 'Follow-ups & tasks'],
  ['3:09', 'Outreach & team review'],
  ['3:34', 'Price calculator & currency'],
  ['4:18', 'Quotations & proforma'],
  ['4:54', 'Email, WhatsApp & AI calling'],
  ['5:36', 'Built-in help'],
];

function DemoVideo() {
  const [playing, setPlaying] = useState(false);
  const ref = React.useRef(null);
  const seek = (t) => {
    const [m, s] = t.split(':').map(Number);
    setPlaying(true);
    const go = (tries = 0) => {
      const v = ref.current;
      if (!v) { if (tries < 40) setTimeout(() => go(tries + 1), 50); return; }
      const jump = () => { v.currentTime = m * 60 + s; v.play().catch(() => {}); };
      if (v.readyState >= 1) jump(); else v.addEventListener('loadedmetadata', jump, { once: true });
    };
    go();
  };
  return (
    <section id="demo" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">See it in action</div>
        <h2 className="text-3xl font-extrabold text-slate-900">How the CRM works — in 6 minutes</h2>
        <p className="mt-3 text-sm text-slate-500">From registering your company to your team’s daily routine: leads, follow-ups, tasks, the evening report and built-in help.</p>
      </div>
      <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xl">
          {playing ? (
            <video ref={ref} src={HELP_VIDEO_URL} poster={HELP_VIDEO_POSTER} controls autoPlay playsInline preload="metadata" className="w-full aspect-video" />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} className="group relative block w-full aspect-video cursor-pointer" aria-label="Play the product walkthrough video">
              <img src={HELP_VIDEO_POSTER} alt="Travel-Trade CRM walkthrough" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors" />
              <span className="absolute left-1/2 bottom-3 sm:bottom-6 -translate-x-1/2 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-full bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold whitespace-nowrap shadow-lg shadow-emerald-600/30 transition-colors">
                <PlayCircle size={18} /> Watch the walkthrough · 5:58
              </span>
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">Chapters</div>
          <ul className="space-y-0.5">
            {DEMO_CHAPTERS.map(([t, label]) => (
              <li key={t}>
                <button type="button" onClick={() => seek(t)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-slate-50 cursor-pointer">
                  <span className="text-[11px] font-mono font-semibold text-emerald-700 w-9 shrink-0">{t}</span>
                  <span className="text-xs font-medium text-slate-700">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage({ onLoginClick, onRegisterClick }) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-coral-500 selection:text-white">
      {/* Top Navigation - Fully Responsive on Mobile, Tablet & Desktop */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-6 lg:px-12 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <BrandLogo size={30} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight flex items-center gap-1.5 whitespace-nowrap">
              <span>Travel-Trade CRM</span>
              <span className="hidden md:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-coral-100 text-coral-700 uppercase tracking-wider">
                Enterprise
              </span>
            </div>
            <div className="hidden sm:block text-[11px] font-medium text-slate-400 truncate">
              Intelligent Revenue Operations
            </div>
          </div>
        </div>

        <nav className="hidden xl:flex items-center gap-7 text-xs font-semibold text-slate-600 whitespace-nowrap">
          <a href="#journey" className="hover:text-slate-900 transition-colors">How it works</a>
          <a href="#channels" className="hover:text-slate-900 transition-colors">WhatsApp &amp; AI</a>
          <a href="#toolkit" className="hover:text-slate-900 transition-colors">Export toolkit</a>
          <a href="#demo" className="hover:text-slate-900 transition-colors">Watch Demo</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing & Plans</a>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={onLoginClick}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Sign In
          </button>
          <button
            onClick={onRegisterClick}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span>Get Started</span>
            <span className="hidden sm:inline"> Free</span>
          </button>
        </div>
      </header>

      {/* 3D globe hero, deal journey, channels, live calculator, team */}
      <LandingStory onRegisterClick={onRegisterClick} />

      {/* Product walkthrough video */}
      <DemoVideo />

      {/* Pricing Section */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="text-xs font-bold text-coral-600 uppercase tracking-wider mb-2">Transparent Pricing</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Choose The Right Capacity For Your Team</h2>
          <p className="text-sm text-slate-500 mt-2">
            Upgrade or scale staff seats as your sales development team expands. All plans include a 14-day free trial.
          </p>

          {/* Monthly / Annual Billing Toggle */}
          <div className="mt-6 inline-flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Billed Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Billed Annually</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                billingCycle === 'annual' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="font-bold text-slate-900 text-lg">Starter Tier</div>
              <p className="text-xs text-slate-400 mt-1">For solo founders and boutique agencies</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {billingCycle === 'annual' ? '$24' : '$29'}
                </span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              {billingCycle === 'annual' && (
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  Billed annually ($288/yr)
                </span>
              )}
              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Up to 3 Staff Seats</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> 500 Leads Storage</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Core Task Management & Calendar</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Email & WhatsApp Notifications</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Standard Trade Analytics</li>
              </ul>
            </div>
            <button
              onClick={onRegisterClick}
              className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-colors cursor-pointer"
            >
              Start 14-Day Free Trial
            </button>
          </div>

          {/* Growth - Highlighted */}
          <div className="p-6 rounded-2xl bg-white border-2 border-coral-500 shadow-xl ring-4 ring-coral-500/10 flex flex-col justify-between relative transform md:-translate-y-1">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
              Most Popular
            </span>
            <div>
              <div className="font-bold text-slate-900 text-lg">Growth Tier</div>
              <p className="text-xs text-slate-400 mt-1">For scaling sales development teams</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {billingCycle === 'annual' ? '$64' : '$79'}
                </span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              {billingCycle === 'annual' && (
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  Billed annually ($768/yr)
                </span>
              )}
              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Up to 15 Staff Seats</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> 5,000 Commodity Leads</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Full Staff Management & Data Isolation</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Interactive Monthly Calendar & Tasks</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Daily Outreach Cadence Matrix</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Bulk CSV Import & Export</li>
              </ul>
            </div>
            <button
              onClick={onRegisterClick}
              className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 font-bold text-xs text-white shadow-md transition-all cursor-pointer"
            >
              Start 14-Day Free Trial
            </button>
          </div>

          {/* Enterprise */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="font-bold text-slate-900 text-lg">Enterprise Tier</div>
              <p className="text-xs text-slate-400 mt-1">For large sales orgs and multi-branch teams</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {billingCycle === 'annual' ? '$159' : '$199'}
                </span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              {billingCycle === 'annual' && (
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  Billed annually ($1,908/yr)
                </span>
              )}
              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Unlimited Staff Seats</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Unlimited Leads & Storage</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Custom RBAC Role Matrix</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Dedicated Audit Logs & Telemetry</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> 24/7 Priority Support & SLA</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-600" /> Dedicated Trade Account Manager</li>
              </ul>
            </div>
            <button
              onClick={onRegisterClick}
              className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-colors cursor-pointer"
            >
              Start Enterprise Trial
            </button>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>14-Day Free Trial on all tiers</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>No credit card required to start</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Instant workspace activation</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Cancel or switch plans anytime</span>
          </div>
        </div>
      </section>

      <FinalCta onRegisterClick={onRegisterClick} onLoginClick={onLoginClick} />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size={28} />
            <span className="font-bold text-sm text-slate-900">Travel-Trade CRM Platform</span>
          </div>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Travel-Trade. All rights reserved. Enterprise-grade Security & RBAC.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <a href="/privacy" className="hover:text-slate-900">Privacy Policy</a>
            <a href="/terms" className="hover:text-slate-900">Terms of Service</a>
            <a href="/data-deletion" className="hover:text-slate-900">Data Deletion</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
