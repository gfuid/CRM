/**
 * Landing-page motion: Lenis (the only smooth-scroll engine) driven by GSAP's ticker and wired to ScrollTrigger.
 * When the visitor's system asks for less motion (Windows "Animation effects" off sets prefers-reduced-motion),
 * the page stays lively but calm: normal scrolling (no Lenis), no parallax, and short fades instead of movement.
 * Everything starts visible in the HTML; animations only run "from" a hidden state once JS is ready.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Start smooth scroll + section reveals inside `root`. Returns a cleanup function. */
export function startLandingMotion(root) {
  if (!root) return () => {};
  const calm = prefersReducedMotion();
  const move = (v) => (calm ? 0 : v); // no travel in calm mode, only fades

  const lenis = calm ? null : new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.95 });
  const tick = (t) => lenis && lenis.raf(t * 1000);
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  // In-page links (#demo, #pricing …) glide with Lenis and stop below the sticky header
  const onClick = (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const el = id.length > 1 && document.querySelector(id);
    if (!el || !lenis) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: -72, duration: 1.2 });
  };
  document.addEventListener('click', onClick);

  const HERO_PARTS = '[data-hero-word],[data-hero-fade],[data-hero-globe],[data-hero-chip]';
  let safety = 0;
  const ctx = gsap.context(() => {
    // Hero intro: heading words, then copy, CTAs and chips. In calm mode the hero simply shows at once.
    if (!calm) {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from('[data-hero-word]', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.06 })
        .from('[data-hero-fade]', { y: 18, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.35')
        .from('[data-hero-globe]', { scale: 0.86, opacity: 0, duration: 1.2 }, 0.1)
        .from('[data-hero-chip]', { y: 14, opacity: 0, duration: 0.5, stagger: 0.12 }, '-=0.5');
      // Never leave the hero hidden: if the intro was cut short for any reason, show everything
      safety = window.setTimeout(() => {
        if (intro.progress() < 1) { intro.kill(); gsap.set(HERO_PARTS, { clearProps: 'opacity,transform' }); }
      }, 3500);
    }

    // Section headings: word by word as they come into view
    gsap.utils.toArray('[data-reveal-heading]').forEach((h) => {
      gsap.from(h.querySelectorAll('[data-word]'), {
        yPercent: move(100), opacity: 0, duration: calm ? 0.5 : 0.8, ease: 'power3.out', stagger: 0.045,
        scrollTrigger: { trigger: h, start: 'top 85%', once: true },
      });
    });
    // Supporting blocks
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: move(28), opacity: 0, duration: calm ? 0.5 : 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
    // Infographic bars grow when seen
    gsap.utils.toArray('[data-bar]').forEach((el) => {
      gsap.from(el, { scaleX: 0, transformOrigin: 'left center', duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    // Journey progress line fills with scroll (desktop layout)
    const line = root.querySelector('[data-journey-line]');
    if (line) {
      gsap.fromTo(line, { scaleY: 0 }, {
        scaleY: 1, ease: 'none', transformOrigin: 'top center',
        scrollTrigger: { trigger: '[data-journey]', start: 'top 60%', end: 'bottom 70%', scrub: 0.6 },
      });
    }
    // The globe drifts back as the hero scrolls away
    if (!calm) gsap.to('[data-hero-globe]', { yPercent: 12, scale: 0.94, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } });
  }, root);

  // Fonts and images change heights: measure again
  const refresh = () => ScrollTrigger.refresh();
  document.fonts?.ready?.then(refresh);
  window.addEventListener('load', refresh);

  return () => {
    window.clearTimeout(safety);
    document.removeEventListener('click', onClick);
    window.removeEventListener('load', refresh);
    ctx.revert();
    if (lenis) { gsap.ticker.remove(tick); lenis.destroy(); }
  };
}
