/**
 * WhatsApp Business Cloud API (Meta Graph API) calls used by WhatsApp marketing.
 * Each company connects its own WhatsApp Business account; we only call Meta with that company's token.
 * WA_GRAPH_BASE can point to a fake server in tests.
 */
const graphBase = () => (process.env.WA_GRAPH_BASE || 'https://graph.facebook.com/v21.0').replace(/\/$/, '');

/** Meta's own error text, made readable. */
const graphError = (body, status) => {
  const e = (body && body.error) || {};
  const msg = e.error_user_msg || e.message || `WhatsApp server answered ${status}`;
  const err = new Error(msg);
  err.status = status;
  err.code = e.code;
  err.details = e.error_data && e.error_data.details;
  return err;
};

const call = async (method, path, token, { json, query, headers = {}, body, timeoutMs = 15000 } = {}) => {
  const url = new URL(`${graphBase()}/${String(path).replace(/^\//, '')}`);
  Object.entries(query || {}).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: json ? JSON.stringify(json) : body,
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok || (data && data.error)) throw graphError(data, res.status);
    return data || {};
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('WhatsApp (Meta) did not answer in time. Please try again.');
    if (!err.status && /fetch failed|ENOTFOUND|ECONNREFUSED/i.test(err.message)) throw new Error('Could not reach WhatsApp (Meta). Check the internet connection and try again.');
    throw err;
  } finally {
    clearTimeout(t);
  }
};

const getPhoneNumber = (phoneId, token) =>
  call('GET', phoneId, token, { query: { fields: 'display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status' } });

const listTemplates = (wabaId, token) =>
  call('GET', `${wabaId}/message_templates`, token, { query: { limit: 200, fields: 'id,name,language,status,category,components,rejected_reason,quality_score' } });

const createTemplate = (wabaId, token, payload) => call('POST', `${wabaId}/message_templates`, token, { json: payload });

const deleteTemplate = (wabaId, token, name) => call('DELETE', `${wabaId}/message_templates`, token, { query: { name } });

/** A picture for a template header must be uploaded to Meta first (Resumable Upload API); returns the handle. */
const uploadHeaderSample = async (appId, token, buffer, mime) => {
  const session = await call('POST', `${appId}/uploads`, token, { query: { file_length: buffer.length, file_type: mime } });
  if (!session.id) throw new Error('WhatsApp did not start the picture upload');
  const done = await call('POST', session.id, token, { headers: { file_offset: '0', Authorization: `OAuth ${token}` }, body: buffer });
  if (!done.h) throw new Error('WhatsApp did not accept the picture');
  return done.h;
};

const sendMessage = (phoneId, token, payload) =>
  call('POST', `${phoneId}/messages`, token, { json: { messaging_product: 'whatsapp', recipient_type: 'individual', ...payload } });

const markRead = (phoneId, token, messageId) =>
  call('POST', `${phoneId}/messages`, token, { json: { messaging_product: 'whatsapp', status: 'read', message_id: messageId } }).catch(() => null);

module.exports = { graphBase, getPhoneNumber, listTemplates, createTemplate, deleteTemplate, uploadHeaderSample, sendMessage, markRead };
