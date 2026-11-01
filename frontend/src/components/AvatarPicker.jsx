import React, { useRef, useState } from 'react';
import { Upload, Loader2, Check } from 'lucide-react';
import { AVATAR_PRESETS, avatarSrc, avatarFallback, uploadAvatarFile } from '../data/avatars';

/**
 * Pick one of the built-in 3D avatars, or upload your own photo from the computer / phone.
 * `value` / `onChange` work with the saved avatar_url string.
 */
export default function AvatarPicker({ value, onChange, size = 'md', label = 'Avatar' }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const isPreset = AVATAR_PRESETS.some((a) => a.url === value);
  const isCustom = Boolean(value) && !isPreset;

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await uploadAvatarFile(file));
    } catch (err) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2" data-avatar-picker>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{label}</span>
        <button
          type="button"
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {busy ? 'Uploading…' : 'Upload photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} aria-label="Upload a profile photo" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isCustom && (
          <span className={`relative ${box} rounded-full ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 overflow-hidden bg-slate-100 shrink-0`} title="Your uploaded photo">
            <img src={avatarSrc(value)} onError={avatarFallback} alt="Uploaded photo" className="w-full h-full object-cover" />
          </span>
        )}
        {AVATAR_PRESETS.map((a) => {
          const on = value === a.url;
          return (
            <button
              key={a.url}
              type="button"
              onClick={() => onChange(a.url)}
              title={a.label}
              aria-label={`Avatar: ${a.label}`}
              aria-pressed={on}
              className={`relative ${box} rounded-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border transition-all cursor-pointer shrink-0 ${
                on ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:-translate-y-0.5'
              }`}
            >
              <img src={a.url} alt="" loading="lazy" className="w-full h-full object-contain p-0.5" />
              {on && (
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
      <p className="text-[10px] text-slate-400">Choose a 3D avatar or upload a photo (JPG, PNG or WebP). Photos are cropped to a square automatically.</p>
    </div>
  );
}
