/**
 * Test cases for help video links (frontend/src/data/videoEmbed.js): which links play inside the CRM,
 * which open in a new tab, and which are refused.
 * Run:  npm --prefix frontend run test:videos
 */
import fs from 'node:fs';
import { toPlayable } from '../src/data/videoEmbed.js';
import { BUILTIN_HELP_VIDEOS } from '../src/data/builtinHelpVideos.js';
import { HELP_GUIDES_PDF } from '../src/data/helpGuidesPdf.js';

const results = [];
const rec = (id, scenario, expected, actual, pass) => results.push({ id, scenario, expected, actual: String(actual), result: pass ? 'PASS' : 'FAIL' });
const check = (id, scenario, url, kind, srcPart) => {
  const p = toPlayable(url);
  rec(id, scenario, `${kind}${srcPart ? ' ' + srcPart : ''}`, `${p.kind} ${p.src || ''}`, p.kind === kind && (!srcPart || String(p.src).includes(srcPart)));
};

check('VID-01', 'YouTube watch link', 'https://www.youtube.com/watch?v=abc123XYZ_-&t=10s', 'iframe', 'youtube-nocookie.com/embed/abc123XYZ_-');
check('VID-02', 'YouTube short link', 'https://youtu.be/abc123XYZ_-', 'iframe', '/embed/abc123XYZ_-');
check('VID-03', 'YouTube Shorts link', 'https://youtube.com/shorts/abc123XYZ_-', 'iframe', '/embed/abc123XYZ_-');
check('VID-04', 'YouTube embed link', 'https://www.youtube.com/embed/abc123XYZ_-', 'iframe', '/embed/abc123XYZ_-');
check('VID-05', 'Vimeo link', 'https://vimeo.com/76979871', 'iframe', 'player.vimeo.com/video/76979871');
check('VID-06', 'Google Drive file link', 'https://drive.google.com/file/d/1AbC-dEf_GhI/view?usp=sharing', 'iframe', 'drive.google.com/file/d/1AbC-dEf_GhI/preview');
check('VID-07', 'Google Drive open?id= link', 'https://drive.google.com/open?id=1AbC-dEf_GhI', 'iframe', '/file/d/1AbC-dEf_GhI/preview');
check('VID-08', 'Loom share link', 'https://www.loom.com/share/0a1b2c3d4e5f', 'iframe', 'loom.com/embed/0a1b2c3d4e5f');
check('VID-09', 'Direct .mp4 file', 'https://cdn.example.com/help/import.mp4?x=1', 'video', 'import.mp4');
check('VID-10', 'A file on our own site', '/videos/crm-walkthrough.mp4', 'video', '/videos/crm-walkthrough.mp4');
check('VID-11', 'Any other page opens in a new tab', 'https://example.com/some-page', 'link', 'example.com/some-page');
check('VID-12', 'YouTube channel page (no video id) opens in a new tab', 'https://www.youtube.com/@somechannel', 'link');
check('VID-13', 'javascript: link is refused', 'javascript:alert(1)', 'none');
check('VID-14', 'data: link is refused', 'data:text/html,<script>alert(1)</script>', 'none');
check('VID-15', 'Empty link is refused', '', 'none');
check('VID-16', 'Text that is not a link is refused', 'watch this video', 'none');
{
  const p = toPlayable('https://youtu.be/abc123XYZ_-');
  rec('VID-17', 'YouTube videos get a thumbnail picture', 'i.ytimg.com/vi/<id>', p.thumb, String(p.thumb).includes('i.ytimg.com/vi/abc123XYZ_-/'));
}

// Every built-in video and PDF guide in the Help section has its file in public/
{
  const pub = new URL('../public', import.meta.url);
  const missing = [
    ...BUILTIN_HELP_VIDEOS.flatMap((v) => [v.url, v.poster]),
    ...HELP_GUIDES_PDF.map((g) => g.url),
  ].filter((u) => !fs.existsSync(new URL('.' + u, pub + '/')));
  rec('VID-18', 'Every built-in help video, poster and PDF guide file exists', 'none missing', missing.join(', ') || 'none missing', missing.length === 0);
  const pdfOk = HELP_GUIDES_PDF.every((g) => { try { return fs.readFileSync(new URL('.' + g.url, pub + '/')).subarray(0, 5).toString() === '%PDF-'; } catch { return false; } });
  rec('VID-19', 'The PDF guides are real PDF files', '%PDF-', pdfOk ? '%PDF-' : 'not a PDF', pdfOk);
}

const fails = results.filter((x) => x.result === 'FAIL');
console.table(results.map((x) => ({ ...x, expected: x.expected.slice(0, 50), actual: x.actual.slice(0, 70) })));
console.log(`HELP VIDEO LINKS: ${results.length - fails.length} PASSED | ${fails.length} FAILED | TOTAL: ${results.length}`);
process.exit(fails.length ? 1 : 0);
