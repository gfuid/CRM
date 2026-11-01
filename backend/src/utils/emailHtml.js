/**
 * Cleans HTML written in the email editor before it is saved or sent.
 * Owners write their own emails, but a pasted page can carry scripts, forms or tracking frames:
 * those are removed, and links/images may only use http(s) and mailto/tel.
 */
const DROP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'noscript', 'template', 'head', 'title', 'frameset', 'frame', 'applet'];
const DROP_TAG_ONLY = ['form', 'input', 'button', 'textarea', 'select', 'option', 'meta', 'link', 'base', 'html', 'body', '!doctype'];

const SAFE_URL = /^(https?:|mailto:|tel:|#|\/api\/v1\/email\/images\/)/i;

const cleanUrlAttr = (match, name, quote, value) => {
  const v = String(value || '').trim().replace(/[\u0000-\u001f\s]+/g, '');
  return SAFE_URL.test(v) || v === '' ? match : '';
};

const sanitizeEmailHtml = (input) => {
  let html = String(input || '');
  // comments (can hide conditional code)
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of DROP_WITH_CONTENT) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '');
    html = html.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }
  for (const tag of DROP_TAG_ONLY) {
    const t = tag.replace('!', '\\!');
    html = html.replace(new RegExp(`<\\/?${t}\\b[^>]*>`, 'gi'), '');
  }
  // event handlers: onclick=, onerror= ... (quoted or not)
  html = html.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // href / src / background / action / formaction / xlink:href: only safe schemes
  html = html.replace(/\s(href|src|background|action|formaction|xlink:href|poster|srcset)\s*=\s*(["'])([\s\S]*?)\2/gi, cleanUrlAttr);
  html = html.replace(/\s(href|src|background|action|formaction|xlink:href|poster|srcset)\s*=\s*([^\s"'>]+)/gi, (m, n, v) => cleanUrlAttr(m, n, '', v));
  // dangerous CSS
  html = html.replace(/style\s*=\s*(["'])([\s\S]*?)\1/gi, (m, q, css) => {
    if (/expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|url\s*\(\s*['"]?\s*(?!https?:)/i.test(css)) return '';
    return m;
  });
  return html.trim();
};

/** Plain-text version of an HTML email (for the text/plain part). */
const htmlToText = (html) =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => `${text.replace(/<[^>]+>/g, '')} (${href})`)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

module.exports = { sanitizeEmailHtml, htmlToText };
