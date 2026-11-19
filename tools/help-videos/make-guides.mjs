/**
 * Makes the step-by-step PDF guides in frontend/public/guides/ (WhatsApp Marketing, AI Calling, Email Marketing).
 * 1. Seeds two demo companies on a LOCAL backend (one not connected yet, one connected to the fake Meta / ElevenLabs)
 * 2. Takes screenshots of the CRM screens
 * 3. Fills tools/help-videos/guides/*.html with them and prints each one to PDF with Chrome
 *
 *   PWCORE=<playwright-core> SERVE_URL=http://localhost:5192 node tools/help-videos/make-guides.mjs
 * Needs: crm-backend-local on :5000 (WA_GRAPH_BASE / ELEVENLABS_API_URL pointing at the fakes) and the built CRM on SERVE_URL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { seedDemoCompany } from './seed.mjs';
import { startFakeMeta } from './fake-meta.mjs';
import { startFakeElevenLabs } from './fake-elevenlabs.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PWCORE);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const API = process.env.API || 'http://localhost:5000/api/v1';
const APP = process.env.SERVE_URL || 'http://localhost:5192';
const OUT = path.join(ROOT, 'frontend/public/guides');
const SHOTS = path.join(here, '__rec/guide-shots');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const meta = await startFakeMeta(Number(process.env.FAKE_META_PORT || 5099));
const eleven = await startFakeElevenLabs(Number(process.env.FAKE_ELEVEN_PORT || 5098));
const fresh = await seedDemoCompany(API, { wa: 'setup', ai: 'setup', email: 'setup' });
const full = await seedDemoCompany(API, { wa: 'full', ai: 'full' });

const browser = await chromium.launch({ channel: 'chrome' });
const shots = {};
const errors = [];
async function session(token) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('crm_token', t); localStorage.setItem('crm_tour_skip', '1'); localStorage.setItem('crm_active_tab', 'analytics'); } catch {} }, token);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(APP);
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const nav = async (page, tab) => { await page.locator(`[data-tour="nav-${tab}"]`).filter({ visible: true }).first().click(); await page.waitForTimeout(1500); };
const tab = async (page, name) => { await page.getByRole('tab', { name }).click(); await page.waitForTimeout(1200); };
async function shot(page, name, locator) {
  const file = path.join(SHOTS, `${name}.jpg`);
  try {
    const el = locator ? page.locator(locator).first() : null;
    if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: file, type: 'jpeg', quality: 80 }); }
    else await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
    shots[name] = `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
  } catch (e) { errors.push(`${name}: ${e.message.split('\n')[0]}`); }
}

// ---- Not connected yet ----
{
  const { ctx, page } = await session(fresh.owner);
  await nav(page, 'whatsapp');
  await shot(page, 'wa-menu', null);
  await shot(page, 'wa-setup-empty', '[data-wa-setup] > div:first-child');
  await nav(page, 'aicalls');
  await shot(page, 'ai-setup-empty', '[data-ai-setup] > div:first-child');
  await nav(page, 'email');
  await shot(page, 'email-setup', '[data-sender-setup]');
  await ctx.close();
}
// ---- Connected ----
{
  const { ctx, page } = await session(full.owner);
  await nav(page, 'whatsapp');
  await shot(page, 'wa-dashboard', '[data-wa-dashboard]');
  await tab(page, /Setup/);
  await shot(page, 'wa-setup-connected', '[data-wa-setup] > div:first-child');
  await shot(page, 'wa-webhook', '[data-wa-setup] > div:nth-child(2)');
  await shot(page, 'wa-rates', '[data-wa-rates]');
  await tab(page, /Templates/);
  await shot(page, 'wa-templates', null);
  await page.getByRole('button', { name: /New template/ }).click();
  await page.waitForTimeout(800);
  const ed = page.locator('[data-wa-template-editor]');
  await ed.getByLabel('Template name').fill('maize_offer');
  await ed.getByLabel('Template message').fill('Hello {{1}}, we have fresh {{2}} for loading this month. Reply PRICE for our CIF price.');
  await page.waitForTimeout(500);
  await shot(page, 'wa-template-editor', '[data-wa-template-editor]');
  await ed.getByRole('button', { name: /Cancel/ }).first().click();
  await tab(page, /New broadcast/);
  const nb = page.locator('[data-wa-new-broadcast]');
  await nb.locator('input').first().fill('Turmeric offer – December');
  const tplVal = await nb.getByLabel('Template').evaluate((sel) => ([...sel.options].find((x) => /turmeric_offer/.test(x.textContent)) || {}).value);
  if (tplVal) await nb.getByLabel('Template').selectOption(tplVal);
  await page.waitForTimeout(600);
  const vars = nb.locator('input[placeholder="Same text for everyone"]');
  if (await vars.count()) await vars.first().fill('turmeric');
  await nb.getByRole('button', { name: /turmeric-buyer/ }).first().click().catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'wa-new-broadcast', '[data-wa-new-broadcast] >> xpath=..');
  await tab(page, /Broadcasts/);
  await shot(page, 'wa-broadcasts', '[data-wa-campaign]');
  await tab(page, /Chats/);
  await page.locator('[data-wa-chat]', { hasText: 'Ahmed' }).first().click();
  await page.waitForTimeout(1200);
  await shot(page, 'wa-chats', '[data-wa-thread] >> xpath=..');
  await tab(page, /Automation/);
  await shot(page, 'wa-automation', '[data-wa-automation]');

  await nav(page, 'aicalls');
  await shot(page, 'ai-dashboard', '[data-ai-dashboard]');
  await tab(page, /Setup/);
  await shot(page, 'ai-setup-connected', '[data-ai-setup] > div:first-child');
  await shot(page, 'ai-numbers', '[data-ai-numbers]');
  await shot(page, 'ai-script', '[data-ai-script]');
  await tab(page, /Campaigns/);
  await page.getByRole('button', { name: /New campaign/ }).click();
  await page.waitForTimeout(800);
  await page.locator('[data-ai-new-campaign]').getByRole('button', { name: /old-list/ }).first().click().catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, 'ai-new-campaign', '[data-ai-new-campaign]');
  await page.locator('[data-ai-new-campaign]').getByLabel('Close').click();
  await page.waitForTimeout(500);
  await shot(page, 'ai-campaigns', '[data-ai-campaign]');
  await tab(page, /Calls/);
  await shot(page, 'ai-calls', '[data-ai-calls]');
  await page.locator('[data-ai-call]', { hasText: 'Interested' }).first().click();
  await page.waitForTimeout(1500);
  await shot(page, 'ai-call-detail', '[data-ai-call-detail]');
  await ctx.close();
}

// ---- Fill the HTML guides and print them ----
const css = fs.readFileSync(path.join(here, 'guides/guide.css'), 'utf8');
const made = [];
for (const file of fs.readdirSync(path.join(here, 'guides')).filter((f) => f.endsWith('.html'))) {
  let html = fs.readFileSync(path.join(here, 'guides', file), 'utf8');
  html = html.replace('/*CSS*/', css).replace(/\{\{shot:([a-z0-9-]+)\}\}/g, (m, name) => {
    if (!shots[name]) { errors.push(`${file}: missing screenshot ${name}`); return ''; }
    return shots[name];
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdf = path.join(OUT, file.replace(/\.html$/, '.pdf'));
  await page.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '16mm', left: '13mm', right: '13mm' },
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8px;color:#94a3b8;width:100%;text-align:center;font-family:Segoe UI,Arial">Travel-Trade CRM · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' });
  const pages = (fs.readFileSync(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  made.push(`${path.basename(pdf)}: ${pages} pages, ${Math.round(fs.statSync(pdf).size / 1024)} KB`);
  await page.close();
}
await browser.close();
meta.close(); eleven.close();
console.log(made.join('\n'));
if (errors.length) { console.log('PROBLEMS:\n' + [...new Set(errors)].join('\n')); process.exitCode = 1; }
