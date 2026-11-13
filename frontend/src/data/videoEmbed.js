/**
 * Turn a pasted video link into something we can play inside the CRM.
 *   YouTube / Vimeo / Google Drive / Loom -> an embedded player (iframe)
 *   .mp4 / .webm / .mov file or a path on our own site -> the browser's own video player
 *   anything else -> opened in a new tab
 */
export const toPlayable = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return { kind: 'none' };
  if (url.startsWith('/')) return { kind: 'video', src: url };
  let u;
  try { u = new URL(url); } catch { return { kind: 'none' }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { kind: 'none' };
  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be' || host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    let id = '';
    if (host === 'youtu.be') id = u.pathname.split('/')[1] || '';
    else if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
    else {
      const m = /^\/(embed|shorts|live)\/([^/?]+)/.exec(u.pathname);
      if (m) id = m[2];
    }
    if (/^[\w-]{6,20}$/.test(id)) {
      return {
        kind: 'iframe',
        src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = /(\d{6,12})/.exec(u.pathname);
    if (m) return { kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}?autoplay=1` };
  }
  if (host === 'drive.google.com') {
    const m = /\/file\/d\/([\w-]+)/.exec(u.pathname);
    const id = m ? m[1] : u.searchParams.get('id');
    if (id && /^[\w-]+$/.test(id)) return { kind: 'iframe', src: `https://drive.google.com/file/d/${id}/preview` };
  }
  if (host === 'loom.com') {
    const m = /\/(share|embed)\/([\w-]+)/.exec(u.pathname);
    if (m) return { kind: 'iframe', src: `https://www.loom.com/embed/${m[2]}?autoplay=1` };
  }
  if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { kind: 'video', src: u.toString() };
  return { kind: 'link', src: u.toString() };
};
