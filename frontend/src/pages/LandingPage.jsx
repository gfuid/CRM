import React, { useState } from 'react';
import {
  ArrowRight,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  Crown,
  Zap,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Phone,
  Mail,
  Calendar,
  Clock,
  Check
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function LandingPage({ onLoginClick, onRegisterClick }) {
  const [activePreviewTab, setActivePreviewTab] = useState('analytics'); // 'analytics' | 'pipeline' | 'outreach' | 'followup'

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-coral-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size={34} />
          <div>
            <div className="font-extrabold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
              <span>Travel-Trade CRM</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-coral-100 text-coral-700 uppercase tracking-wider">
                Enterprise
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">Intelligent Revenue Operations</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
          <a href="#preview" className="hover:text-slate-900 transition-colors">Platform Tour</a>
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing & Plans</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onLoginClick}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={onRegisterClick}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            Get Started Free
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-6 animate-fadeIn">
          <Sparkles size={14} className="text-emerald-600" />
          <span>Next-Generation Global Commodity Export & Trade CRM</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Close High-Value Deals With <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Zero Trade Friction</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto font-normal">
          Designed for modern export enterprises. Manage multi-commodity buyer requirements, schedule vessel dispatch dates, track LC milestones, and coordinate sales staff.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onRegisterClick}
            className="px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
          >
            <span>Get Started Free</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={onLoginClick}
            className="px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-300 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Sign In to CRM</span>
          </button>
        </div>

        {/* Trust Points */}
        <div className="mt-6 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-4">
          <span>✓ Instant demo access (No credit card)</span>
          <span>&bull;</span>
          <span>✓ SOC-2 Type II Isolation</span>
          <span>&bull;</span>
          <span>✓ Full access to all 7 modules</span>
        </div>

        {/* Interactive Live Preview of Travel-Trade CRM Modules */}
        <div id="preview" className="mt-14 p-4 rounded-3xl bg-white border border-slate-200 shadow-xl text-left">
          {/* Top Bar inside preview window */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-crimson-400" />
              <span className="w-3 h-3 rounded-full bg-gold-400" />
              <span className="w-3 h-3 rounded-full bg-mint-400" />
              <span className="text-xs font-mono text-slate-400 ml-2">travel-trade.com/app/{activePreviewTab}</span>
            </div>

            {/* Interactive Module Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              {[
                { id: 'analytics', label: 'Executive Analytics' },
                { id: 'pipeline', label: 'Leads Pipeline' },
                { id: 'outreach', label: 'Outreach Cadence' },
                { id: 'followup', label: 'Smart Follow-ups' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    activePreviewTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Module Content Preview */}
          <div className="mt-4">
            {activePreviewTab === 'analytics' && (
              <div className="space-y-4">
                {/* 4 Horizontal KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Total Revenue</span>
                      <DollarSign size={16} className="text-mint-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">$101,491</div>
                    <div className="text-xs text-mint-600 font-bold mt-1">+1.50% than last week</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Total Product Sold</span>
                      <BarChart3 size={16} className="text-blue-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">4,346</div>
                    <div className="text-xs text-mint-600 font-bold mt-1">+2.10% than last week</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Total Sales</span>
                      <TrendingUp size={16} className="text-coral-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">$283,142</div>
                    <div className="text-xs text-crimson-500 font-bold mt-1">-4.51% than last week</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>Total Customers</span>
                      <Users size={16} className="text-gold-500" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">8,426</div>
                    <div className="text-xs text-mint-600 font-bold mt-1">+3.75% than last week</div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'pipeline' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { stage: 'Lead Generation', count: 18, value: '$64,200', color: 'border-blue-500' },
                  { stage: 'Requirement Understood', count: 12, value: '$128,500', color: 'border-gold-500' },
                  { stage: 'Quotation Sent', count: 7, value: '$88,000', color: 'border-coral-500' },
                  { stage: 'Closed Won', count: 24, value: '$342,000', color: 'border-mint-500' },
                ].map((col, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl bg-slate-50 border-t-4 ${col.color}`}>
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{col.stage}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white text-slate-900">{col.count}</span>
                    </div>
                    <div className="text-base font-black text-slate-900 mt-2">{col.value}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Weighted Pipeline</div>
                  </div>
                ))}
              </div>
            )}

            {activePreviewTab === 'outreach' && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Phone size={14} className="text-mint-600" /> Calls Initiated
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">143</div>
                  <div className="text-xs text-mint-600 font-semibold mt-1">Target: 30 / rep / day</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Mail size={14} className="text-blue-500" /> Emails Dispatched
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">280</div>
                  <div className="text-xs text-blue-600 font-semibold mt-1">Target: 50 / rep / day</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="text-coral-500 font-bold">in</span> LinkedIn Touches
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">102</div>
                  <div className="text-xs text-slate-400 font-semibold mt-1">Social selling cadence</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Calendar size={14} className="text-gold-500" /> Meetings Booked
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">13</div>
                  <div className="text-xs text-mint-600 font-semibold mt-1">High conversion meetings</div>
                </div>
              </div>
            )}

            {activePreviewTab === 'followup' && (
              <div className="space-y-2">
                {[
                  { name: 'David Vance', company: 'Apex Global Logistics', time: 'Today, 11:30 AM', priority: 'High', type: 'Phone Call' },
                  { name: 'Elena Rostova', company: 'Novatech AI Solutions', time: 'Today, 02:00 PM', priority: 'High', type: 'Product Demo' },
                  { name: 'Sophia Patel', company: 'GreenLine Health', time: 'Tomorrow, 10:00 AM', priority: 'Medium', type: 'WhatsApp Check' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-coral-100 text-coral-700 font-bold flex items-center justify-center text-[10px]">
                        {item.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{item.name} &bull; {item.company}</div>
                        <div className="text-slate-400 text-[11px]">{item.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-600">{item.time}</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${item.priority === 'High' ? 'bg-crimson-100 text-crimson-700' : 'bg-gold-100 text-gold-800'}`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Enterprise Metrics Bar */}
      <section className="border-y border-slate-200 bg-white py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-black text-slate-900">$120M+</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Pipeline Deals Tracked</div>
          </div>
          <div>
            <div className="text-3xl font-black text-mint-600">99.98%</div>
            <div className="text-xs font-medium text-slate-500 mt-1">High Availability SLA</div>
          </div>
          <div>
            <div className="text-3xl font-black text-coral-600">15,000+</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Active Sales Reps</div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">0%</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Cross-Tenant Leakage</div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold text-coral-600 uppercase tracking-wider mb-2">Core Platform Pillars</div>
          <h2 className="text-3xl font-extrabold text-slate-900">Engineered For Rapid Revenue Execution</h2>
          <p className="text-sm text-slate-500 mt-2">
            Eliminate friction between SDR outreach, pipeline stages, task deadlines, and management quotas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-coral-100 text-coral-600 flex items-center justify-center mb-4">
              <BarChart3 size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-base m-0">Dot-Matrix Analytics</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Interactive revenue histograms with custom hover tooltips showing daily online and offline sales volumes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-mint-100 text-mint-600 flex items-center justify-center mb-4">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-base m-0">Headcount Quota Governance</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Super Admin manages company seat allocations dynamically based on tier limits (Starter 3, Growth 15, Enterprise Unlimited).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-gold-100 text-gold-700 flex items-center justify-center mb-4">
              <Zap size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-base m-0">Daily Focus & Follow-ups</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Never let a hot prospect drop. Reps get time-blocked daily agendas and automated alert notifications.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold text-coral-600 uppercase tracking-wider mb-2">Transparent Pricing</div>
          <h2 className="text-3xl font-extrabold text-slate-900">Choose The Right Capacity For Your Team</h2>
          <p className="text-sm text-slate-500 mt-2">
            Upgrade or scale staff seats as your sales development team expands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-900 text-lg">Starter Tier</div>
              <p className="text-xs text-slate-400 mt-1">For solo founders and boutique agencies</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">$29</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-mint-600" /> Up to 3 Staff Seats</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-mint-600" /> 500 Leads Storage</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-mint-600" /> Core Task Management</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-mint-600" /> Email Notifications</li>
              </ul>
            </div>
            <button
              onClick={onRegisterClick}
              className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-colors"
            >
              Start Free
            </button>
          </div>

          {/* Growth - Highlighted */}
          <div className="p-6 rounded-2xl bg-white border-2 border-coral-500 shadow-xl ring-4 ring-coral-500/10 flex flex-col justify-between relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
              Most Popular
            </span>
            <div>
              <div className="font-bold text-slate-900 text-lg">Growth Tier</div>
              <p className="text-xs text-slate-400 mt-1">For scaling sales development teams</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">Free</span>
                <span className="text-xs text-slate-400">/ forever</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Full Staff Management</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Unlimited Commodity Leads</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Interactive Calendar & Tasks</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Daily Outreach Cadence Matrix</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-coral-600" /> Smart Follow-up Reminders</li>
              </ul>
            </div>
            <button
              onClick={onRegisterClick}
              className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 font-bold text-xs text-white shadow-md transition-all"
            >
              Get Started Free
            </button>
          </div>

          {/* Enterprise */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-900 text-lg">Enterprise Tier</div>
              <p className="text-xs text-slate-400 mt-1">For large sales orgs and multi-branch teams</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">Free</span>
                <span className="text-xs text-slate-400">/ forever</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-mint-600" /> Unlimited Staff Seats</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-mint-600" /> Unlimited Leads & Storage</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-mint-600" /> Custom RBAC Role Matrix</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-mint-600" /> Dedicated Audit Logs & Telemetry</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-mint-600" /> 24/7 Priority Support</li>
              </ul>
            </div>
            <button
              onClick={onRegisterClick}
              className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-colors"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo size={28} />
            <span className="font-bold text-sm text-slate-900">Travel-Trade CRM Platform</span>
          </div>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Travel-Trade CRM Inc. All rights reserved. Enterprise-grade Security & RBAC.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <a href="#privacy" className="hover:text-slate-900">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-900">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
