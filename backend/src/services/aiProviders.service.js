/**
 * The company's OWN AI accounts (the platform keeps no AI key): writing posts and making pictures.
 *   openai    - text + pictures   (api.openai.com)
 *   gemini    - text + pictures   (Google Gemini API)
 *   anthropic - text only         (Claude, through the official Anthropic SDK)
 *   xai       - text + pictures   (Grok)
 * Base URLs can point to a fake server in tests (AI_OPENAI_BASE, AI_GEMINI_BASE, AI_XAI_BASE, AI_ANTHROPIC_BASE).
 */
const AnthropicSDK = require('@anthropic-ai/sdk');

const Anthropic = AnthropicSDK.default || AnthropicSDK;

const PROVIDERS = {
  openai: { label: 'OpenAI (ChatGPT)', text: true, image: true, text_model: 'gpt-4.1-mini', image_model: 'gpt-image-1', keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys' },
  gemini: { label: 'Google Gemini', text: true, image: true, text_model: 'gemini-2.5-flash', image_model: 'gemini-2.5-flash-image', keyHint: 'AIza…', keyUrl: 'https://aistudio.google.com/apikey' },
  anthropic: { label: 'Anthropic (Claude)', text: true, image: false, text_model: 'claude-opus-5-5', image_model: '', keyHint: 'sk-ant-…', keyUrl: 'https://platform.claude.com/settings/keys' },
  xai: { label: 'xAI (Grok)', text: true, image: true, text_model: 'grok-4.3', image_model: 'grok-2-image', keyHint: 'xai-…', keyUrl: 'https://console.x.ai' },
};

const base = (name, dflt) => (process.env[name] || dflt).replace(/\/$/, '');
const openaiBase = () => base('AI_OPENAI_BASE', 'https://api.openai.com/v1');
const geminiBase = () => base('AI_GEMINI_BASE', 'https://generativelanguage.googleapis.com/v1beta');
const xaiBase = () => base('AI_XAI_BASE', 'https://api.x.ai/v1');

// Claude models that accept server-side refusal fallbacks ("default" routing)
const FALLBACK_MODELS = new Set(['claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);

const friendly = (provider, status, msg) => {
  const label = (PROVIDERS[provider] || {}).label || provider;
  if (status === 401 || status === 403) return `${label}: the API key was not accepted. Check the key in Social Media → AI settings.`;
  if (status === 429) return `${label}: limit or credit reached on your account. Try again later or add credit.`;
  if (status === 404) return `${label}: the model name was not found. Check the model in AI settings.`;
  return `${label}: ${String(msg || 'the AI service did not answer').slice(0, 200)}`;
};

const postJson = async (provider, url, headers, body, timeoutMs = 90000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
      const e = data && (data.error || data);
      const err = new Error(friendly(provider, res.status, (e && (e.message || e.error)) || res.statusText));
      err.status = res.status;
      throw err;
    }
    return data || {};
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(friendly(provider, 0, 'did not answer in time'));
    if (!err.status && /fetch failed|ENOTFOUND|ECONNREFUSED/i.test(err.message)) throw new Error(friendly(provider, 0, 'could not be reached'));
    throw err;
  } finally {
    clearTimeout(t);
  }
};

/* ---------------- Text ---------------- */

const openAiStyleText = async (provider, root, key, model, system, prompt) => {
  const d = await postJson(provider, `${root}/chat/completions`, { Authorization: `Bearer ${key}` }, {
    model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
  });
  return String(((d.choices || [])[0] || {}).message?.content || '');
};

const geminiText = async (key, model, system, prompt) => {
  const d = await postJson('gemini', `${geminiBase()}/models/${encodeURIComponent(model)}:generateContent`, { 'x-goog-api-key': key }, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  return ((((d.candidates || [])[0] || {}).content || {}).parts || []).map((p) => p.text || '').join('');
};

const anthropicText = async (key, model, system, prompt) => {
  const client = new Anthropic({ apiKey: key, ...(process.env.AI_ANTHROPIC_BASE ? { baseURL: process.env.AI_ANTHROPIC_BASE } : {}), maxRetries: 1, timeout: 90000 });
  const params = { model, max_tokens: 16000, system, messages: [{ role: 'user', content: prompt }] };
  let response;
  try {
    response = FALLBACK_MODELS.has(model)
      ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await client.messages.create(params);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw new Error(friendly('anthropic', 401));
    if (error instanceof Anthropic.NotFoundError) throw new Error(friendly('anthropic', 404));
    if (error instanceof Anthropic.RateLimitError) throw new Error(friendly('anthropic', 429));
    if (error instanceof Anthropic.APIError) throw new Error(friendly('anthropic', error.status, error.message));
    throw new Error(friendly('anthropic', 0, 'could not be reached'));
  }
  if (response.stop_reason === 'refusal') throw new Error('Claude declined to write this post. Change the topic or wording and try again.');
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
};

const generateText = async (provider, key, model, system, prompt) => {
  const m = model || PROVIDERS[provider].text_model;
  if (provider === 'openai') return openAiStyleText('openai', openaiBase(), key, m, system, prompt);
  if (provider === 'xai') return openAiStyleText('xai', xaiBase(), key, m, system, prompt);
  if (provider === 'gemini') return geminiText(key, m, system, prompt);
  if (provider === 'anthropic') return anthropicText(key, m, system, prompt);
  throw new Error('Unknown AI provider');
};

/* ---------------- Pictures ---------------- */

/** Returns { mime, data (base64) }. */
const generateImage = async (provider, key, model, prompt) => {
  const m = model || PROVIDERS[provider].image_model;
  if (provider === 'openai' || provider === 'xai') {
    const root = provider === 'openai' ? openaiBase() : xaiBase();
    const body = provider === 'openai' ? { model: m, prompt, size: '1024x1024', n: 1 } : { model: m, prompt, n: 1, response_format: 'b64_json' };
    const d = await postJson(provider, `${root}/images/generations`, { Authorization: `Bearer ${key}` }, body, 180000);
    const item = (d.data || [])[0] || {};
    if (item.b64_json) return { mime: 'image/png', data: item.b64_json };
    if (item.url) {
      const r = await fetch(item.url);
      if (!r.ok) throw new Error(friendly(provider, r.status, 'the picture could not be downloaded'));
      return { mime: r.headers.get('content-type') || 'image/png', data: Buffer.from(await r.arrayBuffer()).toString('base64') };
    }
    throw new Error(friendly(provider, 0, 'no picture came back'));
  }
  if (provider === 'gemini') {
    const d = await postJson('gemini', `${geminiBase()}/models/${encodeURIComponent(m)}:generateContent`, { 'x-goog-api-key': key }, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }, 180000);
    const part = ((((d.candidates || [])[0] || {}).content || {}).parts || []).find((p) => p.inlineData || p.inline_data);
    const inline = part && (part.inlineData || part.inline_data);
    if (!inline || !inline.data) throw new Error(friendly('gemini', 0, 'no picture came back (try another description)'));
    return { mime: inline.mimeType || inline.mime_type || 'image/png', data: inline.data };
  }
  throw new Error(`${(PROVIDERS[provider] || {}).label || provider} cannot make pictures. Choose OpenAI, Gemini or xAI for pictures.`);
};

/** A tiny request to check that the key works. */
const testKey = async (provider, key, model) => {
  const out = await generateText(provider, key, model, 'Reply with the single word OK.', 'Say OK');
  return String(out || '').trim().slice(0, 40) || 'OK';
};

module.exports = { PROVIDERS, generateText, generateImage, testKey };
