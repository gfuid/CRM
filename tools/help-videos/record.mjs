/**
 * Records the built-in help videos from a demo company.
 *
 *   1. Run the backend locally in memory (no MONGODB_URI) on :5000 with CORS_ORIGIN=http://localhost:5192
 *   2. Build the frontend with `vite build --mode localpreview` and serve it on :5192 (static-server.mjs)
 *   3. PWCORE=<path to playwright-core> node tools/help-videos/record.mjs [--only id,id]
 *
 * Output: frontend/public/videos/help/<file>.mp4 + <file>.jpg (poster).
 * Playwright records WebM; Google Chrome then re-encodes it to H.264 MP4 so it plays on iPhone / iPad too.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { seedDemoCompany } from './seed.mjs';
import { SCENES } from './scenes.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PWCORE || 'playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const { BUILTIN_HELP_VIDEOS } = await import(pathToFileURL(path.join(here, '../../frontend/src/data/builtinHelpVideos.js')).href);

const API = process.env.API || 'http://localhost:5000/api/v1';
const APP = process.env.APP || 'http://localhost:5192/';
const SERVE_DIR = process.env.SERVE_DIR; // the folder static-server.mjs serves (for the MP4 step)
const OUT = path.join(here, '../../frontend/public/videos/help');
const TMP = path.join(SERVE_DIR || here, '__rec');
const SIZE = { width: 1280, height: 720 };
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

// ---------- on-screen layer: caption, title card, cursor, highlight ----------
const OVERLAY = () => {
  const css = `
  #__rec{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:Inter,system-ui,sans-serif}
  #__rec .cur{position:absolute;left:640px;top:360px;width:26px;height:26px;transition:left .65s cubic-bezier(.3,.7,.3,1),top .65s cubic-bezier(.3,.7,.3,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
  #__rec .ring{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #10b981;opacity:0;transform:scale(.4)}
  #__rec .ring.go{animation:__ring .55s ease-out}
  @keyframes __ring{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(1.35)}}
  #__rec .hl{position:absolute;border:3px solid #10b981;border-radius:12px;box-shadow:0 0 0 4000px rgba(15,23,42,.28),0 0 18px rgba(16,185,129,.55);opacity:0;transition:all .35s ease}
  #__rec .cap{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);max-width:86%;padding:12px 22px;border-radius:14px;background:rgba(15,23,42,.92);color:#fff;font-size:21px;font-weight:600;line-height:1.35;text-align:center;opacity:0;transition:opacity .25s ease;box-shadow:0 8px 30px rgba(0,0,0,.3)}
  #__rec .card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:linear-gradient(135deg,#064e3b,#047857 55%,#0f766e);color:#fff;opacity:0;transition:opacity .35s ease;text-align:center;padding:40px}
  #__rec .card .t{font-size:44px;font-weight:800;max-width:1000px;line-height:1.15}
  #__rec .card .s{font-size:22px;font-weight:500;opacity:.9;max-width:900px}
  #__rec .card .b{font-size:15px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.75}`;
  const ensure = () => {
    let root = document.getElementById('__rec');
    if (root) return root;
    const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st);
    root = document.createElement('div'); root.id = '__rec';
    root.innerHTML = '<div class="hl"></div><div class="card"><div class="b"></div><div class="t"></div><div class="s"></div></div><div class="cap"></div><svg class="cur" viewBox="0 0 24 24"><path d="M4 2l16 9.5-7 1.6 4 7.4-3 1.6-4-7.5L4 19z" fill="#fff" stroke="#0f172a" stroke-width="1.6" stroke-linejoin="round"/></svg><div class="ring"></div>';
    document.documentElement.appendChild(root);
    return root;
  };
  window.__rec = {
    move(x, y) { const c = ensure().querySelector('.cur'); c.style.left = `${x}px`; c.style.top = `${y}px`; },
    ring(x, y) { const r = ensure().querySelector('.ring'); r.style.left = `${x}px`; r.style.top = `${y}px`; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); },
    cap(text) { const c = ensure().querySelector('.cap'); if (text) { c.textContent = text; c.style.opacity = '1'; } else c.style.opacity = '0'; },
    hl(r) { const h = ensure().querySelector('.hl'); if (!r) { h.style.opacity = '0'; return; } const p = 6; Object.assign(h.style, { left: `${r.x - p}px`, top: `${r.y - p}px`, width: `${r.width + 2 * p}px`, height: `${r.height + 2 * p}px`, opacity: '1' }); },
    card(b, t, s) { const k = ensure().querySelector('.card'); if (!t) { k.style.opacity = '0'; return; } k.querySelector('.b').textContent = b || ''; k.querySelector('.t').textContent = t; k.querySelector('.s').textContent = s || ''; k.style.opacity = '1'; },
  };
  document.addEventListener('DOMContentLoaded', ensure);
};

// ---------- helpers a scene uses ----------
const makeKit = (page, demo) => {
  const wait = (ms) => page.waitForTimeout(ms);
  const readMs = (text) => Math.max(2300, Math.round(String(text).split(/\s+/).length * 340));
  const box = async (loc) => {
    await loc.scrollIntoViewIfNeeded({ timeout: 6000 }).catch(() => {});
    await wait(250);
    try {
      return await loc.boundingBox({ timeout: 8000 });
    } catch (e) {
      throw new Error(`${loc} -> ${e.message.split('\n')[0]}`);
    }
  };
  const kit = {
    page, demo, wait,
    async say(text, ms) { await page.evaluate((t) => window.__rec.cap(t), text); await wait(ms || readMs(text)); },
    async hush() { await page.evaluate(() => window.__rec.cap(null)); },
    async card(badge, title, sub, ms = 3200) { await page.evaluate(([b, t, s]) => window.__rec.card(b, t, s), [badge, title, sub]); await wait(ms); await page.evaluate(() => window.__rec.card()); await wait(400); },
    async point(loc) {
      const b = await box(loc);
      if (!b) throw new Error(`not on screen: ${loc}`);
      const x = b.x + Math.min(b.width / 2, 60); const y = b.y + b.height / 2;
      await page.evaluate(([px, py]) => window.__rec.move(px, py), [x, y]);
      await wait(700);
      return { x, y, b };
    },
    async click(loc, after = 900) {
      const { x, y } = await kit.point(loc);
      await page.evaluate(([px, py]) => window.__rec.ring(px, py), [x, y]);
      await wait(250);
      try {
        await loc.click({ timeout: 6000 });
      } catch (e) {
        throw new Error(`click ${loc} -> ${e.message.split('\n')[0]}`);
      }
      await wait(after);
    },
    async type(loc, text) {
      await kit.click(loc, 250);
      await loc.pressSequentially(text, { delay: 38 });
      await wait(450);
    },
    async spot(loc, text, ms) {
      const { b } = await kit.point(loc);
      await page.evaluate((r) => window.__rec.hl(r), b);
      if (text) await kit.say(text, ms); else await wait(ms || 1500);
      await page.evaluate(() => window.__rec.hl(null));
      await wait(250);
    },
    // The menu exists twice (sidebar + phone bottom bar): always use the one on screen
    vis: (selector) => page.locator(selector).filter({ visible: true }).first(),
    nav: (tab) => kit.click(kit.vis(`[data-tour="nav-${tab}"]`), 1600),
    modal: () => page.locator('.fixed.inset-0').last(),
    byPh: (ph, scope) => (scope || page).locator(`[placeholder^="${ph}"]`).first(),
  };
  return kit;
};

// ---------- WebM -> H.264 MP4 in Google Chrome (no ffmpeg needed) ----------
// Chrome plays the WebM, WebCodecs encodes each frame as H.264 (baseline, plays on iPhone/iPad),
// and mp4-muxer writes a normal MP4 with the index at the start (correct length, seekable, fast start).
const MUXER_JS = process.env.MUXER_JS; // path to mp4-muxer/build/mp4-muxer.js
const BITRATE = Number(process.env.BITRATE) || 700000;
async function toMp4(webmName) {
  if (!MUXER_JS) throw new Error('Set MUXER_JS to mp4-muxer/build/mp4-muxer.js');
  fs.copyFileSync(MUXER_JS, path.join(TMP, 'mp4-muxer.js'));
  fs.writeFileSync(path.join(TMP, 'transcode.html'), '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000"><script src="mp4-muxer.js"></script></body>');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ acceptDownloads: true });
  await page.goto(`${APP}__rec/transcode.html`);
  const download = page.waitForEvent('download', { timeout: 15 * 60 * 1000 });
  const info = await page.evaluate(async ({ src, bitrate }) => {
   try {
    const v = document.createElement('video');
    v.src = src; v.muted = true; v.playsInline = true; document.body.appendChild(v);
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('video load failed')); });
    const width = v.videoWidth; const height = v.videoHeight;
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width, height }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
    let encError = null;
    // Chrome leaves colorSpace empty for canvas frames; the muxer needs it, so give the standard HD one
    const BT709 = { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false };
    const enc = new VideoEncoder({
      output: (chunk, meta) => {
        try {
          const dc = meta && meta.decoderConfig ? { ...meta.decoderConfig, colorSpace: meta.decoderConfig.colorSpace || BT709 } : null;
          muxer.addVideoChunk(chunk, dc ? { decoderConfig: dc } : undefined);
        } catch (e) { encError = encError || e; }
      },
      error: (e) => { encError = e; },
    });
    enc.configure({ codec: 'avc1.42001f', width, height, bitrate, framerate: 25, avc: { format: 'avc' } });
    let last = -1; let n = 0;
    const done = new Promise((res) => { v.onended = res; });
    // Headless Chrome cannot make a VideoFrame straight from <video>; copy each frame through a canvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx2d = canvas.getContext('2d');
    // Headless Chrome does not fire requestVideoFrameCallback, so sample the playing video ~50 times a second
    // and keep one frame per 40 ms of video time (25 fps).
    const grab = () => {
      const ts = Math.round(v.currentTime * 1e6);
      if (ts >= last + 40000 || last < 0) {
        ctx2d.drawImage(v, 0, 0, width, height);
        const frame = new VideoFrame(canvas, { timestamp: ts, duration: 40000 });
        enc.encode(frame, { keyFrame: n % 75 === 0 });
        frame.close();
        last = ts; n += 1;
      }
    };
    await v.play();
    while (!v.ended) { grab(); await new Promise((r) => setTimeout(r, 20)); }
    await done;
    await enc.flush();
    if (encError) throw new Error(`encoder: ${encError.message} (frames ${n})`);
    muxer.finalize();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([muxer.target.buffer], { type: 'video/mp4' }));
    a.download = 'out.mp4';
    document.body.appendChild(a);
    a.click();
    return { frames: n, seconds: last / 1e6, width, height };
   } catch (e) { throw new Error(`MP4 step failed: ${e && e.stack ? e.stack : e}`); }
  }, { src: `${APP}__rec/${webmName}`, bitrate: BITRATE });
  const d = await download;
  const target = path.join(TMP, webmName.replace(/\.webm$/, '.mp4'));
  await d.saveAs(target);
  await browser.close();
  return { target, ...info };
}

// ---------- run ----------
// --convert-only: skip recording and turn the WebM files already in __rec into MP4 again
const convertOnly = process.argv.includes('--convert-only');
const browser = await chromium.launch({ headless: true });
const results = [];
if (convertOnly) {
  for (const meta of BUILTIN_HELP_VIDEOS) {
    if ((!only.length || only.includes(meta.file)) && fs.existsSync(path.join(TMP, `${meta.file}.webm`))) results.push({ file: meta.file, failed: null });
  }
}
for (const meta of convertOnly ? [] : BUILTIN_HELP_VIDEOS) {
  if (only.length && !only.includes(meta.file)) continue;
  const scene = SCENES[meta.file];
  if (!scene) { console.log(`skip ${meta.file}: no scene`); continue; }
  const demo = await seedDemoCompany(API, scene.seed || {});
  const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: TMP, size: SIZE }, acceptDownloads: true });
  await ctx.addInitScript((t) => {
    try { localStorage.setItem('crm_token', t); localStorage.removeItem('crm_logged_out'); localStorage.setItem('crm_tour_skip', '1'); localStorage.setItem('crm_active_tab', 'analytics'); } catch {}
  }, demo.owner);
  await ctx.addInitScript(OVERLAY);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept(page.__answer || ''));
  const kit = makeKit(page, demo);
  const started = Date.now();
  let failed = null;
  try {
    await page.goto(APP);
    await page.waitForSelector('[data-tour="nav-leads"]', { timeout: 20000 });
    await kit.wait(1200);
    // Title card; the poster picture is taken from it
    await page.evaluate(([b, t, s]) => window.__rec.card(b, t, s), [meta.section, meta.title, meta.description]);
    await kit.wait(700);
    await page.screenshot({ path: path.join(OUT, `${meta.file}.jpg`), type: 'jpeg', quality: 78 });
    await kit.wait(2600);
    await page.evaluate(() => window.__rec.card());
    await kit.wait(400);
    await scene(kit, meta);
    await kit.hush();
    await kit.card('Need more help?', 'Search the videos in Help & Support', 'Or ask the AI assistant, or raise a ticket to the support team.', 2600);
  } catch (e) {
    failed = e.message.split('\n')[0];
    await page.screenshot({ path: path.join(TMP, `${meta.file}-failed.png`) }).catch(() => {});
  }
  const video = page.video();
  await ctx.close();
  const seconds = Math.round((Date.now() - started) / 1000);
  const webm = path.join(TMP, `${meta.file}.webm`);
  if (fs.existsSync(webm)) fs.rmSync(webm);
  fs.renameSync(await video.path(), webm);
  results.push({ file: meta.file, seconds, failed, errors: errors.slice(0, 3) });
  console.log(`${failed ? 'FAILED' : 'recorded'} ${meta.file} (${seconds}s)${failed ? ` -> ${failed}` : ''}`);
}
await browser.close();

// Poster (first frame after the title card) + MP4
for (const r of (process.env.NO_MP4 ? [] : results)) {
  if (r.failed) continue;
  const conv = await toMp4(`${r.file}.webm`);
  fs.copyFileSync(conv.target, path.join(OUT, `${r.file}.mp4`));
  r.frames = conv.frames;
  r.mp4Seconds = Math.round(conv.seconds);
  const mb = (fs.statSync(path.join(OUT, `${r.file}.mp4`)).size / 1024 / 1024).toFixed(1);
  const s = r.mp4Seconds;
  console.log(`mp4 ${r.file}: ${mb} MB, ${r.frames} frames, length ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
}
console.log(JSON.stringify(results, null, 1));
