import React, { useEffect, useMemo, useState } from 'react';
import { Video, Plus, Pencil, Trash2, Save, X, ExternalLink, Search } from 'lucide-react';

const EMPTY = { title: '', url: '', section: 'Getting started', audience: 'everyone', description: '', keywords: '', duration: '', order: 0 };

/**
 * Platform admin: the "how to" videos every company sees in Help & Support.
 * Paste a link (YouTube, Vimeo, Google Drive, Loom or an .mp4 file), pick the section and add search words.
 */
export default function HelpVideosSection({ apiBase, getHeaders, showToast }) {
  const [videos, setVideos] = useState(null);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = adding
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${apiBase}/help-videos`, { headers: getHeaders() }).then((r) => r.json());
      if (res.success) {
        setVideos(res.data || []);
        setSections(res.meta?.sections || res.sections || []);
      } else {
        setVideos([]);
        showToast(res.message || 'Could not load the videos', 'error');
      }
    } catch (err) {
      setVideos([]);
      showToast('Could not load the videos: ' + err.message, 'error');
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const startNew = () => { setForm({ ...EMPTY, section: sections[0] || EMPTY.section }); setEditingId('new'); };
  const startEdit = (v) => {
    setForm({ title: v.title, url: v.url, section: v.section, audience: v.audience || 'everyone', description: v.description || '', keywords: (v.keywords || []).join(', '), duration: v.duration || '', order: v.order || 0 });
    setEditingId(v.id);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) { showToast('Title and video link are required', 'error'); return; }
    setBusy(true);
    try {
      const isNew = editingId === 'new';
      const res = await fetch(`${apiBase}/help-videos${isNew ? '' : `/${editingId}`}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, order: Number(form.order) || 0 }),
      }).then((r) => r.json());
      if (res.success) {
        showToast(isNew ? 'Video added' : 'Video updated');
        setEditingId(null);
        await load();
      } else showToast(res.message || 'Could not save the video', 'error');
    } catch (err) {
      showToast('Could not save the video: ' + err.message, 'error');
    } finally { setBusy(false); }
  };

  const remove = async (v) => {
    if (!window.confirm(`Delete "${v.title}"? It disappears from every company's Help page.`)) return;
    try {
      const res = await fetch(`${apiBase}/help-videos/${v.id}`, { method: 'DELETE', headers: getHeaders() }).then((r) => r.json());
      if (res.success) { showToast('Video deleted'); await load(); }
      else showToast(res.message || 'Could not delete the video', 'error');
    } catch (err) {
      showToast('Could not delete the video: ' + err.message, 'error');
    }
  };

  const shown = useMemo(() => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (videos || []).filter((v) => {
      const hay = [v.title, v.section, v.description, ...(v.keywords || [])].join(' ').toLowerCase();
      return w.every((x) => hay.includes(x));
    });
  }, [videos, q]);

  if (!videos) return <div className="text-xs text-slate-500">Loading…</div>;
  const field = 'w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10';
  const label = 'block text-[11px] font-bold text-slate-700 mb-1';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2"><Video size={20} className="text-emerald-600 shrink-0" /> Help videos</h3>
            <p className="text-xs text-slate-500 mt-0.5">Shown to every owner and staff member in Help &amp; Support → Guide. They search by the title, section and search words.</p>
          </div>
          {editingId === null && (
            <button type="button" onClick={startNew} className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"><Plus size={13} /> Add video</button>
          )}
        </div>

        {editingId !== null && (
          <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-3">
            <div className="text-xs font-extrabold text-slate-900">{editingId === 'new' ? 'New video' : 'Edit video'}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={label}>Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 140) })} className={field} placeholder="e.g. How to import leads from a CSV file" />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Video link *</label>
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value.trim() })} className={field} placeholder="https://youtu.be/…  or a Google Drive / Vimeo / Loom link, or an .mp4 file link" />
                <p className="text-[10px] text-slate-400 mt-1">YouTube, Vimeo, Google Drive and Loom play inside the CRM. For Drive, set sharing to “Anyone with the link”. Any other link opens in a new tab.</p>
              </div>
              <div>
                <label className={label}>Section *</label>
                <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className={field}>
                  {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Who can see it</label>
                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className={field}>
                  <option value="everyone">Owners and staff</option>
                  <option value="owners">Owners only</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Short description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 600) })} className={field} placeholder="What the video shows, in one or two lines" />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Search words (separate with commas)</label>
                <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className={field} placeholder="e.g. csv, upload, excel, bulk, limit" />
                <p className="text-[10px] text-slate-400 mt-1">Words a user might type that are not in the title, in English or Hinglish.</p>
              </div>
              <div>
                <label className={label}>Length</label>
                <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value.slice(0, 12) })} className={field} placeholder="e.g. 3:20" />
              </div>
              <div>
                <label className={label}>Position (smaller number shows first)</label>
                <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className={field} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><Save size={13} /> {busy ? 'Saving…' : 'Save video'}</button>
              <button type="button" onClick={() => setEditingId(null)} disabled={busy} className="px-4 py-2 rounded-full bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"><X size={13} /> Cancel</button>
            </div>
          </form>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${videos.length} video${videos.length === 1 ? '' : 's'}`} className={`${field} pl-8`} />
        </div>

        <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {shown.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              {videos.length === 0 ? 'No videos yet. Press “Add video” to add the first one.' : 'No video matches your search.'}
            </div>
          )}
          {shown.map((v) => (
            <div key={v.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{v.section}</span>
                  {v.audience === 'owners' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Owners only</span>}
                  {v.duration && <span className="text-[10px] font-bold text-slate-400">{v.duration}</span>}
                </div>
                <div className="text-xs font-bold text-slate-900 mt-1 break-words">{v.title}</div>
                {v.description && <div className="text-[11px] text-slate-500 break-words">{v.description}</div>}
                <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 break-all mt-0.5">
                  <ExternalLink size={10} className="shrink-0" /> {v.url}
                </a>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => startEdit(v)} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"><Pencil size={12} /> Edit</button>
                <button type="button" onClick={() => remove(v)} className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
