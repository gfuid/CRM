/**
 * The landing page story (everything between the top bar and the product video):
 * 3D trade globe hero -> the deal journey -> channels -> live export calculator -> team.
 * Screens are real screenshots of the CRM (demo company "Nova Agro Exports", made-up data).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, PlayCircle, MessageCircle, Mail, PhoneCall, Share2, Users, Upload, CalendarClock, FileText,
  Calculator, ClipboardCheck, BellRing, Smartphone, CheckCircle2, Sparkles, Ship, Globe2, Bot, Repeat, Tags, FlaskConical,
} from 'lucide-react';
import { evaluateCalculator, EXAMPLE_ROWS } from '../data/formula';
import { startLandingMotion, prefersReducedMotion } from './motion';

/* ---------- helpers ---------- */

/** Heading revealed word by word; screen readers get the whole sentence once. */
function RevealHeading({ as: Tag = 'h2', text, className = '', accent }) {
  const words = text.split(' ');
  return (
    <Tag className={className} data-reveal-heading>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
            <span data-word className={`inline-block ${accent && accent.includes(w.replace(/[.,]/g, '')) ? 'text-emerald-500' : ''}`}>{w}</span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** A real CRM screen in a browser frame, tilted in 3D; follows the pointer a little on desktop. */
function Screen({ src, alt, className = '', tilt = true, eager = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !tilt || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return undefined;
    let raf = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { el.style.transform = `perspective(1400px) rotateY(${x * 8 - 6}deg) rotateX(${-y * 6 + 4}deg)`; });
    };
    const onLeave = () => { cancelAnimationFrame(raf); el.style.transform = ''; };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); };
  }, [tilt]);
  return (
    <div
      ref={ref}
      className={`relative rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(2,24,43,0.45),0_0_0_1px_rgba(15,23,42,0.08)] overflow-hidden transition-transform duration-500 ease-out ${tilt ? '[transform:perspective(1400px)_rotateY(-6deg)_rotateX(4deg)]' : ''} ${className}`}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50">
        <span className="w-2.5 h-2.5 rounded-full bg-[#EB4E55]" /><span className="w-2.5 h-2.5 rounded-full bg-[#FDC64A]" /><span className="w-2.5 h-2.5 rounded-full bg-[#58BA84]" />
        <span className="ml-2 text-[10px] font-semibold text-slate-400 truncate">Travel-Trade CRM · Nova Agro Exports (demo)</span>
      </div>
      <img src={src} alt={alt} width="1536" height="1104" loading={eager ? 'eager' : 'lazy'} decoding="async" className="block w-full h-auto aspect-[1536/1104] object-cover object-top bg-slate-100" />
    </div>
  );
}

/* ---------- 1. Hero with the 3D globe ---------- */

const CHIPS = [
  { icon: MessageCircle, tone: 'bg-emerald-500', title: 'WhatsApp · Read', sub: 'Al-Zahra Trading, Dubai', pos: 'left-[2%] top-[14%]' },
  { icon: PhoneCall, tone: 'bg-violet-500', title: 'AI call · Interested', sub: 'Kenya Poultry Feeds', pos: 'right-[0%] top-[28%]' },
  { icon: FileText, tone: 'bg-amber-500', title: 'Quote sent · CIF', sub: 'USD 165.20 / MT · Saigon', pos: 'left-[6%] bottom-[18%]' },
  { icon: BellRing, tone: 'bg-rose-500', title: 'Follow-up now', sub: 'Global Agri Impex, Rotterdam', pos: 'right-[4%] bottom-[8%]' },
];

function Hero({ onRegisterClick }) {
  const canvasRef = useRef(null);
  const [globe, setGlobe] = useState('poster'); // 'poster' | 'live'
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return undefined;
    // WebGL available?
    try {
      const test = document.createElement('canvas');
      if (!(test.getContext('webgl2') || test.getContext('webgl'))) return undefined;
    } catch { return undefined; }
    let api = null; let cancelled = false;
    const go = () => import('./globe').then(({ createGlobe }) => {
      if (cancelled) return;
      return createGlobe(canvas, { onReady: () => !cancelled && setGlobe('live') }).then((g) => { if (cancelled) g.destroy(); else api = g; });
    }).catch(() => setGlobe('poster'));
    const idle = window.requestIdleCallback ? window.requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 300);
    const onLost = () => setGlobe('poster');
    canvas.addEventListener('globe-lost', onLost);
    return () => {
      cancelled = true;
      if (window.cancelIdleCallback && typeof idle === 'number') window.cancelIdleCallback(idle); else clearTimeout(idle);
      canvas.removeEventListener('globe-lost', onLost);
      if (api) api.destroy();
    };
  }, []);

  return (
    <section data-hero className="relative overflow-hidden bg-[radial-gradient(120%_80%_at_70%_40%,#0e3350_0%,#071a2b_45%,#040f1a_100%)] text-white">
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_40%,#000,transparent)]" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-14 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-6 items-center">
        <div className="relative z-10 text-center lg:text-left">
          <div data-hero-fade className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[11px] sm:text-xs font-bold tracking-wide">
            <Ship size={14} /> The CRM built for export &amp; trade teams
          </div>
          <h1 className="mt-5 text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.6rem] font-black tracking-[-0.035em]">
            <span className="sr-only">Every buyer. Every port. One CRM.</span>
            <span aria-hidden="true">
              {[['Every', 'buyer.'], ['Every', 'port.'], ['One', 'CRM.']].map((line) => (
                <span key={line.join(' ')} className="block">
                  {line.map((w, k) => (
                    <span key={w} className="inline-block overflow-hidden align-bottom pb-[0.06em] -mb-[0.06em]">
                      <span data-hero-word className={`inline-block ${w === 'CRM.' ? 'bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent' : ''}`}>{w}</span>
                      {k === 0 ? ' ' : ''}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </h1>
          <p data-hero-fade className="mt-5 text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Leads and follow-ups, <b className="text-white">WhatsApp</b>, <b className="text-white">email</b> and <b className="text-white">AI calls</b>, FOB / CFR / CIF quotes in any currency, and your team&apos;s daily work, all in one place.
          </p>
          <div data-hero-fade className="mt-7 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
            <button type="button" onClick={onRegisterClick} className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#04201a] font-extrabold text-sm shadow-[0_10px_30px_-8px_rgba(16,185,129,0.7)] flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
              Start free <ArrowRight size={16} />
            </button>
            <a href="#demo" className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/20 hover:border-white/40 hover:bg-white/5 font-bold text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <PlayCircle size={16} /> Watch the 6-min tour
            </a>
          </div>
          <ul data-hero-fade className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left max-w-xl mx-auto lg:mx-0">
            {[[MessageCircle, 'WhatsApp API'], [Mail, 'Email campaigns'], [PhoneCall, 'AI calling'], [Calculator, 'Any currency']].map(([I, t]) => (
              <li key={t} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 text-[11px] sm:text-xs font-semibold text-slate-200"><I size={14} className="text-emerald-300 shrink-0" /> {t}</li>
            ))}
          </ul>
        </div>

        {/* Globe */}
        <div data-hero-globe className="relative mx-auto w-full max-w-[560px] aspect-square">
          <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#14476b,#0a2236_60%,#06182a)] shadow-[0_0_120px_10px_rgba(52,211,153,0.18)]" aria-hidden="true" />
          <img src="/landing/globe-poster.png" alt="" aria-hidden="true" className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${globe === 'live' ? 'opacity-0' : 'opacity-100'}`} />
          <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full touch-pan-y cursor-grab active:cursor-grabbing transition-opacity duration-700 ${globe === 'live' ? 'opacity-100' : 'opacity-0'}`} role="img" aria-label="Globe with trade routes from India to buyers in Dubai, Rotterdam, Lagos, Vietnam, Sri Lanka, Kenya, Bangladesh, Singapore, Saudi Arabia, USA, Germany and Brazil" />
          {CHIPS.map(({ icon: I, tone, title, sub, pos }, i) => (
            <div key={title} data-hero-chip className={`absolute ${pos} hidden sm:flex items-center gap-2.5 rounded-xl bg-white/95 text-slate-900 shadow-xl px-3 py-2 animate-[float_6s_ease-in-out_infinite] motion-reduce:animate-none`} style={{ animationDelay: `${i * 1.3}s` }}>
              <span className={`w-7 h-7 rounded-lg ${tone} text-white flex items-center justify-center`}><I size={14} /></span>
              <span className="leading-tight"><span className="block text-[11px] font-extrabold">{title}</span><span className="block text-[10px] text-slate-500">{sub}</span></span>
            </div>
          ))}
        </div>
      </div>
      <style>{'@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}'}</style>
    </section>
  );
}

/* ---------- 2. The deal journey (sticky screen on desktop) ---------- */

const STEPS = [
  { icon: Upload, label: 'Capture', title: 'Every buyer in one record', text: 'Add buyers one by one or hundreds at once from Excel. Products, specs, contacts, tags and every remark stay together.', img: '/landing/leads.jpg', alt: 'Leads list with pipeline value, trade volume and buyers by country' },
  { icon: MessageCircle, label: 'Reach', title: 'WhatsApp, email and AI calls', text: 'Approved WhatsApp templates, email campaigns from your own mailbox, and an AI agent that calls in the buyer’s office hours.', img: '/landing/whatsapp.jpg', alt: 'WhatsApp chats with a buyer: template, reply and automatic answer' },
  { icon: CalendarClock, label: 'Follow up', title: 'Nobody forgets a call', text: 'Today’s follow-ups, missed ones in red, and a reminder on every phone when it is time to call.', img: '/landing/followup.jpg', alt: 'Follow up page with today and overdue buyers' },
  { icon: Calculator, label: 'Quote', title: 'FOB, CFR, CIF in any currency', text: 'Your own price sheet with today’s exchange rate. Turn it into a quotation or proforma PDF with one click.', img: '/landing/calculator.jpg', alt: 'Price calculator in INR and USD with FOB, CFR and CIF', narrow: true },
  { icon: ClipboardCheck, label: 'Review', title: 'The owner sees the whole day', text: 'Calls, remarks, follow-ups done and missed, per person. A daily report lands every evening.', img: '/landing/team-review.jpg', alt: 'Team review report of each staff member’s day' },
  { icon: Bot, label: 'Close', title: 'Interested buyers come back to you', text: 'AI calls and WhatsApp replies are written onto the lead with a follow-up, so your team calls them next.', img: '/landing/ai-calling.jpg', alt: 'AI call result: interested buyer with summary and recording' },
];

function Journey() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.step)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <section id="journey" className="relative bg-[#f6f8fb] scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-20 sm:pt-28">
        <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600 uppercase text-center" data-reveal>How it works</p>
        <RevealHeading text="From first hello to a shipped container." accent={['shipped', 'container']} className="mt-3 text-3xl sm:text-5xl font-black tracking-[-0.03em] text-slate-900 text-center max-w-3xl mx-auto" />
        <p className="mt-4 text-slate-600 text-center max-w-2xl mx-auto" data-reveal>Six steps every export deal goes through. Scroll, and watch each one happen in the CRM.</p>
      </div>
      <div data-journey className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-20 sm:pb-28 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 mt-12">
        {/* Steps */}
        <ol className="relative">
          <span className="hidden lg:block absolute left-[19px] top-2 bottom-2 w-[2px] bg-slate-200" aria-hidden="true" />
          <span data-journey-line className="hidden lg:block absolute left-[19px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-emerald-500 to-amber-400" aria-hidden="true" />
          {STEPS.map((s, i) => (
            <li key={s.label} ref={(el) => { refs.current[i] = el; }} data-step={i} className="relative lg:min-h-[64vh] lg:flex lg:items-center pb-12 lg:pb-0">
              <div className="flex gap-4 w-full">
                <span className={`relative z-10 shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${active === i ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110' : 'bg-white text-slate-400 border border-slate-200'}`}><s.icon size={18} /></span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-extrabold uppercase tracking-[0.16em] transition-colors ${active === i ? 'text-emerald-600' : 'text-slate-400'}`}>Step {i + 1} · {s.label}</div>
                  <h3 className={`mt-1 text-xl sm:text-2xl font-extrabold tracking-tight transition-colors ${active === i ? 'text-slate-900' : 'text-slate-500'}`}>{s.title}</h3>
                  <p className="mt-2 text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-md">{s.text}</p>
                  <div className="lg:hidden mt-5"><Screen src={s.img} alt={s.alt} tilt={false} className={s.narrow ? 'max-w-sm' : ''} /></div>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {/* Sticky screen (desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-[14vh] h-[72vh] flex items-center">
            <div className="relative w-full aspect-[1536/1104]">
              {STEPS.map((s, i) => (
                <div key={s.label} className={`absolute inset-0 transition-all duration-700 ease-out ${active === i ? 'opacity-100 translate-y-0 scale-100' : i < active ? 'opacity-0 -translate-y-8 scale-95' : 'opacity-0 translate-y-8 scale-95'} ${s.narrow ? 'flex justify-center' : ''}`} aria-hidden={active !== i}>
                  <Screen src={s.img} alt={s.alt} className={s.narrow ? 'w-[62%]' : 'w-full'} eager={i === 0} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. Channels ---------- */

const CHANNELS = [
  { key: 'wa', icon: MessageCircle, name: 'WhatsApp Marketing', color: 'from-emerald-400 to-emerald-600', img: '/landing/whatsapp.jpg',
    points: ['Official WhatsApp Business API from Meta', 'Templates with pictures and buttons', 'Broadcast to buyers by tag, see delivered and read', 'Auto replies: welcome, “price”, “catalogue”, STOP'] },
  { key: 'email', icon: Mail, name: 'Email Marketing', color: 'from-sky-400 to-indigo-500', img: '/landing/email.jpg',
    points: ['Sent from your own Gmail, Outlook or Zoho', 'Who opened, who clicked, who unsubscribed', 'Daily limit kept safe, continues next day', 'Schedule a campaign for the buyer’s morning'] },
  { key: 'ai', icon: PhoneCall, name: 'AI Calling', color: 'from-violet-400 to-fuchsia-500', img: '/landing/ai-calling.jpg',
    points: ['An AI agent calls from your own number', 'Calls in each buyer’s office hours, retries', 'Summary, quantity and email it collected', 'Interested buyers get a follow-up in the CRM'] },
  { key: 'social', icon: Share2, name: 'Social Media', color: 'from-amber-400 to-rose-500', img: null,
    points: ['Facebook Page and Instagram in one calendar', 'AI writes post ideas in your style', 'Schedule posts, see likes and comments', 'Staff can draft, the owner approves'] },
];

function Channels() {
  const [sel, setSel] = useState(0);
  const c = CHANNELS[sel];
  return (
    <section id="channels" className="relative bg-[#06131f] text-white overflow-hidden scroll-mt-16">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-20 sm:py-28">
        <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-300 uppercase text-center" data-reveal>Reach &amp; automation</p>
        <RevealHeading text="Reach buyers where they actually reply." accent={['reply.']} className="mt-3 text-3xl sm:text-5xl font-black tracking-[-0.03em] text-center max-w-3xl mx-auto" />
        <p className="mt-4 text-slate-400 text-center max-w-2xl mx-auto" data-reveal>Four channels, one buyer record. Every message, call and reply lands on the right lead, with the next step already set.</p>

        <div className="mt-12 grid lg:grid-cols-[0.8fr_1.2fr] gap-8 items-center">
          <div role="tablist" aria-label="Channels" className="grid grid-cols-2 lg:grid-cols-1 gap-3" data-reveal>
            {CHANNELS.map((ch, i) => (
              <button key={ch.key} type="button" role="tab" aria-selected={sel === i} aria-controls="channel-panel" onClick={() => setSel(i)}
                className={`group text-left rounded-2xl border p-4 transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${sel === i ? 'bg-white text-slate-900 border-white shadow-2xl lg:translate-x-2' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <span className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ch.color} text-white flex items-center justify-center shadow-lg`}><ch.icon size={18} /></span>
                  <span className="font-extrabold text-sm sm:text-base">{ch.name}</span>
                </span>
                <ul className={`mt-3 space-y-1.5 text-xs sm:text-[13px] ${sel === i ? 'block' : 'hidden lg:hidden'}`}>
                  {ch.points.map((p) => <li key={p} className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />{p}</li>)}
                </ul>
              </button>
            ))}
          </div>
          <div id="channel-panel" role="tabpanel" className="relative">
            {c.img ? (
              <Screen key={c.key} src={c.img} alt={`${c.name} in Travel-Trade CRM`} />
            ) : (
              <div key={c.key} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/0 p-6 sm:p-10 [transform:perspective(1400px)_rotateY(-6deg)_rotateX(4deg)]">
                <div className="grid grid-cols-7 gap-1.5 text-[10px] text-slate-400 font-bold">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="text-center pb-1">{d}</div>)}
                  {Array.from({ length: 21 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-white/5 border border-white/10 p-1">
                      {[2, 5, 9, 12, 16, 19].includes(i) && <div className={`h-full rounded-md ${i % 2 ? 'bg-gradient-to-br from-amber-400/80 to-rose-500/80' : 'bg-gradient-to-br from-sky-400/80 to-indigo-500/80'}`} />}
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-sm text-slate-300">Your post calendar for Facebook and Instagram, with AI post ideas and results in one place.</p>
              </div>
            )}
          </div>
        </div>

        {/* Automation strip */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3" data-reveal>
          {[[Repeat, 'Auto replies', 'Keyword answers on WhatsApp, day and night'], [CalendarClock, 'Scheduled sends', 'Campaigns go out at the buyer’s best time'], [Sparkles, 'AI assistant', 'Ask “how do I…” and get the answer'], [BellRing, 'Phone reminders', 'A notification when a follow-up is due']].map(([I, t, d]) => (
            <div key={t} className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <I size={18} className="text-emerald-300" />
              <div className="mt-2 font-extrabold text-sm">{t}</div>
              <div className="mt-1 text-xs text-slate-400 leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 4. Export toolkit: live calculator ---------- */

// Example rates for this page only; inside the CRM today's live rate is used
const EXAMPLE_FX = { USD: 93, EUR: 100, AED: 25.3, GBP: 117 };
const money = (n, cur) => (Number.isFinite(n) ? `${cur} ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—');

function Slider({ id, label, unit, min, max, step, value, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-bold text-slate-600">{label}</label>
        <span className="text-sm font-extrabold text-slate-900 tabular-nums">{value.toLocaleString('en-IN')} <span className="text-[11px] font-semibold text-slate-400">{unit}</span></span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-emerald-600 cursor-pointer h-2" />
    </div>
  );
}

function Toolkit() {
  const [price, setPrice] = useState(10);
  const [freight, setFreight] = useState(400);
  const [profit, setProfit] = useState(2);
  const [cur, setCur] = useState('USD');
  const res = useMemo(() => evaluateCalculator(EXAMPLE_ROWS, { quote_currency: cur, price_kg: price, freight, profit }, { fx: EXAMPLE_FX[cur] }), [price, freight, profit, cur]);
  const v = res.values || {};
  const bars = [['FOB', v.fob, 'from-emerald-400 to-emerald-600'], ['CFR', v.cfr, 'from-sky-400 to-indigo-500'], ['CIF', v.cif, 'from-amber-400 to-rose-500']];
  const maxV = Math.max(...bars.map((b) => b[1] || 0), 1);
  return (
    <section id="toolkit" className="relative bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-20 sm:py-28">
        <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600 uppercase text-center" data-reveal>Export toolkit</p>
        <RevealHeading text="Your export price, worked out live." accent={['live.']} className="mt-3 text-3xl sm:text-5xl font-black tracking-[-0.03em] text-slate-900 text-center max-w-3xl mx-auto" />
        <p className="mt-4 text-slate-600 text-center max-w-2xl mx-auto" data-reveal>Move the sliders. This is the same formula engine the CRM uses for your price sheet.</p>

        <div className="mt-12 grid lg:grid-cols-[1fr_1fr] gap-8 items-stretch">
          <div className="rounded-3xl border border-slate-200 bg-[#f6f8fb] p-5 sm:p-8 shadow-sm" data-reveal>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Calculator size={16} className="text-emerald-600" /> Turmeric, 25 MT container</div>
              <label className="text-xs font-bold text-slate-600 flex items-center gap-2">Quote in
                <select value={cur} onChange={(e) => setCur(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-bold text-slate-900 cursor-pointer">
                  {Object.keys(EXAMPLE_FX).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-6 space-y-5">
              <Slider id="calc-price" label="Price ex plant" unit="INR / kg" min={5} max={120} step={1} value={price} onChange={setPrice} />
              <Slider id="calc-freight" label="Ocean freight" unit={`${cur} / container`} min={0} max={3000} step={50} value={freight} onChange={setFreight} />
              <Slider id="calc-profit" label="Profit" unit="%" min={0} max={20} step={0.5} value={profit} onChange={setProfit} />
            </div>
            <p className="mt-6 text-[11px] text-slate-500">Example rate 1 {cur} = {EXAMPLE_FX[cur]} INR. In the CRM, today&apos;s rate is filled in for you. Transport, customs and insurance use sample values.</p>
          </div>

          <div className="rounded-3xl bg-[#06131f] text-white p-5 sm:p-8 flex flex-col" data-reveal aria-live="polite">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.16em]">Price per ton</div>
            <div className="mt-5 space-y-5 flex-1">
              {bars.map(([k, val, g]) => (
                <div key={k}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-extrabold">{k}</span>
                    <span className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight">{money(val, cur)}</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden">
                    <div data-bar className={`h-full rounded-full bg-gradient-to-r ${g} transition-[width] duration-500 ease-out`} style={{ width: `${Math.max(4, ((val || 0) / maxV) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-2 text-[11px] sm:text-xs">
              {[[FileText, 'Quotation & proforma PDF'], [Globe2, 'Incoterms, ports, terms'], [FlaskConical, 'Product specs per buyer'], [Tags, 'Tags & bulk import']].map(([I, t]) => (
                <div key={t} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 font-semibold text-slate-200"><I size={14} className="text-amber-300 shrink-0" />{t}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 5. Team ---------- */

function Team() {
  const rows = [['Priya', 'Calls', 18, 'bg-emerald-500'], ['Priya', 'WhatsApp', 26, 'bg-emerald-400'], ['Arjun', 'Calls', 11, 'bg-sky-500'], ['Arjun', 'Emails', 34, 'bg-sky-400']];
  return (
    <section className="bg-[#f6f8fb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-20 sm:py-28 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600 uppercase" data-reveal>For the owner</p>
          <RevealHeading text="Know what your team did today." accent={['today.']} className="mt-3 text-3xl sm:text-5xl font-black tracking-[-0.03em] text-slate-900" />
          <ul className="mt-6 space-y-3" data-reveal>
            {[[Users, 'Staff logins with the sections you allow'], [ClipboardCheck, 'Daily report at 7 PM: calls, remarks, follow-ups'], [Smartphone, 'Install on the phone, reminders even when closed'], [CheckCircle2, 'Every activity counted per person, per day']].map(([I, t]) => (
              <li key={t} className="flex items-center gap-3 text-sm sm:text-base text-slate-700"><span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0"><I size={16} /></span>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-8 shadow-sm" data-reveal>
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900">Outreach today</div>
            <div className="text-[11px] font-semibold text-slate-400">Sample</div>
          </div>
          <div className="mt-6 space-y-4">
            {rows.map(([who, what, n, c]) => (
              <div key={who + what}>
                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{who} · {what}</span><span className="tabular-nums font-extrabold text-slate-900">{n}</span></div>
                <div className="mt-1.5 h-2.5 rounded-full bg-slate-100 overflow-hidden"><div data-bar className={`h-full rounded-full ${c}`} style={{ width: `${(n / 34) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ onRegisterClick, onLoginClick }) {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(100%_120%_at_50%_0%,#0e3350,#040f1a)] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
        <RevealHeading text="Bring every buyer into one place today." accent={['today.']} className="text-3xl sm:text-5xl font-black tracking-[-0.03em]" />
        <p className="mt-4 text-slate-300" data-reveal>Sign up in a minute. Add your team the same day.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center" data-reveal>
          <button type="button" onClick={onRegisterClick} className="px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#04201a] font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer">Start free <ArrowRight size={16} /></button>
          <button type="button" onClick={onLoginClick} className="px-7 py-3.5 rounded-xl border border-white/20 hover:bg-white/5 font-bold text-sm cursor-pointer">Sign in</button>
        </div>
      </div>
    </section>
  );
}

/** Everything between the top bar and the product video. */
export default function LandingStory({ onRegisterClick }) {
  const root = useRef(null);
  useEffect(() => startLandingMotion(root.current), []);
  return (
    <div ref={root}>
      <Hero onRegisterClick={onRegisterClick} />
      <Journey />
      <Channels />
      <Toolkit />
      <Team />
    </div>
  );
}
