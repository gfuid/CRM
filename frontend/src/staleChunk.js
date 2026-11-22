/**
 * After a new deploy the old page files (assets/Outreach-xxxx.js …) are gone. A tab that was open before
 * then fails to load a page ("Failed to fetch dynamically imported module", or Vercel answers with the
 * HTML page: "'text/html' is not a valid JavaScript MIME type"). The fix is simply to load the new version.
 */
const STALE = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'is not a valid javascript mime type',
  'loading chunk',
  'chunkloaderror',
  'unable to preload css',
];

export const isStaleChunkError = (err) => {
  const msg = String((err && (err.message || err.reason?.message)) || err || '').toLowerCase();
  return STALE.some((s) => msg.includes(s));
};

const KEY = 'crm_chunk_reload_at';
/**
 * Reload to get the new version. At most once per 30 seconds, so a real outage cannot loop,
 * but every later deploy is handled again (the old guard allowed only one reload per session).
 * Returns false when it did not reload (then show the error).
 */
export const reloadForNewVersion = () => {
  try {
    const last = Number(sessionStorage.getItem(KEY)) || 0;
    if (Date.now() - last < 30000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* storage blocked: reload anyway */ }
  window.location.reload();
  return true;
};
