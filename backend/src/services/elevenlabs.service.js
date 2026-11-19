/**
 * ElevenLabs Agents Platform (Conversational AI) calls used by AI Calling.
 * Each company uses its own ElevenLabs account (API key + agent); the phone number is imported in
 * ElevenLabs from a SIP trunk (Vobiz, Telnyx, Plivo…) or from Twilio. The audio of a call flows
 * between the phone company and ElevenLabs; this server starts calls and reads the results.
 * ELEVENLABS_API_URL can point to a fake server in tests.
 */
const api = () => (process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io').replace(/\/$/, '');

const call = async (key, method, path, body, { raw = false, timeoutMs = 20000 } = {}) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(api() + path, {
      method,
      signal: ctrl.signal,
      headers: { 'xi-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (raw) {
      if (!res.ok) throw Object.assign(new Error(`ElevenLabs answered ${res.status}`), { status: res.status });
      return res;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const d = data.detail;
      const msg = typeof d === 'string' ? d : (d && (d.message || (Array.isArray(d) && d[0] && d[0].msg))) || `ElevenLabs answered ${res.status}`;
      throw Object.assign(new Error(msg), { status: res.status });
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('ElevenLabs did not answer in time. Please try again.');
    if (!err.status && /fetch failed|ENOTFOUND|ECONNREFUSED/i.test(err.message)) throw new Error('Could not reach ElevenLabs. Check the internet connection and try again.');
    throw err;
  } finally {
    clearTimeout(t);
  }
};

const getAgent = (key, agentId) => call(key, 'GET', `/v1/convai/agents/${encodeURIComponent(agentId)}`);
const updateAgent = (key, agentId, patch) => call(key, 'PATCH', `/v1/convai/agents/${encodeURIComponent(agentId)}`, patch);
const listPhoneNumbers = (key) => call(key, 'GET', '/v1/convai/phone-numbers');

/** Starts one outbound call. provider: 'sip_trunk' (Vobiz, Telnyx…) or 'twilio'. Returns { conversation_id }. */
const outboundCall = (key, { provider, agentId, phoneNumberId, to, variables }) => call(key, 'POST', provider === 'twilio' ? '/v1/convai/twilio/outbound-call' : '/v1/convai/sip-trunk/outbound-call', {
  agent_id: agentId,
  agent_phone_number_id: phoneNumberId,
  to_number: to,
  conversation_initiation_client_data: { dynamic_variables: variables || {} },
});

const getConversation = (key, id) => call(key, 'GET', `/v1/convai/conversations/${encodeURIComponent(id)}`);
const getAudio = (key, id) => call(key, 'GET', `/v1/convai/conversations/${encodeURIComponent(id)}/audio`, null, { raw: true, timeoutMs: 60000 });

module.exports = { api, getAgent, updateAgent, listPhoneNumbers, outboundCall, getConversation, getAudio };
