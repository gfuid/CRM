import React, { useEffect, useMemo, useState } from 'react';
import { PlayCircle, Clock, ExternalLink, Video } from 'lucide-react';
import Modal from '../Modal';
import { api } from '../../services/api';
import { toPlayable } from '../../data/videoEmbed';

const words = (q) => String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
const haystack = (v) => [v.title, v.section, v.description, ...(v.keywords || [])].join(' ').toLowerCase();

/**
 * "How to" videos added by the platform team. The same search box as the guide filters them,
 * and a section chip narrows the list. A video plays inside the CRM (YouTube, Vimeo, Drive, Loom or an .mp4 file).
 */
export default function HelpVideoLibrary({ query = '' }) {
  const [videos, setVideos] = useState(null); // null = loading
  const [section, setSection] = useState('All');
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    let alive = true;
    api.getHelpVideos()
      .then((res) => { if (alive) setVideos(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (alive) setVideos([]); });
    return () => { alive = false; };
  }, []);

  const sections = useMemo(() => {
    const seen = [];
    (videos || []).forEach((v) => { if (v.section && !seen.includes(v.section)) seen.push(v.section); });
    return seen;
  }, [videos]);

  const shown = useMemo(() => {
    const w = words(query);
    return (videos || []).filter((v) => {
      if (section !== 'All' && v.section !== section) return false;
      const hay = haystack(v);
      return w.every((x) => hay.includes(x));
    });
  }, [videos, query, section]);

  // Nothing to show until the platform team adds the first video
  if (!videos || videos.length === 0) return null;
  const searching = words(query).length > 0;
  const player = playing ? toPlayable(playing.url) : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Video size={16} className="text-emerald-600 shrink-0" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">Video library</h2>
          <span className="text-[11px] text-slate-400 font-medium shrink-0">
            {searching || section !== 'All' ? `${shown.length} of ${videos.length}` : `${videos.length} video${videos.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {/* Section chips: one row that scrolls sideways on a phone */}
      {sections.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {['All', ...sections].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer whitespace-nowrap ${
                section === s
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="py-5 text-center text-xs text-slate-500">
          No video matches{searching ? ` “${query.trim()}”` : ''}{section !== 'All' ? ` in ${section}` : ''}. Try other words, or check the guide below.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((v) => {
            const p = toPlayable(v.url);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => (p.kind === 'link' ? window.open(p.src, '_blank', 'noopener,noreferrer') : setPlaying(v))}
                className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer flex flex-col"
              >
                <div className="relative w-full aspect-video bg-slate-900 overflow-hidden">
                  {p.thumb && (
                    <img src={p.thumb} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center text-white">
                    {p.kind === 'link'
                      ? <ExternalLink size={30} strokeWidth={1.5} className="drop-shadow-lg" />
                      : <PlayCircle size={40} strokeWidth={1.5} className="drop-shadow-lg group-hover:scale-110 transition-transform" />}
                  </span>
                  {v.duration && (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                      <Clock size={10} /> {v.duration}
                    </span>
                  )}
                </div>
                <div className="p-2.5 space-y-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 truncate">{v.section}</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{v.title}</div>
                  {v.description && <div className="text-[11px] text-slate-500 leading-snug line-clamp-2">{v.description}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={Boolean(playing)}
        onClose={() => setPlaying(null)}
        title={playing?.title || ''}
        subtitle={playing?.section}
        maxWidth="max-w-4xl"
        bodyClassName="p-0 sm:p-0 overflow-y-auto"
      >
        {playing && player && (
          <div>
            <div className="w-full aspect-video bg-black">
              {player.kind === 'iframe' && (
                <iframe
                  src={player.src}
                  title={playing.title}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              )}
              {player.kind === 'video' && (
                <video src={player.src} controls autoPlay playsInline className="w-full h-full" />
              )}
            </div>
            {(
              <div className="p-4 space-y-2">
                {playing.description && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{playing.description}</p>}
                <a href={playing.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                  <ExternalLink size={12} /> Open in a new tab
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
